
window.addEventListener('load', function() {
    const canvas = document.getElementById('canvas1');
    let currentAnimation = 'idle';
    
    class InputHandler {
        constructor() {
            this.keys = [];
            this.validKeys = ['ArrowLeft', 'ArrowRight', 'z', 'x'];

            window.addEventListener('keydown', e => {
                if (this.validKeys.includes(e.key) && !this.keys.includes(e.key)) {
                    this.keys.push(e.key);
                }
                console.log(e.key, this.keys);
            });
            window.addEventListener('keyup', e => {
                if (this.validKeys.includes(e.key) > -1) {
                    this.keys.splice(this.keys.indexOf(e.key), 1);
                }
                console.log(e.key, this.keys);
            });
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.renderScale = -4;
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
            this.currentAnimation = 'roll';
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
            console.log(this.spriteAnimations);
        }
        draw(ctx, gameFrame) {
            ctx.fillStyle = 'red';

            const animation = this.spriteAnimations[this.currentAnimation];

            let position = Math.floor(gameFrame / this.staggerFrames) % animation.loc.length;
            const frame = animation.loc[position];

            ctx.fillRect(this.x, this.y, this.width * this.renderScale, this.height * this.renderScale);
            
            ctx.save();
            if (this.facingLeft) {
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.image,
                    frame.x, frame.y, this.width, this.height,
                    0, 0,
                    this.width * Math.abs(this.renderScale),
                    this.height * this.renderScale
                );
            }
            else {
                ctx.drawImage(this.image,
                frame.x, frame.y, this.width, this.height,
                this.x, this.y, 
                this.width * this.renderScale, this.height * this.renderScale);
            }
            ctx.restore();

            
        }
        update(input) {

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
                this.vy -= 30;
            } else if (input.keys.indexOf('x') > -1) {
                this.x += this.rollSpeed;
                this.currentAnimation = 'roll';
            }
            else {
                this.currentAnimation = 'idle';
            }
            //horizontal 
            
            if (this.x < 0) this.x = 0;
            else if (this.x > this.gameWidth - this.width) this.x = this.gameWidth - this.width;

            //vertical  
            this.y += this.vy;

            if (!this.OnGround()) {
                this.vy += this.grav;
                this.currentAnimation = 'jump';
            } else {
                this.vy = 0;
                this.y = this.gameHeight - this.height;
                this.currentAnimation = 'idle';
            }
            if (this.y > this.gameHeight - this.height) this.y = this.gameHeight - this.height;
        }
        OnGround() {
            return this.y >= this.gameHeight - this.height;
        }
    }

    const ctx = canvas.getContext('2d');
    const CANVAS_WIDTH = canvas.width = 600;
    const CANVAS_HEIGHT = canvas.height = 600;

    const playerImage = new Image();
    playerImage.src = '/sprites/knight.png';
    const spriteWidth = 32;
    const spriteHeight = 32;
    let frameX = 0;
    let frameY = 0;
    let gameFrame = 0;
    const columns = 8;
    const renderScale = 10;
    const staggerFrames = 10;
    const spriteAnimations = [];
    const animationStates = [
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

    animationStates.forEach((state) => {
        let frames = {
            loc: []
        };

        for (let j = 0; j < state.frames; j++) {
            let positionX = (j % columns) * spriteWidth;
            let positionY = (state.row + Math.floor(j / columns)) * spriteHeight;
            frames.loc.push({ x: positionX, y: positionY });
        }

        spriteAnimations[state.name] = frames;
    });
    console.log(spriteAnimations);

    const input = new InputHandler();
    const player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT);
    player.draw(ctx, gameFrame);
    player.update(input);


    function animate() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const animation = spriteAnimations[currentAnimation];
        let position = Math.floor(gameFrame / staggerFrames) % animation.loc.length;
        //ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.fillStyle = 'white';
        ctx.fillRect(animation.loc[position].x, animation.loc[position].y,
        spriteWidth * renderScale, spriteHeight * renderScale);
        ctx.drawImage(playerImage, animation.loc[position].x, animation.loc[position].y,
            spriteWidth , spriteHeight, 0, 0, spriteWidth * renderScale,
            spriteHeight * renderScale); 
            
            player.update(input);
            player.draw(ctx, gameFrame);

        gameFrame++;
        requestAnimationFrame(animate);
    }
    animate();
});

var rect1= {x: 50, y: 50, width: 100, height: 100};
var rect2= {x: 200, y: 200, width: 100, height: 100};

if (rect1.x > rect2.x + rect2.width ||
    rect1.x + rect1.width < rect2.x ||
    rect1.y > rect2.y + rect2.height ||
    rect1.y + rect1.height < rect2.y) {
    console.log("No collision detected!");
}
