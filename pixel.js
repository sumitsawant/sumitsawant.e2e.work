const canvas = document.querySelector("[data-signal-canvas]");
const signalVisual = canvas?.closest(".signal-visual");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const GRID_COLUMNS = 40;
const GRID_ROWS = 54;
const ENTER_DURATION = 220;
const EXIT_DURATION = 520;
const SPRING = 0.014;
const DAMPING = 0.86;
const COUPLING = 0.032;

const palettes = {
  overview: {
    background: "#0b190c",
    land: ["#152810", "#254818", "#3d6b28", "#5a8f2e", "#8fbf3a", "#b4d86a"],
    bank: ["#1a2820", "#2a3228", "#3a3428"],
    water: ["#0f3040", "#1e5a68", "#2a7a88", "#4a9aaa", "#7ec4d0", "#b8dce6"],
    foam: ["#b8dce6", "#eef6f8"],
  },
  impact: {
    background: "#0c1a0d",
    land: ["#172b12", "#294c1a", "#426f2b", "#619633", "#95c541", "#bddf70"],
    bank: ["#1c2a21", "#2d352c", "#40382c"],
    water: ["#113242", "#216070", "#31808d", "#56a3af", "#83cad3", "#c0e0e8"],
    foam: ["#c0e0e8", "#f0f8f8"],
  },
  stack: {
    background: "#0b1915",
    land: ["#142820", "#24483a", "#376956", "#508b6b", "#82b477", "#b2d490"],
    bank: ["#192824", "#293531", "#3c3830"],
    water: ["#102f43", "#1d566d", "#2d7588", "#4d95a5", "#7cbec8", "#badde1"],
    foam: ["#badde1", "#eff6f4"],
  },
};

let activePalette = palettes.overview;
let context;
let staticCanvas;
let staticContext;
let dpr = 1;
let cellWidth = 20;
let cellHeight = 20;
let sceneColors = [];
let nodes = [];
let animationFrame = 0;
let lastTime = 0;
let resizeTimer = 0;
let running = false;

const pointer = {
  x: 0,
  y: 0,
  inside: false,
  pressed: false,
  ramp: 0,
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const smoothstep = (value) => value * value * (3 - 2 * value);

const hash = (x, y, seed = 0) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
};

const valueNoise = (x, y, seed = 0) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const top = mix(hash(x0, y0, seed), hash(x0 + 1, y0, seed), tx);
  const bottom = mix(hash(x0, y0 + 1, seed), hash(x0 + 1, y0 + 1, seed), tx);
  return mix(top, bottom, ty);
};

const fbm = (x, y, seed = 0) => {
  let value = 0;
  let amplitude = 0.58;
  let frequency = 1;
  for (let octave = 0; octave < 4; octave += 1) {
    value += valueNoise(x * frequency, y * frequency, seed + octave * 13) * amplitude;
    frequency *= 2;
    amplitude *= 0.48;
  }
  return value / 1.08;
};

const pick = (ramp, amount) => ramp[Math.min(ramp.length - 1, Math.floor(clamp(amount) * ramp.length))];

const parseHex = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
};

const tone = (hex, amount, alpha = 1) => {
  const { r, g, b } = parseHex(hex);
  const channel = (value) => Math.round(clamp(value + amount, 0, 255));
  return `rgba(${channel(r)},${channel(g)},${channel(b)},${alpha})`;
};

