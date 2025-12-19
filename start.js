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
  const missedEl = document.querySelector("#nback-missed");
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
    !missedEl ||
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
  const posMatchByTurn = [];
  const letterMatchByTurn = [];
  const posResponded = [];
  const letterResponded = [];
  const missedMatches = [];

  let nLevel = 2;
  let speed = 2200;
  let state = "idle";
  let cursor = -1;
  let turnTimer = null;
  let flashTimer = null;
  let posHits = 0;
  let posOpportunities = 0;
  let letterHits = 0;
  let letterOpportunities = 0;

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
    scoreEl.textContent = `Position: ${posHits}/${posOpportunities} | Letter: ${letterHits}/${letterOpportunities}`;
  };

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateMissed = () => {
    if (missedMatches.length === 0) {
      missedEl.textContent = "Missed: none yet.";
      return;
    }
    const recent = missedMatches.slice(-4).map((item) => item.detail);
    missedEl.textContent = `Missed: ${recent.join(" | ")}`;
  };

  const formatPosition = (pos) => {
    const row = Math.floor(pos / 3) + 1;
    const col = (pos % 3) + 1;
    return `r${row}c${col}`;
  };

  const finalizeTurn = (turnIndex) => {
    if (posMatchByTurn[turnIndex] && !posResponded[turnIndex]) {
      const detail = `Pos T${turnIndex + 1} ${formatPosition(positions[turnIndex])}`;
      missedMatches.push({ turn: turnIndex + 1, type: "position", detail });
    }

    if (letterMatchByTurn[turnIndex] && !letterResponded[turnIndex]) {
      const detail = `Letter T${turnIndex + 1} ${letters[turnIndex]}`;
      missedMatches.push({ turn: turnIndex + 1, type: "letter", detail });
    }

    updateMissed();
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
    if (state === "running") {
      finalizeTurn(cursor);
    }
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
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus(message);
  };

  const runTurn = () => {
    if (state !== "running") return;

    syncSettings();
    if (cursor >= 0) {
      finalizeTurn(cursor);
    }
    cursor += 1;
    const position = Math.floor(Math.random() * 9);
    const letter = letterPool[Math.floor(Math.random() * letterPool.length)];
    positions[cursor] = position;
    letters[cursor] = letter;
    posResponded[cursor] = false;
    letterResponded[cursor] = false;
    const posMatch = cursor >= nLevel && position === positions[cursor - nLevel];
    const letterMatch = cursor >= nLevel && letter === letters[cursor - nLevel];
    posMatchByTurn[cursor] = posMatch;
    letterMatchByTurn[cursor] = letterMatch;
    if (posMatch) {
      posOpportunities += 1;
    }
    if (letterMatch) {
      letterOpportunities += 1;
    }

    showStimulus(position, letter);
    updateStatus(`Turn ${cursor + 1}. Watch for ${nLevel}-back matches.`);
    renderScore();

    turnTimer = window.setTimeout(runTurn, speed);
  };

  const start = () => {
    if (state === "running") return;
    syncSettings();
    positions.length = 0;
    letters.length = 0;
    posMatchByTurn.length = 0;
    letterMatchByTurn.length = 0;
    posResponded.length = 0;
    letterResponded.length = 0;
    missedMatches.length = 0;
    cursor = -1;
    posHits = 0;
    posOpportunities = 0;
    letterHits = 0;
    letterOpportunities = 0;
    renderScore();
    updateMissed();
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

    if (type === "pos" && posResponded[cursor]) {
      updateStatus("You already answered position this turn.");
      return;
    }
    if (type === "letter" && letterResponded[cursor]) {
      updateStatus("You already answered letter this turn.");
      return;
    }

    if (type === "pos") {
      const isHit = posMatchByTurn[cursor];
      posResponded[cursor] = true;
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
      const isHit = letterMatchByTurn[cursor];
      letterResponded[cursor] = true;
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

const initDigitOrder = () => {
  const countInput = document.querySelector("#digit-count");
  const revealInput = document.querySelector("#digit-reveal");
  const startBtn = document.querySelector("#digit-start");
  const resetBtn = document.querySelector("#digit-reset");
  const fieldEl = document.querySelector("#digit-field");
  const statusEl = document.querySelector("#digit-status");

  if (!countInput || !revealInput || !startBtn || !resetBtn || !fieldEl || !statusEl) {
    throw new Error("Required UI elements are missing for Digit Order.");
  }

  let count = 8;
  let revealMs = 1600;
  let phase = "idle";
  let expected = 1;
  let revealTimer = null;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const syncSettings = () => {
    const parsedCount = Number.parseInt(countInput.value, 10);
    count = clamp(Number.isNaN(parsedCount) ? 8 : parsedCount, 3, 20);
    countInput.value = String(count);

    const parsedReveal = Number.parseInt(revealInput.value, 10);
    revealMs = clamp(Number.isNaN(parsedReveal) ? 1600 : parsedReveal, 500, 6000);
    revealInput.value = String(revealMs);
  };

  const clearTimer = () => {
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer);
      revealTimer = null;
    }
  };

  const resetBoard = () => {
    clearTimer();
    fieldEl.innerHTML = "";
    expected = 1;
    phase = "idle";
  };

  const shuffle = (items) => {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };

  const getFieldBounds = () => {
    const rect = fieldEl.getBoundingClientRect();
    const side = Math.max(0, Math.min(rect.width, rect.height));
    if (side === 0) {
      return { width: 320, height: 320 };
    }
    return { width: rect.width, height: rect.height };
  };

  const placeCards = (cardSize) => {
    const { width, height } = getFieldBounds();
    const padding = 6;
    const maxX = width - cardSize - padding;
    const maxY = height - cardSize - padding;
    if (maxX <= padding || maxY <= padding) return null;

    const placed = [];
    const gap = 8;

    for (let i = 0; i < count; i += 1) {
      let next = null;
      for (let attempt = 0; attempt < 220; attempt += 1) {
        const x = padding + Math.random() * (maxX - padding);
        const y = padding + Math.random() * (maxY - padding);
        const overlap = placed.some(
          (rect) =>
            !(x + cardSize + gap <= rect.x ||
              rect.x + cardSize + gap <= x ||
              y + cardSize + gap <= rect.y ||
              rect.y + cardSize + gap <= y),
        );
        if (!overlap) {
          next = { x, y };
          break;
        }
      }
      if (!next) return null;
      placed.push(next);
    }

    return placed;
  };

  const handleCardClick = (card, value) => {
    if (phase !== "input") return;

    card.classList.remove("flipped");
    if (value === expected) {
      card.classList.add("correct");
      card.disabled = true;
      expected += 1;
      if (expected > count) {
        phase = "idle";
        updateStatus("Nice run! Want another round?");
      } else {
        updateStatus(`Good. Find ${expected} next.`);
      }
    } else {
      card.classList.add("wrong");
      updateStatus(`Missed. Expected ${expected}.`);
      setTimeout(() => card.classList.remove("wrong"), 420);
    }
  };

  const buildBoard = () => {
    fieldEl.innerHTML = "";
    const { width, height } = getFieldBounds();
    const grid = Math.ceil(Math.sqrt(count));
    let size = clamp(Math.floor(Math.min(width, height) / grid) - 10, 34, 76);
    let positions = placeCards(size);
    let attempts = 0;
    while (!positions && attempts < 5) {
      size = Math.max(30, size - 6);
      positions = placeCards(size);
      attempts += 1;
    }

    if (!positions) {
      positions = [];
      const gap = 10;
      size = clamp(Math.floor((Math.min(width, height) - gap * (grid + 1)) / grid), 28, 68);
      for (let i = 0; i < count; i += 1) {
        const row = Math.floor(i / grid);
        const col = i % grid;
        positions.push({ x: gap + col * (size + gap), y: gap + row * (size + gap) });
      }
    }

    fieldEl.style.setProperty("--digit-size", `${size}px`);
    const numbers = shuffle(Array.from({ length: count }, (_, idx) => idx + 1));
    positions.forEach((pos, index) => {
      const value = numbers[index];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "digit-card";
      card.textContent = String(value);
      card.dataset.value = String(value);
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;
      card.setAttribute("aria-label", `Digit ${value}`);
      card.addEventListener("click", () => handleCardClick(card, value));
      fieldEl.appendChild(card);
    });
  };

  const startRound = () => {
    syncSettings();
    resetBoard();
    buildBoard();
    if (!fieldEl.children.length) {
      updateStatus("Unable to build the board. Resize and try again.");
      return;
    }
    phase = "showing";
    updateStatus("Memorize the positions.");
    revealTimer = window.setTimeout(() => {
      const cards = fieldEl.querySelectorAll(".digit-card");
      cards.forEach((card) => card.classList.add("flipped"));
      phase = "input";
      updateStatus(`Find ${expected} to begin.`);
    }, revealMs);
  };

  const reset = () => {
    resetBoard();
    updateStatus("Pick your settings and start the round.");
  };

  countInput.addEventListener("input", syncSettings);
  revealInput.addEventListener("input", syncSettings);
  startBtn.addEventListener("click", startRound);
  resetBtn.addEventListener("click", reset);

  syncSettings();
  updateStatus("Pick your settings and start the round.");

  return { resetToIdle: reset };
};

