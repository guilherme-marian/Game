
window.addEventListener('load', function() {
    const canvas = document.getElementById('canvas1');
    let currentAnimation = 'idle';
    const ctx = canvas.getContext('2d');
    const CANVAS_WIDTH = canvas.width = 576;
    const CANVAS_HEIGHT = canvas.height = 324;
    let gameFrame = 0;
    const TILE_WIDTH = 16;
    const TILE_HEIGHT = 16;

    
    class InputHandler {
        constructor() {
            this.keys = new Set();
            this.validKeys = new Set(['ArrowLeft', 'ArrowRight', 'z', 'x', 'r']);

            window.addEventListener('keydown', e => {
                if (this.validKeys.has(e.key) && !this.keys.has(e.key)) {
                    this.keys.add(e.key);
                }
            });
            window.addEventListener('keyup', e => {
                if (this.validKeys.has(e.key)) {
                    this.keys.delete(e.key);
                }
            });
        }
        isPressed(key) {
            return this.keys.has(key);
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = CANVAS_WIDTH;
            this.gameHeight = CANVAS_HEIGHT;
            this.renderScale = -1;
            this.width = 32;
            this.height = 32;
            this.x = 32;
            this.y = 0;
            this.image = document.getElementById('playerImage');
            this.frameX = 0;
            this.frameY = 0;
            this.maxFrame = 4;
            this.speed = 3;
            this.rollSpeed = 4;
            this.isRolling = false;
            this.rollTimer = 0;
            this.vy = 0;
            this.grav = 1;
            this.facingLeft = false;
            this.collisionOffsetY = 32;
            this.jumpCooldown = 0;
            this.jumpCooldownMax = 10;

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

            const { x: playerX, width: playerWidth } = this.getCollisionBox();
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(playerX, this.y, playerWidth, this.height);


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
        update(input, plataforms) {

            if(this.isRolling) {
                this.rollTimer++;
                this.currentAnimation = 'roll';
                const rollStep = this.facingLeft ? -this.rollSpeed : this.rollSpeed;
                this.x += rollStep;

                if(this.rollTimer >= this.rollDuration) {
                    this.isRolling = false;
                    this.rollTimer = 0;
                    this.currentAnimation = 'idle';
                }
                return;
            }
            if (this.jumpCooldown > 0) {
                this.jumpCooldown--;
            }

            if (input.isPressed('ArrowRight')) {
                this.x += this.speed;
                this.currentAnimation = 'run';
                this.facingLeft = false;
            } else if (input.isPressed('ArrowLeft')) {
                this.x -= this.speed;
                this.currentAnimation = 'run';
                this.facingLeft = true;
            }
            if (input.isPressed('z') && this.OnGround(plataforms) && this.jumpCooldown === 0) {
                this.vy -= 10;
                this.jumpCooldown = this.jumpCooldownMax;
            }
            if(
                input.isPressed('x') &&
                !this.isRolling &&
                (this.OnGround(plataforms) || this.checkPlataformCollision(plataforms))
            ) {
                this.currentAnimation = 'roll';
                this.isRolling = true;
                this.rollTimer = 50;
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

            const landedOnPlatform = this.checkPlataformCollision(plataforms);

            if (!this.OnGround() && !landedOnPlatform) {
                this.vy += this.grav;
                if (this.currentAnimation !== 'roll') {
                    this.currentAnimation = 'jump';
                }
            } else if (landedOnPlatform) {
                this.vy = 0;
            }

            if(this.Death() < this.y) {
                this.currentAnimation = 'death';
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Game Over, pressione R para tentar Novamente', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

                if (input.isPressed('r')) {
                    resetLevel();
                }
            }
            if (this.y > this.gameHeight - this.height) this.y = this.gameHeight - this.height;
        }
        OnGround(plataforms) {
            const plataform = this.checkPlataformCollision(plataforms);
            const playerBottom = this.y + this.height + this.collisionOffsetY;
            return (plataform && this.vy >= 0);
        }
        checkPlataformCollision(plataforms) {
            if (!Array.isArray(plataforms)) return false; 

            for (let plataform of plataforms) {
                const playerBottom = this.y + this.height + this.collisionOffsetY - this.vy;
                const playerCurrentBottom = this.y + this.height + this.collisionOffsetY;

                const onTop = playerBottom <= plataform.y &&
                              playerCurrentBottom >= plataform.y;

                const { x: playerX, width: playerWidth } = this.getCollisionBox();

                const withinX = playerX + playerWidth >= plataform.x &&
                                playerX <= plataform.x + plataform.width;

                if (onTop && withinX) {
                    this.y = plataform.y - this.height - this.collisionOffsetY;
                    return true;
                }
            }
            return false;
        }
        getCollisionBox() {
            const drawWidth = this.width * Math.abs(this.renderScale);
            const shrinkAmount = 1;
            if (this.facingLeft) {
                return {
                    x: this.x - drawWidth + shrinkAmount,
                    width: drawWidth - shrinkAmount * 2
                };
            } else {
                return {
                    x: this.x - drawWidth + shrinkAmount,
                    width: drawWidth - shrinkAmount * 2
                };
            }
        }
        Death() {
            return this.gameHeight - this.height;
        }
        

    }
function resetLevel() {
            player.x = 32;
            player.y = 0;
            player.vy = 0;
            gameFrame = 0;
            player.currentAnimation = 'idle';
        }
    class Plataform {
        constructor(x, y, gameWidth, gameHeight, currentAnimation) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.image = document.getElementById('plataformImage');
            this.x = x;
            this.y = y;
            this.width = 16;
            this.height = 16;
            this.renderScale = 1.9;

            //sprite rendering
            this.columns = 1;
            this.staggerFrames = 10;
            this.spriteAnimations = {};
            this.currentAnimation = currentAnimation;
            this.animationStates = [
                { 
                    name: 'short_green',
                    frames: 1, 
                    row: 0,
                    column: 0
                },
                {
                    name: 'short_brown',
                    frames: 1,
                    row: 1,
                    column: 0
                },
                {
                    name: 'short_yellow',
                    frames: 1,
                    row: 2,
                    column: 0
                },
                {
                    name: 'short_blue',
                    frames: 1,
                    row: 3,
                    column: 0
                },
                {
                    name: 'wide_green',
                    frames: 2,
                    row: 0,
                    column: 1
                },
                {
                    name: 'wide_brown',
                    frames: 2,
                    row: 1,
                    column: 1
                },
                {
                    name: 'wide_yellow',
                    frames: 2,
                    row: 2,
                    column: 1
                },
                {
                    name: 'wide_blue',
                    frames: 2,
                    row: 3,
                    column: 1
                }
            ];


            this.animationStates.forEach((state) => {
                let frames = {
                    loc: []
                };

                const positionX = state.column * this.width;
                const positionY = state.row * this.height;
                const frameWidth = this.width * state.frames;

                frames.loc.push({ x: positionX, y: positionY, width: frameWidth });

                this.spriteAnimations[state.name] = frames;
            });

        }

        draw(ctx, gameFrame) {
            const animation = this.spriteAnimations[this.currentAnimation];

            let position = Math.floor(gameFrame / this.staggerFrames) % animation.loc.length;
            const frame = animation.loc[position];
            ctx.strokeStyle = 'black';
            ctx.strokeRect(this.x, this.y - 32, frame.width, this.height);

            ctx.drawImage(
                this.image,
                frame.x, frame.y, frame.width, this.height,
                this.x, this.y - 32, frame.width, this.height
            );
        }
    }

    class Tile {
        constructor(image, x, y, currentAnimation, width = TILE_WIDTH, height = TILE_HEIGHT) {
            this.image = image;           
            this.x = x;               
            this.y = y;
            this.width = width;
            this.height = height;
            this.renderScale = 1;

            const tileStates = [
                // Row 0 – Blocks
                { name: 'brick_block', row: 0, column: 0, width: 1, height: 1 },
                { name: 'brick_dirtBlock', row: 0, column: 1, width: 1, height: 1 },
                { name: 'solid_block_gray', row: 0, column: 2, width: 1, height: 1 },
                { name: 'solid_block_blue', row: 0, column: 3, width: 1, height: 1 },

                // Row 1 – Coins and collectibles
                { name: 'coin_gold', row: 1, column: 0, width: 1, height: 1 },
                { name: 'coin_blue', row: 1, column: 1, width: 1, height: 1 },
                { name: 'coin_red', row: 1, column: 2, width: 1, height: 1 },
                { name: 'coin_green', row: 1, column: 3, width: 1, height: 1 },

                // Row 2 – Pipes
                { name: 'pipe_green', row: 3, column: 0, width: 1, height: 3 },
                { name: 'pipe_yellow', row: 3, column: 5, width: 1, height: 3 },
                { name: 'pipe_red_bottom', row: 4, column: 1, width: 1, height: 1 },

                // Row 3 – Doors and ladders
                { name: 'door_wood', row: 3, column: 0, width: 1, height: 2 },
                { name: 'door_stone', row: 3, column: 1, width: 1, height: 2 },
                { name: 'ladder_vertical', row: 3, column: 2, width: 1, height: 3 },

                // Row 4 – Vegetation
                { name: 'palm_tree_top', row: 4, column: 3, width: 1, height: 1 },
                { name: 'palm_tree_middle', row: 5, column: 3, width: 1, height: 1 },
                { name: 'palm_tree_base', row: 6, column: 3, width: 1, height: 1 },
                { name: 'bush_green', row: 4, column: 4, width: 1, height: 1 },

                // Row 5 – Mushrooms and vases
                { name: 'mushroom_red', row: 5, column: 0, width: 1, height: 1 },
                { name: 'mushroom_blue', row: 5, column: 1, width: 1, height: 1 },
                { name: 'vase_purple', row: 5, column: 2, width: 1, height: 1 },
                { name: 'vase_green', row: 5, column: 4, width: 1, height: 1 },

                // Row 6 – Waterfalls
                { name: 'waterfall_blue_top', row: 6, column: 0, width: 1, height: 1 },
                { name: 'waterfall_blue_middle', row: 7, column: 0, width: 1, height: 1 },
                { name: 'waterfall_blue_bottom', row: 8, column: 0, width: 1, height: 1 },
                { name: 'waterfall_pink_top', row: 6, column: 1, width: 1, height: 1 },
                { name: 'waterfall_pink_middle', row: 7, column: 1, width: 1, height: 1 },
                { name: 'waterfall_pink_bottom', row: 8, column: 1, width: 1, height: 1 },

                // Row 9 – Cat tiles
                { name: 'cat_tile_red', row: 9, column: 0, width: 1, height: 1 },
                { name: 'cat_tile_blue', row: 9, column: 1, width: 1, height: 1 },
                { name: 'cat_tile_pink', row: 9, column: 2, width: 1, height: 1 },
                { name: 'cat_tile_white', row: 9, column: 3, width: 1, height: 1 },
                { name: 'cat_tile_purple', row: 9, column: 4, width: 1, height: 1 },
                { name: 'cat_tile_yellow', row: 9, column: 5, width: 1, height: 1 }
                ];

            for (let row = 0; row < 16; row++) {
                for (let col = 0; col < 16; col++) {
                    tileStates.push({
                        name: `tile_${row}_${col}`,
                        row: row,
                        column: col
                    });
                }
            }

            this.spriteAnimations = {};
            this.currentAnimation = currentAnimation;

            tileStates.forEach(state => {
                this.spriteAnimations[state.name] = {
                    x: state.column * this.width,
                    y: state.row * this.height,
                    width: state.width * this.width,
                    height: state.height * this.height
                };
            });
        }

       draw(ctx) {
        const frame = this.spriteAnimations[this.currentAnimation];

        ctx.drawImage(
                this.image,
                frame.x, frame.y, frame.width, frame.height,
                this.x, this.y, frame.width, frame.height
            );
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
    playerImage.src = './sprites/character/knight.png';
    const backgroundImage = new Background(CANVAS_WIDTH, CANVAS_HEIGHT);


    const tilesetSrc = new Image();
    tilesetSrc.src = './sprites/background/world_tileset.png'

    const input = new InputHandler();
    const player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT);   
    const tiles = [
        new Tile(tilesetSrc, 50, 220, 'pipe_green'),
        new Tile(tilesetSrc, 0, 220, 'pipe_yellow')
    ];


    const plataforms = [
        new Plataform(0, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
        new Plataform(32, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
        new Plataform(64, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
        new Plataform(96, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
        new Plataform(128, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
        new Plataform(200, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
        new Plataform(250, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
        new Plataform(300, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
        new Plataform(350, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
        new Plataform(400, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
        new Plataform(450, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_green'),
        new Plataform(500, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_yellow'),
        new Plataform(500, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue')
    ]
    player.update(input, plataforms);
    function animate() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            backgroundImage.draw(ctx);
            tiles.forEach(tile => {
                tile.draw(ctx);
            });
            player.draw(ctx, gameFrame);

            plataforms.forEach(plataform => {
                plataform.draw(ctx, gameFrame);
            });
            player.update(input, plataforms);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gameFrame++;
        requestAnimationFrame(animate);
    }
    animate();
});