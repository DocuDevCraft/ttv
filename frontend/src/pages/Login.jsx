import React, { useState } from 'react';
import axios from 'axios';

// Usually configurable, but hardcoded to the backend service/port for this phase
const API_URL = 'https://localhost:2096';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      if (res.data.token) {
        onLogin(res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <div className="bg-red-500 p-2 mb-4 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1">Username</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
