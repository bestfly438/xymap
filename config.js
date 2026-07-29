/**
 * 东塬村应急预案 - 数据配置文件
 * ==========================================
 * 修改此文件即可更新地图上的所有信息
 * 坐标获取方式：在高德地图上右键点击目标位置，选择"这是哪里"即可看到经纬度
 * 注意：经度(lng)在前，纬度(lat)在后
 */

// 村庄基本信息
var VILLAGE_INFO = {
  name: '东塬村',
  town: '新塬镇',
  county: '会宁县',
  city: '白银市',
  province: '甘肃省',
  center: [105.25, 35.72],        // 地图中心点 [经度, 纬度]
  zoom: 15,                        // 地图缩放级别 (越大越近)
  description: '东塬村地处黄土高原丘陵沟壑区，地形复杂，部分区域存在山洪、泥石流、滑坡等地质灾害隐患。'
};

// 村庄范围（多边形边界）
// 在高德地图上按顺序点击村庄边界关键点获取坐标
var VILLAGE_BOUNDARY = [
  [105.245, 35.725],
  [105.258, 35.727],
  [105.260, 35.722],
  [105.257, 35.716],
  [105.250, 35.714],
  [105.243, 35.716],
  [105.240, 35.720]
];

// 隐患点列表
// type: flood(山洪) | mudslide(泥石流) | landslide(滑坡) | collapse(崩塌)
// riskLevel: high(高) | medium(中) | low(低)
var HAZARD_POINTS = [
  {
    id: 1,
    name: '北坡沟口',
    type: 'flood',
    typeName: '山洪隐患',
    riskLevel: 'high',
    position: [105.252, 35.726],
    description: '北坡沟口地势低洼，雨季山洪汇流速度快，威胁下方5户村民。每年7-9月为主要风险期。',
    affectedHouseholds: 5,
    affectedPeople: 23,
    monitoringPerson: '张建国',
    monitoringPhone: '138****6789',
    earlyWarningSigns: '上游出现持续强降雨、沟水变浑浊、水位快速上涨',
    images: []
  },
  {
    id: 2,
    name: '南沟泥石流沟',
    type: 'mudslide',
    typeName: '泥石流隐患',
    riskLevel: 'high',
    position: [105.255, 35.718],
    description: '南沟上游植被稀疏，土质松散，暴雨天气易引发泥石流。堆积区威胁下方道路和3户村民。',
    affectedHouseholds: 3,
    affectedPeople: 14,
    monitoringPerson: '李守山',
    monitoringPhone: '139****5678',
    earlyWarningSigns: '沟内传出异常声响、水流突然变小或断流、沟谷上游有烟雾或尘土',
    images: []
  },
  {
    id: 3,
    name: '西崖滑坡点',
    type: 'landslide',
    typeName: '滑坡隐患',
    riskLevel: 'medium',
    position: [105.244, 35.721],
    description: '西崖为黄土陡坡，坡高约15米，坡脚有村民房屋。雨季土壤饱和后存在滑坡风险。',
    affectedHouseholds: 2,
    affectedPeople: 8,
    monitoringPerson: '王安全',
    monitoringPhone: '137****4567',
    earlyWarningSigns: '坡面出现裂缝、坡脚渗水变浑浊、小规模掉块',
    images: []
  },
  {
    id: 4,
    name: '东沟低洼区',
    type: 'flood',
    typeName: '山洪隐患',
    riskLevel: 'medium',
    position: [105.259, 35.723],
    description: '东沟地势低洼，暴雨时排水不畅，易形成内涝积水。影响周边农田和2户村民。',
    affectedHouseholds: 2,
    affectedPeople: 9,
    monitoringPerson: '刘志强',
    monitoringPhone: '136****3456',
    earlyWarningSigns: '连续暴雨、排水沟堵塞、水位持续上涨',
    images: []
  },
  {
    id: 5,
    name: '老庄基崩塌点',
    type: 'collapse',
    typeName: '崩塌隐患',
    riskLevel: 'low',
    position: [105.248, 35.715],
    description: '老庄基废弃窑洞区域，黄土崖壁风化严重，存在崩塌风险。目前已设置警示标志，建议汛期加强巡查。',
    affectedHouseholds: 0,
    affectedPeople: 0,
    monitoringPerson: '陈永刚',
    monitoringPhone: '135****2345',
    earlyWarningSigns: '崖壁出现新裂缝、有小石块掉落',
    images: []
  }
];

