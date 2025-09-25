// ----- config -----
const COLS = 30;
const ROWS = 20;
const CELL = 24;
const WALL_RATE_DEFAULT = 0.20;

// DOM
const canvas   = document.getElementById("grid");
const ctx      = canvas.getContext("2d");
const btnClear = document.getElementById("clear");
const btnRand  = document.getElementById("random");
const btnPlan  = document.getElementById("plan");
const btnDrive = document.getElementById("drive");
const speedEl  = document.getElementById("speed");
const densityEl= document.getElementById("density");
const stepsEl  = document.getElementById("steps");
const turnsEl  = document.getElementById("turns");
const fuelEl   = document.getElementById("fuel");
const timeEl   = document.getElementById("time");
const btnMow  = document.getElementById("mow");      
const covEl   = document.getElementById("coverage"); 

// state
let grid = [];
let start = { c: 1, r: 1 };
let goal  = { c: COLS - 2, r: ROWS - 2 };
let path  = [];
let tractor = { ...start, dir: "E" };
let driving = false;
let editMode = "rocks"; // "rocks" | "start" | "goal"
let driveTimer = null;

function index(c, r) { return r * COLS + c; }

// init/utility
function resetGrid() {
  grid = new Array(COLS * ROWS).fill(0);
  // fence border
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r===0 || c===0 || r===ROWS-1 || c===COLS-1) grid[index(c,r)] = 1;
    }
  }
  path = [];
  tractor = { ...start, dir: "E" };
  driving = false;
  updateStats(0,0,0,0);
  draw();
}
function randomRocks(rate) {
  resetGrid();
  for (let r = 1; r < ROWS-1; r++) {
    for (let c = 1; c < COLS-1; c++) {
      if ((c===start.c && r===start.r) || (c===goal.c && r===goal.r)) continue;
      grid[index(c,r)] = Math.random() < rate ? 1 : 0;
    }
  }
  draw();
}

canvas.addEventListener("mousedown", (e) => {
  const { c, r } = mouseToCell(e);

  // keep borders fenced
  const isBorder = (r === 0 || c === 0 || r === ROWS-1 || c === COLS-1);
  if (isBorder) return;

  if (editMode === "start") {
    if (grid[index(c,r)] === 1 || (c === goal.c && r === goal.r)) return;
    start = { c, r };
    tractor = { ...start, dir: "E" };
    path = [];
  } else if (editMode === "goal") {
    if (grid[index(c,r)] === 1 || (c === start.c && r === start.r)) return;
    goal = { c, r };
    path = [];
  } else {
    if ((c === start.c && r === start.r) || (c === goal.c && r === goal.r)) return;
    grid[index(c,r)] = grid[index(c,r)] ? 0 : 1;
    path = [];
  }
  draw();
});

// buttons
btnClear.onclick = () => resetGrid();
btnRand.onclick  = () => {
  const percent = parseFloat(densityEl.value);        // 0..100
  const rate = Math.max(0, Math.min(1, percent / 100)); // clamp -> 0..1
  randomRocks(rate);
  showStatus(`Rocks randomized to ${percent}%`);
};

btnPlan.onclick  = () => {
  path = aStar(start, goal);
  if (!path.length) {
    showStatus("no path found — try moving rocks/start/goal");
  } else {
    showStatus("path planned");
  }
  draw();
};

btnDrive.onclick = () => {
  if (driving) return;               // already moving
  // Auto-plan if needed
  if (!path.length) {
    path = aStar(start, goal);
    if (!path.length) {
      showStatus("no path to drive — adjust field and try Plan Path");
      return;
    }
  }
  // Start and goal are same cell
  if (start.c === goal.c && start.r === goal.r) {
    showStatus("already at goal — move the goal or start");
    return;
  }
  showStatus("driving…");
  drivePath();
};

btnMow.onclick = () => {
  path = planCoveragePath();
  if (!path.length) {
    showStatus("mow plan failed — field may be fully blocked");
  } else {
    showStatus(`mow plan ready: ${path.length} steps`);
    // For fun, set goal to last cell in coverage path
    const last = path[path.length - 1];
    goal = { c: last.c, r: last.r };
  }
  draw();
};

// edit mode radios
document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', (e) => { editMode = e.target.value; });
});

// 1) normal change listeners
const modeRadios = document.querySelectorAll('input[name="mode"]');
modeRadios.forEach(r =>
  r.addEventListener('change', (e) => {
    editMode = e.target.value;
    showStatus(`Mode: ${editMode}`);
  })
);

