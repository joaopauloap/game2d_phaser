const Matter = require("matter-js");
const io = require("socket.io")(4000, { cors: { origin: "*" } });

const engine = Matter.Engine.create();
engine.gravity.y = 0; // 🔹 Desativa a gravidade!
const world = engine.world;
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const PLAYER_RADIUS = 20;
PLAYER_MASS = 100;
let players = {};

console.log("Listening on port 4000...");

io.on("connection", (socket) => {
    console.log("New player connected", socket.id);

    // Criando um corpo físico para o player no Matter.js
    players[socket.id] = Matter.Bodies.circle(100, 100, PLAYER_RADIUS, {
        mass: PLAYER_MASS,
        restitution: 0.5,
        frictionAir: 0.1,
    });

    Matter.World.add(world, players[socket.id]);

    players[socket.id].targetX = players[socket.id].position.x;
    players[socket.id].targetY = players[socket.id].position.y;
    players[socket.id].color = getRandomColor();
    players[socket.id].controlMode = "mouse";

    socket.on("moveTo", (position) => {
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
        Matter.World.remove(world, players[socket.id]);
        delete players[socket.id];
    });
});

setInterval(() => {
    Matter.Engine.update(engine, 16);
    // Atualizar a posição de todos os jogadores
    const updatedPlayers = {};
    for (const id in players) {
        const player = players[id];

        if (player.controlMode === "mouse") {
            const dx = player.targetX - player.position.x;
            const dy = player.targetY - player.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) { // Limite mínimo de distância para continuar o movimento
                // Normaliza a direção
                const directionX = dx / distance;
                const directionY = dy / distance;

                // Força proporcional à distância, Ajuste conforme necessário
                const forceMagnitude = (distance / 100) * 0.1;

                // Aplica a força no jogador
                Matter.Body.applyForce(player, player.position, {
                    x: directionX * forceMagnitude,
                    y: directionY * forceMagnitude,
                });
            }
        }
        if (player.controlMode === "keyboard") {
            Matter.Body.setVelocity(player, { x: player.velocityX * 3, y: player.velocityY * 3 });
        }

        // Garante que o jogador fique dentro dos limites do jogo
        if (player.position.x < 20) Matter.Body.setPosition(player, { x: 20, y: player.position.y });
        if (player.position.x > WORLD_WIDTH - 20) Matter.Body.setPosition(player, { x: WORLD_WIDTH - 20, y: player.position.y });
        if (player.position.y < 20) Matter.Body.setPosition(player, { x: player.position.x, y: 20 });
        if (player.position.y > WORLD_HEIGHT - 20) Matter.Body.setPosition(player, { x: player.position.x, y: WORLD_HEIGHT - 20 });

        updatedPlayers[id] = {
            x: player.position.x,
            y: player.position.y,
            color: getRandomColor(),
        };
    }

    io.emit("updatePlayers", updatedPlayers);
}, 16);

function getRandomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
}