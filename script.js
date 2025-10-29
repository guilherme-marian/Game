
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
            this.currentAnimation = 'run';
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

            if(this.isRolling && this.currentAnimation != 'death') {
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

            if (input.isPressed('ArrowRight') && this.currentAnimation !='death') {
                this.x += this.speed;
                this.currentAnimation = 'run';
                this.facingLeft = false;
            } else if (input.isPressed('ArrowLeft') && this.currentAnimation != 'death') {
                this.x -= this.speed;
                this.currentAnimation = 'run';
                this.facingLeft = true;
            }
            if (input.isPressed('z') && this.OnGround(plataforms) && this.jumpCooldown === 0 && this.currentAnimation != 'death') {
                this.vy -= 10;
                this.jumpCooldown = this.jumpCooldownMax;
            }
            if(
                input.isPressed('x') &&
                !this.isRolling &&
                (this.OnGround(plataforms) || this.checkPlataformCollision(plataforms) &&
                this.currentAnimation != 'death')
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
            }
            //vertical  
            this.y += this.vy;

            const landedOnPlatform = this.checkPlataformCollision(plataforms);

            if (!this.OnGround() && !landedOnPlatform && this.currentAnimation != 'death') {
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

                if (onTop && withinX && this.currentAnimation != 'death') {
                    this.y = plataform.y - this.height - this.collisionOffsetY;
                    return true;
                }
            }
            return false;
        }
        getCollisionBox() {
            const drawWidth = this.width * Math.abs(this.renderScale);
            const shrinkAmount = 3;
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
                    name: 'invisible',
                    frames: 1,
                    row: 0,
                    column: 3
                },
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
            //ctx.strokeRect(this.x, this.y - 32, frame.width, this.height);

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
                
                { name: 'solid_block_brown', row: 0, column: 0, width: 1, height: 1 },
                { name: 'solid_block_yellow', row: 0, column: 2, width: 1, height: 1 },
                { name: 'solid_block_gray', row: 0, column: 4, width: 1, height: 1 },
                { name: 'solid_block_blue', row: 0, column: 6, width: 1, height: 1 },

                { name: 'solid_dirt_brown', row: 1, column: 0, width: 1, height: 1 },
                { name: 'solid_dirt_yellow', row: 1, column: 2, width: 1, height: 1 },
                { name: 'solid_dirt_gray', row: 1, column: 4, width: 1, height: 1 },
                { name: 'solid_dirt_blue', row: 1, column: 6, width: 1, height: 1 },

                { name: 'question_green', row: 2, column: 0, width: 1, height: 1 },
                { name: 'question_brown', row: 2, column: 3, width: 1, height: 1 },
                { name: 'question_red', row: 2, column: 4, width: 1, height: 1 },
                { name: 'question_blue', row: 2, column: 7, width: 1, height: 1 },

                { name: 'tree_green', row: 3, column: 0, width: 1, height: 3 },
                { name: 'tree_yellow', row: 3, column: 5, width: 1, height: 3 },
                { name: 'tree_blue', row: 3, column: 6, width: 1, height: 3 },

                
                { name: 'sign_wood', row: 3, column: 8, width: 1, height: 1 },
                { name: 'sign_red', row: 4, column: 8, width: 1, height: 1 },
                { name: 'ladder_wood', row: 3, column: 9, width: 1, height: 1 },
                { name: 'ladder_red', row: 4, column: 9, width: 1, height: 1},
                { name: 'box_wood', row: 3, column: 7, width: 1, height: 1},
                { name: 'box_red', row: 4, column: 7, width: 1, height: 1},
                
                { name: 'palm_tree_top', row: 4, column: 2, width: 3, height: 3 },
                { name: 'palm_tree_base', row: 7, column: 3, width: 1, height: 2 },

                { name: 'tall_bush_green', row: 3, column: 1, width: 1, height: 1 },
                { name: 'normal_bush_green', row: 4, column: 1, width: 1, height: 1 },
                { name: 'short_bush_green', row: 5, column: 1, width: 1, height: 1 },
                { name: 'flower_bush_green', row: 6, column: 1, width: 1, height: 1 },
                { name: 'tall_bush_yellow', row: 6, column: 5, width: 1, height: 1 },
                { name: 'normal_bush_yellow', row: 7, column: 5, width: 1, height: 1 },
                { name: 'short_bush_yellow', row: 8, column: 5, width: 1, height: 1 },
                { name: 'pumpkin', row: 8, column: 4, width: 1, height: 1 },
                { name: 'tall_bush_blue', row: 6, column: 6, width: 1, height: 1 },
                { name: 'normal_bush_blue', row: 7, column: 6, width: 1, height: 1 },
                { name: 'short_bush_blue', row: 8, column: 6, width: 1, height: 1 },

                { name: 'mushroom_red', row: 5, column: 0, width: 1, height: 1 },
                { name: 'mushroom_blue', row: 5, column: 1, width: 1, height: 1 },
                { name: 'vase_purple', row: 5, column: 2, width: 1, height: 1 },
                { name: 'vase_green', row: 5, column: 4, width: 1, height: 1 },

                { name: 'waterfall_blue_top', row: 9, column: 0, width: 1, height: 2 },
                { name: 'waterfall_blue_middleUp', row: 11, column: 0, width: 1, height: 2 },
                { name: 'waterfall_blue_middleDown', row: 13, column: 0, width: 1, height: 2 },
                { name: 'waterfall_blue_down', row: 15, column: 0, width: 1, height: 1 },
                { name: 'waterfall_yellow_top', row: 9, column: 1, width: 1, height: 2 },
                { name: 'waterfall_yellow_middleUp', row: 11, column: 1, width: 1, height: 2 },
                { name: 'waterfall_yellow_middleDown', row: 13, column: 1, width: 1, height: 2 },
                { name: 'waterfall_yellow_down', row: 15, column: 1, width: 1, height: 1 },
                { name: 'waterfall_pink_top', row: 9, column: 2, width: 1, height: 2 },
                { name: 'waterfall_pink_middleUp', row: 11, column: 2, width: 1, height: 2 },
                { name: 'waterfall_pink_middleDown', row: 13, column: 2, width: 1, height: 2 },
                { name: 'waterfall_pink_down', row: 15, column: 2, width: 1, height: 1 },
                { name: 'waterfall_grey_top', row: 9, column: 3, width: 1, height: 2 },
                { name: 'waterfall_grey_middleUp', row: 11, column: 3, width: 1, height: 2 },
                { name: 'waterfall_grey_middleDown', row: 13, column: 3, width: 1, height: 2 },
                { name: 'waterfall_grey_down', row: 15, column: 3, width: 1, height: 1 },

                { name: 'tall_water_blue', row: 9, column: 4, width: 1, height: 2 },
                { name: 'tall_water_pink', row: 11, column: 4, width: 1, height: 2 },
                { name: 'tall_water_yellow', row: 13, column: 4, width: 1, height: 2 },
                { name: 'tall_water_grey', row: 9, column: 6, width: 1, height: 2 },

                { name: 'short_water_blue', row: 9, column: 5, width: 1, height: 1 },
                { name: 'short_water_pink', row: 11, column: 5, width: 1, height: 1 },
                { name: 'short_water_yellow', row: 13, column: 5, width: 1, height: 1 },
                { name: 'short_water_grey', row: 9, column: 7, width: 1, height: 1 },
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
        constructor(gameWidth, gameHeight, image, clouds) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.image = image
            this.clouds = clouds
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


    const tilesetSrc = new Image();
    tilesetSrc.src = './sprites/background/world_tileset.png'

    const input = new InputHandler();
    const player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT);   

    const levels = [
        {
            background: new Background(CANVAS_WIDTH, CANVAS_HEIGHT,
                document.getElementById('backgroundBlue'),
                document.getElementById('cloudsBlue')
            ),
            tiles: [
            new Tile(tilesetSrc, 98, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 520, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 50, 252, 'tree_green'),
            new Tile(tilesetSrc, 0, 252, 'tree_green'),
            new Tile(tilesetSrc, 80, 284, 'tall_bush_green'),
            new Tile(tilesetSrc, 96, 284, 'normal_bush_green'),
            new Tile(tilesetSrc, 64, 284, 'short_bush_green'),
            new Tile(tilesetSrc, 32, 284, 'flower_bush_green'),
            new Tile(tilesetSrc, 0, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 16, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 32, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 48, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 64, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 80, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 96, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 560, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 544, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 528, 300, 'solid_block_brown'),
            new Tile(tilesetSrc, 0, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 16, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 32, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 48, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 64, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 80, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 96, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 560, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 544, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 528, 316, 'solid_dirt_brown'),
            new Tile(tilesetSrc, 512, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 498, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 482, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 466, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 450, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 434, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 418, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 402, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 386, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 370, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 354, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 338, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 322, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 306, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 290, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 274, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 258, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 242, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 226, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 210, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 194, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 178, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 162, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 146, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 130, 300, 'tall_water_blue'),
            new Tile(tilesetSrc, 114, 300, 'tall_water_blue')
            ],
            plataforms: [
            new Plataform(128, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
            new Plataform(200, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
            new Plataform(250, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
            new Plataform(300, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
            new Plataform(350, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
            new Plataform(400, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
            new Plataform(450, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_green'),
            new Plataform(500, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_green'),
            new Plataform(500, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_green'),
            new Plataform(0, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(16, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(32, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(48, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(64, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(80, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(96, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(560, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(544, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(528, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible')
            ]   
        },
        {
            background: new Background(CANVAS_WIDTH, CANVAS_HEIGHT,
                document.getElementById('backgroundYellow'),
                document.getElementById('cloudsYellow')
            ),
            tiles: [
            new Tile(tilesetSrc, 98, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 520, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 50, 252, 'tree_yellow'),
            new Tile(tilesetSrc, 0, 252, 'tree_yellow'),
            new Tile(tilesetSrc, 80, 284, 'tall_bush_yellow'),
            new Tile(tilesetSrc, 96, 284, 'normal_bush_yellow'),
            new Tile(tilesetSrc, 64, 284, 'short_bush_yellow'),
            new Tile(tilesetSrc, 32, 284, 'pumpkin'),
            new Tile(tilesetSrc, 0, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 16, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 32, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 48, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 64, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 80, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 96, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 560, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 544, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 528, 300, 'solid_block_yellow'),
            new Tile(tilesetSrc, 0, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 16, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 32, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 48, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 64, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 80, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 96, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 560, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 544, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 528, 316, 'solid_dirt_yellow'),
            new Tile(tilesetSrc, 512, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 498, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 482, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 466, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 450, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 434, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 418, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 402, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 386, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 370, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 354, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 338, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 322, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 306, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 290, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 274, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 258, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 242, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 226, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 210, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 194, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 178, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 162, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 146, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 130, 300, 'tall_water_pink'),
            new Tile(tilesetSrc, 114, 300, 'tall_water_pink')
            ],
            plataforms: [
            new Plataform(128, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
            new Plataform(200, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
            new Plataform(250, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
            new Plataform(300, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
            new Plataform(350, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
            new Plataform(400, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
            new Plataform(450, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_yellow'),
            new Plataform(500, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_yellow'),
            new Plataform(500, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_yellow'),
            new Plataform(0, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(16, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(32, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(48, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(64, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(80, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(96, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(560, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(544, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(528, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible')
            ]   
        },
        {
            background: new Background(CANVAS_WIDTH, CANVAS_HEIGHT,
                document.getElementById('backgroundImage'),
                document.getElementById('cloudsImage')
            ),
            tiles: [
            new Tile(tilesetSrc, 98, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 520, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 50, 252, 'tree_green'),
            new Tile(tilesetSrc, 0, 252, 'tree_green'),
            new Tile(tilesetSrc, 80, 284, 'tall_bush_green'),
            new Tile(tilesetSrc, 96, 284, 'normal_bush_green'),
            new Tile(tilesetSrc, 64, 284, 'short_bush_green'),
            new Tile(tilesetSrc, 32, 284, 'flower_bush_green'),
            new Tile(tilesetSrc, 0, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 16, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 32, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 48, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 64, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 80, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 96, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 560, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 544, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 528, 300, 'solid_block_gray'),
            new Tile(tilesetSrc, 0, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 16, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 32, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 48, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 64, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 80, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 96, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 560, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 544, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 528, 316, 'solid_dirt_gray'),
            new Tile(tilesetSrc, 512, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 498, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 482, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 466, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 450, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 434, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 418, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 402, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 386, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 370, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 354, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 338, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 322, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 306, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 290, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 274, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 258, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 242, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 226, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 210, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 194, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 178, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 162, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 146, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 130, 300, 'tall_water_yellow'),
            new Tile(tilesetSrc, 114, 300, 'tall_water_yellow')
            ],
            plataforms: [
            new Plataform(128, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_brown'),
            new Plataform(200, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_brown'),
            new Plataform(250, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_brown'),
            new Plataform(300, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_brown'),
            new Plataform(350, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_brown'),
            new Plataform(400, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_brown'),
            new Plataform(450, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_brown'),
            new Plataform(500, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_brown'),
            new Plataform(500, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_brown'),
            new Plataform(0, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(16, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(32, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(48, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(64, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(80, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(96, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(560, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(544, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(528, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible')
            ]   
        },
        {
            background: new Background(CANVAS_WIDTH, CANVAS_HEIGHT,
                document.getElementById('backgroundNight'),
                document.getElementById('cloudsNight')
            ),
            tiles: [
            new Tile(tilesetSrc, 98, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 520, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 50, 252, 'tree_blue'),
            new Tile(tilesetSrc, 0, 252, 'tree_blue'),
            new Tile(tilesetSrc, 80, 284, 'tall_bush_blue'),
            new Tile(tilesetSrc, 96, 284, 'normal_bush_blue'),
            new Tile(tilesetSrc, 64, 284, 'short_bush_blue'),
            new Tile(tilesetSrc, 0, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 16, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 32, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 48, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 64, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 80, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 96, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 560, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 544, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 528, 300, 'solid_block_blue'),
            new Tile(tilesetSrc, 0, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 16, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 32, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 48, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 64, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 80, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 96, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 560, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 544, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 528, 316, 'solid_dirt_blue'),
            new Tile(tilesetSrc, 512, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 498, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 482, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 466, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 450, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 434, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 418, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 402, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 386, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 370, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 354, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 338, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 322, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 306, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 290, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 274, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 258, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 242, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 226, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 210, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 194, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 178, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 162, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 146, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 130, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 114, 300, 'tall_water_grey'),
            new Tile(tilesetSrc, 544, 284, 'sign_wood')
            ],
            plataforms: [
            new Plataform(128, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
            new Plataform(200, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
            new Plataform(250, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
            new Plataform(300, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
            new Plataform(350, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
            new Plataform(400, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
            new Plataform(450, 200, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_blue'),
            new Plataform(500, 250, CANVAS_WIDTH, CANVAS_HEIGHT, 'short_blue'),
            new Plataform(500, 300, CANVAS_WIDTH, CANVAS_HEIGHT, 'wide_blue'),
            new Plataform(0, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(16, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(32, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(48, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(64, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(80, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(96, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(560, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(544, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible'),
            new Plataform(528, 332, CANVAS_WIDTH, CANVAS_HEIGHT, 'invisible')
            ]   
        },
    ]
    
    

    let currentLevel = 0;
    let background = levels[currentLevel].background;
    let tiles = levels[currentLevel].tiles;
    let plataforms = levels[currentLevel].plataforms;

    player.update(input, plataforms);
    function animate() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            background.draw(ctx);
            tiles.forEach(tile => {
                tile.draw(ctx);
            });
            player.draw(ctx, gameFrame);

            plataforms.forEach(plataform => {
                plataform.draw(ctx, gameFrame);
            });
            player.update(input, plataforms);

            if(player.x > CANVAS_WIDTH) {
                currentLevel++;
                if (currentLevel < levels.length) {
                    background = levels[currentLevel].background;
                    tiles = levels[currentLevel].tiles;
                    plataforms = levels[currentLevel].plataforms;
                    player.x = 0;
                } else {
                    console.log("You finished the game!");
                }
            }
        ctx.strokeStyle = 'white';
        ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gameFrame++;
        requestAnimationFrame(animate);
    }
    animate();
});