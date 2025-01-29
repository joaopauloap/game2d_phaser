import Phaser from "phaser";
import { io } from "socket.io-client";

// const socket = io("http://localhost:4000"); // Conectando ao servidor
const socket = io("http://45.7.108.155:4000");

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#2d2d2d",
    scale: {
        mode: Phaser.Scale.FIT, // Ajusta o jogo ao tamanho da tela
        autoCenter: Phaser.Scale.CENTER_BOTH, // Centraliza na tela
    },
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
    fps: {
        target: 30, // Limita a 30 FPS para economizar bateria. util pro mobile
        forceSetTimeOut: true
    }
};

const game = new Phaser.Game(config);

let player;
let otherPlayers = {}; // Para rastrear outros jogadores
let moveWithMouse = false; // Flag para saber se deve mover com o clique

function preload() {
    // this.load.image("player", "path/to/player.png"); // Substitua pelo caminho da sprite
}

function create() {

    // Criando o jogador local
    // player = this.physics.add.image(400, 300, "player");
    const graphics = this.add.graphics();
    graphics.fillStyle(0xff0000, 1); // Vermelho, opacidade 1
    player = this.add.rectangle(400, 300, 50, 50, 0xff0000); // Criar quadrado

    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true); // Impede sair da tela

    // Movendo o jogador com as teclas
    this.cursors = this.input.keyboard.createCursorKeys();

    // Movimento SOMENTE quando o mouse for clicado
    this.input.on("pointerdown", (pointer) => {
        moveWithMouse = true; // Ativa o movimento com o mouse
        movePlayerTo(pointer.x, pointer.y);
    });

    // Desativa o movimento quando soltar o clique
    this.input.on("pointerup", () => {
        moveWithMouse = false;
    });

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
    if (moved) movePlayerTo(player.x, player.y);
}

function movePlayerTo(x, y) {
    socket.emit("playerMove", { x: x, y: y });
}