import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/*
 * FIFA19 - browser football prototype
 * Character rendering pass:
 * - procedural high-detail skin / kit materials
 * - anatomical body parts, facial features, hair and boots
 * - dynamic sweat response
 * - cloth/wrinkle animation approximation
 * - player/player + player/ball collision
 * - robust global keyboard input
 *
 * This is an original implementation. It does not use EA proprietary assets/code.
 */

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07100d);
scene.fog = new THREE.Fog(0x07100d, 75, 180);

const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 350);
camera.position.set(-35, 25, 38);

// Lighting: soft fill + strong directional stadium key.
const hemi = new THREE.HemisphereLight(0xdce8ff, 0x182319, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3.5);
sun.position.set(-35, 58, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -75;
sun.shadow.camera.right = 75;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
sun.shadow.bias = -0.00035;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x9bbcff, 0.65);
fill.position.set(35, 30, -35);
scene.add(fill);

const FIELD = { w: 68, l: 105 };
const HALF_L = FIELD.l / 2;
const HALF_W = FIELD.w / 2;
const PLAYER_RADIUS = 0.42;
const BALL_RADIUS = 0.11;

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

function standardMaterial(color, roughness = 0.8, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// Procedural micro-detail textures keep the project self-contained.
function makeWeaveTexture(baseA, baseB) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#' + baseA.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalAlpha = 0.20;
  for (let y = 0; y < 512; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? '#' + baseB.toString(16).padStart(6, '0') : '#ffffff';
    ctx.fillRect(0, y, 512, 1);
  }
  ctx.globalAlpha = 0.12;
  for (let x = 0; x < 512; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(x, 0, 1, 512);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSkinTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#bd7657';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1700; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = Math.random() * 1.6;
    ctx.globalAlpha = 0.025 + Math.random() * 0.055;
    ctx.fillStyle = Math.random() > 0.5 ? '#7d4539' : '#f2b28c';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SKIN_TEX = makeSkinTexture();
const skinMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc27b5d,
  map: SKIN_TEX,
  roughness: 0.47,
  metalness: 0,
  clearcoat: 0.08,
  clearcoatRoughness: 0.25,
  sheen: 0.08
});

const SKIN_SHADES = [0xa95f49, 0xc27b5d, 0xd18a67, 0x8e4b3b];
const HOME_KIT = 0xb51228;
const HOME_TRIM = 0xf2f2f2;
const AWAY_KIT = 0xe9e9e9;
const AWAY_TRIM = 0x243b73;
const HOME_SHORTS = 0x8e1020;
const AWAY_SHORTS = 0xd5d8df;

function makeKitMaterial(team) {
  const base = team === 0 ? HOME_KIT : AWAY_KIT;
  const trim = team === 0 ? HOME_TRIM : AWAY_TRIM;
  return new THREE.MeshStandardMaterial({
    color: base,
    roughness: 0.58,
    metalness: 0.02,
    map: makeWeaveTexture(base, trim)
  });
}

const shortsMats = [
  new THREE.MeshStandardMaterial({ color: HOME_SHORTS, roughness: 0.63 }),
  new THREE.MeshStandardMaterial({ color: AWAY_SHORTS, roughness: 0.63 })
];
const sockMats = [
  new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.68 }),
  new THREE.MeshStandardMaterial({ color: 0x243b73, roughness: 0.68 })
];
const bootMat = new THREE.MeshPhysicalMaterial({ color: 0x101216, roughness: 0.28, clearcoat: 0.45, clearcoatRoughness: 0.18 });
const hairMat = new THREE.MeshPhysicalMaterial({ color: 0x17120f, roughness: 0.34, sheen: 0.35, clearcoat: 0.22 });

