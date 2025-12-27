import express from 'express';
import WebTorrent from 'webtorrent';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initCleanupJob } from './cleanup.js';
import { initDB } from './db.js';
import { authenticateToken, login, changePassword } from './auth.js';
import { startTranscode, TRANSCODE_DIR } from './transcode.js';
import { initSocket, emitLog } from './socket.js';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 2096;
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const FRONTEND_DIR = path.join(__dirname, '../public');

// Ensure database is initialized
initDB();

const ANNOUNCE_LIST = [
  'udp://tracker.opentrackr.org:1337/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'http://tracker.internetwarriors.net:1337/announce',
  'udp://tracker.leechers-paradise.org:6969',
  'wss://tracker.webtorrent.io',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
];

// Initialize WebTorrent Client
// Configure to bypass P2P blocking by disabling uTP and using random high ports
const client = new WebTorrent({
  utp: false, // Disable uTP (UDP) to avoid blocking
  port: 50000 + Math.floor(Math.random() * 10000), // Random high port for TCP/uTP
  torrentPort: 50000 + Math.floor(Math.random() * 10000), // Random high port (WebTorrent specific)
  dhtPort: 50000 + Math.floor(Math.random() * 10000), // Random high port for DHT
  tracker: {
    rtcConfig: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  }
});

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());
app.use(morgan('combined', {
  skip: (req, res) => {
    return req.url.startsWith('/torrents') ||
           req.url.startsWith('/health') ||
           req.url.startsWith('/assets') ||
           req.url.startsWith('/stream');
  }
}));

// 1. Serve HLS streams PUBLICLY (priority)
app.use('/stream', express.static(TRANSCODE_DIR));

// 2. Serve Frontend Static Files PUBLICLY
// This allows serving index.html, assets, etc. without auth
app.use(express.static(FRONTEND_DIR));

// Initialize Cron Job
initCleanupJob();

// Routes

// Public API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/auth/login', login);

// Protected API Routes
// All routes below this line require authentication
// We can group them under /api if we wanted, but existing frontend uses root paths.
// We must ensure static files (above) are matched first.
app.use(authenticateToken);

app.post('/auth/change-password', changePassword);

/**
 * GET /stream/init/:infoHash
 * Initializes transcoding for the largest file in the torrent and returns the playlist URL.
 */
app.get('/stream/init/:infoHash', async (req, res) => {
  const { infoHash } = req.params;
  const torrent = client.get(infoHash);

  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }

  // Find the largest file (usually the movie)
  const file = torrent.files.reduce((a, b) => (a.length > b.length ? a : b));

  if (!file) {
    return res.status(404).json({ error: 'No files found in torrent' });
  }

  try {
    // Start transcoding
    await startTranscode(file, infoHash);

    // Return the URL to the playlist
    res.json({
      url: `/stream/${infoHash}/playlist.m3u8`
    });
  } catch (err) {
    console.error('Streaming error:', err);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

/**
 * GET /torrents
 * Returns a list of currently active torrents.
 */
app.get('/torrents', (req, res) => {
  console.log('Current torrents in memory:', client.torrents.length);
  const torrents = client.torrents.map(torrent => ({
    infoHash: torrent.infoHash,
    name: torrent.name,
    progress: torrent.progress,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    numPeers: torrent.numPeers,
    timeRemaining: torrent.timeRemaining,
    ready: torrent.ready,
    magnetURI: torrent.magnetURI
  }));
  res.json(torrents);
});

/**
 * POST /add
 * Adds a new magnet link to the download queue.
 */
app.post('/add', (req, res) => {
  let { magnet } = req.body;

  if (magnet) magnet = magnet.trim();

  console.log(`[DEBUG] Received add request. Magnet starts with: ${magnet?.substring(0, 20)}`);

  if (!magnet) {
    return res.status(400).json({ error: 'Magnet link is required' });
  }

  // Add helper trackers to magnet link
  if (magnet.startsWith('magnet:?')) {
    const trackers = ANNOUNCE_LIST.map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
    magnet += trackers;
  }

  try {
    // Ensure download directory exists before adding
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }

    const torrent = client.add(magnet, { path: DOWNLOAD_DIR }, (torrent) => {
      // This callback fires when metadata is ready
      const msg = `Torrent metadata ready: ${torrent.name}`;
      console.log(msg);
      emitLog(msg, 'success');
    });

    // Log immediately after adding to queue
    const queueMsg = `Magnet added to queue. InfoHash: ${torrent.infoHash}`;
    console.log(queueMsg);
    emitLog(queueMsg, 'info');

    torrent.on('wire', (wire, addr) => {
      console.log(`[DEBUG] Peer connected: ${addr}`);
    });

    torrent.on('done', () => {
      const doneMsg = `Torrent finished: ${torrent.name}`;
      console.log(doneMsg);
      emitLog(doneMsg, 'success');
    });

    torrent.on('error', (err) => {
      const errMsg = `Torrent error: ${err.message}`;
      console.error(errMsg);
      emitLog(errMsg, 'error');
    });

    res.json({ message: 'Download started', infoHash: torrent.infoHash });
  } catch (err) {
    console.error('Error adding torrent:', err);
    res.status(500).json({ error: 'Failed to add torrent' });
  }
});

/**
 * DELETE /torrents/:infoHash
 * Removes a torrent from the client (stops download).
 */
app.delete('/torrents/:infoHash', (req, res) => {
  const { infoHash } = req.params;
  const torrent = client.get(infoHash);

  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }

  client.remove(infoHash, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Torrent removed' });
  });
});

// Handle SPA Fallback (Must be last)
// If request didn't match any API route or static file, serve index.html
// This allows React Router to handle /watch/:hash etc.
app.get('*', (req, res) => {
  // Don't intercept API errors with index.html
  if (req.accepts('html')) {
     res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  } else {
     res.status(404).json({ error: 'Not Found' });
  }
});

// Start Server (HTTP)
const server = http.createServer(app);

// Initialize WebSocket
initSocket(server);

server.listen(PORT, () => {
  // Ensure download directory exists on startup
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`Download directory: ${DOWNLOAD_DIR}`);

  const startMsg = `🟢 SERVER STARTED/RESTARTED on port ${PORT}`;
  console.log(startMsg);
  emitLog(startMsg);
});

// Periodic Status Log
setInterval(() => {
  const memoryUsage = process.memoryUsage().rss / 1024 / 1024;
  console.log(`[SYSTEM] Uptime: ${process.uptime().toFixed(0)}s | Memory: ${memoryUsage.toFixed(0)}MB | Active Torrents: ${client.torrents.length}`);

  client.torrents.forEach(torrent => {
    console.log(`[STATUS] ${torrent.name || 'Fetching Metadata...'} | InfoHash: ${torrent.infoHash} | Peers: ${torrent.numPeers} | Progress: ${(torrent.progress * 100).toFixed(1)}% | Speed: ${(torrent.downloadSpeed / 1024).toFixed(0)} KB/s`);
  });
}, 10000);

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  client.destroy((err) => {
    if (err) console.error('Error destroying torrent client:', err);
    process.exit(0);
  });
});
