/**
 * 狗屎地图 - 数据管理模块
 * 负责本地存储、Demo 数据、统计和定时清理
 */

const DataStore = (function () {
  'use strict';

  // ==================== 常量 ====================
  const STORAGE_KEY = 'poop_marks_v2';
  const LAST_CLEAR_KEY = 'poop_last_clear_v2';
  const CURRENT_USER = 'current_user';

  // ==================== Demo 数据（全国各城市） ====================
  const DEMO_MARKS = [
    // 北京 - 普通居民区
    { id: 'demo_001', lng: 116.4374, lat: 39.9342, city: '北京', district: '朝阳区', desc: '朝阳公园附近小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 30, joke: '北京的狗屎都带着皇家气息' },
    { id: 'demo_002', lng: 116.4851, lat: 39.9584, city: '北京', district: '朝阳区', desc: '望京SOHO附近小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 15, joke: '朝阳区的狗屎都是时尚圈的' },
    { id: 'demo_003', lng: 116.3269, lat: 39.9356, city: '北京', district: '西城区', desc: '马连道小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 2, joke: '金融街的狗屎都有年终奖' },
    { id: 'demo_004', lng: 116.2565, lat: 39.9483, city: '北京', district: '海淀区', desc: '五道口华清嘉园', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 24, joke: '海淀区的狗屎都是985毕业的' },
    { id: 'demo_005', lng: 116.3688, lat: 40.0568, city: '北京', district: '昌平区', desc: '回龙观小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 3, joke: '天通苑的狗屎密度和人口密度成正比' },
    // 上海 - 普通居民区
    { id: 'demo_006', lng: 121.5137, lat: 31.2404, city: '上海', district: '黄浦区', desc: '老西门小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 20, joke: '上海的狗屎都喝咖啡，拉出来都是拿铁味' },
    { id: 'demo_007', lng: 121.5296, lat: 31.2596, city: '上海', district: '静安区', desc: '大宁路小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 10, joke: '静安区的狗屎都住豪宅，一坨屎的房价比你高' },
    { id: 'demo_008', lng: 121.4636, lat: 31.2286, city: '上海', district: '徐汇区', desc: '田林新村', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 4, joke: '徐汇区的狗屎都在搞科研' },
    { id: 'demo_009', lng: 121.5747, lat: 31.2314, city: '上海', district: '浦东新区', desc: '世纪公园附近小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 5, joke: '浦东的狗屎都在搞金融，自带K线图' },
    // 广州 - 普通居民区
    { id: 'demo_010', lng: 113.2844, lat: 23.1391, city: '广州', district: '天河区', desc: '天河体育中心附近小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 8, joke: '广州的狗屎都吃过早茶，拉出来自带虾饺味' },
    { id: 'demo_011', lng: 113.3006, lat: 23.1355, city: '广州', district: '越秀区', desc: '淘金路小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 5, joke: '越秀区的狗屎都是老城区的，很有历史底蕴' },
    { id: 'demo_012', lng: 113.3435, lat: 23.1166, city: '广州', district: '海珠区', desc: '客村小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 12, joke: '海珠区的狗屎都在广州塔下打卡' },
    // 深圳 - 普通居民区
    { id: 'demo_013', lng: 114.0779, lat: 22.5531, city: '深圳', district: '南山区', desc: '蛇口小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 7, joke: '深圳的狗屎都在写代码，996拉出来的' },
    { id: 'demo_014', lng: 114.0845, lat: 22.5591, city: '深圳', district: '福田区', desc: '景田小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 6, joke: '福田区的狗屎都在搞钱，效率极高' },
    { id: 'demo_015', lng: 114.1099, lat: 22.5641, city: '深圳', district: '罗湖区', desc: '布心花园', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 48, joke: '罗湖区的狗屎都是老深圳了，见过大世面' },
    // 成都 - 普通居民区
    { id: 'demo_016', lng: 104.0865, lat: 30.5828, city: '成都', district: '锦江区', desc: '九眼桥附近小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 18, joke: '成都的狗屎都很安逸，拉完要打麻将' },
    { id: 'demo_017', lng: 104.0755, lat: 30.5730, city: '成都', district: '武侯区', desc: '红牌楼小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 7, joke: '武侯区的狗屎都在玉林路的尽头' },
    { id: 'demo_018', lng: 104.0915, lat: 30.6680, city: '成都', district: '青羊区', desc: '金沙小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 22, joke: '宽窄巷子的狗屎都是文艺青年' },
    // 杭州 - 普通居民区
    { id: 'demo_019', lng: 120.1751, lat: 30.2841, city: '杭州', district: '西湖区', desc: '文三路小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 25, joke: '杭州的狗屎都在西湖边看风景，拉得很优雅' },
    { id: 'demo_020', lng: 120.2300, lat: 30.2630, city: '杭州', district: '上城区', desc: '南星桥小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 8, joke: '上城区的狗屎都是阿里出来的，自带双十一气质' },
    // 重庆 - 普通居民区
    { id: 'demo_021', lng: 106.5716, lat: 29.5730, city: '重庆', district: '渝中区', desc: '大坪小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 16, joke: '重庆的狗屎都是辣的，火锅吃多了' },
    { id: 'demo_022', lng: 106.5506, lat: 29.5546, city: '重庆', district: '南岸区', desc: '南坪小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 3, joke: '洪崖洞的狗屎都是千与千寻风格的' },
    // 武汉 - 普通居民区
    { id: 'demo_023', lng: 114.3254, lat: 30.6031, city: '武汉', district: '武昌区', desc: '徐东小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 14, joke: '武汉的狗屎都吃过热干面，特别筋道' },
    { id: 'demo_024', lng: 114.3180, lat: 30.5944, city: '武汉', district: '江汉区', desc: '常青花园', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 9, joke: '江汉区的狗屎都是过早的，边走边拉' },
    // 西安 - 普通居民区
    { id: 'demo_025', lng: 108.9602, lat: 34.3516, city: '西安', district: '雁塔区', desc: '电子城小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 19, joke: '西安的狗屎都有千年历史，兵马俑级别的' },
    { id: 'demo_026', lng: 108.9662, lat: 34.2704, city: '西安', district: '碑林区', desc: '文艺路小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 10, joke: '碑林区的狗屎都有文化底蕴，自带书法' },
    // 南京 - 普通居民区
    { id: 'demo_027', lng: 118.8169, lat: 32.0703, city: '南京', district: '玄武区', desc: '锁金村小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 11, joke: '南京的狗屎都很有素质，排队拉' },
    { id: 'demo_028', lng: 118.8077, lat: 32.0516, city: '南京', district: '秦淮区', desc: '夫子庙附近小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 11, joke: '秦淮河的狗屎都在画舫上，很有诗意' },
    // 长沙 - 普通居民区
    { id: 'demo_029', lng: 112.9588, lat: 28.2382, city: '长沙', district: '天心区', desc: '侯家塘小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 13, joke: '长沙的狗屎都是辣妹子拉的，又辣又飒' },
    { id: 'demo_030', lng: 112.9972, lat: 28.2455, city: '长沙', district: '芙蓉区', desc: '马王堆附近小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 12, joke: '长沙的狗屎都喝过茶颜悦色' },
    // 天津 - 普通居民区
    { id: 'demo_031', lng: 117.2101, lat: 39.1356, city: '天津', district: '和平区', desc: '南市小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 17, joke: '天津的狗屎都会说相声，拉屎都能抖包袱' },
    { id: 'demo_032', lng: 117.2209, lat: 39.0942, city: '天津', district: '河西区', desc: '下瓦房小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 13, joke: '天津的狗屎都很乐观，嘛事儿不往心里去' },
    // 青岛 - 普通居民区
    { id: 'demo_033', lng: 120.4026, lat: 36.0771, city: '青岛', district: '市南区', desc: '浮山所小区', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 21, joke: '青岛的狗屎都喝啤酒，拉出来冒泡泡' },
    { id: 'demo_034', lng: 120.4163, lat: 36.0810, city: '青岛', district: '市北区', desc: '台东附近小区', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 14, joke: '青岛的狗屎都是海鲜味的' },
    // 苏州
    { id: 'demo_035', lng: 120.6195, lat: 31.2990, city: '苏州', district: '姑苏区', desc: '观前街', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 23, joke: '苏州的狗屎都是园林风格，讲究布局' },
    { id: 'demo_036', lng: 120.6314, lat: 31.3046, city: '苏州', district: '工业园区', desc: '金鸡湖', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 15, joke: '园区的狗屎都是外企的，双语拉屎' },
    // 厦门
    { id: 'demo_037', lng: 118.0894, lat: 24.4798, city: '厦门', district: '思明区', desc: '中山路', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 26, joke: '厦门的狗屎都是文艺范儿，自带小清新滤镜' },
    { id: 'demo_038', lng: 118.1002, lat: 24.4481, city: '厦门', district: '湖里区', desc: 'SM广场', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 16, joke: '厦门的狗屎都看海景，拉得很惬意' },
    // 郑州
    { id: 'demo_039', lng: 113.6254, lat: 34.7466, city: '郑州', district: '金水区', desc: '二七广场', freshness: 'fresh', timestamp: Date.now() - 1000 * 60 * 28, joke: '郑州的狗屎都是烩面味的，特别有嚼劲' },
    { id: 'demo_040', lng: 113.6534, lat: 34.7579, city: '郑州', district: '中原区', desc: '郑州大学', freshness: 'old', timestamp: Date.now() - 1000 * 60 * 60 * 17, joke: '郑州的狗屎都在排队，排队拉排队吃' }
  ];

  // ==================== 存储兼容性处理 ====================
  let memoryStore = null;
  let storageAvailable = false;

  try {
    const testKey = '__poop_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch (e) {
    storageAvailable = false;
    console.warn('[DataStore] localStorage 不可用，将使用内存存储');
  }

  function _getItem(key) {
    try {
      if (storageAvailable) return localStorage.getItem(key);
      return memoryStore ? memoryStore[key] || null : null;
    } catch (e) {
      return memoryStore ? memoryStore[key] || null : null;
    }
  }

  function _setItem(key, value) {
    try {
      if (storageAvailable) { localStorage.setItem(key, value); return true; }
      if (!memoryStore) memoryStore = {};
      memoryStore[key] = value;
      return true;
    } catch (e) {
      if (!memoryStore) memoryStore = {};
      memoryStore[key] = value;
      return true;
    }
  }

  function _removeItem(key) {
    try {
      if (storageAvailable) { localStorage.removeItem(key); return true; }
      if (memoryStore) delete memoryStore[key];
      return true;
    } catch (e) { return false; }
  }

  // ==================== 工具函数 ====================
  function _generateId() {
    return 'mark_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function _getCurrentUserId() {
    try {
      const user = _getItem(CURRENT_USER);
      if (user) return JSON.parse(user).id || 'anonymous';
    } catch (e) {}
    return 'anonymous';
  }

  function _getMondayTimestamp() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  }

  // ==================== 核心方法 ====================

  function getMarks() {
    try {
      const data = _getItem(STORAGE_KEY);
      if (!data) {
        const marksWithUser = DEMO_MARKS.map(m => ({ ...m, userId: 'demo_user' }));
        _setItem(STORAGE_KEY, JSON.stringify(marksWithUser));
        _setItem(LAST_CLEAR_KEY, String(Date.now()));
        return marksWithUser;
      }
      checkWeeklyClear();
      const marks = JSON.parse(data);
      if (!Array.isArray(marks)) {
        _setItem(STORAGE_KEY, JSON.stringify(DEMO_MARKS));
        return DEMO_MARKS;
      }
      return marks;
    } catch (e) {
      return DEMO_MARKS;
    }
  }

  function addMark(mark) {
    try {
      if (!mark || typeof mark !== 'object') return null;
      const newMark = {
        id: _generateId(),
        lng: parseFloat(mark.lng) || 0,
        lat: parseFloat(mark.lat) || 0,
        city: String(mark.city || mark.district || '未知城市'),
        district: String(mark.district || ''),
        desc: String(mark.desc || ''),
        freshness: ['fresh', 'old'].includes(mark.freshness) ? mark.freshness : 'old',
        timestamp: Date.now(),
        joke: String(mark.joke || '这坨屎没有留下名言'),
        userId: _getCurrentUserId()
      };
      const marks = getMarks();
      marks.push(newMark);
      _setItem(STORAGE_KEY, JSON.stringify(marks));
      return newMark;
    } catch (e) {
      return null;
    }
  }

  function getMyMarks() {
    try {
      const userId = _getCurrentUserId();
      return getMarks().filter(m => m.userId === userId);
    } catch (e) { return []; }
  }

  /**
   * 按城市统计标记数量（用于排行榜）
   * 将"当前位置"的标记根据坐标匹配到最近的 Demo 城市
   */
  function getCityStats() {
    try {
      const marks = getMarks();
      const stats = {};

      // 提取 Demo 数据中的城市中心点（用于坐标匹配）
      const cityCenters = {};
      DEMO_MARKS.forEach(dm => {
        if (!cityCenters[dm.city]) {
          cityCenters[dm.city] = { lng: dm.lng, lat: dm.lat };
        }
      });

      marks.forEach(m => {
        let city = m.city || m.district || '未知城市';

        // 如果是"当前位置"，根据坐标匹配最近的 Demo 城市
        if (city === '当前位置' && m.lng && m.lat) {
          let minDist = Infinity;
          let nearestCity = '未知城市';
          for (const [cityName, center] of Object.entries(cityCenters)) {
            const dist = Math.sqrt(
              Math.pow(m.lng - center.lng, 2) + Math.pow(m.lat - center.lat, 2)
            );
            if (dist < minDist) {
              minDist = dist;
              nearestCity = cityName;
            }
          }
          // 距离阈值：0.5度约50km，超过则认为不在已知城市
          city = minDist < 0.5 ? nearestCity : '未知城市';
        }

        if (!stats[city]) {
          stats[city] = { city: city, count: 0, freshCount: 0, oldCount: 0 };
        }
        stats[city].count++;
        if (m.freshness === 'fresh') stats[city].freshCount++;
        if (m.freshness === 'old') stats[city].oldCount++;
      });

      return Object.values(stats).sort((a, b) => b.count - a.count);
    } catch (e) {
      return [];
    }
  }

  function checkWeeklyClear() {
    try {
      const now = Date.now();
      const thisMonday = _getMondayTimestamp();
      const lastClear = parseInt(_getItem(LAST_CLEAR_KEY) || '0', 10);
      if (!lastClear || lastClear < thisMonday) {
        const marksWithUser = DEMO_MARKS.map(m => ({ ...m, userId: 'demo_user' }));
        _setItem(STORAGE_KEY, JSON.stringify(marksWithUser));
        _setItem(LAST_CLEAR_KEY, String(now));
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  function clearAll() {
    try {
      _removeItem(STORAGE_KEY);
      _removeItem(LAST_CLEAR_KEY);
      return true;
    } catch (e) { return false; }
  }

  // ==================== 导出 ====================
  return {
    STORAGE_KEY: STORAGE_KEY,
    getMarks: getMarks,
    addMark: addMark,
    getMyMarks: getMyMarks,
    getCityStats: getCityStats,
    getDistrictStats: getCityStats,
    checkWeeklyClear: checkWeeklyClear,
    clearAll: clearAll
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStore;
}
