import { randomUUID } from 'crypto';
import { PlayersState, RoomsRecord, ClientToServerEvents, ServerToClientEvents } from '../types';
import { Server, Socket } from 'socket.io';
import questionSets from '../questionSets';

export const rooms: RoomsRecord = {};

const generateRoomCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const handler = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    socket.on('createRoom', ({ roomName, nickname }, callback) => {
      try {
        const roomCode = generateRoomCode();
        const playerId = randomUUID();
  
        rooms[roomCode] = {
          roomName,
          roomCode,
          hostId: playerId,
          players: [{ id: playerId, socketId: socket.id, nickname, questionAnswers: [], finished: false, }],
          questionSet: null,
        };
        // console.log('🚀 ~ handler ~ rooms:', rooms);
        console.log('🚀 ~ handler ~ rooms[roomCode]:', rooms[roomCode]);
        console.log('room players', rooms[roomCode].players);
  
        socket.join(roomCode);
        socket.emit('lobbyUpdated', { room: rooms[roomCode], playerId, nickname });
        callback({
          status: 'success',
          data: {
            playerId: playerId,
            roomCode: roomCode, 
            roomName: roomName,
            players: rooms[roomCode].players,
          }
        })
      } catch (e) {
        
      }
    });

    socket.on('joinRoom', async ({ roomCode, nickname }, callback) => {
      console.log('🚀 ~ handler ~ roomCode:', roomCode);
      const room = rooms[roomCode];
      console.log('🚀 ~ handler ~ room:', room);
      // if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      if (!room) {
        callback({
          status: 'error',
          message: 'Room not found',
        });
        return;
      }

      // Might need a function here checking if player is existing.
      // This is already in poker app
      // don't worry about for now

      const playerId = randomUUID();

      room.players.push({ id: playerId, socketId: socket.id, nickname, questionAnswers: [], finished: false });
      console.log('🚀 ~ handler ~ room:', room);
      socket.join(roomCode);
      socket.emit('lobbyUpdated', { room, playerId, nickname });
      socket.broadcast.to(roomCode).emit('lobbyUpdated', { room, playerId, nickname });
      callback({
        status: 'success',
        data: {
          playerId: playerId,
          roomCode: room.roomCode,
          roomName: room.roomName,
          players: room.players,
        },
      })
    });

    socket.on('rejoinLobby', ({ roomCode, playerId }, callback) => {
      const room = rooms[roomCode];

      if (!room) {
        callback({
          status: 'error',
          message: 'Room not found',
        });
        return;
      }

      const foundPlayer = room.players.find(p => p.id === playerId);
      socket.join(room.roomCode);

      if (!foundPlayer) {
        callback({
          status: 'error',
          message: 'Player not found',
        });
        return;
      }

      console.log('🚀 ~ handler ~ room after player update on refresh:', room);

      callback({
        status: 'success',
        data: {
          players: room.players,
          roomName: room.roomName,
        }
      })

    });

    socket.on('goToQuestionSets', ({ roomCode, playerId }) => {
      console.log('🚀 ~ startGame handler ~ roomCode:', roomCode);
      const room = rooms[roomCode];
      console.log('🚀 ~ handler ~ rooms:', rooms);
      console.log('🚀 ~ handler ~ room:', room);
      if (!room) { socket.emit('error', { message: 'Room not found! '} ); return;}

      const requestingPlayer = room.players.find(p => p.id === playerId);
      console.log('🚀 ~ handler ~ requestingPlayer:', requestingPlayer);
      console.log('🚀 ~ handler ~ requestingPlayer.id !== room.hostId:', requestingPlayer?.id !== room.hostId);
      if (!requestingPlayer || requestingPlayer.id !== room.hostId) {
        socket.emit('error', { message: 'Only the host can start the game!' });
        return;
      }
      console.log('after the if');

      // I think this is grabbing players incorrectly?? For example, what actually is socketId and id coming from?
      // there's a good change id is just the index of the array. And that won't always match the players id, will it?
      // also idk if socketId is the best way to keep track of players since it might update at any point and could go stale in room object
      // room.players.forEach(({ socketId, id }) => {
      //   io.to(socketId).emit('gameStarted', { roomCode, playerId: id, players: room.players });
      // });

      io.to(roomCode).emit('goToQuestionSets', { questionSets });

      // callback({
      //   status: 'success',
      //   data: {
      //     roomCode: room.roomCode,
      //   },
      // })
    });

    socket.on('startGame', ({ roomCode, questionSet, playerId }) => {
      const room = rooms[roomCode];
      if (!room) { socket.emit('error', { message: 'Room not found! '} ); return;}

      room.questionSet = questionSet;
      console.log('🚀 ~ handler after questionSet ~ room:', room);

      const requestingPlayer = room.players.find(p => p.id === playerId);
      if (!requestingPlayer || requestingPlayer.id !== room.hostId) {
        socket.emit('error', { message: 'Only the host can start the game!' });
        return;
      }

      io.to(roomCode).emit('gameStarted', { questionSet });

      // I think this is grabbing players incorrectly?? For example, what actually is socketId and id coming from?
      // there's a good change id is just the index of the array. And that won't always match the players id, will it?
      // also idk if socketId is the best way to keep track of players since it might update at any point and could go stale in room object
      // room.players.forEach(({ socketId, id }) => {
      //   io.to(socketId).emit('gameStarted', { roomCode, playerId: id, players: room.players });
      // });

      // callback({
      //   status: 'success',
      //   data: {
      //     roomCode: room.roomCode,
      //   },
      // })
    });

    socket.on('finishGame', ({ roomCode, playerId, questionAnswers }, callback) => {
      console.log('🚀 ~ finishGame handler ~ playerId:', playerId);
      const room  = rooms[roomCode];
      console.log('🚀 ~ finishGame handler ~ room:', room);
      if (room === undefined || room.questionSet === null) {
        callback({
          status: 'error',
          message: 'Room not found',
        });
        return;
      }

      let updatedPlayer = room.players.find(p => {
        console.log('🚀 ~ handler ~ p.id:', p.id);
        return p.id === playerId;
      });
      console.log('🚀 ~ handler ~ updatedPlayer:', updatedPlayer);
      if (updatedPlayer === undefined) {
        callback({
          status: 'error',
          message: 'Player not found',
        });
        return;
      }
      updatedPlayer.questionAnswers = questionAnswers;
      updatedPlayer.finished = true;

      console.log('🚀 ~ handler ~ room.players.some(p => !p.finished):', room.players.some(p => !p.finished));
      if (room.players.some(p => !p.finished)) {
        console.log('success branch')
        const otherPlayers = room.players.filter(p => !p.finished);
        console.log('🚀 ~ handler ~ otherPlayers:', otherPlayers);
        const otherPlayersText = otherPlayers.map(p => `${p.nickname}`);
        console.log('🚀 ~ handler ~ otherPlayersText:', otherPlayersText);
        callback({
          status: 'success',
          data: {
            message: `Waiting on ${otherPlayersText}`
          },
        });
        return;
      } else {
        room.players.forEach(p => p.finished = false);
        io.to(roomCode).emit('gameFinished', { players: room.players, questionSet: room.questionSet });
      }

    });

    socket.on('seeResults', ({ roomCode, playerId }, callback) => {
      console.log('🚀 ~ finishGame handler ~ playerId:', playerId);
      const room  = rooms[roomCode];
      console.log('🚀 ~ finishGame handler ~ room:', room);
      if (room === undefined || room.questionSet === null) {
        callback({
          status: 'error',
          message: 'Room not found',
        });
        return;
      }

      let updatedPlayer = room.players.find(p => {
        console.log('🚀 ~ handler ~ p.id:', p.id);
        return p.id === playerId;
      });
      console.log('🚀 ~ handler ~ updatedPlayer:', updatedPlayer);
      if (updatedPlayer === undefined) {
        callback({
          status: 'error',
          message: 'Player not found',
        });
        return;
      }
      updatedPlayer.finished = true;

      console.log('🚀 ~ handler ~ room.players.some(p => !p.finished):', room.players.some(p => !p.finished));
      if (room.players.some(p => !p.finished)) {
        console.log('success branch')
        const otherPlayers = room.players.filter(p => !p.finished);
        console.log('🚀 ~ handler ~ otherPlayers:', otherPlayers);
        const otherPlayersText = otherPlayers.map(p => `${p.nickname}`);
        console.log('🚀 ~ handler ~ otherPlayersText:', otherPlayersText);
        callback({
          status: 'success',
          data: {
            message: `Waiting on ${otherPlayersText}`
          },
        });
        return;
      } else {
        room.players.forEach(p => p.finished = false);
        io.to(roomCode).emit('goToResults', { players: room.players });
      }

    });
  });
};

module.exports = { handler, rooms };