function createPitch() {
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD.l, FIELD.w),
    new THREE.MeshStandardMaterial({ color: 0x286b32, roughness: 0.82 })
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x347c3d, roughness: 0.86 });
  for (let i = 0; i < 13; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.l / 13, FIELD.w), stripeMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(-HALF_L + FIELD.l / 26 + i * FIELD.l / 13, 0.006, 0);
    s.receiveShadow = true;
    scene.add(s);
  }

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const line = (x1, z1, x2, z2) => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, 0.028, z1),
      new THREE.Vector3(x2, 0.028, z2)
    ]);
    scene.add(new THREE.Line(g, lineMat));
  };
  line(-HALF_L, -HALF_W, HALF_L, -HALF_W);
  line(-HALF_L, HALF_W, HALF_L, HALF_W);
  line(-HALF_L, -HALF_W, -HALF_L, HALF_W);
  line(HALF_L, -HALF_W, HALF_L, HALF_W);
  line(0, -HALF_W, 0, HALF_W);

  const circlePts = [];
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * Math.PI * 2;
    circlePts.push(new THREE.Vector3(Math.cos(a) * 9.15, 0.029, Math.sin(a) * 9.15));
  }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts), lineMat));

  for (const sx of [-1, 1]) {
    const x = sx * (HALF_L - 16.5);
    line(x, -20.16, x, 20.16);
    line(sx * HALF_L, -20.16, x, -20.16);
    line(sx * HALF_L, 20.16, x, 20.16);
    // Six-yard box.
    const bx = sx * (HALF_L - 5.5);
    line(bx, -9.16, bx, 9.16);
    line(sx * HALF_L, -9.16, bx, -9.16);
    line(sx * HALF_L, 9.16, bx, 9.16);
  }

  return pitch;
}

const pitch = createPitch();

function createGoal(xSign) {
  const x = xSign * (HALF_L + 1.1);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.08 });
  const netMat = new THREE.MeshBasicMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.30, wireframe: true });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 2.44, 12), postMat);
  post.position.set(x, 1.22, -3.66); post.castShadow = true; scene.add(post);
  const post2 = post.clone(); post2.position.z = 3.66; scene.add(post2);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 7.32, 12), postMat);
  bar.rotation.x = Math.PI / 2; bar.position.set(x, 2.44, 0); bar.castShadow = true; scene.add(bar);
  const net = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.4, 7.3), netMat);
  net.position.set(xSign > 0 ? x + 1.35 : x - 1.35, 1.2, 0); scene.add(net);
}
createGoal(-1); createGoal(1);

function stadium() {
  const standMat = standardMaterial(0x2e353a, 0.9);
  const crowdMat = standardMaterial(0x48525a, 1);
  for (const z of [-1, 1]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(132, 8, 17), standMat);
    stand.position.set(0, 4, z * 46); stand.receiveShadow = true; scene.add(stand);
    const crowd = new THREE.Mesh(new THREE.BoxGeometry(126, 6, 12), crowdMat);
    crowd.position.set(0, 9, z * 45); scene.add(crowd);
  }
  for (const x of [-1, 1]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(17, 8, 92), standMat);
    stand.position.set(x * 62, 4, 0); scene.add(stand);
  }
  for (let x = -52; x <= 52; x += 13) {
    for (const z of [-45, 45]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 18, 8), standardMaterial(0x555b60));
      pole.position.set(x, 9, z); scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 }));
      lamp.position.set(x, 17, z); scene.add(lamp);
    }
  }
}
stadium();

const players = [];
let controlled = null;
let playerId = 0;

function limb(parent, geometry, material, pos, scale = null) {
  const m = new THREE.Mesh(geometry, material);
  m.position.copy(pos);
  if (scale) m.scale.copy(scale);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function addHair(group, style = 0) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  cap.position.y = 1.58;
  cap.scale.set(1.02, 0.74, 1.02);
  cap.castShadow = true;
  group.add(cap);

  const strands = style === 1 ? 16 : 10;
  for (let i = 0; i < strands; i++) {
    const a = i / strands * Math.PI * 2;
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, style === 1 ? 0.18 : 0.11, 5), hairMat);
    strand.position.set(Math.cos(a) * 0.17, 1.67 + (i % 3) * 0.01, Math.sin(a) * 0.17);
    strand.rotation.z = Math.cos(a) * 0.16;
    strand.rotation.x = Math.sin(a) * 0.16;
    strand.castShadow = true;
    group.add(strand);
  }
}

