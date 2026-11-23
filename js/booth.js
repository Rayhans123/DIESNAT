/* =====================================================
   booth.js — Kamera, foto strip, canvas, IndexedDB
   ===================================================== */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var gen = 0, shots = [], stream = null, busy = false, S = { fx: 'none', fr: '#f4c95d', st: '' };
  var FX = [['none', 'Normal'], ['grayscale(1) contrast(1.1)', 'B&W'], ['sepia(.5) saturate(1.4)', 'Warm'], ['contrast(1.2) saturate(1.7)', 'Pop']];
  var FR = ['#f4c95d', '#b3122b', '#2b0a12', '#ff8a7a', '#fff3dc'];
  var ST = [['', 'None'], ['★', 'Stars'], ['♥', 'Hearts'], ['♦', 'Cards']];

  function show(n) {
    [1, 2, 4].forEach(function (i) { $('s' + i).classList.toggle('hidden', i !== n); $('d' + i).classList.toggle('on', i <= n); });
    $('app').classList.toggle('wide', n === 2); window.scrollTo(0, 0);
  }

  function mk(list, box, key, swatch) {
    list.forEach(function (it) {
      var b = document.createElement('button'); b.className = 'chip' + (swatch ? ' sw' : ''); b.type = 'button';
      var v = swatch ? it : it[0];
      if (swatch) { b.style.background = it; b.setAttribute('aria-label', 'Frame ' + it); } else b.textContent = it[1];
      b.setAttribute('aria-pressed', S[key] === v);
      b.onclick = function () { S[key] = v; [].forEach.call(box.children, function (c) { c.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); draw($('pv'), .5); };
      box.appendChild(b);
    });
  }
  mk(FX, $('fx'), 'fx'); mk(FR, $('fr'), 'fr', true); mk(ST, $('st'), 'st');

  function thumbs() {
    var t = $('th'); t.innerHTML = '';
    for (var i = 0; i < 4; i++) { var d = document.createElement('div'); if (shots[i]) d.style.backgroundImage = 'url(' + shots[i].src + ')'; else d.textContent = i + 1; t.appendChild(d); }
    $('n').textContent = shots.length; $('retake').classList.toggle('hidden', !shots.length); draw($('pv'), .5); $('done').disabled = shots.length < 4;
  }

  async function cam() {
    $('snap').disabled = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
      $('vid').srcObject = stream; $('camMsg').textContent = 'Ready? Tap Snap and hit your pose.';
    } catch (e) { $('camMsg').textContent = 'Camera unavailable here. Go back and pick photos from your gallery instead.'; $('snap').disabled = true; }
  }

  function stop() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }

  function load(src) { return new Promise(function (r) { var im = new Image(); im.onload = function () { r(im); }; im.src = src; }); }

  async function grab() {
    var v = $('vid'), c = document.createElement('canvas'); c.width = 800; c.height = 600; var x = c.getContext('2d');
    var vw = v.videoWidth || 800, vh = v.videoHeight || 600, s = Math.max(800 / vw, 600 / vh), w = vw * s, h = vh * s;
    x.translate(800, 0); x.scale(-1, 1); x.drawImage(v, (800 - w) / 2, (600 - h) / 2, w, h);
    shots.push(await load(c.toDataURL('image/jpeg', .9))); thumbs();
  }

  $('snap').onclick = async function () {
    if (busy || shots.length >= 4) return; busy = true; $('snap').disabled = true; var g = gen;
    for (var c = 3; c > 0; c--) { $('cnt').textContent = c; await new Promise(function (r) { setTimeout(r, 900); }); if (g !== gen) { $('cnt').textContent = ''; busy = false; $('snap').disabled = false; return; } }
    $('cnt').textContent = ''; $('fl').classList.remove('on'); void $('fl').offsetWidth; $('fl').classList.add('on');
    await grab(); busy = false; $('snap').disabled = false;
    if (shots.length >= 4) { stop(); $('snap').disabled = true; $('camMsg').textContent = 'All 4 shots done! Pick a filter and frame on the right page, then tap Finish.'; }
  };

  $('back2').onclick = function () { gen++; stop(); shots = []; thumbs(); $('cnt').textContent = ''; show(1); };
  $('retake').onclick = function () { shots = []; thumbs(); if (!stream) cam(); };
  $('start').onclick = function () { openBook(); thumbs(); cam(); };

  function draw(cv, sc) {
    var W = 540, P = 30, PW = 480, PH = 360, G = 20, H = P + 4 * PH + 3 * G + 110;
    cv.width = W * sc * 2; cv.height = H * sc * 2; var k = sc * 2, x = cv.getContext('2d'); x.scale(k, k);
    x.fillStyle = S.fr; x.fillRect(0, 0, W, H);
    var dark = S.fr === '#2b0a12' || S.fr === '#b3122b';
    shots.forEach(function (im, i) {
      var y = P + i * (PH + G); x.save(); x.beginPath(); x.rect(P, y, PW, PH); x.clip();
      if ('filter' in x) x.filter = S.fx;
      var s = Math.max(PW / im.width, PH / im.height), w = im.width * s, h = im.height * s;
      x.drawImage(im, P + (PW - w) / 2, y + (PH - h) / 2, w, h); x.restore();
      x.lineWidth = 5; x.strokeStyle = '#2b0a12'; x.strokeRect(P, y, PW, PH);
      if (S.st) {
        x.font = 'bold 64px sans-serif'; x.fillStyle = '#f4c95d'; x.strokeStyle = '#2b0a12'; x.lineWidth = 5;
        [[P + 8, y + 66], [P + PW - 72, y + PH - 14]].forEach(function (p) { x.strokeText(S.st, p[0], p[1]); x.fillText(S.st, p[0], p[1]); });
      }
    });
    x.fillStyle = dark ? '#fff3dc' : '#2b0a12'; x.textAlign = 'center';
    x.font = '900 34px "Trebuchet MS",sans-serif'; x.fillText('SNAP BOOTH', W / 2, H - 52);
    x.font = '700 20px "Trebuchet MS",sans-serif'; x.fillText(new Date().toLocaleDateString(), W / 2, H - 22);
  }

  var blob = null;
  $('done').onclick = function () {
    draw($('pv'), 1);
    var stripId = Date.now(), curFx = S.fx, curFr = S.fr, curSt = S.st;
    $('pv').toBlob(function (b) {
      blob = b; $('out').src = URL.createObjectURL(b);
      var file = new File([b], 'strip-' + stripId + '.png', { type: 'image/png' });
      uploadPhoto(file).catch(function (e) { console.error('[Supabase]', e); });
    }, 'image/png');
    var sh = shots.slice(), fx = curFx;
    $('pv').toBlob(function (j) { if (!j) return; Promise.all(sh.map(function (im) { return mini(im, fx); })).then(function (ps) { put({ id: stripId, blob: j, photos: ps }); }); }, 'image/jpeg', .85);
    draw($('pv'), .5); show(4); confetti();
  };

  $('share').onclick = async function () {
    if (!blob) return; var f = new File([blob], 'snap-booth.' + (blob.type === 'image/jpeg' ? 'jpg' : 'png'), { type: blob.type });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Snap Booth' }); else alert('Press and hold the photo strip to save it.'); } catch (e) {}
  };

  $('again').onclick = function () { shots = []; blob = null; show(1); };

  /* IndexedDB — local backup */
  function db() { return new Promise(function (res, rej) { try { var r = indexedDB.open('snapbooth', 1); r.onupgradeneeded = function () { r.result.createObjectStore('p', { keyPath: 'id' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(); }; } catch (e) { rej(e); } }); }
  function put(rec) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('p', 'readwrite'); t.objectStore('p').put(rec); t.oncomplete = res; t.onerror = rej; }); }).catch(function () {}); }

  function mini(im, fx) { return new Promise(function (r) { var c = document.createElement('canvas'); c.width = 400; c.height = 300; var x = c.getContext('2d'); if ('filter' in x) x.filter = fx; var s = Math.max(400 / im.width, 300 / im.height), w = im.width * s, h = im.height * s; x.drawImage(im, (400 - w) / 2, (300 - h) / 2, w, h); c.toBlob(r, 'image/jpeg', .8); }); }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    var C = ['#f4c95d', '#b3122b', '#ff8a7a', '#fff3dc', '#2b0a12'];
    for (var i = 0; i < 48; i++) { var e = document.createElement('i'); e.className = 'cf'; e.style.left = Math.random() * 100 + 'vw'; e.style.background = C[i % 5]; e.style.animationDuration = (2 + Math.random() * 2) + 's'; e.style.animationDelay = Math.random() * .6 + 's'; document.body.appendChild(e); setTimeout(function (n) { n.remove(); }, 5000, e); }
  }

  function openBook() { var b = $('book'); b.classList.remove('open', 'opened'); show(2); void b.offsetWidth; setTimeout(function () { b.classList.add('open'); }, 80); setTimeout(function () { b.classList.add('opened'); }, 1600); }

  /* Make openBook accessible globally for gallery.js if needed */
  window._openBook = openBook;
})();
