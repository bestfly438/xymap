/**
 * 天气模块 v2（和风天气，经云函数 /api/weather 转发）
 * ============================================================
 * 功能：
 *   1. 各村差异化天气（按村坐标逐村调用，实时+3天预报+预警）
 *   2. 日常定时刷新：8/10/12/15/18/20 点各刷一次（页面打开先拉一次）
 *   3. 降雨检测：任一村有雨（实况含雨 / 今日预报有雨 / 降雨类预警）→ 标记降雨状态
 *   4. 管理员降雨调度：检测到降雨后，管理员可按 10/15/20 分钟定时刷新某村
 * 说明：key 存在云函数环境变量，前端只带会话调用，key 不落地。
 */
var WEATHER = {
  cache: {},            // 村名 → {now, daily, warnings, rain, rainNote, updateTime}
  order: [],            // 村顺序（全名）
  refreshHours: [8, 10, 12, 15, 18, 20],  // 日常定时刷新整点
  lastRefreshed: {},    // 'YYYY-MM-DD hh' → true（防同小时重复刷）
  schedule: null,       // 管理员调度：{villages:[], intervalMin, durHours, endTime, timer}
  loaded: false,
};

// 通用 HTML 转义（外部数据/可编辑数据拼入 innerHTML 前必须转义）
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 村名映射：看板全名 → 坐标表短名
var WX_FULL2SHORT = { '常家坪村': '常坪村', '杨家河坝村': '河坝村' };
function wxShort(vname) { return WX_FULL2SHORT[vname] || vname; }
function wxCenter(vname) {
  var s = wxShort(vname);
  var c = (typeof VILLAGE_CENTERS !== 'undefined') ? VILLAGE_CENTERS[s] : null;
  return c;
}

// 调用云函数天气接口（带会话，key 在服务端）
function wxApi(lng, lat, type, cb) {
  var key = sessionStorage.getItem('xyc_key') || '';
  var device = sessionStorage.getItem('xyc_device') || '';
  if (!key || !device) { cb(null, '未登录或会话失效'); return; }
  fetch(FEISHU_CONFIG.apiBase + '/api/weather', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-xyc-key': key,
      'x-xyc-device': device
    },
    body: JSON.stringify({ lng: lng, lat: lat, type: type || 'all' })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d && d.code === 401) { try { sessionStorage.clear(); } catch(e) {} window.location.replace('index.html'); return; }
    if (d && d.code === 0) cb(d.data, null);
    else cb(null, (d && d.msg) || '天气获取失败');
  })
  .catch(function(e) { cb(null, '网络错误: ' + e.message); });
}

// 天气图标映射（和风 text → emoji）
var WX_ICON = {
  '晴': '&#x2600;', '多云': '&#x26C5;', '晴间多云': '&#x26C5;', '阴': '&#x2601;',
  '雾': '&#x1F32B;', '霾': '&#x1F32B;', '浮尘': '&#x1F32B;', '扬沙': '&#x1F32B;', '沙尘暴': '&#x1F32B;',
  '小雨': '&#x1F327;', '中雨': '&#x1F327;', '大雨': '&#x1F327;', '暴雨': '&#x1F327;',
  '阵雨': '&#x1F327;', '雷阵雨': '&#x26A1;', '冻雨': '&#x1F327;',
  '小雪': '&#x1F328;', '中雪': '&#x1F328;', '大雪': '&#x1F328;', '阵雪': '&#x1F328;',
  '雨夹雪': '&#x1F327;', '冰雹': '&#x1F327;',
};
function wxIcon(text) {
  var t = text || '';
  for (var k in WX_ICON) { if (t.indexOf(k) >= 0) return WX_ICON[k]; }
  return '&#x2600;';
}

// 刷新单个村天气并缓存
function refreshVillageWeather(vname, cb) {
  var c = wxCenter(vname);
  if (!c) { if (cb) cb(null, '无坐标'); return; }
  wxApi(c.lng, c.lat, 'all', function(data, err) {
    if (err || !data) {
      if (cb) cb(null, err || '失败');
      return;
    }
    WEATHER.cache[vname] = data;
    if (cb) cb(data, null);
  });
}

