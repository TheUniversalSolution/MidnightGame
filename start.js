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

const initReactionInhibition = () => {
  const roundsInput = document.querySelector("#reaction-rounds");
  const stopInput = document.querySelector("#reaction-stop");
  const windowInput = document.querySelector("#reaction-window");
  const startBtn = document.querySelector("#reaction-start");
  const resetBtn = document.querySelector("#reaction-reset");
  const targetBtn = document.querySelector("#reaction-target");
  const statusEl = document.querySelector("#reaction-status");
  const scoreEl = document.querySelector("#reaction-score");

  if (
    !roundsInput ||
    !stopInput ||
    !windowInput ||
    !startBtn ||
    !resetBtn ||
    !targetBtn ||
    !statusEl ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for Reaction Inhibition.");
  }

  let rounds = 16;
  let stopChance = 30;
  let windowMs = 850;
  let phase = "idle";
  let currentRound = 0;
  let currentIsStop = false;
  let awaitingResponse = false;
  let cueTimer = null;
  let responseTimer = null;
  let reactionStart = 0;
  let goHits = 0;
  let goTotal = 0;
  let stopHits = 0;
  let stopTotal = 0;
  const reactionTimes = [];

  const stateClasses = ["is-wait", "is-go", "is-stop", "is-hit", "is-miss", "is-false"];
  const stateLabels = {
    idle: "Ready",
    wait: "Wait",
    go: "GO",
    stop: "STOP",
    hit: "Nice",
    miss: "Miss",
    false: "Oops",
  };

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    const avg =
      reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((sum, value) => sum + value, 0) / reactionTimes.length)
        : null;
    const avgLabel = avg ? `${avg}ms` : "--";
    scoreEl.textContent = `Go hits: ${goHits}/${goTotal} | Avg RT: ${avgLabel} | Stops: ${stopHits}/${stopTotal}`;
  };

  const setTargetState = (state, labelOverride) => {
    targetBtn.classList.remove(...stateClasses);
    if (state !== "idle") {
      targetBtn.classList.add(`is-${state}`);
    }
    targetBtn.textContent = labelOverride ?? stateLabels[state];
  };

  const clearTimers = () => {
    if (cueTimer !== null) {
      window.clearTimeout(cueTimer);
      cueTimer = null;
    }
    if (responseTimer !== null) {
      window.clearTimeout(responseTimer);
      responseTimer = null;
    }
  };

  const syncSettings = () => {
    const parsedRounds = Number.parseInt(roundsInput.value, 10);
    rounds = clamp(Number.isNaN(parsedRounds) ? 16 : parsedRounds, 6, 40);
    roundsInput.value = String(rounds);

    const parsedStop = Number.parseInt(stopInput.value, 10);
    stopChance = clamp(Number.isNaN(parsedStop) ? 30 : parsedStop, 10, 60);
    stopInput.value = String(stopChance);

    const parsedWindow = Number.parseInt(windowInput.value, 10);
    windowMs = clamp(Number.isNaN(parsedWindow) ? 850 : parsedWindow, 400, 1400);
    windowInput.value = String(windowMs);
  };

  const endSession = () => {
    phase = "idle";
    awaitingResponse = false;
    clearTimers();
    startBtn.disabled = false;
    updateStatus("Session complete. Ready for another run.");
    setTargetState("idle");
  };

  const scheduleNext = () => {
    if (phase === "idle") return;
    if (currentRound >= rounds) {
      endSession();
      return;
    }
    phase = "waiting";
    setTargetState("wait");
    updateStatus(`Round ${currentRound + 1} of ${rounds}.`);
    const delay = 500 + Math.random() * 900;
    cueTimer = window.setTimeout(() => startTrial(), delay);
  };

  const startTrial = () => {
    if (phase === "idle") return;
    phase = "showing";
    currentRound += 1;
    currentIsStop = Math.random() * 100 < stopChance;
    if (currentIsStop) {
      stopTotal += 1;
      setTargetState("stop");
    } else {
      goTotal += 1;
      setTargetState("go");
    }
    reactionStart = performance.now();
    awaitingResponse = true;
    responseTimer = window.setTimeout(() => {
      if (!awaitingResponse) return;
      awaitingResponse = false;
      if (currentIsStop) {
        stopHits += 1;
        updateStatus("Nice stop.");
        setTargetState("hit", "HOLD");
      } else {
        updateStatus("Too slow. Missed that one.");
        setTargetState("miss", "MISS");
      }
      updateScore();
      cueTimer = window.setTimeout(scheduleNext, 650);
    }, windowMs);
  };

  const handleTargetClick = () => {
    if (phase !== "showing" || !awaitingResponse) return;
    awaitingResponse = false;
    if (responseTimer !== null) {
      window.clearTimeout(responseTimer);
      responseTimer = null;
    }
    if (currentIsStop) {
      updateStatus("False alarm. That was a stop cue.");
      setTargetState("false", "STOP");
    } else {
      const reaction = Math.round(performance.now() - reactionStart);
      reactionTimes.push(reaction);
      goHits += 1;
      updateStatus(`Good hit. ${reaction}ms.`);
      setTargetState("hit", "GO!");
    }
    updateScore();
    cueTimer = window.setTimeout(scheduleNext, 650);
  };

  const start = () => {
    if (phase !== "idle") return;
    syncSettings();
    currentRound = 0;
    goHits = 0;
    goTotal = 0;
    stopHits = 0;
    stopTotal = 0;
    reactionTimes.splice(0, reactionTimes.length);
    updateScore();
    startBtn.disabled = true;
    phase = "waiting";
    updateStatus("Get ready...");
    scheduleNext();
  };

  const reset = () => {
    phase = "idle";
    awaitingResponse = false;
    clearTimers();
    currentRound = 0;
    goHits = 0;
    goTotal = 0;
    stopHits = 0;
    stopTotal = 0;
    reactionTimes.splice(0, reactionTimes.length);
    startBtn.disabled = false;
    updateScore();
    updateStatus("Ready when you are.");
    setTargetState("idle");
  };

  roundsInput.addEventListener("input", syncSettings);
  stopInput.addEventListener("input", syncSettings);
  windowInput.addEventListener("input", syncSettings);
  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  targetBtn.addEventListener("click", handleTargetClick);

  syncSettings();
  updateScore();
  setTargetState("idle");

  return { resetToIdle: reset };
};

const initPatternCompletion = () => {
  const lengthInput = document.querySelector("#pattern-gap-length");
  const newBtn = document.querySelector("#pattern-new");
  const resetBtn = document.querySelector("#pattern-reset");
  const sequenceEl = document.querySelector("#pattern-sequence");
  const optionsEl = document.querySelector("#pattern-options");
  const statusEl = document.querySelector("#pattern-status");
  const scoreEl = document.querySelector("#pattern-score");

  if (!lengthInput || !newBtn || !resetBtn || !sequenceEl || !optionsEl || !statusEl || !scoreEl) {
    throw new Error("Required UI elements are missing for Pattern Completion.");
  }

  let length = 5;
  let answer = 0;
  let solved = false;
  let correct = 0;
  let total = 0;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    scoreEl.textContent = `Score: ${correct}/${total}`;
  };

  const syncSettings = () => {
    const parsedLength = Number.parseInt(lengthInput.value, 10);
    length = clamp(Number.isNaN(parsedLength) ? 5 : parsedLength, 4, 7);
    lengthInput.value = String(length);
  };

  const shuffle = (items) => {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const generatePattern = (count) => {
    const minValue = 1;
    const maxValue = 120;

    const buildArithmetic = () => {
      const steps = [-4, -3, -2, -1, 1, 2, 3, 4];
      const step = steps[Math.floor(Math.random() * steps.length)];
      const minStart = step > 0 ? minValue : minValue - step * (count - 1);
      const maxStart = step > 0 ? maxValue - step * (count - 1) : maxValue;
      const start = randomInt(minStart, maxStart);
      return Array.from({ length: count }, (_, idx) => start + idx * step);
    };

    const buildGeometric = () => {
      const ratios = [2, 3];
      const usable = ratios.filter((ratio) => Math.floor(maxValue / ratio ** (count - 1)) >= 1);
      if (!usable.length) {
        return buildArithmetic();
      }
      const ratio = usable[Math.floor(Math.random() * usable.length)];
      const maxStart = Math.floor(maxValue / ratio ** (count - 1));
      const start = randomInt(1, maxStart);
      const sequence = [];
      let value = start;
      for (let i = 0; i < count; i += 1) {
        sequence.push(value);
        value *= ratio;
      }
      return sequence;
    };

    const buildAlternating = () => {
      let a = randomInt(2, 12);
      let b = randomInt(2, 12);
      while (b === a) {
        b = randomInt(2, 12);
      }
      return Array.from({ length: count }, (_, idx) => (idx % 2 === 0 ? a : b));
    };

    const buildCycle = () => {
      const pool = shuffle(Array.from({ length: 9 }, (_, idx) => idx + 1));
      const cycle = pool.slice(0, 3);
      return Array.from({ length: count }, (_, idx) => cycle[idx % cycle.length]);
    };

    const builders = [buildArithmetic, buildGeometric, buildAlternating, buildCycle];
    const sequence = builders[Math.floor(Math.random() * builders.length)]();
    return { sequence, answer: sequence[sequence.length - 1], minValue, maxValue };
  };

  const buildOptions = (value, minValue, maxValue) => {
    const options = new Set([value]);
    const deltas = [-6, -4, -3, -2, -1, 1, 2, 3, 4, 6];
    while (options.size < 4) {
      const delta = deltas[Math.floor(Math.random() * deltas.length)];
      const candidate = clamp(value + delta, minValue, maxValue);
      options.add(candidate);
    }
    return shuffle(Array.from(options));
  };

  const renderSequence = (sequence, reveal = false) => {
    sequenceEl.innerHTML = "";
    sequence.forEach((value, index) => {
      const tile = document.createElement("div");
      tile.className = "pattern-tile";
      tile.setAttribute("role", "listitem");
      if (index === sequence.length - 1) {
        tile.classList.add("missing");
        tile.textContent = reveal ? String(value) : "?";
        if (reveal) {
          tile.classList.add("reveal");
        }
      } else {
        tile.textContent = String(value);
      }
      sequenceEl.appendChild(tile);
    });
  };

  const renderOptions = (options) => {
    optionsEl.innerHTML = "";
    options.forEach((value) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(value);
      btn.addEventListener("click", () => handleOption(btn, value));
      optionsEl.appendChild(btn);
    });
  };

  const revealAnswer = () => {
    const tiles = sequenceEl.querySelectorAll(".pattern-tile");
    const lastTile = tiles[tiles.length - 1];
    if (lastTile) {
      lastTile.textContent = String(answer);
      lastTile.classList.remove("missing");
      lastTile.classList.add("reveal");
    }
  };

  const handleOption = (btn, value) => {
    if (solved) return;
    solved = true;
    total += 1;
    const isCorrect = value === answer;
    if (isCorrect) {
      correct += 1;
      updateStatus("Correct. Nice eye for the pattern.");
      btn.classList.add("correct");
    } else {
      updateStatus(`Not quite. The answer was ${answer}.`);
      btn.classList.add("wrong");
      const buttons = optionsEl.querySelectorAll("button");
      buttons.forEach((button) => {
        if (Number(button.textContent) === answer) {
          button.classList.add("correct");
        }
      });
    }
    const buttons = optionsEl.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = true;
    });
    revealAnswer();
    updateScore();
  };

  const buildPattern = () => {
    syncSettings();
    const next = generatePattern(length);
    answer = next.answer;
    solved = false;
    renderSequence(next.sequence);
    renderOptions(buildOptions(answer, next.minValue, next.maxValue));
    updateStatus("Choose the missing value.");
  };

  const reset = () => {
    solved = false;
    answer = 0;
    correct = 0;
    total = 0;
    sequenceEl.innerHTML = "";
    optionsEl.innerHTML = "";
    updateScore();
    updateStatus("Generate a pattern to begin.");
  };

  lengthInput.addEventListener("input", syncSettings);
  newBtn.addEventListener("click", buildPattern);
  resetBtn.addEventListener("click", reset);

  syncSettings();
  updateScore();

  return { resetToIdle: reset };
};

