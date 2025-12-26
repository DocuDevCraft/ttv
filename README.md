# Torrent Streaming System

A robust, self-hosted torrent streaming platform built with Node.js, React, and Docker.

## Features

-   **Torrent Management**: Add magnet links and monitor downloads in real-time.
-   **Instant Streaming**: Watch videos immediately using on-the-fly HLS transcoding (FFmpeg).
-   **Secure**: HTTPS enforced, JWT authentication, and secure password management.
-   **Persistent**: Downloads and user data persist across restarts via Docker Volumes.
-   **Maintenance**: Automatic cleanup of files older than 7 days.
-   **Live Debug**: Real-time console logs from the server directly in the UI.
-   **Modern UI**: Responsive React interface with smooth animations (Framer Motion).

## Prerequisites

-   **Docker** and **Docker Compose** installed on your machine.

## Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd torrent-streaming
    ```

2.  **Start the system**:
    ```bash
    docker-compose up --build
    ```
    *This might take a few minutes the first time to build the images and generate SSL certificates.*

3.  **Access the Application**:
    -   Open your browser and navigate to: `http://localhost:5173`
    -   **Important**: Since the backend uses self-signed certificates, you must first visit `https://localhost:2096/health` and accept the security warning ("Proceed to localhost (unsafe)"). Then reload the frontend.

4.  **Login**:
    -   **Username**: `admin`
    -   **Password**: `admin` (You should change this immediately via the API or future settings page).

## Usage

1.  **Dashboard**: Paste a Magnet Link into the input box and click "Add".
2.  **Streaming**: Once the torrent metadata is fetched (usually seconds), the "Play" button will appear. Click it to start watching.
3.  **Debug**: Click the terminal icon in the bottom-right corner to view live server logs.

## Troubleshooting

-   **Video Error (401/404)**: Ensure you have accepted the self-signed certificate for port 2096.
-   **Download Stuck**: Check the Debug Console for "Torrent error" messages. Ensure the magnet link has active seeds.
-   **Mixed Content Error**: If the frontend doesn't load data, check your browser console. You might need to allow insecure content if running on localhost with mixed protocols (though localhost is usually exempt).

## Architecture

-   **Backend**: Node.js, Express, WebTorrent, Fluent-FFmpeg, Socket.io.
-   **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Vidstack.
-   **Database**: JSON file-based (using `lowdb` style simple JSON).
-   **Containerization**: Docker (Node 20 Alpine), Docker Compose.

## License

MIT
