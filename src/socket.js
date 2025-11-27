// src/socket.js
import { io } from "socket.io-client";

// We no longer send a JWT; just connect to the server
export const SERVER_URL = "https://realtime-tracker-4aed.onrender.com";
// export const SERVER_URL = "https://realtime-tracker-4aed.onrender.com";

export const socket = io(SERVER_URL, {
  transports: ["websocket"],
});
