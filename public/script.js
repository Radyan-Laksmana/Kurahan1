/*
  Dynamic content binder for Google Spreadsheet
  - Reads header row to map columns (per the provided screenshot)
  - Populates: Berita, Struktur Organisasi, Data Kependudukan, UMKM
  - Works even if some sections are missing on a page
*/

async function fetchSheetValues() {
    const response = await fetch('/data');
    if (!response.ok) throw new Error('Gagal mengambil data spreadsheet');
    return response.json();
}

function buildHeaderIndex(values) {
    const headerRow = values[0] || [];
    const indexByName = {};
    headerRow.forEach((name, idx) => {
        if (!name) return;
        // Normalize column names for better matching
        const normalizedName = String(name).trim().toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ');
        indexByName[normalizedName] = idx;
    });
    return indexByName;
}

function getCell(row, idx, fallback = '') {
    if (!Array.isArray(row)) return fallback;
    if (idx == null) return fallback;
    const value = row[idx];
    return value == null || value === '' ? fallback : value;
}

function toRecords(values, headerIndex) {
    const records = [];
    for (let r = 1; r < values.length; r += 1) {
        const row = values[r];
        if (!row || row.length === 0) continue;

        const record = {
            // News/Berita columns
            judul: getCell(row, headerIndex['judul']),
            deskripsi: getCell(row, headerIndex['deskripsi']),
            penulis: getCell(row, headerIndex['penulis']),
            tanggal: getCell(row, headerIndex['tanggal']),
            gambar: getCell(row, headerIndex['gambar']),
            
            // Organizational structure columns
            jabatan: getCell(row, headerIndex['jabatan']),
            nama: getCell(row, headerIndex['nama']),
            kontak: getCell(row, headerIndex['kontak']),
            
            // Population data columns
            lakiLaki: getCell(row, headerIndex['laki laki']),
            perempuan: getCell(row, headerIndex['perempuan']),
            keluarga: getCell(row, headerIndex['keluarga']),
            anakBalita: getCell(row, headerIndex['anak kecilbalita']),
            
            // UMKM columns
            namaUmkm: getCell(row, headerIndex['nama umkm']),
            deskripsiUmkm: getCell(row, headerIndex['deskripsi umkm']),
            gambarUmkm: getCell(row, headerIndex['gambar umkm']),
            pengelola: getCell(row, headerIndex['pengelola'])
        };

        // Include all rows that have any meaningful data
        if (
            record.judul || record.deskripsi || record.penulis || record.tanggal ||
            record.namaUmkm || record.deskripsiUmkm || record.gambarUmkm ||
            record.jabatan || record.nama || record.kontak ||
            record.lakiLaki || record.perempuan || record.keluarga || record.anakBalita
        ) {
            records.push(record);
        }
    }
    return records;
}

