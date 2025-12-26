import express from 'express';
import WebTorrent from 'webtorrent';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import https from 'https';
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
const DOWNLOAD_DIR = '/downloads';
const CERT_DIR = path.join(__dirname, '../certs');

// Ensure database is initialized
initDB();

// Initialize WebTorrent Client
const client = new WebTorrent();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
// Serve static files for HLS (segments and playlists)
app.use('/stream', express.static(TRANSCODE_DIR));

// Initialize Cron Job
initCleanupJob();

// Routes

// Public Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/auth/login', login);

// Protected Routes
app.use(authenticateToken); // Apply auth middleware to all subsequent routes

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
  const { magnet } = req.body;

  if (!magnet) {
    return res.status(400).json({ error: 'Magnet link is required' });
  }

  // Check if already added
  const existing = client.get(magnet);
  if (existing) {
    return res.json({
      message: 'Torrent already exists',
      infoHash: existing.infoHash
    });
  }

  try {
    client.add(magnet, { path: DOWNLOAD_DIR }, (torrent) => {
      const msg = `Torrent added: ${torrent.infoHash}`;
      console.log(msg);
      emitLog(msg, 'success');

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
    });

    res.json({ message: 'Download started' });
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


// Start Server with SSL
try {
  const key = fs.readFileSync(path.join(CERT_DIR, 'key.pem'));
  const cert = fs.readFileSync(path.join(CERT_DIR, 'cert.pem'));

  const server = https.createServer({ key, cert }, app);

  // Initialize WebSocket
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`HTTPS Server running on port ${PORT}`);
    console.log(`Download directory: ${DOWNLOAD_DIR}`);
    emitLog(`Server started on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to start HTTPS server:', error.message);
  process.exit(1);
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  client.destroy((err) => {
    if (err) console.error('Error destroying torrent client:', err);
    process.exit(0);
  });
});