const initMentalRotation = () => {
  const leftCanvas = document.querySelector("#rotation-left");
  const rightCanvas = document.querySelector("#rotation-right");
  const statusEl = document.querySelector("#rotation-status");
  const scoreEl = document.querySelector("#rotation-score");
  const nextBtn = document.querySelector("#rotation-next");
  const resetBtn = document.querySelector("#rotation-reset");
  const sameBtn = document.querySelector("#rotation-same");
  const differentBtn = document.querySelector("#rotation-different");
  const mirrorToggle = document.querySelector("#rotation-mirror");

  if (
    !leftCanvas ||
    !rightCanvas ||
    !statusEl ||
    !scoreEl ||
    !nextBtn ||
    !resetBtn ||
    !sameBtn ||
    !differentBtn ||
    !mirrorToggle
  ) {
    throw new Error("Required UI elements are missing for Mental Rotation Snap.");
  }

  const shapes = [
    { name: "L", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { name: "J", cells: [[1, 0], [1, 1], [1, 2], [0, 2]] },
    { name: "T", cells: [[0, 1], [1, 1], [2, 1], [1, 2]] },
    { name: "S", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    { name: "Z", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    { name: "O", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { name: "I", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  ];

  let correct = 0;
  let total = 0;
  let solved = false;
  let isSame = false;
  let currentLeft = [];
  let currentRight = [];

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    scoreEl.textContent = `Score: ${correct}/${total}`;
  };

  const getCssVar = (name, fallback) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  };

  const accent = getCssVar("--accent", "#5dd4a7");
  const accentAlt = getCssVar("--accent-2", "#7da5ff");
  const stroke = getCssVar("--border", "#1f2433");

  const rotatePoints = (points, times, size = 4) => {
    let rotated = points.map((point) => [...point]);
    for (let i = 0; i < times; i += 1) {
      rotated = rotated.map(([x, y]) => [size - 1 - y, x]);
    }
    return rotated;
  };

  const mirrorPoints = (points, size = 4) => points.map(([x, y]) => [size - 1 - x, y]);

  const normalizePoints = (points) => {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return points.map(([x, y]) => [x - minX, y - minY]);
  };

  const pointsKey = (points) =>
    normalizePoints(points)
      .map(([x, y]) => `${x},${y}`)
      .sort()
      .join("|");

  const rotations = (points) => [0, 1, 2, 3].map((turns) => rotatePoints(points, turns));

  const mirrorIsDistinct = (points) => {
    const mirror = mirrorPoints(points);
    const mirrorKey = pointsKey(mirror);
    return !rotations(points).some((rot) => pointsKey(rot) === mirrorKey);
  };

  const drawShape = (canvas, points, color) => {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const cell = Math.floor(Math.min(rect.width, rect.height) / 5);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const shapeWidth = (maxX - minX + 1) * cell;
    const shapeHeight = (maxY - minY + 1) * cell;
    const offsetX = (rect.width - shapeWidth) / 2 - minX * cell;
    const offsetY = (rect.height - shapeHeight) / 2 - minY * cell;

    ctx.fillStyle = color;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;

    points.forEach(([x, y]) => {
      const xPos = offsetX + x * cell;
      const yPos = offsetY + y * cell;
      ctx.fillRect(xPos + 2, yPos + 2, cell - 4, cell - 4);
      ctx.strokeRect(xPos + 2, yPos + 2, cell - 4, cell - 4);
    });
  };

  const drawCurrent = () => {
    if (currentLeft.length) {
      drawShape(leftCanvas, currentLeft, accent);
    }
    if (currentRight.length) {
      drawShape(rightCanvas, currentRight, accentAlt);
    }
  };

  const newPair = () => {
    const base = shapes[Math.floor(Math.random() * shapes.length)];
    const leftRot = Math.floor(Math.random() * 4);
    const rightRot = Math.floor(Math.random() * 4);
    isSame = Math.random() < 0.5;

    currentLeft = rotatePoints(base.cells, leftRot);

    if (isSame) {
      currentRight = rotatePoints(base.cells, rightRot);
    } else {
      const useMirror = mirrorToggle.checked && Math.random() < 0.35 && mirrorIsDistinct(base.cells);
      if (useMirror) {
        currentRight = rotatePoints(mirrorPoints(base.cells), rightRot);
      } else {
        let alt = shapes[Math.floor(Math.random() * shapes.length)];
        while (alt.name === base.name) {
          alt = shapes[Math.floor(Math.random() * shapes.length)];
        }
        currentRight = rotatePoints(alt.cells, rightRot);
      }
    }

    solved = false;
    sameBtn.disabled = false;
    differentBtn.disabled = false;
    updateStatus("Are the shapes the same after rotation?");
    drawCurrent();
  };

  const answer = (guessSame) => {
    if (solved) return;
    solved = true;
    total += 1;
    const isCorrect = guessSame === isSame;
    if (isCorrect) {
      correct += 1;
      updateStatus("Correct. Nice rotation read.");
    } else {
      updateStatus("Not quite. Try the next pair.");
    }
    sameBtn.disabled = true;
    differentBtn.disabled = true;
    updateScore();
  };

  const reset = () => {
    correct = 0;
    total = 0;
    solved = false;
    updateScore();
    updateStatus("Compare the shapes.");
    newPair();
  };

  nextBtn.addEventListener("click", newPair);
  resetBtn.addEventListener("click", reset);
  sameBtn.addEventListener("click", () => answer(true));
  differentBtn.addEventListener("click", () => answer(false));

  window.addEventListener("resize", () => drawCurrent());

  updateScore();
  newPair();

  return { resetToIdle: reset, refresh: drawCurrent };
};

const initDualTaskJuggle = () => {
  const fieldEl = document.querySelector("#juggle-field");
  const ballEl = document.querySelector("#juggle-ball");
  const statusEl = document.querySelector("#juggle-status");
  const scoreEl = document.querySelector("#juggle-score");
  const questionEl = document.querySelector("#juggle-question");
  const speedInput = document.querySelector("#juggle-speed");
  const intervalInput = document.querySelector("#juggle-interval");
  const startBtn = document.querySelector("#juggle-start");
  const resetBtn = document.querySelector("#juggle-reset");
  const trueBtn = document.querySelector("#juggle-true");
  const falseBtn = document.querySelector("#juggle-false");

  if (
    !fieldEl ||
    !ballEl ||
    !statusEl ||
    !scoreEl ||
    !questionEl ||
    !speedInput ||
    !intervalInput ||
    !startBtn ||
    !resetBtn ||
    !trueBtn ||
    !falseBtn
  ) {
    throw new Error("Required UI elements are missing for Dual Task Juggle.");
  }

  let speed = 120;
  let interval = 3000;
  let running = false;
  let animationFrame = null;
  let lastFrame = 0;
  let maxX = 0;
  let maxY = 0;
  const position = { x: 0, y: 0 };
  const velocity = { x: 1, y: 1 };

  let trackHits = 0;
  let trackMisses = 0;
  let mathAnswer = false;
  let mathPending = false;
  let mathCorrect = 0;
  let mathTotal = 0;
  let mathTimer = null;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    scoreEl.textContent = `Tracking: ${trackHits} hits / ${trackMisses} misses | Math: ${mathCorrect}/${mathTotal}`;
  };

  const syncSettings = () => {
    const parsedSpeed = Number.parseInt(speedInput.value, 10);
    speed = clamp(Number.isNaN(parsedSpeed) ? 120 : parsedSpeed, 60, 220);
    speedInput.value = String(speed);

    const parsedInterval = Number.parseInt(intervalInput.value, 10);
    interval = clamp(Number.isNaN(parsedInterval) ? 3000 : parsedInterval, 1500, 6000);
    intervalInput.value = String(interval);
  };

  const syncBounds = () => {
    const rect = fieldEl.getBoundingClientRect();
    const ballRect = ballEl.getBoundingClientRect();
    maxX = Math.max(0, rect.width - ballRect.width);
    maxY = Math.max(0, rect.height - ballRect.height);
  };

  const positionBall = () => {
    ballEl.style.transform = `translate(${position.x}px, ${position.y}px)`;
  };

  const randomizeVelocity = () => {
    const angle = Math.random() * Math.PI * 2;
    velocity.x = Math.cos(angle);
    velocity.y = Math.sin(angle);
  };

  const step = (timestamp) => {
    if (!running) return;
    const delta = Math.min(0.05, (timestamp - lastFrame) / 1000 || 0);
    lastFrame = timestamp;

    position.x += velocity.x * speed * delta;
    position.y += velocity.y * speed * delta;

    if (position.x <= 0 || position.x >= maxX) {
      velocity.x *= -1;
      position.x = clamp(position.x, 0, maxX);
    }
    if (position.y <= 0 || position.y >= maxY) {
      velocity.y *= -1;
      position.y = clamp(position.y, 0, maxY);
    }

    positionBall();
    animationFrame = window.requestAnimationFrame(step);
  };

  const generateQuestion = () => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 1;
    const isAdd = Math.random() > 0.4;
    const left = isAdd ? a : Math.max(a, b);
    const right = isAdd ? b : Math.min(a, b);
    const correctValue = isAdd ? left + right : left - right;
    const shouldBeCorrect = Math.random() < 0.5;
    let shown = correctValue;
    if (!shouldBeCorrect) {
      const deltas = [-3, -2, -1, 1, 2, 3];
      while (shown === correctValue) {
        const delta = deltas[Math.floor(Math.random() * deltas.length)];
        shown = correctValue + delta;
        if (shown < 0) {
          shown = correctValue + Math.abs(delta);
        }
      }
    }
    return {
      text: `${left} ${isAdd ? "+" : "-"} ${right} = ${shown}?`,
      answer: shown === correctValue,
    };
  };

  const askQuestion = () => {
    if (!running) return;
    if (mathPending) {
      updateStatus("Missed the last prompt.");
    }
    const question = generateQuestion();
    mathAnswer = question.answer;
    mathPending = true;
    mathTotal += 1;
    questionEl.textContent = question.text;
    updateScore();
  };

  const startMathLoop = () => {
    if (mathTimer !== null) {
      window.clearInterval(mathTimer);
    }
    askQuestion();
    mathTimer = window.setInterval(askQuestion, interval);
  };

  const handleMathAnswer = (value) => {
    if (!running || !mathPending) return;
    const isCorrect = value === mathAnswer;
    if (isCorrect) {
      mathCorrect += 1;
    }
    mathPending = false;
    updateStatus(isCorrect ? "Math correct." : "Math miss.");
    updateScore();
  };

  const resetStats = () => {
    trackHits = 0;
    trackMisses = 0;
    mathCorrect = 0;
    mathTotal = 0;
    mathPending = false;
    updateScore();
  };

  const stop = (message = "Juggle paused.") => {
    running = false;
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (mathTimer !== null) {
      window.clearInterval(mathTimer);
      mathTimer = null;
    }
    mathPending = false;
    startBtn.disabled = false;
    updateStatus(message);
  };

  const start = () => {
    if (running) return;
    syncSettings();
    resetStats();
    syncBounds();
    position.x = maxX / 2;
    position.y = maxY / 2;
    randomizeVelocity();
    positionBall();
    running = true;
    startBtn.disabled = true;
    updateStatus("Track the orb and answer the math.");
    lastFrame = performance.now();
    animationFrame = window.requestAnimationFrame(step);
    startMathLoop();
  };

  const reset = () => {
    stop("Start the juggle to begin.");
    resetStats();
    questionEl.textContent = "Press start to begin.";
    position.x = maxX / 2;
    position.y = maxY / 2;
    positionBall();
  };

  fieldEl.addEventListener("click", () => {
    if (!running) return;
    trackMisses += 1;
    updateScore();
  });

  ballEl.addEventListener("click", (event) => {
    if (!running) return;
    event.stopPropagation();
    trackHits += 1;
    updateScore();
  });

  trueBtn.addEventListener("click", () => handleMathAnswer(true));
  falseBtn.addEventListener("click", () => handleMathAnswer(false));
  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  speedInput.addEventListener("input", syncSettings);
  intervalInput.addEventListener("input", syncSettings);
  window.addEventListener("resize", () => {
    syncBounds();
    position.x = clamp(position.x, 0, maxX);
    position.y = clamp(position.y, 0, maxY);
    positionBall();
  });

  syncSettings();
  updateScore();
  positionBall();

  return { resetToIdle: reset };
};

const initTimeEstimation = () => {
  const targetInput = document.querySelector("#time-target");
  const randomInput = document.querySelector("#time-random");
  const distractionsInput = document.querySelector("#time-distractions");
  const toggleBtn = document.querySelector("#time-toggle");
  const resetBtn = document.querySelector("#time-reset");
  const faceEl = document.querySelector("#time-face");
  const faceTitleEl = document.querySelector("#time-face-title");
  const faceSubEl = document.querySelector("#time-face-sub");
  const noiseEl = document.querySelector("#time-noise");
  const statusEl = document.querySelector("#time-status");
  const scoreEl = document.querySelector("#time-score");

  if (
    !targetInput ||
    !randomInput ||
    !distractionsInput ||
    !toggleBtn ||
    !resetBtn ||
    !faceEl ||
    !faceTitleEl ||
    !faceSubEl ||
    !noiseEl ||
    !statusEl ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for Time Estimation Trap.");
  }

  let targetSeconds = 10;
  let randomize = false;
  let distractions = true;
  let running = false;
  let startTime = 0;
  let lastError = null;
  let bestError = null;
  let noiseTimer = null;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    const format = (value) => (value === null ? "--" : `${(value / 1000).toFixed(2)}s`);
    const score =
      lastError === null ? "--" : Math.max(0, Math.round(100 - lastError / 100)).toString();
    scoreEl.textContent = `Last error: ${format(lastError)} | Best: ${format(bestError)} | Score: ${score}`;
  };

  const setFaceState = (state, title, sub) => {
    faceEl.classList.remove("is-running", "is-done");
    if (state === "running") {
      faceEl.classList.add("is-running");
    }
    if (state === "done") {
      faceEl.classList.add("is-done");
    }
    faceTitleEl.textContent = title;
    faceSubEl.textContent = sub;
  };

  const syncSettings = () => {
    const parsedTarget = Number.parseInt(targetInput.value, 10);
    targetSeconds = clamp(Number.isNaN(parsedTarget) ? 10 : parsedTarget, 5, 20);
    targetInput.value = String(targetSeconds);
    randomize = randomInput.checked;
    distractions = distractionsInput.checked;
  };

  const spawnNoise = () => {
    if (!distractions) return;
    const shard = document.createElement("div");
    shard.className = "time-shard";
    const size = 8 + Math.random() * 14;
    shard.style.width = `${size}px`;
    shard.style.height = `${size}px`;
    shard.style.left = `${Math.random() * 100}%`;
    shard.style.top = `${Math.random() * 100}%`;
    noiseEl.appendChild(shard);
    window.setTimeout(() => shard.remove(), 800);
  };

  const startNoise = () => {
    if (!distractions) return;
    if (noiseTimer !== null) {
      window.clearInterval(noiseTimer);
    }
    noiseTimer = window.setInterval(spawnNoise, 320);
  };

  const stopNoise = () => {
    if (noiseTimer !== null) {
      window.clearInterval(noiseTimer);
      noiseTimer = null;
    }
    noiseEl.innerHTML = "";
  };

  const getTarget = () => {
    if (!randomize) return targetSeconds;
    const next = Math.floor(5 + Math.random() * 16);
    targetSeconds = next;
    targetInput.value = String(next);
    return next;
  };

  const start = () => {
    if (running) return;
    syncSettings();
    const target = getTarget();
    running = true;
    startTime = performance.now();
    toggleBtn.textContent = "Stop";
    setFaceState("running", "Timing", `Target: ${target}s`);
    updateStatus("Counting internally...");
    startNoise();
  };

  const stop = () => {
    if (!running) return;
    running = false;
    stopNoise();
    toggleBtn.textContent = "Start";
    const elapsed = performance.now() - startTime;
    const targetMs = targetSeconds * 1000;
    const error = Math.abs(elapsed - targetMs);
    lastError = error;
    if (bestError === null || error < bestError) {
      bestError = error;
    }
    setFaceState(
      "done",
      "Stopped",
      `Actual: ${(elapsed / 1000).toFixed(2)}s | Target: ${targetSeconds}s`,
    );
    updateStatus(`Error: ${(error / 1000).toFixed(2)}s`);
    updateScore();
  };

  const reset = () => {
    running = false;
    stopNoise();
    lastError = null;
    bestError = null;
    toggleBtn.textContent = "Start";
    setFaceState("idle", "Ready", `Target: ${targetSeconds}s`);
    updateStatus("Estimate the target interval.");
    updateScore();
  };

  const handleToggle = () => {
    if (running) {
      stop();
    } else {
      start();
    }
  };

  targetInput.addEventListener("input", () => {
    syncSettings();
    if (!running) {
      setFaceState("idle", "Ready", `Target: ${targetSeconds}s`);
    }
  });
  randomInput.addEventListener("change", syncSettings);
  distractionsInput.addEventListener("change", syncSettings);
  toggleBtn.addEventListener("click", handleToggle);
  resetBtn.addEventListener("click", reset);

  syncSettings();
  updateScore();
  setFaceState("idle", "Ready", `Target: ${targetSeconds}s`);

  return { resetToIdle: reset };
};

