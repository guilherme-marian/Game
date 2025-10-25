
window.addEventListener('load', function() {
    const canvas = document.getElementById('canvas1');
    let currentAnimation = 'idle';
    const ctx = canvas.getContext('2d');
    const CANVAS_WIDTH = canvas.width = 576;
    const CANVAS_HEIGHT = canvas.height = 324;
    let gameFrame = 0;
    
    class InputHandler {
        constructor() {
            this.keys = [];
            this.validKeys = ['ArrowLeft', 'ArrowRight', 'z', 'x'];

            window.addEventListener('keydown', e => {
                if (this.validKeys.includes(e.key) && !this.keys.includes(e.key)) {
                    this.keys.push(e.key);
                }
            });
            window.addEventListener('keyup', e => {
                if (this.validKeys.includes(e.key) > -1) {
                    this.keys.splice(this.keys.indexOf(e.key), 1);
                }
            });
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = CANVAS_WIDTH;
            this.gameHeight = CANVAS_HEIGHT;
            this.renderScale = -1.9;
            this.width = 32;
            this.height = 32;
            this.x = 0;
            this.y = this.gameHeight - this.height;
            this.image = document.getElementById('playerImage');
            this.frameX = 0;
            this.frameY = 0;
            this.maxFrame = 4;
            this.speed = 5;
            this.rollSpeed = 10;
            this.isRolling = false;
            this.rollTimer = 0;
            this.vy = 0;
            this.grav = 1;
            this.facingLeft = false;

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
                    frames: 4,
                    row: 0
                },
                {
                    name: 'jump',
                    frames: 1,
                    row: 2
                },
                {
                    name: 'run',
                    frames: 16,
                    row: 2
                },
                {
                    name: 'roll',
                    frames: 8,
                    row: 5
                },
                {
                    name: 'hit',
                    frames: 4,
                    row: 6
                },
                {
                    name: 'death',
                    frames: 4,
                    row: 7
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

            this.rollDuration = this.spriteAnimations['roll'].loc.length * this.staggerFrames;
        }
        draw(ctx, gameFrame) {
            const animation = this.spriteAnimations[this.currentAnimation];

            let position = Math.floor(gameFrame / this.staggerFrames) % animation.loc.length;
            const frame = animation.loc[position];

            ctx.save();
            if (this.facingLeft) {
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.image,
                    frame.x, frame.y, this.width, this.height - 4,
                    0, 32,
                    this.width * Math.abs(this.renderScale),
                    this.height * this.renderScale
                );
            }
            else {
                ctx.drawImage(this.image,
                frame.x, frame.y, this.width, this.height - 4,
                this.x, this.y + 32, 
                this.width * this.renderScale, this.height * this.renderScale);
            }
            ctx.restore();

            
        }
        update(input) {

            if(this.isRolling) {
                this.rollTimer++;
                this.currentAnimation = 'roll';
                const rollStep = this.facingLeft ? -this.rollSpeed : this.rollSpeed;
                this.x += rollStep;

                if(this.rollTimer >= this.rollDuration) {
                    this.isRolling = false;
                    this.rollTimer = 0 / this.rollDuration;
                    this.currentAnimation = 'idle';
                }
                return;
            }
            if (input.keys.indexOf('ArrowRight') > -1) {
                this.x += this.speed;
                this.currentAnimation = 'run';
                this.facingLeft = false;
            } else if (input.keys.indexOf('ArrowLeft') > -1) {
                this.x -= this.speed;
                this.currentAnimation = 'run';
                this.facingLeft = true;
            }
            else if (input.keys.indexOf('z') > -1 && this.OnGround()) {
                this.vy -= 10;
            } else if (input.keys.indexOf('x') > -1 && !this.isRolling && this.OnGround()) {
                this.currentAnimation = 'roll';
                this.isRolling = true;
                this.rollTimer = 0;
            }
            else {
                this.currentAnimation = 'idle';
            }
            //horizontal 

            const drawWidth = this.width * Math.abs(this.renderScale);

            if (this.facingLeft) {
                if (this.x < drawWidth) this.x = drawWidth;
                else if (this.x > this.gameWidth) this.x = this.gameWidth;
            } else {
                if (this.x < 0) this.x = 0;
                else if (this.x > this.gameWidth - this.renderScale) this.x = this.gameWidth - this.renderScale;
            }
            //vertical  
            this.y += this.vy;

            if (!this.OnGround()) {
                this.vy += this.grav;
                if (this.currentAnimation !== 'roll')
                {
                    this.currentAnimation = 'jump';
                }
            } else {
                this.vy = 0;
                this.y = this.gameHeight - this.height;
                
            }
            if (this.y > this.gameHeight - this.height) this.y = this.gameHeight - this.height;
        }
        OnGround() {
            return this.y >= this.gameHeight - this.height;
        }
    }
    
    class Background {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.image = document.getElementById('backgroundImage');
            this.clouds = document.getElementById('cloudsImage');
            this.x = 0;
            this.y = 0;
            this.width = 576;
            this.height = 324;
            this.speed = 5;
        }
        draw(ctx) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            ctx.drawImage(this.image, this.x + this.width - this.speed, this.y, this.width, this.height);
            ctx.drawImage(this.clouds, this.x, this.y, this.width, this.height);
            ctx.drawImage(this.clouds, this.x + this.width - this.speed , this.y, this.width, this.height);
        }
    }

    const playerImage = new Image();
    playerImage.src = '/sprites/character/knight.png';
    const backgroundImage = new Background(CANVAS_WIDTH, CANVAS_HEIGHT);

    const input = new InputHandler();
    const player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT);
    player.draw(ctx, gameFrame);
    player.update(input);


    function animate() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            backgroundImage.draw(ctx);
            player.update(input);
            player.draw(ctx, gameFrame);

        ctx.strokeStyle = 'white';
        ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gameFrame++;
        requestAnimationFrame(animate);
    }
    animate();
});