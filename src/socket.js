// src/socket.js
import { io } from "socket.io-client";

// We no longer send a JWT; just connect to the server
export const SERVER_URL = "http://localhost:3020";
// export const SERVER_URL = "http://localhost:3020";

export const socket = io(SERVER_URL, {
  transports: ["websocket"],
});
