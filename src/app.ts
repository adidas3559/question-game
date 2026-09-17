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

const isAllowedOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN)
    return callback(null, true);
  const port = parseInt(new URL(origin).port, 10);
  if (port >= 5173 && port <= 7180) return callback(null, true);
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



