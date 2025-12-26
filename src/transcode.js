import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs-extra';
import { emitLog, emitProgress } from './socket.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSCODE_DIR = path.join(__dirname, '../transcodes');
fs.ensureDirSync(TRANSCODE_DIR);

const activeTranscodes = new Map();

/**
 * Cleanup function to remove old transcodes
 */
export function cleanupTranscode(infoHash) {
  const dir = path.join(TRANSCODE_DIR, infoHash);
  if (fs.existsSync(dir)) {
    fs.removeSync(dir);
  }
  activeTranscodes.delete(infoHash);
}

/**
 * Starts an HLS transcode for a given file stream.
 * @param {Object} file - WebTorrent file object
 * @param {string} infoHash - Torrent infoHash
 * @returns {Promise<string>} - Path to the playlist file (m3u8)
 */
export function startTranscode(file, infoHash) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(TRANSCODE_DIR, infoHash);
    const playlistPath = path.join(outputDir, 'playlist.m3u8');

    // If already transcoding, return existing playlist
    if (activeTranscodes.has(infoHash)) {
      return resolve(playlistPath);
    }

    fs.ensureDirSync(outputDir);

    const stream = file.createReadStream();

    // Simple command to convert to HLS
    const command = ffmpeg(stream)
      .addOptions([
        '-profile:v baseline', // Baseline profile for broad compatibility
        '-level 3.0',
        '-start_number 0',
        '-hls_time 10',        // 10 second segments
        '-hls_list_size 0',    // Keep all segments in the playlist
        '-f hls'
      ])
      .output(playlistPath)
      .on('start', () => {
        const msg = `[Transcode] Started for ${file.name}`;
        console.log(msg);
        emitLog(msg, 'success');
        activeTranscodes.set(infoHash, command);

        // Resolve once the playlist file is created
        const checkInterval = setInterval(() => {
          if (fs.existsSync(playlistPath)) {
            clearInterval(checkInterval);
            resolve(playlistPath);
          }
        }, 1000);
      })
      .on('progress', (progress) => {
         // emitProgress({ infoHash, percent: progress.percent });
      })
      .on('stderr', (stderrLine) => {
          // emitLog(`FFmpeg: ${stderrLine}`, 'debug');
      })
      .on('error', (err) => {
        const msg = `[Transcode] Error: ${err.message}`;
        console.error(msg);
        emitLog(msg, 'error');
        cleanupTranscode(infoHash);
      })
      .on('end', () => {
        const msg = `[Transcode] Finished for ${file.name}`;
        console.log(msg);
        emitLog(msg, 'success');
      });

    command.run();
  });
}

export { TRANSCODE_DIR };
