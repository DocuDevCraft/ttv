const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');

const TRANSCODE_DIR = path.join(__dirname, '../transcodes');
fs.ensureDirSync(TRANSCODE_DIR);

const activeTranscodes = new Map();

/**
 * Cleanup function to remove old transcodes
 */
function cleanupTranscode(infoHash) {
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
function startTranscode(file, infoHash) {
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
    // Note: On-the-fly transcoding from a torrent stream can be unstable if download is slow.
    // ffmpeg needs a steady stream.

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
        console.log(`[Transcode] Started for ${file.name}`);
        activeTranscodes.set(infoHash, command);

        // Resolve once the playlist file is created
        const checkInterval = setInterval(() => {
          if (fs.existsSync(playlistPath)) {
            clearInterval(checkInterval);
            resolve(playlistPath);
          }
        }, 1000);
      })
      .on('error', (err) => {
        console.error(`[Transcode] Error: ${err.message}`);
        cleanupTranscode(infoHash);
        // If we haven't resolved yet, reject
        // We might need a flag to know if we already resolved
      })
      .on('end', () => {
        console.log(`[Transcode] Finished for ${file.name}`);
        // Optionally cleanup after some time
      });

    command.run();
  });
}

/**
 * Middleware to stop transcode if client disconnects?
 * Hard for HLS because it's stateless HTTP requests.
 * We'll rely on a timeout or explicit stop.
 */

module.exports = {
  startTranscode,
  cleanupTranscode,
  TRANSCODE_DIR
};
