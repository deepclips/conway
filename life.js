// ===== Responsive sizing + Android address-bar safe layout =====

// Visual constants
const BASE_CELL_SIZE = 30;
const MOBILE_BREAKPOINT = 600;

// DOM refs (available once script loads at end of body)
const gridContainer = document.getElementById("gridContainer");
const controlsEl = document.getElementById("controls");
const patternSelect = document.getElementById("patternSelect");

// Dynamic state
let CELL_SIZE = BASE_CELL_SIZE;
let gridX = 0;
let gridY = 0;
let currentGrid = [];
let newGrid = [];

// Get current viewport width/height in a robust way
function vw() {
  return (
    (window.visualViewport && window.visualViewport.width) || window.innerWidth
  );
}
function vh() {
  return (
    (window.visualViewport && window.visualViewport.height) ||
    window.innerHeight
  );
}

// Compute cell size and grid dims based on real control height
function computeGridDims() {
  CELL_SIZE = vw() <= MOBILE_BREAKPOINT ? 20 : BASE_CELL_SIZE;
  const controlsHeight = controlsEl ? controlsEl.offsetHeight : 0;
  const availableH = Math.max(0, vh() - controlsHeight);

  gridX = Math.max(1, Math.floor(vw() / CELL_SIZE));
  gridY = Math.max(1, Math.floor(availableH / CELL_SIZE));
}

// Pin the body height to the *visible* viewport to avoid Android cutoff
function pinBodyToVisualViewport() {
  if (window.visualViewport) {
    document.body.style.height = `${vh()}px`;
  } else {
    // Fallback: rely on CSS 100dvh/100vh
    document.body.style.height = "";
  }
}

// Initialize/resize grid arrays
function initGrids() {
  currentGrid = Array.from({ length: gridX }, () => Array(gridY).fill(false));
  newGrid = Array.from({ length: gridX }, () => Array(gridY).fill(false));
}

// ===== Rendering and interaction =====
let animationInterval = null;

function handleCellClick(x, y) {
  if (!animationInterval) {
    // Only allow clicking when animation is stopped
    currentGrid[x][y] = !currentGrid[x][y];
    displayGrid();
  }
}

function displayGrid() {
  let gridHTML =
    '<table border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">';
  for (let y = 0; y < gridY; y++) {
    gridHTML += "<tr>";
    for (let x = 0; x < gridX; x++) {
      const cellStyle = `cursor: ${
        !animationInterval ? "pointer" : "default"
      }; background-color: ${
        currentGrid[x][y] ? "black" : "white"
      }; width: ${CELL_SIZE}px; height: ${CELL_SIZE}px; padding: 0;`;
      gridHTML += `<td data-x="${x}" data-y="${y}" style="${cellStyle}"></td>`;
    }
    gridHTML += "</tr>";
  }
  gridHTML += "</table>";
  gridContainer.innerHTML = gridHTML;

  // Add event listeners for click and touch only when not animating
  if (!animationInterval) {
    const cells = gridContainer.querySelectorAll("td");
    cells.forEach((cell) => {
      cell.addEventListener("click", function () {
        const x = parseInt(cell.getAttribute("data-x"), 10);
        const y = parseInt(cell.getAttribute("data-y"), 10);
        handleCellClick(x, y);
      });
      cell.addEventListener(
        "touchstart",
        function (e) {
          e.preventDefault();
          const x = parseInt(cell.getAttribute("data-x"), 10);
          const y = parseInt(cell.getAttribute("data-y"), 10);
          handleCellClick(x, y);
        },
        { passive: false }
      );
    });
  }
}

const getNumberOfNeighbors = (x, y) => {
  let count = 0;
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (!(i === x && j === y)) {
        if (getValue(i, j)) count++;
      }
    }
  }
  return count;
};

const getValue = (x, y) => {
  let adjustedX = x;
  let adjustedY = y;
  if (x === -1) adjustedX = gridX - 1;
  else if (x === gridX) adjustedX = 0;
  if (y === -1) adjustedY = gridY - 1;
  else if (y === gridY) adjustedY = 0;

  return currentGrid[adjustedX][adjustedY];
};

const process = (oldgrid, newgrid) => {
  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      const neighbors = getNumberOfNeighbors(x, y);
      if (oldgrid[x][y]) {
        newgrid[x][y] = !(neighbors < 2 || neighbors > 3);
      } else {
        newgrid[x][y] = neighbors === 3;
      }
    }
  }
};

// ===== Controls =====
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const stepBtn = document.getElementById("stepBtn");
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");
const timerInput = document.getElementById("timerInput");

let timer = 500; // ms

function step() {
  process(currentGrid, newGrid);
  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      currentGrid[x][y] = newGrid[x][y];
    }
  }
  displayGrid();
}

function startAnimation() {
  if (!animationInterval) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    stepBtn.disabled = true;
    timer = parseInt(timerInput.value, 10) || 500;
    animationInterval = setInterval(step, timer);
  }
}

function stopAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stepBtn.disabled = false;
    displayGrid();
  }
}

