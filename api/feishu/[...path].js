// 飞书 API CORS 代理（Vercel Serverless Function）
// 请求路径：https://<项目名>.vercel.app/api/feishu/open-apis/xxxx
// 作用：解决浏览器跨域问题，把请求转发到飞书官方接口并加上 CORS 头
module.exports = async function handler(req, res) {
  // 浏览器跨域预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  // 去掉 /api/feishu 前缀，得到 /open-apis/...，转发到飞书官方地址
  var target = 'https://open.feishu.cn' + (req.url || '').replace(/^\/api\/feishu/, '');

  // 只透传必要的请求头
  var headers = {};
  ['authorization', 'content-type', 'accept', 'user-agent'].forEach(function (k) {
    if (req.headers[k]) headers[k] = req.headers[k];
  });

  var body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = req.body ? JSON.stringify(req.body) : undefined;
  }

  try {
    var resp = await fetch(target, {
      method: req.method,
      headers: headers,
      body: body
    });
    var text = await resp.text();
    res.status(resp.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', resp.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(text);
  } catch (e) {
    res.status(502);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.json({ code: -1, msg: '代理转发失败: ' + e.message });
  }
};
