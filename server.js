/**
 * Portal Data Statistik Nasional
 * Server backend + API, dibangun 100% dengan modul bawaan Node.js (tanpa dependency npm),
 * supaya mudah di-deploy di server manapun yang sudah terpasang Node.js.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { toCsv, toXls, toJson, toPdf } = require('./lib/exporters');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');

// ---------- Load data ke memori ----------
function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}
let categories = loadJson('categories.json');
let indicators = loadJson('indicators.json');
let glossary = loadJson('glossary.json');
let provinces = loadJson('provinces.json');

function reloadData() {
  categories = loadJson('categories.json');
  indicators = loadJson('indicators.json');
  glossary = loadJson('glossary.json');
  provinces = loadJson('provinces.json');
}

// ---------- Helper ----------
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function notFound(res, msg = 'Tidak ditemukan') {
  sendJson(res, 404, { error: msg });
}

function normalize(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function indicatorPublic(ind) {
  const latest = ind.series[ind.series.length - 1];
  const prev = ind.series[ind.series.length - 2];
  const change = prev ? Number((latest.value - prev.value).toFixed(3)) : null;
  return {
    id: ind.id,
    category: ind.category,
    name: ind.name,
    unit: ind.unit,
    short: ind.short,
    latestYear: latest.year,
    latestValue: latest.value,
    change,
    hasMap: !!(ind.provinceData && ind.provinceData.length)
  };
}

// ---------- MIME types untuk static file ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  // cegah path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) return notFound(res);
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback ke index.html untuk route non-file (mis. /dashboard)
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      if (!path.extname(pathname)) {
        fs.readFile(indexPath, (e2, content) => {
          if (e2) return notFound(res);
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          res.end(content);
        });
        return;
      }
      return notFound(res, 'File tidak ditemukan');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ---------- API Handlers ----------
function handleApi(req, res, pathname, query) {
  // GET /api/categories
  if (pathname === '/api/categories' && req.method === 'GET') {
    const withCount = categories.map(c => ({
      ...c,
      indicatorCount: indicators.filter(i => i.category === c.id).length
    }));
    return sendJson(res, 200, withCount);
  }

  // GET /api/indicators?category=&q=
  if (pathname === '/api/indicators' && req.method === 'GET') {
    let list = indicators;
    if (query.category) list = list.filter(i => i.category === query.category);
    if (query.q) {
      const q = normalize(query.q);
      list = list.filter(i =>
        normalize(i.name).includes(q) ||
        normalize(i.short).includes(q) ||
        (i.keywords || []).some(k => normalize(k).includes(q))
      );
    }
    return sendJson(res, 200, list.map(indicatorPublic));
  }

  // GET /api/indicators/:id
  const indMatch = pathname.match(/^\/api\/indicators\/([a-z0-9-]+)$/);
  if (indMatch && req.method === 'GET') {
    const ind = indicators.find(i => i.id === indMatch[1]);
    if (!ind) return notFound(res, 'Indikator tidak ditemukan');
    return sendJson(res, 200, ind);
  }

  // GET /api/search?q=
  if (pathname === '/api/search' && req.method === 'GET') {
    const q = normalize(query.q || '');
    if (!q || q.length < 2) return sendJson(res, 200, []);
    const scored = [];
    for (const ind of indicators) {
      let score = 0;
      const name = normalize(ind.name);
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else if ((ind.keywords || []).some(k => normalize(k).includes(q))) score = 50;
      else if (normalize(ind.short).includes(q)) score = 30;
      else if (normalize(ind.category).includes(q)) score = 20;
      if (score > 0) scored.push({ score, ind });
    }
    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, 8).map(s => ({
      id: s.ind.id,
      name: s.ind.name,
      category: s.ind.category,
      unit: s.ind.unit,
      short: s.ind.short
    }));
    return sendJson(res, 200, results);
  }

  // GET /api/glossary
  if (pathname === '/api/glossary' && req.method === 'GET') {
    return sendJson(res, 200, glossary);
  }

  // GET /api/provinces
  if (pathname === '/api/provinces' && req.method === 'GET') {
    return sendJson(res, 200, provinces);
  }

  // GET /api/stats/summary -> ringkasan untuk beranda
  if (pathname === '/api/stats/summary' && req.method === 'GET') {
    const highlightIds = ['pdb-growth', 'inflasi', 'penduduk', 'ipm', 'pengangguran', 'stunting'];
    const highlights = highlightIds
      .map(id => indicators.find(i => i.id === id))
      .filter(Boolean)
      .map(indicatorPublic);
    return sendJson(res, 200, {
      totalIndicators: indicators.length,
      totalCategories: categories.length,
      highlights
    });
  }

  // GET /api/export/:id?format=csv|xlsx|json|pdf
  const exMatch = pathname.match(/^\/api\/export\/([a-z0-9-]+)$/);
  if (exMatch && req.method === 'GET') {
    const ind = indicators.find(i => i.id === exMatch[1]);
    if (!ind) return notFound(res, 'Indikator tidak ditemukan');
    const format = (query.format || 'csv').toLowerCase();
    const filenameBase = ind.id;
    try {
      if (format === 'csv') {
        const body = toCsv(ind);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.csv"`
        });
        return res.end(body);
      }
      if (format === 'xlsx' || format === 'xls') {
        const body = toXls(ind);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.xls"`
        });
        return res.end(body);
      }
      if (format === 'json') {
        const body = toJson(ind);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.json"`
        });
        return res.end(body);
      }
      if (format === 'pdf') {
        const body = toPdf(ind);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`
        });
        return res.end(body);
      }
      return sendJson(res, 400, { error: 'Format tidak didukung. Gunakan csv, xlsx, json, atau pdf.' });
    } catch (e) {
      console.error(e);
      return sendJson(res, 500, { error: 'Gagal membuat file ekspor.' });
    }
  }

  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
  }

  return notFound(res, 'Endpoint API tidak ditemukan');
}

// ---------- Server ----------
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);
  const query = parsed.query;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (pathname.startsWith('/api/')) {
    try {
      return handleApi(req, res, pathname, query);
    } catch (e) {
      console.error(e);
      return sendJson(res, 500, { error: 'Internal server error' });
    }
  }

  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Portal Data Statistik Nasional berjalan di http://localhost:${PORT}`);
});

module.exports = { server, reloadData };
