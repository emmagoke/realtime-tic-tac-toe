// let board = Array(9).fill('');
// let currentPlayer = 'X';
// let gameActive = true;
// let scores = {
//     X: 0,
//     O: 0,
//     tie: 0
// }

// const winsPatterns = [
//     [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
//     [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
//     [0, 4, 8], [2, 4, 6]             // diagonals
// ]

// // DOM Element
// const ceils = document.querySelectorAll('.ceil');
// const currentPlayerDisplay = document.getElementById('currentPlayer');
// const gameStatus = document.getElementById('gameStatus');
// const resetBtn = document.getElementById('resetBtn');
// const resetScoreBtn = document.getElementById('resetScoreBtn');
// const scoreX = document.getElementById('scoreX');
// const scoreO = document.getElementById('scoreO');
// const scoreTie = document.getElementById('scoreTie');

// // Event handlers
// function handleCeilClick(index) {
//     if (!gameActive || board[index] !== '') return;

//     board[index] = currentPlayer;
//     updateCeil(index);

//     if (checkWin()) {
//         endGame(`Player ${currentPlayer} Wins`);
//         scores[currentPlayer]++;
//         HighlightWinningCeil();
//     } else if (checkTie()) {
//         endGame(`It's a Tie!`);
//         scores.tie++;
//     } else {
//         currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
//         updateDisplay();
//     }

//     updateScoreDisplay();
// }


// function updateCeil(index) {
//     const ceil = ceils[index];
//     ceil.textContent = currentPlayer;
//     // What does the other argument does
//     ceil.classList.add('taken', currentPlayer.toLowerCase());
// }


// function checkWin() {
//     return winsPatterns.some(pattern => {
//         const [a, b, c] = pattern;
//         return board[a] && board[a] === board[b] && board[a] === board[c]
//     })
// }

// function checkTie() {
//     return board.every((ceil) => ceil !== '')
// }

// function HighlightWinningCeil() {
//     const winPattern = winsPatterns.find((pattern) => {
//         const [a, b, c] = pattern;
//         return board[a] && board[a] === board[b] && board[a] === board[c]
//     });

//     if(winPattern) {
//         winPattern.forEach(index => {
//             ceils[index].classList.add('winner');
//         })
//     }
// }

// function endGame(message) {
//     gameActive = false;
//     const messageClass = message.includes('Tie') ? 'tie-message' : 'winner-message';
//     gameStatus.innerHTML = `<div class=${messageClass}>${message}</div>`;
//     currentPlayerDisplay.textContent = 'Game Over';
// }


// function resetGame() {
//     board = Array(9).fill('');
//     currentPlayer = 'X';
//     gameActive = true;

//     ceils.forEach(ceil => {
//         ceil.textContent = '';
//         ceil.classList.remove('taken', 'x', 'o', 'winner')
//     })

//     gameStatus.textContent = '';
//     updateDisplay();
// }

// function resetScore() {
//     let scores = {
//         X: 0,
//         O: 0,
//         tie: 0
//     };

//     updateScoreDisplay();
// }

// function updateDisplay() {
//     currentPlayerDisplay.textContent = `Player ${currentPlayer}'s Turn`;
//     currentPlayerDisplay.style.color = currentPlayer === 'X' ? '#ff6b6b' : '#4ecdc4';
// }

// function updateScoreDisplay() {
//     scoreX.textContent = scores.X;
//     scoreO.textContent = scores.O;
//     scoreTie.textContent = scores.tie;
// }


// function initializeGame() {
//     ceils.forEach((ceil, index) => {
//         ceil.addEventListener('click', () => handleCeilClick(index));
//     });

//     resetBtn.addEventListener('click', resetGame)
//     resetScoreBtn.addEventListener('click', resetScore);
// }

// document.addEventListener('DOMContentLoaded', initializeGame)

const profile = new URLSearchParams(location.search).get('as') || 'default';
const storageKey = `playerId:${profile}`;

console.log(`storageKey Key: ${storageKey}`)
console.log(`storageKey value: ${localStorage.getItem(storageKey)}`)

const socket = io({ 
  // auth: (cb) => cb({ playerId: localStorage.getItem(storageKey) }),
   auth: (cb) => {
    sentId = localStorage.getItem(storageKey);
    cb({ playerId: sentId });
  },
});

let mySymbol = null;
let game = null;

// DOM
const cells = document.querySelectorAll('.ceil');
const currentPlayerDisplay = document.getElementById('currentPlayer');
const gameStatus = document.getElementById('gameStatus');
const resetBtn = document.getElementById('resetBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const scoreTie = document.getElementById('scoreTie');
const lobby = document.getElementById('lobby');
const gameArea = document.getElementById('gameArea');
const roomInfo = document.getElementById('roomInfo');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const codeInput = document.getElementById('codeInput');

// Socket events
socket.on('joined', ({ gameId, mark }) => {
  mySymbol = mark;
  lobby.style.display = 'none';
  gameArea.style.display = 'block';
  roomInfo.textContent = `Game code: ${gameId} · You are ${mark}`;
});

socket.on('gameState', (state) => {
  game = state;
  render();
});

socket.on('exception', (err) => alert(err.message));

// UI events
createBtn.addEventListener('click', () => 
    {console.log("Clicked");
        socket.emit('createGame')});
joinBtn.addEventListener('click', () =>
  socket.emit('joinGame', { gameId: codeInput.value.trim() }),
);

cells.forEach((cell, index) => {
  cell.addEventListener('click', () => {
    if (!game || game.status !== 'playing' || game.currentTurn !== mySymbol) return;
    socket.emit('makeMove', { index });
  });
});

resetBtn.addEventListener('click', () => socket.emit('rematch'));
resetScoreBtn.addEventListener('click', () => socket.emit('resetScores'));

// Rendering
function render() {
  cells.forEach((cell, i) => {
    const value = game.board[i];
    cell.textContent = value;
    cell.className = 'ceil';
    if (value) cell.classList.add('taken', value.toLowerCase());
    if (game.winningLine?.includes(i)) cell.classList.add('winner');
  });

  scoreX.textContent = game.scores.X;
  scoreO.textContent = game.scores.O;
  scoreTie.textContent = game.scores.tie;

  gameStatus.innerHTML = '';

  if (game.status === 'waiting') {
    currentPlayerDisplay.textContent = `Waiting for opponent… share code ${game.id}`;
    currentPlayerDisplay.style.color = 'white';
  } else if (game.status === 'playing') {
    const yourTurn = game.currentTurn === mySymbol;
    currentPlayerDisplay.textContent = yourTurn
      ? 'Your turn'
      : `Player ${game.currentTurn}'s turn`;
    currentPlayerDisplay.style.color = game.currentTurn === 'X' ? '#ff6b6b' : '#4ecdc4';
  } else {
    currentPlayerDisplay.textContent = 'Game Over';
    const isTie = game.winner === 'tie';
    const msg = isTie
      ? "It's a Tie!"
      : game.winner === mySymbol ? 'You win! 🎉' : 'You lose';
    gameStatus.innerHTML =
      `<div class="${isTie ? 'tie-message' : 'winner-message'}">${msg}</div>`;
  }
}
