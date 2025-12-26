import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Import Vidstack styles
import 'vidstack/player/styles/default/theme.css';
import 'vidstack/player/styles/default/layouts/video.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
