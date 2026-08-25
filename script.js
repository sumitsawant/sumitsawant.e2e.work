import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
try {
const canvas = document.querySelector("#world");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070907, 0.052);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:"high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const rig = new THREE.Group();
rig.position.set(3.2, 0, 0);
scene.add(rig);
const nodeMaterial = new THREE.MeshBasicMaterial({ color:0xc8ff29, transparent:true, opacity:.9 });
const dimMaterial = new THREE.MeshBasicMaterial({ color:0x7f8b74, transparent:true, opacity:.45 });
const nodeGeometry = new THREE.IcosahedronGeometry(.07, 1);
const nodes = [];
const nodeCount = innerWidth < 700 ? 28 : 52;

for (let i = 0; i < nodeCount; i += 1) {
  const radius = 2.1 + Math.random() * 2.3;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const mesh = new THREE.Mesh(nodeGeometry, i % 7 === 0 ? nodeMaterial : dimMaterial);
  mesh.position.set(radius*Math.sin(phi)*Math.cos(theta), radius*Math.sin(phi)*Math.sin(theta), radius*Math.cos(phi));
  mesh.scale.setScalar(i % 7 === 0 ? 1.9 : 1);
  nodes.push(mesh);
  rig.add(mesh);
}

const linePositions = [];
for (let i = 0; i < nodes.length; i += 1) {
  const nearest = nodes.map((node,index) => ({ index, distance:nodes[i].position.distanceTo(node.position) }))
    .filter(({index}) => index !== i).sort((a,b) => a.distance-b.distance).slice(0,2);
  nearest.forEach(({index}) => linePositions.push(...nodes[i].position.toArray(), ...nodes[index].position.toArray()));
}
const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
rig.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color:0xc8ff29, transparent:true, opacity:.1 })));

const rings = new THREE.Group();
[[3.2,0x46503e,.18],[4.15,0xc8ff29,.12],[5.1,0x75806d,.08]].forEach(([radius,color,opacity],index) => {
  const curve = new THREE.EllipseCurve(0,0,radius,radius*(.54+index*.04),0,Math.PI*2);
  const points = curve.getPoints(160).map(({x,y}) => new THREE.Vector3(x,y,0));
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color,transparent:true,opacity }));
  ring.rotation.set(Math.random()*2, Math.random()*2, Math.random()*2);
  rings.add(ring);
});
rig.add(rings);

const particleCount = innerWidth < 700 ? 450 : 1100;
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i += 1) {
  const radius = 5 + Math.random() * 16;
  positions[i*3]=(Math.random()-.5)*radius*2;
  positions[i*3+1]=(Math.random()-.5)*radius;
  positions[i*3+2]=(Math.random()-.5)*radius;
}
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions,3));
const particles = new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:0xaab7a0,size:.018,transparent:true,opacity:.46,sizeAttenuation:true}));
scene.add(particles);

const mouse = { x:0,y:0,tx:0,ty:0 };
window.addEventListener("pointermove", event => {
  mouse.tx=(event.clientX/innerWidth-.5)*2;
  mouse.ty=(event.clientY/innerHeight-.5)*2;
});
let scrollY = window.scrollY;
window.addEventListener("scroll", () => { scrollY=window.scrollY; }, {passive:true});
const clock = new THREE.Clock();
function animate() {
  const elapsed=clock.getElapsedTime();
  mouse.x+=(mouse.tx-mouse.x)*.035;
  mouse.y+=(mouse.ty-mouse.y)*.035;
  rig.rotation.y=elapsed*.085+mouse.x*.16;
  rig.rotation.x=elapsed*.035+mouse.y*.13;
  rig.position.y=Math.sin(elapsed*.55)*.18-scrollY*.0015;
  rig.position.x=innerWidth<800?1.2:3.2;
  rings.rotation.z=-elapsed*.045;
  particles.rotation.y=elapsed*.009;
  particles.position.y=-scrollY*.0004;
  nodes.forEach((node,index) => {
    if (index % 7 === 0) node.scale.setScalar(1.75+Math.sin(elapsed*1.8+index)*.28);
  });
  camera.position.x=mouse.x*.32;
  camera.position.y=-mouse.y*.22;
  camera.lookAt(0,0,0);
  renderer.render(scene,camera);
  if (!reducedMotion) requestAnimationFrame(animate);
}
animate();
window.addEventListener("resize", () => {
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.setSize(innerWidth,innerHeight);
});
} catch (error) {
  document.querySelector("#world").hidden = true;
  console.warn("3D scene unavailable; using the static visual fallback.", error);
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("is-visible"); });
}, {threshold:.14});
document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
const titleLines=document.querySelectorAll("[data-shift]");
const header=document.querySelector(".site-header");
const progress=document.querySelector(".scroll-progress span");
window.addEventListener("scroll", () => {
  if (!reducedMotion) titleLines.forEach(line => { line.style.transform=`translate3d(${scrollY*Number(line.dataset.shift)}px,0,0)`; });
  header.classList.toggle("is-scrolled",scrollY>40);
  const available=document.documentElement.scrollHeight-innerHeight;
  progress.style.width=`${available>0?(scrollY/available)*100:0}%`;
}, {passive:true});

const cursor=document.querySelector(".cursor");
if (matchMedia("(pointer:fine)").matches) {
  window.addEventListener("pointermove", event => { cursor.classList.add("has-moved"); cursor.style.left=`${event.clientX}px`; cursor.style.top=`${event.clientY}px`; });
  document.querySelectorAll("a,.work-card,.stack__cloud span").forEach(element => {
    element.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    element.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });
  document.querySelectorAll(".work-card").forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect=card.getBoundingClientRect();
      card.style.setProperty("--glow-x",`${event.clientX-rect.left}px`);
      card.style.setProperty("--glow-y",`${event.clientY-rect.top}px`);
    });
  });
  document.querySelectorAll(".magnetic").forEach(element => {
    element.addEventListener("pointermove", event => {
      const rect=element.getBoundingClientRect();
      element.style.transform=`translate(${(event.clientX-rect.left-rect.width/2)*.15}px,${(event.clientY-rect.top-rect.height/2)*.15}px)`;
    });
    element.addEventListener("pointerleave", () => { element.style.transform=""; });
  });
}

document.querySelector("#year").textContent=new Date().getFullYear();
window.addEventListener("load", () => { window.setTimeout(() => document.querySelector(".loader").classList.add("is-done"),850); });
