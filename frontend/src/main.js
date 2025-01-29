// Dependências necessárias: Phaser 3, Socket.IO (backend e client)
// Certifique-se de instalar o Socket.IO com: npm install socket.io e npm install socket.io-client

// ==== CLIENT (Frontend - Phaser + Socket.IO) ====
import Phaser from "phaser";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Conectando ao servidor

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#2d2d2d",
    physics: {
        default: "arcade",
        arcade: {
            debug: false,
        },
    },
    scene: {
        preload,
        create,
        update,
    },
};

const game = new Phaser.Game(config);

let player;
let otherPlayers = {}; // Para rastrear outros jogadores

function preload() {
    this.load.image("player", "path/to/player.png"); // Substitua pelo caminho da sprite
}

function create() {
    // Criando o jogador local
    player = this.physics.add.image(400, 300, "player");

    // Movendo o jogador com as teclas
    this.cursors = this.input.keyboard.createCursorKeys();

    // Enviar a posição inicial para o servidor
    socket.emit("newPlayer", { x: player.x, y: player.y });

    // Atualizar outros jogadores ao receber dados do servidor
    socket.on("updatePlayers", (players) => {
        for (const id in players) {
            if (id !== socket.id) {
                if (!otherPlayers[id]) {
                    // Criar um novo jogador
                    otherPlayers[id] = this.physics.add.image(
                        players[id].x,
                        players[id].y,
                        "player"
                    );
                } else {
                    // Atualizar posição do jogador existente
                    otherPlayers[id].setPosition(players[id].x, players[id].y);
                }
            }
        }
    });

    // Remover jogadores desconectados
    socket.on("playerDisconnected", (id) => {
        if (otherPlayers[id]) {
            otherPlayers[id].destroy();
            delete otherPlayers[id];
        }
    });
}

function update() {
    const speed = 200;
    let moved = false;

    // Movimento do jogador
    if (this.cursors.left.isDown) {
        player.x -= speed * this.game.loop.delta / 1000;
        moved = true;
    } else if (this.cursors.right.isDown) {
        player.x += speed * this.game.loop.delta / 1000;
        moved = true;
    }

    if (this.cursors.up.isDown) {
        player.y -= speed * this.game.loop.delta / 1000;
        moved = true;
    } else if (this.cursors.down.isDown) {
        player.y += speed * this.game.loop.delta / 1000;
        moved = true;
    }

    // Enviar a posição atual para o servidor, se o jogador se mover
    if (moved) {
        socket.emit("playerMove", { x: player.x, y: player.y });
    }
}