// 2) fallback: delegate clicks on the whole segmented control
const seg = document.querySelector('.segmented');
if (seg) {
  seg.addEventListener('click', (e) => {
    const label = e.target.closest('label');
    if (!label) return;
    const input = label.querySelector('input[name="mode"]');
    if (!input) return;
    if (!input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // even if already checked, reflect mode in status
      editMode = input.value;
      showStatus(`Mode: ${editMode}`);
    }
  });
}

// draw
function draw() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = grid[index(c,r)] ? "#475569" : "#111827";
      ctx.fillRect(c*CELL, r*CELL, CELL-1, CELL-1);
    }
  }
  // path
  for (const cell of path) {
    ctx.fillStyle = "#facc15";
    ctx.fillRect(cell.c*CELL+4, cell.r*CELL+4, CELL-8, CELL-8);
  }
  // start/goal/tractor
  fillCell(start, "#22c55e");
  fillCell(goal,  "#38bdf8");
  fillCell(tractor,"#e879f9");
}
function fillCell({c,r}, color){
  ctx.fillStyle = color;
  ctx.fillRect(c*CELL+3, r*CELL+3, CELL-6, CELL-6);
}

function applyDensityFromSlider() {
  if (driving) { showStatus("Can't change rocks while driving"); return; }
  const percent = parseFloat(densityEl.value);
  const rate = Math.max(0, Math.min(1, percent / 100));
  randomRocks(rate);
  showStatus(`Rocks randomized to ${percent}%`);
}

function mouseToCell(e) {
  // Use client size (excludes borders) to compute scale
  const scaleX = canvas.width  / canvas.clientWidth;
  const scaleY = canvas.height / canvas.clientHeight;

  // offsetX/offsetY are relative to the canvas content box
  const x = e.offsetX * scaleX;
  const y = e.offsetY * scaleY;

  return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) };
}

// live update while dragging and on release
densityEl.addEventListener('input', applyDensityFromSlider);
densityEl.addEventListener('change', applyDensityFromSlider);

// ----- A* -----
function aStar(s, g) {
  const open = new Map();
  const closed = new Set();
  const startNode = { c:s.c, r:s.r, g:0, h:manhattan(s,g), f:0, parent:null };
  startNode.f = startNode.g + startNode.h;
  open.set(key(s.c,s.r), startNode);

  while (open.size) {
    let bestK=null, bestN=null;
    for (const [k,n] of open) { if (!bestN || n.f < bestN.f) { bestN=n; bestK=k; } }
    open.delete(bestK);

    if (bestN.c===g.c && bestN.r===g.r) {
      const rev=[]; let cur=bestN;
      while (cur){ rev.push({c:cur.c,r:cur.r}); cur=cur.parent; }
      rev.reverse();
      return rev.slice(1);
    }

    closed.add(bestK);
    for (const nb of neighbors(bestN.c,bestN.r)) {
      const k = key(nb.c,nb.r);
      if (closed.has(k) || grid[index(nb.c,nb.r)]===1) continue;
      const gCost = bestN.g + 1;
      const exist = open.get(k);
      if (!exist || gCost < exist.g) {
        const h = manhattan(nb,g);
        open.set(k, { ...nb, g: gCost, h, f: gCost + h, parent: bestN });
      }
    }
  }
  return [];
}
function neighbors(c,r){
  const out=[];
  if (r>0) out.push({c,r:r-1});
  if (r<ROWS-1) out.push({c,r:r+1});
  if (c>0) out.push({c:c-1,r});
  if (c<COLS-1) out.push({c:c+1,r});
  return out;
}
function manhattan(a,b){ return Math.abs(a.c-b.c)+Math.abs(a.r-b.r); }
function key(c,r){ return `${c},${r}`; }

// Return all free (non-rock, non-border) cells in snake (row-by-row) order
function snakeOrderCells() {
  const cells = [];
  for (let r = 1; r < ROWS-1; r++) {
    const cols = [];
    for (let c = 1; c < COLS-1; c++) {
      if (grid[index(c,r)] === 0) cols.push({c,r});
    }
    // snake: left->right on even rows, right->left on odd rows (relative)
    if ((r % 2) === 0) cols.reverse();
    cells.push(...cols);
  }
  return cells;
}

