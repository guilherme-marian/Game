window.addEventListener('load', function() {
        const canvas = document.getElementById('canvas2');
        const ctx = canvas.getContext('2d');
        const CANVAS_WIDTH = canvas.width = 576;
        const CANVAS_HEIGHT = canvas.height = 324;
        let gameFrame = 0;
        let lastTime = 0;

        class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = CANVAS_WIDTH;
            this.gameHeight = CANVAS_HEIGHT;
            this.gameFrame = gameFrame;
            this.renderScale = -2;
            this.width = 32;
            this.height = 32;
            this.x = 32;
            this.y = 250;
            this.image = document.getElementById('playerWin');
            this.frameX = 0;
            this.frameY = 0;
            this.maxFrame = 4;
            this.animationTimer = 0;
            this.animationInterval = 10000;
            this.animationIndex = 0;


            if(this.facingLeft) {
                this.rollSpeed = -10;
            }

            //sprite rendering
            this.columns = 8;
            this.staggerFrames = 10;
            this.spriteAnimations = {};
            this.currentAnimation = 'idle';
            this.animationStates = [
                {
                    name: 'idle',
                    frames: 2,
                    row: 0
                },
                {
                    name: 'blink',
                    frames: 2,
                    row: 1
                },
                {
                    name: 'walk',
                    frames: 4,
                    row: 2
                },
                {
                    name: 'run',
                    frames: 8,
                    row: 3
                },
                {
                    name: 'sit',
                    frames: 6,
                    row: 4
                },
                {
                    name: 'jump',
                    frames: 8,
                    row: 5
                },
                {
                    name: 'death',
                    frames: 4,
                    row: 6
                },
                {
                    name: 'fall',
                    frames: 8,
                    row: 7
                },
                {
                    name: 'attack',
                    frames: 8,
                    row: 8
                }
            ];

            this.animationStates.forEach((state) => {
                let frames = {
                    loc: []
                };

                for (let j = 0; j < state.frames; j++) {
                    let positionX = (j % this.columns) * this.width;
                    let positionY = (state.row + Math.floor(j / this.columns)) * this.height;
                    frames.loc.push({ x: positionX, y: positionY });
                }

                this.spriteAnimations[state.name] = frames;
            });
        }
        draw(ctx, gameFrame)
        {
            const animation = this.spriteAnimations[this.currentAnimation];
            if (!animation) {
                console.warn(`Animation "${this.currentAnimation}" not found.`);
                return;
            }

            const position = Math.floor(gameFrame / this.staggerFrames) % animation.loc.length;
            const frame = animation.loc[position];

            ctx.save();
            if (this.renderScale < 0) {
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.image,
                    frame.x, frame.y, this.width, this.height,
                    -256, 194,
                    this.width * this.renderScale, this.height * this.renderScale
                );
            } else {
                ctx.drawImage(
                    this.image,
                    frame.x, frame.y, this.width, this.height - 4,
                    288, this.y,
                    this.width * this.renderScale, this.height * this.renderScale
                );
            }
            ctx.restore();
        }
        update(deltaTime) {
            this.animationTimer += deltaTime;

            if (this.animationTimer >= this.animationInterval) {
                this.animationTimer = 0;
                this.animationIndex = (this.animationIndex + 1) % this.animationStates.length;
                this.currentAnimation = this.animationStates[this.animationIndex].name;
            }
        }

    }

    const playerImage = new Image();
    playerImage.src = './sprites/character/AnimationSheet_Character.png';

    const player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT); 
    player.image = playerImage;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#0f0014ff'); // top: deep purple
        gradient.addColorStop(0.33, '#750202ff'); // bottom: dark crimson
        gradient.addColorStop(0.66, '#423049ff'); // top: deep purple
        gradient.addColorStop(1, '#473e3eff'); // bottom: dark crimson

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        player.draw(ctx, gameFrame);
        player.update(deltaTime);

        ctx.font = '20px Comic Sans MS';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Você completou o Jogo', CANVAS_WIDTH / 2, 100);
        ctx.fillText('Obrigado por jogar', CANVAS_WIDTH  / 2, 132);

        gameFrame++;
        
        requestAnimationFrame(animate);
    }
    playerImage.onload = () => {
        player.image = playerImage;
        requestAnimationFrame(animate);
    };
});