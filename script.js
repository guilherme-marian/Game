
window.addEventListener('load', function() {
    const canvas = document.getElementById('canvas1');
    const animationSelect = document.getElementById('animation');
    let currentAnimation = 'idle';
    
    class InputHandler {
        constructor() {
            this.keys = [];

            window.addEventListener('keydown', e => {
                if (    e.key === 'ArrowDown' ||
                        e.key === 'ArrowUp' ||
                        e.key === 'ArrowLeft' ||
                        e.key === 'ArrowRight' &&
                        this.keys.indexOf(e.key) === -1 ) {
                    this.keys.push(e.key);
                }
                console.log(e.key, this.keys);
            });
            window.addEventListener('keyup', e => {
                if (e.key === 'ArrowDown' ||
                        e.key === 'ArrowUp' ||
                        e.key === 'ArrowLeft' ||
                        e.key === 'ArrowRight') {
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
            this.width = 200;
            this.height = 200;
            this.x = 0;
            this.y = this.gameHeight - this.height;
        }
        draw(ctx) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        update(input) {
            // movement
            if (input.keys.indexOf('ArrowRight') > -1) {
                this.x += 5;
            } else if (input.keys.indexOf('ArrowLeft') > -1) {
                this.x -= 5;
            }
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
    player.draw(ctx);
    player.update(input);

    animationSelect.addEventListener('change', function(e) {
        currentAnimation = e.target.value;
    });


    function animate() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const animation = spriteAnimations[currentAnimation];
        let position = Math.floor(gameFrame / staggerFrames) % animation.loc.length;
        const frame = animation.loc[position];
        //ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.drawImage(playerImage, frame.x, frame.y, 
            spriteWidth , spriteHeight, 0, 0, spriteWidth * renderScale,
            spriteHeight * renderScale); 
            
            player.update(input);
            player.draw(ctx);

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
