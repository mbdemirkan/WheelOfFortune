import './style.css'
import correctSoundUrl from './resources/correct-answer.mp3';
import wrongSoundUrl from './resources/wrong-answer.mp3';
import confetti from 'canvas-confetti';

// Sound Effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const correctAudio = new Audio(correctSoundUrl);
const wrongAudio = new Audio(wrongSoundUrl);

function playSound(type) {
  if (type === 'correct') {
    correctAudio.currentTime = 0;
    correctAudio.play().catch(e => console.error("Audio play failed", e));
  } else if (type === 'wrong') {
    wrongAudio.currentTime = 0;
    wrongAudio.play().catch(e => console.error("Audio play failed", e));
  } else if (type === 'win') {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    // Fanfare: Rapid major arpeggio
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = 'square'; // Arcade-like

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const startTime = now + (i * 0.1);
      gain.gain.setValueAtTime(0.05, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5); // Sustain

      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  }
}
let puzzles = [];
let players = [];
let currentPlayerIndex = 0;
let currentPuzzle = null;
let guessedLetters = new Set();
let currentSpinValue = 0; // standard value
let isSpinActive = false; // waiting for letters?



// Elements
const setupModal = document.getElementById('setup-modal');
const playerInputsContainer = document.getElementById('player-setup-inputs');
const addPlayerBtn = document.getElementById('add-player-btn');
const startGameBtn = document.getElementById('start-game-btn');
const categoryDisplay = document.getElementById('category-display');
const puzzleBoard = document.getElementById('puzzle-board');
const playersContainer = document.getElementById('players-container');
const keyboardContainer = document.getElementById('keyboard');
const winnerModal = document.getElementById('winner-modal');
const winnerNameEl = document.getElementById('winner-name');
const winnerScoreEl = document.getElementById('winner-score');
const newGameBtn = document.getElementById('new-game-btn');
const spinValueInput = document.getElementById('spin-value-input');
const confirmSpinBtn = document.getElementById('confirm-spin-btn');
const solveBtn = document.getElementById('solve-btn');
const solveModal = document.getElementById('solve-modal');
const solveInput = document.getElementById('solve-input');
const submitSolveBtn = document.getElementById('submit-solve-btn');
const cancelSolveBtn = document.getElementById('cancel-solve-btn');

// Fetch Puzzles
fetch('/puzzles.json')
  .then(res => res.json())
  .then(data => {
    puzzles = data;
    console.log("Puzzles loaded:", puzzles);
  })
  .catch(err => console.error("Failed to load puzzles:", err));

// New Game Button
newGameBtn.addEventListener('click', () => {
  winnerModal.classList.add('hidden');
  startNewRound();
});

// Setup Logic
addPlayerBtn.addEventListener('click', () => {
  if (playerInputsContainer.children.length < 10) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = `Player ${playerInputsContainer.children.length + 1}`;
    input.className = 'player-name-input';
    playerInputsContainer.appendChild(input);
  }
});

startGameBtn.addEventListener('click', () => {
  const inputs = Array.from(document.querySelectorAll('.player-name-input'));
  const names = inputs.map(input => input.value.trim()).filter(n => n);
  if (names.length < 2) {
    alert("Minimum 2 players required!");
    return;
  }

  players = names.map(name => ({ name, score: 0 }));
  setupModal.classList.add('hidden');
  startNewRound();
});

function startNewRound() {
  if (puzzles.length === 0) return;
  // Pick random puzzle
  const rnd = Math.floor(Math.random() * puzzles.length);
  currentPuzzle = puzzles[rnd];
  guessedLetters.clear();


  const questionDisplay = document.getElementById('question-display');
  // Render
  renderBoard();
  renderKeyboard();
  renderPlayers();
  updateGameStatus(`New Round: ${currentPuzzle.category}`);
  questionDisplay.textContent = currentPuzzle.question || '';

  // Reset turn state
  isSpinActive = false;
  spinValueInput.value = '200';
  disableKeyboard(true);
}

function renderBoard() {
  puzzleBoard.innerHTML = '';
  const phrase = currentPuzzle.phrase.toUpperCase();
  const words = phrase.split(' ');

  // Simple row wrapping logic
  let rows = [[]];
  let currentRow = 0;

  // Try to distribute words. Max 12-14 letters per row approx? 
  // Let's just put max 3 words per row or wrap if too long

  let currentLength = 0;
  words.forEach(word => {
    if (currentLength + word.length + 1 > 14 && currentLength > 0) {
      currentRow++;
      rows[currentRow] = [];
      currentLength = 0;
    }
    rows[currentRow].push(word);
    currentLength += word.length + 1;
  });

  rows.forEach(rowWords => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'board-row';

    rowWords.forEach((word, wIdx) => {
      // Letters
      for (let char of word) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        if (/[A-Z0-9ÇĞİÖŞÜ]/.test(char)) {
          tile.classList.add('active'); // It's a game tile
          if (guessedLetters.has(char)) {
            tile.textContent = char;
            tile.classList.add('flipped');
          }
        } else {
          // Special char?? usually just letters. assume punctuation shows?
          // Wheel usually only letters. let's just show punctuation
          tile.classList.add('active', 'flipped');
          tile.textContent = char;
        }
        rowDiv.appendChild(tile);
      }

      // Space between words (unless last)
      if (wIdx < rowWords.length - 1) {
        const space = document.createElement('div');
        space.className = 'tile empty';
        rowDiv.appendChild(space);
      }
    });

    puzzleBoard.appendChild(rowDiv);
  });

  categoryDisplay.textContent = currentPuzzle.category;
}

