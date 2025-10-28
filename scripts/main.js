
// ----- Background grid with light effect -----
const bg = document.getElementById('bg');
const bgCtx = bg.getContext('2d');

// --- view state + helpers ---
let mode = 'home';            // current view
let prevMode = 'home';        // view we are transitioning from
let progress = 1;             // 0..1 transition progress
const TRANSITION_MS = 1200;   // feel free to tweak

// Fade timings (ms)
const FADE_OUT_MS = 1000;
const FADE_IN_MS  = 1000;
const BETWEEN_DELAY_MS = 500; // delay between fade-out and fade-in

const homeEl = document.getElementById('home');
const projectsEl = document.getElementById('projects');
const notesEl = document.getElementById('notes');

const projectsBtn = document.getElementById('openProjects');
const backBtn = document.getElementById('backHome');

const notesBtn = document.getElementById('openNotes');
const backBtn2 = document.getElementById('backHome2');

function startTransition(next) {
  if (mode === next) return;
  prevMode = mode;
  mode = next;
  progress = 0; // begin interpolation
}

// --- Functions to update badge ---
const badge = document.querySelector('.badge');
function setHome()       { badge.textContent = '/home'; }
function setProjects()   { badge.textContent = '/home/projects'; }
function setNotes()      { badge.textContent = '/home/notes'; }


// --- View switch functions ---
function showProjects() {
  startTransition('projects');
  homeEl.classList.add('fade-out');
  setTimeout(() => { homeEl.classList.add('hidden'); homeEl.classList.remove('fade-out'); }, FADE_OUT_MS);

  notesEl.classList.add('hidden');
  projectsEl.classList.remove('hidden','home');
  setTimeout(() => { projectsEl.classList.add('fade-in'); setTimeout(()=>projectsEl.classList.remove('fade-in'), FADE_IN_MS); }, BETWEEN_DELAY_MS);
}

function showNotes() {
  startTransition('notes');
  homeEl.classList.add('fade-out');
  setTimeout(() => { homeEl.classList.add('hidden'); homeEl.classList.remove('fade-out'); }, FADE_OUT_MS);

  projectsEl.classList.add('hidden2');
  notesEl.classList.remove('hidden','home');
  setTimeout(() => {notesEl.classList.add('fade-in');setTimeout(()=>notesEl.classList.remove('fade-in'), FADE_IN_MS);}, BETWEEN_DELAY_MS);
}

function showHome() {
  startTransition('home');
  homeEl.classList.remove('hidden');
  [projectsEl, notesEl].forEach(el => {
    el.classList.add('fade-out');
    setTimeout(() => { el.classList.add('hidden'); el.classList.remove('fade-out'); }, FADE_OUT_MS);
  });

  homeEl.classList.remove('hidden', 'hidden2');
  homeEl.classList.add('fade-in');
  setTimeout(() => homeEl.classList.remove('fade-in'), FADE_IN_MS);
}

openProjects.addEventListener('click', () => {
  setProjects();
});
backHome.addEventListener('click', () => {
  setHome();
});
openNotes.addEventListener('click', () => {
  setNotes();
});
backHome2.addEventListener('click', () => {
  setHome();
});

