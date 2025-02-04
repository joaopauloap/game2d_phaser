import Phaser from "phaser";
import { io } from "socket.io-client";

const apiBaseDev = "http://localhost:4000";
const apiBaseLocal = "http://192.168.0.4:4000";
const apiBaseRemote = "http://45.7.108.155:4000";

const isDev = window.location.hostname === 'localhost';
const isLocal = window.location.hostname.startsWith('192.168.');

const apiBaseURL = isDev ? apiBaseDev : (isLocal ? apiBaseLocal : apiBaseRemote);
const socket = io(apiBaseURL);

class MainScene extends Phaser.Scene {
    constructor() { super({ key: "MainScene" }); }

    preload() {
        this.load.image("playerSprite", "assets/ball.png"); // Substitua com a imagem do player
    }

    create() {
        this.players = {}; // Guarda os jogadores
        this.cursors = this.input.keyboard.createCursorKeys(); // Captura teclado

        // Criando um grupo de física para os jogadores
        this.playerGroup = this.physics.add.group();

        socket.on("updatePlayers", (serverPlayers) => {
            for (const id in serverPlayers) {
                const serverPlayer = serverPlayers[id];

                if (!this.players[id]) {
                    // Criar o player como um sprite com física
                    const player = this.add.image(100, 100, "playerSprite");
                    player.displayWidth = 50; // Define a largura para 200 pixels
                    player.displayHeight = 50; // Define a altura para 100 pixels
                    // const player = this.add.circle(100, 100, 20, Phaser.Display.Color.HexStringToColor(serverPlayer.color).color);
                    this.playerGroup.add(player); // Adiciona ao grupo de colisão
                    this.players[id] = player;
                }

                // Atualiza a posição do player
                this.players[id].x = serverPlayer.x;
                this.players[id].y = serverPlayer.y;
            }

            // Remover jogadores desconectados
            for (const id in this.players) {
                if (!serverPlayers[id]) {
                    this.players[id].destroy();
                    delete this.players[id];
                }
            }
        });

        // Adiciona colisão entre todos os jogadores
        this.physics.add.collider(this.playerGroup, this.playerGroup);

        // Captura o clique do mouse e envia para o servidor
        this.input.on('pointerdown', (pointer) => {
            const targetPosition = { x: pointer.x, y: pointer.y };
            socket.emit("moveTo", targetPosition);
        });
    }

    update() {
        if (!this.players[socket.id]) return; // Aguarda o servidor criar o jogador

        let velocity = { x: 0, y: 0 };

        if (this.cursors.left.isDown) velocity.x = -1;
        if (this.cursors.right.isDown) velocity.x = 1;
        if (this.cursors.up.isDown) velocity.y = -1;
        if (this.cursors.down.isDown) velocity.y = 1;

        socket.emit("keyMovement", velocity);
    }
}

// Configuração do Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: 0x404040,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: "arcade",
        arcade: { debug: false }
    },
    scene: MainScene
};

const game = new Phaser.Game(config);