/**
 * 切坡建房农户照片模块（经云函数 /api/photo，key 不落地）
 * ============================================================
 * 功能：
 *   1. 照片压缩：Canvas 最长边 1280px + JPEG 0.7（一张手机原图约压到 100~200KB）
 *   2. 上传：村级仅本村、镇级/管理员全镇；每户最多 2 张，上传后村级不可修改
 *   3. 删除：仅管理员
 *   4. 查看：登录会话拉取，blob URL 展示（照片存 COS 私有桶，登录可见）
 * 使用：
 *   photoInit()                看板板块初始化（村/户主下拉 + 槽位 + 村照片列表）
 *   photoList(cb)              拉取全量照片列表（带缓存）
 *   photoOf(village, owner)    某户照片数组
 *   photoFillPopup(holder,...) 地图弹窗填充照片
 */
var PHOTO = {
  list: [],        // [{village, owner, idx, key}]
  loaded: false,
  blobs: {},       // key -> objectURL（去重缓存）
};

function photoAuth() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'x-xyc-key': sessionStorage.getItem('xyc_key') || '',
    'x-xyc-device': sessionStorage.getItem('xyc_device') || ''
  };
}
function photoApi(sub, payload, cb) {
  var key = sessionStorage.getItem('xyc_key') || '';
  var device = sessionStorage.getItem('xyc_device') || '';
  if (!key || !device) { cb(null, '未登录或会话失效'); return; }
  fetch(FEISHU_CONFIG.apiBase + '/api/photo/' + sub, {
    method: 'POST',
    headers: photoAuth(),
    body: JSON.stringify(payload || {})
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d && d.code === 401) { try { sessionStorage.clear(); } catch(e) {} window.location.replace('index.html'); return; }
    if (d && d.code === 0) cb(d.data, null);
    else cb(null, (d && d.msg) || '操作失败');
  })
  .catch(function(e) { cb(null, '网络错误: ' + e.message); });
}

// 全量照片列表（force 强制刷新）
function photoList(force, cb) {
  if (typeof cb !== 'function') { cb = force; force = false; }
  if (PHOTO.loaded && !force) { cb(PHOTO.list, null); return; }
  photoApi('list', {}, function(data, err) {
    if (err) { cb(null, err); return; }
    PHOTO.list = data || [];
    PHOTO.loaded = true;
    cb(PHOTO.list, null);
  });
}
// 某户照片（按槽位排序）
function photoOf(village, owner) {
  return (PHOTO.list || []).filter(function(x) {
    return x.village === village && x.owner === owner;
  }).sort(function(a, b) { return a.idx - b.idx; });
}


// v29-6 照片压缩 + 时间水印（最长边 1600px、JPEG 0.8、右下角时间戳；开关 xyc_nocompress=1 关闭走原图）
function v29CompressPhoto(file, cb) {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('xyc_nocompress') === '1') { cb(file); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var MAX = 1600;
      var scale = Math.min(1, MAX / Math.max(img.width, img.height));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * scale));
      cv.height = Math.max(1, Math.round(img.height * scale));
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      // 右下角时间水印
      try {
        var d = new Date();
        var pad2 = function(n) { return String(n).padStart(2, '0'); };
        var stamp = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        var fs = Math.max(12, Math.round(cv.width / 85));
        ctx.font = fs + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textBaseline = 'bottom';
        var label = '新塬应急 ' + stamp;
        var tw = ctx.measureText(label).width;
        var bx = cv.width - tw - 12, by = cv.height - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx - 6, by - fs - 6, tw + 12, fs + 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, bx, by);
      } catch(e2) {}
      if (cv.toBlob) {
        cv.toBlob(function(blob) { cb(blob); }, 'image/jpeg', 0.8);
      } else {
        var dataUrl = cv.toDataURL('image/jpeg', 0.8);
        var bin = atob(dataUrl.split(',')[1]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        cb(new Blob([arr], { type: 'image/jpeg' }));
      }
    };
    img.onerror = function() { cb(null); };
    img.src = e.target.result;
  };
  reader.onerror = function() { cb(null); };
  reader.readAsDataURL(file);
}

