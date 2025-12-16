const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const initMemoryTester = () => {
  const gridSizeInput = document.querySelector("#grid-size");
  const patternLengthInput = document.querySelector("#pattern-length");
  const showPatternBtn = document.querySelector("#show-pattern");
  const resetBtn = document.querySelector("#reset");
  const gridEl = document.querySelector("#grid");
  const statusEl = document.querySelector("#status");

  if (!gridSizeInput || !patternLengthInput || !showPatternBtn || !resetBtn || !gridEl || !statusEl) {
    throw new Error("Required UI elements are missing for Memory Tester.");
  }

  let gridSize = 4;
  let patternLength = 5;
  let sequence = [];
  let phase = "idle";
  let userIndex = 0;

  const getCell = (index) => gridEl.querySelector(`[data-index="${index}"]`);

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const clearCellState = () => {
    const cells = gridEl.querySelectorAll(".cell");
    cells.forEach((cell) => cell.classList.remove("showing", "user-hit", "miss"));
  };

  const syncSettingsFromInputs = () => {
    const parsedSize = Number.parseInt(gridSizeInput.value, 10);
    gridSize = clamp(Number.isNaN(parsedSize) ? 4 : parsedSize, 2, 8);
    gridSizeInput.value = String(gridSize);

    const maxPattern = gridSize * gridSize;
    patternLengthInput.max = String(maxPattern);
    const parsedLength = Number.parseInt(patternLengthInput.value, 10);
    patternLength = clamp(Number.isNaN(parsedLength) ? 5 : parsedLength, 2, maxPattern);
    patternLengthInput.value = String(patternLength);
  };

  const handleUserInput = (index) => {
    if (phase !== "input") return;

    const expected = sequence[userIndex];
    if (index === expected) {
      const cell = getCell(index);
      if (cell) {
        cell.classList.add("user-hit");
        setTimeout(() => cell.classList.remove("user-hit"), 350);
      }

      userIndex += 1;
      if (userIndex === sequence.length) {
        endRound(true);
      } else {
        updateStatus(`Good so far: ${userIndex}/${sequence.length}`);
      }
    } else {
      endRound(false, index);
    }
  };

  const buildGrid = (size) => {
    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;

    for (let i = 0; i < size * size; i += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.index = String(i);
      const row = Math.floor(i / size) + 1;
      const col = (i % size) + 1;
      cell.setAttribute("aria-label", `Cell ${row}, ${col}`);
      cell.addEventListener("click", () => handleUserInput(i));
      gridEl.appendChild(cell);
    }
  };

  const lockButtons = (locked) => {
    showPatternBtn.disabled = locked;
    resetBtn.disabled = locked && phase === "showing";
  };

  const generateSequence = (length, maxIndex) => {
    const next = [];
    for (let i = 0; i < length; i += 1) {
      next.push(Math.floor(Math.random() * maxIndex));
    }
    return next;
  };

  const flashCell = async (index) => {
    const cell = getCell(index);
    if (!cell) return;
    cell.classList.add("showing");
    await sleep(500);
    cell.classList.remove("showing");
    await sleep(160);
  };

  const playPattern = async () => {
    phase = "showing";
    lockButtons(true);
    updateStatus("Showing pattern - watch closely.");
    clearCellState();

    for (const idx of sequence) {
      if (phase !== "showing") break;
      await flashCell(idx);
    }

    phase = "input";
    userIndex = 0;
    lockButtons(false);
    updateStatus("Your turn: click the cells in order.");
  };

  const endRound = (success, lastIndex) => {
    phase = "idle";
    lockButtons(false);
    if (success) {
      updateStatus("Nice work! Pattern matched. Try a tougher setup or replay.");
    } else {
      if (typeof lastIndex === "number") {
        const cell = getCell(lastIndex);
        if (cell) {
          cell.classList.add("miss");
          setTimeout(() => cell.classList.remove("miss"), 700);
        }
      }
      updateStatus("That one missed. Show the pattern again to retry.");
    }
  };

  const startRound = async () => {
    if (phase === "showing") return;
    syncSettingsFromInputs();
    sequence = generateSequence(patternLength, gridSize * gridSize);
    await playPattern();
  };

  const reset = () => {
    phase = "idle";
    userIndex = 0;
    sequence = [];
    clearCellState();
    lockButtons(false);
    updateStatus("Pick settings and show a pattern to begin.");
  };

  gridSizeInput.addEventListener("input", () => {
    syncSettingsFromInputs();
    buildGrid(gridSize);
    clearCellState();
    updateStatus("Grid updated. Show pattern to play.");
  });

  patternLengthInput.addEventListener("input", () => {
    syncSettingsFromInputs();
  });

  showPatternBtn.addEventListener("click", () => {
    startRound().catch((err) => {
      console.error(err);
      updateStatus("Something went wrong while showing the pattern.");
      phase = "idle";
      lockButtons(false);
    });
  });

  resetBtn.addEventListener("click", reset);

  syncSettingsFromInputs();
  buildGrid(gridSize);
  updateStatus("Pick settings and show a pattern to begin.");

  return { resetToIdle: reset };
};

