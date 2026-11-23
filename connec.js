const SUPABASE_URL = 'https://cxyxmnilrymmkzkibsqt.supabase.co';
const SUPABASE_ANON = 'sb_publishable_n0-Ruq2kvOT4gdSUwCZ_Vw_uQpxcgsA';




/* Compress a File/Blob to JPEG at reduced quality to stay under Supabase's size limit */
function compressToJpeg(file, quality) {
  quality = quality || 0.7;
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      /* Scale down if wider than 1800px */
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

async function uploadPhoto(photoFile) {
  /* Compress to JPEG first to avoid 413 Payload Too Large */
  const compressed = await compressToJpeg(photoFile, 0.7);

  const fileName = `${crypto.randomUUID()}.jpg`;
  const storagePath = `photos/${fileName}`;
  const BUCKET = 'images';

  // 1. Upload foto ke bucket strips
  const uploadResponse = await fetch(
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

  if (!uploadResponse.ok) {
    throw new Error(`Upload gagal: ${await uploadResponse.text()}`);
  }

  // 2. Buat URL publik foto
  const publicUrl =
    `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  // 3. Simpan metadata ke tabel photo_strips
  const dbResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/photo_strips`,
    {
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
    }
  );

  if (!dbResponse.ok) {
    throw new Error(`Simpan metadata gagal: ${await dbResponse.text()}`);
  }

  console.log('Foto berhasil diunggah dan disimpan!', publicUrl);
  return await dbResponse.json();
}

async function deletePhoto(id, storagePath) {
  const BUCKET = 'images';

  // 1. Hapus file dari Storage (gunakan endpoint /remove dengan body JSON)
  if (storagePath) {
    // Supabase Storage mengharapkan array of prefixes, strip "photos/" prefix jika ada
    const delStorage = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}`,
      {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prefixes: [storagePath] })
      }
    );
    if (!delStorage.ok) {
      console.warn('[Supabase] Storage delete gagal:', await delStorage.text());
    } else {
      console.log('[Supabase] File storage berhasil dihapus:', storagePath);
    }
  }

  // 2. Hapus row dari tabel photo_strips
  const delDb = await fetch(
    `${SUPABASE_URL}/rest/v1/photo_strips?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`
      }
    }
  );
  if (!delDb.ok) {
    throw new Error(`Delete metadata gagal: ${await delDb.text()}`);
  }

  console.log('[Supabase] Foto berhasil dihapus:', id);
}

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
    console.error('[Supabase] Gagal fetch strips:', await res.text());
    return [];
  }
  return await res.json();
}

/* Auto-refresh gallery tiap 5 detik kalau photo wall sedang terbuka */
function startGalleryPolling(renderFn) {
  var lastCount = 0;
  setInterval(async function () {
    /* Hanya jalan kalau wall sedang tampil */
    var wall = document.getElementById('wall');
    if (!wall || wall.classList.contains('hidden')) return;

    var rows = await fetchStripsFromSupabase();
    if (rows.length !== lastCount) {
      lastCount = rows.length;
      renderFn();
    }
  }, 5000);
}