function addFace(group) {
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf7f4ef, roughness: 0.38 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x252019, roughness: 0.32 });
  const lip = new THREE.MeshStandardMaterial({ color: 0x6e3c39, roughness: 0.5 });

  for (const side of [-1, 1]) {
    const eye = limb(group, new THREE.SphereGeometry(0.035, 8, 6), eyeWhite, new THREE.Vector3(side * 0.075, 1.60, -0.205));
    eye.scale.z = 0.45;
    const pupil = limb(group, new THREE.SphereGeometry(0.015, 7, 5), iris, new THREE.Vector3(side * 0.075, 1.60, -0.232));
    pupil.scale.z = 0.5;
  }
  const nose = limb(group, new THREE.ConeGeometry(0.035, 0.10, 7), skinMaterial, new THREE.Vector3(0, 1.54, -0.22));
  nose.rotation.x = Math.PI / 2;
  const mouth = limb(group, new THREE.TorusGeometry(0.045, 0.008, 5, 12, Math.PI), lip, new THREE.Vector3(0, 1.48, -0.208));
  mouth.rotation.x = Math.PI / 2;
}

function makePlayer(team, x, z, num) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData = {
    id: playerId++, team, num,
    vel: new THREE.Vector3(),
    control: team === 0 ? 76 : 70,
    stamina: 100,
    base: new THREE.Vector3(x, 0, z),
    role: num === 1 ? 'GK' : 'OUT',
    sweat: 0,
    animTime: Math.random() * 10,
    walkPhase: Math.random() * Math.PI * 2,
    radius: PLAYER_RADIUS,
    facing: 0
  };

  const kitMat = makeKitMaterial(team);
  const shortMat = shortsMats[team];
  const sockMat = sockMats[team];
  const skin = skinMaterial.clone();
  skin.color.setHex(SKIN_SHADES[(num + team) % SKIN_SHADES.length]);
  skin.map = SKIN_TEX;

  // Torso / shoulders.
  const torso = limb(group, new THREE.CapsuleGeometry(0.40, 0.66, 6, 14), kitMat, new THREE.Vector3(0, 1.05, 0));
  torso.scale.set(1.08, 1.0, 0.62);
  torso.userData.part = 'kit';

  // Shorts and waist.
  const waist = limb(group, new THREE.CylinderGeometry(0.31, 0.35, 0.24, 12), shortMat, new THREE.Vector3(0, 0.63, 0));
  waist.scale.z = 0.82;

  // Neck + head.
  limb(group, new THREE.CylinderGeometry(0.12, 0.13, 0.16, 12), skin, new THREE.Vector3(0, 1.49, 0));
  const head = limb(group, new THREE.SphereGeometry(0.225, 20, 16), skin, new THREE.Vector3(0, 1.68, -0.005));
  head.scale.set(0.92, 1.10, 0.96);
  addFace(group);
  addHair(group, num % 3 === 0 ? 1 : 0);

  // Arms with upper/lower segments for a more anatomical silhouette.
  for (const side of [-1, 1]) {
    const upper = limb(group, new THREE.CapsuleGeometry(0.105, 0.34, 5, 9), skin, new THREE.Vector3(side * 0.47, 1.15, 0));
    upper.rotation.z = side * 0.12;
    const sleeve = limb(group, new THREE.CapsuleGeometry(0.13, 0.20, 5, 9), kitMat, new THREE.Vector3(side * 0.43, 1.30, 0));
    sleeve.rotation.z = side * 0.12;
    const fore = limb(group, new THREE.CapsuleGeometry(0.085, 0.32, 5, 9), skin, new THREE.Vector3(side * 0.49, 0.88, 0));
    fore.rotation.z = side * 0.06;
    limb(group, new THREE.SphereGeometry(0.095, 10, 8), skin, new THREE.Vector3(side * 0.51, 0.68, 0));
  }

  // Legs, socks and boots.
  for (const side of [-1, 1]) {
    limb(group, new THREE.CapsuleGeometry(0.145, 0.38, 5, 10), skin, new THREE.Vector3(side * 0.17, 0.38, 0));
    limb(group, new THREE.CapsuleGeometry(0.13, 0.30, 5, 10), sockMat, new THREE.Vector3(side * 0.17, 0.17, 0));
    const boot = limb(group, new THREE.BoxGeometry(0.24, 0.12, 0.40), bootMat, new THREE.Vector3(side * 0.17, 0.07, -0.09));
    boot.rotation.y = 0;
  }

  // Chest trim and number-like visual detail without copyrighted marks.
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.012, 4, 24), new THREE.MeshBasicMaterial({ color: team === 0 ? HOME_TRIM : AWAY_TRIM }));
  trim.rotation.x = Math.PI / 2;
  trim.position.set(0, 1.20, -0.27);
  group.add(trim);

  // Team ring.
  const ringColor = team === 0 ? 0xff263f : 0x5aa9ff;
  const teamRing = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.52, 28), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  teamRing.rotation.x = -Math.PI / 2;
  teamRing.position.y = 0.025;
  group.add(teamRing);

  // Active marker overhead.
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.30, 0.39, 24), new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
  marker.rotation.x = Math.PI / 2;
  marker.position.y = 2.12;
  marker.visible = false;
  group.add(marker);

  // Sweat highlight is driven by the material roughness in updateCharacterVisuals().
  group.userData = { ...group.userData, marker, teamRing, torso, kitMat, skin, head };
  group.castShadow = true;
  scene.add(group);
  players.push(group);
  return group;
}

