// Pure helpers: quantity text handling, search matching, export row building.
globalThis.Logic = (function () {
  var HEADER = ['שם המוצר', 'מקט', 'כמות'];

  function parseQty(text) {
    var m = /^\s*(\d+(?:\.\d+)?)\s*(.*?)\s*$/.exec(text || '');
    return m ? { n: parseFloat(m[1]), unit: m[2] } : null;
  }

  function formatQty(q) {
    if (!q || !(q.n > 0)) return '';
    return q.unit ? q.n + ' ' + q.unit : String(q.n);
  }

  function stepQty(text, dir) {
    var q = parseQty(text) || { n: 0, unit: '' };
    var step = q.n % 1 !== 0 ? 0.5 : 1;
    return formatQty({ n: q.n + dir * step, unit: q.unit });
  }

  function normalize(s) {
    return String(s).toLowerCase().replace(/[׳'’״"]/g, '').replace(/\s+/g, ' ').trim();
  }

  function matches(item, query) {
    var q = normalize(query);
    if (!q) return true;
    return normalize(item.name).indexOf(q) !== -1 || item.sku.indexOf(q) !== -1;
  }

  function cell(text) { return /^\d+(\.\d+)?$/.test(text) ? Number(text) : text; }

  // qtys is indexed by the item's position in the flattened product list.
  function buildRows(products, qtys) {
    var rows = [HEADER.slice()], k = 0;
    products.sections.forEach(function (sec, si) {
      if (si > 0) rows.push([]);
      sec.items.forEach(function (it) {
        rows.push([it.name, cell(it.sku), cell(qtys[k++] || '')]);
      });
    });
    return rows;
  }

  function exportFilename(floor, date) {
    return 'הזמנה - קומה ' + floor + ' - ' + date.getDate() + '.' + (date.getMonth() + 1) + '.xlsx';
  }

  return { parseQty: parseQty, formatQty: formatQty, stepQty: stepQty, normalize: normalize,
           matches: matches, buildRows: buildRows, exportFilename: exportFilename };
})();