const initRuleSwitcher = () => {
  const roundsInput = document.querySelector("#rule-rounds");
  const switchInput = document.querySelector("#rule-switch");
  const sizeInput = document.querySelector("#rule-size");
  const startBtn = document.querySelector("#rule-start");
  const resetBtn = document.querySelector("#rule-reset");
  const leftBtn = document.querySelector("#rule-left");
  const rightBtn = document.querySelector("#rule-right");
  const stimulusEl = document.querySelector("#rule-stimulus");
  const stimulusLabelEl = document.querySelector("#rule-stimulus-label");
  const statusEl = document.querySelector("#rule-status");
  const scoreEl = document.querySelector("#rule-score");
  const sizeLegend = document.querySelector(".rule-pill[data-rule=\"size\"]");

  if (
    !roundsInput ||
    !switchInput ||
    !sizeInput ||
    !startBtn ||
    !resetBtn ||
    !leftBtn ||
    !rightBtn ||
    !stimulusEl ||
    !stimulusLabelEl ||
    !statusEl ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for Rule Switcher.");
  }

  const colors = ["red", "blue"];
  const shapes = ["circle", "triangle"];
  const sizes = ["small", "large"];

  let rounds = 20;
  let switchPace = 6;
  let includeSize = false;
  let running = false;
  let activeRule = "color";
  let remainingUntilSwitch = 0;
  let switchWindow = 0;
  let currentRound = 0;
  let correct = 0;
  let total = 0;
  let switchErrors = 0;
  let awaiting = false;
  let currentStimulus = { color: "red", shape: "circle", size: "large" };

  const ruleMap = {
    color: { red: "left", blue: "right" },
    shape: { circle: "left", triangle: "right" },
    size: { large: "left", small: "right" },
  };

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    scoreEl.textContent = `Correct: ${correct}/${total} | Switch errors: ${switchErrors}`;
  };

  const syncSettings = () => {
    const parsedRounds = Number.parseInt(roundsInput.value, 10);
    rounds = clamp(Number.isNaN(parsedRounds) ? 20 : parsedRounds, 10, 40);
    roundsInput.value = String(rounds);

    const parsedSwitch = Number.parseInt(switchInput.value, 10);
    switchPace = clamp(Number.isNaN(parsedSwitch) ? 6 : parsedSwitch, 3, 10);
    switchInput.value = String(switchPace);

    includeSize = sizeInput.checked;
    if (sizeLegend) {
      sizeLegend.classList.toggle("is-hidden", !includeSize);
    }
  };

  const nextSwitchCountdown = () => {
    const min = clamp(switchPace - 2, 3, 12);
    const max = clamp(switchPace + 2, min, 12);
    return Math.floor(min + Math.random() * (max - min + 1));
  };

  const pickRule = (exclude) => {
    const pool = includeSize ? ["color", "shape", "size"] : ["color", "shape"];
    const options = exclude ? pool.filter((rule) => rule !== exclude) : pool;
    return options[Math.floor(Math.random() * options.length)];
  };

  const renderStimulus = () => {
    stimulusEl.classList.remove(
      "shape-circle",
      "shape-triangle",
      "color-red",
      "color-blue",
      "size-small",
      "size-large",
      "is-correct",
      "is-wrong",
    );
    stimulusEl.classList.add(
      `shape-${currentStimulus.shape}`,
      `color-${currentStimulus.color}`,
      `size-${currentStimulus.size}`,
    );
    stimulusLabelEl.textContent =
      currentStimulus.shape === "circle" ? "Circle" : "Triangle";
  };

  const buildStimulus = () => {
    currentStimulus = {
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: sizes[Math.floor(Math.random() * sizes.length)],
    };
    renderStimulus();
    awaiting = true;
  };

  const showFeedback = (isCorrect) => {
    stimulusEl.classList.add(isCorrect ? "is-correct" : "is-wrong");
    window.setTimeout(() => {
      stimulusEl.classList.remove("is-correct", "is-wrong");
    }, 280);
  };

  const handleResponse = (side) => {
    if (!running || !awaiting) return;
    awaiting = false;
    total += 1;
    const expected = ruleMap[activeRule][currentStimulus[activeRule]];
    const isCorrect = side === expected;
    if (isCorrect) {
      correct += 1;
      updateStatus(`Correct. Round ${currentRound + 1}/${rounds}.`);
    } else {
      updateStatus(`Wrong. Round ${currentRound + 1}/${rounds}.`);
      if (switchWindow > 0) {
        switchErrors += 1;
      }
    }
    showFeedback(isCorrect);
    updateScore();
    currentRound += 1;
    remainingUntilSwitch -= 1;
    if (switchWindow > 0) {
      switchWindow -= 1;
    }
    if (remainingUntilSwitch <= 0) {
      activeRule = pickRule(activeRule);
      remainingUntilSwitch = nextSwitchCountdown();
      switchWindow = 2;
    }
    if (currentRound >= rounds) {
      stop("Session complete. Rule switches end.");
      return;
    }
    buildStimulus();
  };

  const start = () => {
    if (running) return;
    syncSettings();
    running = true;
    currentRound = 0;
    correct = 0;
    total = 0;
    switchErrors = 0;
    activeRule = pickRule();
    remainingUntilSwitch = nextSwitchCountdown();
    switchWindow = 0;
    leftBtn.disabled = false;
    rightBtn.disabled = false;
    startBtn.disabled = true;
    updateScore();
    updateStatus("Rule is live. Adapt on the fly.");
    buildStimulus();
  };

  const stop = (message) => {
    running = false;
    awaiting = false;
    leftBtn.disabled = true;
    rightBtn.disabled = true;
    startBtn.disabled = false;
    updateStatus(message);
  };

  const reset = () => {
    running = false;
    awaiting = false;
    currentRound = 0;
    correct = 0;
    total = 0;
    switchErrors = 0;
    startBtn.disabled = false;
    leftBtn.disabled = true;
    rightBtn.disabled = true;
    updateScore();
    updateStatus("Respond to the active rule.");
    buildStimulus();
    awaiting = false;
  };

  leftBtn.addEventListener("click", () => handleResponse("left"));
  rightBtn.addEventListener("click", () => handleResponse("right"));
  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  roundsInput.addEventListener("input", syncSettings);
  switchInput.addEventListener("input", syncSettings);
  sizeInput.addEventListener("change", syncSettings);

  syncSettings();
  updateScore();
  reset();

  return { resetToIdle: reset };
};

