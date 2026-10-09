let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;
let scores = {
    X: 0,
    O: 0,
    tie: 0
}

const winsPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
]

// DOM Element
const ceils = document.querySelectorAll('.ceil');
const currentPlayerDisplay = document.getElementById('currentPlayer');
const gameStatus = document.getElementById('gameStatus');
const resetBtn = document.getElementById('resetBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const scoreTie = document.getElementById('scoreTie');

// Event handlers
function handleCeilClick(index) {
    if (!gameActive || board[index] !== '') return;

    board[index] = currentPlayer;
    updateCeil(index);

    if (checkWin()) {
        endGame(`Player ${currentPlayer} Wins`);
        scores[currentPlayer]++;
        HighlightWinningCeil();
    } else if (checkTie()) {
        endGame(`It's a Tie!`);
        scores.tie++;
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateDisplay();
    }

    updateScoreDisplay();
}


function updateCeil(index) {
    const ceil = ceils[index];
    ceil.textContent = currentPlayer;
    // What does the other argument does
    ceil.classList.add('taken', currentPlayer.toLowerCase());
}


function checkWin() {
    return winsPatterns.some(pattern => {
        const [a, b, c] = pattern;
        return board[a] && board[a] === board[b] && board[a] === board[c]
    })
}

function checkTie() {
    return board.every((ceil) => ceil !== '')
}

function HighlightWinningCeil() {
    const winPattern = winsPatterns.find((pattern) => {
        const [a, b, c] = pattern;
        return board[a] && board[a] === board[b] && board[a] === board[c]
    });

    if(winPattern) {
        winPattern.forEach(index => {
            ceils[index].classList.add('winner');
        })
    }
}

function endGame(message) {
    gameActive = false;
    const messageClass = message.includes('Tie') ? 'tie-message' : 'winner-message';
    gameStatus.innerHTML = `<div class=${messageClass}>${message}</div>`;
    currentPlayerDisplay.textContent = 'Game Over';
}


function resetGame() {
    board = Array(9).fill('');
    currentPlayer = 'X';
    gameActive = true;

    ceils.forEach(ceil => {
        ceil.textContent = '';
        ceil.classList.remove('taken', 'x', 'o', 'winner')
    })

    gameStatus.textContent = '';
    updateDisplay();
}

function resetScore() {
    let scores = {
        X: 0,
        O: 0,
        tie: 0
    };

    updateScoreDisplay();
}

function updateDisplay() {
    currentPlayerDisplay.textContent = `Player ${currentPlayer}'s Turn`;
    currentPlayerDisplay.style.color = currentPlayer === 'X' ? '#ff6b6b' : '#4ecdc4';
}

function updateScoreDisplay() {
    scoreX.textContent = scores.X;
    scoreO.textContent = scores.O;
    scoreTie.textContent = scores.tie;
}


function initializeGame() {
    ceils.forEach((ceil, index) => {
        ceil.addEventListener('click', () => handleCeilClick(index));
    });

    resetBtn.addEventListener('click', resetGame)
    resetScoreBtn.addEventListener('click', resetScore);
}

document.addEventListener('DOMContentLoaded', initializeGame)
