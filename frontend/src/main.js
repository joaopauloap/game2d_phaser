import Phaser from "phaser";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000"); // Conectando ao servidor
// const socket = io("http://45.7.108.155:4000");

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
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
};

const game = new Phaser.Game(config);
let players = {};
let circles = {};
let cursors;

function preload() { }

function create() {
    cursors = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    this.input.on("pointerdown", (pointer) => {
        socket.emit("move", { x: pointer.x, y: pointer.y });
    });

    socket.on("updatePlayers", (serverPlayers) => {

        for (const id in serverPlayers) {
            const serverPlayer = serverPlayers[id];

            // Cria o player no front, se não existir
            if (!players[id]) {
                // const player = this.physics.add.sprite(100, 100, "player");
                // player.setCollideWorldBounds(true); 
                // player.setBounce(0.2); 
                players[id] = this.add.circle(100, 100, 20, Phaser.Display.Color.HexStringToColor(serverPlayer.color).color);
                this.physics.world.enable(players[id]);
                players[id].body.setCollideWorldBounds(true);
            }

            // Atualiza a posição com os dados do servidor (interpola para suavizar)
            this.tweens.add({
                targets: players[id],
                x: serverPlayer.x,
                y: serverPlayer.y,
                duration: 50,
                ease: "Linear",
            });
        }

        // Remover jogadores que saíram
        for (const id in players) {
            if (!serverPlayers[id]) {
                players[id].destroy();
                delete players[id];
            }
        }
    });
}

function update() {
    let velocityX = 0;
    let velocityY = 0;

    if (cursors.left.isDown || cursors.a.isDown) {
        velocityX = -1;
    } else if (cursors.right.isDown || cursors.d.isDown) {
        velocityX = 1;
    }

    if (cursors.up.isDown || cursors.w.isDown) {
        velocityY = -1;
    } else if (cursors.down.isDown || cursors.s.isDown) {
        velocityY = 1;
    }

    socket.emit("keyMovement", { x: velocityX, y: velocityY });
}