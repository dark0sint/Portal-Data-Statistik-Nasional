# Portal Data Statistik Nasional

Aplikasi web (backend API + frontend) untuk portal data statistik, siap dijalankan di server manapun yang sudah terpasang **Node.js** — **tanpa perlu instal dependency/package tambahan** (tidak butuh `npm install`, tidak butuh database eksternal). Cocok untuk demo, prototipe, atau dikembangkan lebih lanjut.

## ✨ Fitur

1. **Navigasi & Pencarian Pintar**
   - Kolom pencarian prediktif berbasis bahasa sehari-hari (mis. "harga naik", "orang nganggur").
   - Kategori jelas: Ekonomi, Kependudukan, Kesehatan, Pendidikan, Lingkungan.
2. **Visualisasi Data Interaktif**
   - Grafik tren (Chart.js) untuk setiap indikator.
   - Peta sebaran antar-provinsi (Leaflet + OpenStreetMap) untuk indikator yang punya data provinsi.
   - Dasbor kustom — pilih indikator favorit, tersimpan otomatis di browser (localStorage).
3. **Kemudahan Akses Data**
   - Unduh data per indikator dalam format **CSV, Excel (.xls), JSON, dan PDF** langsung dari API.
   - Ringkasan "Ringkasan Cepat" (key takeaways) otomatis di setiap halaman indikator.
4. **Edukasi & Literasi Data**
   - Glosarium istilah statistik (Inflasi YoY, Gini Ratio, IPM, dll) yang bisa dicari.
   - Tutorial interaktif (tour) yang muncul otomatis saat pertama kali membuka situs, bisa dibuka ulang lewat tombol "🎓 Panduan".
5. **Aksesibilitas & Responsivitas**
   - Mobile-friendly (breakpoint di 980px & 640px), menu hamburger di layar kecil.
   - Toolbar aksesibilitas: perbesar/perkecil teks, mode kontras tinggi, skip-to-content link, label ARIA di elemen interaktif, fokus keyboard yang jelas.

## 🧱 Arsitektur & Teknologi

- **Backend:** Node.js murni (modul bawaan `http`, `fs`, `path` — tidak ada Express/library lain), menyajikan REST API dan file statis dari folder `public/`.
- **Data:** disimpan sebagai file JSON di folder `data/` (tanpa database). Mudah diganti ke database sungguhan (PostgreSQL/MySQL/MongoDB) di kemudian hari — cukup ubah bagian "Load data" di `server.js`.
- **Frontend:** HTML + CSS + JavaScript vanilla (SPA sederhana berbasis hash-routing), memakai Chart.js dan Leaflet dari CDN.
- **Ekspor file:** dibuat manual tanpa library (`lib/exporters.js`, `lib/simplePdf.js`) supaya proyek tetap 100% zero-dependency.

> Catatan jujur soal format Excel: file `.xls` yang dihasilkan adalah tabel HTML yang dikenali Microsoft Excel (teknik umum & valid), bukan format `.xlsx` (OOXML) asli. Ini dipilih supaya proyek tidak butuh instalasi library tambahan. Jika ke depan Anda ingin `.xlsx` asli, tinggal pasang library seperti `exceljs` dan ganti isi fungsi `toXls` di `lib/exporters.js`.

## 📁 Struktur Folder

```
portal-statistik/
├── server.js                  # Entry point server (jalankan ini)
├── package.json
├── lib/
│   ├── exporters.js            # Generator CSV / Excel(.xls) / JSON / PDF
│   └── simplePdf.js            # Generator PDF minimal tanpa dependency
├── data/
│   ├── categories.json
│   ├── indicators.json         # Data indikator + deret waktu + data provinsi
│   ├── glossary.json
│   ├── provinces.json
│   └── _generate.js             # Skrip pembuat indicators.json (opsional, untuk regenerasi data contoh)
├── public/                     # Frontend statis
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── deploy/
│   ├── nginx.conf.example
│   └── portal-statistik.service.example
└── ecosystem.config.js         # Konfigurasi PM2
```

## 🚀 Cara Menjalankan (Lokal)

