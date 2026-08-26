document.documentElement.classList.add("js-ready");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
let pageScroll = window.scrollY;

const loader = document.querySelector(".loader");
const loadStartedAt = performance.now();
let loaderDismissed = false;
let hasSeenLoader = false;

try {
  hasSeenLoader = sessionStorage.getItem("ss-e2e-loaded") === "1";
} catch {
  hasSeenLoader = false;
}

function decodeText(element, delay = 0) {
  if (!element || reducedMotion) return;
  const finalText = element.textContent;
  const glyphs = "01/<>[]{}+=-*";
  const duration = 540;
  const start = performance.now() + delay;
  element.setAttribute("aria-label", element.getAttribute("aria-label") || finalText);

  function frame(now) {
    if (now < start) {
      requestAnimationFrame(frame);
      return;
    }
    const progress = Math.min((now - start) / duration, 1);
    const revealCount = Math.floor(progress * finalText.length);
    element.textContent = [...finalText].map((character, index) => {
      if (character === " " || index < revealCount) return character;
      return glyphs[(index * 7 + Math.floor(now / 44)) % glyphs.length];
    }).join("");
    if (progress < 1) requestAnimationFrame(frame);
    else element.textContent = finalText;
  }

  requestAnimationFrame(frame);
}

function dismissLoader() {
  if (loaderDismissed) return;
  loaderDismissed = true;
  document.body.classList.add("is-loaded");
  loader?.classList.add("is-done");
  document.querySelectorAll("[data-decode]").forEach((element, index) => decodeText(element, index * 90));
  window.setTimeout(() => {
    if (loader) loader.hidden = true;
  }, reducedMotion ? 0 : 1000);
  try {
    sessionStorage.setItem("ss-e2e-loaded", "1");
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }
}

function markWorldReady() {
  if (hasSeenLoader || reducedMotion) {
    requestAnimationFrame(dismissLoader);
    return;
  }
  const remaining = Math.max(0, 520 - (performance.now() - loadStartedAt));
  window.setTimeout(dismissLoader, remaining);
}

window.setTimeout(dismissLoader, hasSeenLoader || reducedMotion ? 0 : 900);

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) element.classList.add("is-visible");
    else revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const header = document.querySelector(".site-header");
const progress = document.querySelector(".scroll-progress span");
const titleLines = document.querySelectorAll("[data-shift]");
let scrollFrame = 0;

function updatePageMotion() {
  scrollFrame = 0;
  header?.classList.toggle("is-scrolled", pageScroll > 40);
  const available = document.documentElement.scrollHeight - innerHeight;
  if (progress) progress.style.width = `${available > 0 ? (pageScroll / available) * 100 : 0}%`;
  if (!reducedMotion) {
    titleLines.forEach((line) => {
      line.style.transform = `translate3d(${pageScroll * Number(line.dataset.shift)}px,0,0)`;
    });
  }
}

window.addEventListener("scroll", () => {
  pageScroll = window.scrollY;
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updatePageMotion);
}, { passive: true });
updatePageMotion();

const sceneReadout = document.querySelector("[data-scene-readout]");
const sceneModeButtons = [...document.querySelectorAll("[data-scene-mode]")];
const sceneStateLabel = document.querySelector(".scene-console__live");
const modeReadouts = {
  topology: "42 nodes · mapped",
  traffic: "6 routes · flowing",
  signal: "Signal field · reactive",
};
let activeMode = "topology";
let worldModeSetter = () => {};

function setRenderState(label, hasSignal = true) {
  if (!sceneStateLabel) return;
  sceneStateLabel.replaceChildren();
  if (hasSignal) sceneStateLabel.append(document.createElement("i"));
  sceneStateLabel.append(document.createTextNode(hasSignal ? ` ${label}` : label));
}