const homePos = [[-48,0],[-30,-22],[-30,0],[-30,22],[-10,-28],[-10,-10],[-10,10],[-10,28],[15,-20],[15,0],[15,20]];
const awayPos = [[48,0],[30,-22],[30,0],[30,22],[10,-28],[10,-10],[10,10],[10,28],[-15,-20],[-15,0],[-15,20]];
homePos.forEach((p, i) => makePlayer(0, p[0], p[1], i + 1));
awayPos.forEach((p, i) => makePlayer(1, p[0], p[1], i + 1));
controlled = players[9];
controlled.userData.marker.visible = true;

// Ball.
const ballMat = new THREE.MeshPhysicalMaterial({ color: 0xf5f5f5, roughness: 0.32, clearcoat: 0.35, clearcoatRoughness: 0.22 });
const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 32, 20), ballMat);
ball.castShadow = true;
ball.position.set(0, BALL_RADIUS, 0);
scene.add(ball);
const ballState = {
  v: new THREE.Vector3(),
  w: new THREE.Vector3(),
  mass: 0.43,
  Cd: 0.25,
  angularDrag: 0.05,
  restitution: 0.78,
  magnus: 0.00035,
  wear: 0
};

// Robust global input: no canvas focus required.
const keys = Object.create(null);
const pressed = Object.create(null);
const controlKeys = new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','e',' ','q','r','c']);

function handleKeyDown(e) {
  const k = e.key.toLowerCase();
  if (controlKeys.has(k)) e.preventDefault();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  if (k === 'q') switchPlayer();
  if (k === 'r') resetBall();
  if (k === 'c') cameraMode = (cameraMode + 1) % 3;
}
function handleKeyUp(e) {
  const k = e.key.toLowerCase();
  if (controlKeys.has(k)) e.preventDefault();
  keys[k] = false;
}
function clearInput() {
  for (const k of Object.keys(keys)) keys[k] = false;
  for (const k of Object.keys(pressed)) delete pressed[k];
}
window.addEventListener('keydown', handleKeyDown, { passive: false });
window.addEventListener('keyup', handleKeyUp, { passive: false });
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());

