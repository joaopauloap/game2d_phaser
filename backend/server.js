const io = require("socket.io")(4000, {
    cors: {
        origin: "*",
    },
});

let players = {};

io.on("connection", (socket) => {
    console.log("New player connected", socket.id);

    players[socket.id] = {
        x: 100,
        y: 100,
        targetX: 100,
        targetY: 100,
        velocityX: 0,
        velocityY: 0,
        controlMode: "mouse",
        color: getRandomColor(),
    };

    io.emit("updatePlayers", players);

    socket.on("move", (position) => {
        if (players[socket.id]) {
            players[socket.id].targetX = position.x;
            players[socket.id].targetY = position.y;
            players[socket.id].controlMode = "mouse";
        }
    });

    socket.on("keyMovement", (velocity) => {
        if (players[socket.id]) {
            players[socket.id].velocityX = velocity.x;
            players[socket.id].velocityY = velocity.y;
            if (velocity.x !== 0 || velocity.y !== 0) {
                players[socket.id].controlMode = "keyboard";
            }
        }
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

setInterval(() => {
    for (const id in players) {
        const player = players[id];

        if (player.controlMode === "mouse") {
            const dx = player.targetX - player.x;
            const dy = player.targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 1) {
                const speed = 2;
                player.x += (dx / distance) * speed;
                player.y += (dy / distance) * speed;
            }
        }

        if (player.controlMode === "keyboard") {
            player.x += player.velocityX * 2;
            player.y += player.velocityY * 2;
        }
    }
    io.emit("updatePlayers", players);
}, 16);

function getRandomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
}