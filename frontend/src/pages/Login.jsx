import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.DEV ? 'https://localhost:2096' : '';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      if (res.data.token) {
        onLogin(res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-96 border border-gray-700 relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full mb-3 shadow-lg shadow-blue-500/30">
            <Lock size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-gray-400 text-sm mt-1">Sign in to your streaming server</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/50 p-3 mb-4 rounded-lg flex items-center gap-2 text-red-200 text-sm"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-gray-400 font-medium">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="text"
                className="w-full p-2.5 pl-10 rounded-lg bg-gray-900/50 border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-600"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-400 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="password"
                className="w-full p-2.5 pl-10 rounded-lg bg-gray-900/50 border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-600"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all mt-2"
          >
            {loading ? 'Signing In...' : (
              <>
                <span>Sign In</span>
                <LogIn size={18} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
