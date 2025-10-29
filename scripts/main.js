
// ----- Background grid with light effect -----
const bg = document.getElementById('bg');
const bgCtx = bg.getContext('2d');

// --- view state + helpers ---
let mode = 'home';            // current view
let prevMode = 'home';        // view we are transitioning from
let progress = 1;             // 0..1 transition progress
const TRANSITION_MS = 800;   // feel free to tweak

// Fade timings (ms)
const FADE_OUT_MS = 1000;
const FADE_IN_MS  = 1000;
const BETWEEN_DELAY_MS = 100; // delay between fade-out and fade-in

const homeEl = document.getElementById('home');
const projectsEl = document.getElementById('projects');
const notesEl = document.getElementById('notes');

const projectsBtn = document.getElementById('openProjects');
const backBtn = document.getElementById('backHome');

const notesBtn = document.getElementById('openNotes');
const backBtn2 = document.getElementById('backHome2');

// --- Curved manifold mode ---
let curvature = 0.0; // 0 = flat grid, 1 = fully curved
const CURVATURE_BY_VIEW = { home: 0.0, projects: -0.45, notes: 0.65 };

// --- Functions to update badge ---
const badge = document.querySelector('.badge');
const BADGE = {home: '/home', projects: '/home/projects', notes: '/home/notes'};







function startTransition(next) {
  if (mode === next) return;
  prevMode = mode;
  mode = next;
  progress = 0; // begin interpolation
}


