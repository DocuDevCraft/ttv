import fs from 'fs-extra';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

export async function initDB() {
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

export async function getUser(username) {
  try {
    const data = await fs.readJson(DB_FILE);
    return data.users.find(u => u.username === username);
  } catch (err) {
    return null;
  }
}

export async function updateUserPassword(username, newPassword) {
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
