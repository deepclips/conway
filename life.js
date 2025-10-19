(function () {
  const CELL_MIN = 3;
  const CELL_MAX = 80;
  const CELL_STEP = 2;
  const DEFAULT_CELL = 20;
  const MIN_COLS = 5, MIN_ROWS = 5;

  const gridContainer = document.getElementById('gridContainer');
  const controlsEl = document.getElementById('controls');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const stepBtn = document.getElementById('stepBtn');
  const clearBtn = document.getElementById('clearBtn');
  const randomBtn = document.getElementById('randomBtn');
  const timerInput = document.getElementById('timerInput');
  const increaseBtn = document.getElementById('increaseBtn');
  const decreaseBtn = document.getElementById('decreaseBtn');
  const resolutionEl = document.getElementById('resolutionOverlay');
  const resolutionInput = document.getElementById('resolutionInput');

  let cellSize = DEFAULT_CELL;
  let gridX = 1, gridY = 1;
  let current = [], next = [];
  let loop = null;
  let desiredResolution = null;

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

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
      const newCell = clamp(Math.min(fitCellFromWidth, fitCellFromHeight), CELL_MIN, CELL_MAX);
      if (newCell !== cellSize) cellSize = newCell;
      gx = Math.max(1, Math.floor(ww / cellSize));
      gy = Math.max(1, Math.floor(hAvail / cellSize));
    }
    cellSize = clamp(cellSize, CELL_MIN, CELL_MAX);
    gridX = gx;
    gridY = gy;
    gridContainer.style.height = hAvail + 'px';
  }

  function initArrays() {
    current = Array.from({ length: gridX }, () => Array(gridY).fill(false));
    next = Array.from({ length: gridX }, () => Array(gridY).fill(false));
  }

  function updateResolutionLabel() {
    if (resolutionEl) resolutionEl.textContent = gridX + ' × ' + gridY;
    if (resolutionInput) resolutionInput.value = gridX + 'x' + gridY;
  }

  function draw() {
    let html = '<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
    for (let y = 0; y < gridY; y++) {
      html += '<tr>';
      for (let x = 0; x < gridX; x++) {
        const alive = current[x][y];
        html += '<td data-x="' + x + '" data-y="' + y + '" style="width:' + cellSize + 'px;height:' + cellSize + 'px;padding:0;background:' + (alive ? '#000' : '#fff') + '"></td>';
      }
      html += '</tr>';
    }
    html += '</table>';
    gridContainer.innerHTML = html;
    gridContainer.appendChild(resolutionEl);
    if (!loop) {
      gridContainer.querySelectorAll('td').forEach(td => {
        td.addEventListener('click', () => {
          const x = +td.getAttribute('data-x');
          const y = +td.getAttribute('data-y');
          current[x][y] = !current[x][y];
          draw();
        });
      });
    }
    updateResolutionLabel();
  }

  function val(x, y) {
    if (x < 0) x = gridX - 1;
    if (x >= gridX) x = 0;
    if (y < 0) y = gridY - 1;
    if (y >= gridY) y = 0;
    return current[x][y];
  }

  function neighbors(x, y) {
    let c = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) continue;
        if (val(i, j)) c++;
      }
    }
    return c;
  }

  function step() {
    for (let x = 0; x < gridX; x++) {
      for (let y = 0; y < gridY; y++) {
        const n = neighbors(x, y);
        if (current[x][y]) {
          next[x][y] = !(n < 2 || n > 3);
        } else {
          next[x][y] = n === 3;
        }
      }
    }
    const tmp = current; current = next; next = tmp;
    draw();
  }

  function randomize() {
    for (let x = 0; x < gridX; x++) {
      for (let y = 0; y < gridY; y++) {
        current[x][y] = Math.random() < 0.5;
      }
    }
  }

  function reflow({ keep = true, rand = false } = {}) {
    const old = current;
    const oldX = old.length;
    const oldY = oldX ? old[0].length : 0;
    if (desiredResolution) {
      const { ww, hAvail } = viewportDims();
      const cols = Math.max(MIN_COLS, desiredResolution.cols | 0);
      const rows = Math.max(MIN_ROWS, desiredResolution.rows | 0);
      cellSize = clamp(Math.floor(Math.min(ww / cols, hAvail / rows)), CELL_MIN, CELL_MAX);
      gridX = cols;
      gridY = rows;
      gridContainer.style.height = hAvail + 'px';
    } else {
      computeDims();
    }
    initArrays();
    if (rand || !keep || !oldX) {
      randomize();
    } else {
      const cx = Math.min(oldX, gridX);
      const cy = Math.min(oldY, gridY);
      for (let x = 0; x < cx; x++) {
        for (let y = 0; y < cy; y++) {
          current[x][y] = old[x][y];
        }
      }
    }
    draw();
  }

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
    draw();
  }

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  stepBtn.addEventListener('click', step);
  clearBtn.addEventListener('click', () => {
    for (let x = 0; x < gridX; x++)
      for (let y = 0; y < gridY; y++) current[x][y] = false;
    draw();
  });
  randomBtn.addEventListener('click', () => { randomize(); draw(); });
  timerInput.addEventListener('change', () => {
    const v = parseInt(timerInput.value, 10);
    const newMs = Number.isFinite(v) ? v : 500;
    if (loop) { clearInterval(loop); loop = setInterval(step, newMs); }
  });

  increaseBtn.addEventListener('click', () => {
    desiredResolution = null;
    cellSize = clamp(cellSize - CELL_STEP, CELL_MIN, CELL_MAX);
    const wasRunning = !!loop;
    stop();
    reflow({ keep: false, rand: true });
    if (wasRunning) start();
  });

  decreaseBtn.addEventListener('click', () => {
    desiredResolution = null;
    cellSize = clamp(cellSize + CELL_STEP, CELL_MIN, CELL_MAX);
    const wasRunning = !!loop;
    stop();
    reflow({ keep: false, rand: true });
    if (wasRunning) start();
  });

  function parseResolution(text) {
    if (!text) return null;
    const cleaned = String(text).trim().toLowerCase().replace('×', 'x');
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
    desiredResolution = parsed;
    const wasRunning = !!loop;
    stop();
    reflow({ keep: false, rand: true });
    if (wasRunning) start();
  }

  resolutionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyDesiredResolution(resolutionInput.value);
  });
  resolutionInput.addEventListener('blur', () => {
    if (resolutionInput.value.trim()) applyDesiredResolution(resolutionInput.value);
  });

  let resizeEndTimer = null;
  window.addEventListener('resize', () => {
    const wasRunning = !!loop;
    stop();
    reflow({ keep: true, rand: false });
    if (resizeEndTimer) clearTimeout(resizeEndTimer);
    resizeEndTimer = setTimeout(() => {
      reflow({ keep: false, rand: true });
      if (wasRunning) start();
    }, 200);
  });

  reflow({ keep: false, rand: true });
  stop();
})();