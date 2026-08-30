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
      if (t.more) { a.href = 'javascript:void(0)'; a.setAttribute('onclick', 'v29OpenDrawer()'); }
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

  function init(){
    checkVersion();
    if (PAGE.page === 'index.html') return; // 登录页不注入导航
    startVillagePoll();
    ensureDrawer();
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