const colorForCell = (column, row) => {
  const u = (column + 0.5) / GRID_COLUMNS;
  const v = (row + 0.5) / GRID_ROWS;
  const broad = fbm(column * 0.085, row * 0.075, 3);
  const grouped = fbm(Math.floor(column / 3) * 0.24, Math.floor(row / 2) * 0.2, 18);
  const texture = broad * 0.7 + grouped * 0.3;

  const streamT = clamp((v - 0.48) / 0.52);
  const streamCenter = 0.49 + streamT * 0.22 + Math.sin(v * 11) * 0.016;
  const streamWidth = 0.1 + streamT * 0.52 + (broad - 0.5) * 0.07;
  const inStream = v > 0.47 && Math.abs(u - streamCenter) < streamWidth;

  if (inStream) {
    const wave = clamp(texture * 0.65 + Math.sin(column * 0.43 + row * 0.19) * 0.12 + 0.18);
    const foamCenter = 0.41 + streamT * 0.23;
    const foamWidth = 0.1 + Math.sin(streamT * Math.PI) * 0.24;
    const foamNoise = fbm(column * 0.16, row * 0.29, 44);
    const inFoam = v > 0.575 && v < 0.735 && Math.abs(u - foamCenter) < foamWidth && foamNoise > 0.31;
    return inFoam ? pick(activePalette.foam, foamNoise) : pick(activePalette.water, wave);
  }

  const ridge = 0.15 + Math.sin(u * 8.5) * 0.042 + Math.sin(u * 21) * 0.024;
  const midRidge = 0.33 + Math.sin(u * 6.1 + 1.3) * 0.07 + Math.sin(u * 15) * 0.035;
  let brightness = texture;
  if (v < ridge) brightness *= 0.4;
  else if (v < midRidge) brightness = brightness * 0.6 + 0.18;
  else brightness = brightness * 0.75 + 0.14;

  const clearingA = ((u - 0.4) / 0.37) ** 2 + ((v - 0.29) / 0.16) ** 2;
  const clearingB = ((u - 0.27) / 0.27) ** 2 + ((v - 0.47) / 0.13) ** 2;
  if (clearingA < 1) brightness += (1 - clearingA) * 0.35;
  if (clearingB < 1) brightness += (1 - clearingB) * 0.27;

  const rightMass = u > 0.68 + Math.sin(v * 17) * 0.055;
  const bankDistance = Math.abs(u - streamCenter) - streamWidth;
  if (rightMass) brightness *= 0.38;
  if (v > 0.48 && bankDistance < 0.13) return pick(activePalette.bank, brightness * 1.3);
  return pick(activePalette.land, brightness);
};

const buildScene = () => {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.max(320, Math.round(canvas.clientWidth * dpr));
  canvas.height = Math.max(420, Math.round(canvas.clientHeight * dpr));
  context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  staticCanvas ||= document.createElement("canvas");
  staticCanvas.width = canvas.width;
  staticCanvas.height = canvas.height;
  staticContext = staticCanvas.getContext("2d", { alpha: false });
  staticContext.imageSmoothingEnabled = true;
  cellWidth = canvas.width / GRID_COLUMNS;
  cellHeight = canvas.height / GRID_ROWS;

  sceneColors = [];
  nodes = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      sceneColors.push(colorForCell(column, row));
      nodes.push({ x: 0, y: 0, vx: 0, vy: 0 });
    }
  }

  pointer.x = canvas.width * 0.5;
  pointer.y = canvas.height * 0.38;
  drawScene(staticContext);
  context.drawImage(staticCanvas, 0, 0);
};

const drawThread = (target, startX, startY, endX, endY, controlX, controlY, color, width) => {
  target.beginPath();
  target.moveTo(startX, startY);
  target.quadraticCurveTo(controlX, controlY, endX, endY);
  target.strokeStyle = tone(color, -28, 0.78);
  target.lineWidth = width * 1.65;
  target.stroke();

  target.beginPath();
  target.moveTo(startX, startY - width * 0.16);
  target.quadraticCurveTo(controlX, controlY - width * 0.16, endX, endY - width * 0.16);
  target.strokeStyle = color;
  target.lineWidth = width;
  target.stroke();

  target.beginPath();
  target.moveTo(startX, startY - width * 0.34);
  target.quadraticCurveTo(controlX, controlY - width * 0.34, endX, endY - width * 0.34);
  target.strokeStyle = tone(color, 34, 0.34);
  target.lineWidth = Math.max(0.45, width * 0.24);
  target.stroke();
};

