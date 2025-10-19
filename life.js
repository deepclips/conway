// Calculate grid dimensions based on window size
const BASE_CELL_SIZE = 30;
const MOBILE_BREAKPOINT = 600;
const CONTROLS_HEIGHT = window.innerWidth <= MOBILE_BREAKPOINT ? 180 : 90; // More space for controls on mobile
let CELL_SIZE = window.innerWidth <= MOBILE_BREAKPOINT ? 20 : BASE_CELL_SIZE; // Smaller cells on mobile
let gridX = Math.floor(window.innerWidth / CELL_SIZE);
let gridY = Math.floor((window.innerHeight - CONTROLS_HEIGHT) / CELL_SIZE);
let currentGrid = Array(gridX)
  .fill()
  .map(() => Array(gridY).fill(false));
let newGrid = Array(gridX)
  .fill()
  .map(() => Array(gridY).fill(false));

// Recalculate grid on window resize
window.addEventListener("resize", () => {
  CELL_SIZE = window.innerWidth <= MOBILE_BREAKPOINT ? 20 : BASE_CELL_SIZE;
  const controlsHeight = window.innerWidth <= MOBILE_BREAKPOINT ? 180 : 90;
  gridX = Math.floor(window.innerWidth / CELL_SIZE);
  gridY = Math.floor((window.innerHeight - controlsHeight) / CELL_SIZE);

  currentGrid = Array(gridX)
    .fill()
    .map(() => Array(gridY).fill(false));
  newGrid = Array(gridX)
    .fill()
    .map(() => Array(gridY).fill(false));

  // Reinitialize with random values
  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      currentGrid[x][y] = Math.random() < 0.5;
    }
  }

  // Display the new grid immediately
  displayGrid();
});

// function to display grid in html
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
  const gridContainer = document.getElementById("gridContainer");
  gridContainer.innerHTML = gridHTML;

  // Add event listeners for click and touch
  if (!animationInterval) {
    const cells = gridContainer.querySelectorAll("td");
    cells.forEach((cell) => {
      cell.addEventListener("click", function (e) {
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
        if (getValue(i, j)) {
          count++;
        }
      }
    }
  }
  return count;
};

const getValue = (x, y) => {
  let adjustedX = x;
  let adjustedY = y;
  if (x === -1) {
    adjustedX = gridX - 1;
  } else if (x === gridX) {
    adjustedX = 0;
  }
  if (y === -1) {
    adjustedY = gridY - 1;
  } else if (y === gridY) {
    adjustedY = 0;
  }

  return currentGrid[adjustedX][adjustedY];
};

const process = (oldgrid, newgrid) => {
  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      const neighbors = getNumberOfNeighbors(x, y);
      if (oldgrid[x][y]) {
        if (neighbors < 2 || neighbors > 3) {
          newgrid[x][y] = false;
        } else {
          newgrid[x][y] = true;
        }
      } else {
        if (neighbors === 3) {
          newgrid[x][y] = true;
        } else {
          newgrid[x][y] = false;
        }
      }
    }
  }
};

let animationInterval = null;
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const stepBtn = document.getElementById("stepBtn");
const timerInput = document.getElementById("timerInput");
let timer = 500; // Default timer interval in ms

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

// Update timer interval when input changes
timerInput.addEventListener("change", () => {
  timer = parseInt(timerInput.value, 10) || 500;
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = setInterval(step, timer);
  }
});

// Initialize with random values
for (let x = 0; x < gridX; x++) {
  for (let y = 0; y < gridY; y++) {
    currentGrid[x][y] = Math.random() < 0.5;
  }
} // Initial display
displayGrid();

// Add a clear button and randomize button
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");

function clearGrid() {
  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      currentGrid[x][y] = false;
    }
  }
  displayGrid();
}

function randomizeGrid() {
  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      currentGrid[x][y] = Math.random() < 0.5;
    }
  }
  displayGrid();
}

// Set up button event listeners
startBtn.addEventListener("click", startAnimation);
stopBtn.addEventListener("click", stopAnimation);
stepBtn.addEventListener("click", step);
clearBtn && clearBtn.addEventListener("click", clearGrid);
randomBtn && randomBtn.addEventListener("click", randomizeGrid);

// Initialize in paused state
stopBtn.disabled = true;
startBtn.disabled = false;
stepBtn.disabled = false;
