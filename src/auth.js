const jwt = require('jsonwebtoken');
const { getUser, updateUserPassword } = require('./db');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret_please_change_me';

/**
 * Middleware to verify JWT token.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
}

/**
 * Login handler
 */
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await getUser(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Token valid for 24 hours
  const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '24h' });

  res.json({ token });
}

/**
 * Change Password handler
 */
async function changePassword(req, res) {
  const { newPassword } = req.body;
  const username = req.user.username; // From middleware

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const success = await updateUserPassword(username, newPassword);
  if (success) {
    res.json({ message: 'Password updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to update password' });
  }
}

module.exports = {
  authenticateToken,
  login,
  changePassword
};
