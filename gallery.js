/* =====================================================
   gallery.js — Photo wall: render, polling, soft delete
   Foto yang di-delete hanya disembunyikan dari tampilan,
   TIDAK dihapus dari Supabase Storage maupun database.
   ===================================================== */

/* ID foto yang disembunyikan disimpan di localStorage */
var HIDDEN_KEY = 'snapbooth_hidden';

function getHidden() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); }
  catch (e) { return []; }
}

function hideLocally(id) {
  var list = getHidden();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(HIDDEN_KEY, JSON.stringify(list)); }
}

/* Render photo wall dari Supabase, skip foto yang disembunyikan */
async function renderW() {
  var $ = function (i) { return document.getElementById(i); };
  var rows = await fetchStripsFromSupabase();
  var hidden = getHidden();
  rows = rows.filter(function (r) { return !hidden.includes(r.id); });

  var W = $('wrows'); W.innerHTML = '';
  $('wEmpty').classList.toggle('hidden', rows.length > 0);

  var pol = rows.map(function (it) { return { url: it.public_url, it: it }; });
  var per = Math.max(3, Math.floor(Math.min(window.innerWidth - 160, 1500) / 200));
  var PIN = ['#b3122b', '#f4c95d', '#fff3dc', '#2b0a12', '#ff8a7a'];
  var n = 0;

  function ypos(p) { return 4 + 2 * p * (1 - p) * 36; }

  for (var s = 0; s < pol.length; s += per) {
    var row = document.createElement('div'); row.className = 'wrow';
    row.innerHTML = '<svg class="str" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true"><path d="M0,4 Q50,40 100,4" fill="none" stroke="#e9dcc5" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
    for (var k = 0; k < 24; k++) {
      var bp = (k + .5) / 24, bl = document.createElement('i');
      bl.className = 'bulb'; bl.style.left = bp * 100 + '%';
      bl.style.top = (ypos(bp) - 4) + 'px'; bl.style.animationDelay = (k % 5) * .4 + 's';
      row.appendChild(bl);
    }
    pol.slice(s, s + per).forEach(function (o, i) {
      var p = (i + .5) / per, f = document.createElement('button');
      f.type = 'button'; f.className = 'pol';
      f.style.left = p * 100 + '%'; f.style.top = (ypos(p) - 8) + 'px';
      f.style.setProperty('--r', ((n * 37 % 11) - 5) + 'deg');
      f.style.animationDelay = (n % 4) * -1.1 + 's';
      f.setAttribute('aria-label', 'Open photo strip');
      f.innerHTML = '<span class="pin" style="background:' + PIN[n % 5] + '"></span><img alt="Photo" crossorigin="anonymous">';
      f.querySelector('img').src = o.url;
      var cap = document.createElement('span');
      cap.textContent = new Date(o.it.created_at).toLocaleDateString();
      f.appendChild(cap);
      f.onclick = (function (item) {
        return function () {
          window._lbRec = item.it;
          var lbimg = $('lbimg');
          lbimg.src = item.url;
          lbimg.setAttribute('crossorigin', 'anonymous');
          $('lb').classList.remove('hidden');
        };
      })(o);
      row.appendChild(f); n++;
    });
    W.appendChild(row);
  }
}

/* Soft delete — sembunyikan dari gallery di device ini saja */
function softDeleteCurrent() {
  if (!window._lbRec) return;
  hideLocally(window._lbRec.id);
  window._lbRec = null;
  document.getElementById('lb').classList.add('hidden');
  renderW();
}

/* Polling tiap 5 detik, hanya aktif saat photo wall terbuka */
function startGalleryPolling() {
  var lastCount = -1;
  setInterval(async function () {
    var wall = document.getElementById('wall');
    if (!wall || wall.classList.contains('hidden')) return;
    var rows = await fetchStripsFromSupabase();
    var hidden = getHidden();
    var visible = rows.filter(function (r) { return !hidden.includes(r.id); }).length;
    if (visible !== lastCount) { lastCount = visible; renderW(); }
  }, 5000);
}
