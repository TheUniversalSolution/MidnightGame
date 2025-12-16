const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Phase = "idle" | "showing" | "input";

document.addEventListener("DOMContentLoaded", () => {
  const gridSizeInput = document.querySelector<HTMLInputElement>("#grid-size");
  const patternLengthInput = document.querySelector<HTMLInputElement>("#pattern-length");
  const showPatternBtn = document.querySelector<HTMLButtonElement>("#show-pattern");
  const resetBtn = document.querySelector<HTMLButtonElement>("#reset");
  const gridEl = document.querySelector<HTMLDivElement>("#grid");
  const statusEl = document.querySelector<HTMLParagraphElement>("#status");

  if (!gridSizeInput || !patternLengthInput || !showPatternBtn || !resetBtn || !gridEl || !statusEl) {
    throw new Error("Required UI elements are missing.");
  }

  let gridSize = 4;
  let patternLength = 5;
  let sequence: number[] = [];
  let phase: Phase = "idle";
  let userIndex = 0;

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const getCell = (index: number) =>
    gridEl.querySelector<HTMLButtonElement>(`[data-index="${index}"]`);

  const updateStatus = (text: string) => {
    statusEl.textContent = text;
  };

  const clearCellState = () => {
    const cells = gridEl.querySelectorAll<HTMLButtonElement>(".cell");
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

  const buildGrid = (size: number) => {
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

  const lockButtons = (locked: boolean) => {
    showPatternBtn.disabled = locked;
    resetBtn.disabled = locked && phase === "showing";
  };

  const generateSequence = (length: number, maxIndex: number) => {
    const next: number[] = [];
    for (let i = 0; i < length; i += 1) {
      next.push(Math.floor(Math.random() * maxIndex));
    }
    return next;
  };

  const flashCell = async (index: number) => {
    const cell = getCell(index);
    if (!cell) return;
    cell.classList.add("showing");
    await sleep(520);
    cell.classList.remove("showing");
    await sleep(160);
  };

  const playPattern = async () => {
    phase = "showing";
    lockButtons(true);
    updateStatus("Showing pattern… watch closely.");
    clearCellState();

    for (const idx of sequence) {
      await flashCell(idx);
    }

    phase = "input";
    userIndex = 0;
    lockButtons(false);
    updateStatus("Your turn: click the cells in order.");
  };

  const endRound = (success: boolean, lastIndex?: number) => {
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

  const handleUserInput = (index: number) => {
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
});
