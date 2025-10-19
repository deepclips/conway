(function () {
  // ---- Config ----
  const CELL_MIN = 3; // 3px min => max density
  const CELL_MAX = 80; // generous upper bound
  const MAX_DIM = 200; // maximum columns/rows allowed
  const CELL_STEP = 2;
  const DEFAULT_CELL = 20;
  const MIN_COLS = 5,
    MIN_ROWS = 5;
  const WIDTH_NARROW_THRESHOLD = 0.5; // 50% of viewport width

  // ---- Elements ----
  const gridContainer = document.getElementById("gridContainer");
  const controlsEl = document.getElementById("controls");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const stepBtn = document.getElementById("stepBtn");
  const clearBtn = document.getElementById("clearBtn");
  const randomBtn = document.getElementById("randomBtn");
  const timerInput = document.getElementById("timerInput");
  const increaseBtn = document.getElementById("increaseBtn");
  const decreaseBtn = document.getElementById("decreaseBtn");
  const resolutionEl = document.getElementById("resolutionOverlay");
  const genEl = document.getElementById("genOverlay");
  const popEl = document.getElementById("popOverlay");
  const resolutionInput = document.getElementById("resolutionInput");
  const patternSelect = document.getElementById("patternSelect");

  // ---- State ----
  let cellSize = DEFAULT_CELL;
  let gridX = 1,
    gridY = 1;
  let current = [],
    next = [];
  let generation = 0;
  let population = 0;
  let loop = null;
  let desiredResolution = null; // { cols, rows } if user set explicitly
  let widthPriorityActive = false; // prefer width-fit and allow vertical scroll
  let currentPattern = null; // Track selected pattern

  // ---- Helpers ----
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const isRunning = () => !!loop;

  function start() {
    if (loop) return;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    stepBtn.disabled = true;
    const val = parseInt(timerInput.value, 10);
    const timer = Number.isFinite(val) ? val : 500;
    loop = setInterval(step, timer);
  }
  function stop() {
    if (!loop) return;
    clearInterval(loop);
    loop = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stepBtn.disabled = false;
    // If a resize-triggered randomize is pending, cancel it so Stop doesn't
    // unexpectedly randomize the board after the user pressed Stop.
    if (typeof resizeEndTimer !== "undefined" && resizeEndTimer) {
      clearTimeout(resizeEndTimer);
      resizeEndTimer = null;
    }
    draw();
  }

  function viewportDims() {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const ch = controlsEl.offsetHeight || 0;
    const hAvail = Math.max(0, wh - ch);
    return { ww, wh, ch, hAvail };
  }

  function computeDims() {
    const { ww, hAvail } = viewportDims();
    let gx = Math.max(1, Math.floor(ww / cellSize));
    let gy = Math.max(1, Math.floor(hAvail / cellSize));
    if (gx < MIN_COLS || gy < MIN_ROWS) {
      const fitCellFromWidth = Math.floor(ww / MIN_COLS);
      const fitCellFromHeight = Math.floor(hAvail / MIN_ROWS);
      const newCell = clamp(
        Math.min(fitCellFromWidth, fitCellFromHeight),
        CELL_MIN,
        CELL_MAX
      );
      if (newCell !== cellSize) cellSize = newCell;
      gx = Math.max(1, Math.floor(ww / cellSize));
      gy = Math.max(1, Math.floor(hAvail / cellSize));
    }
    cellSize = clamp(cellSize, CELL_MIN, CELL_MAX);
    // Clamp maximum resolution per axis to avoid excessive cell counts
    gridX = Math.min(gx, MAX_DIM);
    gridY = Math.min(gy, MAX_DIM);
    gridContainer.style.height = hAvail + "px";
  }

  function initArrays() {
    current = Array.from({ length: gridX }, () => Array(gridY).fill(false));
    next = Array.from({ length: gridX }, () => Array(gridY).fill(false));
  }

  function updateResolutionLabel() {
    if (resolutionEl) resolutionEl.textContent = gridX + " × " + gridY;
    if (resolutionInput) resolutionInput.value = gridX + "x" + gridY;
  }

  function computePopulation() {
    let count = 0;
    for (let x = 0; x < gridX; x++) {
      for (let y = 0; y < gridY; y++) {
        if (current[x][y]) count++;
      }
    }
    population = count;
  }

  function updateStats() {
    if (genEl) genEl.textContent = "Gen: " + generation;
    if (popEl) popEl.textContent = "Pop: " + population;
  }

  function draw() {
    const { ww, hAvail } = viewportDims();
    const totalW = gridX * cellSize;
    const totalH = gridY * cellSize;
    const scaleX = ww / totalW;
    const scaleY = hAvail / totalH;

    let scale;
    if (widthPriorityActive) {
      // Fill width; allow vertical overflow/scroll
      scale = Math.min(1, scaleX);
      gridContainer.style.overflow = "auto";
    } else {
      // Default: uniform fit
      scale = Math.min(1, scaleX, scaleY);
      gridContainer.style.overflow = "hidden";
    }

    let html =
      '<div id="lifeWrap" style="transform:scale(' +
      scale.toFixed(4) +
      '); transform-origin:center center;">';
    html +=
      '<table id="lifeTable" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    for (let y = 0; y < gridY; y++) {
      html += "<tr>";
      for (let x = 0; x < gridX; x++) {
        const alive = current[x][y];
        html +=
          '<td data-x="' +
          x +
          '" data-y="' +
          y +
          '" style="width:' +
          cellSize +
          "px;height:" +
          cellSize +
          "px;padding:0;background:" +
          (alive ? "#000" : "#fff") +
          '"></td>';
      }
      html += "</tr>";
    }
    html += "</table></div>";

    gridContainer.innerHTML = html;
    // Re-attach overlays (innerHTML cleared children)
    if (resolutionEl) gridContainer.appendChild(resolutionEl);
    if (genEl) gridContainer.appendChild(genEl);
    if (popEl) gridContainer.appendChild(popEl);

    if (!isRunning()) {
      gridContainer.querySelectorAll("td").forEach((td) => {
        td.addEventListener("click", () => {
          const x = +td.getAttribute("data-x");
          const y = +td.getAttribute("data-y");
          current[x][y] = !current[x][y];
          computePopulation();
          draw();
        });
        td.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            const x = +td.getAttribute("data-x");
            const y = +td.getAttribute("data-y");
            current[x][y] = !current[x][y];
            computePopulation();
            draw();
          },
          { passive: false }
        );
      });
    }
    updateResolutionLabel();
    updateStats();
  }

  // Game of Life helpers
  const val = (x, y) => {
    if (x < 0) x = gridX - 1;
    if (x >= gridX) x = 0;
    if (y < 0) y = gridY - 1;
    if (y >= gridY) y = 0;
    return current[x][y];
  };
  const neighbors = (x, y) => {
    let c = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) continue;
        if (val(i, j)) c++;
      }
    }
    return c;
  };

  function step() {
    for (let x = 0; x < gridX; x++) {
      for (let y = 0; y < gridY; y++) {
        const n = neighbors(x, y);
        if (current[x][y]) next[x][y] = !(n < 2 || n > 3);
        else next[x][y] = n === 3;
      }
    }
    const tmp = current;
    current = next;
    next = tmp;
    generation++;
    computePopulation();
    draw();
  }

  function randomize() {
    for (let x = 0; x < gridX; x++)
      for (let y = 0; y < gridY; y++) current[x][y] = Math.random() < 0.5;
    generation = 0;
    computePopulation();
  }

  function reflow({ keep = true, rand = false } = {}) {
    const old = current;
    const oldX = old.length;
    const oldY = oldX ? old[0].length : 0;
    const { ww, hAvail } = viewportDims();

    widthPriorityActive = false;

    if (desiredResolution) {
      const cols = Math.max(MIN_COLS, desiredResolution.cols | 0);
      const rows = Math.max(MIN_ROWS, desiredResolution.rows | 0);

      // Two candidate cell sizes:
      const cellByHeight = Math.floor(hAvail / rows);
      const cellByWidth = Math.floor(ww / cols);
      // Width if we fit by height:
      const widthIfByHeight = cols * cellByHeight;

      // If height-fit would make visible width < threshold, prefer width-fit
      if (widthIfByHeight < ww * WIDTH_NARROW_THRESHOLD) {
        cellSize = clamp(cellByWidth, CELL_MIN, CELL_MAX);
        widthPriorityActive = true; // draw() will allow vertical scroll
      } else {
        cellSize = clamp(cellByHeight, CELL_MIN, CELL_MAX);
      }

      gridX = cols;
      gridY = rows;
      gridContainer.style.height = hAvail + "px";
    } else {
      computeDims();
    }

    initArrays();

    if (rand || !keep || !oldX) randomize();
    else {
      const cx = Math.min(oldX, gridX);
      const cy = Math.min(oldY, gridY);
      for (let x = 0; x < cx; x++)
        for (let y = 0; y < cy; y++) current[x][y] = old[x][y];
    }
    draw();
  }

  function changeResolutionAndRandomize(applyChangeFn) {
    if (isRunning()) stop();
    applyChangeFn();
    reflow({ keep: false, rand: true });
  }

  // Controls
  startBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);
  stepBtn.addEventListener("click", step);
  clearBtn.addEventListener("click", () => {
    if (isRunning()) stop();
    for (let x = 0; x < gridX; x++)
      for (let y = 0; y < gridY; y++) current[x][y] = false;
    generation = 0;
    population = 0;
    draw();
  });
  randomBtn.addEventListener("click", () => {
    if (isRunning()) stop();
    randomize();
    draw();
  });
  timerInput.addEventListener("change", () => {
    const v = parseInt(timerInput.value, 10);
    const newMs = Number.isFinite(v) ? v : 500;
    if (isRunning()) {
      clearInterval(loop);
      loop = setInterval(step, newMs);
    }
  });

  // +/- behavior (with exact mode) + stop+randomize semantics
  increaseBtn.addEventListener("click", () => {
    changeResolutionAndRandomize(() => {
      desiredResolution = desiredResolution || { cols: gridX, rows: gridY };
      if (cellSize > CELL_MIN && !desiredResolution) {
        cellSize = clamp(cellSize - CELL_STEP, CELL_MIN, CELL_MAX);
      } else {
        desiredResolution = {
          cols: Math.max(MIN_COLS, Math.round(gridX * 1.2)),
          rows: Math.max(MIN_ROWS, Math.round(gridY * 1.2)),
        };
      }
    });
  });
  decreaseBtn.addEventListener("click", () => {
    changeResolutionAndRandomize(() => {
      if (desiredResolution) {
        desiredResolution = {
          cols: Math.max(MIN_COLS, Math.round(gridX / 1.2)),
          rows: Math.max(MIN_ROWS, Math.round(gridY / 1.2)),
        };
      } else {
        cellSize = clamp(cellSize + CELL_STEP, CELL_MIN, CELL_MAX);
      }
    });
  });

  // Direct resolution input
  function parseResolution(text) {
    if (!text) return null;
    const cleaned = String(text).trim().toLowerCase().replace("×", "x");
    const m = cleaned.match(/^(\d+)\s*[x,\s]\s*(\d+)$/);
    if (!m) return null;
    const cols = parseInt(m[1], 10);
    const rows = parseInt(m[2], 10);
    if (!Number.isFinite(cols) || !Number.isFinite(rows)) return null;
    return { cols: Math.max(MIN_COLS, cols), rows: Math.max(MIN_ROWS, rows) };
  }
  function applyDesiredResolution(text) {
    const parsed = parseResolution(text);
    if (!parsed) return;

    // Clamp parsed values to MAX_DIM and notify user if clamping occurred
    const clampedCols = Math.min(parsed.cols, MAX_DIM);
    const clampedRows = Math.min(parsed.rows, MAX_DIM);
    const wasClamped =
      clampedCols !== parsed.cols || clampedRows !== parsed.rows;

    changeResolutionAndRandomize(() => {
      desiredResolution = { cols: clampedCols, rows: clampedRows };
    });

    if (wasClamped) showMaxResModal();
  }

  // Modal elements for max-resolution warning
  const maxResModal = document.getElementById("maxResModal");
  const modalCloseBtn = document.getElementById("modalClose");
  let modalTimer = null;

  function showMaxResModal() {
    if (!maxResModal) return;
    maxResModal.classList.remove("hidden");
    if (modalTimer) clearTimeout(modalTimer);
    modalTimer = setTimeout(hideMaxResModal, 5000);
  }
  function hideMaxResModal() {
    if (!maxResModal) return;
    maxResModal.classList.add("hidden");
    if (modalTimer) {
      clearTimeout(modalTimer);
      modalTimer = null;
    }
  }
  modalCloseBtn && modalCloseBtn.addEventListener("click", hideMaxResModal);

  if (resolutionInput) {
    resolutionInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyDesiredResolution(resolutionInput.value);
    });
    resolutionInput.addEventListener("blur", () => {
      if (resolutionInput.value.trim())
        applyDesiredResolution(resolutionInput.value);
    });
  }

  // Resize: live reflow; preserve pattern if selected
  let resizeEndTimer = null;
  window.addEventListener("resize", () => {
    if (isRunning()) stop();
    reflow({ keep: true, rand: false });
    if (resizeEndTimer) clearTimeout(resizeEndTimer);
    resizeEndTimer = setTimeout(() => {
      reflow({ keep: false, rand: !currentPattern });
      if (currentPattern) {
        // Clear any randomized state and insert the pattern
        insertPattern(currentPattern);
      }
    }, 200);
  });

  // ---- Patterns ----
  const patterns = {
    glider: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    blinker: [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    block: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    beehive: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 3],
      [2, 1],
      [2, 2],
    ],
    loaf: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 3],
      [2, 1],
      [2, 3],
      [3, 2],
    ],
    boat: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 2],
      [2, 1],
    ],
    toad: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    beacon: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 2],
      [2, 3],
      [3, 2],
      [3, 3],
    ],
    pulsar: [
      [2, 0],
      [3, 0],
      [4, 0],
      [8, 0],
      [9, 0],
      [10, 0],
      [0, 2],
      [5, 2],
      [7, 2],
      [12, 2],
      [0, 3],
      [5, 3],
      [7, 3],
      [12, 3],
      [0, 4],
      [5, 4],
      [7, 4],
      [12, 4],
      [2, 5],
      [3, 5],
      [4, 5],
      [8, 5],
      [9, 5],
      [10, 5],
      [2, 7],
      [3, 7],
      [4, 7],
      [8, 7],
      [9, 7],
      [10, 7],
      [0, 8],
      [5, 8],
      [7, 8],
      [12, 8],
      [0, 9],
      [5, 9],
      [7, 9],
      [12, 9],
      [0, 10],
      [5, 10],
      [7, 10],
      [12, 10],
      [2, 12],
      [3, 12],
      [4, 12],
      [8, 12],
      [9, 12],
      [10, 12],
    ],
    pentadecathlon: [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 2],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 0],
      [7, 2],
      [8, 1],
      [9, 1],
    ],
    gliderGun: [
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [8, 3],
      [8, 4],
      [9, 2],
      [9, 4],
      [10, 2],
      [10, 3],
      [16, 4],
      [16, 5],
      [16, 6],
      [17, 4],
      [18, 5],
      [22, 1],
      [22, 2],
      [23, 0],
      [23, 2],
      [24, 0],
      [24, 1],
      [24, 12],
      [24, 13],
      [25, 12],
      [25, 14],
      [26, 12],
      [34, 0],
      [34, 1],
      [35, 0],
      [35, 1],
      [35, 7],
      [35, 8],
      [35, 9],
      [36, 7],
      [37, 8],
    ],
    lightweightSpaceship: [
      [0, 0],
      [0, 3],
      [1, 4],
      [2, 0],
      [2, 4],
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
    ],
    diehard: [
      [0, 6],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 5],
      [2, 6],
      [2, 7],
    ],
    acorn: [
      [0, 1],
      [1, 3],
      [2, 0],
      [2, 1],
      [2, 4],
      [2, 5],
      [2, 6],
    ],
  };

  function insertPattern(pattern) {
    // Clear grid (using same logic as clear button)
    for (let x = 0; x < gridX; x++)
      for (let y = 0; y < gridY; y++) current[x][y] = false;
    generation = 0;

    if (!patterns[pattern]) return;

    // Calculate center position
    const centerX = Math.floor(gridX / 2);
    const centerY = Math.floor(gridY / 2);

    // Get pattern bounds
    const coords = patterns[pattern];
    const minX = Math.min(...coords.map((c) => c[0]));
    const maxX = Math.max(...coords.map((c) => c[0]));
    const minY = Math.min(...coords.map((c) => c[1]));
    const maxY = Math.max(...coords.map((c) => c[1]));
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Calculate offset to center the pattern
    const offsetX = centerX - Math.floor(width / 2);
    const offsetY = centerY - Math.floor(height / 2);

    // Place the pattern
    coords.forEach(([x, y]) => {
      const newX = x + offsetX;
      const newY = y + offsetY;
      if (newX >= 0 && newX < gridX && newY >= 0 && newY < gridY) {
        current[newX][newY] = 1;
      }
    });

    computePopulation();
    draw();
  }

  if (patternSelect) {
    patternSelect.addEventListener("change", (e) => {
      const pattern = e.target.value;
      if (pattern) {
        currentPattern = pattern;
        insertPattern(pattern);
      } else {
        currentPattern = null;
      }
    });
  }

  // ---- Init ----
  reflow({ keep: false, rand: true });
  stop();
})();