// 并行刷新所有村
function refreshAllVillages(cb) {
  if (!WEATHER.order.length) {
    if (typeof VILLAGE_ORDER !== 'undefined') WEATHER.order = VILLAGE_ORDER;
    else WEATHER.order = Object.keys(VILLAGE_CENTERS || {});
  }
  var done = 0, total = WEATHER.order.length;
  WEATHER.order.forEach(function(v) {
    refreshVillageWeather(v, function() {
      done++;
      if (done >= total) { WEATHER.loaded = true; renderAllWeather(); if (cb) cb(); }
    });
  });
}

// 顶栏徽章：显示全镇代表天气（任一村，有雨时强调）
function renderTopBadge() {
  var el = document.getElementById('weatherBadge');
  if (!el) return;
  var first = WEATHER.order[0];
  var d = first ? WEATHER.cache[first] : null;
  var hasRain = false, rainV = 0, note = '';
  WEATHER.order.forEach(function(v) {
    var x = WEATHER.cache[v];
    if (x && x.rain) { hasRain = true; rainV++; if (!note) note = x.rainNote; }
  });
  if (note && String(note).indexOf('undefined') >= 0) note = '';
  if (!d) {
    el.innerHTML = '<span class="wt">&#x2600;</span><span>新塬镇</span><span class="wtemp">--°C</span>' +
      '<span style="color:var(--text-muted);font-size:12px;">加载中</span>';
    return;
  }
  var now = d.now || {};
  var icon = hasRain ? '&#x1F327;' : wxIcon(now.text);
  var temp = now.temp ? Math.round(now.temp) + '°C' : '--°C';
  var desc = hasRain ? (rainV + '个村降雨' + (note ? '（' + note + '）' : '')) : ((now.text || '') + ' · 更新 ' + (d.updateTime ? d.updateTime.slice(11, 16) : ''));
  el.innerHTML = '<span class="wt">' + icon + '</span><span>新塬镇</span>' +
    '<span class="wtemp">' + temp + '</span>' +
    '<span style="color:' + (hasRain ? '#f59e0b' : 'var(--text-muted)') + ';font-size:12px;">' + desc + '</span>';
}

// 各村天气卡片
function renderVillageWeather() {
  var list = document.getElementById('rainList');
  if (!list) return;
  list.innerHTML = '';
  if (!WEATHER.order.length) {
    list.innerHTML = '<div style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:20px;">天气加载中...</div>';
    return;
  }
  WEATHER.order.forEach(function(v) {
    var d = WEATHER.cache[v];
    var div = document.createElement('div');
    if (!d) {
      div.className = 'rc-item';
      div.innerHTML = '<span class="rc-name">' + v + '</span><span class="rc-value" style="color:var(--text-muted)">--</span>';
      list.appendChild(div);
      return;
    }
    var now = d.now || {};
    var icon = d.rain ? '&#x1F327;' : wxIcon(now.text);
    var temp = now.temp ? Math.round(now.temp) + '°' : '--°';
    var txt = d.rain ? (d.rainNote || '降雨') : (now.text || '');
    // 防御：字段缺失时兜底，禁止把 undefined 显示给用户
    txt = String(txt).indexOf('undefined') >= 0 ? '降雨' : txt;
    div.className = 'rc-item' + (d.rain ? ' rain' : '');
    div.innerHTML = '<span class="rc-name">' + v + '</span>' +
      '<span class="rc-value"><span style="font-size:15px;">' + icon + '</span> ' + txt + ' ' + temp + '</span>';
    list.appendChild(div);
  });
}

// 预警等级色码 → 中文（和风 color.code: red/orange/yellow/blue）
var WX_LEVEL_ZH = { 'red': '红色', 'orange': '橙色', 'yellow': '黄色', 'blue': '蓝色' };

