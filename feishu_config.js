/**
 * 飞书多维表格配置（安全版）
 * 安全凭证（appSecret）已移入腾讯云函数服务端，前端不再保存任何秘密。
 * 所有飞书读写统一走腾讯云函数 /api/feishu（会话校验 + 服务端权限规则）。
 */
var FEISHU_CONFIG = {
  apiBase: 'https://1463495179-bhdx6dldr1.ap-guangzhou.tencentscf.com', // 腾讯云函数URL
  baseToken: 'RfabbIErzaadtFsM9jZcqffvnOb',   // 多维表格 app_token（仅用于拼路径）
  tables: {
    patrol: 'tblz3JMnhmwDuNld',   // 巡查记录表
    villageData: 'tblwAxlJ9Ue5XNS1' // 村庄数据表
  }
};

// 将飞书"查询记录列表"的返回（列数组格式）转换为对象数组 [{record_id, fields}]
// 返回结构：data.data = { data: [[...行...]], fields: [...列名...], record_id_list: [...记录ID...] }
function feishuRowsToObjects(data) {
  if (!data || !data.data || !Array.isArray(data.data.data)) return [];
  var d = data.data;
  var names = d.fields || [];
  var rows = d.data || [];
  var ids = d.record_id_list || [];
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || [];
    var fields = {};
    for (var j = 0; j < names.length && j < row.length; j++) {
      var v = row[j];
      if (v !== null && v !== undefined && v !== '') fields[names[j]] = v;
    }
    out.push({ record_id: ids[i] || '', fields: fields });
  }
  return out;
}

// 通用飞书API请求：走腾讯云函数转发（带会话凭证，服务端校验权限）
function feishuRequest(method, path, body, callback) {
  var key = sessionStorage.getItem('xyc_key') || '';
  var device = sessionStorage.getItem('xyc_device') || '';
  if (!key || !device) { callback(null, '未登录或会话失效，请重新登录'); return; }
  fetch(FEISHU_CONFIG.apiBase + '/api/feishu', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-xyc-key': key,
      'x-xyc-device': device
    },
    body: JSON.stringify({ method: method, path: path, body: body })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    // 会话失效（401）：自动清除会话并跳回登录页重新登录，避免残留旧会话导致功能异常
    if (data && data.code === 401) {
      try { sessionStorage.clear(); } catch(e) {}
      window.location.replace('index.html');
      return;
    }
    if (data && data.code === 403) {
      callback(null, data.msg || '无权限');
      return;
    }
    callback(data, null);
  })
  .catch(function(e) { callback(null, '网络错误: ' + e.message); });
}

// 管理员接口请求（密钥管理 / 解绑 / 登录记录）
function adminRequest(sub, payload, callback) {
  var key = sessionStorage.getItem('xyc_key') || '';
  var device = sessionStorage.getItem('xyc_device') || '';
  if (!key || !device) { callback(null, '未登录或会话失效'); return; }
  fetch(FEISHU_CONFIG.apiBase + '/api/admin/' + sub, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-xyc-key': key,
      'x-xyc-device': device
    },
    body: JSON.stringify(payload || {})
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    // 会话失效或权限不足（401/403）：自动清除会话并跳回登录页重新登录
    if (data && (data.code === 401 || data.code === 403)) {
      try { sessionStorage.clear(); } catch(e) {}
      window.location.replace('index.html');
      return;
    }
    if (data && data.code !== 0) { callback(null, data.msg || '操作失败'); return; }
    callback(data, null);
  })
  .catch(function(e) { callback(null, '网络错误: ' + e.message); });
}

// ========== 敏感数据取数（数据私有化：登录后从云函数 /api/data 读取，注入为全局变量） ==========
var SECURE_DATA_LOADED = {};   // 页内防重复加载
// 会话级内容缓存（sessionStorage）：看板/地图/分析页整页跳转后不再重复请求云函数，秒开
// 缓存带 30 分钟 TTL：数据文件更新后自动失效旧缓存，避免用户永远看到旧数据
// 多文件并行请求（云函数可并发），单文件失败重试 2 次后跳过，避免单文件拖慢/卡死整页
var DATA_CACHE_TTL = 30 * 60 * 1000;   // 30 分钟
function _cacheSet(f, code) {
  try { sessionStorage.setItem('xyc_data_' + f, JSON.stringify({ t: Date.now(), c: code })); } catch(e) {}
}
function _cacheGet(f) {
  try {
    var raw = sessionStorage.getItem('xyc_data_' + f);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (!obj || typeof obj.c !== 'string') { sessionStorage.removeItem('xyc_data_' + f); return null; }
    if (Date.now() - (obj.t || 0) > DATA_CACHE_TTL) { sessionStorage.removeItem('xyc_data_' + f); return null; }
    return obj.c;
  } catch(e) { return null; }
}
function loadSecureData(files, callback, opts) {
  opts = opts || {};
  var force = !!opts.force;   // true 时忽略内存/缓存，强制重新从云函数拉取（用于失败后自愈重试）
  var key = sessionStorage.getItem('xyc_key') || '';
  var device = sessionStorage.getItem('xyc_device') || '';
  if (!key || !device) { window.location.replace('index.html'); return; }
  // 注入并执行取到的 JS 内容，返回是否成功
  function inject(code, f) {
    try {
      var s = document.createElement('script');
      s.textContent = code;          // 注入执行，文件内的 var 声明成为全局变量
      document.head.appendChild(s);
      SECURE_DATA_LOADED[f] = true;
      _cacheSet(f, code);
      return true;
    } catch(e) { return false; }
  }
  function loadOne(f, attempt, finish) {
    fetch(FEISHU_CONFIG.apiBase + '/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-xyc-key': key,
        'x-xyc-device': device
      },
      body: JSON.stringify({ file: f })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.code === 0 && d.data) {
        if (inject(d.data, f) || inject(d.data, f)) { finish(); return; }  // 注入失败重试一次
        finish(); return;                                                    // 仍失败跳过，不阻塞
      }
      if (d && d.code === 401) {
        try { sessionStorage.clear(); } catch(e) {}
        window.location.replace('index.html');
        finish();  // 确保回调计数到位，避免页面在跳转前因缺少本次 finish 而卡住
        return;
      }
      if (attempt < 2) { loadOne(f, attempt + 1, finish); return; }          // 服务异常重试 2 次
      finish();
    })
    .catch(function() {
      if (attempt < 2) { loadOne(f, attempt + 1, finish); return; }
      finish();
    });
  }
  var done = 0;
  // 回调统一异步触发（setTimeout 0）：命中 sessionStorage 缓存时 inject 是同步的，
  // 若不延迟，回调会在本段同步脚本执行完之前运行，导致其引用的 var 全局变量（如 VILLAGE_ORDER）
  // 尚未赋值而抛错、渲染链中断 —— 这正是"进入子菜单返回后数据看板只剩骨架"的根因。
  function finish() { if (++done >= files.length && callback) setTimeout(callback, 0); }
  files.forEach(function(f) {
    if (!force && SECURE_DATA_LOADED[f]) { finish(); return; }
    if (!force) {
      // 命中会话缓存：直接注入，不再请求云函数
      var cached = _cacheGet(f);
      if (cached) {
        if (inject(cached, f)) { finish(); return; }
        // 缓存内容损坏（注入失败）：清除后走网络重新拉取
        try { sessionStorage.removeItem('xyc_data_' + f); } catch(e) {}
      }
    }
    loadOne(f, 0, finish);
  });
}
