/**
 * 狗屎地图 - 高德地图集成模块
 * 负责地图初始化、标记管理、定位和信息窗体交互
 */

const MapModule = (function () {
  'use strict';

  // ==================== 常量 ====================
  const DEFAULT_CENTER = [116.397428, 39.90923]; // 北京天安门
  const DEFAULT_ZOOM = 12;
  const MARKER_EMOJI = '💩';
  const MARKER_ICON_URL = 'static/assets/poop-marker.png';
  const LONG_PRESS_DURATION = 600; // 长按触发时间（毫秒）

  // ==================== 状态 ====================
  let map = null;
  let markers = [];
  let infoWindow = null;
  let geolocation = null;


  // ==================== 私有方法 ====================

  /**
   * 显示友好错误提示
   * @param {string} message - 错误信息
   */
  function _showError(message) {
    console.error('[MapModule]', message);

    // 创建临时提示元素
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #C75B39;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 显示地图加载失败的友好提示
   * @param {string} message - 提示信息
   */
  function _showMapFallback(message) {
    const container = document.getElementById('map-container');
    if (!container) return;

    container.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f5f0e8 0%, #ede6d6 100%);
        color: #8a7e6b;
        text-align: center;
        padding: 40px 20px;
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">🗺️</div>
        <div style="font-size: 18px; font-weight: 600; color: #3d3529; margin-bottom: 12px;">
          地图加载失败
        </div>
        <div style="font-size: 14px; line-height: 1.6; max-width: 280px;">
          ${message}<br><br>
          请检查高德地图 Key 是否已开通 JS API 权限，<br>
          并确认域名白名单设置正确。
        </div>
        <div style="margin-top: 24px; padding: 12px 20px; background: rgba(139,94,60,0.1); border-radius: 8px; font-size: 12px;">
          <strong>当前 Key:</strong> 780b29...366d63
        </div>
      </div>
    `;
  }

  /**
   * 创建自定义标记 DOM（3D 黏土风格图标）
   * @param {Object} mark - 标记数据
   * @returns {HTMLElement}
   */
  function _createMarkerContent(mark) {
    const div = document.createElement('div');
    div.className = 'poop-marker-wrapper';
    div.style.cssText = `
      width: 44px;
      height: 44px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      position: relative;
      transition: transform 0.2s ease;
      pointer-events: auto;
    `;

    const isFresh = mark.freshness === 'fresh';
    const hoursDiff = (Date.now() - (mark.timestamp || 0)) / (1000 * 60 * 60);
    const isOld = hoursDiff > 24;

    // 根据新鲜度选择图标
    const img = document.createElement('img');
    img.style.cssText = `
      width: 48px;
      height: 48px;
      object-fit: contain;
      transition: all 0.3s ease;
      pointer-events: none;
    `;

    if (isOld || !isFresh) {
      // 陈年：深色图标、缩小
      img.src = 'static/assets/poop-marker-old.png';
      img.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))';
      img.style.transform = 'scale(0.85)';
    } else {
      // 新鲜：彩色图标
      img.src = 'static/assets/poop-marker.png';
      img.style.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))';
    }

    div.appendChild(img);

    // 悬停放大
    div.addEventListener('mouseenter', () => {
      div.style.transform = 'scale(1.15)';
    });
    div.addEventListener('mouseleave', () => {
      div.style.transform = 'scale(1)';
    });

    // 长按：自己标记删除，别人标记踩一脚
    let pressTimer = null;
    div._longPressTriggered = false;

    // 判断是否是自己的标记（非 demo_ 开头）
    const isMyMark = mark.id && !String(mark.id).startsWith('demo_');

    div.addEventListener('mousedown', (e) => {
      div._longPressTriggered = false;
      pressTimer = setTimeout(() => {
        div._longPressTriggered = true;
        if (isMyMark) {
          _showDeleteConfirm(mark, div);
        } else {
          _showStepOnConfirm(mark, div);
        }
      }, LONG_PRESS_DURATION);
    });

    div.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
    });

    div.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
    });

    // 触摸事件（移动端）
    div.addEventListener('touchstart', (e) => {
      div._longPressTriggered = false;
      pressTimer = setTimeout(() => {
        div._longPressTriggered = true;
        if (isMyMark) {
          _showDeleteConfirm(mark, div);
        } else {
          _showStepOnConfirm(mark, div);
        }
      }, LONG_PRESS_DURATION);
    }, { passive: true });

    div.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    div.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });

    return div;
  }

  /**
   * 显示删除确认气泡
   * @param {Object} mark - 标记数据
   * @param {HTMLElement} markerEl - 标记 DOM 元素
   */
  function _showDeleteConfirm(mark, markerEl) {
    // 如果已有删除气泡，先移除
    const existing = document.querySelector('.delete-bubble');
    if (existing) existing.remove();

    // 震动反馈（移动端）
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // 计算标记在屏幕上的位置
    const rect = markerEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const bottomY = rect.top;

    const bubble = document.createElement('div');
    bubble.className = 'delete-bubble';
    bubble.innerHTML = `
      <div class="delete-bubble-content">
        <span class="delete-bubble-text">删除这坨？</span>
        <div class="delete-bubble-actions">
          <button class="delete-bubble-btn delete-bubble-cancel">取消</button>
          <button class="delete-bubble-btn delete-bubble-confirm">删除</button>
        </div>
      </div>
      <div class="delete-bubble-arrow"></div>
    `;
    bubble.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - bottomY + 8}px;
      left: ${centerX}px;
      transform: translateX(-50%);
      z-index: 99999;
      animation: bubbleIn 0.25s ease;
    `;

    document.body.appendChild(bubble);

    // 取消按钮
    bubble.querySelector('.delete-bubble-cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      bubble.remove();
    });

    // 删除按钮
    bubble.querySelector('.delete-bubble-confirm').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      bubble.remove();
      _deleteMark(mark);
    });

    // 点击空白处关闭（使用 mousedown 确保优先级）
    const closeOnClickOutside = (e) => {
      if (!bubble.contains(e.target)) {
        bubble.remove();
        document.removeEventListener('mousedown', closeOnClickOutside);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeOnClickOutside), 200);
  }

  /**
   * 显示踩一脚确认气泡
   * @param {Object} mark - 标记数据
   * @param {HTMLElement} markerEl - 标记 DOM 元素
   */
  function _showStepOnConfirm(mark, markerEl) {
    // 如果已有气泡，先移除
    const existing = document.querySelector('.delete-bubble');
    if (existing) existing.remove();

    // 震动反馈（移动端）
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // 获取已踩次数
    const stepCount = _getStepCount(mark.id);

    // 计算标记在屏幕上的位置
    const rect = markerEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const bottomY = rect.top;

    const bubble = document.createElement('div');
    bubble.className = 'delete-bubble';
    bubble.innerHTML = `
      <div class="delete-bubble-content">
        <span class="delete-bubble-text">👟 踩一脚？</span>
        <span style="font-size: 11px; color: #A89B8C; margin-top: 4px;">已有 ${stepCount} 人踩过</span>
        <div class="delete-bubble-actions">
          <button class="delete-bubble-btn delete-bubble-cancel">取消</button>
          <button class="delete-bubble-btn delete-bubble-confirm" style="background: #8B5E3C; color: #fff;">踩一脚</button>
        </div>
      </div>
      <div class="delete-bubble-arrow"></div>
    `;
    bubble.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - bottomY + 8}px;
      left: ${centerX}px;
      transform: translateX(-50%);
      z-index: 99999;
      animation: bubbleIn 0.25s ease;
    `;

    document.body.appendChild(bubble);

    // 取消按钮
    bubble.querySelector('.delete-bubble-cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      bubble.remove();
    });

    // 踩一脚按钮
    bubble.querySelector('.delete-bubble-confirm').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      bubble.remove();
      _stepOnMark(mark, markerEl);
    });

    // 点击空白处关闭（使用 mousedown 确保优先级）
    const closeOnClickOutside = (e) => {
      if (!bubble.contains(e.target)) {
        bubble.remove();
        document.removeEventListener('mousedown', closeOnClickOutside);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeOnClickOutside), 200);
  }

  /**
   * 获取标记的踩屎次数
   */
  function _getStepCount(markId) {
    try {
      const key = 'poop_steps_' + markId;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.count || 0;
      }
    } catch (e) {}
    return 0;
  }

  /**
   * 踩一脚标记
   */
  function _stepOnMark(mark, markerEl) {
    try {
      const key = 'poop_steps_' + mark.id;
      let count = 0;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        count = parsed.count || 0;
      }
      count++;
      localStorage.setItem(key, JSON.stringify({ count, timestamp: Date.now() }));

      // 显示踩屎动画，动画结束后显示 toast
      _playStepOnAnimation(markerEl, () => {
        // 动画播放完毕后的回调
        // 记录成就
        let hasNewAchievement = false;
        if (typeof AgentSystem !== 'undefined' && AgentSystem.recordStep) {
          const newAchievements = AgentSystem.recordStep();
          if (newAchievements.length > 0 && typeof App !== 'undefined' && App.showAchievementCard) {
            hasNewAchievement = true;
            setTimeout(() => App.showAchievementCard(newAchievements[0]), 300);
          }
        }

        // 提示（如果有新成就弹框，就不显示普通 toast）
        if (!hasNewAchievement && typeof App !== 'undefined' && App.showToast) {
          App.showToast(`👟 踩屎成功！已有 ${count} 人踩过`);
        }
      });
    } catch (e) {
      console.warn('[MapModule] 踩屎失败:', e);
    }
  }

  /**
   * 踩屎动画
   * @param {HTMLElement} el - 标记元素
   * @param {Function} onComplete - 动画结束回调
   */
  function _playStepOnAnimation(el, onComplete) {
    // 震动效果
    el.style.animation = 'stepOnShake 0.4s ease';
    setTimeout(() => {
      el.style.animation = '';
    }, 400);

    // 播放踩屎动画（WebM透明视频+蓝紫色弥散阴影）
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const video = document.createElement('video');
    video.src = 'static/assets/step-on-poop-user.webm';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = `
      max-width: 80vw;
      max-height: 80vh;
      width: auto;
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 0 30px rgba(120, 100, 255, 0.6))
              drop-shadow(0 0 60px rgba(100, 80, 230, 0.4))
              drop-shadow(0 0 100px rgba(80, 150, 255, 0.25));
    `;

    container.appendChild(video);
    document.body.appendChild(container);

    video.onended = () => {
      container.remove();
      if (onComplete) onComplete();
    };

    // 安全兜底：8秒后自动移除
    setTimeout(() => {
      if (container.parentNode) {
        container.remove();
        if (onComplete) onComplete();
      }
    }, 8000);
  }

  /**
   * 定位到用户当前位置（使用高德系统定位控件，不创建自定义标记）
   */
  function _locateUser() {
    if (!map) return;

    getCurrentPosition().then(position => {
      // 移动地图到用户位置
      map.setCenter([position.lng, position.lat]);
      map.setZoom(15);

      console.log('[MapModule] 已定位到用户位置:', position);
    }).catch(err => {
      console.warn('[MapModule] 定位失败:', err);
    });
  }

  /**
   * 移动地图到指定位置
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   */
  function panTo(lng, lat) {
    if (map) {
      map.setCenter([lng, lat]);
      map.setZoom(15);
    }
  }

  /**
   * 删除标记
   * @param {Object} mark - 标记数据
   */
  function _deleteMark(mark) {
    // 从地图上移除
    const markerIndex = markers.findIndex(m => {
      const data = m.getExtData();
      return data && data.id === mark.id;
    });

    if (markerIndex !== -1) {
      markers[markerIndex].setMap(null);
      markers.splice(markerIndex, 1);
    }

    // 从 DataStore 中移除
    if (typeof DataStore !== 'undefined' && DataStore.deleteMark) {
      DataStore.deleteMark(mark.id);
    } else if (typeof DataStore !== 'undefined') {
      // 如果没有 deleteMark 方法，手动从 localStorage 移除
      const allMarks = DataStore.getMarks().filter(m => m.id !== mark.id);
      localStorage.setItem(DataStore.STORAGE_KEY || 'poop_marks', JSON.stringify(allMarks));
    }

    // 关闭信息窗体
    if (infoWindow) infoWindow.close();

    // 提示
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast('🗑️ 已删除');
    }

    console.log('[MapModule] 标记已删除:', mark.id);
  }

  /**
   * 创建信息窗体内容（简化版：时间 + 新鲜度）
   * @param {Object} mark - 标记数据
   * @returns {string} HTML 字符串
   */
  function _createInfoWindowContent(mark) {
    // 计算新鲜度（优先使用 mark.freshness 字段，否则按时间计算）
    const hoursDiff = (Date.now() - (mark.timestamp || 0)) / (1000 * 60 * 60);
    const isOld = mark.freshness === 'old' || hoursDiff > 24;

    const freshnessMap = {
      fresh: { text: '🟢 新鲜出炉', color: '#22c55e' },
      old: { text: '🔴 陈年发酵', color: '#ef4444' }
    };

    const freshness = isOld ? freshnessMap.old : freshnessMap.fresh;

    const timeStr = mark.timestamp
      ? new Date(mark.timestamp).toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '未知时间';

    // 获取评论列表
    const comments = _getComments(mark.id);
    const commentsHtml = comments.length > 0
      ? comments.map(c => `
          <div style="font-size: 11px; color: #7A6B5D; margin-bottom: 4px; padding: 4px 0; border-bottom: 1px solid #f0ebe5;">
            <span style="color: #A89B8C;">${new Date(c.time).toLocaleDateString('zh-CN')}：</span>${c.text}
          </div>
        `).join('')
      : '<div style="font-size: 11px; color: #C4B8A8; text-align: center; padding: 8px 0;">暂无评论，快来吐槽吧</div>';

    return `
      <div style="
        padding: 8px 4px;
        min-width: 180px;
        max-width: 240px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      " id="info-window-${mark.id}">
        <div style="font-size: 13px; color: #5C4A3A; margin-bottom: 6px;">
          📍 ${mark.city || mark.district || '未知城市'}
        </div>
        <div style="font-size: 12px; color: #A89B8C; margin-bottom: 6px;">
          ${timeStr}
        </div>
        ${mark.joke ? `<div style="font-size: 12px; color: #8B7355; margin-bottom: 8px; line-height: 1.5; font-style: italic;">
          💬 ${mark.joke}
        </div>` : ''}
        <span style="
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          background: ${freshness.color}15;
          color: ${freshness.color};
          margin-bottom: 8px;
        ">
          ${freshness.text}
        </span>
        <!-- 评论区 -->
        <div style="border-top: 1px solid #E5D9C8; padding-top: 8px; margin-top: 4px;">
          <div style="font-size: 11px; color: #A89B8C; margin-bottom: 6px;">💭 评论区</div>
          <div style="max-height: 100px; overflow-y: auto; margin-bottom: 8px;">
            ${commentsHtml}
          </div>
          <div style="display: flex; gap: 6px;">
            <input type="text" placeholder="吐槽一句..." style="
              flex: 1;
              padding: 5px 10px;
              border: 1px solid #E5D9C8;
              border-radius: 16px;
              font-size: 12px;
              outline: none;
              background: #FDF8F3;
            " id="comment-input-${mark.id}">
            <button onclick="MapModule._addComment('${mark.id}')" style="
              padding: 5px 12px;
              background: #8B5E3C;
              color: #fff;
              border: none;
              border-radius: 16px;
              font-size: 12px;
              cursor: pointer;
            ">发送</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 获取标记的评论列表
   */
  function _getComments(markId) {
    try {
      const key = 'poop_comments_' + markId;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return [];
  }

  /**
   * 添加评论
   */
  function _addComment(markId) {
    const input = document.getElementById('comment-input-' + markId);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    try {
      const key = 'poop_comments_' + markId;
      const comments = _getComments(markId);
      comments.push({ text, time: Date.now() });
      localStorage.setItem(key, JSON.stringify(comments));
      input.value = '';

      // 刷新信息窗体
      const mark = markers.find(m => m.getExtData().id === markId);
      if (mark) {
        showDetail(mark.getExtData());
      }

      // 记录成就（静默记录，不弹框）
      if (typeof AgentSystem !== 'undefined' && AgentSystem.recordComment) {
        AgentSystem.recordComment();
      }

      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('💬 吐槽成功！');
      }
    } catch (e) {
      console.warn('[MapModule] 添加评论失败:', e);
    }
  }

  /**
   * 执行掉落动画
   * @param {HTMLElement} el - 标记元素
   */
  function _playDropAnimation(el) {
    el.style.transform = 'translateY(-80px)';
    el.style.opacity = '0';
    el.style.transition = 'none';

    // 强制重绘
    el.offsetHeight;

    el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  }

  /**
   * 点击标记时喷出小星星动画
   */
  function _playStarBurst(el) {
    const stars = ['⭐', '✨', '🌟', '💫'];
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 8; i++) {
      const star = document.createElement('div');
      star.textContent = stars[Math.floor(Math.random() * stars.length)];
      star.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: ${14 + Math.random() * 10}px;
        pointer-events: none;
        z-index: 9999;
        animation: starBurst 0.6s ease-out forwards;
        animation-delay: ${i * 0.03}s;
      `;
      // 随机方向
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
      const distance = 30 + Math.random() * 40;
      star.style.setProperty('--star-x', `${Math.cos(angle) * distance}px`);
      star.style.setProperty('--star-y', `${Math.sin(angle) * distance}px`);
      document.body.appendChild(star);
      setTimeout(() => star.remove(), 700);
    }
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化高德地图
   */
  function init() {
    return new Promise((resolve, reject) => {
      // 检查高德地图 API 是否加载
      if (typeof AMap === 'undefined') {
        _showMapFallback('高德地图 API 加载失败，请检查 Key 配置');
        reject(new Error('高德地图 API 加载失败'));
        return;
      }

      try {
        // 创建地图实例
        map = new AMap.Map('map-container', {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          viewMode: '2D',
          resizeEnable: true
        });

        // 添加控件（高德 2.0 需要通过 plugin 加载）
        // 所有控件放左侧，与右侧悬浮按钮高度对齐
        AMap.plugin(['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation'], () => {
          map.addControl(new AMap.Scale());

          // 缩放控件放左侧，与右侧特工按钮顶部对齐
          map.addControl(new AMap.ToolBar({
            position: 'LB',
            offset: new AMap.Pixel(10, 300)
          }));

          // 定位控件放左侧，在缩放控件下方一定距离
          map.addControl(new AMap.Geolocation({
            position: 'LB',
            offset: new AMap.Pixel(10, 160),
            showButton: true,
            buttonPosition: 'LB',
            buttonOffset: new AMap.Pixel(10, 186),
            showMarker: true,
            showCircle: true,
            circleOptions: {
              strokeColor: '#8B5E3C',
              fillColor: '#8B5E3C',
              fillOpacity: 0.15
            },
            zoomToAccuracy: true
          }));
        });

        // 创建信息窗体实例
        infoWindow = new AMap.InfoWindow({
          offset: new AMap.Pixel(0, -20),
          closeWhenClickMap: true,
          isCustom: false
        });

        console.log('[MapModule] 地图初始化完成');

        // 加载已有标记
        loadMarkers();

        // 自动定位到用户当前位置
        _locateUser();

        resolve(map);
      } catch (err) {
        const errMsg = '地图初始化失败: ' + err.message;
        _showError(errMsg);
        reject(new Error(errMsg));
      }
    });
  }

  /**
   * 从 DataStore 加载标记并在地图上显示
   */
  function loadMarkers() {
    if (!map) {
      console.warn('[MapModule] 地图尚未初始化，无法加载标记');
      return;
    }

    clearMarkers();

    const marks = (typeof DataStore !== 'undefined' && DataStore.getMarks)
      ? DataStore.getMarks()
      : [];

    marks.forEach((mark, index) => {
      // 延迟加载，产生依次掉落效果
      setTimeout(() => {
        addMarkToMap(mark, false);
      }, index * 80);
    });

    console.log(`[MapModule] 已加载 ${marks.length} 个标记`);
  }

  /**
   * 添加单个标记到地图
   * @param {Object} mark - 标记数据对象
   * @param {boolean} animate - 是否播放动画（默认 true）
   */
  function addMarkToMap(mark, animate = true) {
    if (!map) {
      console.warn('[MapModule] 地图尚未初始化，标记已缓存');
      return;
    }

    if (!mark || typeof mark.lng !== 'number' || typeof mark.lat !== 'number') {
      console.warn('[MapModule] 标记数据无效:', mark);
      return;
    }

    try {
      const markerContent = _createMarkerContent(mark);

      const marker = new AMap.Marker({
        position: [mark.lng, mark.lat],
        content: markerContent,
        offset: new AMap.Pixel(-22, -22),
        anchor: 'center',
        extData: mark
      });

      // 点击事件：显示信息窗体（长按时不触发）
      marker.on('click', () => {
        const markerEl = marker.getContent();
        // 如果长按已触发，不显示信息窗体
        if (markerEl && markerEl._longPressTriggered) {
          return;
        }
        showDetail(mark);
      });

      marker.setMap(map);
      markers.push(marker);

      // 播放掉落动画
      if (animate) {
        _playDropAnimation(markerContent);
      }

      console.log('[MapModule] 标记已添加到地图:', mark.id || 'unknown');
    } catch (err) {
      console.error('[MapModule] 添加标记失败:', err);
    }
  }

  /**
   * 点击标记显示详情弹窗
   * @param {Object} mark - 标记数据对象
   */
  function showDetail(mark) {
    if (!map) {
      console.warn('[MapModule] 地图尚未初始化');
      return;
    }

    // 确保 infoWindow 存在
    if (!infoWindow) {
      infoWindow = new AMap.InfoWindow({
        isCustom: true,
        offset: new AMap.Pixel(0, -30),
        autoMove: true
      });
    }

    // 打开信息窗体
    const content = _createInfoWindowContent(mark);
    infoWindow.setContent(content);
    infoWindow.open(map, [mark.lng, mark.lat]);

    console.log('[MapModule] 显示标记详情:', mark.id || 'unknown');
  }

  /**
   * 获取当前地理位置
   * @returns {Promise<{lng: number, lat: number}>}
   */
  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      // 优先使用浏览器 Geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lng: position.coords.longitude,
              lat: position.coords.latitude
            });
          },
          (err) => {
            console.warn('[MapModule] 浏览器定位失败:', err.message);
            // 回退到高德定位
            _amapGeolocation(resolve, reject);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      } else {
        // 浏览器不支持，使用高德定位
        _amapGeolocation(resolve, reject);
      }
    });
  }

  /**
   * 使用高德地图进行定位（私有辅助方法）
   * @param {Function} resolve
   * @param {Function} reject
   */
  function _amapGeolocation(resolve, reject) {
    if (typeof AMap === 'undefined') {
      console.warn('[MapModule] 高德 API 不可用，使用默认位置');
      resolve({ lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] });
      return;
    }

    AMap.plugin('AMap.Geolocation', () => {
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonOffset: new AMap.Pixel(10, 20),
        zoomToAccuracy: true
      });

      geo.getCurrentPosition((status, result) => {
        if (status === 'complete' && result.position) {
          resolve({
            lng: result.position.lng,
            lat: result.position.lat
          });
        } else {
          console.warn('[MapModule] 高德定位失败，使用默认位置');
          resolve({ lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] });
        }
      });
    });
  }

  /**
   * 清除所有标记
   */
  function clearMarkers() {
    if (!map) return;

    markers.forEach(marker => {
      marker.setMap(null);
    });
    markers = [];

    if (infoWindow) {
      infoWindow.close();
    }

    console.log('[MapModule] 所有标记已清除');
  }

  /**
   * 处理"查看详情"按钮点击（供信息窗体内联事件调用）
   * @param {string} markId - 标记 ID
   */
  function _handleDetailClick(markId) {
    // 查找对应标记数据
    let targetMark = null;

    markers.forEach(marker => {
      const data = marker.getExtData();
      if (data && data.id === markId) {
        targetMark = data;
      }
    });

    // 如果标记上没找到，尝试从 DataStore 查找
    if (!targetMark && typeof DataStore !== 'undefined' && DataStore.getMarks) {
      targetMark = DataStore.getMarks().find(m => m.id === markId);
    }

    if (targetMark && typeof App !== 'undefined' && App.showMarkDetail) {
      App.showMarkDetail(targetMark);
    }

    // 关闭信息窗体
    if (infoWindow) {
      infoWindow.close();
    }
  }

  /**
   * 刷新地图标记（供外部调用）
   */
  function refresh() {
    loadMarkers();
  }

  /**
   * 获取地图实例
   * @returns {AMap.Map|null}
   */
  function getMap() {
    return map;
  }

  /**
   * 通过坐标获取城市名（逆地理编码）
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   * @returns {Promise<{city: string, district: string}>}
   */
  function getCityByPosition(lng, lat) {
    return new Promise((resolve) => {
      if (typeof AMap === 'undefined') {
        resolve({ city: '当前位置', district: '当前位置' });
        return;
      }
      AMap.plugin(['AMap.Geocoder'], () => {
        const geocoder = new AMap.Geocoder({
          radius: 1000,
          extensions: 'base'
        });
        geocoder.getAddress([lng, lat], (status, result) => {
          if (status === 'complete' && result.regeocode) {
            const addr = result.regeocode.addressComponent;
            // 直辖市 city 为空，用 province；普通城市用 city
            const cityName = addr.city || addr.province || '当前位置';
            resolve({
              city: cityName,
              district: addr.district || cityName
            });
          } else {
            resolve({ city: '当前位置', district: '当前位置' });
          }
        });
      });
    });
  }

  // ==================== 导出 ====================
  return {
    init: init,
    loadMarkers: loadMarkers,
    addMarkToMap: addMarkToMap,
    showDetail: showDetail,
    getCurrentPosition: getCurrentPosition,
    clearMarkers: clearMarkers,
    refresh: refresh,
    getMap: getMap,
    getCityByPosition: getCityByPosition,
    // 供信息窗体内联事件使用
    _handleDetailClick: _handleDetailClick,
    _addComment: _addComment
  };
})();

// 兼容 CommonJS / ES Module / 浏览器全局
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapModule;
}
