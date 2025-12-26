#!/bin/sh

# Create certs directory if it doesn't exist
mkdir -p certs

CERT_DIR="./certs"
KEY_FILE="$CERT_DIR/key.pem"
CERT_FILE="$CERT_DIR/cert.pem"

# Check if certificates exist
if [ ! -f "$KEY_FILE" ] || [ ! -f "$CERT_FILE" ]; then
    console_log() { echo "[SSL Setup] $1"; }
    console_log "Certificates not found. Generating self-signed certificate..."

    # Generate self-signed certificate
    openssl req -x509 -newkey rsa:2048 -keyout "$KEY_FILE" -out "$CERT_FILE" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

    console_log "Certificate generated."
else
    echo "[SSL Setup] Certificates found. Skipping generation."
fi

# Start the application
exec npm start
