const { generateSimplePdf } = require('./simplePdf');

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function getRows(indicator) {
  if (indicator.provinceData && indicator.provinceData.length) {
    return {
      headers: ['Provinsi', `Nilai (${indicator.unit})`],
      rows: indicator.provinceData.map(p => [p.province, p.value])
    };
  }
  return {
    headers: ['Tahun', `Nilai (${indicator.unit})`],
    rows: indicator.series.map(s => [s.year, s.value])
  };
}

function toCsv(indicator) {
  const { headers, rows } = getRows(indicator);
  const lines = [];
  lines.push(`# ${indicator.name}`);
  lines.push(`# Sumber: ${indicator.source}`);
  lines.push(`# Diperbarui: ${indicator.updated}`);
  lines.push('');
  lines.push(headers.map(csvEscape).join(','));
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  return '\uFEFF' + lines.join('\r\n');
}

function toXls(indicator) {
  const { headers, rows } = getRows(indicator);
  const th = headers.map(h => `<th style="background:#1d4ed8;color:#fff;padding:6px;border:1px solid #999;">${h}</th>`).join('');
  const trs = rows.map(r => `<tr>${r.map(c => `<td style="padding:6px;border:1px solid #999;">${c}</td>`).join('')}</tr>`).join('');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>${indicator.name}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body>
    <h2>${indicator.name}</h2>
    <p>Sumber: ${indicator.source} | Diperbarui: ${indicator.updated}</p>
    <table>
      <thead><tr>${th}</tr></thead>
      <tbody>${trs}</tbody>
    </table>
  </body></html>`;
}

function toJson(indicator) {
  return JSON.stringify(indicator, null, 2);
}

function toPdf(indicator) {
  const { headers, rows } = getRows(indicator);
  const lines = [
    `Sumber: ${indicator.source}`,
    `Terakhir diperbarui: ${indicator.updated}`,
    `Satuan: ${indicator.unit}`,
    '',
    headers.join('   |   '),
    '-'.repeat(50),
    ...rows.map(r => r.join('   |   ')),
    '',
    'Deskripsi:',
    indicator.description
  ];
  return generateSimplePdf(indicator.name, `Kategori: ${indicator.category}`, lines);
}

module.exports = { toCsv, toXls, toJson, toPdf };