function renderBerita(records) {
    const beritaList = document.getElementById('berita-list');
    const newsGrid = document.getElementById('news-grid');
    const fallbackImg = 'https://via.placeholder.com/400x250/4CAF50/ffffff?text=Berita+Desa';

    if (beritaList) {
        beritaList.innerHTML = '';
        const beritaItems = records.filter(r => r.judul).slice(0, 12);
        if (beritaItems.length === 0) {
            beritaList.innerHTML = '<p class="no-data">Belum ada berita tersedia</p>';
            return;
        }
        for (let i = 0; i < beritaItems.length; i++) {
            const item = beritaItems[i];
            
            // Debug: Log image data to console
            if (item.gambar) {
                console.log(`Image data for "${item.judul}":`, item.gambar);
            }
            
            const newsIndex = records.findIndex(r => r.judul === item.judul);
            const article = document.createElement('article');
            article.className = 'berita-item';
            article.innerHTML = `
                <div class="berita-image">
                  <img src="${item.gambar || fallbackImg}" alt="${item.judul}" onerror="this.src='${fallbackImg}'">
                </div>
                <div class="berita-content">
                  <span class="berita-category">Berita</span>
                  <span class="berita-date">${item.tanggal || ''}</span>
                  <h3>${item.judul}</h3>
                  <p>${item.deskripsi || ''}</p>
                  <a href="berita-detail.html?id=${newsIndex}" class="read-more">Baca Selengkapnya <i class="fas fa-arrow-right"></i></a>
                </div>`;
            
            // Make the entire article clickable
            article.addEventListener('click', (e) => {
                // Don't trigger if clicking on the read-more link
                if (!e.target.closest('.read-more')) {
                    window.location.href = `berita-detail.html?id=${newsIndex}`;
                }
            });
            
            beritaList.appendChild(article);
        }
    }

    if (newsGrid) {
        newsGrid.innerHTML = '';
        const items = records.filter(r => r.judul).slice(0, 3);
        if (items.length === 0) {
            // Show fallback content if no news data
            newsGrid.innerHTML = `
                <div class="news-card featured">
                    <img src="${fallbackImg}" alt="Berita Utama">
                    <div class="news-content">
                        <span class="news-category">Utama</span>
                        <h3>Selamat Datang di Website Desa</h3>
                        <p>Website resmi Desa Maju Bersama yang menyajikan informasi terkini seputar desa.</p>
                        <span class="news-date">${new Date().toLocaleDateString('id-ID')}</span>
                    </div>
                </div>`;
            return;
        }
        items.forEach((item, idx) => {
            const isFeatured = idx === 0;
            const newsIndex = records.findIndex(r => r.judul === item.judul);
            const card = document.createElement('div');
            card.className = `news-card ${isFeatured ? 'featured' : ''}`;
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <img src="${item.gambar || fallbackImg}" alt="${item.judul}" onerror="this.src='${fallbackImg}'">
                <div class="news-content">
                  <span class="news-category">${isFeatured ? 'Utama' : 'Berita'}</span>
                  <h3>${item.judul}</h3>
                  <p>${item.deskripsi || ''}</p>
                  <span class="news-date">${item.tanggal || ''}</span>
                </div>`;
            
            // Make the entire card clickable
            card.addEventListener('click', () => {
                window.location.href = `berita-detail.html?id=${newsIndex}`;
            });
            
            newsGrid.appendChild(card);
        });
    }
}

function renderStrukturOrganisasi(records) {
    // Find records with organizational structure data
    const strukturRecords = records.filter(r => r.jabatan && r.nama);
    
    if (strukturRecords.length === 0) return;

    // Update existing struktur cards if they exist
    const strukturCards = document.querySelectorAll('.struktur-card');
    if (strukturCards && strukturCards.length > 0) {
        strukturCards.forEach((card, index) => {
            const record = strukturRecords[index];
            if (record) {
                const title = card.querySelector('h4');
                const name = card.querySelector('p');
                if (title) title.textContent = record.jabatan;
                if (name) name.textContent = record.nama;
            }
        });
    }

    // If no existing cards, create a new struktur section
    const strukturSection = document.querySelector('.struktur-section');
    if (strukturSection && strukturCards.length === 0) {
        const strukturGrid = strukturSection.querySelector('.struktur-grid');
        if (strukturGrid) {
            strukturGrid.innerHTML = '';
            strukturRecords.forEach(record => {
                const card = document.createElement('div');
                card.className = 'struktur-card';
                card.innerHTML = `
                    <div class="struktur-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <h4>${record.jabatan}</h4>
                    <p>${record.nama}</p>
                    ${record.kontak ? `<small>${record.kontak}</small>` : ''}
                `;
                strukturGrid.appendChild(card);
            });
        }
    }
}

function renderKependudukan(records) {
    // Find records with population data
    const populationRecords = records.filter(r => 
        r.lakiLaki || r.perempuan || r.keluarga || r.anakBalita
    );
    
    if (populationRecords.length === 0) return;
    
    const firstRecord = populationRecords[0];
    
    // Update population data cards
    const dataCards = document.querySelectorAll('.kependudukan-section .data-card .data-number');
    if (dataCards && dataCards.length >= 4) {
        const values = [firstRecord.lakiLaki, firstRecord.perempuan, firstRecord.keluarga, firstRecord.anakBalita];
        values.forEach((val, i) => {
            if (val && dataCards[i]) dataCards[i].textContent = String(val);
        });
    }
}

function renderUmkm(records) {
    const umkmGrid = document.getElementById('umkm-grid');
    if (!umkmGrid) return;

    const fallbackImg = 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=UMKM+Desa';
    const items = records.filter(r => r.namaUmkm);
    
    if (items.length === 0) {
        // Keep static content if no UMKM data from spreadsheet
        return;
    }

    // Clear existing content and replace with spreadsheet data
    umkmGrid.innerHTML = '';
    
    for (const item of items) {
        const card = document.createElement('div');
        card.className = 'umkm-card';
        card.innerHTML = `
            <img src="${item.gambarUmkm || fallbackImg}" alt="${item.namaUmkm}" onerror="this.src='${fallbackImg}'">
            <div class="umkm-content">
              <h4>${item.namaUmkm}</h4>
              <p>${item.deskripsiUmkm || ''}</p>
              ${item.pengelola ? `<span class="umkm-owner">Pengelola: ${item.pengelola}</span>` : ''}
            </div>`;
        umkmGrid.appendChild(card);
    }
}

function renderGaleri(records) {
    const galeriGrid = document.querySelector('.galeri-grid');
    if (!galeriGrid) return;

    const fallbackImg = 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=Galeri+Desa';
    const items = records.filter(r => r.judul && r.gambar);
    
    if (items.length === 0) return;

    // Add new gallery items from spreadsheet
    items.forEach(item => {
        const galeriItem = document.createElement('div');
        galeriItem.className = 'galeri-item';
        galeriItem.setAttribute('data-category', 'galeri');
        galeriItem.innerHTML = `
            <img src="${item.gambar || fallbackImg}" alt="${item.judul}" onerror="this.src='${fallbackImg}'">
            <div class="galeri-overlay">
                <h4>${item.judul}</h4>
                <p>${item.deskripsi || ''}</p>
                <span class="galeri-date">${item.tanggal || ''}</span>
            </div>
        `;
        galeriGrid.appendChild(galeriItem);
    });
}

async function bindSpreadsheetToUi() {
    try {
        const values = await fetchSheetValues();
        if (!Array.isArray(values) || values.length === 0) {
            console.log('No data found in spreadsheet or empty response');
            return;
        }
        
        const headerIndex = buildHeaderIndex(values);
        const records = toRecords(values, headerIndex);

        console.log(`Loaded ${records.length} records from spreadsheet`);
        console.log('Header mapping:', headerIndex);

        renderBerita(records);
        renderStrukturOrganisasi(records);
        renderKependudukan(records);
        renderUmkm(records);
        renderGaleri(records);
        
        showNotification(`Data berhasil dimuat (${records.length} item)`, 'success');
    } catch (err) {
        console.error('Gagal memuat dan mengikat data:', err);
        showNotification('Gagal memuat data dari Spreadsheet', 'error');
    }
}



// Simple notification helper
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000; color: white;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        padding: 15px 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        display: flex; align-items: center; gap: 10px; font-weight: 500; transform: translateX(100%);
        transition: transform 0.3s ease; max-width: 320px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
    }, 3000);
}

// Add filter functionality for gallery
function initializeFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    const galeriItems = document.querySelectorAll('.galeri-item');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.getAttribute('data-filter');
            
            // Update active tab
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Filter items
            galeriItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filter === 'all' || category.includes(filter)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Bind data to current page
    bindSpreadsheetToUi();
    
    // Initialize filters
    initializeFilters();
    
    // Auto refresh every 30 seconds so new Spreadsheet rows appear without reload
    setInterval(bindSpreadsheetToUi, 30000);
    
    // Add manual refresh button functionality
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', bindSpreadsheetToUi);
    }
});
