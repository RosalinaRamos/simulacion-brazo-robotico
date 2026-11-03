// ==========================================
// 1. FONDO DE PARTÍCULAS ANIMADAS
// ==========================================
const pCanvas = document.getElementById('particles-bg');
const pCtx = pCanvas ? pCanvas.getContext('2d') : null;
let particles = [];

function resizeParticlesCanvas() {
  if (!pCanvas) return;
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeParticlesCanvas);
resizeParticlesCanvas();

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * (pCanvas ? pCanvas.width : 1000);
    this.y = Math.random() * (pCanvas ? pCanvas.height : 800);
    this.radius = Math.random() * 2 + 0.5;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.alpha = Math.random() * 0.5 + 0.2;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    const w = pCanvas ? pCanvas.width : 1000;
    const h = pCanvas ? pCanvas.height : 800;
    if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
  }
  draw() {
    if (!pCtx) return;
    pCtx.beginPath();
    pCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    pCtx.fillStyle = `rgba(6, 182, 212, ${this.alpha})`;
    pCtx.fill();
  }
}
for (let i = 0; i < 60; i++) particles.push(new Particle());

function animateParticles() {
  if (pCtx && pCanvas) {
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
  }
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ==========================================
// 2. NAVEGACIÓN Y VISIBILIDAD
// ==========================================
const screenIntro = document.getElementById('screen-intro');
const screenSim = document.getElementById('screen-sim');
const btnStart = document.getElementById('btn-start');
const btnBack = document.getElementById('btn-back');
const btnTogglePanels = document.getElementById('btn-toggle-panels');

if (btnStart) {
  btnStart.addEventListener('click', () => {
    if (screenIntro) screenIntro.classList.remove('active');
    if (screenSim) screenSim.classList.add('active');
    setTimeout(() => {
      resizeRobotCanvas();
      updateAnglesAndKinematics();
    }, 100);
  });
}

if (btnBack) {
  btnBack.addEventListener('click', () => {
    if (screenSim) screenSim.classList.remove('active');
    if (screenIntro) screenIntro.classList.add('active');
  });
}

let panelsVisible = true;
if (btnTogglePanels) {
  btnTogglePanels.addEventListener('click', () => {
    panelsVisible = !panelsVisible;
    if (screenSim) {
      if (panelsVisible) {
        screenSim.classList.remove('panels-hidden');
        btnTogglePanels.innerText = '👁️ Panel: Visible';
      } else {
        screenSim.classList.add('panels-hidden');
        btnTogglePanels.innerText = '👁️ Panel: Oculto';
      }
    }
  });
}

const tabBtnControls = document.getElementById('tab-btn-controls');
const tabBtnDH = document.getElementById('tab-btn-dh');
const panelControls = document.getElementById('panel-controls');
const panelDH = document.getElementById('panel-dh');

if (tabBtnControls && tabBtnDH && panelControls && panelDH) {
  tabBtnControls.addEventListener('click', () => {
    tabBtnControls.classList.add('active');
    tabBtnDH.classList.remove('active');
    panelControls.classList.add('active');
    panelDH.classList.remove('active');
  });

  tabBtnDH.addEventListener('click', () => {
    tabBtnDH.classList.add('active');
    tabBtnControls.classList.remove('active');
    panelDH.classList.add('active');
    panelControls.classList.remove('active');
  });
}

// ==========================================
// 3. RENDERIZADOR 3D SÓLIDO Y ROBUSTO
// ==========================================
const robotCanvas = document.getElementById('robot-canvas');
const ctx = robotCanvas ? robotCanvas.getContext('2d') : null;

function resizeRobotCanvas() {
  if (!robotCanvas) return;
  robotCanvas.width = window.innerWidth;
  robotCanvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
  resizeRobotCanvas();
  if (window.innerWidth > 900) {
    if (panelControls) panelControls.classList.remove('active');
    if (panelDH) panelDH.classList.remove('active');
  } else if (panelControls && panelDH) {
    if (!panelControls.classList.contains('active') && !panelDH.classList.contains('active')) {
      panelControls.classList.add('active');
      if (tabBtnControls) tabBtnControls.classList.add('active');
    }
  }
});
resizeRobotCanvas();

const DH = { d1: 6.0, a2: 14.0, a3: 12.0 };
let currentAngles = { q1: 0, q2: 30, q3: -20, grip: 30 };
let isDemoRunning = false;
let demoStep = 0;
let showGrid = true;

let cameraOrbit = { yaw: Math.PI / 4, pitch: Math.PI / 6, distance: 45 };
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let touchStartDist = 0;