timerInput.addEventListener("change", () => {
  timer = parseInt(timerInput.value, 10) || 500;
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = setInterval(step, timer);
  }
});

// ===== Resize / rotation / URL bar collapse handling =====
function reflowAndRedraw({ randomize = false } = {}) {
  // Stop animation if it's running
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
    stopBtn.disabled = true;
    startBtn.disabled = false;
    stepBtn.disabled = false;
  }

  pinBodyToVisualViewport();
  computeGridDims();

  // Rebuild grids to new size
  const prevX = currentGrid.length;
  const prevY = prevX ? currentGrid[0].length : 0;
  const old = currentGrid;

  initGrids();

  // Optionally randomize; otherwise copy overlap region
  if (randomize || !old.length) {
    for (let x = 0; x < gridX; x++) {
      for (let y = 0; y < gridY; y++) {
        currentGrid[x][y] = Math.random() < 0.5;
      }
    }
  } else {
    const copyX = Math.min(prevX, gridX);
    const copyY = Math.min(prevY, gridY);
    for (let x = 0; x < copyX; x++) {
      for (let y = 0; y < copyY; y++) {
        currentGrid[x][y] = old[x][y];
      }
    }
  }

  displayGrid();
}

// Window resize (rotation, split-screen, etc.)
window.addEventListener("resize", () => {
  reflowAndRedraw(); // keep state if possible
});

// Address bar show/hide & keyboard: use visualViewport if available
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    reflowAndRedraw(); // keep state if possible
  });
  window.visualViewport.addEventListener("scroll", () => {
    pinBodyToVisualViewport();
  });
}

// ===== Init =====
(function init() {
  reflowAndRedraw({ randomize: true });

  // Wire buttons
  startBtn.addEventListener("click", startAnimation);
  stopBtn.addEventListener("click", stopAnimation);
  stepBtn.addEventListener("click", step);
  clearBtn &&
    clearBtn.addEventListener("click", () => {
      for (let x = 0; x < gridX; x++)
        for (let y = 0; y < gridY; y++) currentGrid[x][y] = false;
      displayGrid();
    });
  randomBtn &&
    randomBtn.addEventListener("click", () => {
      for (let x = 0; x < gridX; x++)
        for (let y = 0; y < gridY; y++) currentGrid[x][y] = Math.random() < 0.5;
      displayGrid();
    });

  // Initialize paused state
  stopBtn.disabled = true;
  startBtn.disabled = false;
  stepBtn.disabled = false;
})();

// Patterns logic
const PATTERNS = {
  glider: [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  lwss: [
    [1, 0],
    [4, 0],
    [0, 1],
    [0, 2],
    [4, 2],
    [0, 3],
    [1, 3],
    [2, 3],
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
  gosper: [
    [1, 5],
    [2, 5],
    [1, 6],
    [2, 6],
    [13, 3],
    [14, 3],
    [12, 4],
    [16, 4],
    [11, 5],
    [17, 5],
    [11, 6],
    [15, 6],
    [17, 6],
    [18, 6],
    [11, 7],
    [17, 7],
    [12, 8],
    [16, 8],
    [13, 9],
    [14, 9],
    [23, 1],
    [24, 1],
    [22, 2],
    [26, 2],
    [21, 3],
    [27, 3],
    [21, 4],
    [25, 4],
    [27, 4],
    [28, 4],
    [21, 5],
    [27, 5],
    [22, 6],
    [26, 6],
    [23, 7],
    [24, 7],
    [35, 3],
    [36, 3],
    [35, 4],
    [36, 4],
  ],
  rpentomino: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  diehard: [
    [6, 0],
    [0, 1],
    [1, 1],
    [1, 2],
    [5, 2],
    [6, 2],
    [7, 2],
  ],
  acorn: [
    [1, 0],
    [3, 1],
    [0, 2],
    [1, 2],
    [4, 2],
    [5, 2],
    [6, 2],
  ],
};

function placePattern(patternName) {
  if (!PATTERNS[patternName]) return;
  // Center pattern in grid
  const pattern = PATTERNS[patternName];
  const maxX = Math.max(...pattern.map(([x]) => x));
  const maxY = Math.max(...pattern.map(([, y]) => y));
  const offsetX = Math.floor((gridX - maxX - 1) / 2);
  const offsetY = Math.floor((gridY - maxY - 1) / 2);
  // Clear grid
  for (let x = 0; x < gridX; x++)
    for (let y = 0; y < gridY; y++) currentGrid[x][y] = false;
  // Place pattern
  pattern.forEach(([dx, dy]) => {
    const x = offsetX + dx;
    const y = offsetY + dy;
    if (x >= 0 && x < gridX && y >= 0 && y < gridY) {
      currentGrid[x][y] = true;
    }
  });
  displayGrid();
}

patternSelect &&
  patternSelect.addEventListener("change", (e) => {
    if (e.target.value !== "none") {
      placePattern(e.target.value);
      patternSelect.value = "none";
    }
  });