// 预警横幅 + 预警列表（来自和风实时预警）
// 过滤：只保留明确涉及会宁县/新塬镇的预警（和风返回的是省级预警，须按描述匹配本地）
// 聚合：同一预警多村命中时，横幅/列表按"新塬镇"汇总展示，不逐村罗列
function renderWarnings() {
  var allW = [];
  WEATHER.order.forEach(function(v) {
    var d = WEATHER.cache[v];
    if (d && d.warnings && d.warnings.length) {
      d.warnings.forEach(function(w) { allW.push({ v: v, w: w }); });
    }
  });
  // 按预警名+等级聚合，同时过滤外地预警
  var groups = {};
  allW.forEach(function(x) {
    var txt = ((x.w.headline || '') + ' ' + (x.w.description || '')).replace(/\s+/g, '');
    if (txt.indexOf('会宁') < 0 && txt.indexOf('新塬') < 0) return;  // 不涉及本地，丢弃
    var key = (x.w.name || '') + '|' + (x.w.color || '');
    if (!groups[key]) groups[key] = { w: x.w, villages: [] };
    if (groups[key].villages.indexOf(x.v) < 0) groups[key].villages.push(x.v);
  });
  var agg = Object.keys(groups).map(function(k) { return groups[k]; });
  agg.sort(function(a, b) {
    return WX_LEVEL_ZH[b.w.color] && WX_LEVEL_ZH[a.w.color] ? WX_LEVEL_ZH[b.w.color].localeCompare(WX_LEVEL_ZH[a.w.color], 'zh') : 0;
  });
  // 横幅：覆盖多村写"新塬镇"，单村写村名
  var banner = document.getElementById('alertBanner');
  if (banner) {
    if (agg.length) {
      banner.style.display = 'flex';
      banner.className = 'alert-banner danger';
      document.getElementById('alertTitle').textContent = '气象预警';
      document.getElementById('alertDesc').textContent = agg.slice(0, 3).map(function(g) {
        var scope = g.villages.length >= 2 ? '新塬镇' : g.villages[0];
        return scope + '：' + (g.w.headline || g.w.name);
      }).join('；');
    } else {
      banner.style.display = 'none';
    }
  }
  // 预警列表
  var el = document.getElementById('warnList');
  if (el) {
    if (!agg.length) {
      el.innerHTML = '<div class="warn-ok">&#x2705; 当前无涉及本地的气象预警</div>';
    } else {
      var html = '';
      agg.forEach(function(g) {
        var zh = WX_LEVEL_ZH[g.w.color] || '黄色';
        var color = WARN_LEVEL_COLORS[zh] || '#f59e0b';
        var scope = g.villages.length >= 2 ? ('新塬镇 ' + g.villages.length + ' 村') : g.villages[0];
        html += '<div class="warn-item" style="--warn-color:' + color + '">' +
          '<span class="warn-level" style="background:' + color + '">' + zh + '</span>' +
          '<span class="warn-title">' + scope + ' · ' + (g.w.headline || g.w.name) + '</span>' +
          '</div>';
      });
      el.innerHTML = html;
    }
  }
}

// 一键渲染全部天气 UI
function renderAllWeather() {
  renderTopBadge();
  renderVillageWeather();
  renderWarnings();
  renderGeoHazard();
  renderNmcWeather();
  updateSchedulePanel();
  document.getElementById('warnScope') && (document.getElementById('warnScope').textContent = '新塬镇（和风天气）');
  document.getElementById('warnUpdateTime') && (document.getElementById('warnUpdateTime').textContent = new Date().toLocaleString('zh-CN', { hour12: false }));
}

// ========== 地质灾害气象风险预警（自然资源部+中国气象局联合发布） ==========
// 与上面和风的"气象灾害预警"（暴雨/大风等天气现象）不同：地灾预警专指滑坡/泥石流/崩塌风险，
// 正对应本镇切坡建房隐患点。数据来自中央气象台页面，经云函数 /api/geohazard 解析。
var GEO_HAZARD_COLORS = { '红色': '#dc2626', '橙色': '#ea580c', '黄色': '#eab308', '蓝色': '#3b82f6' };
var geoHazardLoaded = false;

function geoHazardApi(cb) {
  var key = sessionStorage.getItem('xyc_key') || '';
  var device = sessionStorage.getItem('xyc_device') || '';
  if (!key || !device) { cb(null, '未登录或会话失效'); return; }
  fetch(FEISHU_CONFIG.apiBase + '/api/geohazard', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-xyc-key': key,
      'x-xyc-device': device
    },
    body: JSON.stringify({})
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d && d.code === 401) { try { sessionStorage.clear(); } catch(e) {} window.location.replace('index.html'); return; }
    if (d && d.code === 0) cb(d.data, null);
    else cb(null, (d && d.msg) || '获取失败');
  })
  .catch(function(e) { cb(null, '网络错误: ' + e.message); });
}