const initDelayedRecall = () => {
  const sizeInput = document.querySelector("#recall-size");
  const delayInput = document.querySelector("#recall-delay");
  const startBtn = document.querySelector("#recall-start");
  const resetBtn = document.querySelector("#recall-reset");
  const setEl = document.querySelector("#recall-set");
  const statusEl = document.querySelector("#recall-status");
  const pulseBtn = document.querySelector("#recall-pulse");
  const interferenceScoreEl = document.querySelector("#recall-interference-score");
  const inputsEl = document.querySelector("#recall-inputs");
  const submitBtn = document.querySelector("#recall-submit");
  const scoreEl = document.querySelector("#recall-score");

  if (
    !sizeInput ||
    !delayInput ||
    !startBtn ||
    !resetBtn ||
    !setEl ||
    !statusEl ||
    !pulseBtn ||
    !interferenceScoreEl ||
    !inputsEl ||
    !submitBtn ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for Delayed Recall Ping.");
  }

  let size = 5;
  let delaySec = 60;
  let phase = "idle";
  let items = [];
  let revealTimer = null;
  let countdownTimer = null;
  let delayTimer = null;
  let pulseTimer = null;
  let pulseOffTimer = null;
  let pulseActive = false;
  let interferenceHits = 0;
  let recallCorrect = 0;
  let recallTotal = 0;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    scoreEl.textContent = `Recall: ${recallCorrect}/${recallTotal}`;
    interferenceScoreEl.textContent = `Hits: ${interferenceHits}`;
  };

  const clearTimers = () => {
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer);
      revealTimer = null;
    }
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (delayTimer !== null) {
      window.clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (pulseTimer !== null) {
      window.clearTimeout(pulseTimer);
      pulseTimer = null;
    }
    if (pulseOffTimer !== null) {
      window.clearTimeout(pulseOffTimer);
      pulseOffTimer = null;
    }
  };

  const syncSettings = () => {
    const parsedSize = Number.parseInt(sizeInput.value, 10);
    size = clamp(Number.isNaN(parsedSize) ? 5 : parsedSize, 3, 7);
    sizeInput.value = String(size);

    const parsedDelay = Number.parseInt(delayInput.value, 10);
    delaySec = clamp(Number.isNaN(parsedDelay) ? 60 : parsedDelay, 30, 120);
    delayInput.value = String(delaySec);
  };

  const shuffle = (itemsList) => {
    for (let i = itemsList.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemsList[i], itemsList[j]] = [itemsList[j], itemsList[i]];
    }
    return itemsList;
  };

  const generateItems = (count) => {
    const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");
    const selection = shuffle(pool).slice(0, count);
    return selection;
  };

  const renderSet = (hidden) => {
    setEl.innerHTML = "";
    items.forEach((item) => {
      const tile = document.createElement("div");
      tile.className = "recall-item";
      if (hidden) {
        tile.classList.add("hidden");
        tile.textContent = "-";
      } else {
        tile.textContent = item;
      }
      setEl.appendChild(tile);
    });
  };

  const setPulseState = (active) => {
    pulseActive = active;
    pulseBtn.classList.toggle("active", active);
    pulseBtn.textContent = active ? "Tap" : "Wait";
  };

  const schedulePulse = () => {
    if (phase !== "delay") return;
    const wait = 700 + Math.random() * 1400;
    pulseTimer = window.setTimeout(() => {
      setPulseState(true);
      pulseOffTimer = window.setTimeout(() => {
        setPulseState(false);
        schedulePulse();
      }, 600);
    }, wait);
  };

  const startDelay = () => {
    phase = "delay";
    renderSet(true);
    let remaining = delaySec;
    updateStatus(`Delay running... ${remaining}s`);
    setPulseState(false);
    schedulePulse();
    countdownTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownTimer !== null) {
          window.clearInterval(countdownTimer);
          countdownTimer = null;
        }
        beginRecall();
      } else {
        updateStatus(`Delay running... ${remaining}s`);
      }
    }, 1000);
    delayTimer = window.setTimeout(beginRecall, delaySec * 1000);
  };

  const buildInputs = () => {
    inputsEl.innerHTML = "";
    for (let i = 0; i < items.length; i += 1) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 2;
      input.autocomplete = "off";
      inputsEl.appendChild(input);
    }
  };

  const beginRecall = () => {
    if (phase !== "delay") return;
    clearTimers();
    setPulseState(false);
    phase = "recall";
    renderSet(true);
    buildInputs();
    submitBtn.disabled = false;
    updateStatus("Recall the set in order.");
  };

  const start = () => {
    if (phase !== "idle") return;
    syncSettings();
    items = generateItems(size);
    interferenceHits = 0;
    updateScore();
    phase = "showing";
    startBtn.disabled = true;
    submitBtn.disabled = true;
    inputsEl.innerHTML = "";
    renderSet(false);
    updateStatus("Memorize the set.");
    revealTimer = window.setTimeout(() => {
      startDelay();
    }, 4000);
  };

  const reset = () => {
    phase = "idle";
    clearTimers();
    setPulseState(false);
    items = [];
    interferenceHits = 0;
    recallCorrect = 0;
    recallTotal = 0;
    startBtn.disabled = false;
    submitBtn.disabled = true;
    setEl.innerHTML = "";
    inputsEl.innerHTML = "";
    updateScore();
    updateStatus("Memorize the set, then wait for the ping.");
  };

  const submit = () => {
    if (phase !== "recall") return;
    const inputs = Array.from(inputsEl.querySelectorAll("input"));
    let roundCorrect = 0;
    inputs.forEach((input, index) => {
      const guess = input.value.trim().toUpperCase();
      const expected = items[index];
      const isCorrect = guess === expected;
      input.classList.toggle("correct", isCorrect);
      input.classList.toggle("wrong", !isCorrect);
      if (isCorrect) {
        roundCorrect += 1;
      }
    });
    recallCorrect += roundCorrect;
    recallTotal += items.length;
    updateScore();
    updateStatus(`Recall complete. ${roundCorrect}/${items.length} correct.`);
    renderSet(false);
    submitBtn.disabled = true;
    startBtn.disabled = false;
    phase = "idle";
  };

  const handlePulseClick = () => {
    if (phase !== "delay") return;
    if (pulseActive) {
      interferenceHits += 1;
      setPulseState(false);
      updateScore();
    }
  };

  sizeInput.addEventListener("input", syncSettings);
  delayInput.addEventListener("input", syncSettings);
  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  submitBtn.addEventListener("click", submit);
  pulseBtn.addEventListener("click", handlePulseClick);

  syncSettings();
  updateScore();
  submitBtn.disabled = true;

  return { resetToIdle: reset };
};