Prasyarat: Node.js versi 18 ke atas.

```bash
# 1. Ekstrak/unggah folder ini ke server atau komputer Anda
cd portal-statistik

# 2. Jalankan server (tidak perlu npm install!)
node server.js

# 3. Buka di browser
# http://localhost:3000
```

Ingin port lain?

```bash
PORT=8080 node server.js
```

## 🖥️ Cara Deploy ke Server (Produksi)

### Opsi A — PM2 (disarankan, auto-restart)

```bash
npm install -g pm2          # sekali saja di server
cd portal-statistik
pm2 start ecosystem.config.js
pm2 save
pm2 startup                 # ikuti instruksi agar PM2 jalan otomatis saat server reboot
```

### Opsi B — systemd

```bash
sudo cp -r portal-statistik /var/www/portal-statistik
sudo cp /var/www/portal-statistik/deploy/portal-statistik.service.example /etc/systemd/system/portal-statistik.service
sudo systemctl daemon-reload
sudo systemctl enable --now portal-statistik
sudo systemctl status portal-statistik
```

### Reverse proxy dengan Nginx (opsional, untuk domain + HTTPS)

Contoh konfigurasi ada di `deploy/nginx.conf.example`. Setelah domain mengarah ke server:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/portal-statistik
sudo ln -s /etc/nginx/sites-available/portal-statistik /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d data.namadomainanda.go.id   # aktifkan HTTPS gratis
```

## 🔌 Ringkasan API

| Endpoint | Keterangan |
|---|---|
| `GET /api/categories` | Daftar kategori + jumlah indikator |
| `GET /api/indicators?category=&q=` | Daftar indikator, bisa difilter kategori/kata kunci |
| `GET /api/indicators/:id` | Detail lengkap satu indikator (termasuk deret waktu) |
| `GET /api/search?q=` | Pencarian prediktif (dipakai kolom pencarian) |
| `GET /api/glossary` | Daftar istilah glosarium |
| `GET /api/provinces` | Daftar 34 provinsi + koordinat (untuk peta) |
| `GET /api/stats/summary` | Ringkasan untuk beranda (indikator sorotan) |
| `GET /api/export/:id?format=csv\|xlsx\|json\|pdf` | Unduh data satu indikator |
| `GET /api/health` | Cek status server |

## ✏️ Mengubah / Menambah Data

Karena ini masih **data ilustrasi/contoh**, sebelum dipakai untuk produksi resmi, ganti isi `data/indicators.json` dengan data statistik yang valid dari sumber resmi Anda (mis. BPS). Struktur satu indikator:

```json
{
  "id": "kode-unik",
  "category": "ekonomi",
  "name": "Nama Indikator",
  "unit": "% YoY",
  "short": "Deskripsi satu kalimat.",
  "description": "Penjelasan lebih panjang untuk ringkasan cepat.",
  "source": "Nama sumber data",
  "updated": "2024-12-01",
  "keywords": ["kata kunci awam 1", "kata kunci awam 2"],
  "series": [{ "year": 2019, "value": 5.02 }],
  "provinceData": [{ "province_id": "31", "province": "DKI Jakarta", "value": 8.5 }]
}
```

`provinceData` bersifat opsional — isi jika ingin indikator tersebut punya peta sebaran.

Setelah mengubah `data/*.json`, cukup restart server (`pm2 restart portal-statistik` atau `systemctl restart portal-statistik`) — tidak perlu build ulang apa pun.

## 🔒 Catatan Keamanan Produksi

- Aplikasi ini tidak menyertakan autentikasi karena semua data bersifat publik (data terbuka). Jika perlu panel admin untuk mengubah data, tambahkan lapisan login terpisah.
- Selalu jalankan di belakang HTTPS (lihat contoh Nginx + Certbot di atas) saat sudah live di domain publik.
- Jika volume traffic tinggi, pertimbangkan migrasi dari file JSON ke database sungguhan.

## 📄 Lisensi

MIT — bebas digunakan dan dimodifikasi untuk kebutuhan pemerintah/instansi/organisasi Anda.