// 渲染地灾预警区块（看板预警卡内）
function renderGeoHazard() {
  if (geoHazardLoaded) return;   // 页面生命周期内只取一次（10分钟级数据）
  geoHazardLoaded = true;
  var block = document.getElementById('geoWarnBlock');
  if (!block) return;
  geoHazardApi(function(data, err) {
    var badge = document.getElementById('geoWarnBadge');
    var meta = document.getElementById('geoWarnMeta');
    var body = document.getElementById('geoWarnBody');
    var note = document.getElementById('geoWarnNote');
    if (err || !data || !data.content) {
      // 无数据/失败：不显示整块，避免误导（和风预警列表仍正常展示）
      block.style.display = 'none';
      return;
    }
    block.style.display = 'block';
    var c = data.content;
    // 判断是否涉及本地（甘肃/白银/会宁/新塬）
    var isLocal = (c.indexOf('甘肃') >= 0) || (c.indexOf('白银') >= 0) ||
                  (c.indexOf('会宁') >= 0) || (c.indexOf('新塬') >= 0);
    var color = GEO_HAZARD_COLORS[data.level] || '#eab308';
    badge.textContent = data.level + '预警';
    badge.style.background = color;
    badge.style.display = 'inline-block';
    meta.textContent = data.publish ? (data.publish + ' 发布 · 中央气象台') : '中央气象台';
    if (isLocal) {
      block.style.borderColor = 'rgba(239,68,68,0.8)';
      body.innerHTML = '<b style="color:#f87171;">&#x26A0; 涉及本镇区域！</b> ' +
        '<span style="color:#fbbf24;">' + esc(c) + '</span>';
      note.textContent = '提示：地灾预警等级高时，切坡建房、临崖临河隐患点受威胁人员请按村组通知及时转移避险。';
      note.className = 'geo-warn-note local';
    } else {
      block.style.borderColor = 'rgba(148,163,184,0.4)';
      body.textContent = '全国：' + c;
      note.textContent = '本次预警未涉及甘肃·白银·会宁（新塬镇）。如未来升级为涉及本地，此处将置顶显示。';
      note.className = 'geo-warn-note';
    }
  });
}

// ========== 日常定时刷新（8/10/12/15/18/20 点） ==========
function weatherTick() {
  var now = new Date();
  var h = now.getHours();
  var key = now.toLocaleDateString('sv') + ' ' + h;
  if (WEATHER.refreshHours.indexOf(h) >= 0 && !WEATHER.lastRefreshed[key]) {
    WEATHER.lastRefreshed[key] = true;
    refreshAllVillages();
  }
}