const initBinaryNoise = () => {
  const roundsInput = document.querySelector("#noise-rounds");
  const durationInput = document.querySelector("#noise-duration");
  const levelInput = document.querySelector("#noise-level");
  const startBtn = document.querySelector("#noise-start");
  const resetBtn = document.querySelector("#noise-reset");
  const fieldEl = document.querySelector("#noise-field");
  const stimulusEl = document.querySelector("#noise-stimulus");
  const overlayEl = document.querySelector("#noise-overlay");
  const statusEl = document.querySelector("#noise-status");
  const scoreEl = document.querySelector("#noise-score");
  const leftBtn = document.querySelector("#noise-left");
  const rightBtn = document.querySelector("#noise-right");

  if (
    !roundsInput ||
    !durationInput ||
    !levelInput ||
    !startBtn ||
    !resetBtn ||
    !fieldEl ||
    !stimulusEl ||
    !overlayEl ||
    !statusEl ||
    !scoreEl ||
    !leftBtn ||
    !rightBtn
  ) {
    throw new Error("Required UI elements are missing for Binary Choice Under Noise.");
  }

  let rounds = 20;
  let durationMs = 700;
  let noiseLevel = 3;
  let running = false;
  let currentRound = 0;
  let awaiting = false;
  let answer = "left";
  let startTime = 0;
  let correct = 0;
  let total = 0;
  const reactionTimes = [];
  let trialTimer = null;
  let gapTimer = null;
  let noiseTimer = null;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    const avg =
      reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((sum, value) => sum + value, 0) / reactionTimes.length)
        : null;
    const focus =
      total > 0 && avg !== null
        ? Math.round((correct / total) * (1000 / avg) * 100)
        : null;
    const avgLabel = avg ? `${avg}ms` : "--";
    const focusLabel = focus !== null ? `${focus}` : "--";
    scoreEl.textContent = `Accuracy: ${correct}/${total} | Avg RT: ${avgLabel} | Focus: ${focusLabel}`;
  };

  const syncSettings = () => {
    const parsedRounds = Number.parseInt(roundsInput.value, 10);
    rounds = clamp(Number.isNaN(parsedRounds) ? 20 : parsedRounds, 10, 40);
    roundsInput.value = String(rounds);

    const parsedDuration = Number.parseInt(durationInput.value, 10);
    durationMs = clamp(Number.isNaN(parsedDuration) ? 700 : parsedDuration, 300, 1200);
    durationInput.value = String(durationMs);

    const parsedLevel = Number.parseInt(levelInput.value, 10);
    noiseLevel = clamp(Number.isNaN(parsedLevel) ? 3 : parsedLevel, 1, 5);
    levelInput.value = String(noiseLevel);
  };

  const clearTimers = () => {
    if (trialTimer !== null) {
      window.clearTimeout(trialTimer);
      trialTimer = null;
    }
    if (gapTimer !== null) {
      window.clearTimeout(gapTimer);
      gapTimer = null;
    }
  };

  const spawnNoise = () => {
    const shard = document.createElement("div");
    shard.className = "noise-shard";
    const size = 8 + Math.random() * 22;
    shard.style.width = `${size}px`;
    shard.style.height = `${size}px`;
    shard.style.left = `${Math.random() * 100}%`;
    shard.style.top = `${Math.random() * 100}%`;
    shard.style.background = Math.random() > 0.5 ? "rgba(125,165,255,0.6)" : "rgba(255,122,122,0.5)";
    overlayEl.appendChild(shard);
    window.setTimeout(() => shard.remove(), 700);
  };

  const startNoise = () => {
    if (noiseTimer !== null) {
      window.clearInterval(noiseTimer);
    }
    const interval = Math.max(90, 420 - noiseLevel * 70);
    noiseTimer = window.setInterval(spawnNoise, interval);
  };

  const stopNoise = () => {
    if (noiseTimer !== null) {
      window.clearInterval(noiseTimer);
      noiseTimer = null;
    }
    overlayEl.innerHTML = "";
  };

  const hideStimulus = () => {
    stimulusEl.textContent = "-";
  };

  const endTrial = () => {
    awaiting = false;
    clearTimers();
    hideStimulus();
    currentRound += 1;
    if (currentRound >= rounds) {
      stop("Session complete.");
      return;
    }
    gapTimer = window.setTimeout(nextTrial, 500);
  };

  const registerMiss = () => {
    if (!awaiting) return;
    awaiting = false;
    total += 1;
    updateStatus("Too slow.");
    updateScore();
    endTrial();
  };

  const nextTrial = () => {
    if (!running) return;
    if (currentRound >= rounds) {
      stop("Session complete.");
      return;
    }
    awaiting = true;
    answer = Math.random() > 0.5 ? "left" : "right";
    stimulusEl.textContent = answer === "left" ? "LEFT" : "RIGHT";
    startTime = performance.now();
    trialTimer = window.setTimeout(registerMiss, durationMs);
    updateStatus(`Round ${currentRound + 1}/${rounds}`);
  };

  const handleChoice = (choice) => {
    if (!running || !awaiting) return;
    awaiting = false;
    clearTimers();
    total += 1;
    const reaction = Math.round(performance.now() - startTime);
    reactionTimes.push(reaction);
    const isCorrect = choice === answer;
    if (isCorrect) {
      correct += 1;
      updateStatus(`Correct. ${reaction}ms.`);
    } else {
      updateStatus("Wrong choice.");
    }
    updateScore();
    endTrial();
  };

  const start = () => {
    if (running) return;
    syncSettings();
    running = true;
    currentRound = 0;
    correct = 0;
    total = 0;
    reactionTimes.splice(0, reactionTimes.length);
    updateScore();
    startBtn.disabled = true;
    leftBtn.disabled = false;
    rightBtn.disabled = false;
    startNoise();
    nextTrial();
  };

  const stop = (message) => {
    running = false;
    awaiting = false;
    clearTimers();
    stopNoise();
    startBtn.disabled = false;
    leftBtn.disabled = true;
    rightBtn.disabled = true;
    hideStimulus();
    updateStatus(message);
  };

  const reset = () => {
    stop("Focus on the target and ignore the noise.");
    correct = 0;
    total = 0;
    reactionTimes.splice(0, reactionTimes.length);
    updateScore();
  };

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  leftBtn.addEventListener("click", () => handleChoice("left"));
  rightBtn.addEventListener("click", () => handleChoice("right"));
  roundsInput.addEventListener("input", syncSettings);
  durationInput.addEventListener("input", syncSettings);
  levelInput.addEventListener("input", syncSettings);

  syncSettings();
  updateScore();
  leftBtn.disabled = true;
  rightBtn.disabled = true;
  hideStimulus();

  return { resetToIdle: reset };
};