const initDualNBack = () => {
  const gridEl = document.querySelector("#nback-grid");
  const letterEl = document.querySelector("#nback-letter");
  const statusEl = document.querySelector("#nback-status");
  const scoreEl = document.querySelector("#nback-score");
  const levelInput = document.querySelector("#nback-level");
  const speedInput = document.querySelector("#nback-speed");
  const startBtn = document.querySelector("#nback-start");
  const stopBtn = document.querySelector("#nback-stop");
  const posMatchBtn = document.querySelector("#nback-pos-match");
  const letterMatchBtn = document.querySelector("#nback-letter-match");

  if (
    !gridEl ||
    !letterEl ||
    !statusEl ||
    !scoreEl ||
    !levelInput ||
    !speedInput ||
    !startBtn ||
    !stopBtn ||
    !posMatchBtn ||
    !letterMatchBtn
  ) {
    throw new Error("Required UI elements are missing for Dual N-Back.");
  }

  const letterPool = ["C", "H", "K", "L", "Q", "R", "S", "T", "V", "Z"];
  const cells = [];
  const positions = [];
  const letters = [];

  let nLevel = 2;
  let speed = 2200;
  let state = "idle";
  let cursor = -1;
  let turnTimer = null;
  let flashTimer = null;
  let posHits = 0;
  let posTotal = 0;
  let letterHits = 0;
  let letterTotal = 0;
  let lastPosGuess = -1;
  let lastLetterGuess = -1;

  const buildGrid = () => {
    gridEl.innerHTML = "";
    cells.splice(0, cells.length);

    for (let i = 0; i < 9; i += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "nback-cell";
      cell.dataset.index = String(i);
      const row = Math.floor(i / 3) + 1;
      const col = (i % 3) + 1;
      cell.setAttribute("aria-label", `Cell ${row}, ${col}`);
      cells.push(cell);
      gridEl.appendChild(cell);
    }
  };

  const clearCellHighlights = () => {
    cells.forEach((cell) => cell.classList.remove("nback-current", "nback-hit", "nback-miss"));
  };

  const renderScore = () => {
    scoreEl.textContent = `Position: ${posHits}/${posTotal} | Letter: ${letterHits}/${letterTotal}`;
  };

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const syncSettings = () => {
    const parsedLevel = Number.parseInt(levelInput.value, 10);
    nLevel = clamp(Number.isNaN(parsedLevel) ? 2 : parsedLevel, 1, 4);
    levelInput.value = String(nLevel);

    const parsedSpeed = Number.parseInt(speedInput.value, 10);
    speed = clamp(Number.isNaN(parsedSpeed) ? 2200 : parsedSpeed, 1000, 5000);
    speedInput.value = String(speed);
  };

  const flashLetterFeedback = (className) => {
    letterEl.classList.remove("flash-hit", "flash-miss");
    letterEl.classList.add(className);
    setTimeout(() => letterEl.classList.remove(className), 420);
  };

  const showStimulus = (position, letter) => {
    clearCellHighlights();
    const cell = cells[position];
    if (cell) {
      cell.classList.add("nback-current");
    }
    letterEl.textContent = letter;

    if (flashTimer !== null) {
      window.clearTimeout(flashTimer);
    }
    const offDelay = clamp(speed - 400, 500, 1400);
    flashTimer = window.setTimeout(() => {
      clearCellHighlights();
    }, offDelay);
  };

  const stop = (message = "Stream stopped.") => {
    state = "idle";
    if (turnTimer !== null) {
      window.clearTimeout(turnTimer);
      turnTimer = null;
    }
    if (flashTimer !== null) {
      window.clearTimeout(flashTimer);
      flashTimer = null;
    }
    clearCellHighlights();
    letterEl.textContent = "-";
    lastLetterGuess = -1;
    lastPosGuess = -1;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus(message);
  };

  const runTurn = () => {
    if (state !== "running") return;

    syncSettings();
    cursor += 1;
    const position = Math.floor(Math.random() * 9);
    const letter = letterPool[Math.floor(Math.random() * letterPool.length)];
    positions[cursor] = position;
    letters[cursor] = letter;
    lastPosGuess = -1;
    lastLetterGuess = -1;

    showStimulus(position, letter);
    updateStatus(`Turn ${cursor + 1}. Watch for ${nLevel}-back matches.`);

    turnTimer = window.setTimeout(runTurn, speed);
  };

  const start = () => {
    if (state === "running") return;
    syncSettings();
    positions.length = 0;
    letters.length = 0;
    cursor = -1;
    posHits = 0;
    posTotal = 0;
    letterHits = 0;
    letterTotal = 0;
    lastPosGuess = -1;
    lastLetterGuess = -1;
    renderScore();
    state = "running";
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus(`Streaming cues with ${nLevel}-back.`);
    runTurn();
  };

  const handleGuess = (type) => {
    if (state !== "running") {
      updateStatus("Start the stream first.");
      return;
    }

    if (cursor < nLevel) {
      updateStatus(`Need at least ${nLevel} cues before guessing.`);
      return;
    }

    if (type === "pos" && lastPosGuess === cursor) {
      updateStatus("You already answered position this turn.");
      return;
    }
    if (type === "letter" && lastLetterGuess === cursor) {
      updateStatus("You already answered letter this turn.");
      return;
    }

    const checkIndex = cursor - nLevel;
    if (type === "pos") {
      posTotal += 1;
      const isHit = positions[cursor] === positions[checkIndex];
      lastPosGuess = cursor;
      if (isHit) {
        posHits += 1;
        const cell = cells[positions[cursor]];
        if (cell) cell.classList.add("nback-hit");
        updateStatus("Position match!");
      } else {
        const cell = cells[positions[cursor]];
        if (cell) cell.classList.add("nback-miss");
        updateStatus("No position match that time.");
      }
      window.setTimeout(clearCellHighlights, 420);
    } else {
      letterTotal += 1;
      const isHit = letters[cursor] === letters[checkIndex];
      lastLetterGuess = cursor;
      flashLetterFeedback(isHit ? "flash-hit" : "flash-miss");
      updateStatus(isHit ? "Letter match!" : "No letter match that time.");
      if (isHit) {
        letterHits += 1;
      }
    }

    renderScore();
  };

  buildGrid();
  renderScore();
  stopBtn.disabled = true;

  levelInput.addEventListener("input", syncSettings);
  speedInput.addEventListener("input", syncSettings);
  startBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", () => stop("Stream paused."));
  posMatchBtn.addEventListener("click", () => handleGuess("pos"));
  letterMatchBtn.addEventListener("click", () => handleGuess("letter"));

  return { stop, isRunning: () => state === "running" };
};

