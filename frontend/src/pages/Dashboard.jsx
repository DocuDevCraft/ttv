import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Play, Trash2, LogOut, Plus, RefreshCw, HardDrive, Download, Upload, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = '';

export default function Dashboard({ token, onLogout }) {
  const [torrents, setTorrents] = useState([]);
  const [magnet, setMagnet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTorrents = async () => {
    try {
      const res = await axios.get(`${API_URL}/torrents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTorrents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTorrents();
    const interval = setInterval(fetchTorrents, 3000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!magnet) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/add`, { magnet }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMagnet('');
      fetchTorrents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add torrent');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (infoHash) => {
    if (!confirm('Are you sure you want to remove this torrent?')) return;
    try {
      await axios.delete(`${API_URL}/torrents/${infoHash}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTorrents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div className="flex items-center gap-3">
          <HardDrive size={32} className="text-blue-500" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            Torrent Streaming
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-600/80 hover:bg-red-700 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors border border-red-500/30"
        >
          <LogOut size={18} /> Logout
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800/50 backdrop-blur-md p-6 rounded-xl mb-8 shadow-xl border border-gray-700"
      >
        <form onSubmit={handleAdd} className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Paste Magnet Link Here..."
              className="w-full p-3 pl-10 rounded-lg bg-gray-900/50 border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-gray-200 placeholder-gray-500"
              value={magnet}
              onChange={(e) => setMagnet(e.target.value)}
            />
            <Plus className="absolute left-3 top-3.5 text-gray-500" size={20} />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
            <span>Add</span>
          </motion.button>
        </form>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-red-400 mt-3 text-sm flex items-center gap-2"
          >
            <Activity size={16} /> {error}
          </motion.p>
        )}
      </motion.div>

      <div className="grid gap-4">
        <AnimatePresence>
          {torrents.map((torrent, index) => (
            <motion.div
              key={torrent.infoHash}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl flex flex-col md:flex-row items-center justify-between shadow-lg border border-gray-700 hover:border-gray-600 transition-colors group"
            >
              <div className="flex-1 min-w-0 mr-4">
                <h3 className="font-bold text-lg truncate text-white group-hover:text-blue-400 transition-colors">
                  {torrent.name || 'Fetching Metadata...'}
                </h3>
                <div className="text-sm text-gray-400 mt-2 flex flex-wrap gap-4 items-center">
                  <span className="flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded">
                    <Activity size={14} className="text-blue-400" />
                    {(torrent.progress * 100).toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded">
                    <Download size={14} className="text-green-400" />
                    {(torrent.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s
                  </span>
                  <span className="flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded">
                    <Upload size={14} className="text-purple-400" />
                    {torrent.numPeers} peers
                  </span>
                </div>
                <div className="w-full bg-gray-900 h-2 rounded-full mt-3 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${torrent.progress * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                {torrent.ready ? (
                  <Link to={`/watch/${torrent.infoHash}`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg shadow-blue-500/20"
                      title="Play"
                    >
                      <Play size={24} fill="white" />
                    </motion.button>
                  </Link>
                ) : (
                  <div className="p-3 rounded-full bg-gray-700/50 animate-pulse" title="Processing...">
                    <RefreshCw size={24} className="text-gray-400" />
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(torrent.infoHash)}
                  className="bg-gray-700 hover:bg-red-600/90 p-3 rounded-full transition-colors text-gray-300 hover:text-white"
                  title="Remove"
                >
                  <Trash2 size={24} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {torrents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-500 py-16 flex flex-col items-center gap-4"
          >
            <Download size={48} className="text-gray-700" />
            <p>No active torrents. Add a magnet link to start streaming.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