const initMentalCount = () => {
  const speedInput = document.querySelector("#count-speed");
  const promptInput = document.querySelector("#count-prompt");
  const plus2Input = document.querySelector("#count-plus2");
  const startBtn = document.querySelector("#count-start");
  const resetBtn = document.querySelector("#count-reset");
  const streamEl = document.querySelector("#count-stream");
  const promptArea = document.querySelector("#count-prompt-area");
  const countInput = document.querySelector("#count-input");
  const submitBtn = document.querySelector("#count-submit");
  const statusEl = document.querySelector("#count-status");
  const scoreEl = document.querySelector("#count-score");

  if (
    !speedInput ||
    !promptInput ||
    !plus2Input ||
    !startBtn ||
    !resetBtn ||
    !streamEl ||
    !promptArea ||
    !countInput ||
    !submitBtn ||
    !statusEl ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for Mental Count Drift.");
  }

  let speed = 900;
  let promptInterval = 7;
  let includePlus2 = false;
  let running = false;
  let count = 0;
  let correct = 0;
  let total = 0;
  let lastAnswer = null;
  let stepsSincePrompt = 0;
  let nextPromptAt = 7;
  let streamTimer = null;
  let awaitingPrompt = false;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    const lastLabel = lastAnswer === null ? "--" : String(lastAnswer);
    scoreEl.textContent = `Correct: ${correct}/${total} | Last: ${lastLabel}`;
  };

  const syncSettings = () => {
    const parsedSpeed = Number.parseInt(speedInput.value, 10);
    speed = clamp(Number.isNaN(parsedSpeed) ? 900 : parsedSpeed, 450, 1500);
    speedInput.value = String(speed);

    const parsedPrompt = Number.parseInt(promptInput.value, 10);
    promptInterval = clamp(Number.isNaN(parsedPrompt) ? 7 : parsedPrompt, 4, 12);
    promptInput.value = String(promptInterval);

    includePlus2 = plus2Input.checked;
  };

  const clearTimer = () => {
    if (streamTimer !== null) {
      window.clearTimeout(streamTimer);
      streamTimer = null;
    }
  };

  const computeNextPromptAt = () => {
    const min = clamp(promptInterval - 2, 3, 14);
    const max = clamp(promptInterval + 2, min, 14);
    return Math.floor(min + Math.random() * (max - min + 1));
  };

  const showPrompt = () => {
    awaitingPrompt = true;
    clearTimer();
    promptArea.classList.add("active");
    countInput.value = "";
    countInput.focus();
    updateStatus("What is the current count?");
  };

  const flashStream = () => {
    streamEl.classList.add("flash");
    window.setTimeout(() => streamEl.classList.remove("flash"), 180);
  };

  const streamStep = () => {
    if (!running || awaitingPrompt) return;
    const options = includePlus2 ? [-2, -1, 1, 2] : [-1, 1];
    const delta = options[Math.floor(Math.random() * options.length)];
    count += delta;
    streamEl.textContent = delta > 0 ? `+${delta}` : `${delta}`;
    flashStream();
    stepsSincePrompt += 1;
    if (stepsSincePrompt >= nextPromptAt) {
      showPrompt();
      return;
    }
    streamTimer = window.setTimeout(streamStep, speed);
  };

  const submit = () => {
    if (!awaitingPrompt) return;
    const parsed = Number.parseInt(countInput.value, 10);
    if (Number.isNaN(parsed)) return;
    lastAnswer = parsed;
    total += 1;
    if (parsed === count) {
      correct += 1;
      updateStatus("Correct.");
    } else {
      updateStatus(`Off. Actual count was ${count}.`);
    }
    updateScore();
    awaitingPrompt = false;
    promptArea.classList.remove("active");
    stepsSincePrompt = 0;
    nextPromptAt = computeNextPromptAt();
    streamTimer = window.setTimeout(streamStep, speed);
  };

  const start = () => {
    if (running) return;
    syncSettings();
    running = true;
    count = 0;
    correct = 0;
    total = 0;
    lastAnswer = null;
    stepsSincePrompt = 0;
    nextPromptAt = computeNextPromptAt();
    awaitingPrompt = false;
    promptArea.classList.remove("active");
    updateScore();
    updateStatus("Track the count and wait for the prompt.");
    startBtn.disabled = true;
    streamStep();
  };

  const stop = (message) => {
    running = false;
    awaitingPrompt = false;
    clearTimer();
    promptArea.classList.remove("active");
    startBtn.disabled = false;
    updateStatus(message);
  };

  const reset = () => {
    stop("Track the count in your head.");
    count = 0;
    correct = 0;
    total = 0;
    lastAnswer = null;
    updateScore();
    streamEl.textContent = "+";
  };

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  submitBtn.addEventListener("click", submit);
  countInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submit();
    }
  });
  speedInput.addEventListener("input", syncSettings);
  promptInput.addEventListener("input", syncSettings);
  plus2Input.addEventListener("change", syncSettings);

  syncSettings();
  updateScore();
  reset();

  return { resetToIdle: reset };
};

const initSymbolCompression = () => {
  const sizeInput = document.querySelector("#compress-size");
  const symbolInput = document.querySelector("#compress-symbols");
  const exposureInput = document.querySelector("#compress-exposure");
  const startBtn = document.querySelector("#compress-start");
  const resetBtn = document.querySelector("#compress-reset");
  const submitBtn = document.querySelector("#compress-submit");
  const gridEl = document.querySelector("#compress-grid");
  const inputsEl = document.querySelector("#compress-inputs");
  const statusEl = document.querySelector("#compress-status");
  const scoreEl = document.querySelector("#compress-score");

  if (
    !sizeInput ||
    !symbolInput ||
    !exposureInput ||
    !startBtn ||
    !resetBtn ||
    !submitBtn ||
    !gridEl ||
    !inputsEl ||
    !statusEl ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for Symbol Compression.");
  }

  const symbolBank = ["X", "O", "+", "#", "%", "@"];
  let phase = "idle";
  let gridSize = 5;
  let symbolCount = 4;
  let exposureMs = 900;
  let revealTimer = null;
  let activeSymbols = [];
  let symbolCounts = {};
  const inputMap = new Map();

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = (text) => {
    scoreEl.textContent = text;
  };

  const clearTimer = () => {
    if (revealTimer === null) return;
    window.clearTimeout(revealTimer);
    revealTimer = null;
  };

  const syncSettings = () => {
    const parsedSize = Number.parseInt(sizeInput.value, 10);
    gridSize = clamp(Number.isNaN(parsedSize) ? 5 : parsedSize, 3, 8);
    sizeInput.value = String(gridSize);

    symbolInput.max = String(symbolBank.length);
    const parsedSymbols = Number.parseInt(symbolInput.value, 10);
    symbolCount = clamp(Number.isNaN(parsedSymbols) ? 4 : parsedSymbols, 3, symbolBank.length);
    symbolInput.value = String(symbolCount);

    const parsedExposure = Number.parseInt(exposureInput.value, 10);
    exposureMs = clamp(Number.isNaN(parsedExposure) ? 900 : parsedExposure, 400, 2000);
    exposureInput.value = String(exposureMs);
  };

  const buildGrid = () => {
    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `repeat(${gridSize}, minmax(0, 1fr))`;
    activeSymbols = symbolBank.slice(0, symbolCount);
    symbolCounts = {};
    activeSymbols.forEach((symbol) => {
      symbolCounts[symbol] = 0;
    });

    for (let i = 0; i < gridSize * gridSize; i += 1) {
      const symbol = activeSymbols[Math.floor(Math.random() * activeSymbols.length)];
      symbolCounts[symbol] += 1;
      const cell = document.createElement("div");
      cell.className = "compress-cell";
      cell.textContent = symbol;
      gridEl.appendChild(cell);
    }
  };

  const buildInputs = () => {
    inputsEl.innerHTML = "";
    inputMap.clear();
    activeSymbols.forEach((symbol) => {
      const label = document.createElement("label");
      label.className = "compress-input";
      const chip = document.createElement("span");
      chip.textContent = symbol;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.value = "0";
      input.inputMode = "numeric";
      label.appendChild(chip);
      label.appendChild(input);
      inputsEl.appendChild(label);
      inputMap.set(symbol, input);
    });
  };

  const lockInputs = (locked) => {
    submitBtn.disabled = locked;
  };

  const startRound = () => {
    if (phase === "showing") return;
    syncSettings();
    clearTimer();
    buildGrid();
    buildInputs();
    gridEl.classList.remove("is-hidden");
    inputsEl.classList.add("is-hidden");
    lockInputs(true);
    startBtn.disabled = true;
    updateScore(`Correct symbols: 0/${symbolCount} | Total error: --`);
    updateStatus("Memorize the grid.");
    phase = "showing";
    revealTimer = window.setTimeout(() => {
      gridEl.classList.add("is-hidden");
      inputsEl.classList.remove("is-hidden");
      lockInputs(false);
      updateStatus("Enter counts for each symbol.");
      phase = "input";
    }, exposureMs);
  };

  const submit = () => {
    if (phase !== "input") return;
    let correct = 0;
    let totalError = 0;

    inputMap.forEach((input, symbol) => {
      const parsed = Number.parseInt(input.value, 10);
      const guess = Number.isNaN(parsed) ? 0 : parsed;
      input.value = String(guess);
      const actual = symbolCounts[symbol] ?? 0;
      const diff = Math.abs(actual - guess);
      totalError += diff;
      input.classList.toggle("correct", diff === 0);
      input.classList.toggle("wrong", diff !== 0);
      if (diff === 0) {
        correct += 1;
      }
    });

    updateScore(`Correct symbols: ${correct}/${activeSymbols.length} | Total error: ${totalError}`);
    updateStatus("Round complete. Start again for a new grid.");
    phase = "idle";
    lockInputs(true);
    startBtn.disabled = false;
  };

  const reset = () => {
    clearTimer();
    phase = "idle";
    gridEl.innerHTML = "";
    inputsEl.innerHTML = "";
    inputsEl.classList.add("is-hidden");
    gridEl.classList.remove("is-hidden");
    lockInputs(true);
    startBtn.disabled = false;
    updateScore("Correct symbols: 0/0 | Total error: --");
    updateStatus("Memorize the grid, then compress it into counts.");
  };

  startBtn.addEventListener("click", startRound);
  resetBtn.addEventListener("click", reset);
  submitBtn.addEventListener("click", submit);
  sizeInput.addEventListener("input", syncSettings);
  symbolInput.addEventListener("input", syncSettings);
  exposureInput.addEventListener("input", syncSettings);

  syncSettings();
  lockInputs(true);
  reset();

  return { resetToIdle: reset };
};