// 压缩图片：委托 v29CompressPhoto（1600px/0.8+水印），开关可回退原图
function photoCompress(file, cb) {
  v29CompressPhoto(file, cb);
}
function photoBlobToBase64(blob, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var r = e.target.result;
    var idx = r.indexOf(',');
    cb(idx >= 0 ? r.substring(idx + 1) : r);
  };
  reader.readAsDataURL(blob);
}

// 上传（压缩后的 blob）
function photoUpload(village, owner, idx, blob, cb) {
  photoBlobToBase64(blob, function(b64) {
    photoApi('upload', { village: village, owner: owner, idx: idx, img: b64 }, function(data, err) {
      if (err) { cb(null, err); return; }
      PHOTO.loaded = false;
      cb(data, null);
    });
  });
}
// 删除（仅管理员）
function photoDelete(village, owner, idx, cb) {
  photoApi('delete', { village: village, owner: owner, idx: idx }, function(data, err) {
    if (err) { cb(null, err); return; }
    PHOTO.loaded = false;
    cb(data, null);
  });
}
// 页内放大查看照片（点击照片不新开窗口，点遮罩或再点图片关闭）
function photoView(src) {
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;'
    + 'display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  var img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:94vw;max-height:94vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.5);';
  img.onclick = function() { ov.click(); };
  ov.appendChild(img);
  ov.onclick = function() { document.body.removeChild(ov); };
  document.body.appendChild(ov);
}

// 取照片 blob URL（登录可见；key 走 POST body —— 云函数 URL 网关不转发 query 参数）
// 服务端返回 JSON base64（网关二进制通道不可靠），前端解码为 blob
function photoURL(key, cb) {
  if (PHOTO.blobs[key]) { cb(PHOTO.blobs[key]); return; }
  fetch(FEISHU_CONFIG.apiBase + '/api/photo/raw', {
    method: 'POST',
    headers: photoAuth(),
    body: JSON.stringify({ key: key })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (!d || d.code !== 0 || !d.data || !d.data.img) { cb(null); return; }
    var bin;
    try { bin = atob(d.data.img); } catch (e) { cb(null); return; }
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], { type: 'image/jpeg' }));
    PHOTO.blobs[key] = url;
    cb(url);
  })
  .catch(function() { cb(null); });
}

// 地图弹窗填充照片
function photoFillPopup(holder, village, owner) {
  holder.innerHTML = '<span class="ph-muted">照片加载中...</span>';
  photoList(false, function(list, err) {
    if (err) { holder.innerHTML = '<span class="ph-muted">照片加载失败</span>'; return; }
    var arr = photoOf(village, owner);
    if (!arr.length) { holder.innerHTML = '<span class="ph-muted">暂无照片</span>'; return; }
    var html = '';
    var remaining = arr.length;
    arr.forEach(function(item) {
      photoURL(item.key, function(url) {
        html += '<img src="' + url + '" class="pop-photo-img" alt="照片' + item.idx + '" onclick="photoView(this.src)">';
        if (--remaining <= 0) holder.innerHTML = html;
      });
    });
  });
}

// ========== 看板板块（photoInit） ==========
function photoIsAdmin() {
  return sessionStorage.getItem('xyc_admin') === '1' || sessionStorage.getItem('xyc_role') === '管理员';
}
function photoIsCun() {
  return sessionStorage.getItem('xyc_role') === '村级';
}
function photoMyVillage() {
  return sessionStorage.getItem('xyc_village') || '';
}
// 完整村名 -> SHP 简称（隐患点名册 CZ 用简称）
var PHOTO_FULL2SHORT = { '常家坪村': '常坪村', '杨家河坝村': '河坝村' };
function photoShort(vname) { return PHOTO_FULL2SHORT[vname] || vname; }
// 某村隐患户主名单（从隐患点名册过滤，排除全镇汇总点）
function photoOwners(vname) {
  var sn = photoShort(vname);
  var owners = [];
  if (typeof DATA_HAZARD_POINTS === 'undefined' || !DATA_HAZARD_POINTS.features) return owners;
  DATA_HAZARD_POINTS.features.forEach(function(f) {
    var p = f.properties || {};
    if (p.source === 'vector_data') return;
    if ((p.CZ || '') !== sn) return;
    if (p.HZXM && owners.indexOf(p.HZXM) < 0) owners.push(p.HZXM);
  });
  return owners;
}

