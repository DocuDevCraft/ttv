const fs = require('fs-extra');
const path = require('path');
const schedule = require('node-schedule');

const DOWNLOAD_DIR = '/downloads';
const RETENTION_DAYS = 7;

/**
 * Checks if a file/directory is older than the retention period.
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isOld(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const now = new Date().getTime();
    // Use birthtime (creation time) if available, otherwise mtime (modification time)
    const fileTime = stats.birthtimeMs || stats.mtimeMs;
    const ageInMs = now - fileTime;
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    return ageInDays > RETENTION_DAYS;
  } catch (error) {
    console.error(`Error checking file age for ${filePath}:`, error);
    return false;
  }
}

/**
 * Scans the download directory and removes old files.
 */
async function cleanOldDownloads() {
  console.log('Starting cleanup job...');
  try {
    const exists = await fs.pathExists(DOWNLOAD_DIR);
    if (!exists) {
      console.log(`${DOWNLOAD_DIR} does not exist. Skipping cleanup.`);
      return;
    }

    const items = await fs.readdir(DOWNLOAD_DIR);

    for (const item of items) {
      const itemPath = path.join(DOWNLOAD_DIR, item);
      if (await isOld(itemPath)) {
        console.log(`Deleting old item: ${itemPath}`);
        await fs.remove(itemPath);
      }
    }
    console.log('Cleanup job finished.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

/**
 * Initializes the cleanup schedule.
 * Runs every day at 00:00.
 */
function initCleanupJob() {
  // Run every day at midnight
  schedule.scheduleJob('0 0 * * *', cleanOldDownloads);
  console.log('Cleanup job scheduled to run daily at 00:00');
}

module.exports = { initCleanupJob, cleanOldDownloads };