// ========== 管理员降雨调度（仅管理员；多村选择 + 间隔 + 时长到时自动停止） ==========
function isAdminUser() {
  return sessionStorage.getItem('xyc_admin') === '1' || sessionStorage.getItem('xyc_role') === '管理员';
}
function anyRain() {
  for (var v in WEATHER.cache) { if (WEATHER.cache[v].rain) return true; }
  return false;
}
// 渲染村庄多选 checkbox（只初始化一次，选项固定为全部村）
function buildVillageCheckboxes() {
  var wrap = document.getElementById('wxSchedVills');
  if (!wrap) return;
  if (wrap.dataset.built) return;
  wrap.dataset.built = '1';
  WEATHER.order.forEach(function(v) {
    var label = document.createElement('label');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = v;
    cb.name = 'wxSchedVill';
    cb.checked = true;   // 默认全选
    label.appendChild(cb);
    label.appendChild(document.createTextNode(v));
    wrap.appendChild(label);
  });
}
function selectedScheduleVillages() {
  var out = [];
  document.querySelectorAll('#wxSchedVills input[name=wxSchedVill]:checked').forEach(function(cb) {
    out.push(cb.value);
  });
  return out;
}
// 批量刷新指定村集合，全部完成后统一渲染一次
function refreshVillagesOnce(villages) {
  if (!villages.length) return;
  var done = 0;
  villages.forEach(function(v) {
    refreshVillageWeather(v, function() {
      if (++done >= villages.length) renderAllWeather();
    });
  });
}
function updateSchedulePanel() {
  var wrap = document.getElementById('wxScheduleWrap');
  if (!wrap) return;
  if (!isAdminUser()) { wrap.style.display = 'none'; return; }
  // 管理员登录即显示调度面板（不再依赖是否有降雨，避免按钮"消失"的困惑）
  wrap.style.display = 'block';
  buildVillageCheckboxes();
  // 调度时长/间隔与调度中状态保持
  var st = document.getElementById('wxSchedStatus');
  if (st) {
    if (WEATHER.schedule) {
      var remain = Math.max(0, Math.ceil((WEATHER.schedule.endTime - Date.now()) / 60000));
      var vtext = WEATHER.schedule.villages.length === WEATHER.order.length ? '全镇' + WEATHER.order.length + '村' : '已选' + WEATHER.schedule.villages.length + '村';
      st.textContent = '调度中：' + vtext + '，每 ' + WEATHER.schedule.intervalMin + ' 分钟刷新一次，剩余约 ' + remain + ' 分钟自动停止';
    } else if (anyRain()) {
      st.textContent = '检测到降雨，可多选村庄设置定时刷新（到时自动停止）';
    } else {
      st.textContent = '当前无降雨，可预先设置降雨定时刷新';
    }
  }
}
function wxStartSchedule() {
  var villages = selectedScheduleVillages();
  if (!villages.length) { alert('请至少选择一个村庄'); return; }
  var mins = parseInt(document.querySelector('input[name=wxSchedMin]:checked').value, 10);
  var dur = parseInt(document.querySelector('input[name=wxSchedDur]:checked').value, 10);
  if (WEATHER.schedule) {
    clearInterval(WEATHER.schedule.timer);
    clearTimeout(WEATHER.schedule.stopTimer);
    WEATHER.schedule = null;
  }
  // 立即刷一次，再按间隔刷；时长结束自动停止
  refreshVillagesOnce(villages);
  var timer = setInterval(function() {
    refreshVillagesOnce(villages);
  }, mins * 60 * 1000);
  var endTime = Date.now() + dur * 60 * 60 * 1000;
  var stopTimer = setTimeout(function() {
    wxStopSchedule();
  }, dur * 60 * 60 * 1000);
  WEATHER.schedule = { villages: villages, intervalMin: mins, durHours: dur, endTime: endTime, timer: timer, stopTimer: stopTimer };
  updateSchedulePanel();
}
function wxStopSchedule() {
  if (WEATHER.schedule) {
    clearInterval(WEATHER.schedule.timer);
    clearTimeout(WEATHER.schedule.stopTimer);
    WEATHER.schedule = null;
  }
  updateSchedulePanel();
}
// 单次刷新全部村（仅管理员可见，按钮在调度面板内）
function wxRefreshAllNow() {
  var btn = document.getElementById('wxRefreshAllNow');
  refreshAllVillages(function() {
    if (btn) {
      var old = btn.innerHTML;
      btn.innerHTML = '&#x2705; 已刷新';
      setTimeout(function() { btn.innerHTML = old; }, 1500);
    }
  });
}

// 调度间隔/时长单选高亮（label.on）
document.addEventListener('change', function(e) {
  if (e.target && (e.target.name === 'wxSchedMin' || e.target.name === 'wxSchedDur')) {
    document.querySelectorAll('input[name=' + e.target.name + ']').forEach(function(rb) {
      if (rb.parentElement) rb.parentElement.classList.toggle('on', rb.checked);
    });
  }
});

// ========== 初始化 ==========
var _wxTickTimer = null;
// village_centers.js 为 defer 加载，需等 VILLAGE_CENTERS 就绪后再启动天气（否则全部村无坐标、天气空白）
function weatherInit() {
  if (typeof VILLAGE_ORDER !== 'undefined') WEATHER.order = VILLAGE_ORDER.slice();
  else if (typeof VILLAGE_CENTERS !== 'undefined') WEATHER.order = Object.keys(VILLAGE_CENTERS);
  function start() {
    refreshAllVillages();
    if (!_wxTickTimer) _wxTickTimer = setInterval(weatherTick, 60 * 1000); // 每分钟检查是否到刷新整点
  }
  if (typeof VILLAGE_CENTERS !== 'undefined') { start(); return; }
  // VILLAGE_CENTERS 尚未就绪（defer 脚本未执行）：轮询等待，最多 5 秒；就绪后立即启动
  var tries = 0;
  var wait = setInterval(function() {
    tries++;
    if (typeof VILLAGE_CENTERS !== 'undefined' || tries > 50) {
      clearInterval(wait);
      start();
    }
  }, 100);
}