function setSceneMode(mode) {
  if (!(mode in modeReadouts)) return;
  activeMode = mode;
  document.documentElement.dataset.activeSceneMode = mode;
  sceneModeButtons.forEach((button) => {
    const selected = button.dataset.sceneMode === mode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (sceneReadout) sceneReadout.textContent = modeReadouts[mode];
  worldModeSetter(mode);
}

sceneModeButtons.forEach((button) => {
  button.addEventListener("click", () => setSceneMode(button.dataset.sceneMode));
});

const cursor = document.querySelector(".cursor");
if (cursor && !coarsePointer && !reducedMotion) {
  let cursorX = -100;
  let cursorY = -100;
  let cursorFrame = 0;
  window.addEventListener("pointermove", (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    cursor.classList.add("has-moved");
    if (!cursorFrame) {
      cursorFrame = requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${cursorX}px,${cursorY}px,0) translate(-50%,-50%)`;
        cursorFrame = 0;
      });
    }
  }, { passive: true });
  document.querySelectorAll("a,button,.work-card,.stack__cloud span").forEach((element) => {
    element.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    element.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });
}

if (!coarsePointer) {
  document.querySelectorAll(".work-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
    }, { passive: true });
  });

  document.querySelectorAll(".email").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--cta-x", `${event.clientX - rect.left}px`);
      element.style.setProperty("--cta-y", `${event.clientY - rect.top}px`);
    }, { passive: true });
  });
}

if (!coarsePointer && !reducedMotion) {
  document.querySelectorAll(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.14;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.14;
      element.style.transform = `translate3d(${x}px,${y}px,0)`;
    }, { passive: true });
    element.addEventListener("pointerleave", () => {
      element.style.transform = "";
    });
  });

  const nav = document.querySelector(".site-header nav");
  const navLinks = nav ? [...nav.querySelectorAll("a")] : [];
  const resetNav = () => navLinks.forEach((link) => {
    link.style.setProperty("--nav-scale", "1");
    link.style.setProperty("--nav-lift", "0px");
  });
  nav?.addEventListener("pointermove", (event) => {
    if (innerWidth <= 900) {
      resetNav();
      return;
    }
    navLinks.filter((link) => link.offsetParent !== null).forEach((link) => {
      const rect = link.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
      const proximity = Math.max(0, 1 - distance / 120);
      link.style.setProperty("--nav-scale", String(1 + proximity * 0.1));
      link.style.setProperty("--nav-lift", `${-proximity * 3}px`);
    });
  }, { passive: true });
  nav?.addEventListener("pointerleave", resetNav);
  navLinks.forEach((link, index) => {
    link.addEventListener("focus", () => {
      resetNav();
      link.style.setProperty("--nav-scale", "1.07");
      [navLinks[index - 1], navLinks[index + 1]].filter(Boolean).forEach((neighbor) => {
        neighbor.style.setProperty("--nav-scale", "1.025");
      });
    });
    link.addEventListener("blur", resetNav);
  });
}

document.querySelector("#year").textContent = new Date().getFullYear();

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const CORE_VERTEX = `
  uniform float uTime;
  uniform float uEnergy;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  varying vec3 vWorldNormal;
  varying float vField;

  void main() {
    vec3 p = position;
    float field =
      sin(dot(p, vec3(2.1, 1.3, 1.7)) + uTime * 0.44) +
      0.55 * sin(dot(p, vec3(-1.2, 3.0, 2.2)) - uTime * 0.31) +
      0.28 * sin((p.x + p.y - p.z) * 5.2 + uTime * 0.18);
    vec3 displaced = p + normal * field * 0.038 * uEnergy;
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vField = field;
    vObjectPosition = displaced;
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const CORE_FRAGMENT = `
  precision highp float;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uSignal;
  uniform vec3 uAcid;
  uniform vec3 uCool;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  varying vec3 vWorldNormal;
  varying float vField;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.65);
    float stripe = abs(sin(vObjectPosition.y * 10.0 + vField * 1.45 - uTime * 0.24));
    float contour = 1.0 - smoothstep(0.045, 0.16, stripe);
    float scanCenter = mix(-2.2, 2.2, fract(uTime * 0.055));
    float scanDistance = (vObjectPosition.y - scanCenter) * 3.0;
    float scan = exp(-(scanDistance * scanDistance));
    float radialPulse = 0.5 + 0.5 * sin(uTime * 1.15 + length(vObjectPosition.xz) * 3.5);
    vec3 color = mix(vec3(0.025, 0.043, 0.030), uAcid, clamp(rim * 0.92 + contour * 0.17, 0.0, 1.0));
    color += uCool * (scan * (0.08 + 0.24 * uSignal) + radialPulse * 0.035 * uSignal);
    float alpha = clamp((0.022 + rim * 0.34 + contour * 0.052 + scan * 0.09 * uSignal) * uEnergy, 0.0, 0.68);
    gl_FragColor = vec4(color, alpha);
  }
`;

const PACKET_VERTEX = `
  attribute float aArc;
  varying float vArc;
  void main() {
    vArc = aArc;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PACKET_FRAGMENT = `
  precision highp float;
  uniform float uPhase;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vArc;
  void main() {
    float distanceBehind = fract(uPhase - vArc + 1.0);
    float trail = 1.0 - smoothstep(0.0, 0.18, distanceBehind);
    float head = 1.0 - smoothstep(0.0, 0.024, distanceBehind);
    float alpha = uOpacity * (0.055 + trail * 0.58 + head * 0.72);
    if (alpha < 0.012) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const MODE_TARGETS = {
  topology: { energy: 0.62, signal: 0.1, nodes: 0.9, links: 0.16, packets: 0.22, speed: 0.07 },
  traffic: { energy: 0.78, signal: 0.38, nodes: 0.62, links: 0.09, packets: 0.92, speed: 0.24 },
  signal: { energy: 1.08, signal: 1, nodes: 0.4, links: 0.06, packets: 0.44, speed: 0.11 },
};

function initWorld(THREE) {
  const canvas = document.querySelector("#world");
  const hero = document.querySelector(".hero");
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070907, 0.045);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 12);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !coarsePointer,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x070907, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const rig = new THREE.Group();
  scene.add(rig);

  const coreUniforms = {
    uTime: { value: reducedMotion ? 4.3 : 0 },
    uEnergy: { value: MODE_TARGETS[activeMode].energy },
    uSignal: { value: MODE_TARGETS[activeMode].signal },
    uAcid: { value: new THREE.Color("#c8ff29") },
    uCool: { value: new THREE.Color("#67d9c3") },
  };
  const coreGeometry = new THREE.IcosahedronGeometry(2.02, innerWidth < 700 ? 3 : 5);
  const core = new THREE.Mesh(coreGeometry, new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: CORE_VERTEX,
    fragmentShader: CORE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }));
  rig.add(core);

  const hull = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.08, 2),
    new THREE.MeshBasicMaterial({
      color: 0x8fa77a,
      wireframe: true,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  rig.add(hull);

  const random = seededRandom(20260426);
  const nodeCount = innerWidth < 700 ? 26 : 42;
  modeReadouts.topology = `${nodeCount} nodes · mapped`;
  if (activeMode === "topology" && sceneReadout) sceneReadout.textContent = modeReadouts.topology;
  const nodePositions = [];
  for (let index = 0; index < nodeCount; index += 1) {
    const amount = index / Math.max(1, nodeCount - 1);
    const angle = -2.55 + amount * 5.1;
    const radius = 3.05 + (random() - 0.5) * 0.72;
    nodePositions.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * 1.62 + (random() - 0.5) * 0.58,
      Math.sin(angle * 1.55) * 1.2 + (random() - 0.5) * 1.8,
    ));
  }

  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: MODE_TARGETS[activeMode].nodes,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const nodes = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.052, 1),
    nodeMaterial,
    nodeCount,
  );
  nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  nodePositions.forEach((_, index) => {
    nodes.setColorAt(index, new THREE.Color(index % 7 === 0 ? 0xc8ff29 : 0x85947c));
  });
  if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
  rig.add(nodes);

  const edgePairs = new Set();
  nodePositions.forEach((position, index) => {
    const nearest = nodePositions.map((candidate, candidateIndex) => ({
      candidateIndex,
      distance: candidateIndex === index ? Infinity : position.distanceToSquared(candidate),
    })).sort((a, b) => a.distance - b.distance).slice(0, 2);
    nearest.forEach(({ candidateIndex }) => {
      edgePairs.add([Math.min(index, candidateIndex), Math.max(index, candidateIndex)].join(":"));
    });
  });
  const edgePositions = [];
  edgePairs.forEach((pair) => {
    const [start, end] = pair.split(":").map(Number);
    edgePositions.push(...nodePositions[start].toArray(), ...nodePositions[end].toArray());
  });
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xc8ff29,
    transparent: true,
    opacity: MODE_TARGETS[activeMode].links,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  rig.add(edges);

  const routeHeadGeometry = new THREE.IcosahedronGeometry(0.078, 1);
  const routes = [];
  for (let index = 0; index < 6; index += 1) {
    const lane = (index - 2.5) / 2.5;
    const controls = [
      new THREE.Vector3(-4.65, lane * 1.75 + (random() - 0.5) * 0.25, (random() - 0.5) * 2.6),
      new THREE.Vector3(-2.65, lane * 0.85 + (random() - 0.5) * 0.5, (index % 2 ? -1 : 1) * 1.3),
      new THREE.Vector3(-0.45, lane * 0.18 + (random() - 0.5) * 0.42, (index % 2 ? 1 : -1) * 1.65),
      new THREE.Vector3(1.75, -lane * 0.48 + (random() - 0.5) * 0.5, (index % 3 - 1) * 1.05),
      new THREE.Vector3(4.35, Math.sin(index * 1.7) * 0.72, (random() - 0.5) * 1.35),
    ];
    const curve = new THREE.CatmullRomCurve3(controls, false, "centripetal", 0.5);
    const points = curve.getPoints(150);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute("aArc", new THREE.Float32BufferAttribute(
      points.map((_, pointIndex) => pointIndex / (points.length - 1)),
      1,
    ));
    const routeColor = new THREE.Color(index % 3 === 0 ? "#67d9c3" : "#c8ff29");
    const uniforms = {
      uPhase: { value: index / 6 },
      uOpacity: { value: MODE_TARGETS[activeMode].packets },
      uColor: { value: routeColor },
    };
    const line = new THREE.Line(geometry, new THREE.ShaderMaterial({
      uniforms,
      vertexShader: PACKET_VERTEX,
      fragmentShader: PACKET_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const headMaterial = new THREE.MeshBasicMaterial({
      color: routeColor,
      transparent: true,
      opacity: MODE_TARGETS[activeMode].packets,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const head = new THREE.Mesh(routeHeadGeometry, headMaterial);
    rig.add(line, head);
    routes.push({ curve, line, head, headMaterial, uniforms, phase: index / 6 });
  }

  const dustCount = innerWidth < 700 ? 280 : 650;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    dustPositions[index * 3] = (random() - 0.5) * 24;
    dustPositions[index * 3 + 1] = (random() - 0.5) * 12;
    dustPositions[index * 3 + 2] = (random() - 0.5) * 13;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
    color: 0x84907c,
    size: innerWidth < 700 ? 0.018 : 0.022,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  const current = { ...MODE_TARGETS[activeMode] };
  let target = { ...MODE_TARGETS[activeMode] };
  let elapsed = reducedMotion ? 4.3 : 0;
  let running = false;
  let frameId = 0;
  let lastFrame = performance.now();
  let sceneVisible = hero.getBoundingClientRect().bottom > -100 && hero.getBoundingClientRect().top < innerHeight + 100;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const layout = { x: 3.4, y: -0.08, scale: 1 };
  const matrixHelper = new THREE.Object3D();

  function updateLayout() {
    const compact = innerWidth < 700;
    const medium = innerWidth < 1050;
    layout.x = compact ? 1.15 : medium ? 2.25 : 3.4;
    layout.y = compact ? 0.15 : -0.08;
    layout.scale = compact ? 0.76 : medium ? 0.88 : 1;
    rig.scale.setScalar(layout.scale);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.2 : 1.5));
    renderer.setSize(innerWidth, innerHeight, false);
  }

  function renderFrame(delta) {
    elapsed += reducedMotion ? 0 : delta;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
    Object.keys(current).forEach((key) => {
      current[key] += (target[key] - current[key]) * ease;
    });
    pointer.x += (pointer.targetX - pointer.x) * (reducedMotion ? 1 : 0.055);
    pointer.y += (pointer.targetY - pointer.y) * (reducedMotion ? 1 : 0.055);

    coreUniforms.uTime.value = elapsed;
    coreUniforms.uEnergy.value = current.energy;
    coreUniforms.uSignal.value = current.signal;
    core.rotation.y = elapsed * 0.045;
    core.rotation.z = Math.sin(elapsed * 0.17) * 0.08;
    hull.rotation.y = -elapsed * 0.034;
    hull.rotation.x = elapsed * 0.018;
    nodeMaterial.opacity = current.nodes;
    edgeMaterial.opacity = current.links;

    nodePositions.forEach((position, index) => {
      const gate = index % 7 === 0;
      const pulse = gate ? 1.65 + Math.sin(elapsed * 1.75 + index) * 0.28 : 0.95;
      matrixHelper.position.copy(position);
      matrixHelper.scale.setScalar(pulse);
      matrixHelper.updateMatrix();
      nodes.setMatrixAt(index, matrixHelper.matrix);
    });
    nodes.instanceMatrix.needsUpdate = true;

    routes.forEach((route, index) => {
      const nextPhase = route.phase + delta * current.speed * (0.82 + index * 0.055);
      route.phase = ((nextPhase % 1) + 1) % 1;
      route.uniforms.uPhase.value = route.phase;
      route.uniforms.uOpacity.value = current.packets;
      route.headMaterial.opacity = Math.min(1, current.packets * 1.08);
      route.head.position.copy(route.curve.getPointAt(Math.min(0.999999, route.phase)));
      route.head.scale.setScalar(0.82 + Math.sin(elapsed * 4 + index) * 0.15);
    });

    rig.rotation.y = elapsed * 0.018 + pointer.x * 0.11;
    rig.rotation.x = -0.05 + pointer.y * 0.075;
    rig.position.x = layout.x;
    rig.position.y = layout.y + Math.sin(elapsed * 0.42) * 0.065 - Math.min(pageScroll, innerHeight) * 0.0007;
    dust.rotation.y = elapsed * 0.004;
    dust.position.y = -Math.min(pageScroll, innerHeight) * 0.00016;
    camera.position.x = pointer.x * 0.24;
    camera.position.y = -pointer.y * 0.16;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function shouldAnimate() {
    return !reducedMotion && sceneVisible && !document.hidden;
  }

  function stopLoop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    running = false;
  }

  function animate(now) {
    if (!shouldAnimate()) {
      stopLoop();
      return;
    }
    const delta = Math.max(0, Math.min((now - lastFrame) / 1000, 0.05));
    lastFrame = now;
    renderFrame(delta);
    frameId = requestAnimationFrame(animate);
  }

  function startLoop() {
    if (!shouldAnimate() || running) return;
    running = true;
    lastFrame = performance.now();
    frameId = requestAnimationFrame(animate);
  }

  worldModeSetter = (mode) => {
    target = { ...MODE_TARGETS[mode] };
    if (reducedMotion || !sceneVisible) {
      Object.assign(current, target);
      renderFrame(0);
    } else {
      startLoop();
    }
  };

  if (!coarsePointer && !reducedMotion) {
    window.addEventListener("pointermove", (event) => {
      pointer.targetX = (event.clientX / innerWidth - 0.5) * 2;
      pointer.targetY = (event.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      sceneVisible = entry.isIntersecting;
      canvas.classList.toggle("is-muted", !sceneVisible);
      if (sceneVisible) {
        if (reducedMotion) renderFrame(0);
        else startLoop();
      } else {
        stopLoop();
      }
    }, { rootMargin: "100px 0px", threshold: 0 });
    heroObserver.observe(hero);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (sceneVisible) startLoop();
  });

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      updateLayout();
      renderFrame(0);
    });
  }, { passive: true });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stopLoop();
    canvas.hidden = true;
    document.documentElement.classList.add("world-fallback");
    setRenderState("STATIC", false);
  });

  updateLayout();
  renderFrame(0);
  setRenderState(reducedMotion ? "STILL" : "LIVE", !reducedMotion);
  markWorldReady();
  startLoop();
}

async function bootWorld() {
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js");
    initWorld(THREE);
  } catch (error) {
    const canvas = document.querySelector("#world");
    if (canvas) canvas.hidden = true;
    document.documentElement.classList.add("world-fallback");
    setRenderState("STATIC", false);
    markWorldReady();
    console.warn("3D scene unavailable; using the static visual fallback.", error);
  }
}

bootWorld();