// Build a coverage path: visit every reachable free cell once.
// We chain A* paths between successive targets in snake order and skip
// any unreachable segments (e.g., isolated by rocks).
function planCoveragePath() {
  const all = snakeOrderCells();
  if (!all.length) return [];

  // Start from the tractor’s current cell
  let cur = { c: tractor.c, r: tractor.r };
  const visitedKey = (p) => `${p.c},${p.r}`;
  const seen = new Set([visitedKey(cur)]);
  const out = [];

  // Make a quick lookup of free cells
  const free = new Set(all.map(visitedKey));

  // Choose next target = next unvisited free cell in snake order
  for (const target of all) {
    if (seen.has(visitedKey(target))) continue;

    // A* from cur -> target; append if found
    const leg = aStar(cur, target);
    if (leg.length) {
      out.push(...leg);           // leg already excludes the starting cell
      cur = target;
      seen.add(visitedKey(target));
    } else {
      // unreachable chunk; skip
      continue;
    }
  }
  return out;
}

// ----- drive + metrics -----
function drivePath(){
  showStatus("driving…");
  setDrivingUI(true);
  driving = true;

  let i = 0, steps = 0, turns = 0;
  let prevDir = tractor.dir;

  const stepOnce = () => {
    if (!driving || i >= path.length) {
      if (driveTimer) { clearTimeout(driveTimer); driveTimer = null; }
      driving = false;
      setDrivingUI(false);
      const speedNow = Number(speedEl.value);
      const tickMs = Math.max(20, 200 - speedNow*15);
      const simTimeSec = Math.round((steps * tickMs) / 100) / 10;
      const fuel = steps + turns * 5;
      updateStats(steps, turns, fuel, simTimeSec);
      showStatus("done ✅");
      return;
    }

    const next = path[i];
    const dir = direction(tractor, next);
    if (dir !== prevDir) { turns++; prevDir = dir; }
    tractor = { ...next, dir };
    steps++; i++;
    draw();

    // Recompute delay from the *current* slider value for live speed changes
    const speedNow = Number(speedEl.value);
    const tickMs = Math.max(20, 200 - speedNow*15);
    driveTimer = setTimeout(stepOnce, tickMs);
  };

  stepOnce();
}

function direction(a,b){
  if (b.r < a.r) return "N";
  if (b.r > a.r) return "S";
  if (b.c < a.c) return "W";
  return "E";
}
function updateStats(steps, turns, fuel, t){
  stepsEl.textContent = `steps: ${steps}`;
  turnsEl.textContent = `turns: ${turns}`;
  fuelEl.textContent  = `fuel (rough): ${fuel}`;
  timeEl.textContent  = `time (sim): ${t}s`;

  // coverage = visited unique free cells / total free cells
  // Approximate: steps + 1 unique cells visited (including start)
  const totalFree = countFreeCells();
  const visited   = Math.min(totalFree, steps + 1); // cap
  const pct = totalFree ? Math.round((visited / totalFree) * 100) : 0;
  covEl.textContent = `coverage: ${pct}%`;
}
function countFreeCells(){
  let n=0;
  for (let r=1; r<ROWS-1; r++)
    for (let c=1; c<COLS-1; c++)
      if (grid[index(c,r)] === 0) n++;
  return n;
}

function showStatus(msg){
  timeEl.textContent = msg; // reuse the time field as a tiny status line
}

const statusEl = document.getElementById("status");
function showStatus(msg){ statusEl.textContent = msg; }
function setDrivingUI(isDriving){
  document.getElementById("drive").disabled = isDriving;
  document.getElementById("plan").disabled  = isDriving;
  document.getElementById("mow").disabled   = isDriving;
}

const btnStop = document.getElementById("stop");
btnStop.onclick = () => {
  if (driveTimer) {
    clearInterval(driveTimer);
    driveTimer = null;
    driving = false;
    setDrivingUI(false);
    showStatus("stopped ⏹️");
  }
};

btnStop.onclick = () => {
  if (driveTimer) {
    clearTimeout(driveTimer); // was clearInterval(...)
    driveTimer = null;
  }
  driving = false;
  setDrivingUI(false);
  showStatus("stopped ⏹️");
};

speedEl.addEventListener('input', () => {
  showStatus(`Speed: ${speedEl.value}`);
});

densityEl.addEventListener('input', () => {
  showStatus(`Obstacle density: ${densityEl.value}% — click “Random Rocks” to apply`);
});

// boot
resetGrid();
randomRocks(WALL_RATE_DEFAULT);
draw();