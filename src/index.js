const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server); // socket.io expects to be called with the raw http server

const port = process.env.PORT;
const publicDirectory = path.join(__dirname, '../public');

app.use(express.static(publicDirectory));

io.on('connection', (socket) => {
  console.log('New websocket connection');

  socket.on('join', ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });
    if (error) {
      return callback(error);
    }
    socket.join(user.room);
    socket.emit('message', generateMessage('admin', 'Welcome'));
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    });
    socket.broadcast.to(user.room).emit('message', generateMessage('admin', `${user.username} has joined the chatroom`));
    callback();
  });

  socket.on('messageSent', (receivedMessage, callback) => {
    const user = getUser(socket.id);
    const filtr = new Filter();
    if (filtr.isProfane(receivedMessage)) {
      return callback('Free speech is not allowed');
    }
    io.to(user.room).emit('message', generateMessage(user.username, receivedMessage));
    callback('Delivered');
  });

  socket.on('sendLocation', (location, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`));
    callback('Location sent');
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit('message', generateMessage(`${user.username} has left the chatroom`));
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});