/* =====================================================
   supabase.js — Koneksi & operasi Supabase
   ===================================================== */

const SUPABASE_URL  = 'https://cxyxmnilrymmkzkibsqt.supabase.co';
const SUPABASE_ANON = 'sb_publishable_n0-Ruq2kvOT4gdSUwCZ_Vw_uQpxcgsA';
const BUCKET        = 'images';

/* Compress gambar ke JPEG agar tidak melebihi batas ukuran Supabase */
function compressToJpeg(file, quality) {
  quality = quality || 0.7;
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var maxW = 1800;
      var w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) {
        if (!blob) { reject(new Error('Compression failed')); return; }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/* Upload foto strip ke Supabase Storage + simpan metadata ke tabel */
async function uploadPhoto(photoFile) {
  const compressed    = await compressToJpeg(photoFile, 0.7);
  const fileName      = crypto.randomUUID() + '.jpg';
  const storagePath   = 'photos/' + fileName;

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'image/jpeg'
      },
      body: compressed
    }
  );
  if (!uploadRes.ok) throw new Error('Upload gagal: ' + await uploadRes.text());

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/photo_strips`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      id:           Date.now(),
      storage_path: storagePath,
      public_url:   publicUrl
    })
  });
  if (!dbRes.ok) throw new Error('Simpan metadata gagal: ' + await dbRes.text());

  console.log('[Supabase] Foto tersimpan:', publicUrl);
  return await dbRes.json();
}

/* Ambil semua foto dari Supabase (urut terbaru) */
async function fetchStripsFromSupabase() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/photo_strips?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`
      }
    }
  );
  if (!res.ok) {
    console.error('[Supabase] Gagal fetch:', await res.text());
    return [];
  }
  return await res.json();
}
