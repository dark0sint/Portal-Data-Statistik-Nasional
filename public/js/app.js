(() => {
  'use strict';

  const app = document.getElementById('app');
  const CATEGORY_ICONS = {
    'trending-up': '📈',
    'users': '👥',
    'heart-pulse': '❤️‍🩹',
    'graduation-cap': '🎓',
    'leaf': '🍃'
  };

  let chartInstance = null;
  let mapInstance = null;
  let categoriesCache = null;
  let glossaryCache = null;

  // ---------------------------------------------------------------------
  // Helper API
  // ---------------------------------------------------------------------
  async function api(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Gagal memuat data: ' + path);
    return res.json();
  }

  function fmtNumber(n) {
    if (n === null || n === undefined) return '-';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(n);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 3200);
  }

  async function getCategories() {
    if (!categoriesCache) categoriesCache = await api('/api/categories');
    return categoriesCache;
  }
  async function getGlossary() {
    if (!glossaryCache) glossaryCache = await api('/api/glossary');
    return glossaryCache;
  }

  function categoryLabel(cats, id) {
    const c = cats.find(x => x.id === id);
    return c ? c.name : id;
  }
  function categoryColor(cats, id) {
    const c = cats.find(x => x.id === id);
    return c ? c.color : '#2563eb';
  }

  // ---------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------
  const routes = [
    { pattern: /^#\/$/, handler: renderHome },
    { pattern: /^#\/kategori$/, handler: renderCategories },
    { pattern: /^#\/kategori\/([a-z-]+)$/, handler: (m) => renderCategoryDetail(m[1]) },
    { pattern: /^#\/indikator\/([a-z0-9-]+)$/, handler: (m) => renderIndicatorDetail(m[1]) },
    { pattern: /^#\/dashboard$/, handler: renderDashboard },
    { pattern: /^#\/glosarium$/, handler: renderGlossaryPage },
    { pattern: /^#\/tentang$/, handler: renderAbout }
  ];

  function router() {
    const hash = location.hash || '#/';
    for (const r of routes) {
      const m = hash.match(r.pattern);
      if (m) {
        destroyVisuals();
        r.handler(m);
        window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        document.getElementById('main-content').focus({ preventScroll: true });
        closeMobileNav();
        return;
      }
    }
    app.innerHTML = `<div class="empty-state"><h2>Halaman tidak ditemukan</h2><p><a href="#/">Kembali ke beranda</a></p></div>`;
  }

  function destroyVisuals() {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  }

  window.addEventListener('hashchange', router);

  // ---------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------
  async function renderHome() {
    app.innerHTML = `<div class="empty-state">Memuat data…</div>`;
    const [cats, summary] = await Promise.all([getCategories(), api('/api/stats/summary')]);

    app.innerHTML = `
      <section class="hero">
        <span class="hero-badge">Data Terbuka &middot; Diperbarui Berkala</span>
        <h1>Satu Portal untuk Semua Data Statistik Nasional</h1>
        <p class="lede">Cari, pahami, dan unduh data resmi tentang ekonomi, kependudukan, kesehatan, pendidikan, dan lingkungan — disajikan dengan bahasa yang mudah dimengerti.</p>
      </section>

      <section class="section" aria-labelledby="catHeading">
        <div class="section-head">
          <h2 id="catHeading">Jelajahi per Kategori</h2>
          <a href="#/kategori">Lihat semua kategori →</a>
        </div>
        <div class="grid grid-cats">
          ${cats.map(c => categoryCardHtml(c)).join('')}
        </div>
      </section>

      <section class="section" aria-labelledby="highlightHeading">
        <div class="section-head">
          <h2 id="highlightHeading">Indikator Terkini</h2>
          <span style="color:var(--ink-500);font-size:13.5px">${summary.totalIndicators} indikator &middot; ${summary.totalCategories} kategori</span>
        </div>
        <div class="grid grid-cards">
          ${summary.highlights.map(i => indicatorCardHtml(i, cats)).join('')}
        </div>
      </section>

      <section class="section takeaways" aria-labelledby="dashPromo">
        <h3 id="dashPromo">💡 Tips: Buat Dasbor Pribadi Anda</h3>
        <p style="margin:0 0 10px">Pilih indikator yang paling penting bagi Anda dan pantau semuanya dalam satu halaman.</p>
        <a href="#/dashboard" class="btn btn-primary">Buka Dasbor Saya →</a>
      </section>
    `;
  }

  function categoryCardHtml(c) {
    return `
      <a class="cat-card" href="#/kategori/${c.id}">
        <span class="cat-icon" style="background:${c.color}">${CATEGORY_ICONS[c.icon] || '📊'}</span>
        <h3>${c.name}</h3>
        <p>${c.description}</p>
        <span class="cat-count">${c.indicatorCount} indikator</span>
      </a>`;
  }

  function changeBadge(change) {
    if (change === null || change === undefined) return '';
    if (Math.abs(change) < 0.005) return `<span class="stat-change flat">stabil</span>`;
    const dir = change > 0 ? 'up' : 'down';
    const arrow = change > 0 ? '▲' : '▼';
    return `<span class="stat-change ${dir}">${arrow} ${fmtNumber(Math.abs(change))}</span>`;
  }

  function indicatorCardHtml(i, cats) {
    return `
      <a class="indicator-card" href="#/indikator/${i.id}">
        <span class="indicator-cat-tag" style="color:${categoryColor(cats, i.category)}">${categoryLabel(cats, i.category)}</span>
        <h3>${i.name}</h3>
        <p class="short">${i.short}</p>
        <div class="indicator-stat">
          <span class="stat-value">${fmtNumber(i.latestValue)}</span>
          <span class="stat-unit">${i.unit} &middot; ${i.latestYear}</span>
        </div>
        ${changeBadge(i.change)}
      </a>`;
  }

  async function renderCategories() {
    const cats = await getCategories();
    app.innerHTML = `
      <h1>Semua Kategori Data</h1>
      <p class="lede">Pilih kategori untuk melihat seluruh indikator di dalamnya.</p>
      <div class="grid grid-cats" style="margin-top:22px">
        ${cats.map(c => categoryCardHtml(c)).join('')}
      </div>`;
  }

  async function renderCategoryDetail(catId) {
    app.innerHTML = `<div class="empty-state">Memuat…</div>`;
    const [cats, indicators] = await Promise.all([getCategories(), api('/api/indicators?category=' + catId)]);
    const cat = cats.find(c => c.id === catId);
    app.innerHTML = `
      <div class="breadcrumb"><a href="#/kategori">Kategori</a> / ${cat ? cat.name : catId}</div>
      <h1>${cat ? cat.name : catId}</h1>
      <p class="lede">${cat ? cat.description : ''}</p>
      <div class="chip-row">
        ${cats.map(c => `<a class="chip ${c.id === catId ? 'active' : ''}" href="#/kategori/${c.id}">${c.name}</a>`).join('')}
      </div>
      <div class="grid grid-cards">
        ${indicators.map(i => indicatorCardHtml(i, cats)).join('') || '<p>Belum ada indikator di kategori ini.</p>'}
      </div>`;
  }

  async function renderIndicatorDetail(id) {
    app.innerHTML = `<div class="empty-state">Memuat…</div>`;
    let ind, cats, gloss;
    try {
      [ind, cats, gloss] = await Promise.all([api('/api/indicators/' + id), getCategories(), getGlossary()]);
    } catch (e) {
      app.innerHTML = `<div class="empty-state"><h2>Indikator tidak ditemukan</h2><p><a href="#/">Kembali ke beranda</a></p></div>`;
      return;
    }

    const latest = ind.series[ind.series.length - 1];
    const prev = ind.series[ind.series.length - 2];
    const change = prev ? (latest.value - prev.value) : null;
    const pctChange = prev && prev.value !== 0 ? (change / Math.abs(prev.value) * 100) : null;
    const trendWord = change > 0 ? 'naik' : change < 0 ? 'turun' : 'stabil';

    const relatedTerms = gloss.filter(g => {
      const t = g.term.toLowerCase();
      return ind.description.toLowerCase().includes(t.split(' ')[0].toLowerCase()) ||
             (ind.keywords || []).some(k => t.includes(k.toLowerCase()) || k.toLowerCase().includes(t.split('(')[0].trim().toLowerCase()));
    }).slice(0, 5);

    app.innerHTML = `
      <div class="breadcrumb"><a href="#/kategori">Kategori</a> / <a href="#/kategori/${ind.category}">${categoryLabel(cats, ind.category)}</a> / ${ind.name}</div>
      <div class="detail-head">
        <div>
          <h1>${ind.name}</h1>
          <p class="lede">${ind.short}</p>
          <p class="detail-meta">Sumber: ${ind.source} &middot; Diperbarui: ${ind.updated}</p>
        </div>
      </div>

      <div class="big-stat">
        <span class="num">${fmtNumber(latest.value)}</span>
        <span class="stat-unit">${ind.unit} &middot; tahun ${latest.year}</span>
        ${changeBadge(change)}
      </div>

      <div class="takeaways">
        <h3>📌 Ringkasan Cepat</h3>
        <ul>
          <li>Nilai terakhir (${latest.year}) adalah <strong>${fmtNumber(latest.value)} ${ind.unit}</strong>.</li>
          ${prev ? `<li>Dibanding ${prev.year}, angka ini <strong>${trendWord}</strong> ${pctChange !== null ? `sekitar ${fmtNumber(Math.abs(pctChange))}%` : ''}.</li>` : ''}
          <li>${ind.description}</li>
        </ul>
      </div>

      <div class="chart-card">
        <h3>Tren ${ind.provinceData ? 'Nasional ' : ''}${ind.series.length} Tahun Terakhir</h3>
        <canvas id="trendChart" role="img" aria-label="Grafik tren ${escapeHtml(ind.name)} dari tahun ${ind.series[0].year} sampai ${latest.year}"></canvas>
      </div>

      ${ind.provinceData ? `
      <div class="map-card">
        <h3>Sebaran Antar Provinsi</h3>
        <div id="leafletMap" role="img" aria-label="Peta sebaran ${escapeHtml(ind.name)} per provinsi"></div>
      </div>` : ''}

      <div class="section">
        <h3>Unduh Data</h3>
        <div class="download-row">
          <a class="btn btn-primary" href="/api/export/${ind.id}?format=csv">⬇ CSV</a>
          <a class="btn btn-outline" href="/api/export/${ind.id}?format=xlsx">⬇ Excel (.xls)</a>
          <a class="btn btn-outline" href="/api/export/${ind.id}?format=json">⬇ JSON</a>
          <a class="btn btn-outline" href="/api/export/${ind.id}?format=pdf">⬇ PDF</a>
        </div>
      </div>

      ${relatedTerms.length ? `
      <div class="related-terms">
        <h3>📖 Istilah Terkait</h3>
        ${relatedTerms.map(t => `<span class="term-pill" title="${escapeHtml(t.definition)}">${t.term}</span>`).join('')}
        <p style="margin-top:8px"><a href="#/glosarium">Lihat glosarium lengkap →</a></p>
      </div>` : ''}
    `;

    // Grafik
    const ctx = document.getElementById('trendChart');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ind.series.map(s => s.year),
        datasets: [{
          label: ind.name,
          data: ind.series.map(s => s.value),
          borderColor: categoryColor(cats, ind.category),
          backgroundColor: categoryColor(cats, ind.category) + '33',
          fill: true,
          tension: .3,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { title: { display: true, text: ind.unit } } }
      }
    });

    // Peta
    if (ind.provinceData) {
      const provinces = await api('/api/provinces');
      const byId = Object.fromEntries(provinces.map(p => [p.id, p]));
      const values = ind.provinceData.map(p => p.value);
      const min = Math.min(...values), max = Math.max(...values);
      mapInstance = L.map('leafletMap', { scrollWheelZoom: false }).setView([-2.5, 118], 4.4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);
      ind.provinceData.forEach(p => {
        const geo = byId[p.province_id];
        if (!geo) return;
        const ratio = max === min ? .5 : (p.value - min) / (max - min);
        const radius = 6 + ratio * 18;
        const color = categoryColor(cats, ind.category);
        L.circleMarker([geo.lat, geo.lng], {
          radius, color, weight: 1, fillColor: color, fillOpacity: .55
        })
        .bindPopup(`<strong>${p.province}</strong><br>${fmtNumber(p.value)} ${ind.unit}`)
        .addTo(mapInstance);
      });
    }
  }

  async function renderDashboard() {
    const [cats, allIndicators] = await Promise.all([getCategories(), api('/api/indicators')]);
    const saved = JSON.parse(localStorage.getItem('dashboardIndicators') || '[]');

    app.innerHTML = `
      <h1>Dasbor Saya</h1>
      <p class="lede">Pilih indikator yang ingin Anda pantau. Pilihan akan tersimpan otomatis di perangkat ini.</p>

      <div class="dash-picker">
        <strong>Pilih indikator (maks. 6):</strong>
        <div class="dash-picker-list" id="dashPickerList">
          ${allIndicators.map(i => `
            <label>
              <input type="checkbox" value="${i.id}" ${saved.includes(i.id) ? 'checked' : ''}>
              ${i.name} <span style="color:var(--ink-500);font-size:12.5px">(${categoryLabel(cats, i.category)})</span>
            </label>`).join('')}
        </div>
      </div>

      <div id="dashGrid" class="dash-grid"></div>
    `;

    const checkboxes = [...document.querySelectorAll('#dashPickerList input')];
    checkboxes.forEach(cb => cb.addEventListener('change', () => {
      const checked = checkboxes.filter(c => c.checked);
      if (checked.length > 6) {
        cb.checked = false;
        toast('Maksimal 6 indikator untuk dasbor.');
        return;
      }
      const ids = checkboxes.filter(c => c.checked).map(c => c.value);
      localStorage.setItem('dashboardIndicators', JSON.stringify(ids));
      renderDashGrid(ids, allIndicators, cats);
    }));

    renderDashGrid(saved, allIndicators, cats);
  }

  function renderDashGrid(ids, allIndicators, cats) {
    const grid = document.getElementById('dashGrid');
    if (!ids.length) {
      grid.innerHTML = `<div class="empty-state">Belum ada indikator dipilih. Centang beberapa indikator di atas untuk mulai memantau.</div>`;
      return;
    }
    grid.innerHTML = ids.map(id => {
      const i = allIndicators.find(x => x.id === id);
      if (!i) return '';
      return `<div class="dash-mini-card">
        <h4>${i.name}</h4>
        <div class="indicator-stat">
          <span class="stat-value" style="font-size:22px">${fmtNumber(i.latestValue)}</span>
          <span class="stat-unit">${i.unit} &middot; ${i.latestYear}</span>
          ${changeBadge(i.change)}
        </div>
        <p style="margin:6px 0 0"><a href="#/indikator/${i.id}">Lihat detail lengkap →</a></p>
      </div>`;
    }).join('');
  }

  async function renderGlossaryPage() {
    const gloss = await getGlossary();
    app.innerHTML = `
      <h1>Glosarium Istilah Statistik</h1>
      <p class="lede">Penjelasan sederhana untuk istilah-istilah yang sering muncul di data statistik.</p>
      <div class="glossary-search">
        <label for="glossSearch" class="sr-only">Cari istilah</label>
        <input type="text" id="glossSearch" placeholder="Cari istilah, mis. 'inflasi' atau 'IPM'...">
      </div>
      <div id="glossList"></div>
    `;
    const list = document.getElementById('glossList');
    function draw(filter) {
      const f = (filter || '').toLowerCase();
      const items = gloss.filter(g => g.term.toLowerCase().includes(f) || g.definition.toLowerCase().includes(f));
      list.innerHTML = items.map(g => `
        <div class="gloss-item">
          <h4>${g.term}</h4>
          <p>${g.definition}</p>
        </div>`).join('') || '<p>Tidak ada istilah yang cocok.</p>';
    }
    draw('');
    document.getElementById('glossSearch').addEventListener('input', (e) => draw(e.target.value));
  }

  function renderAbout() {
    app.innerHTML = `
      <h1>Tentang Portal Ini</h1>
      <p class="lede">Portal Data Statistik Nasional dibangun untuk membantu masyarakat mencari, memahami, dan menggunakan data statistik resmi dengan lebih mudah.</p>
      <div class="takeaways">
        <h3>Fitur Utama</h3>
        <ul>
          <li>Pencarian prediktif dengan bahasa sehari-hari.</li>
          <li>Kategori data yang jelas: Ekonomi, Kependudukan, Kesehatan, Pendidikan, dan Lingkungan.</li>
          <li>Grafik tren dan peta sebaran antar provinsi yang interaktif.</li>
          <li>Dasbor kustom untuk memantau indikator pilihan Anda.</li>
          <li>Unduhan data dalam format CSV, Excel, JSON, dan PDF.</li>
          <li>Glosarium istilah statistik dan panduan penggunaan interaktif.</li>
          <li>Desain responsif dan ramah pengguna dengan kebutuhan aksesibilitas.</li>
        </ul>
      </div>`;
  }

  // ---------------------------------------------------------------------
  // Pencarian prediktif
  // ---------------------------------------------------------------------
  const searchInput = document.getElementById('searchInput');
  const searchSuggestions = document.getElementById('searchSuggestions');
  const searchClear = document.getElementById('searchClear');
  let searchDebounce = null;
  let activeSuggestionIndex = -1;

  function closeSuggestions() {
    searchSuggestions.hidden = true;
    searchSuggestions.innerHTML = '';
    searchInput.setAttribute('aria-expanded', 'false');
    activeSuggestionIndex = -1;
  }

  async function runSearch(q) {
    if (!q || q.trim().length < 2) { closeSuggestions(); return; }
    try {
      const results = await api('/api/search?q=' + encodeURIComponent(q));
      renderSuggestions(results);
    } catch (e) { /* diamkan */ }
  }

  function renderSuggestions(results) {
    if (!results.length) {
      searchSuggestions.innerHTML = `<li class="search-empty">Tidak ada hasil. Coba kata kunci lain, mis. "inflasi" atau "penduduk".</li>`;
      searchSuggestions.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
      return;
    }
    searchSuggestions.innerHTML = results.map((r, idx) => `
      <li role="option" id="sugg-${idx}">
        <button data-id="${r.id}" type="button">
          <span class="sugg-name">${r.name}</span>
          <span class="sugg-meta">${r.category} &middot; ${r.short}</span>
        </button>
      </li>`).join('');
    searchSuggestions.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
    searchSuggestions.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        location.hash = '#/indikator/' + btn.dataset.id;
        searchInput.value = '';
        searchClear.hidden = true;
        closeSuggestions();
      });
    });
  }

  searchInput.addEventListener('input', (e) => {
    searchClear.hidden = !e.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => runSearch(e.target.value), 220);
  });

  searchInput.addEventListener('keydown', (e) => {
    const items = [...searchSuggestions.querySelectorAll('button')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, items.length - 1);
      items[activeSuggestionIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
      items[activeSuggestionIndex].focus();
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.hidden = true;
    closeSuggestions();
    searchInput.focus();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-row')) closeSuggestions();
  });

  // ---------------------------------------------------------------------
  // Navigasi mobile
  // ---------------------------------------------------------------------
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  function closeMobileNav() {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  // ---------------------------------------------------------------------
  // Aksesibilitas: ukuran teks & kontras
  // ---------------------------------------------------------------------
  const FONT_KEY = 'a11yFontScale';
  const CONTRAST_KEY = 'a11yHighContrast';

  function applyFontScale(scale) {
    document.documentElement.style.setProperty('--font-scale', scale);
    localStorage.setItem(FONT_KEY, scale);
  }
  function applyContrast(on) {
    document.body.classList.toggle('high-contrast', on);
    localStorage.setItem(CONTRAST_KEY, on ? '1' : '0');
  }

  document.getElementById('btnFontUp').addEventListener('click', () => {
    const cur = parseFloat(localStorage.getItem(FONT_KEY) || '1');
    applyFontScale(Math.min(cur + 0.1, 1.5).toFixed(2));
  });
  document.getElementById('btnFontDown').addEventListener('click', () => {
    const cur = parseFloat(localStorage.getItem(FONT_KEY) || '1');
    applyFontScale(Math.max(cur - 0.1, 0.85).toFixed(2));
  });
  document.getElementById('btnFontReset').addEventListener('click', () => applyFontScale(1));
  document.getElementById('btnContrast').addEventListener('click', () => {
    applyContrast(!document.body.classList.contains('high-contrast'));
  });

  applyFontScale(localStorage.getItem(FONT_KEY) || '1');
  applyContrast(localStorage.getItem(CONTRAST_KEY) === '1');

  // ---------------------------------------------------------------------
  // Tutorial interaktif
  // ---------------------------------------------------------------------
  const tutorialSteps = [
    { title: 'Selamat Datang! 👋', body: 'Ini adalah Portal Data Statistik Nasional. Mari kenali fitur-fitur utamanya dalam beberapa langkah singkat.' },
    { title: '🔎 Cari dengan Bahasa Sehari-hari', body: 'Gunakan kolom pencarian di bagian atas. Anda tidak perlu tahu istilah teknis — coba ketik "harga naik" atau "orang nganggur", sistem akan mengarahkan Anda ke data yang tepat.' },
    { title: '🗂️ Jelajahi per Kategori', body: 'Data dikelompokkan dalam 5 kategori: Ekonomi, Kependudukan, Kesehatan, Pendidikan, dan Lingkungan — supaya lebih mudah ditelusuri.' },
    { title: '📊 Lihat Grafik & Peta', body: 'Setiap indikator ditampilkan dengan grafik tren dan, jika tersedia, peta sebaran per provinsi yang bisa diklik.' },
    { title: '⬇️ Unduh Datanya', body: 'Butuh datanya untuk keperluan lain? Unduh dalam format CSV, Excel, JSON, atau PDF langsung dari halaman detail indikator.' },
    { title: '⭐ Buat Dasbor Pribadi', body: 'Buka menu "Dasbor Saya" untuk memilih indikator favorit Anda dan memantaunya dalam satu halaman.' },
    { title: '♿ Sesuaikan Tampilan', body: 'Gunakan toolbar aksesibilitas di bagian paling atas untuk memperbesar teks atau mengaktifkan kontras tinggi. Selamat menjelajah!' }
  ];
  let tutorialIndex = 0;
  const tutorialOverlay = document.getElementById('tutorialOverlay');

  function showTutorialStep() {
    const step = tutorialSteps[tutorialIndex];
    document.getElementById('tutorialStepIndicator').textContent = `Langkah ${tutorialIndex + 1} dari ${tutorialSteps.length}`;
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialBody').textContent = step.body;
    document.getElementById('tutorialPrev').style.visibility = tutorialIndex === 0 ? 'hidden' : 'visible';
    document.getElementById('tutorialNext').textContent = tutorialIndex === tutorialSteps.length - 1 ? 'Selesai ✓' : 'Selanjutnya ›';
  }

  function openTutorial() {
    tutorialIndex = 0;
    showTutorialStep();
    tutorialOverlay.hidden = false;
    document.getElementById('tutorialNext').focus();
  }
  function closeTutorial() {
    tutorialOverlay.hidden = true;
    localStorage.setItem('tutorialSeen', '1');
  }

  document.getElementById('tutorialNext').addEventListener('click', () => {
    if (tutorialIndex >= tutorialSteps.length - 1) { closeTutorial(); return; }
    tutorialIndex++;
    showTutorialStep();
  });
  document.getElementById('tutorialPrev').addEventListener('click', () => {
    tutorialIndex = Math.max(0, tutorialIndex - 1);
    showTutorialStep();
  });
  document.getElementById('tutorialClose').addEventListener('click', closeTutorial);
  document.getElementById('btnTutorial').addEventListener('click', openTutorial);
  tutorialOverlay.addEventListener('click', (e) => { if (e.target === tutorialOverlay) closeTutorial(); });

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  document.getElementById('year').textContent = new Date().getFullYear();
  router();
  if (!localStorage.getItem('tutorialSeen')) {
    setTimeout(openTutorial, 700);
  }
})();
