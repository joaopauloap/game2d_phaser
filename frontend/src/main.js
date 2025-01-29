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
        target: 60, // Limita FPS para economizar bateria. Util pro mobile
        forceSetTimeOut: true
    }
};

const game = new Phaser.Game(config);

let player;
let otherPlayers = {}; // Para rastrear outros jogadores
let cursors;
let target = null; // Armazena o destino do clique

function preload() { }

function create() {
    // Criar jogador (quadrado vermelho)
    // player = this.physics.add.image(400, 300, "player");
    player = this.add.rectangle(400, 300, 50, 50, 0xff0000); // Criar quadrado
    this.physics.world.enable(player);

    // Permitir colisão com as bordas da tela
    player.body.setCollideWorldBounds(true);

    // Adicionar controles de teclado (WASD e setas)
    cursors = {
        up: this.input.keyboard.addKeys({ key1: "W", key2: "UP" }),
        down: this.input.keyboard.addKeys({ key1: "S", key2: "DOWN" }),
        left: this.input.keyboard.addKeys({ key1: "A", key2: "LEFT" }),
        right: this.input.keyboard.addKeys({ key1: "D", key2: "RIGHT" })
    };

    // Detectar clique do mouse/tela para definir destino
    this.input.on("pointerdown", (pointer) => {
        target = { x: pointer.x, y: pointer.y }; // Salva o destino do clique
    });

    // Enviar a posição inicial para o servidor
    socket.emit("newPlayer", { x: player.x, y: player.y });

    // Atualizar outros jogadores ao receber dados do servidor
    socket.on("updatePlayers", (players) => {
        for (const id in players) {
            if (id !== socket.id) {
                if (!otherPlayers[id]) {
                    // Criar um novo jogador
                    otherPlayers[id] = this.add.rectangle(players[id].x, players[id].y, 50, 50, 0x0000ff);
                    this.physics.world.enable(otherPlayers[id]);
                    otherPlayers[id].body.setCollideWorldBounds(true); // Para evitar sair da tela
                } else {
                    const targetX = players[id].x;
                    const targetY = players[id].y;
                    const speed = 200; // Velocidade do movimento

                    // Calcular a distância atual
                    const distance = Phaser.Math.Distance.Between(
                        otherPlayers[id].x,
                        otherPlayers[id].y,
                        targetX,
                        targetY
                    );


                    // Se a distância for maior que 5 pixels, mover o jogador
                    if (distance > 5) {
                        this.physics.moveTo(otherPlayers[id], targetX, targetY, speed);
                    } else {
                        // Quando estiver perto o suficiente, parar o movimento
                        otherPlayers[id].body.setVelocity(0, 0);
                        otherPlayers[id].setPosition(targetX, targetY); // Garante que não passe do ponto
                    }
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

    // Movimento pelo teclado
    if (cursors.left.key1.isDown || cursors.left.key2.isDown) {
        player.body.setVelocityX(-speed);
        moved = true;
    } else if (cursors.right.key1.isDown || cursors.right.key2.isDown) {
        player.body.setVelocityX(speed);
        moved = true;
    } else {
        player.body.setVelocityX(0);
    }

    if (cursors.up.key1.isDown || cursors.up.key2.isDown) {
        player.body.setVelocityY(-speed);
        moved = true;
    } else if (cursors.down.key1.isDown || cursors.down.key2.isDown) {
        player.body.setVelocityY(speed);
        moved = true;
    } else {
        player.body.setVelocityY(0);
    }

    // Enviar a posição atual para o servidor, se o jogador se mover
    if (moved) socket.emit("playerMove", { x: player.x, y: player.y });

    // Movimento suave até o clique do mouse
    if (target) {
        socket.emit("playerMove", { x: target.x, y: target.y });
        this.physics.moveTo(player, target.x, target.y, speed);

        // Para o movimento quando o jogador chega perto do destino
        if (Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y) < 5) {
            player.body.setVelocity(0);
            target = null; // Remove o alvo
        }
    }
}