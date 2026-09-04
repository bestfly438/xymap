// ============================================
// 新塬应急 v29 · 统一导航 nav.js
// - 地图页(map)：悬浮导航，保持全屏地图
// - 已有侧栏页面：仅视觉微调(v29-skin)，不破坏布局
// - 无侧栏页面：自动生成完整侧栏(v29-sidebar)+主体留边
// - 全部页面：手机底部 Tab 5 项 + 更多抽屉
// 不修改任何 URL、权限与数据链路
// ============================================
(function(){
  var V = 20260831;

  var GROUPS = [
    { t:'主功能', items:[ ['dashboard.html','数据看板','bar-chart'], ['map.html','应急地图','map'], ['analysis.html','专业分析','chart'], ['radar.html','雷达预报','radar'] ] },
    { t:'数据台账', items:[ ['ledger.html','应急台账','clipboard'], ['patrol.html','巡查记录','clipboard-check'], ['transfer.html','转移流程','route'], ['photo.html','照片档案','camera'] ] },
    { t:'消息与指令', items:[ ['msg.html','消息中心','message-circle'], ['team.html','应急队伍','users'] ] },
    { t:'应急模块', items:[ ['guide.html','防汛应急指南','book'], ['manual.html','使用说明','smartphone'] ] },
    { t:'系统', items:[ ['health.html','系统自检','activity'], ['updates.html','近期更新','file-clock'] ] }
  ];
  var PAGES = [];
  GROUPS.forEach(function(g){ g.items.forEach(function(it){ PAGES.push({page:it[0], name:it[1], ic:it[2]}); }); });
  PAGES.push({page:'index.html', name:'登录', ic:'shield'});

  function cur(){
    var p = (location.pathname.split('/').pop() || 'index.html').split('?')[0];
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].page === p) return PAGES[i];
    return { page:p, name:'', ic:'shield' };
  }
  function svg(name, size){
    if (window.icon) return window.icon(name, size || 20);
    return '<svg viewBox="0 0 24 24" width="' + (size||20) + '" height="' + (size||20) + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></svg>';
  }
  function q(){ return '?v=' + V; }
  function roleText(){
    var r = '', k = '';
    try { r = sessionStorage.getItem('xyc_role') || ''; k = sessionStorage.getItem('xyc_key') || ''; } catch(e) {}
    var map = { '管理员':'管理员', '镇级':'镇级', '村级':'村级', '社长':'社长' };
    return { role: map[r] || r || '未登录', key: k || '' };
  }

  var PAGE = cur();
  var IS_MAP = PAGE.page === 'map.html';

  // ---------- 桌面侧栏 ----------
  function bindExistingSidebar(sb){
    sb.classList.add('v29-skin');
    // 修改清单 v1：非 <a> 的可点项(div/span onclick)补键盘可达
    var clickables = sb.querySelectorAll('div[onclick], span[onclick]');
    for (var ci = 0; ci < clickables.length; ci++) {
      var el = clickables[ci];
      if (!el.getAttribute('role')) el.setAttribute('role', 'button');
      if (el.tabIndex < 0) el.tabIndex = 0;
      if (!el.getAttribute('data-xyc-key')) {
        el.setAttribute('data-xyc-key', '1');
        el.addEventListener('keydown', function(e){
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            var fn = this.getAttribute('onclick');
            if (fn) { try { (new Function(fn))(); } catch(err) {} }
          }
        });
      }
    }
    var links = sb.querySelectorAll('a.sb-item');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href') || '';
      if (h.indexOf(PAGE.page) === 0) links[i].classList.add('active');
    }
    // 原页面若已有内联 active 逻辑（pcNav 等）不动
  }

  function buildSidebar(){
    var c = cur(), id = roleText();
    var sb = document.createElement('aside');
    sb.className = 'v29-sidebar';
    var html = '<div class="sb-logo"><div class="logo-ic">' + svg('shield', 22) + '</div><div><div class="logo-t1">新塬应急指挥</div><div class="logo-t2">XINYUAN EMERGENCY</div></div></div>';
    html += '<div class="sb-role"><div class="sr-t">当前身份</div><div class="sr-n"><span>' + id.role + '</span>' + (id.role && id.role !== '未登录' ? '<span class="sr-badge">' + roleBadge(id.role) + '</span>' : '') + '</div></div>';
    html += '<nav class="sb-menu">';
    GROUPS.forEach(function(g){
      html += '<div class="sb-group-t">' + g.t + '</div>';
      g.items.forEach(function(it){
        var active = c.page === it[0] ? ' active' : '';
        if (it[0] === 'dashboard.html') {
          html += '<a class="sb-item' + active + '" href="dashboard.html' + q() + '">' + svg(it[2]) + it[1] + '</a>';
        } else {
          html += '<a class="sb-item' + active + '" href="' + it[0] + q() + '">' + svg(it[2]) + it[1] + '</a>';
        }
      });
    });
    html += '<div class="sb-group-t">系统</div>';
    html += '<div class="sb-item" onclick="doLogoutAll()">' + svg('logout') + '退出登录</div>';
    html += '</nav>';
    html += '<div class="sb-foot"><div class="sf-av">' + svg('users', 18) + '</div><div><div class="sf-n">' + id.role + '</div><div class="sf-s">' + id.key + '</div></div></div>';
    sb.innerHTML = html;
    document.body.insertBefore(sb, document.body.firstChild);
    document.body.classList.add('v29-with-sidebar');
  }
  function roleBadge(r){
    return r === '管理员' ? '全部权限' : r === '镇级' ? '全镇调度' : r === '村级' ? '本村数据' : '本社数据';
  }

  // ---------- 地图悬浮导航 ----------
  function buildMapNav(){
    var el = document.createElement('div');
    el.className = 'v29-map-nav';
    var btn = document.createElement('button');
    btn.className = 'mn-btn';
    btn.setAttribute('onclick', 'v29OpenDrawer()');
    btn.innerHTML = svg('menu', 22);
    btn.title = '菜单';
    btn.setAttribute('aria-label', '打开菜单');
    el.appendChild(btn);
    document.body.appendChild(el);
  }

  // ---------- 更多抽屉 ----------
  function ensureDrawer(){
    if (document.getElementById('v29Drawer')) return;
    var mask = document.createElement('div');
    mask.className = 'v29-drawer-mask'; mask.id = 'v29DrawerMask';
    mask.onclick = function(){ v29CloseDrawer(); };
    document.body.appendChild(mask);
    var dr = document.createElement('div');
    dr.className = 'v29-drawer'; dr.id = 'v29Drawer';
    if (IS_MAP && window.matchMedia && matchMedia('(min-width:1280px)').matches) dr.classList.add('dr-desktop');
    var grid = document.createElement('div');
    grid.className = 'dr-grid';
    var hidden = { 'dashboard.html':1, 'map.html':1, 'msg.html':1, 'ledger.html':1, 'index.html':1 };
    var c = cur();
    PAGES.forEach(function(p){
      if (hidden[p.page]) return;
      var a = document.createElement('a');
      a.className = 'dr-item' + (c.page === p.page ? ' active' : '');
      a.href = p.page + q();
      a.innerHTML = svg(p.ic, 24) + '<span>' + p.name + '</span>';
      grid.appendChild(a);
    });
    // 退出
    var lo = document.createElement('a');
    lo.className = 'dr-item';
    lo.href = 'javascript:void(0)';
    lo.onclick = function(){ doLogoutAll(); };
    lo.innerHTML = svg('logout', 24) + '<span>退出登录</span>';
    grid.appendChild(lo);
    dr.appendChild(grid);
    document.body.appendChild(dr);
  }

  window.doLogoutAll = function(){
    try { if (window.doLogout) doLogout(); } catch(e) {}
    try { sessionStorage.clear(); } catch(e) {}
    location.replace('index.html');
  };

  // ---------- 手机底部 Tab ----------
  function injectMobileTab(){
    if (document.querySelector('.v29-tabbar')) return;
    var c = cur();
    var TABS = [
      { page:'dashboard.html', name:'态势', ic:'bar-chart' },
      { page:'map.html', name:'地图', ic:'map' },
      { page:'msg.html', name:'消息', ic:'message-circle' },
      { page:'ledger.html', name:'台账', ic:'clipboard' },
      { more:true, name:'更多', ic:'chevron-down' }
    ];
    var bar = document.createElement('div');
    bar.className = 'v29-tabbar';
    TABS.forEach(function(t){
      var a = document.createElement('a');
      a.className = 'tb-item';
      if (t.more) { a.href = 'javascript:void(0)'; a.setAttribute('onclick', 'v29OpenDrawer()'); a.setAttribute('aria-label', '更多功能'); }
      else { a.href = t.page + q(); if (c.page === t.page) a.classList.add('active'); }
      a.innerHTML = svg(t.ic, 22) + '<span>' + t.name + '</span>';
      bar.appendChild(a);
    });
    document.body.appendChild(bar);
  }

  // 清理旧导航残留
  function hideOldNav(){
    var b = document.getElementById('moreBtn');
    if (b) b.style.display = 'none';
    var m = document.getElementById('moreMenu');
    if (m) m.style.display = 'none';
  }

  window.v29OpenDrawer = function(){
    var d = document.getElementById('v29Drawer'), mk = document.getElementById('v29DrawerMask');
    if (d) { d.classList.add('open'); if (mk) mk.classList.add('show'); }
  };
  window.v29CloseDrawer = function(){
    var d = document.getElementById('v29Drawer'), mk = document.getElementById('v29DrawerMask');
    if (d) { d.classList.remove('open'); if (mk) mk.classList.remove('show'); }
  };


  // ---------- 版本自动刷新：检测 version.txt，版本变化自动更新资源并刷新（无需手动强刷） ----------
  function bumpAssetVersion(v) {
    var els = document.querySelectorAll('link[href*="?v="], script[src*="?v="]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var attr = el.getAttribute('href') !== null ? 'href' : 'src';
      var url = el.getAttribute(attr) || '';
      if (url.indexOf('?v=') >= 0) el.setAttribute(attr, url.replace(/\?v=[^&]*/, '?v=' + v));
    }
  }
  function verNum(s) {
    var m = String(s || '').match(/(\d+)-(\d+)$/);
    if (m) return parseInt(m[1], 10) * 10000 + parseInt(m[2], 10);
    var m2 = String(s || '').match(/(\d+)$/);
    return m2 ? parseInt(m2[1], 10) * 10000 : 0;
  }
  function checkVersion() {
    try {
      fetch('version.txt?t=' + Date.now(), { cache: 'no-store' })
        .then(function(r){ return r.text(); })
        .then(function(v){
          v = (v || '').trim();
          if (!v) return;
          bumpAssetVersion(v);
          var cur = '';
          try { cur = sessionStorage.getItem('xyc_ver') || ''; } catch(e) {}
          if (cur && cur !== v) {
            if (verNum(v) < verNum(cur)) return; // CDN 传播中读到旧版本：忽略，避免刷新循环
            try { sessionStorage.setItem('xyc_ver', v); } catch(e) {}
            var q = {};
            try { location.search.replace(/^\?/, '').split('&').forEach(function(s){ if(!s) return; var kv = s.split('='); q[kv[0]] = kv[1]; }); } catch(e) {}
            delete q.v;
            var qs = Object.keys(q).map(function(k){ return k + '=' + q[k]; }).join('&');
            var page = location.pathname.split('/').pop() || 'index.html';
            location.replace(page + (qs ? '?' + qs + '&v=' + v : '?v=' + v));
          } else if (!cur) {
            try { sessionStorage.setItem('xyc_ver', v); } catch(e) {}
          }
        }).catch(function(){});
    } catch(e) {}
  }

  /* ===== v29-4 村级/社长待办温和提醒（30s 轮询本村未读指令，纯前端） ===== */
  function startVillagePoll() {
    var role = '', vill = '';
    try { role = sessionStorage.getItem('xyc_role') || ''; vill = sessionStorage.getItem('xyc_village') || ''; } catch(e) {}
    if (!(role === '村级' || role === '社长')) return;
    if (document.getElementById('v29Remind')) return; // msg.html 自带提醒，避免重复
    var BID = 'v29_global_todo_banner';
    var audioCtx = null;
    function beep() {
      try {
        if (localStorage.getItem('xyc_mute') === '1') return;
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'sine'; o.frequency.value = 880;
        var t = audioCtx.currentTime;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.start(t); o.stop(t + 0.55);
      } catch(e) {}
    }
    function pendList() {
      var list = [];
      try { list = JSON.parse(localStorage.getItem('xyc_dispatch_todos') || '[]') || []; } catch(e) {}
      return list.filter(function(x){ return x.village === vill && (x.status === '未读' || x.status === '待回复'); });
    }
    function removeBanner() {
      var el = document.getElementById(BID);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    function showBanner(list) {
      if (document.getElementById(BID)) return;
      var el = document.createElement('div');
      el.id = BID;
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(120deg,#DC2626,#B91C1C);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:12px;font-size:13.5px;font-weight:600;box-shadow:0 4px 16px rgba(220,38,38,.3);font-family:"PingFang SC","Microsoft YaHei",sans-serif;box-sizing:border-box';
      var txt = document.createElement('span');
      txt.style.cssText = 'flex:1;line-height:1.5';
      txt.textContent = '新塬应急：您有 ' + list.length + ' 条未读指令（' + (list[0].type || '指令') + '：' + (list[0].msg || '') + '）';
      var ok = document.createElement('button');
      ok.textContent = '确认收到';
      ok.style.cssText = 'background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;padding:7px 12px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;flex:none';
      ok.onclick = function() {
        try {
          var all = JSON.parse(localStorage.getItem('xyc_dispatch_todos') || '[]') || [];
          var changed = false;
          all.forEach(function(x){ if (x.village === vill && (x.status === '未读' || x.status === '待回复')) { x.status = '已读'; x.readAt = Date.now(); changed = true; } });
          if (changed) localStorage.setItem('xyc_dispatch_todos', JSON.stringify(all));
        } catch(e) {}
        removeBanner();
        if (window.location.pathname.indexOf('msg.html') >= 0 && typeof msgRefresh === 'function') msgRefresh();
      };
      var close = document.createElement('button');
      close.textContent = '\u00d7';
      close.style.cssText = 'background:none;border:none;color:rgba(255,255,255,.85);font-size:20px;cursor:pointer;line-height:1;flex:none;padding:0 2px';
      close.onclick = removeBanner;
      el.appendChild(txt); el.appendChild(ok); el.appendChild(close);
      document.body.appendChild(el);
      beep();
    }
    function tick() {
      var pend = pendList();
      if (pend.length) showBanner(pend); else removeBanner();
    }
    setTimeout(tick, 1200);
    setInterval(tick, 30000);
  }

  // ---------- 修改清单 v1：语义 h1（视觉隐藏，页面标题） ----------
  function injectPageH1(){
    var name = cur().name || '';
    if (!name) return;
    var SITE = '新塬镇应急避险指挥系统';
    var h1 = document.querySelector('h1');
    if (h1) {
      // h1 内容是站点名 → 改为当前页名（站点名属 Logo 区，不作为页面 h1）
      var txt = (h1.textContent || '').trim();
      if (txt.indexOf(SITE) >= 0 || txt.indexOf('新塬') >= 0) {
        var isLogoH1 = h1.parentElement && (h1.parentElement.className||'').indexOf('logo') >= 0;
        if (isLogoH1) {
          // 顶栏 Logo 区：h1 改为页名，原系统名移到标题属性避免语义重复
          h1.textContent = name;
          var p = h1.parentElement.querySelector('p, .sub, .logo-sub');
          if (p && !p.getAttribute('data-role')) { p.setAttribute('data-role', 'site'); p.textContent = SITE; }
        } else {
          h1.textContent = name;
        }
      }
      return;
    }
    var nh = document.createElement('h1');
    nh.className = 'xyc-vh';
    nh.textContent = name;
    document.body.insertBefore(nh, document.body.firstChild);
  }
  // ---------- 修改清单 v1：抽屉 Esc 关闭 / 焦点进入 ----------
  function bindDrawerKeys(){
    if (window.__xycDrawerKeys) return; window.__xycDrawerKeys = true;
    document.addEventListener('keydown', function(e){
      if (e.key !== 'Escape') return;
      var d = document.getElementById('v29Drawer');
      if (d && d.classList.contains('open')) { v29CloseDrawer(); return; }
      var mm = document.getElementById('moreMenu');
      if (mm && mm.style.display && mm.style.display !== 'none') { if (window.toggleMoreMenu) toggleMoreMenu(); }
    });
  }

  function init(){
    checkVersion();
    if (PAGE.page === 'index.html') return; // 登录页不注入导航
    startVillagePoll();
    injectPageH1();
    ensureDrawer();
    bindDrawerKeys();
    var existing = document.querySelector('aside.sidebar');
    if (IS_MAP) buildMapNav();
    else if (existing) bindExistingSidebar(existing);
    else buildSidebar();
    injectMobileTab();
    hideOldNav();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ============================================================
   v55 手机端长页治理：折叠引擎（仅 ≤767px 生效）
   - 容器 data-v29-fold="选择器" + data-v29-fold-open="n|all"：通用折叠
   - .content data-v29-dash：dashboard 分组折叠
   ============================================================ */
window.__v55f = (function(){
  'use strict';
  var MOB = '(max-width:767px)';
  function isMob(){ try{ return !!(window.matchMedia && window.matchMedia(MOB).matches); }catch(e){ return true; } }
  function setOpen(it, open){
    if (!it) return;
    it.classList.toggle('open', !!open);
    it.classList.toggle('closed', !open);
  }
  function mkChev(){
    var s = document.createElement('span');
    s.className = 'v29-fchev';
    s.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    return s;
  }
  /* item 结构：head(带 .v29-acc-head) + body(.v29-acc-body) */
  function build(item, head, body, open){
    if (!item || !head || !body) return false;
    if (!head.querySelector('.v29-fchev')) head.appendChild(mkChev());
    head.classList.add('v29-acc-head');
    item.appendChild(head);
    item.appendChild(body);
    body.className = 'v29-acc-body';
    item.classList.add('v29-acc-item');
    setOpen(item, !!open);
    head.addEventListener('click', function(e){
      if (!isMob()) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      setOpen(item, item.classList.contains('closed'));
    });
    return true;
  }
  /* 通用折叠卡：第一个子元素作头，其余收进 body */
  function foldItem(item, open){
    if (!item || item.getAttribute('data-v55')) return null;
    item.setAttribute('data-v55', '1');
    var head = item.firstElementChild;
    if (!head) return null;
    var body = document.createElement('div');
    while (head.nextSibling) body.appendChild(head.nextSibling);
    build(item, head, body, !!open);
    return item;
  }
  function dashGo(name, anchorId){
    var regs = window.__v55f.__dash || {};
    if (regs[name]) setOpen(regs[name], true);
    var el = anchorId && document.getElementById(anchorId);
    if (el) { try{ el.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){ try{ el.scrollIntoView(); }catch(e2){} } }
  }
  function mkGroupHead(title, sub, color){
    var h = document.createElement('div');
    h.innerHTML = '<span class="dg-dot" style="background:' + (color || '#2f6fed') + '"></span><span class="dg-t">' + title + '</span>' + (sub ? '<span class="dg-sub">' + sub + '</span>' : '');
    return h;
  }
  /* ===== 通用折叠（guide/manual/transfer 等长文页） ===== */
  function runFold(){
    if (!isMob()) return;
    var roots = document.querySelectorAll('[data-v29-fold]');
    for (var ri = 0; ri < roots.length; ri++){
      var root = roots[ri];
      if (root.getAttribute('data-v29-fold-done')) continue;
      root.setAttribute('data-v29-fold-done', '1');
      var sel = root.getAttribute('data-v29-fold') || '.card,.sec';
      var kids = root.children, items = [];
      for (var i = 0; i < kids.length; i++){
        var c = kids[i];
        if (c.matches && c.matches(sel)) items.push(c);
      }
      if (!items.length) continue;
      var openA = root.getAttribute('data-v29-fold-open') || '1';
      var openN = openA === 'all' ? items.length : (parseInt(openA, 10) || 1);
      var acc = document.createElement('div');
      acc.className = 'v29-acc';
      root.insertBefore(acc, items[0]);
      for (var k = 0; k < items.length; k++){
        acc.appendChild(items[k]);
        foldItem(items[k], k < openN);
      }
      if (items.length > 1){
        var bar = document.createElement('div');
        bar.className = 'v29-acc-tbar';
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'v29-acc-tbtn'; btn.textContent = '全部展开';
        btn.addEventListener('click', function(){
          var its = this.parentNode.parentNode.querySelectorAll('.v29-acc-item');
          var allOpen = true;
          its.forEach(function(x){ if (x.classList.contains('closed')) allOpen = false; });
          its.forEach(function(x, xi){ setOpen(x, allOpen ? xi === 0 : true); });
          this.textContent = allOpen ? '全部展开' : '收起全部';
        });
        bar.appendChild(btn);
        acc.insertBefore(bar, acc.firstChild);
      }
    }
  }
  /* ===== dashboard 分组折叠（首页长页） ===== */
  function runDash(){
    if (!isMob()) return;
    var content = document.querySelector('[data-v29-dash]');
    if (!content || content.getAttribute('data-v29-dash-done')) return;
    content.setAttribute('data-v29-dash-done', '1');
    function q(sel){ try{ return content.querySelector(sel); }catch(e){ return null; } }
    function gridKids(){ var out = []; for (var i = 0; i < content.children.length; i++){ var c = content.children[i]; if (c.matches && c.matches('.grid-2')) out.push(c); } return out; }
    function findCardOf(el){ if (!el) return null; var p = el; while (p && p !== content && !(p.classList && p.classList.contains('card'))) p = p.parentElement; return (p && p !== content) ? p : null; }
    var kpi = q('.kpi-row'), vh = q('.section-header'), vg = q('#villageGrid');
    if (!kpi || !vh || !vg) return;
    var gs = gridKids(), gridA = gs[0], gridB = gs[1];
    if (!gridA) return;
    window.__v55f.__dash = {};
    /* 1) 各村卡：保留原 section-header 作头 */
    var villWrap = document.createElement('div');
    content.insertBefore(villWrap, vh);
    villWrap.appendChild(vh);
    if (vg && vg.parentNode === content) villWrap.appendChild(vg);
    foldItem(villWrap, true);
    window.__v55f.__dash['vill'] = villWrap;
    /* 2) 快捷入口卡上移（紧随各村之后） */
    var quickCard = findCardOf(q('.quick-grid'));
    if (quickCard && quickCard.parentNode && quickCard.parentNode !== content){
      quickCard.parentNode.removeChild(quickCard);
      content.insertBefore(quickCard, gridA);
    } else if (quickCard && quickCard.parentNode === content){
      content.insertBefore(quickCard, gridA);
    }
    /* 3) 分组容器 */
    var groupsWrap = document.createElement('div');
    groupsWrap.className = 'v29-dash-groups';
    content.insertBefore(groupsWrap, gridA);
    function reg(name, title, sub, color, open, nodes){
      var w = document.createElement('div');
      w.className = 'v29-dg';
      var head = mkGroupHead(title, sub, color);
      if (!head) return;
      var body = document.createElement('div');
      nodes.forEach(function(n){
        if (n && n.parentNode && n.parentNode !== body) body.appendChild(n);
      });
      build(w, head, body, !!open);
      groupsWrap.appendChild(w);
      window.__v55f.__dash[name] = w;
    }
    var aRain = q('#pcAnchorRain'), aWarn = q('#pcAnchorWarn'), aAna = q('#pcAnchorAnalysis');
    var decCard = findCardOf(q('#decGrid'));
    var anCard = findCardOf(q('#anTableBody'));
    var dispCard = q('#pcDispSendCard');
    reg('wx',   '雨情实况', '实况天气 · 预警指引', '#ee8b24', false, [gridA]);
    reg('trend','降雨趋势与雷达', '24h 雨量 · 雷达云图', '#2f6fed', false, [aRain, gridB]);
    reg('ana',  '预警研判', '智能决策 · 阈值分析', '#8b5cf6', false, [aWarn, decCard, aAna, anCard]);
    reg('dis',  '调度指令', '统一调度 · 待办事项', '#e2444a', false, [dispCard]);
    /* 4) 顶部 全部展开/收起 */
    var bar = document.createElement('div');
    bar.className = 'v29-acc-tbar';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'v29-acc-tbtn'; btn.textContent = '全部展开';
    btn.addEventListener('click', function(){
      var its = content.querySelectorAll('.v29-acc-item');
      var allOpen = true;
      its.forEach(function(x){ if (x.classList.contains('closed')) allOpen = false; });
      its.forEach(function(x, xi){ setOpen(x, allOpen ? xi === 0 : true); });
      this.textContent = allOpen ? '全部展开' : '收起全部';
    });
    bar.appendChild(btn);
    groupsWrap.insertBefore(bar, groupsWrap.firstChild);
  }
  /* 目录/锚点链接 → 先展开所在折叠卡再滚动 */
  function bindAnchorOpen(){
    document.addEventListener('click', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || !isMob()) return;
      var id = String(a.getAttribute('href') || '').slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      var it = el.closest && el.closest('.v29-acc-item');
      if (it && it.classList.contains('closed')){
        e.preventDefault();
        setOpen(it, true);
        setTimeout(function(){ try{ el.scrollIntoView({behavior:'smooth', block:'start'}); }catch(err){ try{ el.scrollIntoView(); }catch(e2){} } }, 60);
      }
    });
  }
  return {
    isMob: isMob, setOpen: setOpen, foldItem: foldItem,
    runFold: runFold, runDash: runDash, dashGo: dashGo,
    __dash: null
  };
})();

/* v55 启动：DOM 就绪与 load 后各跑一次（等待页面异步渲染完数据列表） */
function __v55Start(){
  try { window.__v55f.runFold(); } catch(e) {}
  try { window.__v55f.runDash(); } catch(e) {}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(__v55Start, 350); });
else setTimeout(__v55Start, 350);
window.addEventListener('load', function(){ setTimeout(__v55Start, 800); });
