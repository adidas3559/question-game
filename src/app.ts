import type { Socket as IoSocket } from 'socket.io';

require('dotenv').config();
const express = require('express');
const socket = require('socket.io');
const http = require('http');
const cors = require('cors');
const { handler: createGame } = require('./routes/createGame');

const app = express();
const port = process.env.PORT || 3010;
// normally we don't need to manually create http server,
// app.listen does it for use behind the scenes. But since we
// want to attach socket io to our server, we must do this manually
const server = http.createServer(app);

// Origins allowed to talk to this server, as a comma-separated env var
// e.g. ALLOWED_ORIGIN="https://question-game.pages.dev,https://mygame.com"
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((entry: string) => entry.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

const isAllowedOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Non-browser clients (curl, platform health checks) send no Origin header
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);

  // Local dev only: allow the vite dev/preview servers on localhost.
  // Hostname is checked too, so a remote host on one of these ports is still rejected.
  if (!isProduction) {
    try {
      const { hostname, port } = new URL(origin);
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
      const portNumber = parseInt(port, 10);
      if (isLocalhost && portNumber >= 5173 && portNumber <= 7180) return callback(null, true);
    } catch {
      // Malformed origin: fall through to the rejection below
    }
  }

  callback(new Error('Not allowed by cors'));
}

app.use(cors({ origin: isAllowedOrigin }));

// Socket setup - cors must be configured here separately from app.use(cors())
// because socket.io handles its own HTTP layer for the handshake/polling
const io = socket(server, {
  cors: { origin: isAllowedOrigin }
});

io.on('connection', (socket: IoSocket) => {
  console.log('Made socket connection', socket.id);
});

createGame(io);


// note this is server.listen instead of the usual app.listen
// reason is commented above const server
server.listen(port, () => {
  console.log(`App listening on PORT ${port}`);
})