// 看板初始化：村下拉（村级锁定本村）→ 户主下拉 → 槽位 + 村照片列表
function photoInit() {
  var wrap = document.getElementById('photoWrap');
  if (!wrap) return;
  var selV = document.getElementById('photoVillage');
  var selO = document.getElementById('photoOwner');
  if (!selV || !selO) return;
  // 村下拉
  selV.innerHTML = '';
  if (typeof VILLAGE_ORDER !== 'undefined') {
    var cun = photoMyVillage();
    VILLAGE_ORDER.forEach(function(v) {
      if (photoIsCun() && v !== cun) return; // 村级只显示本村
      var op = document.createElement('option');
      op.value = v; op.textContent = v;
      selV.appendChild(op);
    });
    if (photoIsCun() && cun) selV.value = cun;
    selV.disabled = photoIsCun();
  }
  // 切换村 → 重建户主
  selV.onchange = function() { photoRebuildOwner(); };
  selO.onchange = function() { photoRenderSlots(); photoRenderList(); };
  photoRebuildOwner();
  photoList(false, function() {
    photoRenderSlots();
    photoRenderList();
  });
}
function photoRebuildOwner() {
  var selV = document.getElementById('photoVillage');
  var selO = document.getElementById('photoOwner');
  if (!selV || !selO) return;
  var v = selV.value || '';
  selO.innerHTML = '';
  var owners = v ? photoOwners(v) : [];
  owners.forEach(function(o) {
    var op = document.createElement('option');
    op.value = o; op.textContent = o;
    selO.appendChild(op);
  });
  if (!owners.length) {
    var op = document.createElement('option');
    op.value = ''; op.textContent = '该村无隐患户主数据';
    selO.appendChild(op);
  }
  photoRenderSlots();
  photoRenderList();
}
// 当前选中村/户
function photoSelected() {
  var selV = document.getElementById('photoVillage');
  var selO = document.getElementById('photoOwner');
  return { village: selV ? selV.value : '', owner: selO ? selO.value : '' };
}

