/**
 * 狗屎地图 - 主应用
 * 全屏地图 + 悬浮按钮 + IDSI 特工系统
 */

const App = {
  activeModal: null,

  init() {
    this.initPlaceholderModules();
    this.loadSavedGender();
    this.bindEvents();
    console.log('[App] 初始化完成');
  },

  /**
   * 播放标记成功音效（噗~）
   */
  _playMarkSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // 主音调：模拟"噗"的弹性质感
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);
      oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);

      // 噪声层：模拟湿润感
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.6;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // 静默失败，不影响功能
    }
  },

  loadSavedGender() {
    const gender = this._getAgentGender();
    const btn = document.getElementById('fab-agent');
    if (btn) {
      const img = btn.querySelector('img');
      if (img) {
        img.src = gender === 'female' ? 'static/assets/agent-female.png' : 'static/assets/agent-btn.png';
      }
    }
  },

  bindEvents() {
    // 标记按钮 - 直接在当前位置标记
    const fabMark = document.getElementById('fab-mark');
    if (fabMark) {
      fabMark.addEventListener('click', () => this.quickMark());
    }

    // 榜单按钮 - 打开排行榜弹窗
    const fabRanking = document.getElementById('fab-ranking');
    if (fabRanking) {
      fabRanking.addEventListener('click', () => {
        if (typeof RankingModule !== 'undefined') {
          RankingModule.render();
        }
        this.openModal('modal-ranking');
      });
    }

    // 特工按钮 - 短按打开档案，长按切换性别
    const fabAgent = document.getElementById('fab-agent');
    if (fabAgent) {
      this._initAgentButton(fabAgent);
    }

    // 弹窗关闭事件
    document.querySelectorAll('.modal').forEach(modal => {
      const overlay = modal.querySelector('.modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => this.closeModal(modal.id));
      }
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal(modal.id));
      }
      const closeActionBtn = modal.querySelector('.modal-close-btn');
      if (closeActionBtn) {
        closeActionBtn.addEventListener('click', () => this.closeModal(modal.id));
      }
    });

    // ESC 关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal(this.activeModal);
      }
    });

    // 升级卡片点击关闭
    const levelUpCard = document.getElementById('level-up-card');
    if (levelUpCard) {
      levelUpCard.addEventListener('click', () => {
        levelUpCard.classList.remove('show');
      });
    }
  },

  initPlaceholderModules() {
    if (typeof DataStore === 'undefined') {
      window.DataStore = {
        marks: [],
        addMark(mark) { this.marks.push(mark); },
        getMarks() { return this.marks; }
      };
    }
    if (typeof MapModule === 'undefined') {
      window.MapModule = {
        init() {},
        addMarkToMap() {},
        getCurrentPosition() {
          return Promise.resolve({ lng: 116.397428, lat: 39.90923 });
        }
      };
    }
    if (typeof RankingModule === 'undefined') {
      window.RankingModule = { init() {}, render() {} };
    }
    if (typeof AgentSystem === 'undefined') {
      window.AgentSystem = {
        RANKS: [
          { name: '见习特工', min: 0, max: 9, color: '#A89B8C', badge: '🥉', desc: '刚入行的菜鸟' },
          { name: '正式特工', min: 10, max: 29, color: '#8B5E3C', badge: '🥈', desc: '可以独立执行任务' },
          { name: '高级特工', min: 30, max: 99, color: '#C9A84C', badge: '🥇', desc: '精英中的精英' },
          { name: '王牌特工', min: 100, max: Infinity, color: '#E74C3C', badge: '👑', desc: '传说级存在' }
        ],
        getAgentData() { return { agentId: 'IDSI-XXXX-XXXX', currentRank: 0, totalMarks: 0 }; },
        getRankInfo(count) { return this.RANKS[0]; },
        checkLevelUp() { return null; },
        getCurrentRank() { return this.RANKS[0]; }
      };
    }
  },

  /**
   * 检查是否在敏感区域
   * 使用简单的矩形区域检测，覆盖天安门、中南海等敏感区域
   */
  _isRestrictedArea(position) {
    // 敏感区域列表：每个区域定义为 [西南角lng, 西南角lat, 东北角lng, 东北角lat]
    const restrictedAreas = [
      // 天安门广场区域（扩大范围）
      [116.385, 39.898, 116.400, 39.912],
      // 中南海区域（扩大范围）
      [116.370, 39.900, 116.390, 39.920],
      // 故宫区域（扩大范围）
      [116.380, 39.905, 116.410, 39.920],
      // 人民大会堂（扩大范围）
      [116.385, 39.898, 116.400, 39.908],
      // 毛主席纪念堂（扩大范围）
      [116.385, 39.895, 116.400, 39.902],
      // 新华门附近（扩大范围）
      [116.375, 39.900, 116.390, 39.912],
      // 北京市政府
      [116.430, 39.880, 116.450, 39.900],
    ];

    const lng = position.lng;
    const lat = position.lat;

    return restrictedAreas.some(area => {
      const [swLng, swLat, neLng, neLat] = area;
      return lng >= swLng && lng <= neLng && lat >= swLat && lat <= neLat;
    });
  },

  /**
   * 检查100米范围内是否已标记过
   * 100米 ≈ 0.001度（纬度），经度需要根据纬度修正
   */
  _isNearbyMarked(position) {
    if (typeof DataStore === 'undefined') return false;
    const marks = DataStore.getMarks();
    // 只检查用户自己的标记（非 demo_ 开头的 id）
    const userMarks = marks.filter(m => !m.id.startsWith('demo_'));

    const threshold = 0.001; // 约100米

    return userMarks.some(m => {
      const latDiff = Math.abs(m.lat - position.lat);
      const lngDiff = Math.abs(m.lng - position.lng);
      // 经度修正：乘以 cos(纬度)
      const lngDiffCorrected = lngDiff * Math.cos(position.lat * Math.PI / 180);
      return latDiff < threshold && lngDiffCorrected < threshold;
    });
  },

  /**
   * 快速标记 - 在当前位置直接放置一个💩标记
   */
  async quickMark() {
    let position;
    try {
      position = await MapModule.getCurrentPosition();
    } catch (err) {
      position = { lng: 116.397428, lat: 39.90923 };
    }

    // 检查是否在敏感区域
    if (this._isRestrictedArea(position)) {
      this.showToast('⚠️ 该区域暂不支持标记');
      return;
    }

    // 检查100米范围内是否已标记过
    if (this._isNearbyMarked(position)) {
      this.showToast('⚠️ 当前位置附近你已经标记过了');
      return;
    }

    // 通过逆地理编码获取真实城市名
    let cityInfo = { city: '当前位置', district: '当前位置' };
    if (typeof MapModule !== 'undefined' && MapModule.getCityByPosition) {
      try {
        cityInfo = await MapModule.getCityByPosition(position.lng, position.lat);
      } catch (e) {
        console.warn('[App] 逆地理编码失败:', e);
      }
    }

    // 新标记默认是新鲜的
    const freshness = 'fresh';

    // 随机幽默文案
    const jokes = [
      '又踩到了！',
      '小心脚下...',
      '铲屎官在哪里？',
      '这坨有点大',
      '新鲜出炉',
      '已报警（不是）',
      '建议绕行',
      '环卫工人辛苦了'
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];

    const mark = {
      id: Date.now().toString(),
      lng: position.lng,
      lat: position.lat,
      city: cityInfo.city,
      district: cityInfo.district,
      desc: joke,
      freshness: freshness,
      timestamp: Date.now(),
      joke: joke
    };

    // 保存并添加到地图
    if (typeof DataStore !== 'undefined') {
      DataStore.addMark(mark);
    }
    if (typeof MapModule !== 'undefined') {
      MapModule.addMarkToMap(mark, true);
    }

    // 播放标记音效
    this._playMarkSound();

    // 检查是否升级/成就（等标记掉落动画结束后再显示，动画约500ms）
    setTimeout(() => {
      if (typeof AgentSystem !== 'undefined') {
        const levelUp = AgentSystem.checkLevelUp();
        if (levelUp && levelUp.isLevelUp) {
          this.showLevelUpCard(levelUp);
          // 显示新成就
          if (levelUp.achievements && levelUp.achievements.length > 0) {
            setTimeout(() => this.showAchievementCard(levelUp.achievements[0]), 4000);
          }
        } else if (levelUp && levelUp.achievements && levelUp.achievements.length > 0) {
          this.showAchievementCard(levelUp.achievements[0]);
        } else {
          this.showToast('💩 标记成功！');
        }
      } else {
        this.showToast('💩 标记成功！');
      }
    }, 600);

    console.log('[App] 快速标记:', mark);
  },

  /**
   * 显示升级卡片
   */
  showLevelUpCard(levelUp) {
    const card = document.getElementById('level-up-card');
    const badge = document.getElementById('level-up-badge');
    const rank = document.getElementById('level-up-rank');
    const stats = document.getElementById('level-up-stats');

    if (!card) return;

    if (badge) badge.textContent = levelUp.newRank.badge;
    if (rank) {
      rank.textContent = levelUp.newRank.name;
      rank.style.color = levelUp.newRank.color;
    }
    if (stats) {
      const nextRank = levelUp.newRank.nextRank;
      let nextText = '';
      if (nextRank) {
        nextText = `再标记 ${nextRank.min - levelUp.totalMarks} 枚升级为 ${nextRank.name}`;
      } else {
        nextText = '已达到最高等级！';
      }
      stats.textContent = `累计标记 ${levelUp.totalMarks} 枚 · ${nextText}`;
    }

    card.classList.add('show');

    // 3秒后自动关闭
    setTimeout(() => {
      card.classList.remove('show');
    }, 3500);
  },

  /**
   * 显示成就卡片
   */
  showAchievementCard(achievement) {
    const card = document.getElementById('level-up-card');
    const badge = document.getElementById('level-up-badge');
    const rank = document.getElementById('level-up-rank');
    const stats = document.getElementById('level-up-stats');

    if (!card) return;

    if (badge) badge.textContent = achievement.icon;
    if (rank) {
      rank.textContent = achievement.name;
      rank.style.color = '#C9A84C';
    }
    if (stats) {
      stats.textContent = `🏆 解锁成就：${achievement.desc}`;
    }

    card.classList.add('show');

    // 3秒后自动关闭
    setTimeout(() => {
      card.classList.remove('show');
    }, 3500);
  },

  /**
   * 显示狗屎周报
   */
  showWeeklyReport() {
    const modal = document.getElementById('weekly-report-modal');
    const body = document.getElementById('weekly-report-body');
    if (!modal || !body) return;

    const myMarks = typeof DataStore !== 'undefined' ? DataStore.getMyMarks() : [];
    const totalMarks = myMarks.length;
    const cities = [...new Set(myMarks.map(m => m.city).filter(c => c && c !== '当前位置'))];
    const freshCount = myMarks.filter(m => m.freshness === 'fresh').length;
    const oldCount = myMarks.filter(m => m.freshness === 'old').length;

    // 国际狗屎新闻（虚拟）
    const internationalNews = [
      { city: '纽约', count: 2847, headline: '曼哈顿街头狗屎密度创新高，市民呼吁加强遛狗监管' },
      { city: '伦敦', count: 1923, headline: '海德公园成为狗屎重灾区，皇家园林局紧急应对' },
      { city: '东京', count: 1567, headline: '涩谷十字路口惊现巨型狗屎，引发社交媒体热议' },
      { city: '巴黎', count: 2104, headline: '塞纳河畔狗屎艺术装置引争议，市政府下令拆除' },
      { city: '悉尼', count: 987, headline: '邦迪海滩狗屎事件频发，冲浪者协会提出抗议' }
    ];
    const randomNews = internationalNews[Math.floor(Math.random() * internationalNews.length)];

    // 幽默总结文案
    const summaries = [
      '本周你共标记了 {count} 枚狗屎，相当于拯救了 {count} 双鞋！',
      '你的踩屎雷达本周探测到 {count} 枚目标，准确率 100%！',
      '如果每枚狗屎值 1 块钱，你本周创造了 {count} 元的社会价值！',
      '本周你标记的狗屎可以绕地球 {rounds} 圈（夸张了，但精神可嘉）！'
    ];
    const summary = summaries[Math.floor(Math.random() * summaries.length)]
      .replace('{count}', totalMarks)
      .replace('{rounds}', (totalMarks * 0.01).toFixed(2));

    body.innerHTML = `
      <div class="weekly-report-section">
        <h3>📊 本周战绩</h3>
        <div class="weekly-report-stat">
          <span class="number">${totalMarks}</span>
          <span class="label">枚标记</span>
        </div>
        <p>${summary}</p>
      </div>

      <div class="weekly-report-section">
        <h3>🗺️ 城市足迹</h3>
        <p>你已经在 <strong>${cities.length}</strong> 个城市留下了踩屎印记：${cities.join('、') || '暂无数据'}</p>
        <div style="margin-top: 8px; display: flex; gap: 16px;">
          <span style="font-size: 12px; color: #4CAF50;">🟢 新鲜 ${freshCount} 枚</span>
          <span style="font-size: 12px; color: #9E9E9E;">⚫ 陈年 ${oldCount} 枚</span>
        </div>
      </div>

      <div class="weekly-report-section">
        <h3>🌍 国际狗屎快讯</h3>
        <p><strong>${randomNews.city}</strong> 本周报告 ${randomNews.count} 枚狗屎</p>
        <div class="weekly-report-quote">
          "${randomNews.headline}"
        </div>
      </div>

      <div class="weekly-report-section">
        <h3>💡 下周展望</h3>
        <p>继续加油！目标：标记 10 枚以上，解锁"周常特工"成就。记住：每一枚被标记的狗屎，都是对世界的一份贡献！</p>
      </div>
    `;

    modal.classList.add('show');
  },

  /**
   * 关闭狗屎周报
   */
  closeWeeklyReport() {
    const modal = document.getElementById('weekly-report-modal');
    if (modal) modal.classList.remove('show');
  },

  /**
   * 打开特工档案弹窗
   */
  openAgentModal() {
    const profile = document.getElementById('agent-profile');
    const marksList = document.getElementById('agent-marks');

    if (!profile || !marksList) return;

    const agentData = AgentSystem.getAgentData();
    const rankInfo = AgentSystem.getCurrentRank();
    const myMarks = DataStore.getMyMarks();

    // 渲染特工档案
    const nextRank = rankInfo.nextRank;
    const progress = nextRank ? Math.min(100, (myMarks.length / nextRank.min) * 100) : 100;

    // 设置头像
    const avatarImg = document.getElementById('agent-avatar-img');
    if (avatarImg) {
      const gender = this._getAgentGender();
      avatarImg.src = gender === 'female' ? 'static/assets/agent-female.png' : 'static/assets/agent-btn.png';
    }

    profile.innerHTML = `
      <div class="agent-rank-id-row">
        <div class="agent-rank-text" style="color: ${rankInfo.color}">${rankInfo.name}</div>
        <div class="agent-id-text">特工编号：${agentData.agentId}</div>
        <img class="agent-stamp-bottom" src="static/assets/stamp.png" alt="绝密印章">
      </div>
      <div class="agent-info-list">
        <div class="agent-info-row">
          <span class="agent-info-label">行动方式：</span>
          <span class="agent-info-value">上传定位标记狗屎</span>
        </div>
        <div class="agent-info-row">
          <span class="agent-info-label">目标：</span>
          <span class="agent-info-value">改善人类居住环境</span>
        </div>
      </div>
      <div class="agent-progress">
        <div class="agent-progress-bar" style="width: ${progress}%; background: linear-gradient(90deg, #ffd1dc, #b0e0e6)"></div>
      </div>
      <div class="agent-progress-text">
        已标记 ${myMarks.length} 枚
        ${nextRank ? '· 距离' + nextRank.name + '还需 ' + (nextRank.min - myMarks.length) + ' 枚' : '· 已达最高等级'}
      </div>
      <div class="agent-achievements-section">
        <div class="agent-achievements-title">🏅 成就勋章</div>
        <div class="agent-achievements-grid">
          ${AgentSystem.getAchievements().map(ach => `
            <div class="agent-achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}">
              <div class="agent-achievement-icon">${ach.unlocked ? ach.icon : '🔒'}</div>
              <div class="agent-achievement-name">${ach.name}</div>
              <div class="agent-achievement-desc">${ach.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 不再显示标记记录列表
    marksList.innerHTML = '';

    this.openModal('modal-agent');
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    this.activeModal = modalId;
    document.body.style.overflow = 'hidden';
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    this.activeModal = null;
    document.body.style.overflow = '';
  },

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // ==================== 特工按钮长按切换性别 ====================

  _initAgentButton(btn) {
    let pressTimer = null;
    let isLongPress = false;
    const LONG_PRESS_DURATION = 600; // 长按阈值 600ms

    const startPress = (e) => {
      if (e.type === 'touchstart') e.preventDefault();
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        this._showGenderMenu(btn);
      }, LONG_PRESS_DURATION);
    };

    const endPress = (e) => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (isLongPress) {
        // 长按已触发菜单，阻止事件传播防止菜单被关闭
        e.stopPropagation();
        e.preventDefault();
      } else {
        // 短按 - 打开档案
        this.openAgentModal();
      }
    };

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    // 鼠标事件
    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', endPress);
    btn.addEventListener('mouseleave', cancelPress);

    // 触摸事件
    btn.addEventListener('touchstart', startPress, { passive: false });
    btn.addEventListener('touchend', endPress);
    btn.addEventListener('touchcancel', cancelPress);

    // 阻止右键菜单
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  _showGenderMenu(btn) {
    // 如果已有菜单，先移除并清理旧监听器
    const existing = document.querySelector('.gender-menu');
    if (existing) {
      existing.remove();
      if (this._genderMenuCloseHandler) {
        document.removeEventListener('click', this._genderMenuCloseHandler);
        document.removeEventListener('touchstart', this._genderMenuCloseHandler);
        this._genderMenuCloseHandler = null;
      }
    }

    const currentGender = this._getAgentGender();

    const menu = document.createElement('div');
    menu.className = 'gender-menu';
    menu.innerHTML = `
      <div class="gender-menu-item ${currentGender === 'male' ? 'active' : ''}" data-gender="male">
        <img src="static/assets/agent-btn.png" alt="男特工">
        <span>男特工</span>
      </div>
      <div class="gender-menu-item ${currentGender === 'female' ? 'active' : ''}" data-gender="female">
        <img src="static/assets/agent-female.png" alt="女特工">
        <span>女特工</span>
      </div>
    `;

    // 定位菜单在按钮上方
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.right = '20px';
    menu.style.bottom = (window.innerHeight - rect.top + 10) + 'px';

    document.body.appendChild(menu);

    // 标记菜单刚打开，800ms 内忽略关闭事件（防止长按松手误关闭）
    let justOpened = true;
    setTimeout(() => { justOpened = false; }, 800);

    // 点击选择
    menu.querySelectorAll('.gender-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const gender = item.dataset.gender;
        this._setAgentGender(gender);
        menu.remove();
        if (this._genderMenuCloseHandler) {
          document.removeEventListener('click', this._genderMenuCloseHandler);
          document.removeEventListener('touchstart', this._genderMenuCloseHandler);
          this._genderMenuCloseHandler = null;
        }
      });
    });

    // 点击其他地方关闭（使用全局 handler 避免重复绑定）
    this._genderMenuCloseHandler = (e) => {
      if (justOpened) return; // 刚打开时忽略关闭
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', this._genderMenuCloseHandler);
        document.removeEventListener('touchstart', this._genderMenuCloseHandler);
        this._genderMenuCloseHandler = null;
      }
    };
    document.addEventListener('click', this._genderMenuCloseHandler);
    document.addEventListener('touchstart', this._genderMenuCloseHandler);
  },

  _getAgentGender() {
    try {
      return localStorage.getItem('idsi_agent_gender') || 'male';
    } catch (e) {
      return 'male';
    }
  },

  _setAgentGender(gender) {
    try {
      localStorage.setItem('idsi_agent_gender', gender);
    } catch (e) {}

    // 更新按钮图标
    const btn = document.getElementById('fab-agent');
    if (btn) {
      const img = btn.querySelector('img');
      if (img) {
        img.src = gender === 'female' ? 'static/assets/agent-female.png' : 'static/assets/agent-btn.png';
      }
    }

    this.showToast(gender === 'female' ? '👩‍✈️ 已切换为女特工' : '👨‍✈️ 已切换为男特工');
  },

  // ==================== 新手引导 ====================

  _guideStep: 0,
  _guideSteps: [
    {
      type: 'center',
      title: '欢迎加入 IDSI 国际狗屎调查局！',
      subtitle: '你的任务是标记城市中的狗屎，让更多人避雷',
      btnText: '开始任务 👇'
    },
    {
      type: 'target',
      target: '#fab-mark',
      title: '标记狗屎',
      subtitle: '点击这里，在你脚下标记一坨狗屎',
      btnText: '知道了',
      padding: 12
    },
    {
      type: 'center',
      title: '长按操作',
      subtitle: '长按自己标记的便便可以删除，长按别人标记的可以踩一脚 👟',
      btnText: '我准备好了！',
      showPoopIcon: true,
      poopColor: 'fresh'
    }
  ],

  startGuide() {
    // 如果已完成引导，不再显示
    if (localStorage.getItem('idsi_guide_done')) return;

    const overlay = document.getElementById('guide-overlay');
    if (!overlay) return;

    this._guideStep = 0;
    this._guideRetryCount = 0;
    this._showGuideStep();
  },

  _getGuideTarget(step) {
    if (step.type === 'center') return null;
    // 动态查找目标元素
    let targetEl = document.querySelector(step.target);
    // 如果是便便标记且没找到，等待一下再试
    if (!targetEl && step.target === '.poop-marker-wrapper') {
      targetEl = document.querySelector('.poop-marker-wrapper');
    }
    return targetEl;
  },

  _showGuideStep() {
    const step = this._guideSteps[this._guideStep];
    const overlay = document.getElementById('guide-overlay');
    const highlight = document.getElementById('guide-highlight');
    const wrapper = document.getElementById('guide-bubble-wrapper');
    const bubble = document.getElementById('guide-bubble');
    const content = document.getElementById('guide-bubble-content');
    const actions = document.getElementById('guide-bubble-actions');
    const arrow = document.getElementById('guide-bubble-arrow');

    overlay.classList.add('active');

    // 步骤指示点
    const dots = this._guideSteps.map((_, i) =>
      `<div class="guide-step-dot ${i === this._guideStep ? 'active' : ''}"></div>`
    ).join('');

    if (step.type === 'center') {
      // 居中模式（欢迎页）
      overlay.classList.add('center-mode');
      highlight.style.cssText = 'display: none';
      arrow.className = 'guide-bubble-arrow';
      arrow.style.display = 'none';

      wrapper.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: guideBubbleIn 0.35s ease;
      `;
      bubble.style.cssText = '';

      const poopIcon = step.showPoopIcon ? `<img src="static/assets/poop-marker.png" style="width: 48px; height: 48px; margin: 12px auto; display: block;" alt="便便">` : '';
      content.innerHTML = `
        <div class="guide-title">${step.title}</div>
        ${poopIcon}
        <div class="guide-subtitle">${step.subtitle}</div>
      `;
      actions.innerHTML = `
        <div>
          <button onclick="App._nextGuideStep()">${step.btnText}</button>
          <div class="guide-step-dots">${dots}</div>
        </div>
      `;
    } else {
      // 指向目标元素 - 气泡放在左侧，箭头指向右侧目标
      overlay.classList.remove('center-mode');
      const targetEl = this._getGuideTarget(step);
      if (!targetEl) {
        // 如果是便便标记还没加载，延迟重试（最多重试5次）
        if (step.target === '.poop-marker-wrapper' && this._guideRetryCount < 5) {
          this._guideRetryCount++;
          setTimeout(() => this._showGuideStep(), 800);
          return;
        }
        // 重试次数用完或不是便便标记，跳过该步骤
        this._guideRetryCount = 0;
        this._guideStep++;
        if (this._guideStep >= this._guideSteps.length) {
          this._endGuide();
          return;
        }
        this._showGuideStep();
        return;
      }
      this._guideRetryCount = 0;

      const rect = targetEl.getBoundingClientRect();
      const pad = step.padding || 8;

      // 高亮区域（圆形，匹配便便图标）
      const size = Math.max(rect.width, rect.height) + pad * 2;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      highlight.style.cssText = `
        display: block;
        top: ${centerY - size / 2}px;
        left: ${centerX - size / 2}px;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
      `;

      // 气泡放在目标左侧，箭头指向右侧
      const bubbleWidth = Math.min(240, window.innerWidth * 0.6);
      const gap = 20;
      let bubbleTop = centerY - 60;
      let bubbleLeft = rect.left - bubbleWidth - gap;

      // 如果左侧空间不够，放右侧
      if (bubbleLeft < 12) {
        bubbleLeft = rect.right + gap;
      }

      // 垂直边界修正
      bubbleTop = Math.max(12, Math.min(bubbleTop, window.innerHeight - 180));

      wrapper.style.cssText = `
        position: fixed;
        top: ${bubbleTop}px;
        left: ${bubbleLeft}px;
        width: ${bubbleWidth}px;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: guideBubbleIn 0.35s ease;
      `;
      bubble.style.cssText = 'width: 100%;';

      // 箭头指向右侧目标
      arrow.className = 'guide-bubble-arrow arrow-right';
      arrow.style.display = 'block';
      // 箭头垂直居中于目标
      const arrowTop = centerY - bubbleTop - 7;
      arrow.style.top = Math.max(20, Math.min(arrowTop, 100)) + 'px';
      arrow.style.marginTop = '0';

      content.innerHTML = `
        <div class="guide-title">${step.title}</div>
        <div class="guide-subtitle">${step.subtitle}</div>
      `;
      actions.innerHTML = `
        <div>
          <button onclick="App._nextGuideStep()">${step.btnText}</button>
          <div class="guide-step-dots">${dots}</div>
        </div>
      `;
    }
  },

  _guideRetryCount: 0,

  _nextGuideStep() {
    this._guideStep++;
    this._guideRetryCount = 0;
    if (this._guideStep >= this._guideSteps.length) {
      this._endGuide();
    } else {
      // 重新触发动画
      const wrapper = document.getElementById('guide-bubble-wrapper');
      if (wrapper) {
        wrapper.style.animation = 'none';
        wrapper.offsetHeight;
        wrapper.style.animation = '';
      }
      this._showGuideStep();
    }
  },

  _endGuide() {
    const overlay = document.getElementById('guide-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.classList.remove('center-mode');
    }
    localStorage.setItem('idsi_guide_done', '1');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  if (typeof MapModule !== 'undefined') MapModule.init();
  if (typeof RankingModule !== 'undefined') RankingModule.init();
  // 地图初始化后启动新手引导
  setTimeout(() => App.startGuide(), 1500);
});
