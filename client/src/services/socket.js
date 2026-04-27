import { io } from "socket.io-client";

let socket;
const SOCKET_URL = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

export const connectSocket = () => {
  const token = localStorage.getItem("token");
  if (!token || !SOCKET_URL) {
    return null;
  }

  const shouldCreate =
    !socket ||
    String(socket.auth?.token || "") !== String(token);

  if (shouldCreate) {
    if (socket) {
      socket.disconnect();
    }
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
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
