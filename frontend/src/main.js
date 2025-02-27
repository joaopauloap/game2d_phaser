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
        this.load.image("avatar1", "assets/ball1.png"); //imagem do player 
        this.load.image("avatar2", "assets/ball2.png");
        this.load.image("avatar3", "assets/ball3.png");
        this.load.image("avatar4", "assets/ball4.png");
        this.load.image("avatar5", "assets/ball5.png");
        this.load.image("avatar6", "assets/ball6.png");
        this.load.html("chatForm", "assets/chat.html"); // Arquivo HTML do chat
    }

    create() {
        this.players = {}; // Guarda os jogadores
        this.cursors = this.input.keyboard.createCursorKeys(); // Captura teclado

        // Criando um grupo de física para os jogadores
        this.playersPhisicsGroup = this.physics.add.group();

        // Função para enviar tamanho da tela ao servidor
        function sendScreenSize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            socket.emit('screenSize', { width, height });
        }

        // Enviar tamanho da tela ao conectar
        socket.on('connect', () => {
            sendScreenSize();
        });

        // Atualizar tamanho ao redimensionar a tela
        window.addEventListener('resize', sendScreenSize);


        socket.on("updatePlayers", (serverPlayers) => {
            for (const id in serverPlayers) {
                const serverPlayer = serverPlayers[id];

                if (!this.players[id]) {
                    // Criar o player como um sprite
                    const player = this.add.image(100, 100, `avatar${Phaser.Math.Between(1, 6)}`);
                    player.setDisplaySize(50, 50);  //redimensionar avatar para 50x50 px
                    this.playersPhisicsGroup.add(player); // Adiciona ao grupo de colisão
                    this.players[id] = player;
                }

                // Atualiza a posição do player
                this.players[id].x = serverPlayer.x;
                this.players[id].y = serverPlayer.y;
                this.players[id].setTexture(serverPlayer.avatar);
                this.players[id].setDisplaySize(50, 50);

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
        this.physics.add.collider(this.playersPhisicsGroup, this.playersPhisicsGroup);

        // Captura o clique do mouse e envia para o servidor
        this.input.on('pointerdown', (pointer) => {
            const targetPosition = { x: pointer.x, y: pointer.y };
            socket.emit("moveTo", targetPosition);
        });


        // Criar interface do chat
        this.chatBox = this.add.dom(180, 550).createFromCache("chatForm");
        const chatInput = document.getElementById("chatInput");

        // Impede que o Phaser bloqueie o espaço e outras teclas ao digitar
        chatInput.addEventListener("keydown", (event) => {
            event.stopPropagation();
        });

        // Alternativamente, desativar controles do Phaser ao focar no input
        chatInput.addEventListener("focus", () => {
            this.input.keyboard.enabled = false;
        });

        //Reativar controles ao desfocar input
        chatInput.addEventListener("blur", () => {
            this.input.keyboard.enabled = true;
        });

        // Capturar entrada do chat
        this.chatBox.addListener("submit");
        this.chatBox.on("submit", (event) => {
            event.preventDefault();
            if (chatInput.value !== "") {
                if (chatInput.placeholder == "Digite o novo nick:") {
                    socket.emit("updateNick", chatInput.value);
                    chatInput.placeholder = "Digite sua mensagem...";
                    nickButton.innerText = "Nick";
                    nickButton.style = "color:#fff";
                    chatInput.value = "";
                    chatInput.blur();
                } else {
                    socket.emit("chatMessage", chatInput.value);
                }
                chatInput.value = "";
                chatInput.blur();
            }
        });

        //Dar foco no chat ao pressionar ENTER
        this.input.keyboard.on('keydown-ENTER', () => {
            chatInput.focus();
        });

        // Receber mensagens do servidor
        socket.on("chatMessage", (data) => {
            const chatArea = document.getElementById("chatArea");
            chatArea.value += `\n${data.nick}: ${data.message}`;
            chatArea.scrollTop = chatArea.scrollHeight;
        });

        //Botão de alterar nick
        const nickButton = document.getElementById("nickButton");
        nickButton.addEventListener("click", () => {
            if (chatInput.value !== "" && chatInput.placeholder == "Digite o novo nick:") {
                socket.emit("updateNick", chatInput.value);
                chatInput.placeholder = "Digite sua mensagem...";
                nickButton.innerText = "Nick";
                nickButton.style = "color:#fff";
                chatInput.value = "";
                chatInput.blur();
            } else {
                chatInput.placeholder = "Digite o novo nick:";
                chatInput.value = "";
                nickButton.innerText = "OK";
                nickButton.style = "color:#00ff00";
            }
        });

        //Botão de trocar avatar
        const avatarButton = document.getElementById("avatarButton");
        avatarButton.addEventListener("click", () => {
            socket.emit("updateAvatar", `avatar${Phaser.Math.Between(1, 6)}`);
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
    // width: 800,
    // height: 600,
    backgroundColor: 0x404040,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: "arcade",
        arcade: { debug: false }
    },
    parent: "game-container",
    dom: {
        createContainer: true
    },
    scene: MainScene
};

const game = new Phaser.Game(config);