let cameraMode = 0;
let score = [0, 0];
let matchTime = 0;
let shootCharge = 0;
let shooting = false;
let last = performance.now();
let goalPause = 0;
let statusTimeout = null;

function setStatus(text) {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    if (el) el.textContent = 'MOVE • SHIFT SPRINT • E PASS • SPACE SHOOT • Q SWITCH • R RESET • C CAMERA';
  }, 1200);
}

function resetBall() {
  ball.position.set(0, BALL_RADIUS, 0);
  ballState.v.set(0, 0, 0);
  ballState.w.set(0, 0, 0);
  shooting = false;
  shootCharge = 0;
}

function switchPlayer() {
  const team = players.filter(p => p.userData.team === 0);
  if (controlled) controlled.userData.marker.visible = false;
  let best = null, bestScore = Infinity;
  for (const p of team) {
    if (p === controlled) continue;
    const d = p.position.distanceTo(ball.position);
    const facingPenalty = p.userData.vel.length() > 0.5 ? 0 : 0.2;
    const s = d + facingPenalty;
    if (s < bestScore) { bestScore = s; best = p; }
  }
  controlled = best || team[0];
  controlled.userData.marker.visible = true;
  setStatus(`PLAYER ${controlled.userData.num} SELECTED`);
}

function inputDir() {
  const x = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const z = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const v = new THREE.Vector3(x, 0, z);
  if (v.lengthSq() > 0) v.normalize();
  return v;
}

