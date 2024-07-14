const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const socket = require('socket.io');
const http = require('http');

app.use(cors());

const server = http.createServer(app);
const io = socket(server, {
  cors: { origin: 'http://127.0.0.1:5173' }
});

let socketsConnected = new Set();
let users = {};
let onlineUsers = {}; // Utilisateurs en ligne avec le statut de disponibilité

io.on('connection', (socket) => {
  console.log(`Nouvel utilisateur connecté: ${socket.id}`);
  socketsConnected.add(socket.id);

  io.emit('userCount', socketsConnected.size);

  socket.on('message', (message) => {
    io.emit('message', message);
  });

  socket.on('privateMessage', (message) => {
    const recipientSocket = io.sockets.sockets.get(message.recipientId);
    if (recipientSocket) {
      if (recipientSocket.id !== socket.id) {
        recipientSocket.emit('message', message);
      }
      socket.emit('message', message);  
    }
  });

  socket.on('typing', (user) => {
    if (user.recipientId === 'All') {
      socket.broadcast.emit('typing', user);
    } else {
      const recipientSocket = io.sockets.sockets.get(user.recipientId);
      if (recipientSocket) {
        recipientSocket.emit('typing', user);
      }
    }
  });

  socket.on('stopTyping', (recipientId) => {
    if (recipientId === 'All') {
      socket.broadcast.emit('stopTyping');
    } else {
      const recipientSocket = io.sockets.sockets.get(recipientId);
      if (recipientSocket) {
        recipientSocket.emit('stopTyping');
      }
    }
  });

  socket.on('setUsername', (username) => {
    users[socket.id] = username;
    onlineUsers[socket.id] = { username, isOnline: true }; // Marquer l'utilisateur comme en ligne
    io.emit('updateUserList', users);
    io.emit('updateOnlineStatus', onlineUsers);
  });

  socket.on('disconnect', () => {
    console.log(`Utilisateur déconnecté: ${socket.id}`);
    socketsConnected.delete(socket.id);
    delete users[socket.id];
    delete onlineUsers[socket.id]; // Retirer l'utilisateur de la liste des utilisateurs en ligne
    io.emit('updateUserList', users);
    io.emit('updateOnlineStatus', onlineUsers);
    io.emit('userCount', socketsConnected.size);
  });

// msg lu
  // socket.on('messageRead', (messageId) => {
  //   io.emit('messageSeen', messageId);
  // });





});

app.get('/', (req, res) => {
  res.send('Hello, welcome to my server');
});

server.listen(port, () => {
  console.log(`Server online on port http://localhost:${port}`);
});