document.addEventListener("DOMContentLoaded", () => {
  const heroTitleEl = document.querySelector("#hero-game-title");
  const heroSubEl = document.querySelector("#hero-game-sub");
  const switchTitleEl = document.querySelector("#switch-title");
  const switchSubEl = document.querySelector("#switch-sub");
  const prevBtn = document.querySelector("#game-prev");
  const nextBtn = document.querySelector("#game-next");
  const gameSelect = document.querySelector("#game-select");
  const gamePanels = Array.from(document.querySelectorAll(".game-panel"));

  const memoryGame = initMemoryTester();
  const dualNBack = initDualNBack();
  const digitOrder = initDigitOrder();

  const games = [
    { id: "memory", title: "Memory Tester", description: "Sequence recall on a custom grid." },
    { id: "nback", title: "Dual N-Back", description: "Track positions and letters N steps back." },
    { id: "digits", title: "Digit Order", description: "Memorize the digits, then tap them in order." },
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
    if (gameSelect) gameSelect.value = meta.id;

    if (meta.id !== "nback" && dualNBack.isRunning()) {
      dualNBack.stop("Switched games. Stream paused.");
    }
    if (meta.id !== "memory") {
      memoryGame.resetToIdle();
    }
    if (meta.id !== "digits") {
      digitOrder.resetToIdle();
    }
  };

  gameSelect?.addEventListener("change", (event) => {
    const target = event.currentTarget.value;
    const targetIndex = games.findIndex((game) => game.id === target);
    if (targetIndex !== -1) {
      setActiveGame(targetIndex);
      const section = document.querySelector(`.game-panel[data-game-id=\"${target}\"]`);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  prevBtn?.addEventListener("click", () => setActiveGame(activeIndex - 1));
  nextBtn?.addEventListener("click", () => setActiveGame(activeIndex + 1));

  const fullscreenButtons = Array.from(document.querySelectorAll("[data-fullscreen-target]"));

  const updateFullscreenButtons = () => {
    fullscreenButtons.forEach((btn) => {
      const targetId = btn.dataset.fullscreenTarget;
      if (!targetId) return;
      const target = document.getElementById(targetId);
      const isActive = target ? document.fullscreenElement === target : false;
      btn.textContent = isActive ? "Exit full screen" : "Full screen";
    });
  };

  const toggleFullscreen = (targetId) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (document.fullscreenElement === target) {
      document.exitFullscreen().catch((err) => console.error(err));
      return;
    }
    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .then(() => target.requestFullscreen())
        .catch((err) => console.error(err));
      return;
    }
    target.requestFullscreen().catch((err) => console.error(err));
  };

  fullscreenButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.fullscreenTarget;
      if (!targetId) return;
      toggleFullscreen(targetId);
    });
  });

  document.addEventListener("fullscreenchange", updateFullscreenButtons);
  updateFullscreenButtons();

  setActiveGame(0);
});
