import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Play, Trash2, LogOut, Plus, RefreshCw } from 'lucide-react';

const API_URL = 'https://localhost:2096';

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
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Torrent Streaming</h1>
        <button onClick={onLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-md">
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            placeholder="Magnet Link"
            className="flex-1 p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
            value={magnet}
            onChange={(e) => setMagnet(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold flex items-center gap-2"
          >
            <Plus size={20} /> Add
          </button>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="grid gap-4">
        {torrents.map((torrent) => (
          <div key={torrent.infoHash} className="bg-gray-800 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between shadow-md">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{torrent.name || 'Fetching Metadata...'}</h3>
              <div className="text-sm text-gray-400 mt-1 flex gap-4">
                <span>Progress: {(torrent.progress * 100).toFixed(1)}%</span>
                <span>Speed: {(torrent.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
                <span>Peers: {torrent.numPeers}</span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${torrent.progress * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0 ml-4">
              {torrent.ready ? (
                <Link
                  to={`/watch/${torrent.infoHash}`}
                  className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full"
                  title="Play"
                >
                  <Play size={24} fill="white" />
                </Link>
              ) : (
                <div className="p-3 rounded-full bg-gray-700 animate-pulse">
                  <RefreshCw size={24} />
                </div>
              )}
              <button
                onClick={() => handleDelete(torrent.infoHash)}
                className="bg-gray-700 hover:bg-red-600 p-3 rounded-full transition-colors"
                title="Remove"
              >
                <Trash2 size={24} />
              </button>
            </div>
          </div>
        ))}
        {torrents.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            No active torrents. Add a magnet link to start.
          </div>
        )}
      </div>
    </div>
  );
}