const drawCell = (target, column, row, index) => {
  const x = column * cellWidth;
  const y = row * cellHeight;
  const gutter = Math.max(0.8, Math.min(cellWidth, cellHeight) * 0.055);
  const width = cellWidth - gutter;
  const height = cellHeight - gutter;
  const color = sceneColors[index];
  const node = nodes[index];
  const pattern = hash(column, row, 81);
  const threadCount = pattern > 0.82 ? 8 : 7;
  const threadWidth = Math.max(0.75, Math.min(cellWidth, cellHeight) * 0.055);

  target.fillStyle = tone(color, -24, 1);
  target.fillRect(x + gutter * 0.5, y + gutter * 0.5, width, height);
  target.save();
  target.beginPath();
  target.rect(x + gutter * 0.5, y + gutter * 0.5, width, height);
  target.clip();
  target.lineCap = "round";

  for (let thread = 0; thread < threadCount; thread += 1) {
    const progress = (thread + 0.5) / threadCount;
    const jitter = (hash(column, row, thread + 100) - 0.5) * height * 0.07;
    let startX = x + gutter;
    let endX = x + cellWidth - gutter;
    let startY = y + progress * height + jitter;
    let endY = startY;

    if (pattern < 0.48) endY += height * 0.2;
    else if (pattern < 0.76) endY -= height * 0.2;
    else {
      startX = x + progress * width;
      endX = startX + width * 0.08;
      startY = y + gutter;
      endY = y + cellHeight - gutter;
    }

    const controlX = (startX + endX) * 0.5 + node.x;
    const controlY = (startY + endY) * 0.5 + node.y;
    drawThread(target, startX, startY, endX, endY, controlX, controlY, color, threadWidth);
  }

  if (hash(column, row, 190) > 0.52) {
    const fiberY = y + height * hash(column, row, 191);
    target.beginPath();
    target.moveTo(x + gutter, fiberY);
    target.lineTo(x + width * (0.35 + hash(column, row, 192) * 0.55), fiberY + node.y * 0.35);
    target.strokeStyle = tone(color, 48, 0.36);
    target.lineWidth = Math.max(0.4, threadWidth * 0.22);
    target.stroke();
  }
  target.restore();
};

const drawScene = (target = context) => {
  if (!target) return;
  target.fillStyle = activePalette.background;
  target.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      drawCell(target, column, row, row * GRID_COLUMNS + column);
    }
  }
};

const drawActiveScene = () => {
  context.drawImage(staticCanvas, 0, 0);
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const index = row * GRID_COLUMNS + column;
      const node = nodes[index];
      if (Math.abs(node.x) + Math.abs(node.y) < 0.018) continue;
      drawCell(context, column, row, index);
    }
  }
};

