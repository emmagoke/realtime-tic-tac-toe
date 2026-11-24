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

// ---------- identity (JWT guest token) ----------
const profile = new URLSearchParams(location.search).get('as') || 'default';
const tokenKey = `token:${profile}`;
// const profile = new URLSearchParams(location.search).get('as') || 'default';
// const storageKey = `playerId:${profile}`;

async function createGuest() {
  const run = async () => {
    // another tab may have created a token while we waited for the lock
    const existing = localStorage.getItem(tokenKey);
    if (existing) return existing;

    const res = await fetch('/auth/guest', { method: 'POST' });
    if (!res.ok) throw new Error('guest creation failed');
    const { token } = await res.json();
    localStorage.setItem(tokenKey, token);
    return token;
  };
  return navigator.locks ? navigator.locks.request(`guest:${tokenKey}`, run) : run();
}

function getToken() {
  return Promise.resolve(localStorage.getItem(tokenKey) || createGuest());
}

async function api(path) {
  const token = await getToken();
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


// const socket = io({ 
//   // auth: (cb) => cb({ playerId: localStorage.getItem(storageKey) }),
//    auth: (cb) => {
//     sentId = localStorage.getItem(storageKey);
//     cb({ playerId: sentId });
//   },
// });

// auth is a function, so it is re-evaluated on every (re)connection
const socket = io({
  auth: (cb) => getToken()
    .then((token) => cb({ token }))
    .catch(() => cb({ token: null })),
});


let mySymbol = null;
let game = null;

// DOM
const cells = document.querySelectorAll('#gameBoard .ceil');
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
const leaveBtn = document.getElementById('leaveBtn');

const replayArea = document.getElementById('replayArea');
const replayCells = document.querySelectorAll('#replayBoard .ceil');
const replayInfo = document.getElementById('replayInfo');
const replayRoundSelect = document.getElementById('replayRound');
const replayPrevBtn = document.getElementById('replayPrev');
const replayNextBtn = document.getElementById('replayNext');
const replayPlayBtn = document.getElementById('replayPlay');
const replayCloseBtn = document.getElementById('replayClose');
// Socket events
// socket.on('identity', ({ playerId }) => {
//   sessionStorage.setItem('playerId', playerId);
// });

// ---------- socket events ----------
let retriedAuth = false;

socket.on('connect_error', (err) => {
  if (err.message === 'unauthorized' && !retriedAuth) {
    retriedAuth = true;
    console.warn('Token rejected, creating a new guest identity');
    localStorage.removeItem(tokenKey);
    socket.connect();
  }
});

socket.on('disconnect', () => {
  if (game) currentPlayerDisplay.textContent = 'Reconnecting…';
});

// socket.on('identity', ({ playerId }) => localStorage.setItem(storageKey, playerId));

socket.on('joined', ({ gameId, mark }) => {
  mySymbol = mark;
  lobby.style.display = 'none';
  gameArea.style.display = 'block';
  roomInfo.textContent = `Game code: ${gameId} · You are ${mark}`;
});

socket.on('left', () => {
  game = null;
  mySymbol = null;
  codeInput.value = '';
  gameArea.style.display = 'none';
  lobby.style.display = 'block';
  loadHistory();
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

leaveBtn.addEventListener('click', () => socket.emit('leaveGame'));

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
  } else if (game.status === 'abandoned') {
    currentPlayerDisplay.textContent = 'Opponent left the game';
    currentPlayerDisplay.style.color = 'white';
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


// ---------- history ----------
async function loadHistory() {
  try {
    const games = await api('/games/mine');
    historyList.innerHTML = '';

    if (!games.length) {
      historyList.textContent = 'No games yet';
      return;
    }

    games.forEach((g) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;';

      const label = document.createElement('span');
      label.textContent =
        `${g.code} · ${g.status} · you: ${g.myMark} · X ${g.scores.X} – O ${g.scores.O} · ties ${g.scores.tie}`;

      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.cssText = 'padding:6px 14px;font-size:0.8rem;';
      btn.textContent = 'Replay';
      btn.disabled = g.status === 'waiting';
      btn.addEventListener('click', () => openReplay(g.code));

      row.append(label, btn);
      historyList.appendChild(row);
    });
  } catch (err) {
    console.error('Could not load history', err);
  }
}

// ---------- replay ----------
let replayData = null;
let replayRound = null;
let replayStep = 0;
let replayTimer = null;

async function openReplay(code) {
  try {
    replayData = await api(`/games/${code}/replay`);
  } catch {
    alert('Could not load this replay');
    return;
  }
  if (!replayData.rounds.length) {
    alert('No moves were recorded for this game');
    return;
  }

  replayRoundSelect.innerHTML = '';
  replayData.rounds.forEach((r, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Round ${r.roundNumber}`;
    replayRoundSelect.appendChild(option);
  });

  lobby.style.display = 'none';
  gameArea.style.display = 'none';
  replayArea.style.display = 'block';
  selectRound(0);
}

function selectRound(index) {
  stopReplay();
  replayRound = replayData.rounds[index];
  replayStep = 0;
  drawReplay();
}

function boardAt(round, step) {
  const board = Array(9).fill('');
  round.moves.slice(0, step).forEach((m) => (board[m.cellIndex] = m.mark));
  return board;
}

function resultText(winner) {
  if (winner === 'tie') return 'Tie';
  if (!winner) return 'Unfinished';
  return `${winner} won`;
}

function drawReplay() {
  const board = boardAt(replayRound, replayStep);
  const total = replayRound.moves.length;

  replayCells.forEach((cell, i) => {
    cell.textContent = board[i];
    cell.className = 'ceil';
    if (board[i]) cell.classList.add('taken', board[i].toLowerCase());
  });

  if (replayStep === total && replayRound.winningLine) {
    replayRound.winningLine.forEach((i) => replayCells[i].classList.add('winner'));
  }

  replayInfo.textContent =
    `Game ${replayData.code} · Round ${replayRound.roundNumber} · move ${replayStep}/${total}` +
    (replayStep === total ? ` · ${resultText(replayRound.winner)}` : '');
}

function stopReplay() {
  clearInterval(replayTimer);
  replayTimer = null;
  replayPlayBtn.textContent = 'Play';
}

replayRoundSelect.addEventListener('change', () => selectRound(Number(replayRoundSelect.value)));

replayPrevBtn.addEventListener('click', () => {
  stopReplay();
  replayStep = Math.max(0, replayStep - 1);
  drawReplay();
});

replayNextBtn.addEventListener('click', () => {
  stopReplay();
  replayStep = Math.min(replayRound.moves.length, replayStep + 1);
  drawReplay();
});

replayPlayBtn.addEventListener('click', () => {
  if (replayTimer) return stopReplay();
  if (replayStep >= replayRound.moves.length) replayStep = 0;

  replayPlayBtn.textContent = 'Pause';
  drawReplay();
  replayTimer = setInterval(() => {
    replayStep++;
    drawReplay();
    if (replayStep >= replayRound.moves.length) stopReplay();
  }, 800);
});

replayCloseBtn.addEventListener('click', () => {
  stopReplay();
  replayArea.style.display = 'none';
  (game ? gameArea : lobby).style.display = 'block';
});
