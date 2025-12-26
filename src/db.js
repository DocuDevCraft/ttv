const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

const defaultUser = {
  username: 'admin',
  // Default password is 'admin'. User should change this.
  // Hash generated with bcrypt.hashSync('admin', 10)
  passwordHash: '$2a$10$X/w.w/w.w/w.w/w.w/w.w/w.w/w.w/w.w/w.w/w.w/w.w/w.w/w.' // Placeholder, will fix in init
};

// Real hash for 'admin'
// $2a$10$Xk.x.x... actually let's generate it at runtime if file doesn't exist to be safe/correct
// but for static constant:
// bcrypt.hashSync('admin', 10) -> $2a$10$7/1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1 (fake)

async function initDB() {
  try {
    if (!await fs.pathExists(DB_FILE)) {
      const hash = await bcrypt.hash('admin', 10);
      const initialData = {
        users: [
          {
            username: 'admin',
            password: hash
          }
        ]
      };
      await fs.writeJson(DB_FILE, initialData, { spaces: 2 });
      console.log('Database initialized with default user: admin / admin');
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

async function getUser(username) {
  try {
    const data = await fs.readJson(DB_FILE);
    return data.users.find(u => u.username === username);
  } catch (err) {
    return null;
  }
}

async function updateUserPassword(username, newPassword) {
  try {
    const data = await fs.readJson(DB_FILE);
    const userIndex = data.users.findIndex(u => u.username === username);

    if (userIndex === -1) return false;

    const hash = await bcrypt.hash(newPassword, 10);
    data.users[userIndex].password = hash;

    await fs.writeJson(DB_FILE, data, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('Error updating password:', err);
    return false;
  }
}

// Initialize on load (synchronously or triggered externally)
// Since this is a module, we can just export an init function or call it.
// We'll call it in index.js to ensure async execution is handled.

module.exports = {
  initDB,
  getUser,
  updateUserPassword
};
