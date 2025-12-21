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

  const games = [
    { id: "memory", title: "Memory Tester", description: "Sequence recall on a custom grid." },
    { id: "nback", title: "Dual N-Back", description: "Track positions and letters N steps back." },
    { id: "digits", title: "Digit Order", description: "Memorize the digits, then tap them in order." },
    { id: "reaction", title: "Reaction Inhibition", description: "Tap fast, except on stop cues." },
    { id: "pattern", title: "Pattern Completion", description: "Fill the missing item in the sequence." },
    { id: "rotation", title: "Mental Rotation Snap", description: "Are the shapes the same when rotated?" },
    { id: "juggle", title: "Dual Task Juggle", description: "Track the orb while answering math." },
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
