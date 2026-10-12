(function () {
  'use strict';
  var CATEGORIES = window.CATEGORIES, QUOTES = window.QUOTES, ANY = 0;
  var COLORS = { 1: '#f6c453', 2: '#8fb8de', 3: '#b9a3e3', 4: '#f09a9a', 5: '#7ccaa0', 0: '#f6c453' };
  var REMOTE_COVERS = true; // YES24 표지 사용 (없거나 못 불러오면 회색 대체 표지)
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); };
  var play = function (el, frames, opts) {
    if (reduce || !el.animate) return Promise.resolve();
    return el.animate(frames, opts).finished.catch(function () {});
  };

  var state = { category: null, current: null, seen: {}, busy: false, copySize: null, wakeLock: null, image: null };

  function cat(id) { return CATEGORIES.filter(function (c) { return c.id === id; })[0]; }
  function pad(n) { return String(n).padStart(3, '0'); }
  function coverUrl(q) { return REMOTE_COVERS && q.yes24 ? 'https://image.yes24.com/goods/' + q.yes24 + '/XL' : null; }
  function bookLine(q) { return '『' + q.title + '』' + (q.piece ? ' 「' + q.piece + '」' : ''); }
  function authorLine(q) { return [q.author].concat(q.note ? [q.note] : [], [q.origin + ' ' + q.genre]).join(' · '); }
  function lines(text) { return text.split(/\s*\/\s*/); }
  function setSentence(el, text) {
    el.textContent = '';
    lines(text).forEach(function (l, i) {
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(l));
    });
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function led(main, sub, blink) {
    var el = $('led');
    el.innerHTML = '<strong></strong>' + (sub ? '<small></small>' : '');
    el.querySelector('strong').textContent = main;
    if (sub) el.querySelector('small').textContent = sub;
    el.classList.toggle('blink', !!blink);
  }

  // ---------- 진열창 ----------
  function buildShelves() {
    var box = $('shelves');
    CATEGORIES.forEach(function (c) { box.appendChild(makeItem(c.id, c.name, false)); });
    box.appendChild(makeItem(ANY, '아무 문장이나 좋아요', true));
  }
  function makeItem(id, name, mystery) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'item';
    b.dataset.id = id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.style.setProperty('--c', COLORS[id]);
    b.innerHTML = '<span class="goods">' +
      (mystery ? '<span class="mystery"><b>?</b></span>' : '<span class="book back"></span><span class="book"></span>') +
      '</span><span class="tag"><span></span></span>';
    b.querySelector('.tag span').textContent = name;
    b.addEventListener('click', function () { select(id); });
    return b;
  }
  function itemEl(id) { return document.querySelector('.item[data-id="' + id + '"]'); }

  function select(id) {
    if (state.busy) return;
    state.category = id;
    document.querySelectorAll('.item').forEach(function (b) {
      b.setAttribute('aria-checked', String(Number(b.dataset.id) === id));
    });
    $('drawBtn').disabled = false;
    if (id === ANY) led('아무 문장이나 좋아요', '무엇이 나올지 몰라요!');
    else led(cat(id).name, cat(id).desc);
  }

  function pick(catId) {
    var pool = QUOTES.filter(function (q) { return catId === ANY || q.cat === catId; });
    var seen = state.seen[catId] || (state.seen[catId] = []);
    var fresh = pool.filter(function (q) { return seen.indexOf(q.no) < 0; });
    if (!fresh.length) {
      seen.length = 0;
      fresh = pool.filter(function (q) { return !state.current || q.no !== state.current.no; });
    }
    var q = fresh[Math.floor(Math.random() * fresh.length)];
    seen.push(q.no);
    return q;
  }

  // ---------- 뽑기 애니메이션 ----------
  async function draw() {
    if (state.busy || state.category === null) return;
    state.busy = true;
    var btn = $('drawBtn');
    btn.disabled = true;
    btn.classList.add('pressed');
    setTimeout(function () { btn.classList.remove('pressed'); }, 160);

    var q = pick(state.category);
    prepareImage(q);
    var from = state.category;

    // 1) 번호가 굴러가는 LED
    var rolling = setInterval(function () {
      led('문장을 고르는 중…', 'No.' + pad(1 + Math.floor(Math.random() * 100)), true);
    }, 70);

    // 2) '아무 문장'이면 룰렛처럼 칸을 돌다가 멈춤
    if (from === ANY && !reduce) {
      var order = [1, 2, 3, 4, 5], steps = 10 + order.indexOf(q.cat) + 5 * Math.floor(Math.random() * 2);
      for (var s = 0; s <= steps; s++) {
        var on = itemEl(order[s % 5]);
        on.classList.add('roulette');
        await wait(55 + s * s * 2.2);
        if (s < steps) on.classList.remove('roulette');
      }
      from = q.cat;
    } else {
      await wait(500);
    }
    clearInterval(rolling);
    led('No.' + pad(q.no) + ' 문장이 나와요!', cat(q.cat).name);

    // 3) 선반의 책이 밀려나며 쪽지가 떨어짐
    var item = itemEl(from);
    item.classList.add('push');
    await wait(380);
    item.classList.remove('push');
    var r1 = item.querySelector('.goods').getBoundingClientRect();
    var r2 = $('hole').getBoundingClientRect();
    var drop = document.createElement('div');
    drop.className = 'drop';
    drop.style.setProperty('--c', COLORS[q.cat]);
    drop.style.left = (r1.left + r1.width / 2 - 19) + 'px';
    drop.style.top = (r1.top + r1.height / 2 - 25) + 'px';
    document.body.appendChild(drop);
    var dx = (r2.left + r2.width / 2) - (r1.left + r1.width / 2);
    var dy = (r2.top + 4) - (r1.top + r1.height / 2);
    await play(drop, [
      { transform: 'translate(0,0) rotate(0deg) scale(.9)' },
      { transform: 'translate(' + dx * .3 + 'px,' + dy * .25 + 'px) rotate(-60deg) scale(1)', offset: .35 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(-200deg) scale(.8)' }
    ], { duration: 650, easing: 'cubic-bezier(.45,0,.9,.6)' });
    drop.remove();
    if (item.classList.contains('roulette')) item.classList.remove('roulette');
    var machine = $('machine');
    machine.classList.remove('thud'); void machine.offsetWidth; machine.classList.add('thud');

    // 4) 배출구가 열리고 카드가 튀어나옴
    var flap = $('flap');
    flap.classList.remove('closing');
    flap.classList.add('open');
    await wait(260);
    await showCard(q, r2);
    flap.classList.add('closing');
    flap.classList.remove('open');
    led('카드를 꺼냈어요', '같은 마음으로 또 뽑을 수 있어요');
    btn.disabled = false;
    state.busy = false;
  }

  // ---------- 카드 ----------
  function renderCover(q) {
    var box = $('cardCover');
    box.className = 'cover'; box.textContent = '';
    var fallback = function () { box.className = 'cover placeholder'; box.textContent = q.title; };
    var url = coverUrl(q);
    if (!url) return fallback();
    var img = document.createElement('img');
    img.alt = '『' + q.title + '』 표지';
    img.onload = function () { if (img.naturalWidth <= 20) fallback(); };
    img.onerror = fallback;
    img.src = url;
    box.appendChild(img);
  }

  // 문장이 카드 안에 다 들어가도록 글자 크기 맞춤
  function fitText(el, box, max, min) {
    var size = max;
    el.style.fontSize = size + 'px';
    while (size > min && el.scrollHeight > box.clientHeight) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
    box.style.overflowY = el.scrollHeight > box.clientHeight ? 'auto' : 'hidden';
    return size;
  }

  async function showCard(q, fromRect) {
    state.current = q;
    var c = cat(q.cat);
    $('card').style.setProperty('--c', COLORS[q.cat]);
    $('cardCat').textContent = c.name;
    $('cardNo').textContent = 'No.' + pad(q.no);
    setSentence($('cardText'), q.text);
    $('cardBook').textContent = bookLine(q);
    $('cardAuthor').textContent = authorLine(q);
    $('cardNote').hidden = !q.translated;
    renderCover(q);
    prepareImage(q); // 공유 버튼을 누르기 전에 카드 이미지를 미리 만들어 둠

    var overlay = $('overlay');
    overlay.hidden = false;
    fitText($('cardText'), $('sentenceBox'), Math.min(32, window.innerWidth * 0.085), 17);

    if (fromRect && !reduce) {
      var card = $('card').getBoundingClientRect();
      var dx = (fromRect.left + fromRect.width / 2) - (card.left + card.width / 2);
      var dy = (fromRect.top + fromRect.height / 2) - (card.top + card.height / 2);
      play(overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      play(document.querySelector('.actions'), [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 0, offset: .6 }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'ease-out' });
      await play($('card'), [
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12, .04)', opacity: .6 },
        { transform: 'translate(' + dx * .4 + 'px,' + (dy * .4 - 40) + 'px) scale(.5, .55) rotate(-4deg)', opacity: 1, offset: .45 },
        { transform: 'translate(0,0) scale(1.03) rotate(1deg)', offset: .8 },
        { transform: 'none' }
      ], { duration: 720, easing: 'cubic-bezier(.2,.8,.3,1)' });
    }
    $('closeBtn').focus({ preventScroll: true });
  }

  function closeCard() {
    $('overlay').hidden = true;
    $('drawBtn').focus({ preventScroll: true });
  }

  function again() {
    closeCard();
    if (state.category === null) state.category = ANY;
    draw();
  }

  // ---------- 필사 모드 ----------
  function openCopy() {
    var q = state.current; if (!q) return;
    setSentence($('copyText'), q.text);
    $('copySource').textContent = q.author + ', ' + bookLine(q) + (q.translated ? ' †' : '');
    $('copy').hidden = false;
    if (state.copySize) $('copyText').style.fontSize = state.copySize + 'px';
    else state.copySize = fitText($('copyText'), document.querySelector('.copy-body'), Math.min(40, window.innerWidth * 0.1), 20);
    requestWake();
    $('closeCopyBtn').focus();
  }
  function closeCopy() { $('copy').hidden = true; state.copySize = null; releaseWake(); $('copyBtn').focus(); }
  function resizeCopy(d) {
    state.copySize = Math.max(18, Math.min(60, (state.copySize || 32) + d));
    $('copyText').style.fontSize = state.copySize + 'px';
  }
  function requestWake() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function (l) { state.wakeLock = l; }).catch(function () {});
  }
  function releaseWake() { if (state.wakeLock) { state.wakeLock.release().catch(function () {}); state.wakeLock = null; } }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !$('copy').hidden) requestWake();
  });

  // ---------- 카드 이미지 저장 ----------
  var W = 1080, H = 1350;
  var CARD_NOTE = '† 원문을 직접 옮긴 문장이라 출간된 번역본과 표현이 다를 수 있어요.';
  var CARD_SIGN = '2026 북크닉 필사 자판기';
  function loadImg(url) {
    return new Promise(function (res) {
      if (!url) return res(null);
      var img = new Image(), done = false;
      var fin = function (v) { if (!done) { done = true; res(v); } };
      img.crossOrigin = 'anonymous';
      img.onload = function () { fin(img.naturalWidth > 20 ? img : null); };
      img.onerror = function () { fin(null); };
      setTimeout(function () { fin(null); }, 4000);
      img.src = url;
    });
  }
  function wrap(ctx, text, maxW) {
    var out = [];
    lines(text).forEach(function (para) {
      var line = '';
      para.split(' ').forEach(function (word) {
        var t = line ? line + ' ' + word : word;
        if (ctx.measureText(t).width <= maxW) { line = t; return; }
        if (line) out.push(line);
        line = '';
        if (ctx.measureText(word).width <= maxW) { line = word; return; }
        Array.from(word).forEach(function (ch) {
          if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch;
        });
      });
      out.push(line);
    });
    return out;
  }
  function render(q, cover) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fcf8f0'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(235,225,205,.55)';
    for (var y = 96; y < H; y += 64) ctx.fillRect(0, y, W, 2);
    // 마스킹테이프
    ctx.save(); ctx.translate(W / 2, 40); ctx.rotate(-0.05);
    ctx.globalAlpha = .85; ctx.fillStyle = COLORS[q.cat]; ctx.fillRect(-150, -30, 300, 64);
    ctx.restore();

    var L = 110, w = W - 220;
    ctx.font = '32px "Gowun Dodum", sans-serif';
    ctx.fillStyle = '#4f9a7e'; ctx.fillText(cat(q.cat).name, L, 170);
    ctx.textAlign = 'right'; ctx.fillStyle = '#6f675a'; ctx.fillText('No.' + pad(q.no), W - L, 170); ctx.textAlign = 'left';

    var size = 66, ls, lh;
    do { ctx.font = size + 'px "Gowun Batang", serif'; ls = wrap(ctx, q.text, w); lh = Math.round(size * 1.65); size -= 2; }
    while (ls.length * lh > 640 && size > 30);
    var cW = 150, cH = 225, gap = 70;
    var blockH = ls.length * lh + gap + cH;
    var top = Math.max(240, 240 + (H - 240 - 170 - blockH) / 2);
    ctx.fillStyle = '#26221c';
    ls.forEach(function (l, i) { ctx.fillText(l, L, top + lh * .8 + i * lh); });
    var sy = top + ls.length * lh + gap / 2;
    ctx.fillStyle = '#ebe1cd'; ctx.fillRect(L, sy, w, 3);
    var cy = sy + gap / 2;
    if (cover) ctx.drawImage(cover, L, cy, cW, cH);
    else {
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(L, cy, cW, cH);
      ctx.fillStyle = '#fff'; ctx.font = '700 26px "Gowun Batang", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var tl = wrap(ctx, q.title, cW - 28).slice(0, 5);
      tl.forEach(function (l, i) { ctx.fillText(l, L + cW / 2, cy + cH / 2 - (tl.length - 1) * 18 + i * 36); });
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    var tx = L + cW + 36, tw = w - cW - 36;
    ctx.fillStyle = '#26221c'; ctx.font = '700 36px "Gowun Batang", serif';
    var bl = wrap(ctx, bookLine(q), tw).slice(0, 3);
    bl.forEach(function (l, i) { ctx.fillText(l, tx, cy + 40 + i * 50); });
    ctx.font = '30px "Gowun Dodum", sans-serif'; ctx.fillStyle = '#6f675a';
    wrap(ctx, authorLine(q), tw).slice(0, 3).forEach(function (l, i) { ctx.fillText(l, tx, cy + 52 + bl.length * 50 + i * 42); });
    ctx.font = '24px "Gowun Dodum", sans-serif'; ctx.fillStyle = '#9a917f';
    if (q.translated) ctx.fillText(CARD_NOTE, L, H - 150);
    ctx.textAlign = 'center'; ctx.fillStyle = '#e0789a'; ctx.font = '36px "Jua", sans-serif';
    ctx.fillText(CARD_SIGN, W / 2, H - 86);
    return cv;
  }
  function prepareImage(q) {
    if (state.image && state.image.no === q.no) return state.image.promise;
    // 한글 웹폰트는 글자 묶음별로 나뉘어 있어서, 카드에 들어갈 글자를 알려 줘야 그 묶음을 모두 받아 옴
    var fonts = document.fonts && document.fonts.load ? Promise.all([
      document.fonts.load('66px "Gowun Batang"', q.text),
      document.fonts.load('700 36px "Gowun Batang"', bookLine(q) + q.title),
      document.fonts.load('30px "Gowun Dodum"', cat(q.cat).name + 'No.' + pad(q.no) + authorLine(q) +
        (q.translated ? CARD_NOTE : '')),
      document.fonts.load('36px "Jua"', CARD_SIGN)
    ]).catch(function () {}) : Promise.resolve();
    var entry = { no: q.no, blob: null };
    entry.promise = Promise.all([fonts, loadImg(coverUrl(q))]).then(function (r) {
      return new Promise(function (res) { render(q, r[1]).toBlob(res, 'image/png'); });
    }).then(function (b) { entry.blob = b; return b; }, function () { return null; });
    state.image = entry;
    return entry.promise;
  }
  var downloadsP = window.claude && window.claude.use ? window.claude.use('downloads') : Promise.resolve(null);
  function save() {
    var q = state.current; if (!q) return;
    var btn = $('saveBtn'); btn.disabled = true;
    Promise.all([prepareImage(q), downloadsP]).then(function (r) {
      var blob = r[0], dl = r[1];
      if (!blob) return toast('카드 이미지를 만들지 못했어요. 다시 눌러 주세요');
      var name = '필사카드_' + pad(q.no) + '.png';
      if (!dl) return IN_APP ? showSaveSheet(blob) : shareOrDownload(blob, name);
      return dl.save({ filename: name, data: blob }).then(function () {
        toast('카드 이미지를 저장했어요');
      }, function (e) {
        if (e && e.code === 'declined') return;
        toast(e && e.code === 'rate_limited' ? '잠시 후 다시 눌러 주세요' : '카드를 저장하지 못했어요');
      });
    }).then(function () { btn.disabled = false; });
  }

  // 일반 브라우저: 휴대폰은 공유 창('이미지 저장' → 갤러리), 그 외는 파일 내려받기
  function shareOrDownload(blob, name) {
    var file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: '필사 카드' }).catch(function (e) {
        if (!e || e.name !== 'AbortError') download(blob, name);
      });
    }
    download(blob, name);
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('카드 이미지를 저장했어요');
  }

  // 카카오톡 등 앱 안 브라우저: 공유 창 · 파일 내려받기가 막혀 있음
  // → 카드 이미지를 보여 주고(꾹 눌러 저장), 카톡이면 같은 카드를 기본 브라우저로 열어 줌
  var UA = navigator.userAgent || '';
  var KAKAO = /KAKAOTALK/i.test(UA);
  var IN_APP = KAKAO || /Instagram|FBAN|FBAV|NAVER\(inapp|Line\/|everytimeApp|DaumApps/i.test(UA);
  var saveUrl = null;
  function showSaveSheet(blob) {
    if (saveUrl) URL.revokeObjectURL(saveUrl);
    saveUrl = URL.createObjectURL(blob);
    $('saveImg').src = saveUrl;
    $('saveGuide').textContent = KAKAO
      ? '카카오톡 안에서는 카드를 바로 저장할 수 없어요. 아래 버튼을 누르면 같은 카드가 크롬·사파리에서 열려요. 거기서 ‘카드 공유’를 한 번 더 눌러 주세요.'
      : '이 앱 안에서는 카드를 바로 저장할 수 없어요. 오른쪽 위 메뉴(⋮ 또는 ···)에서 ‘다른 브라우저로 열기’를 누른 뒤 ‘카드 공유’를 다시 눌러 주세요.';
    $('externalBtn').hidden = !KAKAO;
    $('saveSheet').hidden = false;
    $('closeSaveBtn').focus();
  }
  function closeSaveSheet() { $('saveSheet').hidden = true; $('saveBtn').focus(); }
  function openExternal() {
    var q = state.current;
    var url = location.href.split('#')[0] + (q ? '#q' + q.no : '');
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  }
  // 바깥 브라우저로 넘어왔을 때 같은 카드 다시 열기 (예: filsa/index.html#q37)
  function openFromHash() {
    var m = /^#q(\d+)$/.exec(location.hash);
    if (!m) return;
    var q = QUOTES.filter(function (x) { return x.no === Number(m[1]); })[0];
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    if (q) showCard(q);
  }

  // ---------- 연결 ----------
  buildShelves();
  $('drawBtn').addEventListener('click', draw);
  $('closeBtn').addEventListener('click', closeCard);
  $('againBtn').addEventListener('click', again);
  $('saveBtn').addEventListener('click', save);
  $('copyBtn').addEventListener('click', openCopy);
  $('closeCopyBtn').addEventListener('click', closeCopy);
  $('smallerBtn').addEventListener('click', function () { resizeCopy(-3); });
  $('biggerBtn').addEventListener('click', function () { resizeCopy(3); });
  $('externalBtn').addEventListener('click', openExternal);
  $('closeSaveBtn').addEventListener('click', closeSaveSheet);
  $('saveSheet').addEventListener('click', function (e) { if (e.target === $('saveSheet')) closeSaveSheet(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('saveSheet').hidden) closeSaveSheet();
    else if (!$('copy').hidden) closeCopy();
    else if (!$('overlay').hidden) closeCard();
  });
  openFromHash();
})();
