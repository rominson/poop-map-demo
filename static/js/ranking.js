/**
 * 狗屎地图 - 排行榜模块
 * 全国城市排名展示
 */

const RankingModule = (function () {
  'use strict';

  const MAX_DISPLAY = 10;
  const RANKING_CONTAINER_ID = 'ranking-list';

  // ==================== 城市特色文案库 ====================
  const CITY_JOKES = {
    '北京': ['北京的狗屎都带着皇家气息，拉完得磕三个头', '北京的狗屎都在四环内堵车，堵了三小时才拉出来'],
    '上海': ['上海的狗屎都喝咖啡，拉出来都是拿铁味', '上海的狗屎都住豪宅，一坨屎的房价比你高'],
    '广州': ['广州的狗屎都吃过早茶，拉出来自带虾饺味', '广州的狗屎都很务实，不搞虚的'],
    '深圳': ['深圳的狗屎都在写代码，996拉出来的', '深圳的狗屎都是搞钱的，效率极高'],
    '成都': ['成都的狗屎都很安逸，拉完要打麻将', '成都的狗屎都是火锅味的，又辣又香'],
    '杭州': ['杭州的狗屎都在西湖边看风景，拉得很优雅', '杭州的狗屎都是阿里出来的，自带双十一气质'],
    '重庆': ['重庆的狗屎都是辣的，火锅吃多了', '重庆的狗屎都在洪崖洞，千与千寻风格'],
    '武汉': ['武汉的狗屎都吃过热干面，特别筋道', '武汉的狗屎都是过早的，边走边拉'],
    '西安': ['西安的狗屎都有千年历史，兵马俑级别的', '西安的狗屎都有文化底蕴，自带书法'],
    '南京': ['南京的狗屎都很有素质，排队拉', '南京的狗屎都在画舫上，很有诗意'],
    '长沙': ['长沙的狗屎都是辣妹子拉的，又辣又飒', '长沙的狗屎都喝过茶颜悦色'],
    '天津': ['天津的狗屎都会说相声，拉屎都能抖包袱', '天津的狗屎都很乐观，嘛事儿不往心里去'],
    '青岛': ['青岛的狗屎都喝啤酒，拉出来冒泡泡', '青岛的狗屎都是海鲜味的'],
    '苏州': ['苏州的狗屎都是园林风格，讲究布局', '苏州的狗屎都是外企的，双语拉屎'],
    '厦门': ['厦门的狗屎都是文艺范儿，自带小清新滤镜', '厦门的狗屎都看海景，拉得很惬意'],
    '郑州': ['郑州的狗屎都是烩面味的，特别有嚼劲', '郑州的狗屎都在排队，排队拉排队吃']
  };

  const DEFAULT_JOKES = [
    '该城市的狗屎默默无闻，但数量不容小觑',
    '这个城市的狗屎正在努力，争取下次进前十',
    '此城市狗屎数量稳定增长，经济学家表示看好',
    '该市的狗屎都很低调，属于实干型',
    '这个城市的狗屎正在内卷，数量逐月攀升'
  ];

  const RANK_JOKES = {
    1: (city) => `${city}蝉联本周狗屎产量冠军，建议申请非物质文化遗产`,
    2: (city) => `${city}紧随其后，狗主人们加油啊`,
    3: (city) => `${city}表现稳定，稳居三甲`,
    4: (city) => `${city}不甘示弱，有望冲击前三`,
    5: (city) => `${city}稳扎稳打，中游砥柱`,
    6: (city) => `${city}潜力股，下周可能逆袭`,
    7: (city) => `${city}需要更多狗狗的努力`,
    8: (city) => `${city}还在蓄力，别小看`,
    9: (city) => `${city}虽然排名靠后，但态度端正`,
    10: (city) => `${city}压线进前十，幸运儿`
  };

  function _getCityJoke(city) {
    const jokes = CITY_JOKES[city];
    if (jokes && jokes.length > 0) {
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    return DEFAULT_JOKES[Math.floor(Math.random() * DEFAULT_JOKES.length)];
  }

  function _getRankBadge(rank) {
    if (rank === 1) return '<span class="ranking-rank gold">🥇</span>';
    if (rank === 2) return '<span class="ranking-rank silver">🥈</span>';
    if (rank === 3) return '<span class="ranking-rank bronze">🥉</span>';
    return `<span class="ranking-rank normal">${rank}</span>`;
  }

  function _getCityAvatar(rank) {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '💩';
  }

  function _renderRankingItem(item, index) {
    const rank = index + 1;
    const city = item.city || '未知城市';
    const count = item.count || 0;
    const freshCount = item.freshCount || 0;
    const oldCount = item.oldCount || 0;

    let joke;
    if (RANK_JOKES[rank]) {
      joke = RANK_JOKES[rank](city);
    } else {
      joke = _getCityJoke(city);
    }

    let freshnessTag = '';
    if (freshCount > 0) {
      freshnessTag = `<span style="color: var(--color-success);">${freshCount}枚新鲜</span>`;
    }
    if (oldCount > 0) {
      freshnessTag += freshnessTag ? ' · ' : '';
      freshnessTag += `<span style="color: var(--color-text-muted);">${oldCount}枚陈年</span>`;
    }

    const rankBadge = _getRankBadge(rank);
    const itemClass = rank <= 3 ? 'ranking-item ranking-top' : 'ranking-item';
    const animationDelay = `${index * 0.05}s`;

    return `
      <div class="${itemClass}" style="animation-delay: ${animationDelay};" data-city="${city}">
        ${rankBadge}
        <div class="ranking-info">
          <div class="ranking-name">${city}</div>
          <div class="ranking-meta">${joke}</div>
          ${freshnessTag ? `<div class="ranking-meta">${freshnessTag}</div>` : ''}
        </div>
        <div class="ranking-count">
          <img src="static/assets/poop-marker.png" style="width:20px;height:20px;margin-right:4px;vertical-align:middle;">
          <div class="count">${count}</div>
          <div class="unit">枚</div>
        </div>
      </div>
    `;
  }

  function _renderEmptyState() {
    return `
      <div class="ranking-empty" style="text-align: center; padding: 60px 20px; color: var(--color-text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">🍃</div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">暂无数据</div>
        <div style="font-size: 14px;">还没有任何标记，快去地图页标记第一枚吧！</div>
      </div>
    `;
  }

  function init() {
    console.log('[RankingModule] 初始化完成');
  }

  function render() {
    const container = document.getElementById(RANKING_CONTAINER_ID);
    if (!container) return;

    let stats = [];
    if (typeof DataStore !== 'undefined' && DataStore.getCityStats) {
      stats = DataStore.getCityStats();
    }

    stats.sort((a, b) => (b.count || 0) - (a.count || 0));
    const topStats = stats.slice(0, MAX_DISPLAY);

    if (topStats.length === 0) {
      container.innerHTML = _renderEmptyState();
    } else {
      container.innerHTML = topStats.map((item, index) => _renderRankingItem(item, index)).join('');

      requestAnimationFrame(() => {
        container.querySelectorAll('.ranking-item').forEach((el, i) => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(12px)';
          el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }, i * 60);
        });
      });
    }

    console.log('[RankingModule] 排行榜渲染完成，共 ' + topStats.length + ' 个城市');
  }

  return {
    init: init,
    render: render
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RankingModule;
}