function nearestTeammate() {
  let best = null, bestD = Infinity;
  for (const p of players) {
    if (p === controlled || p.userData.team !== controlled.userData.team || p.userData.role === 'GK') continue;
    const d = p.position.distanceTo(controlled.position);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function kick(power, curve = 0, loft = 0.12, direction = null) {
  const dir = direction ? direction.clone() : new THREE.Vector3(0, 0, -1);
  if (!direction) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(controlled.quaternion);
    dir.copy(forward);
  }
  dir.y = 0;
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();

  const toBall = ball.position.clone().sub(controlled.position);
  toBall.y = 0;
  if (toBall.lengthSq() > 0.01) dir.lerp(toBall.normalize(), 0.18).normalize();

  ballState.v.copy(dir).multiplyScalar(power);
  ballState.v.y = Math.max(0.1, power * loft);
  ballState.w.set(0, curve * power, 0);
  ball.position.y = Math.max(BALL_RADIUS, ball.position.y);
}

function pass() {
  if (controlled.position.distanceTo(ball.position) > 1.5) return false;
  const mate = nearestTeammate();
  let direction;
  if (mate) {
    direction = mate.position.clone().sub(ball.position);
    direction.y = 0;
  } else {
    direction = new THREE.Vector3(0, 0, -1).applyQuaternion(controlled.quaternion);
  }
  if (direction.lengthSq() < 0.01) direction.set(1, 0, 0);
  direction.normalize();
  kick(23, 0.18, 0.018, direction);
  setStatus('DRIVEN PASS');
  return true;
}

function shoot() {
  if (controlled.position.distanceTo(ball.position) > 1.5) return false;
  const t = shootCharge;
  const timing = Math.abs(t - 0.72);
  const quality = timing < 0.09 ? 'GREEN' : timing < 0.22 ? 'YELLOW' : 'RED';
  const power = 16 + 24 * Math.min(1, t);
  const goalX = controlled.userData.team === 0 ? HALF_L + 1.0 : -HALF_L - 1.0;
  const direction = new THREE.Vector3(goalX - ball.position.x, 0, -ball.position.z * 0.18).normalize();
  const curve = quality === 'GREEN' ? 1.8 : quality === 'YELLOW' ? 1.2 : 0.7;
  kick(power, curve, 0.18, direction);
  const timed = document.getElementById('timed');
  if (timed) {
    timed.textContent = quality + ' FINISH';
    timed.classList.add('show');
    setTimeout(() => timed.classList.remove('show'), 500);
  }
  setStatus(`${quality} FINISH`);
  shootCharge = 0;
  shooting = false;
  return true;
}

function updateControlled(dt) {
  const d = inputDir();
  const moving = d.lengthSq() > 0;
  const sprint = !!keys.shift && moving;
  const maxSpeed = sprint ? 9.3 : 6.2;
  const target = d.clone().multiplyScalar(maxSpeed);
  const response = sprint ? 7.5 : 5.0;
  const accel = 1 - Math.exp(-response * dt);
  controlled.userData.vel.lerp(target, accel * 0.90);

  if (!moving) controlled.userData.vel.multiplyScalar(Math.exp(-7.5 * dt));
  controlled.position.addScaledVector(controlled.userData.vel, dt);
  controlled.position.x = clamp(controlled.position.x, -HALF_L + 0.8, HALF_L - 0.8);
  controlled.position.z = clamp(controlled.position.z, -HALF_W + 0.8, HALF_W - 0.8);

  if (moving) {
    const desiredAngle = Math.atan2(d.x, d.z);
    controlled.rotation.y = damp(controlled.rotation.y, desiredAngle, 14, dt);
    controlled.userData.facing = desiredAngle;
  }

  const dist = controlled.position.distanceTo(ball.position);
  if (dist <= 1.5 && pressed.e) pass();

  if (keys[' ']) {
    shooting = true;
    shootCharge = Math.min(1, shootCharge + dt * 1.25);
  } else if (shooting) {
    shoot();
  }

  const power = document.querySelector('#power i');
  if (power) power.style.width = `${shootCharge * 100}%`;

  // Soft dribble constraint, never teleporting the ball to the foot.
  if (dist < 1.25 && ballState.v.length() < 7 && !keys[' ']) {
    const desired = controlled.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(controlled.quaternion);
    desired.addScaledVector(forward, 0.85);
    desired.y = BALL_RADIUS;
    const delta = desired.sub(ball.position);
    delta.y = 0;
    ballState.v.addScaledVector(delta, Math.min(10, delta.length() * 12) * dt);
  }
}

function resolvePlayerCollisions() {
  const minD = PLAYER_RADIUS * 2;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      const delta = b.position.clone().sub(a.position);
      delta.y = 0;
      const d2 = delta.lengthSq();
      if (d2 > 0 && d2 < minD * minD) {
        const d = Math.sqrt(d2);
        const n = delta.multiplyScalar(1 / d);
        const overlap = minD - d;
        const aStatic = a === controlled;
        const bStatic = b === controlled;
        if (aStatic && !bStatic) b.position.addScaledVector(n, overlap);
        else if (!aStatic && bStatic) a.position.addScaledVector(n, -overlap);
        else {
          a.position.addScaledVector(n, -overlap * 0.5);
          b.position.addScaledVector(n, overlap * 0.5);
        }
      }
    }
  }
}

function playerBallCollision() {
  for (const p of players) {
    const delta = ball.position.clone().sub(p.position);
    delta.y = 0;
    const d = delta.length();
    const minD = PLAYER_RADIUS + BALL_RADIUS + 0.02;
    if (d > 0.001 && d < minD) {
      const n = delta.multiplyScalar(1 / d);
      const relative = ballState.v.clone().sub(p.userData.vel);
      const approaching = relative.dot(n);
      if (approaching < 0) {
        ballState.v.addScaledVector(n, -approaching * 0.55);
      }
      if (p === controlled && d < 1.2 && ballState.v.length() < 7) {
        ballState.v.addScaledVector(n, Math.max(0, 1.5 - d) * 2.2);
      }
    }
  }
}

