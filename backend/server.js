const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        // origin: "http://45.7.108.155:3000", // Permite o frontend Vite
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const players = {};

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on("newPlayer", (playerData) => {
        players[socket.id] = playerData;
        io.emit("updatePlayers", players);
    });

    socket.on("playerMove", (position) => {
        if (players[socket.id]) {
            players[socket.id].x = position.x;
            players[socket.id].y = position.y;
            io.emit("updatePlayers", players);
        }
    });

    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit("playerDisconnected", socket.id);
    });
});

server.listen(4000, () => {
    console.log("Server is running on http://localhost:4000");
});
