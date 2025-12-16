var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var sleep = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
document.addEventListener("DOMContentLoaded", function () {
    var gridSizeInput = document.querySelector("#grid-size");
    var patternLengthInput = document.querySelector("#pattern-length");
    var showPatternBtn = document.querySelector("#show-pattern");
    var resetBtn = document.querySelector("#reset");
    var gridEl = document.querySelector("#grid");
    var statusEl = document.querySelector("#status");
    if (!gridSizeInput || !patternLengthInput || !showPatternBtn || !resetBtn || !gridEl || !statusEl) {
        throw new Error("Required UI elements are missing.");
    }
    var gridSize = 4;
    var patternLength = 5;
    var sequence = [];
    var phase = "idle";
    var userIndex = 0;
    var clamp = function (value, min, max) { return Math.min(Math.max(value, min), max); };
    var getCell = function (index) {
        return gridEl.querySelector("[data-index=\"".concat(index, "\"]"));
    };
    var updateStatus = function (text) {
        statusEl.textContent = text;
    };
    var clearCellState = function () {
        var cells = gridEl.querySelectorAll(".cell");
        cells.forEach(function (cell) { return cell.classList.remove("showing", "user-hit", "miss"); });
    };
    var syncSettingsFromInputs = function () {
        var parsedSize = Number.parseInt(gridSizeInput.value, 10);
        gridSize = clamp(Number.isNaN(parsedSize) ? 4 : parsedSize, 2, 8);
        gridSizeInput.value = String(gridSize);
        var maxPattern = gridSize * gridSize;
        patternLengthInput.max = String(maxPattern);
        var parsedLength = Number.parseInt(patternLengthInput.value, 10);
        patternLength = clamp(Number.isNaN(parsedLength) ? 5 : parsedLength, 2, maxPattern);
        patternLengthInput.value = String(patternLength);
    };
    var buildGrid = function (size) {
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = "repeat(".concat(size, ", minmax(0, 1fr))");
        var _loop_1 = function (i) {
            var cell = document.createElement("button");
            cell.type = "button";
            cell.className = "cell";
            cell.dataset.index = String(i);
            var row = Math.floor(i / size) + 1;
            var col = (i % size) + 1;
            cell.setAttribute("aria-label", "Cell ".concat(row, ", ").concat(col));
            cell.addEventListener("click", function () { return handleUserInput(i); });
            gridEl.appendChild(cell);
        };
        for (var i = 0; i < size * size; i += 1) {
            _loop_1(i);
        }
    };
    var lockButtons = function (locked) {
        showPatternBtn.disabled = locked;
        resetBtn.disabled = locked && phase === "showing";
    };
    var generateSequence = function (length, maxIndex) {
        var next = [];
        for (var i = 0; i < length; i += 1) {
            next.push(Math.floor(Math.random() * maxIndex));
        }
        return next;
    };
    var flashCell = function (index) { return __awaiter(_this, void 0, void 0, function () {
        var cell;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cell = getCell(index);
                    if (!cell)
                        return [2 /*return*/];
                    cell.classList.add("showing");
                    return [4 /*yield*/, sleep(520)];
                case 1:
                    _a.sent();
                    cell.classList.remove("showing");
                    return [4 /*yield*/, sleep(160)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var playPattern = function () { return __awaiter(_this, void 0, void 0, function () {
        var _i, sequence_1, idx;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    phase = "showing";
                    lockButtons(true);
                    updateStatus("Showing pattern� watch closely.");
                    clearCellState();
                    _i = 0, sequence_1 = sequence;
                    _a.label = 1;
                case 1:
                    if (!(_i < sequence_1.length)) return [3 /*break*/, 4];
                    idx = sequence_1[_i];
                    return [4 /*yield*/, flashCell(idx)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    phase = "input";
                    userIndex = 0;
                    lockButtons(false);
                    updateStatus("Your turn: click the cells in order.");
                    return [2 /*return*/];
            }
        });
    }); };
    var endRound = function (success, lastIndex) {
        phase = "idle";
        lockButtons(false);
        if (success) {
            updateStatus("Nice work! Pattern matched. Try a tougher setup or replay.");
        }
        else {
            if (typeof lastIndex === "number") {
                var cell_1 = getCell(lastIndex);
                if (cell_1) {
                    cell_1.classList.add("miss");
                    setTimeout(function () { return cell_1.classList.remove("miss"); }, 700);
                }
            }
            updateStatus("That one missed. Show the pattern again to retry.");
        }
    };
    var handleUserInput = function (index) {
        if (phase !== "input")
            return;
        var expected = sequence[userIndex];
        if (index === expected) {
            var cell_2 = getCell(index);
            if (cell_2) {
                cell_2.classList.add("user-hit");
                setTimeout(function () { return cell_2.classList.remove("user-hit"); }, 350);
            }
            userIndex += 1;
            if (userIndex === sequence.length) {
                endRound(true);
            }
            else {
                updateStatus("Good so far: ".concat(userIndex, "/").concat(sequence.length));
            }
        }
        else {
            endRound(false, index);
        }
    };
    var startRound = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (phase === "showing")
                        return [2 /*return*/];
                    syncSettingsFromInputs();
                    sequence = generateSequence(patternLength, gridSize * gridSize);
                    return [4 /*yield*/, playPattern()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var reset = function () {
        phase = "idle";
        userIndex = 0;
        sequence = [];
        clearCellState();
        lockButtons(false);
        updateStatus("Pick settings and show a pattern to begin.");
    };
    gridSizeInput.addEventListener("input", function () {
        syncSettingsFromInputs();
        buildGrid(gridSize);
        clearCellState();
        updateStatus("Grid updated. Show pattern to play.");
    });
    patternLengthInput.addEventListener("input", function () {
        syncSettingsFromInputs();
    });
    showPatternBtn.addEventListener("click", function () {
        startRound().catch(function (err) {
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