const initFalsePatternDetector = () => {
  const roundsInput = document.querySelector("#detector-rounds");
  const lengthInput = document.querySelector("#detector-length");
  const subtleInput = document.querySelector("#detector-subtle");
  const startBtn = document.querySelector("#detector-start");
  const resetBtn = document.querySelector("#detector-reset");
  const patternBtn = document.querySelector("#detector-pattern");
  const randomBtn = document.querySelector("#detector-random");
  const statusEl = document.querySelector("#detector-status");
  const sequenceEl = document.querySelector("#detector-sequence");
  const scoreEl = document.querySelector("#detector-score");

  if (
    !roundsInput ||
    !lengthInput ||
    !subtleInput ||
    !startBtn ||
    !resetBtn ||
    !patternBtn ||
    !randomBtn ||
    !statusEl ||
    !sequenceEl ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for False Pattern Detector.");
  }

  let rounds = 16;
  let length = 6;
  let useSubtle = false;
  let running = false;
  let roundIndex = 0;
  let currentIsPattern = false;
  let correct = 0;
  let falsePositives = 0;
  let misses = 0;
  let total = 0;
  let advanceTimer = null;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    const weighted = correct - falsePositives * 2 - misses;
    scoreEl.textContent = `Correct: ${correct}/${total} | False alarms: ${falsePositives} | Weighted: ${weighted}`;
  };

  const setChoicesEnabled = (enabled) => {
    patternBtn.disabled = !enabled;
    randomBtn.disabled = !enabled;
  };

  const clearAdvance = () => {
    if (advanceTimer === null) return;
    window.clearTimeout(advanceTimer);
    advanceTimer = null;
  };

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const isArithmetic = (sequence) => {
    if (sequence.length < 3) return false;
    const diff = sequence[1] - sequence[0];
    for (let i = 2; i < sequence.length; i += 1) {
      if (sequence[i] - sequence[i - 1] !== diff) return false;
    }
    return true;
  };

  const isRepeatingChunk = (sequence, chunkSize) => {
    if (sequence.length < chunkSize * 2) return false;
    for (let i = 0; i < sequence.length; i += 1) {
      if (sequence[i] !== sequence[i % chunkSize]) return false;
    }
    return true;
  };

  const isMirror = (sequence) =>
    sequence.every((value, index) => value === sequence[sequence.length - 1 - index]);

  const isDiffCycle = (sequence, cycleSize) => {
    if (sequence.length < cycleSize + 2) return false;
    const diffs = sequence.slice(1).map((value, index) => value - sequence[index]);
    for (let i = 0; i < diffs.length; i += 1) {
      if (diffs[i] !== diffs[i % cycleSize]) return false;
    }
    return true;
  };

  const isPatternSequence = (sequence) =>
    isArithmetic(sequence) ||
    isMirror(sequence) ||
    isRepeatingChunk(sequence, 2) ||
    isRepeatingChunk(sequence, 3) ||
    isDiffCycle(sequence, 2);

  const buildArithmeticSequence = () => {
    const steps = [-3, -2, -1, 1, 2, 3];
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const step = steps[Math.floor(Math.random() * steps.length)];
      const start = randomInt(1, 9);
      const sequence = Array.from({ length }, (_, i) => start + step * i);
      if (sequence.every((value) => value >= 1 && value <= 9)) {
        return sequence;
      }
    }
    return Array.from({ length }, () => 5);
  };

  const buildAlternatingSequence = () => {
    let first = randomInt(1, 9);
    let second = randomInt(1, 9);
    while (second === first) {
      second = randomInt(1, 9);
    }
    return Array.from({ length }, (_, i) => (i % 2 === 0 ? first : second));
  };

  const buildMirrorSequence = () => {
    const halfLength = Math.ceil(length / 2);
    const half = Array.from({ length: halfLength }, () => randomInt(1, 9));
    const mirror = [...half];
    const startIndex = length % 2 === 0 ? halfLength - 1 : halfLength - 2;
    for (let i = startIndex; i >= 0; i -= 1) {
      mirror.push(half[i]);
    }
    return mirror;
  };

  const buildRepeatSequence = () => {
    const chunkSize = randomInt(2, 3);
    const chunk = Array.from({ length: chunkSize }, () => randomInt(1, 9));
    return Array.from({ length }, (_, i) => chunk[i % chunkSize]);
  };

  const buildDiffCycleSequence = () => {
    const stepOptions = [-2, -1, 1, 2];
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const cycle = [
        stepOptions[Math.floor(Math.random() * stepOptions.length)],
        stepOptions[Math.floor(Math.random() * stepOptions.length)],
      ];
      const start = randomInt(1, 9);
      const sequence = [start];
      for (let i = 1; i < length; i += 1) {
        const next = sequence[i - 1] + cycle[(i - 1) % cycle.length];
        if (next < 1 || next > 9) break;
        sequence.push(next);
      }
      if (sequence.length === length) {
        return sequence;
      }
    }
    return buildArithmeticSequence();
  };

  const generatePatternSequence = () => {
    const builders = useSubtle
      ? [
          buildArithmeticSequence,
          buildAlternatingSequence,
          buildMirrorSequence,
          buildRepeatSequence,
          buildDiffCycleSequence,
        ]
      : [buildArithmeticSequence, buildAlternatingSequence, buildMirrorSequence];
    const builder = builders[Math.floor(Math.random() * builders.length)];
    const sequence = builder();
    return isPatternSequence(sequence) ? sequence : buildArithmeticSequence();
  };

  const generateRandomSequence = () => {
    let sequence = [];
    for (let attempt = 0; attempt < 25; attempt += 1) {
      sequence = Array.from({ length }, () => randomInt(1, 9));
      if (!isPatternSequence(sequence)) {
        return sequence;
      }
    }
    return sequence;
  };

  const showSequence = (sequence) => {
    sequenceEl.innerHTML = "";
    sequence.forEach((value) => {
      const item = document.createElement("div");
      item.className = "detector-item";
      item.textContent = String(value);
      sequenceEl.appendChild(item);
    });
  };

  const nextRound = () => {
    if (!running) return;
    if (roundIndex >= rounds) {
      stop("Session complete. Review your calls.");
      return;
    }
    currentIsPattern = Math.random() < 0.5;
    const sequence = currentIsPattern ? generatePatternSequence() : generateRandomSequence();
    showSequence(sequence);
    updateStatus(`Round ${roundIndex + 1} of ${rounds}: Pattern or random?`);
  };

  const handleChoice = (choiceIsPattern) => {
    if (!running) return;
    total += 1;
    roundIndex += 1;
    if (choiceIsPattern === currentIsPattern) {
      correct += 1;
      updateStatus("Correct.");
    } else if (choiceIsPattern) {
      falsePositives += 1;
      updateStatus("False alarm. That was random.");
    } else {
      misses += 1;
      updateStatus("Missed pattern. That was structured.");
    }
    updateScore();
    clearAdvance();
    advanceTimer = window.setTimeout(nextRound, 450);
  };

  const syncSettings = () => {
    const parsedRounds = Number.parseInt(roundsInput.value, 10);
    rounds = clamp(Number.isNaN(parsedRounds) ? 16 : parsedRounds, 8, 30);
    roundsInput.value = String(rounds);

    const parsedLength = Number.parseInt(lengthInput.value, 10);
    length = clamp(Number.isNaN(parsedLength) ? 6 : parsedLength, 4, 10);
    lengthInput.value = String(length);

    useSubtle = subtleInput.checked;
  };

  const start = () => {
    if (running) return;
    syncSettings();
    running = true;
    roundIndex = 0;
    correct = 0;
    falsePositives = 0;
    misses = 0;
    total = 0;
    updateScore();
    startBtn.disabled = true;
    setChoicesEnabled(true);
    nextRound();
  };

  const stop = (message) => {
    running = false;
    clearAdvance();
    setChoicesEnabled(false);
    startBtn.disabled = false;
    updateStatus(message);
  };

  const reset = () => {
    stop("Is it a pattern or just noise?");
    sequenceEl.innerHTML = "";
    updateScore();
  };

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  patternBtn.addEventListener("click", () => handleChoice(true));
  randomBtn.addEventListener("click", () => handleChoice(false));
  roundsInput.addEventListener("input", syncSettings);
  lengthInput.addEventListener("input", syncSettings);
  subtleInput.addEventListener("change", syncSettings);

  syncSettings();
  setChoicesEnabled(false);
  reset();

  return { resetToIdle: reset };
};

