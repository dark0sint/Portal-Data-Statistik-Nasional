/**
 * Generator PDF minimal tanpa dependency eksternal.
 * Cukup untuk membuat dokumen satu-beberapa halaman berisi teks (judul + baris data),
 * memakai font standar Helvetica (built-in di semua PDF reader).
 */

function escapePdfText(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(line, maxChars) {
  if (line.length <= maxChars) return [line];
  const words = line.split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      out.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * @param {string} title - Judul dokumen
 * @param {string} subtitle - Sub judul / deskripsi singkat
 * @param {string[]} lines - Baris-baris isi (mis. "2019: 5.02")
 * @returns {Buffer} isi file PDF
 */
function generateSimplePdf(title, subtitle, lines) {
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const marginX = 50;
  let y = pageHeight - 60;
  const lineHeight = 16;
  const maxCharsPerLine = 95;

  const pages = [];
  let currentLines = [];

  function pushLine(text, size, bold) {
    currentLines.push({ text, size, bold });
  }

  pushLine(title, 18, true);
  pushLine(subtitle, 10, false);
  pushLine('', 10, false);
  for (const raw of lines) {
    for (const wrapped of wrapLine(raw, maxCharsPerLine)) {
      pushLine(wrapped, 11, false);
    }
  }

  // Bagi jadi beberapa halaman jika terlalu panjang
  const linesPerPage = Math.floor((pageHeight - 120) / lineHeight);
  for (let i = 0; i < currentLines.length; i += linesPerPage) {
    pages.push(currentLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([]);

  const objects = [];
  function addObject(content) {
    objects.push(content);
    return objects.length; // ID objek (1-based)
  }

  const fontRegularId = 1;
  const fontBoldId = 2;
  objects[0] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  const pageObjIds = [];
  const contentObjIds = [];

  for (const pageLines of pages) {
    let y = pageHeight - 60;
    let stream = 'BT\n';
    for (const item of pageLines) {
      const font = item.bold ? '/F2' : '/F1';
      stream += `${font} ${item.size} Tf\n1 0 0 1 ${marginX} ${y.toFixed(1)} Tm\n(${escapePdfText(item.text)}) Tj\n`;
      y -= lineHeight;
    }
    stream += 'ET';
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    contentObjIds.push(contentId);
  }

  const kidsPlaceholderStart = objects.length + 1;
  for (let i = 0; i < pages.length; i++) {
    const pageId = addObject(''); // placeholder, akan diisi setelah tahu ID Pages
    pageObjIds.push(pageId);
  }

  const pagesId = addObject(`<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`);

  for (let i = 0; i < pageObjIds.length; i++) {
    objects[pageObjIds[i] - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentObjIds[i]} 0 R >>`;
  }

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  // Rakit file PDF
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

module.exports = { generateSimplePdf };