// projectsBtn?.addEventListener('click', () => switchView('projects'));
// notesBtn?.addEventListener('click', () => switchView('notes'));
// backBtn?.addEventListener('click', () => switchView('home'));
// backBtn2?.addEventListener('click', () => switchView('home'));



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
  const baseRot = Math.sin(t * 0.2) * 0.09;
  const baseScl = 1.05 + 0.0005 * Math.sin(t * 0.6);

  // Define target params for each page
  function paramsFor(view) {
    switch (view) {
      case 'projects':
        return { rot: 0.35, shx: 1.65, shy: 0.00, sclBoost: 0.2, tx: 10,  ty: -60  };
      case 'notes':
        return { rot: -0.20, shx: 0.50, shy: 0.25, sclBoost: 0.25, tx: 60, ty: -30 };
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

  let current = (location.hash.replace('#', '') || 'home');
  if (!['home','projects','notes'].includes(current)) current = 'home';
  mode = current;       // <- add this
  prevMode = current;   // <- add this
  progress = 1;         // <- add this (already “arrived”)
  setCurvature(CURVATURE_BY_VIEW[current] ?? 0, 0);

  function setBg(view) {
    bgEl.classList.remove('bg-home', 'bg-projects', 'bg-notes');
    bgEl.classList.add(`bg-${view}`);
  }

  function updateBadge() {
      const badge = document.querySelector('header .badge');
      if (badge) badge.textContent = `/${current}`;
    }

  // View Switching Logic  
  async function switchView(next) {
    const views = { home: homeEl, projects: projectsEl, notes: notesEl };
    if (!views[next]) next = 'home';
    if (next === (mode || 'home')) return;

    // Start BG transition (used by drawBG)
    prevMode = mode;
    mode = next;
    progress = 0;

    // Keep 'home' marker in sync, so home styles don't leak into other views
    (['home','projects','notes']).forEach(v => {
      const el = { home: homeEl, projects: projectsEl, notes: notesEl }[v];
      if (!el) return;
      if (v === next) el.classList.add('home'); else el.classList.remove('home');
    });


    // Update badge & curvature target
    if (badge) badge.textContent = BADGE[next] || '/home';
    setCurvature(CURVATURE_BY_VIEW[next] ?? 0, 1000);

    // Fade out current
    const curEl = views[prevMode] || views.home;
    const nextEl = views[next];

    if (curEl) {
      curEl.classList.add('fade-out');
      await new Promise(r => setTimeout(r, FADE_OUT_MS));
      curEl.classList.add('hidden');
      curEl.classList.remove('fade-out');
    }

    if (BETWEEN_DELAY_MS) await new Promise(r => setTimeout(r, BETWEEN_DELAY_MS));

    // Fade in next
    nextEl.classList.remove('hidden', 'hidden2');
    nextEl.classList.add('fade-in');
    // let layout settle before timing the fade
    await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, FADE_IN_MS));
    nextEl.classList.remove('fade-in');

    history.pushState({ view: next }, '', next === 'home' ? '#home' : `#${next}`);
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






// Load Lucide only if needed
(function ensureLucide(cb){
  if (window.lucide && lucide.createIcons) return cb();
  var s=document.createElement('script'); s.src='https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
  s.onload=cb; document.head.appendChild(s);
})(function(){ lucide.createIcons(); });

// Data
const DATA = {
  books: [
    { name: "The Hitchhiker's Guide Trilogy of Five", mag: 0.99 },
    { name: "Thinking Fast and Slow", mag: 0.9 },
    { name: "Ansichten der Natur", mag: 0.5 },
    { name: "The Power of Geography", mag: 0.6 },
    { name: "Before the Coffee gets Cold", mag: 0.7 }
  ],
  travel: [
    { name: "La Paz, Bolivia", mag: 0.8 },
    { name: "Tbilisi, Georgia", mag: 0.8 },
    { name: "Vienna, Austria", mag: 0.9 },
    { name: "Cusco, Peru", mag: 0.8 },
    { name: "Galle, Sri Lanka", mag: 0.7 },
    { name: "Shenzhen, China", mag: 0.6 }
  ],
  research: [
    { name: "Robotics Software", mag: 0.99 },
    { name: "(Sampling-based) MPC", mag: 0.88 },
    { name: "Optimal Transport", mag: 0.6 },
    { name: "Geometric Deep Learning", mag: 0.7 },
  ],
  tools: [
    { name: "Linux (Ubuntu, Arch)", mag: 0.95 },
    { name: "Python, C++", mag: 0.85 },
    { name: "VS Code", mag: 0.75 },
    { name: "Obsidian", mag: 0.99 },
    { name: "Figma, DrawIO, LaTeX", mag: 0.3 }
  ],
  constants: [
    { name: "Family & Friends", mag: 1.0 },
    { name: "Flat White", mag: 0.8 },
    { name: "Gym", mag: 0.9 },
    { name: "NFL (Houston Texans)", mag: 0.8 },
    { name: "Kimchi", mag: 0.5 }
  ]
};

const vPretty = {
  books: "v₁ (Books)",
  travel: "v₂ (Travel)",
  research: "v₃ (Research)",
  tools: "v₄ (Software)",
  constants: "v₅ (Constants)"
};

// Elements
const dropdown  = document.querySelector(".vec-dropdown");
const trigger   = document.getElementById("vec-trigger");
const menu      = document.getElementById("vec-menu");
const rhs       = document.getElementById("rhs");
const vLabel    = document.getElementById("v-label");

function renderRHS(key) {
  const items = DATA[key] || [];
  if (!items.length) { rhs.innerHTML = `<span class="muted">No eigenvalues found.</span>`; return; }
  rhs.innerHTML = `
    <div class="sum">
      ${items.map((it, idx) => `
        <div class="term">
          <div class="lambda">λ<sub>${idx+1}</sub></div>
          <div class="val">
            <div>${it.name}</div>
            <div class="bar" style="width:${Math.round(100*it.mag)}%"></div>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function openMenu(open) {
  dropdown.dataset.open = String(open);
  trigger.setAttribute("aria-expanded", String(open));
  if (open) {
    menu.style.pointerEvents = "auto";
    menu.focus({preventScroll:true});
  } else {
    menu.style.pointerEvents = "none";
  }
}

function selectItem(li) {
  if (!li) return;
  // Read stable attributes from the LI itself
  const key = li.dataset.key;
  const iconName = li.dataset.icon || "sparkles";
  const label = (li.querySelector("span")?.textContent || key).trim();

  // Visual state in the menu
  menu.querySelectorAll("li[role='option']").forEach(x => x.removeAttribute("aria-selected"));
  li.setAttribute("aria-selected","true");

  // Update trigger (icon + label)
  trigger.querySelector(".vec-trigger-icon").innerHTML = `<i data-lucide="${iconName}"></i>`;
  trigger.querySelector(".vec-trigger-label").textContent = label;

  // Re-render icons after DOM change
  if (window.lucide && lucide.createIcons) { lucide.createIcons(); }

  // Update equation RHS
  vLabel.textContent = vPretty[key] || "v";
  renderRHS(key);

  // Close menu
  openMenu(false);
}

// Events
trigger.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = dropdown.dataset.open === "true";
  openMenu(!open);
});

menu.addEventListener("click", (e) => {
  const li = e.target.closest("li[role='option']");
  if (li) selectItem(li);
});

// Close on outside click
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target)) openMenu(false);
});

// Keyboard navigation
menu.addEventListener("keydown", (e) => {
  const items = Array.from(menu.querySelectorAll("li"));
  const idx = items.findIndex(x => x.getAttribute("aria-selected")==="true");
  if (e.key === "Escape") { openMenu(false); trigger.focus(); }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    const next = items[Math.max(0, Math.min(items.length-1, (idx<0?0:idx+1)))];
    items.forEach(x=>x.removeAttribute("aria-selected")); next.setAttribute("aria-selected","true"); next.scrollIntoView({block:"nearest"});
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    const prev = items[Math.max(0, (idx<0?0:idx-1))];
    items.forEach(x=>x.removeAttribute("aria-selected")); prev.setAttribute("aria-selected","true"); prev.scrollIntoView({block:"nearest"});
  }
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    const current = items.find(x => x.getAttribute("aria-selected")==="true") || items[0];
    if (current) selectItem(current);
  }
});

// Ensure icons render after DOM changes
document.addEventListener("DOMContentLoaded", () => { if (window.lucide) lucide.createIcons(); });