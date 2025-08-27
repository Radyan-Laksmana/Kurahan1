(() => {
  const state = {
    token: localStorage.getItem('ADMIN_TOKEN') || '',
    baseUrl: '',
    values: [],
    headers: [],
  };

  function toast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    t.style.background = type === 'error' ? '#b91c1c' : type === 'success' ? '#065f46' : '#111827';
    setTimeout(() => (t.style.display = 'none'), 2500);
  }

  function authHeaders() {
    return state.token ? { Authorization: `Bearer ${state.token}` } : {};
  }

  function showLogin(show) {
    const el = document.getElementById('login');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  async function api(path, options = {}) {
    const url = `${state.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Request failed: ${res.status}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  async function uploadFile(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || input.files.length === 0) return null;
    const file = input.files[0];
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${state.baseUrl}/upload`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: form,
    });
    if (!res.ok) throw new Error('Gagal upload file');
    const data = await res.json();
    return data.url;
  }

  function mapValuesToRecords(values) {
    if (!Array.isArray(values) || values.length === 0) return [];
    const headers = values[0].map((h) => String(h || '').trim().toLowerCase());
    state.headers = headers;
    const idx = (name) => headers.indexOf(name);
    const toCell = (row, i) => (i >= 0 && i < row.length && row[i] != null ? row[i] : '');
    const records = [];
    for (let r = 1; r < values.length; r += 1) {
      const row = values[r] || [];
      const record = {
        _row: r + 1, // spreadsheet row number (1-based)
        judul: toCell(row, idx('judul')),
        deskripsi: toCell(row, idx('deskripsi')),
        penulis: toCell(row, idx('penulis')),
        tanggal: toCell(row, idx('tanggal')),
        gambar: toCell(row, idx('gambar')),
        jabatan: toCell(row, idx('jabatan')),
        nama: toCell(row, idx('nama')),
        kontak: toCell(row, idx('kontak')),
        lakiLaki: toCell(row, idx('laki laki')),
        perempuan: toCell(row, idx('perempuan')),
        keluarga: toCell(row, idx('keluarga')),
        anakBalita: toCell(row, idx('anak kecil/balita')) || toCell(row, idx('anak kecilbalita')),
        namaUmkm: toCell(row, idx('nama umkm')),
        deskripsiUmkm: toCell(row, idx('deskripsi umkm')),
        gambarUmkm: toCell(row, idx('gambar umkm')),
        pengelola: toCell(row, idx('pengelola')),
      };
      records.push(record);
    }
    return records;
  }

  function fillForm(record) {
    const setv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setv('rowNumber', record?._row || '');
    setv('judul', record?.judul);
    setv('deskripsi', record?.deskripsi);
    setv('penulis', record?.penulis);
    setv('tanggal', record?.tanggal);
    setv('gambar', record?.gambar);
    setv('jabatan', record?.jabatan);
    setv('nama', record?.nama);
    setv('kontak', record?.kontak);
    setv('lakiLaki', record?.lakiLaki);
    setv('perempuan', record?.perempuan);
    setv('keluarga', record?.keluarga);
    setv('anakBalita', record?.anakBalita);
    setv('namaUmkm', record?.namaUmkm);
    setv('deskripsiUmkm', record?.deskripsiUmkm);
    setv('gambarUmkm', record?.gambarUmkm);
    setv('pengelola', record?.pengelola);
    document.getElementById('update-btn').disabled = !record?._row;
    document.getElementById('current-row').textContent = record?._row ? `Baris aktif: ${record._row}` : '';
    const pg = document.getElementById('preview-gambar');
    if (pg) pg.src = record?.gambar || '';
    const pu = document.getElementById('preview-gambar-umkm');
    if (pu) pu.src = record?.gambarUmkm || '';
  }

  function readForm() {
    const v = (id) => (document.getElementById(id)?.value || '').trim();
    return {
      judul: v('judul'),
      deskripsi: v('deskripsi'),
      penulis: v('penulis'),
      tanggal: v('tanggal'),
      gambar: v('gambar'),
      jabatan: v('jabatan'),
      nama: v('nama'),
      kontak: v('kontak'),
      lakiLaki: v('lakiLaki'),
      perempuan: v('perempuan'),
      keluarga: v('keluarga'),
      anakBalita: v('anakBalita'),
      namaUmkm: v('namaUmkm'),
      deskripsiUmkm: v('deskripsiUmkm'),
      gambarUmkm: v('gambarUmkm'),
      pengelola: v('pengelola'),
    };
  }

  function renderTable(records) {
    const body = document.getElementById('rows-body');
    if (!body) return;
    const q = (document.getElementById('search')?.value || '').toLowerCase();
    const filtered = records.filter((r) =>
      [r.judul, r.nama, r.namaUmkm].some((x) => String(x || '').toLowerCase().includes(q))
    );
    body.innerHTML = '';
    for (const r of filtered) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r._row}</td>
        <td>${r.judul || ''}</td>
        <td>${r.tanggal || ''}</td>
        <td>${r.nama || ''}</td>
        <td>${r.namaUmkm || ''}</td>
        <td>
          <button class="btn" data-action="edit" data-row="${r._row}">Edit</button>
          <button class="btn danger" data-action="delete" data-row="${r._row}">Hapus</button>
        </td>
      `;
      body.appendChild(tr);
    }
  }

  async function loadData() {
    const values = await api('/data');
    state.values = values;
    const records = mapValuesToRecords(values);
    renderTable(records);
  }

  async function createRecord() {
    const payload = readForm();
    await api('/data', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    });
    toast('Berhasil menambah data', 'success');
    await loadData();
  }

  async function updateRecord(rowNumber) {
    const payload = readForm();
    await api(`/data/${rowNumber}`, {
      method: 'PUT',
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    });
    toast(`Berhasil update baris ${rowNumber}`, 'success');
    await loadData();
  }

  async function deleteRecord(rowNumber) {
    await api(`/data/${rowNumber}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    toast(`Berhasil hapus baris ${rowNumber}`, 'success');
    await loadData();
  }

  function resetForm() {
    fillForm(null);
    document.getElementById('entry-form').reset();
  }

  function bindEvents() {
    // baseUrl is same origin
    state.baseUrl = '';

    // login flow
    const tokenInput = document.getElementById('admin-token');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        const t = tokenInput?.value || '';
        if (!t) return toast('Token tidak boleh kosong', 'error');
        state.token = t;
        localStorage.setItem('ADMIN_TOKEN', t);
        showLogin(false);
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('ADMIN_TOKEN');
        state.token = '';
        showLogin(true);
      });
    }

    // create
    const form = document.getElementById('entry-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await createRecord();
          resetForm();
        } catch (err) {
          console.error(err);
          toast('Gagal menyimpan data', 'error');
        }
      });
    }

    // update
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
      updateBtn.addEventListener('click', async () => {
        const row = document.getElementById('rowNumber')?.value;
        if (!row) return;
        try {
          await updateRecord(row);
        } catch (err) {
          console.error(err);
          toast('Gagal update data', 'error');
        }
      });
    }

    // reset
    const resetBtn = document.getElementById('reset-form');
    if (resetBtn) resetBtn.addEventListener('click', resetForm);

    // search
    const search = document.getElementById('search');
    if (search) search.addEventListener('input', () => renderTable(mapValuesToRecords(state.values)));

    // refresh
    const refresh = document.getElementById('refresh');
    if (refresh) refresh.addEventListener('click', loadData);

    // rows table actions
    const body = document.getElementById('rows-body');
    if (body) {
      body.addEventListener('click', async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute('data-action');
        const row = target.getAttribute('data-row');
        if (!action || !row) return;
        if (action === 'edit') {
          const records = mapValuesToRecords(state.values);
          const rec = records.find((r) => String(r._row) === String(row));
          if (rec) fillForm(rec);
        } else if (action === 'delete') {
          if (!confirm(`Hapus baris ${row}?`)) return;
          try {
            await deleteRecord(row);
          } catch (err) {
            console.error(err);
            toast('Gagal hapus data', 'error');
          }
        }
      });
    }

    // image uploads
    document.querySelectorAll('[data-upload]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const inputId = btn.getAttribute('data-upload');
        const targetId = btn.getAttribute('data-target');
        const fileInput = document.getElementById(inputId);
        if (!fileInput) return;
        fileInput.click();
        fileInput.onchange = async () => {
          try {
            const url = await uploadFile(inputId);
            if (url && targetId) {
              const field = document.getElementById(targetId);
              if (field) field.value = url;
              if (targetId === 'gambar') {
                const pg = document.getElementById('preview-gambar');
                if (pg) pg.src = url;
              }
              if (targetId === 'gambarUmkm') {
                const pu = document.getElementById('preview-gambar-umkm');
                if (pu) pu.src = url;
              }
              toast('Upload berhasil', 'success');
            }
          } catch (err) {
            console.error(err);
            toast('Gagal upload', 'error');
          } finally {
            fileInput.value = '';
          }
        };
      });
    });
  }

  function init() {
    bindEvents();
    // same-origin API
    state.baseUrl = '';
    if (!state.token) {
      showLogin(true);
    }
    loadData().catch((e) => console.error(e));
  }

  document.addEventListener('DOMContentLoaded', init);
})();


