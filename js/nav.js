// ============================================
// 新塬应急 v29 · 统一导航 nav.js
// 1) 桌面端（≥1280px）：左侧 220px 深蓝侧栏
//    - 已有 <aside class="sidebar"> 的页面：自动附加 v29-sidebar 统一样式
//    - 无侧栏的页面（map/photo 等）：自动生成标准侧栏
// 2) 手机端（<768px）：底部固定 Tab 5 项（态势/地图/消息/台账/更多）
// 3) 自动高亮当前页、显示当前身份与密钥
// 4) 不修改任何 URL 与数据链路，只做导航层
// ============================================
(function(){
  var V = 20260831;

  // 分组导航（方案任务2 桌面侧栏分组）
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

  function cur() {
    var p = (location.pathname.split('/').pop() || 'index.html').split('?')[0];
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].page === p) return PAGES[i];
    return { page:p, name:'', ic:'shield' };
  }

  function svg(name, size) {
    if (window.icon) return window.icon(name, size || 20);
    return '<svg viewBox="0 0 24 24" width="' + (size||20) + '" height="' + (size||20) + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></svg>';
  }

  function q(v){ return '?v=' + V; }

  function roleText() {
    var r = '', k = '';
    try { r = sessionStorage.getItem('xyc_role') || ''; k = sessionStorage.getItem('xyc_key') || ''; } catch(e) {}
    var map = { '管理员':'管理员', '镇级':'镇级', '村级':'村级', '社长':'社长' };
    return { role: map[r] || r || '未登录', key: k || '' };
  }

  // ---------- 桌面侧栏 ----------
  function ensureDesktopSidebar() {
    var existing = document.querySelector('aside.sidebar') || document.querySelector('.v29-sidebar');
    if (existing) {
      hasExistingSidebar = true;
      existing.classList.add('v29-sidebar');
      // 给现有侧栏的 sb-item 补高亮（当前页）
      var c = cur();
      if (c && c.page) {
        var links = existing.querySelectorAll('a.sb-item');
        for (var i = 0; i < links.length; i++) {
          if (links[i].getAttribute('href') && links[i].getAttribute('href').indexOf(c.page) === 0) links[i].classList.add('active');
        }
      }
      return;
    }
    // 无侧栏页面：生成标准侧栏
    var c2 = cur();
    var sb = document.createElement('aside');
    sb.className = 'v29-sidebar';
    var id = roleText();
    var html = '<div class="sb-logo"><div class="logo-ic">' + svg('shield', 22) + '</div><div><div class="logo-t1">新塬应急指挥</div><div class="logo-t2">XINYUAN EMERGENCY</div></div></div>';
    html += '<div class="sb-role"><div class="sr-t">当前身份</div><div class="sr-n"><span>' + (id.role || '') + '</span>' + (id.role ? '<span class="sr-badge" id="v29RoleBadge"></span>' : '') + '</div></div>';
    html += '<nav class="sb-menu">';
    GROUPS.forEach(function(g){
      html += '<div class="sb-group-t">' + g.t + '</div>';
      g.items.forEach(function(it){
        var active = c2.page === it[0] ? ' active' : '';
        if (it[0] === 'dashboard.html') {
          html += '<div class="sb-item' + active + '" onclick="pcNav && pcNav(\'dash\',this)">' + svg(it[2]) + it[1] + '</div>';
        } else {
          html += '<a class="sb-item' + active + '" href="' + it[0] + q() + '">' + svg(it[2]) + it[1] + '</a>';
        }
      });
    });
    html += '<div class="sb-group-t">系统</div>';
    html += '<div class="sb-item" onclick="doLogout ? doLogout() : (sessionStorage.clear(),location.replace(\'index.html\'))">' + svg('logout') + '退出登录</div>';
    html += '</nav>';
    html += '<div class="sb-foot"><div class="sf-av">' + svg('users', 18) + '</div><div><div class="sf-n">' + (id.role || '未登录') + '</div><div class="sf-s">' + (id.key || '') + '</div></div></div>';
    sb.innerHTML = html;
    document.body.insertBefore(sb, document.body.firstChild);
    // 当前页无 pcNav 时用普通链接
    if (c2.page === 'dashboard.html' && typeof pcNav === 'undefined') {
      var dash = sb.querySelector('.sb-item.active');
      if (dash) dash.outerHTML = '<a class="sb-item active" href="dashboard.html' + q() + '">' + svg('bar-chart') + '数据看板</a>';
    }
    if (id.role) {
      var b = document.getElementById('v29RoleBadge');
      if (b) b.textContent = (id.role === '管理员' ? '全部权限' : id.role === '镇级' ? '全镇调度' : id.role === '村级' ? '本村数据' : '本社数据');
    }
  }

  // ---------- 手机底部 Tab ----------
  function injectMobileTab() {
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
      if (t.more) {
        a.href = 'javascript:void(0)';
        a.setAttribute('onclick', 'v29OpenDrawer()');
      } else {
        a.href = t.page + q();
        if (c && c.page === t.page) a.classList.add('active');
      }
      a.innerHTML = svg(t.ic, 22) + '<span>' + t.name + '</span>';
      bar.appendChild(a);
    });
    document.body.appendChild(bar);

    // 抽屉
    if (!document.getElementById('v29Drawer')) {
      var mask = document.createElement('div');
      mask.className = 'v29-drawer-mask'; mask.id = 'v29DrawerMask';
      mask.onclick = function(){ v29CloseDrawer(); };
      document.body.appendChild(mask);
      var dr = document.createElement('div');
      dr.className = 'v29-drawer'; dr.id = 'v29Drawer';
      var grid = document.createElement('div');
      grid.className = 'dr-grid';
      var hidden = { 'dashboard.html':1, 'map.html':1, 'msg.html':1, 'ledger.html':1, 'index.html':1 };
      PAGES.forEach(function(p){
        if (hidden[p.page]) return;
        var a = document.createElement('a');
        a.className = 'dr-item' + (c && c.page === p.page ? ' active' : '');
        a.href = p.page + q();
        a.innerHTML = svg(p.ic, 24) + '<span>' + p.name + '</span>';
        grid.appendChild(a);
      });
      dr.appendChild(grid);
      document.body.appendChild(dr);
    }
  }

  window.v29OpenDrawer = function() {
    var d = document.getElementById('v29Drawer'), m = document.getElementById('v29DrawerMask');
    if (d) { d.classList.add('open'); if (m) m.classList.add('show'); }
  };
  window.v29CloseDrawer = function() {
    var d = document.getElementById('v29Drawer'), m = document.getElementById('v29DrawerMask');
    if (d) { d.classList.remove('open'); if (m) m.classList.remove('show'); }
  };

  var hasExistingSidebar = false;
  // 主体左移（仅 nav.js 自动生成的 fixed 侧栏需要；已有侧栏页面布局已含侧栏空间）
  function shiftBody() {
    if (hasExistingSidebar) return;
    var sb = document.querySelector('.v29-sidebar');
    if (sb) document.body.classList.add('v29-with-sidebar');
  }

  function init() {
    ensureDesktopSidebar();
    injectMobileTab();
    shiftBody();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
