// Skrip internal untuk membangkitkan data contoh indicators.json secara konsisten.
// Jalankan: node _generate.js  (hasil ditulis ke indicators.json)
const fs = require('fs');
const path = require('path');

const provinces = JSON.parse(fs.readFileSync(path.join(__dirname, 'provinces.json'), 'utf8'));

function randRange(min, max) { return min + Math.random() * (max - min); }

const years = [2019, 2020, 2021, 2022, 2023, 2024];

function series(base, trendPerYear, noise, decimals = 2) {
  let v = base;
  return years.map((y, i) => {
    if (i > 0) v += trendPerYear + randRange(-noise, noise);
    return { year: y, value: Number(v.toFixed(decimals)) };
  });
}

function provinceBreakdown(base, spread, decimals = 1) {
  return provinces.map(p => ({
    province_id: p.id,
    province: p.name,
    value: Number((base + randRange(-spread, spread)).toFixed(decimals))
  }));
}

const indicators = [
  {
    id: "pdb-growth",
    category: "ekonomi",
    name: "Pertumbuhan Ekonomi (PDB)",
    unit: "% YoY",
    short: "Laju pertumbuhan Produk Domestik Bruto dibanding tahun sebelumnya.",
    description: "Pertumbuhan Ekonomi (PDB) mengukur perubahan nilai seluruh barang dan jasa yang diproduksi dalam suatu periode dibandingkan periode yang sama tahun sebelumnya. Indikator ini menjadi penanda utama kesehatan perekonomian nasional.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-12-01",
    keywords: ["ekonomi tumbuh", "pdb", "gdp", "pertumbuhan ekonomi", "kondisi ekonomi", "resesi"],
    series: [
      { year: 2019, value: 5.02 },
      { year: 2020, value: -2.07 },
      { year: 2021, value: 3.70 },
      { year: 2022, value: 5.31 },
      { year: 2023, value: 5.05 },
      { year: 2024, value: Number((5.03 + randRange(-0.2, 0.2)).toFixed(2)) }
    ]
  },
  {
    id: "inflasi",
    category: "ekonomi",
    name: "Inflasi (YoY)",
    unit: "% YoY",
    short: "Kenaikan harga barang dan jasa secara umum dibanding tahun lalu.",
    description: "Inflasi YoY (Year on Year) menggambarkan persentase kenaikan harga secara umum pada bulan tertentu dibandingkan bulan yang sama tahun sebelumnya. Semakin tinggi inflasi, semakin cepat daya beli uang menurun.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-12-01",
    keywords: ["harga naik", "harga barang", "inflasi", "daya beli", "harga sembako"],
    series: series(2.72, 0.1, 1.5, 2)
  },
  {
    id: "pengangguran",
    category: "ekonomi",
    name: "Tingkat Pengangguran Terbuka (TPT)",
    unit: "%",
    short: "Persentase angkatan kerja yang sedang tidak bekerja dan mencari kerja.",
    description: "Tingkat Pengangguran Terbuka (TPT) adalah persentase jumlah orang yang termasuk angkatan kerja namun tidak memiliki pekerjaan dan sedang aktif mencari pekerjaan, dibandingkan total angkatan kerja.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-08-01",
    keywords: ["pengangguran", "orang nganggur", "cari kerja", "lowongan kerja", "tpt"],
    series: series(5.28, -0.15, 0.5, 2),
    provinceData: provinceBreakdown(5.0, 3.5, 2)
  },
  {
    id: "kemiskinan",
    category: "ekonomi",
    name: "Tingkat Kemiskinan",
    unit: "% penduduk",
    short: "Persentase penduduk dengan pengeluaran di bawah garis kemiskinan.",
    description: "Tingkat kemiskinan menunjukkan proporsi penduduk yang memiliki rata-rata pengeluaran per kapita per bulan di bawah garis kemiskinan yang ditetapkan.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-09-01",
    keywords: ["penduduk miskin", "kemiskinan", "garis kemiskinan", "warga miskin"],
    series: series(9.41, -0.15, 0.4, 2)
  },
  {
    id: "gini-ratio",
    category: "ekonomi",
    name: "Gini Ratio",
    unit: "indeks (0-1)",
    short: "Ukuran ketimpangan distribusi pengeluaran/pendapatan penduduk.",
    description: "Gini Ratio adalah ukuran statistik yang menggambarkan tingkat pemerataan distribusi pendapatan atau pengeluaran penduduk. Nilainya berkisar 0 (sempurna merata) hingga 1 (sangat timpang).",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-09-01",
    keywords: ["ketimpangan", "kesenjangan ekonomi", "gini ratio", "distribusi pendapatan"],
    series: series(0.380, -0.002, 0.006, 3)
  },
  {
    id: "penduduk",
    category: "kependudukan",
    name: "Jumlah Penduduk",
    unit: "juta jiwa",
    short: "Total penduduk Indonesia berdasarkan proyeksi/sensus.",
    description: "Jumlah penduduk merupakan hasil sensus atau proyeksi penduduk yang mencakup seluruh warga negara dan penduduk yang berdomisili di wilayah Indonesia pada periode tertentu.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-06-01",
    keywords: ["jumlah penduduk", "berapa penduduk indonesia", "populasi", "sensus penduduk"],
    series: series(268.6, 1.6, 0.3, 1),
    provinceData: provinceBreakdown(8.5, 8.0, 2)
  },
  {
    id: "laju-penduduk",
    category: "kependudukan",
    name: "Laju Pertumbuhan Penduduk",
    unit: "% per tahun",
    short: "Rata-rata pertambahan jumlah penduduk per tahun.",
    description: "Laju Pertumbuhan Penduduk (LPP) mengukur rata-rata persentase pertambahan penduduk per tahun pada periode tertentu, dipengaruhi oleh kelahiran, kematian, dan migrasi.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-06-01",
    keywords: ["pertumbuhan penduduk", "laju penduduk", "kelahiran", "angka kelahiran"],
    series: series(1.25, -0.02, 0.05, 2)
  },
  {
    id: "ipm",
    category: "kependudukan",
    name: "Indeks Pembangunan Manusia (IPM)",
    unit: "indeks (0-100)",
    short: "Ukuran capaian pembangunan manusia dari sisi kesehatan, pendidikan, dan ekonomi.",
    description: "Indeks Pembangunan Manusia (IPM) mengukur capaian pembangunan manusia berbasis sejumlah komponen dasar kualitas hidup: umur panjang dan hidup sehat, pengetahuan, serta standar hidup layak.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-11-01",
    keywords: ["ipm", "kualitas hidup", "pembangunan manusia", "human development index"],
    series: series(71.92, 0.5, 0.15, 2),
    provinceData: provinceBreakdown(72, 6, 2)
  },
  {
    id: "harapan-hidup",
    category: "kesehatan",
    name: "Angka Harapan Hidup",
    unit: "tahun",
    short: "Perkiraan rata-rata usia yang dapat dicapai penduduk sejak lahir.",
    description: "Angka Harapan Hidup (AHH) menggambarkan rata-rata perkiraan banyak tahun yang dapat ditempuh oleh seseorang sejak lahir dalam kondisi mortalitas yang berlaku di lingkungannya.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-11-01",
    keywords: ["harapan hidup", "usia harapan hidup", "umur panjang"],
    series: series(71.34, 0.12, 0.08, 2)
  },
  {
    id: "kematian-bayi",
    category: "kesehatan",
    name: "Angka Kematian Bayi (AKB)",
    unit: "per 1.000 kelahiran hidup",
    short: "Jumlah kematian bayi sebelum usia 1 tahun per 1.000 kelahiran hidup.",
    description: "Angka Kematian Bayi (AKB) adalah jumlah kematian bayi berusia di bawah satu tahun per 1.000 kelahiran hidup pada tahun tertentu, mencerminkan kualitas layanan kesehatan ibu dan anak.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-10-01",
    keywords: ["kematian bayi", "akb", "kesehatan ibu dan anak"],
    series: series(20.6, -0.4, 0.3, 1)
  },
  {
    id: "stunting",
    category: "kesehatan",
    name: "Prevalensi Stunting",
    unit: "% balita",
    short: "Persentase balita dengan tinggi badan tidak sesuai usia (kekerdilan).",
    description: "Prevalensi Stunting mengukur persentase balita yang mengalami gangguan pertumbuhan (tinggi badan tidak sesuai usia) akibat kekurangan gizi kronis, terutama pada 1.000 hari pertama kehidupan.",
    source: "Survei Kesehatan Indonesia (data ilustrasi)",
    updated: "2024-06-01",
    keywords: ["stunting", "gizi buruk", "anak pendek", "kekerdilan"],
    series: series(27.7, -1.4, 0.8, 1),
    provinceData: provinceBreakdown(22, 8, 1)
  },
  {
    id: "aps",
    category: "pendidikan",
    name: "Angka Partisipasi Sekolah (APS)",
    unit: "%",
    short: "Persentase penduduk usia sekolah yang masih bersekolah.",
    description: "Angka Partisipasi Sekolah (APS) menunjukkan persentase penduduk pada kelompok usia sekolah tertentu yang masih mengikuti pendidikan di sekolah, digunakan untuk memantau akses pendidikan.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-09-01",
    keywords: ["anak sekolah", "partisipasi sekolah", "putus sekolah", "aps"],
    series: series(97.3, 0.15, 0.2, 2)
  },
  {
    id: "lama-sekolah",
    category: "pendidikan",
    name: "Rata-rata Lama Sekolah",
    unit: "tahun",
    short: "Rata-rata jumlah tahun pendidikan yang ditempuh penduduk usia 25 tahun ke atas.",
    description: "Rata-rata Lama Sekolah (RLS) menggambarkan jumlah tahun yang digunakan penduduk usia 25 tahun ke atas dalam menjalani pendidikan formal, tidak termasuk tahun mengulang kelas.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-11-01",
    keywords: ["lama sekolah", "pendidikan rata-rata", "rls"],
    series: series(8.34, 0.08, 0.05, 2)
  },
  {
    id: "melek-huruf",
    category: "pendidikan",
    name: "Angka Melek Huruf",
    unit: "%",
    short: "Persentase penduduk usia 15 tahun ke atas yang bisa membaca dan menulis.",
    description: "Angka Melek Huruf mengukur persentase penduduk usia 15 tahun ke atas yang memiliki kemampuan membaca dan menulis huruf latin maupun huruf lainnya.",
    source: "Badan Pusat Statistik (data ilustrasi)",
    updated: "2024-09-01",
    keywords: ["melek huruf", "buta huruf", "kemampuan baca tulis"],
    series: series(96.1, 0.12, 0.1, 2)
  },
  {
    id: "tutupan-hutan",
    category: "lingkungan",
    name: "Luas Tutupan Hutan",
    unit: "% dari luas daratan",
    short: "Persentase wilayah daratan yang masih tertutup hutan.",
    description: "Luas Tutupan Hutan menggambarkan proporsi wilayah daratan Indonesia yang masih berupa kawasan berhutan, menjadi salah satu indikator penting kelestarian lingkungan dan keanekaragaman hayati.",
    source: "Kementerian Lingkungan Hidup dan Kehutanan (data ilustrasi)",
    updated: "2024-07-01",
    keywords: ["hutan", "deforestasi", "tutupan hutan", "kehutanan"],
    series: series(50.1, -0.25, 0.2, 2)
  },
  {
    id: "iklh",
    category: "lingkungan",
    name: "Indeks Kualitas Lingkungan Hidup (IKLH)",
    unit: "indeks (0-100)",
    short: "Ukuran kualitas air, udara, dan tutupan lahan secara nasional.",
    description: "Indeks Kualitas Lingkungan Hidup (IKLH) adalah indeks komposit yang menggambarkan kualitas air, udara, dan tutupan lahan pada suatu wilayah dan periode tertentu.",
    source: "Kementerian Lingkungan Hidup dan Kehutanan (data ilustrasi)",
    updated: "2024-07-01",
    keywords: ["kualitas lingkungan", "iklh", "kualitas udara", "kualitas air"],
    series: series(71.2, 0.4, 0.6, 2)
  },
  {
    id: "emisi-grk",
    category: "lingkungan",
    name: "Emisi Gas Rumah Kaca",
    unit: "juta ton CO2e",
    short: "Total emisi gas rumah kaca nasional per tahun.",
    description: "Emisi Gas Rumah Kaca (GRK) mengukur total gas seperti CO2, metana, dan gas lain yang berkontribusi pada efek rumah kaca dan perubahan iklim, dihasilkan dari berbagai sektor termasuk energi, kehutanan, dan pertanian.",
    source: "Kementerian Lingkungan Hidup dan Kehutanan (data ilustrasi)",
    updated: "2024-07-01",
    keywords: ["emisi karbon", "gas rumah kaca", "perubahan iklim", "grk"],
    series: series(1800, 25, 40, 0)
  }
];

fs.writeFileSync(path.join(__dirname, 'indicators.json'), JSON.stringify(indicators, null, 2));
console.log('indicators.json dibuat dengan', indicators.length, 'indikator.');
