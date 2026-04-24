let ioInstance = null;
const connectedUsers = new Map();

const setSocketServer = (io) => {
  ioInstance = io;
};

const getSocketServer = () => ioInstance;

const setUserSocket = (userId, socketId) => {
  connectedUsers.set(String(userId), socketId);
};

const getUserSocket = (userId) => connectedUsers.get(String(userId));

const removeUserSocket = (userId) => {
  connectedUsers.delete(String(userId));
};

const getOnlineUserIds = () => Array.from(connectedUsers.keys());

module.exports = {
  setSocketServer,
  getSocketServer,
  setUserSocket,
  getUserSocket,
  removeUserSocket,
  getOnlineUserIds,
};

