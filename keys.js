/**
 * 密钥管理系统
 * 格式: { key: '密钥', label: '标签', enabled: true, admin: false }
 * admin: true 表示管理员密钥，可编辑网站内容
 */
var ACCESS_KEYS = [
  { key: 'XYC-2024-ADMIN', label: '管理员密钥', enabled: true, admin: true },
  { key: 'XYC-2024-F9AB686B', label: '密钥1', enabled: true, admin: false },
  { key: 'XYC-2024-B71234AF', label: '密钥2', enabled: true, admin: false },
  { key: 'XYC-2024-9D276708', label: '密钥3', enabled: true, admin: false },
  { key: 'XYC-2024-C3F423B5', label: '密钥4', enabled: true, admin: false },
  { key: 'XYC-2024-80AC2E6B', label: '密钥5', enabled: true, admin: false },
  { key: 'XYC-2024-3240E9CB', label: '密钥6', enabled: true, admin: false },
  { key: 'XYC-2024-E70B15DF', label: '密钥7', enabled: true, admin: false },
  { key: 'XYC-2024-22DB1F91', label: '密钥8', enabled: true, admin: false },
  { key: 'XYC-2024-032F1BE8', label: '密钥9', enabled: true, admin: false },
  { key: 'XYC-2024-8E34AD1B', label: '密钥10', enabled: true, admin: false }
];

function validateKey(inputKey) {
  var key = inputKey.trim().toUpperCase();
  for (var i = 0; i < ACCESS_KEYS.length; i++) {
    if (ACCESS_KEYS[i].enabled && ACCESS_KEYS[i].key === key) {
      return ACCESS_KEYS[i];
    }
  }
  return null;
}

function isAdminKey(inputKey) {
  var key = inputKey.trim().toUpperCase();
  for (var i = 0; i < ACCESS_KEYS.length; i++) {
    if (ACCESS_KEYS[i].enabled && ACCESS_KEYS[i].key === key && ACCESS_KEYS[i].admin) {
      return true;
    }
  }
  return false;
}