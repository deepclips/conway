// ===== Responsive sizing + Android address-bar safe layout =====

// Visual constants
const BASE_CELL_SIZE = 30;
const MOBILE_BREAKPOINT = 600;

// DOM refs (available once script loads at end of body)
const gridContainer = document.getElementById("gridContainer");
const controlsEl = document.getElementById("controls");

// Dynamic state
let CELL_SIZE = BASE_CELL_SIZE;
let gridX = 0;
let gridY = 0;
let currentGrid = [];
let newGrid = [];

// Get current viewport width/height in a robust way
function vw() {
  return (window.visualViewport && window.visualViewport.width) || window.innerWidth;
}
function vh() {
  return (window.visualViewport && window.visualViewport.height) || window.innerHeight;
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
  else if (x === gridX) adjusted
