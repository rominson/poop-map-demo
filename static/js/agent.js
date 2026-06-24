/**
 * IDSI 国际狗屎调查局 - 特工等级系统
 */

const AgentSystem = (function () {
  'use strict';

  // ==================== 等级配置 ====================
  const RANKS = [
    { name: '见习特工', min: 0, max: 9, color: '#A89B8C', badge: '🥉', desc: '刚入行的菜鸟，还在学习分辨狗屎的品种' },
    { name: '正式特工', min: 10, max: 29, color: '#8B5E3C', badge: '🥈', desc: '已经可以独立执行任务，嗅觉灵敏' },
    { name: '高级特工', min: 30, max: 99, color: '#C9A84C', badge: '🥇', desc: '精英中的精英，狗屎界的福尔摩斯' },
    { name: '王牌特工', min: 100, max: Infinity, color: '#E74C3C', badge: '👑', desc: '传说级存在，狗屎地图的守护者' }
  ];

  // ==================== 成就配置 ====================
  const ACHIEVEMENTS = [
    { id: 'first_step', name: '首踩勇士', desc: '第一次踩别人的标记', icon: '👟', condition: (data) => data.stepCount >= 1 },
    { id: 'ten_steps', name: '踩屎达人', desc: '累计踩屎10次', icon: '🦶', condition: (data) => data.stepCount >= 10 },
    { id: 'fifty_steps', name: '踩屎狂魔', desc: '累计踩屎50次', icon: '🔥', condition: (data) => data.stepCount >= 50 },
    { id: 'hundred_steps', name: '踩屎传奇', desc: '累计踩屎100次', icon: '👑', condition: (data) => data.stepCount >= 100 }
  ];

  const STORAGE_KEY = 'idsi_agent_data';
  const ACHIEVEMENT_KEY = 'idsi_achievements';

  // ==================== 工具函数 ====================
  function _getStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function _setStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  // ==================== 核心方法 ====================

  function getAgentData() {
    const stored = _getStorage();
    if (stored) {
      // 确保新字段存在
      if (!stored.stepCount) stored.stepCount = 0;
      if (!stored.commentCount) stored.commentCount = 0;
      if (!stored.cities) stored.cities = [];
      if (!stored.hasNightMark) stored.hasNightMark = false;
      if (!stored.streakDays) stored.streakDays = 0;
      if (!stored.lastMarkDate) stored.lastMarkDate = null;
      _setStorage(stored);
      return stored;
    }

    // 初始化
    const initial = {
      joinedAt: Date.now(),
      totalMarks: 0,
      currentRank: 0,
      agentId: _generateAgentId(),
      stepCount: 0,
      commentCount: 0,
      cities: [],
      hasNightMark: false,
      streakDays: 0,
      lastMarkDate: null
    };
    _setStorage(initial);
    return initial;
  }

  function _generateAgentId() {
    const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return 'IDSI-' + num;
  }

  function getRankInfo(markCount) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (markCount >= RANKS[i].min) {
        return { ...RANKS[i], index: i, nextRank: RANKS[i + 1] || null };
      }
    }
    return { ...RANKS[0], index: 0, nextRank: RANKS[1] };
  }

  /**
   * 标记后检查是否升级和成就
   * @returns {Object|null} 升级/成就信息
   */
  function checkLevelUp() {
    const data = getAgentData();
    const myMarks = typeof DataStore !== 'undefined' ? DataStore.getMyMarks() : [];
    const marks = myMarks.length;
    const newRank = getRankInfo(marks);

    // 更新统计数据
    data.totalMarks = marks;
    data.cities = [...new Set(myMarks.map(m => m.city).filter(c => c && c !== '当前位置'))];

    // 检查是否有夜间标记
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      data.hasNightMark = true;
    }

    // 更新连续天数
    const today = new Date().toDateString();
    if (data.lastMarkDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (data.lastMarkDate === yesterday) {
        data.streakDays++;
      } else {
        data.streakDays = 1;
      }
      data.lastMarkDate = today;
    }

    _setStorage(data);

    // 检查成就
    const newAchievements = _checkAchievements(data);

    if (newRank.index > data.currentRank) {
      // 升级了！
      data.currentRank = newRank.index;
      _setStorage(data);

      return {
        isLevelUp: true,
        newRank: newRank,
        previousRank: RANKS[data.currentRank - 1] || RANKS[0],
        totalMarks: marks,
        agentId: data.agentId,
        achievements: newAchievements
      };
    }

    if (newAchievements.length > 0) {
      return {
        isLevelUp: false,
        achievements: newAchievements,
        totalMarks: marks,
        agentId: data.agentId
      };
    }

    return null;
  }

  /**
   * 检查成就
   */
  function _checkAchievements(data) {
    try {
      const unlocked = JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) || '[]');
      const newAchievements = [];

      ACHIEVEMENTS.forEach(ach => {
        if (!unlocked.includes(ach.id) && ach.condition(data)) {
          unlocked.push(ach.id);
          newAchievements.push(ach);
        }
      });

      localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(unlocked));
      return newAchievements;
    } catch (e) {
      return [];
    }
  }

  /**
   * 获取所有成就状态
   */
  function getAchievements() {
    try {
      const unlocked = JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) || '[]');
      return ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: unlocked.includes(ach.id)
      }));
    } catch (e) {
      return ACHIEVEMENTS.map(ach => ({ ...ach, unlocked: false }));
    }
  }

  /**
   * 记录踩屎
   */
  function recordStep() {
    const data = getAgentData();
    data.stepCount = (data.stepCount || 0) + 1;
    _setStorage(data);
    return _checkAchievements(data);
  }

  /**
   * 记录评论
   */
  function recordComment() {
    const data = getAgentData();
    data.commentCount = (data.commentCount || 0) + 1;
    _setStorage(data);
    return _checkAchievements(data);
  }

  function getAgentId() {
    return getAgentData().agentId;
  }

  function getCurrentRank() {
    const data = getAgentData();
    const marks = typeof DataStore !== 'undefined' ? DataStore.getMyMarks().length : data.totalMarks;
    return getRankInfo(marks);
  }

  // ==================== 导出 ====================
  return {
    RANKS: RANKS,
    ACHIEVEMENTS: ACHIEVEMENTS,
    getAgentData: getAgentData,
    getRankInfo: getRankInfo,
    checkLevelUp: checkLevelUp,
    getAgentId: getAgentId,
    getCurrentRank: getCurrentRank,
    getAchievements: getAchievements,
    recordStep: recordStep,
    recordComment: recordComment
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentSystem;
}