function updateAI(dt) {
  for (const p of players) {
    if (p === controlled) continue;
    const team = p.userData.team;
    const desired = p.userData.base.clone();
    desired.x += clamp(ball.position.x * 0.14, -8, 8);
    desired.z += clamp(ball.position.z * 0.20, -8, 8);

    const distBall = p.position.distanceTo(ball.position);
    if (team === 1) {
      desired.x += ball.position.x * 0.16;
      if (distBall < 13) desired.lerp(ball.position, 0.20);
    } else if (distBall < 10) {
      desired.lerp(ball.position, 0.16);
    }

    if (p.userData.role === 'GK') {
      desired.x = team === 0 ? -50 : 50;
      desired.z = clamp(ball.position.z * 0.35, -11, 11);
    }

    const delta = desired.sub(p.position);
    delta.y = 0;
    const max = p.userData.role === 'GK' ? 5.0 : 6.1;
    if (delta.length() > 0.7) {
      delta.normalize().multiplyScalar(max);
      p.userData.vel.lerp(delta, 1 - Math.exp(-3.5 * dt));
      p.position.addScaledVector(p.userData.vel, dt);
      p.rotation.y = damp(p.rotation.y, Math.atan2(p.userData.vel.x, p.userData.vel.z), 9, dt);
    } else {
      p.userData.vel.multiplyScalar(Math.exp(-8 * dt));
    }

    p.position.x = clamp(p.position.x, -HALF_L + 0.8, HALF_L - 0.8);
    p.position.z = clamp(p.position.z, -HALF_W + 0.8, HALF_W - 0.8);

    if (distBall < 1.25 && ballState.v.length() < 2.5) {
      const direction = team === 0 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
      ballState.v.lerp(direction.multiplyScalar(8), 0.4);
      ballState.w.y = team === 0 ? 1.0 : -1.0;
    }
  }
}

function ballPhysics(dt) {
  const v = ballState.v;
  const speed = v.length();
  const rho = 0.9;
  const area = Math.PI * BALL_RADIUS * BALL_RADIUS;
  if (speed > 0.001) {
    const dragForce = 0.5 * rho * ballState.Cd * area * speed * speed;
    v.addScaledVector(v.clone().normalize(), -(dragForce / ballState.mass) * dt);
  }

  const magnus = new THREE.Vector3().crossVectors(ballState.w, v).multiplyScalar(ballState.magnus);
  v.addScaledVector(magnus, dt);
  v.y -= 9.81 * dt;
  ball.position.addScaledVector(v, dt);
  ballState.w.multiplyScalar(Math.exp(-ballState.angularDrag * dt));

  if (ball.position.y <= BALL_RADIUS) {
    ball.position.y = BALL_RADIUS;
    if (v.y < 0) v.y = -v.y * ballState.restitution;
    const friction = 0.52;
    const factor = Math.max(0, 1 - friction * dt);
    v.x *= factor; v.z *= factor;
    ballState.w.multiplyScalar(0.985);
    if (Math.abs(v.y) < 0.45) v.y = 0;
  }

  // Pitch boundary collision.
  if (ball.position.x < -HALF_L + BALL_RADIUS) { ball.position.x = -HALF_L + BALL_RADIUS; v.x = Math.abs(v.x) * 0.65; }
  if (ball.position.x > HALF_L - BALL_RADIUS) { ball.position.x = HALF_L - BALL_RADIUS; v.x = -Math.abs(v.x) * 0.65; }
  if (ball.position.z < -HALF_W + BALL_RADIUS) { ball.position.z = -HALF_W + BALL_RADIUS; v.z = Math.abs(v.z) * 0.65; }
  if (ball.position.z > HALF_W - BALL_RADIUS) { ball.position.z = HALF_W - BALL_RADIUS; v.z = -Math.abs(v.z) * 0.65; }

  ball.rotation.x += ballState.w.x * dt;
  ball.rotation.y += ballState.w.y * dt;
  ball.rotation.z += ballState.w.z * dt;
}

function goalCheck() {
  if (goalPause > 0) return;
  if (Math.abs(ball.position.x) > HALF_L - 0.1 && Math.abs(ball.position.z) < 3.7 && ball.position.y < 2.45) {
    const scoringTeam = ball.position.x > 0 ? 0 : 1;
    score[scoringTeam]++;
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = `${score[0]} — ${score[1]}`;
    setStatus(scoringTeam === 0 ? 'GOAL! HOME' : 'GOAL! AWAY');
    goalPause = 1.3;
    resetBall();
  }
}

