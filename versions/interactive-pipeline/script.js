const yearSlot = document.querySelector("#year");
if (yearSlot) yearSlot.textContent = new Date().getFullYear();

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = matchMedia("(pointer: coarse)").matches;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function setupPageMotion() {
  const root = document.documentElement;
  const hud = document.querySelector(".system-hud");
  const latency = document.querySelector("[data-latency]");
  const state = document.querySelector("[data-system-state]");
  const traceStage = document.querySelector("[data-trace-stage]");
  const figure = document.querySelector(".figure-block");

  function read() {
    const max = Math.max(1, root.scrollHeight - innerHeight);
    const page = clamp(scrollY / max);
    const figureTop = figure?.getBoundingClientRect().top ?? innerHeight;
    const optimise = clamp((innerHeight * .92 - figureTop) / (innerHeight * .66));
    const seconds = 180 * Math.pow(.68 / 180, optimise);

    root.style.setProperty("--page-progress", page.toFixed(4));
    root.style.setProperty("--meter-y", `${(page * 100).toFixed(2)}%`);
    root.style.setProperty("--optimise", optimise.toFixed(4));
    root.style.setProperty("--trace-width", `${(100 - optimise * 82).toFixed(2)}%`);
    root.style.setProperty("--trace-jitter", `${((1 - optimise) * 11).toFixed(2)}px`);
    root.style.setProperty("--trace-jitter-neg", `${((optimise - 1) * 11).toFixed(2)}px`);
    if (latency) latency.textContent = seconds < 1 ? "680 ms" : `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
    if (state) state.textContent = optimise > .94 ? "ACK / 200" : optimise > .08 ? "Re-routing" : "Queued";
    if (traceStage) {
      const stages = ["Request", "Ingest", "Auth", "Route", "Queue", "Execute", "ACK"];
      traceStage.textContent = stages[Math.min(stages.length - 1, Math.floor(optimise * stages.length))];
    }
    if (hud) hud.style.opacity = `${clamp(1 - scrollY / (innerHeight * .84), 0, 1)}`;
    dispatchEvent(new CustomEvent("systemscroll", { detail: { page, optimise } }));
  }

  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; read(); });
  }, { passive: true });
  addEventListener("resize", read, { passive: true });
  read();

  const targets = document.querySelectorAll(".figure-head, .chart, .figures, .rule-head, .entry, .statement blockquote, .roles li, .stack, .contact > *, .colophon > *");
  targets.forEach((node) => node.classList.add("reveal"));
  if (reducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((node) => node.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -7%", threshold: .08 });
  targets.forEach((node) => observer.observe(node));
}

setupPageMotion();

function buildPipeline(THREE, canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 40);
  camera.position.set(0, 0, 7.2);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarsePointer, powerPreference: "high-performance" });
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const signal = new THREE.Color("#ff3f21");
  const paper = new THREE.Color("#f3efe7");
  const root = new THREE.Group();
  scene.add(root);

  scene.add(new THREE.HemisphereLight("#fff8e9", "#180806", 1.8));
  const key = new THREE.DirectionalLight("#fff1d9", 5.5);
  key.position.set(-2, 4, 7);
  scene.add(key);
  const redLight = new THREE.PointLight(signal, 35, 14, 1.7);
  redLight.position.set(0, 0, -1);
  root.add(redLight);

  const silver = new THREE.MeshStandardMaterial({ color: "#aaa49a", roughness: .18, metalness: .92 });
  const black = new THREE.MeshStandardMaterial({ color: "#151412", roughness: .3, metalness: .82 });
  const hot = new THREE.MeshStandardMaterial({ color: signal, emissive: signal, emissiveIntensity: 2.5, roughness: .18, metalness: .32 });
  const line = new THREE.LineBasicMaterial({ color: paper, transparent: true, opacity: .13 });
  const hotLine = new THREE.LineBasicMaterial({ color: signal, transparent: true, opacity: .55 });

  function labelTexture(text) {
    const label = document.createElement("canvas");
    label.width = 512;
    label.height = 96;
    const context = label.getContext("2d");
    context.clearRect(0, 0, label.width, label.height);
    context.font = "500 34px monospace";
    context.letterSpacing = "5px";
    context.fillStyle = "#ff4a2d";
    context.fillText(text, 12, 58);
    const texture = new THREE.CanvasTexture(label);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(1.82, .34, 1);
    return sprite;
  }

  const stageNames = ["ACK / 200", "EXECUTE", "QUEUE", "ROUTE", "AUTH", "INGEST", "REQUEST"];
  const frames = [];
  const frameMeta = [];
  const barHorizontal = new THREE.BoxGeometry(3.7, .075, .11);
  const barVertical = new THREE.BoxGeometry(.075, 2.35, .11);
  const boltGeometry = new THREE.BoxGeometry(.13, .13, .13);

  for (let index = 0; index < stageNames.length; index += 1) {
    const frame = new THREE.Group();
    const material = index === 0 || index === 3 ? hot : silver;
    const top = new THREE.Mesh(barHorizontal, material);
    const bottom = top.clone();
    top.position.y = 1.18;
    bottom.position.y = -1.18;
    frame.add(top, bottom);

    const left = new THREE.Mesh(barVertical, material);
    const right = left.clone();
    left.position.x = -1.85;
    right.position.x = 1.85;
    frame.add(left, right);

    [[-1.85, -1.18], [-1.85, 1.18], [1.85, -1.18], [1.85, 1.18]].forEach(([x, y], corner) => {
      const bolt = new THREE.Mesh(boltGeometry, corner === index % 4 ? hot : black);
      bolt.position.set(x, y, .1);
      frame.add(bolt);
    });

    const module = new THREE.Mesh(new THREE.BoxGeometry(.68, .25, .22), black);
    module.position.set(1.44, -.89, .14);
    frame.add(module);
    for (let led = 0; led < 3; led += 1) {
      const diode = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .03), led === index % 3 ? hot : silver);
      diode.position.set(1.25 + led * .17, -.89, .27);
      frame.add(diode);
    }

    const stageLabel = labelTexture(`${String(index + 1).padStart(2, "0")}  ${stageNames[index]}`);
    stageLabel.position.set(-1.05, 1.47, .08);
    stageLabel.visible = index < 3;
    frame.add(stageLabel);

    const z = 1.2 - index * 1.62;
    const rx = (index % 2 ? -1 : 1) * (.025 + index * .006);
    const ry = (index % 3 - 1) * .045;
    const rz = (index % 2 ? -1 : 1) * (.035 + index * .009);
    frame.position.z = z;
    frame.rotation.set(rx, ry, rz);
    root.add(frame);
    frames.push(frame);
    frameMeta.push({ z, rx, ry, rz });
  }

  const corners = [[-1.85, -1.18], [-1.85, 1.18], [1.85, -1.18], [1.85, 1.18]];
  corners.forEach(([x, y], index) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, 1.2),
      new THREE.Vector3(x * .98, y * .98, -8.52),
    ]);
    root.add(new THREE.Line(geometry, index === 3 ? hotLine : line));
  });

  const endpoint = new THREE.Mesh(
    new THREE.PlaneGeometry(3.55, 2.2),
    new THREE.MeshBasicMaterial({ color: signal, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  endpoint.position.z = -8.7;
  root.add(endpoint);
  const endpointRing = new THREE.Mesh(new THREE.RingGeometry(.35, .43, 48), new THREE.MeshBasicMaterial({ color: signal, side: THREE.DoubleSide }));
  endpointRing.position.z = -8.62;
  root.add(endpointRing);

  const packetCount = coarsePointer ? 28 : 50;
  const packetGeometry = new THREE.BoxGeometry(.12, .055, .24);
  const packetMaterial = new THREE.MeshStandardMaterial({ color: signal, emissive: signal, emissiveIntensity: 2.8, roughness: .15 });
  const packets = new THREE.InstancedMesh(packetGeometry, packetMaterial, packetCount);
  packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(packets);
  const packetData = Array.from({ length: packetCount }, (_, index) => ({
    phase: (index * .217) % 1,
    laneX: ((index % 7) - 3) * .34,
    laneY: ((index * 3) % 7 - 3) * .22,
    seed: index * 1.917,
  }));
  const dummy = new THREE.Object3D();

  const dustCount = coarsePointer ? 80 : 180;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    dustPositions[index * 3] = (Math.random() - .5) * 5.5;
    dustPositions[index * 3 + 1] = (Math.random() - .5) * 3.8;
    dustPositions[index * 3 + 2] = 2 - Math.random() * 12;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: paper, size: .018, transparent: true, opacity: .35 }));
  root.add(dust);

  let time = reducedMotion ? 3 : 0;
  let manualOptimise = false;
  let paused = reducedMotion;
  let inView = true;
  let optimise = 0;
  let optimiseTarget = 0;
  let pageProgress = 0;
  let pointerX = 0;
  let pointerY = 0;

  addEventListener("systemscroll", (event) => {
    optimiseTarget = manualOptimise ? 1 : event.detail.optimise;
    pageProgress = event.detail.page;
    if (paused) { optimise = optimiseTarget; render(0); }
  });
  if (!coarsePointer && !reducedMotion) {
    addEventListener("pointermove", (event) => {
      pointerX = (event.clientX / innerWidth - .5) * 2;
      pointerY = (event.clientY / innerHeight - .5) * 2;
    }, { passive: true });
  }

  function basePosition() {
    if (innerWidth < 560) return { x: 0, y: -2.5, scale: .72 };
    if (innerWidth < 900) return { x: .9, y: -1.72, scale: .82 };
    return { x: 2.62, y: -.02, scale: .94 };
  }

  function layout() {
    const width = innerWidth || 1;
    const height = innerHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer ? 1.3 : 1.75));
    renderer.setSize(width, height, false);
    const base = basePosition();
    root.position.set(base.x, base.y, 0);
    root.scale.setScalar(base.scale);
  }

  function updatePackets() {
    const speed = .035 + optimise * .25;
    packetData.forEach((packet, index) => {
      const travel = (packet.phase + time * speed) % 1;
      const z = 1.7 - travel * 10.8;
      const chaos = 1 - optimise;
      dummy.position.set(
        packet.laneX * (.68 + travel * .32) + Math.sin(travel * 13 + packet.seed) * .26 * chaos,
        packet.laneY * (.68 + travel * .32) + Math.cos(travel * 11 + packet.seed) * .18 * chaos,
        z,
      );
      const streak = .7 + optimise * 2.2;
      dummy.scale.set(.75, .75, streak);
      dummy.rotation.z = chaos * Math.sin(packet.seed) * .35;
      dummy.updateMatrix();
      packets.setMatrixAt(index, dummy.matrix);
    });
    packets.instanceMatrix.needsUpdate = true;
  }

  function render(delta) {
    time += delta;
    optimise += (optimiseTarget - optimise) * (reducedMotion ? 1 : .065);
    updatePackets();
    frames.forEach((frame, index) => {
      const meta = frameMeta[index];
      frame.rotation.x = meta.rx * (1 - optimise) + pointerY * .012;
      frame.rotation.y = meta.ry * (1 - optimise) + pointerX * .018;
      frame.rotation.z = meta.rz * (1 - optimise) + Math.sin(time * .18 + index) * .006;
      frame.position.z = meta.z + Math.sin(time * .25 + index * .7) * .035 * (1 - optimise);
    });
    dust.position.z = (time * (.06 + optimise * .22)) % 1.62;
    endpointRing.rotation.z += delta * (.2 + optimise * .8);
    endpoint.material.opacity = .055 + (Math.sin(time * 2.6) + 1) * .025;
    redLight.intensity = 28 + optimise * 28 + Math.sin(time * 2.2) * 4;
    root.rotation.y += (pointerX * .025 - root.rotation.y) * .035;
    root.rotation.x += (-pointerY * .018 - root.rotation.x) * .035;
    const base = basePosition();
    root.position.y += (base.y - pageProgress * .35 - root.position.y) * .04;
    renderer.render(scene, camera);
  }

  layout();
  render(0);
  document.documentElement.classList.add("scene-ready");

  let raf = 0;
  let running = false;
  let last = performance.now();
  function loop(now) {
    if (document.hidden || paused) { running = false; return; }
    raf = requestAnimationFrame(loop);
    const delta = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    render(delta);
  }
  function start() {
    if (running || paused || document.hidden || !inView) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    running = false;
  }

  const modeButton = document.querySelector("#scene-mode");
  const pauseButton = document.querySelector("#scene-pause");
  modeButton?.addEventListener("click", () => {
    manualOptimise = !manualOptimise;
    modeButton.setAttribute("aria-pressed", String(manualOptimise));
    modeButton.textContent = manualOptimise ? "Follow scroll" : "Optimise pipeline";
    optimiseTarget = manualOptimise ? 1 : Number(getComputedStyle(document.documentElement).getPropertyValue("--optimise")) || 0;
    if (paused) { optimise = optimiseTarget; render(0); }
  });
  if (pauseButton) {
    pauseButton.setAttribute("aria-pressed", String(paused));
    pauseButton.textContent = paused ? "Resume motion" : "Pause motion";
    pauseButton.addEventListener("click", () => {
      paused = !paused;
      pauseButton.setAttribute("aria-pressed", String(paused));
      pauseButton.textContent = paused ? "Resume motion" : "Pause motion";
      paused ? stop() : start();
    });
  }
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    inView ? start() : stop();
  }).observe(document.querySelector(".lede"));
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  let resizeFrame = 0;
  addEventListener("resize", () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; layout(); render(0); });
  }, { passive: true });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
    document.documentElement.classList.add("no-scene");
    document.querySelectorAll(".scene-controls button").forEach(button => { button.disabled = true; });
  });
  start();
}

async function boot() {
  const canvas = document.querySelector("#world");
  if (!canvas) return;
  try {
    const THREE = await import("./vendor-three.module.min.js");
    buildPipeline(THREE, canvas);
  } catch (error) {
    document.documentElement.classList.add("no-scene");
    document.querySelectorAll(".scene-controls button").forEach(button => { button.disabled = true; });
    console.warn("Interactive pipeline unavailable; using the editorial fallback.", error);
  }
}

boot();
