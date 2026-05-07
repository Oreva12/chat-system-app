const registerTypingHandlers = (io, socket) => {

  // typing:start
  socket.on("typing:start", ({ roomId }) => {
    // Notify everyone in the room EXCEPT the sender
    socket.to(roomId).emit("typing:update", {
      roomId,
      user: {
        _id:      socket.user._id,
        username: socket.user.username,
      },
      isTyping: true,
    });
  });

  // typing:stop 
  socket.on("typing:stop", ({ roomId }) => {
    socket.to(roomId).emit("typing:update", {
      roomId,
      user: {
        _id:      socket.user._id,
        username: socket.user.username,
      },
      isTyping: false,
    });
  });

};

module.exports = registerTypingHandlers;