document.addEventListener("DOMContentLoaded", () => {
  const heroTitleEl = document.querySelector("#hero-game-title");
  const heroSubEl = document.querySelector("#hero-game-sub");
  const switchTitleEl = document.querySelector("#switch-title");
  const switchSubEl = document.querySelector("#switch-sub");
  const prevBtn = document.querySelector("#game-prev");
  const nextBtn = document.querySelector("#game-next");
  const gamePanels = Array.from(document.querySelectorAll(".game-panel"));

  const memoryGame = initMemoryTester();
  const dualNBack = initDualNBack();

  const games = [
    { id: "memory", title: "Memory Tester", description: "Sequence recall on a custom grid." },
    { id: "nback", title: "Dual N-Back", description: "Track positions and letters N steps back." },
  ];

  let activeIndex = 0;

  const setActiveGame = (index) => {
    activeIndex = (index + games.length) % games.length;
    const meta = games[activeIndex];
    gamePanels.forEach((panel) => {
      const isActive = panel.dataset.gameId === meta.id;
      panel.classList.toggle("active", isActive);
    });

    if (heroTitleEl) heroTitleEl.textContent = meta.title;
    if (heroSubEl) heroSubEl.textContent = meta.description;
    if (switchTitleEl) switchTitleEl.textContent = meta.title;
    if (switchSubEl) switchSubEl.textContent = meta.description;

    if (meta.id === "memory") {
      if (dualNBack.isRunning()) {
        dualNBack.stop("Switched to Memory Tester. Stream paused.");
      }
    } else {
      memoryGame.resetToIdle();
    }
  };

  const gameLinks = Array.from(document.querySelectorAll("[data-game-target]"));
  gameLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = event.currentTarget.dataset.gameTarget;
      if (!target) return;
      event.preventDefault();
      const targetIndex = games.findIndex((game) => game.id === target);
      if (targetIndex !== -1) {
        setActiveGame(targetIndex);
        const section = document.querySelector(`.game-panel[data-game-id=\"${target}\"]`);
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  prevBtn?.addEventListener("click", () => setActiveGame(activeIndex - 1));
  nextBtn?.addEventListener("click", () => setActiveGame(activeIndex + 1));

  setActiveGame(0);
});