// --- Nav link listeners ---
document.querySelector('a[href="#projects"]').addEventListener('click', e => {
  e.preventDefault();
  setProjects();
  document.querySelector('#projects').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('a[href="#notes"]').addEventListener('click', e => {
  e.preventDefault();
  setNotes();
  document.querySelector('#notes').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('a[href="#about"]').addEventListener('click', e => {
  e.preventDefault();
  setHome();
  document.querySelector('#about').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('a[href="#contact"]').addEventListener('click', e => {
  e.preventDefault();
  setHome();
  document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
});

projectsBtn?.addEventListener('click', showProjects);
notesBtn?.addEventListener('click', showNotes);
backBtn?.addEventListener('click', showHome);
backBtn2?.addEventListener('click', showHome);


// CURVATURE MANIFOLD 

// Example wiring; keep your existing handlers and just add setCurvature(...)
projectsBtn.addEventListener('click', () => {
  setCurvature(-0.4, 2000);   // curve in
});
backBtn.addEventListener('click', () => {
  setCurvature(0.0, 1000);   // flatten out
});

// If Notes should also be curved:
notesBtn.addEventListener('click', () => {
  setCurvature(0.9, 2000);
});
backHome2.addEventListener('click', () => {
  setCurvature(0.0, 1000);
});

// --- Curved manifold mode ---
let curvature = 0; // 0 = flat grid, 1 = fully curved

// Smoothly animate curvature
function setCurvature(target = 0, duration = 600) {
  const start = performance.now();
  const from = curvature;
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    // easeInOut
    curvature = from + (target - from) * (t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2);
    requestAnimationFrame(() => { /* just trigger your next render */ });
  if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Nonlinear warp that gently curves the grid.
// It’s z -> z + k * s * z^2 with a tiny time-varying ripple for “alive” feel.
function warp(p, k, timeSec = 0) {
  const x = p[0], y = p[1];
  const s = 0.12;                // curvature strength scale
  const x2 = x*x - y*y;
  const y2 = 2*x*y;
  let nx = x + k * s * x2;
  let ny = y + k * s * y2;
  // subtle ripple so the manifold breathes
  nx += k * 0.05 * Math.sin(0.8*y + timeSec);
  ny += k * 0.05 * Math.sin(0.8*x - timeSec);
  return [nx, ny];
}

// Stroke a grid “line” as a polyline through warped points.
// `mapLinear` should be your existing linear transform (e.g. A*p).
function strokeWarpedLine(ctx, p0, p1, mapLinear, S, steps = 48, tSec = 0) {
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = p0[0] * (1 - u) + p1[0] * u;
    const py = p0[1] * (1 - u) + p1[1] * u;
    const qLin = mapLinear([px, py]);     // your existing linear mapping
    const q = warp(qLin, curvature, tSec);
    const sp = S(q);
    if (i === 0) ctx.moveTo(sp[0], sp[1]); else ctx.lineTo(sp[0], sp[1]);
  }
  ctx.stroke();
}

// CURVATURE


function easeInOut(t){ return t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

let lastTs = 0;

function tick(ts){
  if (!lastTs) lastTs = ts;
  const dt = Math.min(1, (ts - lastTs) / 1000); // seconds
  lastTs = ts;

  // animate anim toward target based on mode
  const dur = TRANSITION_MS / 500;
  if (progress < 1) {
    progress = Math.min(1, progress + dt / dur);
  }

  drawBG();
  requestAnimationFrame(tick);
}


function drawBG() {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = bg.getBoundingClientRect();
  bg.width = Math.floor(width * dpr);
  bg.height = Math.floor(height * dpr);
  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgCtx.clearRect(0, 0, width, height);

  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg');
  bgCtx.fillStyle = bgColor;
  bgCtx.fillRect(0, 0, width, height);

  // --- Per-page transform (interpolated) ---
  const s = 32;
  const t = Date.now() * 0.001;

  // Ease the interpolation between previous and next modes
  const k = easeInOut(progress);

  // Small ambient motion that is always present
  const baseRot = Math.sin(t * 0.2) * 0.06;
  const baseScl = 1.0 + 0.05 * Math.sin(t * 0.6);

  // Define target params for each page
  function paramsFor(view) {
    switch (view) {
      case 'projects':
        return { rot: 0.55, shx: 1.65, shy: 0.00, sclBoost: 0.5, tx: 0,  ty: 0  };
      case 'notes':
        return { rot: -0.20, shx: 0.50, shy: 0.25, sclBoost: 0.2, tx: 60, ty: -30 };
      default: // 'home'
        return { rot: 0.00, shx: 0.00, shy: 0.00, sclBoost: 0.00, tx: 0,  ty: 0  };
    }
  }

  // Lerp helper
  const lerp = (a, b, p) => a + (b - a) * p;

  // Blend from prevMode → mode
  const A = paramsFor(prevMode);
  const B = paramsFor(mode);

  const rot = baseRot + lerp(A.rot,      B.rot,      k);
  const shx =           lerp(A.shx,      B.shx,      k);
  const shy =           lerp(A.shy,      B.shy,      k);
  const scl =  baseScl * (1 + lerp(A.sclBoost, B.sclBoost, k));
  const tx  =           lerp(A.tx,       B.tx,       k);
  const ty  =           lerp(A.ty,       B.ty,       k);

  // Build matrix (rotation+scale with optional X/Y shear)
  const cosA = Math.cos(rot) * scl;
  const sinA = Math.sin(rot) * scl;

  const M = [
    [cosA + shx * sinA, -sinA + shy * cosA],
    [sinA + shx * cosA,  cosA + shy * sinA]
  ];

  function applyTransform(p) {
    return [
      p[0] * M[0][0] + p[1] * M[0][1],
      p[0] * M[1][0] + p[1] * M[1][1]
    ];
  }

  const cx = width / 2 + tx;
  const cy = height / 2 + ty;

  // ---------- Curvature helpers (local to keep changes minimal) ----------
  // Global curvature (0..1) if present; default 0 for flat
  const kCurv = (typeof curvature === 'number') ? curvature : 0;

  // Warp after the linear transform (M), in a normalized space so curvature is resolution-independent
  function warp(p, k, timeSec) {
    // normalize to ~[-1..1] across screen
    const norm = 1 / Math.max(width, height);
    let x = p[0] * norm;
    let y = p[1] * norm;

    // Complex quadratic + subtle time ripple (gentle manifold feel)
    // z -> z + k * s * z^2, with tiny breathing
    const sC = 0.9; // overall warp scale (tweak)
    const x2 = x*x - y*y;
    const y2 = 2*x*y;

    let nx = x + k * sC * x2;
    let ny = y + k * sC * y2;

    // breathing
    nx += k * 0.035 * Math.sin(0.9*y + timeSec * 0.9);
    ny += k * 0.035 * Math.sin(0.9*x - timeSec * 0.9);

    // denormalize back to pixels
    return [nx / norm, ny / norm];
  }

  // Stroke a curved line by sampling points between p0 and p1 (pre-transform)
  function strokeWarpedLine(p0, p1, steps) {
    bgCtx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const px = p0[0] * (1 - u) + p1[0] * u;
      const py = p0[1] * (1 - u) + p1[1] * u;
      const lin = applyTransform([px, py]);      // your existing linear map
      const cur = warp(lin, kCurv, t);           // then curvature warp
      const X = cx + cur[0];
      const Y = cy + cur[1];
      if (i === 0) bgCtx.moveTo(X, Y); else bgCtx.lineTo(X, Y);
    }
    bgCtx.stroke();
  }
  // ----------------------------------------------------------------------

  // --- Draw glowing grid lines (now curved) ---
  const baseColor1 = [62,39,79];
  const baseColor2 = [73,42,96];

  // verticals
  for (let x = -width; x < width; x += s) {
    const alpha = 0.55 + 0.25 * Math.sin((x + t * 50) * 0.01);
    bgCtx.strokeStyle = `rgba(${baseColor1[0]},${baseColor1[1]},${baseColor1[2]},${alpha})`;
    // sample along y
    strokeWarpedLine([x, -height], [x, height], 56);
  }

  // horizontals
  for (let y = -height; y < height; y += s) {
    const alpha = 0.55 + 0.25 * Math.sin((y - t * 40) * 0.01);
    bgCtx.strokeStyle = `rgba(${baseColor2[0]},${baseColor2[1]},${baseColor2[2]},${alpha})`;
    // sample along x
    strokeWarpedLine([-width, y], [width, y], 56);
  }

  // soft vignette overlay
  const grd = bgCtx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.8);
  grd.addColorStop(0, 'rgba(11,15,23,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.4)');
  bgCtx.fillStyle = grd;
  bgCtx.fillRect(0, 0, width, height);

  // request next frame for continuous motion
  // requestAnimationFrame(drawBG);
}


// keep your existing resize handler; just call drawBG once to reflow
window.addEventListener('resize', () => drawBG());

// kick things off
requestAnimationFrame(tick);


function resizeBG(){bg.style.width='100%';bg.style.height='100%';drawBG();}


// ----- Simple 2D linear transform demo -----
// --- Fixed image setup ---
const img = new Image();
let imgReady = false;
img.src = "media/me.jpeg"; // change path to your image
img.onload = () => { imgReady = true; render(); };
img.onerror = () => console.warn("Could not load fixed image");

const c = document.getElementById('demo'); const ctx = c.getContext('2d');

function render(){
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  c.width = Math.floor(rect.width * dpr);
  c.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = rect.width, H = rect.height;
  // background
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg');
  ctx.fillRect(0, 0, W, H);

  // read matrix + vector
  const A = [[n('a11'), n('a12')],[n('a21'), n('a22')]];
  const v = [n('vx'), n('vy')];
  const Av = [A[0][0]*v[0] + A[0][1]*v[1], A[1][0]*v[0] + A[1][1]*v[1]];
  document.getElementById('out').textContent = `Av = [${Av[0].toFixed(2)}, ${Av[1].toFixed(2)}]`;

  // nothing to draw until an image is loaded
  if (!imgReady) {
    // helpful placeholder
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('Choose an image to transform', W/2, H/2);
    return;
  }

  // center + scale-to-fit BEFORE transform, then apply A and translation v
  const ox = W/2, oy = H/2;
  const unit = Math.min(W, H) / 8;        // "grid unit" so v behaves like before
  const zoom = Math.min((W*0.6)/img.width, (H*0.6)/img.height); // fit nicely

  ctx.save();
  ctx.translate(ox, oy);

  // Apply 2×2 matrix A (Canvas2D uses [a c b d e f])
  // [x', y'] = [a11*x + a12*y, a21*x + a22*y]
  ctx.transform(A[0][0], A[1][0], A[0][1], A[1][1], v[0]*unit, v[1]*unit);

  // draw image centered at origin, scaled
  const iw = img.width * zoom;
  const ih = img.height * zoom;
  ctx.drawImage(img, -iw/2, -ih/2, iw, ih);

  ctx.restore();

  // optional: subtle border to show canvas bounds
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W-1, H-1);
}




function n(id){return parseFloat(document.getElementById(id).value)}
['a11','a12','a21','a22','vx','vy'].forEach(id=>document.getElementById(id).addEventListener('input', render));
const y = document.getElementById('year'); y.textContent = new Date().getFullYear();
function fitCanvases(){const w=Math.max(document.documentElement.clientWidth, window.innerWidth||0);const h=Math.max(document.documentElement.clientHeight, window.innerHeight||0);bg.style.width=w+'px';bg.style.height=h+'px';drawBG();render();}
window.addEventListener('resize', fitCanvases); fitCanvases();

(function () {
  const bgEl = document.getElementById('bg');

  // Collect views
  const views = {
    home: document.getElementById('homeView'),
    projects: document.getElementById('projects'),
    notes: document.getElementById('notes')
  };

  // Ensure Projects/Notes participate as "views"
  ['projects', 'notes'].forEach(v => views[v]?.classList.add('view', 'hidden'));

  // Initial state
  let current = (location.hash.replace('#', '') || 'home');
  if (!views[current]) current = 'home';

  function setBg(view) {
    bgEl.classList.remove('bg-home', 'bg-projects', 'bg-notes');
    bgEl.classList.add(`bg-${view}`);
  }

  function updateBadge() {
      const badge = document.querySelector('header .badge');
      if (badge) badge.textContent = `/${current}`;
    }

    async function switchView(next) {
    if (!views[next] || next === current) return;

    const curEl = views[current];
    const nextEl = views[next];

    // fade out current
    if (curEl) {
      curEl.classList.add('fade-out');
      await new Promise(r => setTimeout(r, FADE_OUT_MS));
      curEl.classList.add('hidden');
      curEl.classList.remove('fade-out');
    }

    // optional gap between views
    if (BETWEEN_DELAY_MS) await new Promise(r => setTimeout(r, BETWEEN_DELAY_MS));

    // transform background as you do now
    setBg(next);

    // fade in next
    nextEl.classList.remove('hidden');
    nextEl.classList.add('fade-in');

    // allow paint (1–2 rafs is more robust than 20ms magic number)
    await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));

    await new Promise(r => setTimeout(r, FADE_IN_MS));
    nextEl.classList.remove('fade-in');

    current = next;
    history.pushState({ view: next }, '', `#${next}`);
  }

  // Hook header nav: #projects and #notes go to their views; others stay on home and scroll
  document.querySelectorAll('nav a[href^="#"]').forEach(a => {
    const target = a.getAttribute('href').slice(1);
    if (['projects', 'notes'].includes(target)) {
      a.addEventListener('click', e => {
        e.preventDefault();
        switchView(target);
      });
    } else {
      a.addEventListener('click', e => {
        e.preventDefault();
        switchView('home').then(() => {
          const el = document.getElementById(target);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  });

  // Hook Home buttons
  document.getElementById('openProjects')?.addEventListener('click', () => switchView('projects'));
  document.getElementById('openNotes')?.addEventListener('click', () => switchView('notes'));

  // Hook "Back" buttons inside Projects/Notes (you have two with the same id; target by container)
  document.querySelectorAll('#projects .btn.outline, #notes .btn.outline').forEach(btn => {
    btn.addEventListener('click', () => switchView('home'));
  });

  // Handle browser navigation
  window.addEventListener('popstate', (e) => {
    const target = e.state?.view || (location.hash.replace('#', '') || 'home');
    if (views[target]) switchView(target);
  });

  // First paint
  Object.entries(views).forEach(([k, el]) => {
    if (!el) return;
    if (k === current) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
  setBg(current);
  updateBadge();
})();


// --- Icons
lucide.createIcons();