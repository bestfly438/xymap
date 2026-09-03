// ============================================
// 新塬应急 v29 · SVG 图标库 icons.js
// icon(name, size) 返回内联 SVG（24×24、stroke 1.75、currentColor）
// 改造期间将页面 emoji 逐步替换为 <span data-ic="name"></span>
// ============================================
(function(){
  var PATHS = {
    'shield': 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9.5 12l1.8 1.8 3.2-3.6',
    'home': 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9z',
    'bar-chart': 'M5 20V10M12 20V4M19 20v-7',
    'map': 'M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14',
    'chart': 'M4 20h16M6 16v-5M10 16V8M14 16v-3M18 16V6',
    'radar': 'M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 12L19 5',
    'clipboard': 'M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1zM9 5h6M9 12h6M9 16h4',
    'clipboard-check': 'M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1zM9 5h6M9.5 13.5l2 2 3.5-4',
    'route': 'M6 20a3 3 0 0 1 0-6m0 6a3 3 0 0 0 0-6m0 0V8a4 4 0 0 1 4-4h4m0 0l-2-2m2 2l-2 2M18 4a3 3 0 0 1 0 6m0-6a3 3 0 0 0 0 6m0 0v6a4 4 0 0 1-4 4h-4m0 0l2 2m-2-2l2-2',
    'camera': 'M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'message-circle': 'M21 12a8 8 0 0 1-8 8H4l2-2a9 9 0 1 1 15-6zM8.5 11h7M8.5 14.5h4',
    'users': 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M16 11a4 4 0 1 0-4-4M21 20v-1.5a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    'book': 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
    'smartphone': 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
    'file-clock': 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9l-5-6zM14 3v6h6M12 13v3l2 1.5',
    'activity': 'M3 12h4l3-8 4 16 3-8h4',
    'droplet': 'M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10z',
    'alert-triangle': 'M12 4L2.5 20h19L12 4zM12 10v5M12 17.5v.5',
    'pencil': 'M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1zM13 6l3 3',
    'settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.5-2.3 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.3-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.3-1a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5z',
    'logout': 'M15 12H4M8 8l-4 4 4 4M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5',
    'phone': 'M6.6 3.5 9 6l1.6 1.6a1.5 1.5 0 0 1 0 2.1L9.2 11a12 12 0 0 0 3.8 3.8l1.3-1.4a1.5 1.5 0 0 1 2.1 0L18 15l2.5 2.4a1.5 1.5 0 0 1 0 2.2c-.5.5-1.2 1-2 1.2-2.6.7-6.4-.4-10.4-4.4S3.6 7.6 4.3 5c.2-.8.7-1.5 1.2-2a1.5 1.5 0 0 1 1.1-.4z',
    'sun': 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    'cloud': 'M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6-1.5A4.5 4.5 0 0 0 7 18z',
    'download': 'M12 4v11M8 11l4 4 4-4M5 20h14',
    'refresh': 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M4 4v5h5M20 20v-5h-5',
    'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
    'chevron-down': 'M6 9l6 6 6-6',
    'menu': 'M4 6h16M4 12h16M4 18h16',
    'search': 'M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM21 21l-4.4-4.4',
    'clock': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    'eye': 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'trash': 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
    'plus': 'M12 5v14M5 12h14',
    'x': 'M6 6l12 12M18 6L6 18',
    'bell': 'M12 4a5 5 0 0 1 5 5c0 3 1.5 4.5 2 5H5c.5-.5 2-2 2-5a5 5 0 0 1 5-5zM10 19a2 2 0 0 0 4 0'
,
    'layers': 'M12 3 3 8l9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
    'legend': 'M5 4h14M5 8h9M5 12h14M5 16h9M5 20h14',
    'location': 'M12 21s-6-4.6-6-10a6 6 0 1 1 12 0c0 5.4-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'info': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.5',
    'send': 'M4 11.5 20 4l-7 16-2.5-6.5L4 11.5zM4 11.5l13.5-3',
    'rain': 'M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6-1.5A4.5 4.5 0 0 0 7 18zM9 20v2M12 20v3M15 20v2',
    'moon': 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
    'wind': 'M3 8h9a3 3 0 1 0-3-3M3 12h13a3 3 0 1 1-3 3M3 16h6a2.5 2.5 0 1 1-2.5 2.5',
    'maximize': 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3',
    'edit': 'M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1zM13 6l3 3',
    'check': 'M5 12l5 5L20 7',
    'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12l2.5 2.5 4.5-5',
    'calendar': 'M4 6h16v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6zM4 10h16M8 3v4M16 3v4',
    'flag': 'M5 21V4M5 4c5-3 9 3 14 0v10c-5 3-9-3-14 0',
    'target': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    'snow': 'M12 3v18M5 7.5l14 9M19 7.5l-14 9',
    'alert-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5M12 16v.5',
    'up': 'M5 11l7-7 7 7M12 4v16',
    'down': 'M19 13l-7 7-7-7M12 20V4',
    'list': 'M8 6h13M8 12h13M8 18h13M3.5 6h.5M3.5 12h.5M3.5 18h.5',
    'back': 'M19 12H5M11 6l-6 6 6 6',
    'reply': 'M4 12c0-4 3-7 8-7 3.5 0 5.6 1.6 6.5 3.4M3 9.5 5 12l2.5-2.5M20 15c0 1.5-1 3.4-3.5 4.6-.4.2-.9-.1-.9-.6 0-.5.3-.9.7-1.1 1.2-.6 1.7-1.2 1.7-1.9',
    'filter': 'M4 5h16l-6 7v5l-4 2v-7L4 5z',
    'export': 'M12 4v11M8 11l4 4 4-4M5 20h14',
    'warning': 'M12 4 2.5 20h19L12 4zM12 10v5M12 17.5v.5',
    'route-arrow': 'M6 20a3 3 0 0 1 0-6m0 6a3 3 0 0 0 0-6m0 0V8a4 4 0 0 1 4-4h4m0 0l-2-2m2 2l-2 2'
  };
  function icon(name, size){
    var p = PATHS[name] || PATHS['x'];
    size = size || 20;
    // 修正：path 数据必须用 <path d> 包裹，否则 SVG 只渲染出不可见文本（图标不显示）
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="' + p + '"/></svg>';
  }
  // 自动渲染 [data-ic] 元素
  function render(){
    var els = document.querySelectorAll('[data-ic]');
    for (var i = 0; i < els.length; i++) els[i].innerHTML = icon(els[i].getAttribute('data-ic'), parseInt(els[i].getAttribute('data-ic-size') || '20', 10));
  }
  window.icon = icon;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