function sanitizeCamera() {
  if (typeof cameraOrbit.yaw !== 'number' || isNaN(cameraOrbit.yaw) || !isFinite(cameraOrbit.yaw)) {
    cameraOrbit.yaw = Math.PI / 4;
  }
  if (typeof cameraOrbit.pitch !== 'number' || isNaN(cameraOrbit.pitch) || !isFinite(cameraOrbit.pitch)) {
    cameraOrbit.pitch = Math.PI / 6;
  }
  if (typeof cameraOrbit.distance !== 'number' || isNaN(cameraOrbit.distance) || !isFinite(cameraOrbit.distance) || cameraOrbit.distance <= 0) {
    cameraOrbit.distance = 45;
  }
}

// CONTROLES DE MOUSE
if (robotCanvas) {
  robotCanvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  });

  robotCanvas.addEventListener('wheel', (e) => {
    const delta = e.deltaY * 0.04;
    if (typeof delta === 'number' && !isNaN(delta)) {
      cameraOrbit.distance = Math.max(15, Math.min(100, cameraOrbit.distance + delta));
    }
    sanitizeCamera();
  }, { passive: true });
}

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouse.x;
  const dy = e.clientY - lastMouse.y;
  if (typeof dx === 'number' && !isNaN(dx) && typeof dy === 'number' && !isNaN(dy)) {
    cameraOrbit.yaw += dx * 0.008;
    cameraOrbit.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraOrbit.pitch - dy * 0.008));
    lastMouse = { x: e.clientX, y: e.clientY };
  }
  sanitizeCamera();
});

window.addEventListener('mouseup', () => { isDragging = false; });

// CONTROLES TÁCTILES CON ACCESO SEGURO A TOUCHES[0]
if (robotCanvas) {
  robotCanvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      isDragging = true;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches && e.touches.length === 2) {
      isDragging = false;
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });
}

window.addEventListener('touchmove', (e) => {
  if (!e.touches) return;
  if (isDragging && e.touches.length === 1) {
    const dx = e.touches[0].clientX - lastMouse.x;
    const dy = e.touches[0].clientY - lastMouse.y;
    if (typeof dx === 'number' && !isNaN(dx) && typeof dy === 'number' && !isNaN(dy)) {
      cameraOrbit.yaw += dx * 0.008;
      cameraOrbit.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraOrbit.pitch - dy * 0.008));
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  } else if (e.touches.length === 2 && touchStartDist > 0) {
    const currentDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const delta = touchStartDist - currentDist;
    if (typeof delta === 'number' && !isNaN(delta)) {
      cameraOrbit.distance = Math.max(15, Math.min(100, cameraOrbit.distance + delta * 0.08));
      touchStartDist = currentDist;
    }
  }
  sanitizeCamera();
}, { passive: true });

window.addEventListener('touchend', () => { isDragging = false; });

// PROYECCIÓN 3D DE PUNTOS CON TRANSFORMACIÓN PERSPECTIVA
function project3D(x, y, z) {
  sanitizeCamera();
  const cy = Math.cos(cameraOrbit.yaw), sy = Math.sin(cameraOrbit.yaw);
  const cp = Math.cos(cameraOrbit.pitch), sp = Math.sin(cameraOrbit.pitch);

  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const y1 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;

  const w = robotCanvas ? robotCanvas.width : (window.innerWidth || 800);
  const h = robotCanvas ? robotCanvas.height : (window.innerHeight || 600);

  const scale = (Math.min(w, h) * 0.55) / cameraOrbit.distance;
  const cx = w / 2;
  const cyCenter = h / 2 + 30;

  const px = cx + x1 * scale;
  const py = cyCenter - y1 * scale;

  return {
    x: isNaN(px) ? w / 2 : px,
    y: isNaN(py) ? h / 2 : py,
    depth: isNaN(z2) ? 0 : z2,
    scale: scale
  };
}

function computeKinematics(q1Deg, q2Deg, q3Deg) {
  const q1 = (q1Deg * Math.PI) / 180;
  const q2 = (q2Deg * Math.PI) / 180;
  const q3 = (q3Deg * Math.PI) / 180;

  const P0 = { x: 0, y: 0, z: 0 };
  const P1 = { x: 0, y: DH.d1, z: 0 };
  
  const P2 = {
    x: DH.a2 * Math.cos(q1) * Math.cos(q2),
    y: DH.d1 + DH.a2 * Math.sin(q2),
    z: DH.a2 * Math.sin(q1) * Math.cos(q2)
  };

  const q23 = q2 + q3;
  const rArm = DH.a2 * Math.cos(q2) + DH.a3 * Math.cos(q23);
  const P3 = {
    x: rArm * Math.cos(q1),
    y: DH.d1 + DH.a2 * Math.sin(q2) + DH.a3 * Math.sin(q23),
    z: rArm * Math.sin(q1)
  };

  const c1 = Math.cos(q1), s1 = Math.sin(q1);
  const c23 = Math.cos(q23), s23 = Math.sin(q23);

  const T03 = [
    [ c1 * c23, -c1 * s23,  s1, P3.x ],
    [ s1 * c23, -s1 * s23, -c1, P3.z ],
    [ s23,       c23,       0,  P3.y ],
    [ 0,         0,         0,  1    ]
  ];

  return { P0, P1, P2, P3, T03 };
}

