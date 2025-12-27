import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, ChevronUp, ChevronDown } from 'lucide-react';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:2096' : '/';

export default function DebugConsole() {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // 1. Socket.io Connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'] // Explicitly fallback to avoid secure/insecure mismatch issues if any
    });

    socket.on('log', (log) => {
      setLogs((prev) => [...prev, log]);
    });

    // 2. Intercept Browser Console Logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addClientLog = (message, type) => {
      // Serialize objects if necessary
      const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
      setLogs((prev) => [...prev, {
        message: `[CLIENT] ${formattedMessage}`,
        type: type, // 'info', 'error', 'warn'
        timestamp: new Date()
      }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      // Join args to mimic console behavior
      addClientLog(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '), 'info');
    };

    console.error = (...args) => {
      originalError(...args);
      addClientLog(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '), 'error');
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addClientLog(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '), 'warn');
    };

    return () => {
      socket.disconnect();
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white p-3 rounded-full shadow-lg border border-gray-700 flex items-center gap-2"
      >
        <Terminal size={20} />
        {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-black/90 text-green-400 p-4 rounded-lg mt-2 w-96 h-64 overflow-hidden border border-gray-800 shadow-2xl backdrop-blur-sm font-mono text-xs flex flex-col"
          >
            <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
              <span className="font-bold">Live Server Logs</span>
              <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
              {logs.length === 0 && <span className="text-gray-500 italic">No logs yet...</span>}
              {logs.map((log, i) => (
                <div key={i} className={`break-words ${log.type === 'error' ? 'text-red-400' : ''}`}>
                  <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
