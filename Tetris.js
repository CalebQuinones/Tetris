const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const holdCanvas = document.getElementById('hold');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pause');
const resetButton = document.getElementById('reset');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const tryAgainButton = document.getElementById('try-again');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnA = document.getElementById('btn-a');
const btnB = document.getElementById('btn-b');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
context.scale(BLOCK_SIZE, BLOCK_SIZE);

nextCanvas.width = 80;
holdCanvas.width = 80;
const nextCtx = nextCanvas.getContext('2d');
const holdCtx = holdCanvas.getContext('2d');
nextCtx.scale(20, 20);
holdCtx.scale(20, 20);

const colors = [
    null,
    '#38bdf8',
    '#f472b6',
    '#fdba74',
    '#a5b4fc',
    '#22c55e',
    '#facc15',
    '#ec4899'
];

const pieces = {
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'O': [
        [2, 2],
        [2, 2]
    ],
    'L': [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
    ],
    'J': [
        [4, 0, 0],
        [4, 4, 4],
        [0, 0, 0]
    ],
    'I': [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0]
    ],
    'S': [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0]
    ],
    'Z': [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]
};

const piecesKeys = Object.keys(pieces);
const arena = createMatrix(ROWS, COLS);
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    currentPieceType: null,
    nextPieceType: null,
    holdPieceType: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 0
};

function createMatrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function createPiece(type) {
    const matrix = pieces[type];
    return matrix.map(row => row.slice());
}

function randomPiece() {
    return piecesKeys[Math.floor(Math.random() * piecesKeys.length)];
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, direction) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; x++) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (direction > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function showGameOver() {
    paused = true;
    pauseButton.textContent = 'Pause';
    gameOverOverlay.classList.add('visible');
}

function hideGameOver() {
    gameOverOverlay.classList.remove('visible');
}

function playerReset() {
    if (!player.nextPieceType) {
        player.nextPieceType = randomPiece();
    }
    player.currentPieceType = player.nextPieceType;
    player.matrix = createPiece(player.currentPieceType);
    player.nextPieceType = randomPiece();
    player.pos.y = 0;
    player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);
    player.canHold = true;
    updatePreview();

    if (collide(arena, player)) {
        showGameOver();
        return;
    }
}

function playerHold() {
    if (!player.canHold) {
        return;
    }
    if (!player.holdPieceType) {
        player.holdPieceType = player.currentPieceType;
        player.currentPieceType = player.nextPieceType;
        player.matrix = createPiece(player.currentPieceType);
        player.nextPieceType = randomPiece();
    } else {
        const temp = player.currentPieceType;
        player.currentPieceType = player.holdPieceType;
        player.holdPieceType = temp;
        player.matrix = createPiece(player.currentPieceType);
    }

    player.pos.y = 0;
    player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);
    player.canHold = false;
    updatePreview();

    if (collide(arena, player)) {
        showGameOver();
        return;
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        sweepArena();
        playerReset();
    }
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
}

function playerRotate(direction) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, direction);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -direction);
            player.pos.x = pos;
            return;
        }
    }
}

function sweepArena() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; y--) {
        for (let x = 0; x < arena[y].length; x++) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        y++;
        rowCount++;
    }

    if (rowCount > 0) {
        player.lines += rowCount;
        player.score += (rowCount * 100) * rowCount;
        player.level = Math.floor(player.score / 500);
        dropInterval = Math.max(150, 1000 - player.level * 100);
        updateScore();
    }
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                context.strokeStyle = 'rgba(255,255,255,0.18)';
                context.lineWidth = 0.05;
                context.strokeRect(x + offset.x + 0.03, y + offset.y + 0.03, 0.94, 0.94);
            }
        });
    });
}

function drawPreview(matrix, previewContext) {
    previewContext.fillStyle = '#070b12';
    previewContext.fillRect(0, 0, 4, 4);
    if (!matrix) {
        return;
    }

    const offsetX = Math.floor((4 - matrix[0].length) / 2);
    const offsetY = Math.floor((4 - matrix.length) / 2);

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                previewContext.fillStyle = colors[value];
                previewContext.fillRect(x + offsetX, y + offsetY, 1, 1);
                previewContext.strokeStyle = 'rgba(255,255,255,0.18)';
                previewContext.lineWidth = 0.05;
                previewContext.strokeRect(x + offsetX + 0.03, y + offsetY + 0.03, 0.94, 0.94);
            }
        });
    });
}

function updatePreview() {
    drawPreview(createPiece(player.nextPieceType), nextCtx);
    drawPreview(player.holdPieceType ? createPiece(player.holdPieceType) : null, holdCtx);
}

function draw() {
    context.fillStyle = '#070b12';
    context.fillRect(0, 0, COLS, ROWS);

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
}

function updateScore() {
    scoreElement.textContent = player.score;
    linesElement.textContent = player.lines;
    levelElement.textContent = player.level;
}

function update(time = 0) {
    if (paused) {
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function togglePause() {
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    if (!paused) {
        lastTime = performance.now();
        requestAnimationFrame(update);
    }
}

function resetGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 0;
    player.currentPieceType = null;
    player.nextPieceType = null;
    player.holdPieceType = null;
    player.canHold = true;
    dropInterval = 1000;
    paused = false;
    pauseButton.textContent = 'Pause';
    playerReset();
    updateScore();
    updatePreview();
    lastTime = performance.now();
    requestAnimationFrame(update);
}

startButton.addEventListener('click', () => {
    hideGameOver();
    resetGame();
});

pauseButton.addEventListener('click', () => {
    togglePause();
});

resetButton.addEventListener('click', () => {
    hideGameOver();
    resetGame();
});

tryAgainButton.addEventListener('click', () => {
    hideGameOver();
    resetGame();
});

btnUp.addEventListener('click', () => {
    playerRotate(1);
});

btnDown.addEventListener('click', () => {
    playerDrop();
});

btnLeft.addEventListener('click', () => {
    playerMove(-1);
});

btnRight.addEventListener('click', () => {
    playerMove(1);
});

btnA.addEventListener('click', () => {
    playerRotate(1);
});

btnB.addEventListener('click', () => {
    playerHold();
});

window.addEventListener('keydown', event => {
    if (event.target.tagName === 'INPUT') return;

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate(1);
    } else if (event.key.toLowerCase() === 'a') {
        playerRotate(1);
    } else if (event.key.toLowerCase() === 'b') {
        playerHold();
    } else if (event.key.toLowerCase() === 'p') {
        togglePause();
    }
});

resetGame();