// RENDERIZADO 3D CON DIBUJO DE ESLABONES Y ARTICULACIONES SÓLIDAS
function renderRobot3D() {
  if (!ctx || !robotCanvas) return;
  ctx.clearRect(0, 0, robotCanvas.width, robotCanvas.height);

  const kin = computeKinematics(currentAngles.q1, currentAngles.q2, currentAngles.q3);

  // 1. DIBUJAR GRILLA DE PISO
  if (showGrid) {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)';
    ctx.lineWidth = 1;
    for (let i = -30; i <= 30; i += 6) {
      const pA = project3D(i, 0, -30), pB = project3D(i, 0, 30);
      ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();

      const pC = project3D(-30, 0, i), pD = project3D(30, 0, i);
      ctx.beginPath(); ctx.moveTo(pC.x, pC.y); ctx.lineTo(pD.x, pD.y); ctx.stroke();
    }
  }

  const p0 = project3D(kin.P0.x, kin.P0.y, kin.P0.z);
  const p1 = project3D(kin.P1.x, kin.P1.y, kin.P1.z);
  const p2 = project3D(kin.P2.x, kin.P2.y, kin.P2.z);
  const p3 = project3D(kin.P3.x, kin.P3.y, kin.P3.z);
  const pGround = project3D(kin.P3.x, 0, kin.P3.z);

  // 2. LÁSER DE GUÍA Y PUNTO EN EL PISO
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(pGround.x, pGround.y); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
  ctx.beginPath(); ctx.arc(pGround.x, pGround.y, 8, 0, Math.PI * 2); ctx.fill();

  // FUNCIÓN PARA DIBUJAR UN ESLABÓN SÓLIDO EN 3D CON DEGRADADO METÁLICO
  function drawSolidLink(pStart, pEnd, startWidth, endWidth, colorMain, colorHighlight) {
    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const nx = -dy / len;
    const ny = dx / len;

    const w1 = startWidth / 2;
    const w2 = endWidth / 2;

    const path = new Path2D();
    path.moveTo(pStart.x + nx * w1, pStart.y + ny * w1);
    path.lineTo(pEnd.x + nx * w2, pEnd.y + ny * w2);
    path.lineTo(pEnd.x - nx * w2, pEnd.y - ny * w2);
    path.lineTo(pStart.x - nx * w1, pStart.y - ny * w1);
    path.closePath();

    const grad = ctx.createLinearGradient(
      pStart.x + nx * w1, pStart.y + ny * w1,
      pStart.x - nx * w1, pStart.y - ny * w1
    );
    grad.addColorStop(0, colorMain);
    grad.addColorStop(0.5, colorHighlight);
    grad.addColorStop(1, colorMain);

    ctx.fillStyle = grad;
    ctx.fill(path);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke(path);
  }

  // 3. BASE ROBÓTICA SÓLIDA
  drawSolidLink(p0, p1, 28, 22, '#1e293b', '#475569');

  // ANILLO LED CIAN EN LA BASE
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(p1.x, p1.y, 14, 0, Math.PI * 2); ctx.stroke();

  // 4. ESLABÓN 1: HOMBRO -> CODO (AMARILLO INDUSTRIAL)
  drawSolidLink(p1, p2, 20, 16, '#d97706', '#fbbf24');

  // 5. ESLABÓN 2: CODO -> MUÑECA (CIAN METÁLICO)
  drawSolidLink(p2, p3, 14, 11, '#0284c7', '#38bdf8');

  // 6. ARTICULACIONES GIRATORIAS SÓLIDAS
  const drawSolidJoint = (p, radius, colorBase, colorGlow) => {
    const grad = ctx.createRadialGradient(p.x - radius * 0.3, p.y - radius * 0.3, radius * 0.1, p.x, p.y, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, colorGlow);
    grad.addColorStop(1, colorBase);

    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
  };

  drawSolidJoint(p1, 11, '#0284c7', '#38bdf8');
  drawSolidJoint(p2, 9, '#6d28d9', '#a78bfa');
  drawSolidJoint(p3, 7, '#be185d', '#f472b6');

  // 7. PINZA EFECTOR FINAL (GRIPPER)
  const gripGap = (currentAngles.grip / 100) * 12 + 6;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ec4899';
  ctx.beginPath(); ctx.moveTo(p3.x - gripGap, p3.y - 4); ctx.lineTo(p3.x - gripGap, p3.y + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p3.x + gripGap, p3.y - 4); ctx.lineTo(p3.x + gripGap, p3.y + 10); ctx.stroke();

  if (isDemoRunning) runAutoDemo();
  requestAnimationFrame(renderRobot3D);
}

