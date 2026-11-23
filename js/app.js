/* =====================================================
   app.js — Fireworks, QR code, gallery event listeners
   ===================================================== */

/* Fireworks */
(function () {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var c = document.getElementById('fwc'), x = c.getContext('2d'), P = [], R = [], D = 1, W = 0, H = 0;
  var COL = ['255,214,102', '255,107,107', '255,255,255', '255,160,90', '255,120,200'];
  function rs() { D = window.devicePixelRatio || 1; W = c.width = innerWidth * D; H = c.height = innerHeight * D; }
  rs(); addEventListener('resize', rs);
  function launch() { R.push({ x: W * (.08 + Math.random() * .84), y: H, vy: -H * (.011 + Math.random() * .005), ty: H * (.12 + Math.random() * .35), c: COL[Math.random() * 5 | 0] }); }
  function boom(r) { var n = 70, sp = (2 + Math.random() * 2.2) * D; for (var i = 0; i < n; i++) { var a = i / n * 6.283, v = sp * (.6 + Math.random() * .4); P.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c: r.c }); } }
  function tick() {
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    if (Math.random() < .014 && R.length < 3) launch();
    R = R.filter(function (r) { r.y += r.vy; r.vy *= .987; x.fillStyle = 'rgba(' + r.c + ',.9)'; x.beginPath(); x.arc(r.x, r.y, 2 * D, 0, 6.283); x.fill(); if (r.y <= r.ty) { boom(r); return false; } return true; });
    P = P.filter(function (p) { p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vy = p.vy * .985 + .035 * D; p.l -= .011; if (p.l <= 0) return false; x.fillStyle = 'rgba(' + p.c + ',' + p.l + ')'; x.beginPath(); x.arc(p.x, p.y, 1.8 * D, 0, 6.283); x.fill(); return true; });
    requestAnimationFrame(tick);
  }
  tick();
})();

/* QR Code */
(function () {
  var qrbtn  = document.getElementById('qrbtn');
  var qrmodal = document.getElementById('qrmodal');
  var qrclose = document.getElementById('qrclose');
  var qrcanvas = document.getElementById('qrcanvas');
  if (!qrbtn) return;

  qrbtn.onclick = function () {
    QRCode.toCanvas(qrcanvas, window.location.href, { width: 220, margin: 2, color: { dark: '#2b0a12', light: '#fff3dc' } }, function (err) { if (err) console.error(err); });
    qrmodal.classList.remove('hidden');
  };
  qrclose.onclick = function () { qrmodal.classList.add('hidden'); };
  qrmodal.addEventListener('click', function (e) { if (e.target === qrmodal) qrmodal.classList.add('hidden'); });
})();

/* Gallery / Photo Wall */
(function () {
  var DESK = window.matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)');

  function openG() {
    if (!DESK.matches) return;
    renderW();
    document.getElementById('wall').classList.remove('hidden');
    document.getElementById('fwc').classList.add('over');
  }

  document.getElementById('gal').onclick  = openG;
  document.getElementById('gal2').onclick = openG;
  startGalleryPolling();

  document.getElementById('wclose').onclick = function () {
    document.getElementById('wall').classList.add('hidden');
    document.getElementById('fwc').classList.remove('over');
  };
  document.getElementById('lbx').onclick   = function () { document.getElementById('lb').classList.add('hidden'); };
  document.getElementById('lbdel').onclick = function () { softDeleteCurrent(); };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!document.getElementById('lb').classList.contains('hidden')) document.getElementById('lb').classList.add('hidden');
      else { document.getElementById('wall').classList.add('hidden'); document.getElementById('fwc').classList.remove('over'); }
    }
  });
})();
