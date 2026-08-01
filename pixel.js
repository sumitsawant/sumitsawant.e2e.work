const canvas = document.querySelector("[data-signal-canvas]");
const frameReadout = document.querySelector("[data-frame-readout]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const palettes = {
  overview: ["#071d12", "#0f3520", "#1e5835", "#4b873f", "#91c945", "#c6ed66", "#b9e8dd", "#4ea7b5", "#15546c"],
  impact: ["#081f18", "#123a29", "#286141", "#58933f", "#c3e85d", "#f1f7c4", "#8dd6d0", "#297c91", "#153f50"],
  stack: ["#0b1e20", "#13383b", "#1c5b57", "#388b72", "#a3cf63", "#e3efba", "#88ced2", "#2b7188", "#163b54"],
};

let activePalette = palettes.overview;
let animationFrame;
let frame = 0;
let lastPaint = 0;

const hash = (x, y, seed = 0) => {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 19.19) * 43758.5453;
  return value - Math.floor(value);
};

const drawSignal = (time = 0) => {
  if (!canvas) return;
  const context = canvas.getContext("2d", { alpha: false });
  const cell = 5;
  const width = Math.max(80, Math.ceil(canvas.clientWidth / cell));
  const height = Math.max(80, Math.ceil(canvas.clientHeight / cell));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
  }

  const drift = reduceMotion ? 0 : time * 0.00016;
  const waterline = height * 0.59;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const ridgeA = height * 0.19 + Math.sin(x * 0.055 + drift) * 12 + Math.sin(x * 0.017) * 19;
      const ridgeB = height * 0.35 + Math.sin(x * 0.075 - drift * 1.5) * 18 + Math.sin(x * 0.025 + 2.3) * 26;
      const ridgeC = height * 0.5 + Math.sin(x * 0.045 + 1.2) * 21;
      const noise = hash(Math.floor(x / 4), Math.floor(y / 3), Math.floor(drift * 6));
      let colorIndex;

      if (y < ridgeA) colorIndex = noise > 0.7 ? 2 : noise > 0.38 ? 1 : 0;
      else if (y < ridgeB) colorIndex = noise > 0.75 ? 5 : noise > 0.42 ? 4 : 3;
      else if (y < ridgeC) colorIndex = noise > 0.66 ? 4 : noise > 0.28 ? 3 : 2;
      else if (y < waterline) colorIndex = noise > 0.78 ? 5 : noise > 0.43 ? 4 : 2;
      else {
        const wave = Math.sin(x * 0.16 + y * 0.08 + drift * 5);
        colorIndex = wave + noise > 1.18 ? 6 : wave + noise > 0.5 ? 7 : 8;
      }

      context.fillStyle = activePalette[colorIndex];
      const blockWidth = noise > 0.86 ? 8 : noise > 0.55 ? 4 : 2;
      context.fillRect(x, y, blockWidth, 2);
    }
  }

  // Floating telemetry bars create the broken raster texture without copying the source artwork.
  for (let i = 0; i < 26; i += 1) {
    const bandY = Math.floor(hash(i, 4) * height);
    const bandX = Math.floor((hash(i, 9) * width + drift * 28 * (i % 3 ? 1 : -1) + width) % width);
    const bandWidth = 5 + Math.floor(hash(i, 12) * 26);
    context.fillStyle = i % 4 === 0 ? "rgba(229,255,211,.62)" : "rgba(6,29,20,.48)";
    context.fillRect(bandX, bandY, bandWidth, 1);
    if (i % 3 === 0) context.clearRect(bandX + 2, bandY, 1, 1);
  }

  frame += 1;
  if (frameReadout && frame % 4 === 0) frameReadout.textContent = `FRAME ${String(frame).padStart(4, "0")}`;
};

const animate = (time) => {
  if (time - lastPaint > 90) {
    drawSignal(time);
    lastPaint = time;
  }
  animationFrame = requestAnimationFrame(animate);
};

if (reduceMotion) drawSignal(0);
else animationFrame = requestAnimationFrame(animate);

window.addEventListener("resize", () => drawSignal(performance.now()), { passive: true });
window.addEventListener("pagehide", () => cancelAnimationFrame(animationFrame));

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
  drawSignal(performance.now());
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
