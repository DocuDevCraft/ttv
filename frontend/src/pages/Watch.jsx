import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

const API_URL = import.meta.env.DEV ? 'http://localhost:2096' : '';

export default function Watch({ token }) {
  const { infoHash } = useParams();
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const initStream = async () => {
      try {
        const res = await axios.get(`${API_URL}/stream/init/${infoHash}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Construct full URL
        // HLS URL needs to be absolute or relative to where we are fetching.
        // Since API is on 2096 and frontend on 5173 (dev), we need absolute.
        // We append the token for authentication
        const fullUrl = `${API_URL}${res.data.url}?token=${token}`;
        setStreamUrl(fullUrl);
      } catch (err) {
        console.error(err);
        setError('Failed to initialize stream. The file might not be ready or supported.');
      } finally {
        setLoading(false);
      }
    };

    initStream();
  }, [infoHash, token]);

  // Middleware to attach auth header to HLS requests?
  // Vidstack HLS provider handles HLS.js. HLS.js allows adding headers via xhrSetup.
  // We can pass `hlsConfig` property to MediaProvider.

  // Note: Self-signed certs might block HLS requests in Chrome if not accepted separately.
  // The user should open the API URL once to accept the cert.

  if (loading) return <div className="flex h-screen items-center justify-center">Initializing Transcoder...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4 flex flex-col h-screen">
      <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 w-fit">
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>

      <div className="flex-1 bg-black rounded-lg overflow-hidden shadow-2xl relative">
        {streamUrl && (
          <MediaPlayer
            src={{
              src: streamUrl,
              type: 'application/x-mpegurl', // Explicitly state it's HLS
            }}
            viewType="video"
            streamType="on-demand"
            logLevel="warn"
            crossOrigin
            playsInline
            title="Torrent Stream"
          >
            <MediaProvider />
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>
        )}
      </div>
    </div>
  );
}
