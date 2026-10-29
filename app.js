(function () {
  var L = Logic, secs = PRODUCTS.sections;
  var flat = [];
  secs.forEach(function (s, si) { s.items.forEach(function (it) { flat.push({ it: it, si: si }); }); });

  var storage = null;
  try { storage = window.localStorage; storage.getItem('x'); } catch (e) { storage = null; }
  var seen = {};
  var keys = flat.map(function (f) {
    var base = f.it.name + '|' + f.it.sku, n = seen[base] || 0;
    seen[base] = n + 1;
    return base + '|' + n;
  });
  var store = createStore(storage, flat.map(function (f) { return f.it.qty; }), keys);

  var floor = 1;
  try { floor = Number(storage.getItem('stock.tab')) === 2 ? 2 : 1; } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var list = $('list'), rows = [], armTimer = null, toastTimer = null;

  function build() {
    list.textContent = '';
    rows = [];
    var k = 0;
    secs.forEach(function (s) {
      var sec = document.createElement('section');
      sec.innerHTML = '<button class="sec-h"><span></span><span class="n"></span></button><ul></ul>';
      sec.querySelector('.sec-h span').textContent = s.title;
      var ul = sec.querySelector('ul');
      s.items.forEach(function (it) {
        var li = document.createElement('li');
        li.dataset.i = k;
        li.innerHTML = '<div><div class="name"></div><div class="sub"></div></div>' +
          '<div class="ctl"><button class="minus" data-d="-1" aria-label="הפחת">−</button>' +
          '<span class="qty"></span><button class="plus" data-d="1" aria-label="הוסף">+</button></div>';
        li.querySelector('.name').textContent = it.name;
        ul.appendChild(li);
        rows.push(li);
        k++;
      });
      list.appendChild(sec);
    });
    var none = document.createElement('div');
    none.className = 'empty-msg'; none.id = 'none'; none.textContent = 'לא נמצאו מוצרים'; none.hidden = true;
    list.appendChild(none);
  }

  function paintRow(i) {
    var d = store.get(floor), li = rows[i];
    var cur = d.current[i], was = d.last[i], it = flat[i].it;
    var q = li.querySelector('.qty');
    q.textContent = cur || '–';
    q.classList.toggle('empty', !cur);
    li.classList.toggle('changed', cur !== was);
    li.querySelector('.sub').textContent =
      (it.sku ? 'מק״ט ' + it.sku : 'ללא מק״ט') + (cur !== was ? ' · היה: ' + (was || '–') : '');
  }

  function paintCounts() {
    var d = store.get(floor);
    list.querySelectorAll('section').forEach(function (sec) {
      var lis = sec.querySelectorAll('li'), ordered = 0;
      lis.forEach(function (li) { if (d.current[li.dataset.i]) ordered++; });
      sec.querySelector('.n').textContent = ordered ? ordered + ' בהזמנה' : '';
    });
  }

  function paintAll() {
    for (var i = 0; i < rows.length; i++) paintRow(i);
    paintCounts();
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', String(Number(b.dataset.floor) === floor));
    });
    var d = store.get(floor);
    $('meta').textContent = d.lastDate ? 'הזמנה אחרונה: ' + d.lastDate : 'עוד לא נשלחה הזמנה מקומה זו';
    $('banner').hidden = store.persistent;
    filter();
  }

  function filter() {
    var q = $('q').value, shown = 0;
    rows.forEach(function (li, i) {
      var m = L.matches(flat[i].it, q);
      li.hidden = !m;
      if (m) shown++;
    });
    list.querySelectorAll('section').forEach(function (sec) {
      var any = sec.querySelector('li:not([hidden])');
      sec.hidden = !any;
      if (q) sec.classList.remove('closed');
    });
    $('none').hidden = shown > 0;
  }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 4000);
  }

  function disarm() { clearTimeout(armTimer); $('reset').classList.remove('armed'); $('reset').textContent = 'אפס הכל'; }

  list.addEventListener('click', function (e) {
    var h = e.target.closest('.sec-h');
    if (h) { h.parentElement.classList.toggle('closed'); return; }
    var b = e.target.closest('button[data-d]');
    if (!b) return;
    var i = Number(b.closest('li').dataset.i);
    var d = store.get(floor);
    store.set(floor, i, L.stepQty(d.current[i], Number(b.dataset.d)));
    paintRow(i); paintCounts();
  });

  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      floor = Number(b.dataset.floor);
      try { storage.setItem('stock.tab', String(floor)); } catch (e) {}
      disarm(); paintAll(); window.scrollTo(0, 0);
    });
  });
  $('q').addEventListener('input', filter);

  $('reset').addEventListener('click', function () {
    var btn = $('reset');
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'בטוח? לחץ שוב';
      armTimer = setTimeout(disarm, 3000); return;
    }
    disarm(); store.reset(floor); paintAll(); toast('כל הכמויות אופסו (ההזמנה האחרונה נשמרה)');
  });

  $('send').addEventListener('click', function () {
    var d = store.get(floor);
    Export.send(floor, d.current).then(function (res) {
      if (res === 'cancelled') return;
      var iso = new Date().toLocaleDateString('he-IL');
      store.submit(floor, iso);
      paintAll();
      toast(res === 'shared' ? 'הקובץ נשלח' : 'הקובץ ירד למכשיר');
    }, function (err) { toast('שגיאה ביצירת הקובץ: ' + err.message); });
  });

  build(); paintAll();
  if (store.migrated) toast('רשימת המוצרים עודכנה – הכמויות השמורות הותאמו');
})();