const initSpeedCategorization = () => {
  const panel = document.querySelector("#speed-categorization");
  const roundsInput = document.querySelector("#speed-rounds");
  const durationInput = document.querySelector("#speed-duration");
  const categoriesInput = document.querySelector("#speed-categories");
  const startBtn = document.querySelector("#speed-start");
  const resetBtn = document.querySelector("#speed-reset");
  const statusEl = document.querySelector("#speed-status");
  const cardEl = document.querySelector("#speed-card");
  const buttonsEl = document.querySelector("#speed-buttons");
  const scoreEl = document.querySelector("#speed-score");

  if (
    !panel ||
    !roundsInput ||
    !durationInput ||
    !categoriesInput ||
    !startBtn ||
    !resetBtn ||
    !statusEl ||
    !cardEl ||
    !buttonsEl ||
    !scoreEl
  ) {
    throw new Error("Required UI elements are missing for Speed Categorization.");
  }

  const categoryBank = [
    { label: "Animal", items: ["Lion", "Panda", "Otter", "Hawk", "Frog", "Wolf"] },
    { label: "Tool", items: ["Hammer", "Wrench", "Drill", "Saw", "Ladder", "Chisel"] },
    { label: "Place", items: ["Harbor", "Forest", "Canyon", "Desert", "Village", "Island"] },
    { label: "Food", items: ["Apple", "Bread", "Cheese", "Carrot", "Noodle", "Berry"] },
  ];

  let rounds = 20;
  let displayMs = 700;
  let categoryCount = 2;
  let activeCategories = categoryBank.slice(0, categoryCount);
  let running = false;
  let roundIndex = 0;
  let correct = 0;
  let total = 0;
  let responseTimes = [];
  let currentCategoryIndex = 0;
  let roundStart = 0;
  let allowResponse = false;
  let itemTimer = null;
  let advanceTimer = null;

  const updateStatus = (text) => {
    statusEl.textContent = text;
  };

  const updateScore = () => {
    if (total === 0) {
      scoreEl.textContent = "Accuracy: 0/0 | Avg RT: -- | Speed: --";
      return;
    }
    const avgRt = Math.round(
      responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length,
    );
    const accuracy = correct / total;
    const speedScore = Math.max(0, accuracy * (1000 / avgRt));
    scoreEl.textContent = `Accuracy: ${correct}/${total} | Avg RT: ${avgRt}ms | Speed: ${speedScore.toFixed(2)}`;
  };

  const clearTimers = () => {
    if (itemTimer !== null) {
      window.clearTimeout(itemTimer);
      itemTimer = null;
    }
    if (advanceTimer !== null) {
      window.clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  };

  const syncSettings = () => {
    const parsedRounds = Number.parseInt(roundsInput.value, 10);
    rounds = clamp(Number.isNaN(parsedRounds) ? 20 : parsedRounds, 10, 40);
    roundsInput.value = String(rounds);

    const parsedDuration = Number.parseInt(durationInput.value, 10);
    displayMs = clamp(Number.isNaN(parsedDuration) ? 700 : parsedDuration, 300, 1200);
    durationInput.value = String(displayMs);

    categoriesInput.max = String(categoryBank.length);
    const parsedCategories = Number.parseInt(categoriesInput.value, 10);
    categoryCount = clamp(Number.isNaN(parsedCategories) ? 2 : parsedCategories, 2, categoryBank.length);
    categoriesInput.value = String(categoryCount);
    activeCategories = categoryBank.slice(0, categoryCount);
    if (!running) {
      buildButtons();
    }
  };

  const buildButtons = () => {
    buttonsEl.innerHTML = "";
    activeCategories.forEach((category, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${index + 1} ${category.label}`;
      button.addEventListener("click", () => handleChoice(index));
      buttonsEl.appendChild(button);
    });
  };

  const nextItem = () => {
    if (!running) return;
    if (roundIndex >= rounds) {
      stop("Session complete. Review your speed.");
      return;
    }
    cardEl.classList.remove("is-correct", "is-wrong");
    const categoryIndex = Math.floor(Math.random() * activeCategories.length);
    const pool = activeCategories[categoryIndex].items;
    const item = pool[Math.floor(Math.random() * pool.length)];
    currentCategoryIndex = categoryIndex;
    cardEl.textContent = item;
    allowResponse = true;
    roundStart = performance.now();
    clearTimers();
    itemTimer = window.setTimeout(handleNoResponse, displayMs);
    updateStatus(`Round ${roundIndex + 1} of ${rounds}`);
  };

  const handleChoice = (choiceIndex) => {
    if (!running || !allowResponse) return;
    allowResponse = false;
    clearTimers();
    const rt = performance.now() - roundStart;
    responseTimes.push(rt);
    total += 1;
    roundIndex += 1;
    if (choiceIndex === currentCategoryIndex) {
      correct += 1;
      cardEl.classList.add("is-correct");
      updateStatus("Correct.");
    } else {
      cardEl.classList.add("is-wrong");
      updateStatus("Wrong.");
    }
    updateScore();
    advanceTimer = window.setTimeout(nextItem, 350);
  };

  const handleNoResponse = () => {
    if (!running || !allowResponse) return;
    allowResponse = false;
    total += 1;
    roundIndex += 1;
    responseTimes.push(displayMs);
    cardEl.classList.add("is-wrong");
    updateStatus("Too slow.");
    updateScore();
    advanceTimer = window.setTimeout(nextItem, 350);
  };

  const start = () => {
    if (running) return;
    syncSettings();
    running = true;
    roundIndex = 0;
    correct = 0;
    total = 0;
    responseTimes = [];
    startBtn.disabled = true;
    nextItem();
  };

  const stop = (message) => {
    running = false;
    allowResponse = false;
    clearTimers();
    startBtn.disabled = false;
    updateStatus(message);
  };

  const reset = () => {
    stop("Sort each word instantly.");
    cardEl.textContent = "Ready";
    cardEl.classList.remove("is-correct", "is-wrong");
    updateScore();
    buildButtons();
  };

  const handleKeydown = (event) => {
    if (!running || !panel.classList.contains("active")) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = Number.parseInt(event.key, 10);
    if (Number.isNaN(key)) return;
    if (key >= 1 && key <= activeCategories.length) {
      event.preventDefault();
      handleChoice(key - 1);
    }
  };

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  roundsInput.addEventListener("input", syncSettings);
  durationInput.addEventListener("input", syncSettings);
  categoriesInput.addEventListener("input", syncSettings);
  window.addEventListener("keydown", handleKeydown);

  syncSettings();
  updateScore();
  reset();

  return { resetToIdle: reset };
};

const boot = () => {
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
  const reactionGame = initReactionInhibition();
  const patternGame = initPatternCompletion();
  const rotationGame = initMentalRotation();
  const juggleGame = initDualTaskJuggle();
  const timeGame = initTimeEstimation();
  const ruleGame = initRuleSwitcher();
  const recallGame = initDelayedRecall();
  const noiseGame = initBinaryNoise();
  const countGame = initMentalCount();
  const compressGame = initSymbolCompression();
  const detectorGame = initFalsePatternDetector();
  const speedGame = initSpeedCategorization();

  const games = [
    { id: "memory", title: "Memory Tester", description: "Sequence recall on a custom grid." },
    { id: "nback", title: "Dual N-Back", description: "Track positions and letters N steps back." },
    { id: "digits", title: "Digit Order", description: "Memorize the digits, then tap them in order." },
    { id: "reaction", title: "Reaction Inhibition", description: "Tap fast, except on stop cues." },
    { id: "pattern", title: "Pattern Completion", description: "Fill the missing item in the sequence." },
    { id: "rotation", title: "Mental Rotation Snap", description: "Are the shapes the same when rotated?" },
    { id: "juggle", title: "Dual Task Juggle", description: "Track the orb while answering math." },
    { id: "time", title: "Time Estimation Trap", description: "Estimate the hidden interval." },
    { id: "rules", title: "Rule Switcher", description: "Adapt as the rule changes mid-run." },
    { id: "recall", title: "Delayed Recall Ping", description: "Hold the set through a delay." },
    { id: "noise", title: "Binary Choice Under Noise", description: "Choose under heavy distraction." },
    { id: "count", title: "Mental Count Drift", description: "Track the running total." },
    { id: "compress", title: "Symbol Compression", description: "Compress a grid into counts." },
    { id: "detector", title: "False Pattern Detector", description: "Call out patterns without overfitting." },
    { id: "speed", title: "Speed Categorization", description: "Sort words at full speed." },
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

    if (meta.id === "rotation") {
      rotationGame.refresh();
    }

    if (meta.id !== "nback" && dualNBack.isRunning()) {
      dualNBack.stop("Switched games. Stream paused.");
    }
    if (meta.id !== "memory") {
      memoryGame.resetToIdle();
    }
    if (meta.id !== "digits") {
      digitOrder.resetToIdle();
    }
    if (meta.id !== "reaction") {
      reactionGame.resetToIdle();
    }
    if (meta.id !== "pattern") {
      patternGame.resetToIdle();
    }
    if (meta.id !== "rotation") {
      rotationGame.resetToIdle();
    }
    if (meta.id !== "juggle") {
      juggleGame.resetToIdle();
    }
    if (meta.id !== "time") {
      timeGame.resetToIdle();
    }
    if (meta.id !== "rules") {
      ruleGame.resetToIdle();
    }
    if (meta.id !== "recall") {
      recallGame.resetToIdle();
    }
    if (meta.id !== "noise") {
      noiseGame.resetToIdle();
    }
    if (meta.id !== "count") {
      countGame.resetToIdle();
    }
    if (meta.id !== "compress") {
      compressGame.resetToIdle();
    }
    if (meta.id !== "detector") {
      detectorGame.resetToIdle();
    }
    if (meta.id !== "speed") {
      speedGame.resetToIdle();
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
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
