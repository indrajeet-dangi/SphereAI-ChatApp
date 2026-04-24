import { io } from "socket.io-client";

let socket;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const connectSocket = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  const shouldCreate =
    !socket ||
    !socket.connected ||
    String(socket.auth?.token || "") !== String(token);

  if (shouldCreate) {
    if (socket) {
      socket.disconnect();
    }
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: false,
      auth: {
        token,
      },
    });
  }

  if (socket.disconnected) {
    socket.connect();
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