// 撤离路线
// 每条路线由多个坐标点组成
var EVACUATION_ROUTES = [
  {
    id: 1,
    name: '北坡→村委会安置点',
    path: [
      [105.252, 35.726],
      [105.251, 35.724],
      [105.249, 35.722],
      [105.247, 35.720]
    ],
    description: '从北坡沟口沿村道向南，经村中心到达村委会。全程约800米，步行约10分钟。',
    forHazardIds: [1]
  },
  {
    id: 2,
    name: '南沟→小学安置点',
    path: [
      [105.255, 35.718],
      [105.254, 35.719],
      [105.252, 35.720],
      [105.250, 35.718]
    ],
    description: '从南沟向西沿主路行进，到达村小学。全程约600米，步行约8分钟。',
    forHazardIds: [2]
  },
  {
    id: 3,
    name: '西崖→村委会安置点',
    path: [
      [105.244, 35.721],
      [105.246, 35.720],
      [105.247, 35.720]
    ],
    description: '从西崖向东沿主路到达村委会。全程约400米，步行约5分钟。',
    forHazardIds: [3]
  },
  {
    id: 4,
    name: '东沟→村委会安置点',
    path: [
      [105.259, 35.723],
      [105.256, 35.722],
      [105.252, 35.721],
      [105.249, 35.720],
      [105.247, 35.720]
    ],
    description: '从东沟向西经村道到达村委会。全程约1.2公里，步行约15分钟。',
    forHazardIds: [4]
  }
];

// 安置点（撤离目的地）
var EVACUATION_SITES = [
  {
    id: 1,
    name: '村委会安置点',
    position: [105.247, 35.720],
    address: '东塬村村委会大院',
    capacity: 100,
    facilities: '室内大厅、卫生间、应急照明、基本医疗用品',
    contactPerson: '赵支书',
    contactPhone: '133****7890',
    description: '村委会为村中心位置，地势较高，建有砖混结构办公楼，可容纳约100人临时安置。'
  },
  {
    id: 2,
    name: '村小学安置点',
    position: [105.250, 35.718],
    address: '东塬村小学教学楼',
    capacity: 80,
    facilities: '教室、操场、卫生间、食堂',
    contactPerson: '钱校长',
    contactPhone: '132****6789',
    description: '村小学教学楼为框架结构，地势平坦，操场可用于临时帐篷搭建。'
  }
];

// 应急联系人
var EMERGENCY_CONTACTS = [
  {
    role: '村支书/总指挥',
    name: '胡耀强',
    phone: '17789425610',
    backupPhone: ''
  },
  {
    role: '医疗保障',
    name: '陈复平（村卫生室）',
    phone: '18809432911',
    backupPhone: ''
  }
];

// 上级应急部门联系方式
var AUTHORITY_CONTACTS = [
  {
    department: '新塬镇人民政府',
    phone: '0943-3514001',
    duty: '应急指挥协调'
  },
  {
    department: '会宁县应急管理局',
    phone: '0943-3226525',
    duty: '县级应急调度'
  },
  {
    department: '会宁县自然资源局',
    phone: '0943-3221790',
    duty: '地质灾害防治'
  },
  {
    department: '会宁县消防救援大队',
    phone: '119',
    duty: '消防救援'
  },
  {
    department: '急救中心',
    phone: '120',
    duty: '医疗急救'
  },
  {
    department: '报警电话',
    phone: '110',
    duty: '治安报警'
  }
];

// 应急物资储备点
var SUPPLY_POINTS = [
  {
    name: '村委会物资库',
    position: [105.247, 35.720],
    items: '铁锹20把、编织袋200个、手电筒10个、雨衣20套、急救箱2个、扩音器2个、铜锣2面、绳索200米'
  },
  {
    name: '小学物资库',
    position: [105.250, 35.718],
    items: '铁锹10把、编织袋100个、手电筒5个、雨衣10套、急救箱1个、矿泉水20箱、方便面10箱'
  }
];