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