function renderKeyboard() {
  keyboardContainer.innerHTML = '';
  // Turkish alphabet: 29 letters + Q, W, X for potential foreign words/typos support if desired.
  // Standard Turkish: A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z
  // User asked for "All the letters of the Turkish alphabet".
  // Adding Q, W, X is generally safer for game purposes if puzzles contain them (e.g. "SHOW", "BOWL").
  // Let's use standard layout order or alphabetical. Alphabetical Turkish is:
  // A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z
  // But we need Q, W, X too for English words found in puzzles.json.
  // Combined strict alphabetical sort:
  const alphabet = "ABCÇDEFGĞHIİJKLMNOÖPQRSŞTUÜVWXYZ";

  for (let char of alphabet) {
    const btn = document.createElement('button');
    btn.className = 'key';
    btn.textContent = char;
    if (guessedLetters.has(char)) {
      btn.disabled = true;
    }
    btn.onclick = () => handleGuess(char);
    keyboardContainer.appendChild(btn);
  }
}

function renderPlayers() {
  playersContainer.innerHTML = '';
  players.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = `player-card ${idx === currentPlayerIndex ? 'active-turn' : ''}`;
    card.innerHTML = `
      <div>${p.name}</div>
      <div class="player-score">${p.score}</div>
    `;
    playersContainer.appendChild(card);
  });
}

function disableKeyboard(disabled) {
  const keys = document.querySelectorAll('.key');
  keys.forEach(k => {
    if (!guessedLetters.has(k.textContent)) {
      k.disabled = disabled;
    }
  });
}

// Controls
confirmSpinBtn.addEventListener('click', () => {
  const val = spinValueInput.value.trim().toUpperCase();
  if (!val) {
    alert("Please enter a value!");
    return;
  }

  if (val === 'BANKRUPT') {
    players[currentPlayerIndex].score = 0;
    nextTurn();
  } else if (val === 'LOSE TURN') {
    nextTurn();
  } else {
    const numeric = parseInt(val);
    if (isNaN(numeric)) {
      alert("Enter a valid number or generic action.");
      return;
    }
    currentSpinValue = numeric;
    isSpinActive = true;
    disableKeyboard(false); // Enable for guess
    updateGameStatus(`${players[currentPlayerIndex].name}: Guess a letter for ${currentSpinValue}`);
  }
  spinValueInput.value = '200'; // Reset to default
});

// Allow Enter key to submit spin value
spinValueInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    confirmSpinBtn.click();
  }
});


function handleGuess(char) {
  guessedLetters.add(char);
  const phrase = currentPuzzle.phrase.toUpperCase();

  // Count occurrences
  let count = 0;
  for (let c of phrase) {
    if (c === char) count++;
  }

  if (count > 0) {
    playSound('correct');

    // Award points for all correct letters (Consonants AND Vowels as requested)
    players[currentPlayerIndex].score += (currentSpinValue * count);

    renderBoard();
    renderKeyboard();
    renderPlayers();
    updateGameStatus(`Correct! ${count} ${char}'s found.`);

    // Check win
    const unrevealedLetters = phrase.split('').filter(c => /[A-Z0-9ÇĞİÖŞÜ]/.test(c) && !guessedLetters.has(c));
    if (unrevealedLetters.length === 0) {
      handleWin();
      return;
    }

    // Keep turn? Yes, if correct.
    // Reset spin value? You usually have to spin again.
    disableKeyboard(true);
    updateGameStatus(`${players[currentPlayerIndex].name}, spin again!`);

  } else {
    // Incorrect
    playSound('wrong');
    updateGameStatus(`Sorry, no ${char}.`);
    disableKeyboard(true);
    nextTurn();
  }
}

function nextTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  renderPlayers();
  updateGameStatus(`${players[currentPlayerIndex].name}'s Turn. Spin!`);
  disableKeyboard(true);
}

function updateGameStatus(msg) {
  // Maybe an on-screen toast or log? For now just log or basic UI if needed.
  // We don't have a dedicated status bar. Let's hijack the "Set Spin Value" button text temporarily or add one?
  // Added header category display is fine.
  // Let's flash it effectively.
  console.log(msg);
}

// Solve
solveBtn.addEventListener('click', () => {
  solveModal.classList.remove('hidden');
  solveInput.focus();
});
cancelSolveBtn.addEventListener('click', () => solveModal.classList.add('hidden'));
submitSolveBtn.addEventListener('click', () => {
  const guess = solveInput.value.trim().toUpperCase();
  if (guess === "SOLVE" || guess === currentPuzzle.phrase.toUpperCase()) {
    // Win!
    alert(`${players[currentPlayerIndex].name} SOLVED IT! Score: ${players[currentPlayerIndex].score}`);
    currentPuzzle.phrase.toUpperCase().split('').forEach(c => guessedLetters.add(c));
    renderBoard();
    solveModal.classList.add('hidden');
    solveInput.value = '';
    handleWin();
  } else {
    alert("Wrong!");
    solveModal.classList.add('hidden');
    nextTurn();
  }
});

function handleWin() {
  playSound('win');
  const winner = players[currentPlayerIndex];

  winnerNameEl.textContent = winner.name;
  winnerScoreEl.textContent = `${winner.score}`;
  winnerModal.classList.remove('hidden');

  // Confetti!
  const duration = 3000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#ffd700', '#ff00ff', '#00ffff'] // Gold, Pink, Cyan
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ffd700', '#ff00ff', '#00ffff']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}
