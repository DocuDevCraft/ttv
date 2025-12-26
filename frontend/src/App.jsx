import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Watch from './pages/Watch';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route
            path="/login"
            element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />}
          />
          <Route
            path="/"
            element={token ? <Dashboard onLogout={handleLogout} token={token} /> : <Navigate to="/login" />}
          />
          <Route
            path="/watch/:infoHash"
            element={token ? <Watch token={token} /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