// 该户两个槽位：已传显示照片，空位显示上传按钮
function photoRenderSlots() {
  var slots = document.getElementById('photoSlots');
  if (!slots) return;
  var s = photoSelected();
  if (!s.village || !s.owner) { slots.innerHTML = '<div class="ph-muted" style="padding:12px 0;">请先选择村和户主</div>'; return; }
  var arr = photoOf(s.village, s.owner);
  var byIdx = {};
  arr.forEach(function(x) { byIdx[x.idx] = x; });
  var isAdmin = photoIsAdmin();
  var html = '<div class="ph-hint">' + s.village + ' · ' + s.owner + '（已传 ' + arr.length + '/2 张）</div>';
  html += '<div class="ph-slots">';
  for (var i = 1; i <= 2; i++) {
    var item = byIdx[i];
    html += '<div class="ph-slot">';
    html += '<div class="ph-slot-title">第 ' + i + ' 张</div>';
    html += '<div class="ph-slot-body">';
    if (item) {
      html += '<div class="ph-slot-img" id="phImg' + i + '">加载中...</div>';
      html += isAdmin
        ? '<button class="ws-btn stop ph-del" onclick="photoDelSlot(' + i + ')">&#x1F5D1; 删除</button>'
        : '<div class="ph-muted" style="font-size:11px;">已上传（村级不可修改）</div>';
    } else {
      html += '<button class="ws-btn start" onclick="photoPick(' + i + ')">&#x1F4F7; 上传第 ' + i + ' 张</button>';
    }
    html += '</div></div>';
    if (item) {
      (function(idx, key) {
        photoURL(key, function(url) {
          var el = document.getElementById('phImg' + idx);
          if (el && url) el.innerHTML = '<img src="' + url + '" onclick="photoView(this.src)">';
          else if (el) el.textContent = '加载失败';
        });
      })(i, item.key);
    }
  }
  html += '</div>';
  slots.innerHTML = html;
}
// 选择图片（拍照或相册，input file 原生支持）
function photoPick(idx) {
  var input = document.getElementById('photoFileInput');
  if (!input) return;
  input.value = '';
  input.dataset.idx = idx;
  input.click();
}
// 文件选中 → 压缩 → 上传
function photoOnFile(file) {
  var input = document.getElementById('photoFileInput');
  if (!input || !file) return;
  var idx = parseInt(input.dataset.idx || '0', 10);
  var s = photoSelected();
  if (!s.village || !s.owner) { alert('请先选择村和户主'); return; }
  if (!/^image\//.test(file.type)) { alert('请选择图片文件'); return; }
  var tip = document.getElementById('photoTip');
  if (tip) tip.textContent = '压缩上传中...';
  photoCompress(file, function(blob) {
    if (!blob) { if (tip) tip.textContent = ''; alert('图片处理失败，请重试'); return; }
    photoUpload(s.village, s.owner, idx, blob, function(data, err) {
      if (err) { if (tip) tip.textContent = ''; alert(err); return; }
      if (tip) tip.textContent = '&#x2705; 已上传（直接上线）';
      setTimeout(function() { if (tip) tip.textContent = ''; }, 2500);
      photoList(true, function() {
        photoRenderSlots();
        photoRenderList();
      });
    });
  });
}
// 管理员删除某张
function photoDelSlot(idx) {
  if (!confirm('确认删除该户第 ' + idx + ' 张照片？')) return;
  var s = photoSelected();
  if (!s.village || !s.owner) return;
  photoDelete(s.village, s.owner, idx, function(data, err) {
    if (err) { alert(err); return; }
    photoList(true, function() {
      photoRenderSlots();
      photoRenderList();
    });
  });
}
// 当前村所有户照片列表（含未上传状态，方便督办）
function photoRenderList() {
  var el = document.getElementById('photoList');
  if (!el) return;
  var s = photoSelected();
  if (!s.village) { el.innerHTML = ''; return; }
  var owners = photoOwners(s.village);
  var byOwner = {};
  (PHOTO.list || []).forEach(function(x) {
    if (x.village !== s.village) return;
    if (!byOwner[x.owner]) byOwner[x.owner] = [];
    byOwner[x.owner].push(x);
  });
  var done = 0;
  var html = '<div class="ph-list-head">' + s.village + ' 共 ' + owners.length + ' 户 · 已传 '
    + Object.keys(byOwner).filter(function(o) { return byOwner[o].length > 0; }).length + ' 户</div>';
  html += '<div class="ph-list">';
  owners.forEach(function(o, idx) {
    var arr = (byOwner[o] || []).sort(function(a, b) { return a.idx - b.idx; });
    var badge = arr.length === 0 ? '<span class="ph-badge none">未传</span>'
      : arr.length === 2 ? '<span class="ph-badge full">已满</span>'
      : '<span class="ph-badge part">' + arr.length + '/2</span>';
    html += '<div class="ph-card">';
    html += '<div class="ph-card-top"><span class="ph-card-name">' + o + '</span>' + badge + '</div>';
    html += '<span class="ph-row-imgs" id="phRow' + idx + '">';
    if (arr.length) {
      arr.forEach(function(item) {
        html += '<span class="ph-thumb" data-key="' + item.key + '">加载中...</span>';
      });
    } else {
      html += '<span class="ph-slot">待上传</span>';
    }
    html += '</span></div>';
    (function(rid, items) {
      if (!items.length) return;
      var remaining = items.length;
      items.forEach(function(item) {
        photoURL(item.key, function(url) {
          var host = document.getElementById(rid);
          var thumb = host ? host.querySelector('.ph-thumb[data-key="' + item.key + '"]') : null;
          if (thumb && url) thumb.innerHTML = '<img src="' + url + '" onclick="photoView(this.src)">';
          else if (thumb) thumb.textContent = 'X';
          if (--remaining <= 0) done++;
        });
      });
    })('phRow' + idx, arr);
  });
  html += '</div>';
  el.innerHTML = html;
}