// ========== 中央气象台增强（/api/nmcweather）：未来3天降水 + 近24h温度/降雨趋势 ==========
// 与和风互补：中央气象台会宁县站（QucKY），服务端抓取并缓存 30 分钟，登录后调用
var nmcWxLoaded = false;
function nmcWeatherApi(cb) {
  var key = sessionStorage.getItem('xyc_key') || '';
  var device = sessionStorage.getItem('xyc_device') || '';
  if (!key || !device) { cb(null, '未登录或会话失效'); return; }
  fetch(FEISHU_CONFIG.apiBase + '/api/nmcweather', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-xyc-key': key,
      'x-xyc-device': device
    },
    body: JSON.stringify({})
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d && d.code === 401) { try { sessionStorage.clear(); } catch(e) {} window.location.replace('index.html'); return; }
    if (d && d.code === 0) cb(d, null);
    else cb(null, (d && d.msg) || '获取失败');
  })
  .catch(function(e) { cb(null, '网络错误: ' + e.message); });
}

// 未来3天降水卡片（今天/明天/后天）
function renderRain3d(list) {
  var names = ['今天', '明天', '后天'];
  var html = '';
  list.forEach(function(x, i) {
    var day = x.dayInfo ? x.dayInfo : '';
    var night = x.nightInfo ? x.nightInfo : '';
    var temps = [];
    if (x.dayTemp != null) temps.push('&#9728;' + x.dayTemp + '°');
    if (x.nightTemp != null) temps.push('&#127769;' + x.nightTemp + '°');
    var rainTxt = x.precip > 0
      ? '<span style="color:#3b82f6;font-weight:700;">&#127783; ' + x.precip + 'mm</span>'
      : '<span style="color:var(--text-muted);">无降水</span>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 2px;border-bottom:1px dashed #f0f0f0;font-size:13px;">' +
      '<span style="font-weight:600;width:42px;flex-shrink:0;">' + (names[i] || (x.date || '').slice(5)) + '</span>' +
      '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);">' +
      esc(day) + (day && night ? '转' : '') + esc(night) +
      (temps.length ? ' ' + temps.join(' ') : '') + '</span>' +
      '<span style="width:78px;text-align:right;flex-shrink:0;">' + rainTxt + '</span></div>';
  });
  return html;
}

