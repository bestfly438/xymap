/**
 * 飞书多维表格配置（方案A：前端直接调用飞书API）
 * 用于巡查记录同步、村庄数据编辑同步
 */
var FEISHU_CONFIG = {
  appId: 'cli_aafb78770922dcc2',
  appSecret: 'REVOKED',
  baseToken: 'RfabbIErzaadtFsM9jZcqffvnOb',
  tables: {
    patrol: 'tblz3JMnhmwDuNld',   // 巡查记录表
    villageData: 'tblwAxlJ9Ue5XNS1' // 村庄数据表
  },
  // 腾讯云函数代理地址（解决浏览器CORS跨域问题，已部署验证通过）
  apiBase: 'https://1463495179-bhdx6dldr1.ap-guangzhou.tencentscf.com'
};

// 获取 tenant_access_token（带缓存，有效期7200秒，提前10分钟刷新）
var _feishuToken = null;
var _feishuTokenExpire = 0;

// 飞书 API 主机（配置了 Worker 代理则走代理，否则直连飞书）
function feishuApiHost() {
  return FEISHU_CONFIG.apiBase ? FEISHU_CONFIG.apiBase : 'https://open.feishu.cn';
}

function getFeishuToken(callback) {
  var now = Date.now();
  if (_feishuToken && now < _feishuTokenExpire - 600000) {
    callback(_feishuToken);
    return;
  }
  fetch(feishuApiHost() + '/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: FEISHU_CONFIG.appId, app_secret: FEISHU_CONFIG.appSecret })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.code === 0 && data.tenant_access_token) {
      _feishuToken = data.tenant_access_token;
      _feishuTokenExpire = now + data.expire * 1000;
      callback(_feishuToken);
    } else {
      callback(null);
    }
  })
  .catch(function() { callback(null); });
}

// 将飞书"查询记录列表"的返回（列数组格式）转换为对象数组 [{record_id, fields}]
// 返回结构：data.data = { data: [[...行...]], fields: [...列名...], record_id_list: [...记录ID...] }
function feishuRowsToObjects(data) {
  if (!data || !data.data) return [];
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

// 通用飞书API请求
function feishuRequest(method, path, body, callback) {
  getFeishuToken(function(token) {
    if (!token) { callback(null, '获取飞书凭证失败'); return; }
    var opts = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8'
      }
    };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    fetch(feishuApiHost() + path, opts)
      .then(function(r) { return r.json(); })
      .then(function(data) { callback(data, null); })
      .catch(function(e) { callback(null, '网络错误: ' + e.message); });
  });
}
