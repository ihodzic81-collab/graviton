// Animacija pozadine: lebdeće platforme, čestice i svetlosni tragovi.
// Optimizovano za telefone.

export function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let particles = [];
  let running = true;

  const reduceMotion = () =>
    document.body.classList.contains("reduced-motion") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function resize() {
    W = canvas.clientWidth = window.innerWidth;
    H = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawnParticles();
  }

  function spawnParticles() {
    const count = Math.min(60, Math.floor((W * H) / 22000));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.4,
        vy: Math.random() * 0.25 + 0.05,
        vx: (Math.random() - 0.5) * 0.15,
        hue: Math.random() < 0.6 ? 275 : 195,
        a: Math.random() * 0.5 + 0.2
      });
    }
  }

  function drawPlatform(x, y, w, h, hue, alpha) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, `hsla(${hue}, 90%, 65%, ${alpha})`);
    g.addColorStop(1, `hsla(${hue + 20}, 90%, 35%, ${alpha * 0.6})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    ctx.strokeStyle = `hsla(${hue + 40}, 100%, 80%, ${alpha * 0.7})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const platforms = [
    { x: 0.08, y: 0.62, w: 0.22, h: 0.03, hue: 275 },
    { x: 0.62, y: 0.55, w: 0.26, h: 0.03, hue: 195 },
    { x: 0.35, y: 0.78, w: 0.30, h: 0.03, hue: 315 },
    { x: 0.75, y: 0.80, w: 0.18, h: 0.03, hue: 260 }
  ];

  let t = 0;

  function frame() {
    if (!running) return;
    t += 0.006;

    ctx.clearRect(0, 0, W, H);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0a0420");
    sky.addColorStop(0.55, "#120635");
    sky.addColorStop(1, "#07030f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5, cy = H * 0.32;
    const rOuter = Math.min(W, H) * 0.42;
    const pulse = reduceMotion() ? 1 : (0.9 + Math.sin(t * 1.4) * 0.1);

    const ring = ctx.createRadialGradient(cx, cy, rOuter * 0.1, cx, cy, rOuter * pulse);
    ring.addColorStop(0, "rgba(155,77,255,0)");
    ring.addColorStop(0.55, "rgba(155,77,255,0.18)");
    ring.addColorStop(0.85, "rgba(42,209,255,0.28)");
    ring.addColorStop(1, "rgba(255,62,200,0)");
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, W, H);

    platforms.forEach((p, i) => {
      const yy = H * p.y + Math.sin(t * 0.6 + i) * 6;
      drawPlatform(W * p.x, yy, W * p.w, Math.max(8, H * p.h), p.hue, 0.7);
    });

    for (const pt of particles) {
      pt.y -= pt.vy;
      pt.x += pt.vx;
      if (pt.y < -10) { pt.y = H + 10; pt.x = Math.random() * W; }
      ctx.beginPath();
      ctx.fillStyle = `hsla(${pt.hue}, 100%, 75%, ${pt.a})`;
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const orbX = W * 0.5 + (reduceMotion() ? 0 : Math.sin(t * 0.8) * W * 0.06);
    const orbY = H * 0.60 + (reduceMotion() ? 0 : Math.cos(t * 1.1) * 8);
    const orbR = Math.min(W, H) * 0.045;

    const orbG = ctx.createRadialGradient(orbX - orbR * 0.3, orbY - orbR * 0.3, orbR * 0.1, orbX, orbY, orbR);
    orbG.addColorStop(0, "#ffffff");
    orbG.addColorStop(0.5, "#c7a4ff");
    orbG.addColorStop(1, "#6b2cf5");
    ctx.fillStyle = orbG;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
    ctx.fill();

    const glow = ctx.createRadialGradient(orbX, orbY, orbR, orbX, orbY, orbR * 4);
    glow.addColorStop(0, "rgba(155,77,255,0.35)");
    glow.addColorStop(1, "rgba(155,77,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbR * 4, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  resize();
  requestAnimationFrame(frame);
}