// 近24小时温度/降雨趋势（SVG 图表：坐标系 + 温度刻度 + 时间轴 + 网格 + 图例）
function renderTrend24(list) {
  var W = 340, H = 152, L = 36, R = 8, T = 10, B = 118;
  var temps = list.map(function(x) { return x.temp; });
  var valid = temps.filter(function(t) { return t != null; });
  if (!valid.length) return '<div style="color:var(--text-muted);font-size:12px;padding:8px 2px;">暂无趋势数据</div>';
  var tMin = Math.min.apply(null, valid), tMax = Math.max.apply(null, valid);
  if (tMax - tMin < 4) { tMin -= 2; tMax += 2; }
  // 生成"整齐"的温度刻度（1/2/5 步进），保证纵轴刻度是整数好认
  var step = (tMax - tMin) / 4;
  var mag = Math.pow(10, Math.floor(Math.log10(step || 1)));
  var norm = step / mag;
  var ss = norm < 1.5 ? 1 : (norm < 3 ? 2 : (norm < 7 ? 5 : 10));
  var tickStep = ss * mag;
  var t0 = Math.ceil(tMin / tickStep) * tickStep;
  var ticks = [];
  for (var t = t0; t <= tMax; t += tickStep) ticks.push(Math.round(t * 10) / 10);
  if (ticks.length < 2) ticks = [Math.round(tMin), Math.round(tMax)];
  var yTop = T, yBot = B;
  var tickSpan = (ticks[ticks.length - 1] - ticks[0]) || 1;
  function yOf(t) { return yBot - (t - ticks[0]) / tickSpan * (yBot - yTop); }
  var n = list.length;
  function px(i) { return L + (n <= 1 ? 0 : i * (W - L - R) / (n - 1)); }
  // 横向网格线 + 纵轴温度刻度
  var grid = '';
  ticks.forEach(function(t) {
    var gy = yOf(t);
    grid += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + gy.toFixed(1) + '" stroke="#24344d" stroke-width="1"/>' +
      '<text x="' + (L - 5) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#7d8ca3">' + Math.round(t) + '°</text>';
  });
  // 纵轴轴线 + 底轴线
  grid += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + B + '" stroke="#334155" stroke-width="1"/>';
  grid += '<line x1="' + L + '" y1="' + B + '" x2="' + (W - R) + '" y2="' + B + '" stroke="#334155" stroke-width="1"/>';
  // 横轴时间刻度（每 4 小时一个，末尾补当前时刻）
  var xl = '';
  for (var i = 0; i < n; i += 4) {
    var tt = list[i] && list[i].time ? list[i].time.slice(11, 16) : '';
    xl += '<text x="' + px(i).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="9" fill="#7d8ca3">' + tt + '</text>';
  }
  if ((n - 1) % 4 !== 0 && list[n - 1] && list[n - 1].time) {
    xl += '<text x="' + px(n - 1).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="end" font-size="9" fill="#f59e0b">' + list[n - 1].time.slice(11, 16) + '</text>';
  }
  // 降雨柱（先画，垫在温度线下层）
  var maxRain = 0;
  list.forEach(function(x) { if (x.rain1h > maxRain) maxRain = x.rain1h; });
  var bars = '';
  list.forEach(function(x, i) {
    var r = x.rain1h || 0;
    if (r > 0) {
      var bh = Math.max(2, r / (maxRain || 1) * (yBot - yTop) * 0.85);
      bars += '<rect x="' + (px(i) - 3).toFixed(1) + '" y="' + (yBot - bh).toFixed(1) + '" width="6" height="' + bh.toFixed(1) + '" fill="#3b82f6" opacity="0.75" rx="1"><title>' + esc(x.time) + ' 降水 ' + r + 'mm</title></rect>';
    }
  });
  // 温度折线 + 数据点
  var pts = [];
  for (var i = 0; i < n; i++) { if (temps[i] != null) pts.push(px(i).toFixed(1) + ',' + yOf(temps[i]).toFixed(1)); }
  var dots = '';
  for (var i = 0; i < n; i++) {
    if (temps[i] != null) dots += '<circle cx="' + px(i).toFixed(1) + '" cy="' + yOf(temps[i]).toFixed(1) + '" r="2.2" fill="#f59e0b"/>';
  }
  // 当前温度标注
  var curTxt = '';
  var last = list[n - 1] || {};
  if (last.temp != null) {
    var lastY = yOf(last.temp);
    curTxt = '<text x="' + px(n - 1).toFixed(1) + '" y="' + (Math.max(T + 8, lastY - 7)).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#fbbf24">' + Math.round(last.temp) + '°</text>';
  }
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;background:rgba(30,41,59,0.4);border-radius:10px;padding:4px 0;" role="img" aria-label="近24小时温度与降雨趋势图">' +
    grid + bars +
    '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
    dots + curTxt + xl + '</svg>';
  var t1 = list[0] && list[0].time ? list[0].time.slice(11, 16) : '';
  var t2 = last.time ? last.time.slice(11, 16) : '';
  var leg = '<span style="color:#fbbf24;font-weight:600;">&#9472; 温度</span>' +
    ' <span style="color:#60a5fa;font-weight:600;">&#9608; 每小时降水</span>' +
    ' <span style="color:var(--text-secondary);">当前 ' + (last.temp != null ? Math.round(last.temp) + '°C' : '--') +
    (maxRain > 0 ? ' · 最大时降水 ' + maxRain + 'mm' : '') +
    ' · ' + t1 + ' → ' + t2 + '</span>';
  return '<div>' + svg + '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">' + leg + '</div></div>';
}

// 渲染入口（页面生命周期只取一次，数据 30 分钟级）
function renderNmcWeather() {
  if (nmcWxLoaded) return;
  nmcWxLoaded = true;
  var block = document.getElementById('nmcWxBlock');
  if (!block) return;
  nmcWeatherApi(function(d, err) {
    if (err || !d || !d.rain3d) { block.style.display = 'none'; return; }
    block.style.display = 'block';
    var up = document.getElementById('nmcUpdateTime');
    if (up) up.textContent = (d.publish || '') + ' 发布';
    var r3 = document.getElementById('nmcRain3d');
    if (r3 && d.rain3d.length) r3.innerHTML = renderRain3d(d.rain3d);
    var tr = document.getElementById('nmcTrend');
    if (tr && d.trend24 && d.trend24.length) tr.innerHTML = renderTrend24(d.trend24);
  });
}