// ==========================================
// 4. EVENTOS DE DESLIZADORES Y BOTONES
// ==========================================
const sliderQ1 = document.getElementById('slider-q1');
const sliderQ2 = document.getElementById('slider-q2');
const sliderQ3 = document.getElementById('slider-q3');
const sliderGrip = document.getElementById('slider-grip');

const valQ1 = document.getElementById('val-q1');
const valQ2 = document.getElementById('val-q2');
const valQ3 = document.getElementById('val-q3');
const valGrip = document.getElementById('val-grip');

function updateAnglesAndKinematics() {
  if (sliderQ1 && sliderQ2 && sliderQ3 && sliderGrip) {
    currentAngles.q1 = parseFloat(sliderQ1.value);
    currentAngles.q2 = parseFloat(sliderQ2.value);
    currentAngles.q3 = parseFloat(sliderQ3.value);
    currentAngles.grip = parseFloat(sliderGrip.value);
  }

  if (valQ1) valQ1.innerText = `${currentAngles.q1}°`;
  if (valQ2) valQ2.innerText = `${currentAngles.q2}°`;
  if (valQ3) valQ3.innerText = `${currentAngles.q3}°`;
  if (valGrip) valGrip.innerText = currentAngles.grip > 50 ? 'Abierta' : 'Cerrada';

  const dhQ1 = document.getElementById('dh-q1');
  const dhQ2 = document.getElementById('dh-q2');
  const dhQ3 = document.getElementById('dh-q3');
  if (dhQ1) dhQ1.innerText = `${currentAngles.q1}°`;
  if (dhQ2) dhQ2.innerText = `${currentAngles.q2}°`;
  if (dhQ3) dhQ3.innerText = `${currentAngles.q3}°`;

  const kin = computeKinematics(currentAngles.q1, currentAngles.q2, currentAngles.q3);

  const posX = document.getElementById('pos-x');
  const posY = document.getElementById('pos-y');
  const posZ = document.getElementById('pos-z');
  if (posX) posX.innerText = kin.P3.x.toFixed(2);
  if (posY) posY.innerText = kin.P3.y.toFixed(2);
  if (posZ) posZ.innerText = kin.P3.z.toFixed(2);

  const matrixContainer = document.getElementById('matrix-container');
  if (matrixContainer) {
    let html = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = kin.T03[r][c];
        html += `<div class="matrix-cell">${val.toFixed(2)}</div>`;
      }
    }
    matrixContainer.innerHTML = html;
  }
}

[sliderQ1, sliderQ2, sliderQ3, sliderGrip].forEach(s => {
  if (s) s.addEventListener('input', updateAnglesAndKinematics);
});

const btnHome = document.getElementById('btn-home');
if (btnHome) {
  btnHome.addEventListener('click', () => {
    isDemoRunning = false;
    if (sliderQ1) sliderQ1.value = 0;
    if (sliderQ2) sliderQ2.value = 30;
    if (sliderQ3) sliderQ3.value = -20;
    if (sliderGrip) sliderGrip.value = 30;
    updateAnglesAndKinematics();
  });
}

const btnGrid = document.getElementById('btn-grid');
if (btnGrid) {
  btnGrid.addEventListener('click', () => { showGrid = !showGrid; });
}

const btnDemo = document.getElementById('btn-demo');
if (btnDemo) {
  btnDemo.addEventListener('click', () => {
    isDemoRunning = !isDemoRunning;
    demoStep = 0;
  });
}

function runAutoDemo() {
  demoStep += 0.03;
  if (sliderQ1) sliderQ1.value = (Math.sin(demoStep) * 90).toFixed(0);
  if (sliderQ2) sliderQ2.value = (Math.sin(demoStep * 0.7) * 40 + 15).toFixed(0);
  if (sliderQ3) sliderQ3.value = (Math.cos(demoStep * 0.5) * 40 - 10).toFixed(0);
  if (sliderGrip) sliderGrip.value = ((Math.sin(demoStep * 2) + 1) * 50).toFixed(0);
  updateAnglesAndKinematics();
}

window.onload = () => {
  updateAnglesAndKinematics();
  renderRobot3D();
};