const updatePhysics = (delta) => {
  const frameScale = clamp(delta / 16.67, 0.35, 2.2);
  const targetRamp = pointer.inside ? 1 : 0;
  const duration = pointer.inside ? ENTER_DURATION : EXIT_DURATION;
  pointer.ramp += (targetRamp - pointer.ramp) * clamp((delta / duration) * 2.4, 0, 1);
  const easedRamp = smoothstep(clamp(pointer.ramp));
  const radius = Math.min(cellWidth, cellHeight) * (pointer.pressed ? 7 : 5.4);
  const forceScale = (pointer.pressed ? 1.9 : 0.55) * easedRamp;
  let energy = Math.abs(targetRamp - pointer.ramp);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const index = row * GRID_COLUMNS + column;
      const node = nodes[index];
      const centerX = (column + 0.5) * cellWidth;
      const centerY = (row + 0.5) * cellHeight;
      const dx = centerX - pointer.x;
      const dy = centerY - pointer.y;
      const distance = Math.hypot(dx, dy);
      const influence = distance < radius ? (1 - distance / radius) ** 2 : 0;
      const directionX = distance > 0.001 ? dx / distance : 0;
      const directionY = distance > 0.001 ? dy / distance : 0;
      const displacement = Math.min(cellWidth, cellHeight) * 3.7 * forceScale * influence;
      let targetX = directionX * displacement;
      let targetY = directionY * displacement;

      let neighborX = 0;
      let neighborY = 0;
      let neighborCount = 0;
      if (column > 0) { neighborX += nodes[index - 1].x; neighborY += nodes[index - 1].y; neighborCount += 1; }
      if (column < GRID_COLUMNS - 1) { neighborX += nodes[index + 1].x; neighborY += nodes[index + 1].y; neighborCount += 1; }
      if (row > 0) { neighborX += nodes[index - GRID_COLUMNS].x; neighborY += nodes[index - GRID_COLUMNS].y; neighborCount += 1; }
      if (row < GRID_ROWS - 1) { neighborX += nodes[index + GRID_COLUMNS].x; neighborY += nodes[index + GRID_COLUMNS].y; neighborCount += 1; }
      if (neighborCount) {
        neighborX /= neighborCount;
        neighborY /= neighborCount;
        targetX += neighborX * COUPLING;
        targetY += neighborY * COUPLING;
      }

      node.vx = (node.vx + (targetX - node.x) * SPRING * frameScale) * DAMPING;
      node.vy = (node.vy + (targetY - node.y) * SPRING * frameScale) * DAMPING;
      node.x += node.vx * frameScale;
      node.y += node.vy * frameScale;
      energy += Math.abs(node.vx) + Math.abs(node.vy) + Math.abs(targetX - node.x) * 0.002;
    }
  }
  return energy;
};

const animate = (time) => {
  const delta = lastTime ? time - lastTime : 16.67;
  lastTime = time;
  const energy = updatePhysics(delta);
  drawActiveScene();

  if (energy > 0.035 || Math.abs((pointer.inside ? 1 : 0) - pointer.ramp) > 0.002) {
    animationFrame = requestAnimationFrame(animate);
  } else {
    running = false;
    animationFrame = 0;
    lastTime = 0;
  }
};

const startAnimation = () => {
  if (reduceMotion || running) return;
  running = true;
  lastTime = 0;
  animationFrame = requestAnimationFrame(animate);
};

const updatePointer = (event) => {
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - bounds.left) * (canvas.width / bounds.width);
  pointer.y = (event.clientY - bounds.top) * (canvas.height / bounds.height);
  pointer.inside = true;
  startAnimation();
};

signalVisual?.addEventListener("pointerenter", updatePointer, { passive: true });
signalVisual?.addEventListener("pointermove", updatePointer, { passive: true });
signalVisual?.addEventListener("pointerdown", (event) => {
  pointer.pressed = true;
  signalVisual.setPointerCapture?.(event.pointerId);
  updatePointer(event);
});
signalVisual?.addEventListener("pointerup", (event) => {
  pointer.pressed = false;
  signalVisual.releasePointerCapture?.(event.pointerId);
  startAnimation();
});
signalVisual?.addEventListener("pointercancel", () => {
  pointer.pressed = false;
  pointer.inside = false;
  startAnimation();
});
signalVisual?.addEventListener("pointerleave", () => {
  pointer.pressed = false;
  pointer.inside = false;
  startAnimation();
});

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(buildScene, 120);
}, { passive: true });
window.addEventListener("pagehide", () => cancelAnimationFrame(animationFrame));

buildScene();

const tabs = [...document.querySelectorAll("[role='tab']")];
const panels = [...document.querySelectorAll("[role='tabpanel']")];

const selectTab = (nextTab, moveFocus = false) => {
  tabs.forEach((tab) => {
    const selected = tab === nextTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  panels.forEach((panel) => {
    const selected = panel.id === nextTab.dataset.tab;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });

  activePalette = palettes[nextTab.dataset.tab] || palettes.overview;
  buildScene();
  if (moveFocus) nextTab.focus();
};

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    selectTab(tabs[nextIndex], true);
  });
});
