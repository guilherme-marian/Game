const canvas = document.getElementById('canvas1');
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

function animate() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const animation = spriteAnimations['death'];
    let position = Math.floor(gameFrame / staggerFrames) % animation.loc.length;
    const frame = animation.loc[position];
    //ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.drawImage(playerImage, frame.x, frame.y, 
        spriteWidth , spriteHeight, 0, 0, spriteWidth * renderScale,
        spriteHeight * renderScale);  

    gameFrame++;
    requestAnimationFrame(animate);
}
animate();