function updateCharacterVisuals(dt) {
  for (const p of players) {
    const ud = p.userData;
    const speed = ud.vel.length();
    const sprintFactor = clamp(speed / 9.3, 0, 1);
    ud.animTime += dt * (2.2 + speed * 0.8);
    ud.sweat = clamp(ud.sweat + dt * (0.003 + sprintFactor * 0.025), 0, 1);

    // Dynamic sweat: reduce roughness and increase clearcoat as the match progresses.
    ud.skin.roughness = lerp(0.50, 0.28, ud.sweat);
    ud.skin.clearcoat = lerp(0.06, 0.28, ud.sweat);
    ud.kitMat.roughness = lerp(0.62, 0.48, ud.sweat * 0.55);

    // Natural locomotion and cloth response.
    const stride = Math.sin(ud.animTime + ud.walkPhase) * clamp(speed / 7, 0, 1) * 0.16;
    p.rotation.z = damp(p.rotation.z, -ud.vel.x * 0.018, 6, dt);
    p.rotation.x = damp(p.rotation.x, ud.vel.z * 0.012, 6, dt);
    ud.torso.scale.x = 1.08 + Math.sin(ud.animTime * 0.7) * 0.008;
    ud.torso.scale.z = 0.62 + sprintFactor * 0.025;

    // Subtle head stabilization / focus response.
    ud.head.rotation.y = damp(ud.head.rotation.y, clamp(-ud.vel.x * 0.025, -0.12, 0.12), 7, dt);
    ud.marker.rotation.z += dt * 1.7;
    ud.marker.position.y = 2.12 + Math.sin(performance.now() * 0.006) * 0.035;

    // Keep player upright after physics-style contacts.
    p.position.y = 0;
    if (speed < 0.15) ud.animTime += dt * 0.15;
    void stride;
  }
}

function pitchWear() {
  ballState.wear = Math.min(1, ballState.wear + 0.000008);
  pitch.material.roughness = 0.82 + 0.12 * ballState.wear;
}

function updateCamera(dt) {
  const target = ball.position.clone();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(controlled.quaternion);

  if (cameraMode === 0) {
    // Tele-Broadcast.
    const desired = new THREE.Vector3(target.x - 31, 23, target.z + 35);
    camera.position.lerp(desired, 1 - Math.exp(-3.2 * dt));
    camera.lookAt(target.x, 0, target.z);
  } else if (cameraMode === 1) {
    // Overhead tactical.
    const desired = new THREE.Vector3(target.x - 4, 42, target.z + 2);
    camera.position.lerp(desired, 1 - Math.exp(-4.0 * dt));
    camera.lookAt(target.x, 0, target.z);
  } else {
    // Follow camera.
    const desired = controlled.position.clone().addScaledVector(forward, -7.0);
    desired.y += 4.0;
    camera.position.lerp(desired, 1 - Math.exp(-5.0 * dt));
    camera.lookAt(controlled.position.x, 1.0, controlled.position.z);
  }
}

function updateClock(dt) {
  matchTime += dt;
  const minutes = Math.floor(matchTime / 60);
  const seconds = Math.floor(matchTime % 60);
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function consumePressed() {
  for (const k of Object.keys(pressed)) delete pressed[k];
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function animate(now) {
  const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
  last = now;
  goalPause = Math.max(0, goalPause - dt);

  updateControlled(dt);
  updateAI(dt);
  resolvePlayerCollisions();
  playerBallCollision();
  ballPhysics(dt);
  goalCheck();
  updateCharacterVisuals(dt);
  pitchWear();
  updateCamera(dt);
  updateClock(dt);
  consumePressed();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

setTimeout(() => document.getElementById('loading')?.remove(), 700);
requestAnimationFrame(animate);
