/**
 * 狗屎地图 - 拍照打码模块
 * 负责照片选择、Canvas 打码处理、压缩和预览
 */

const PhotoModule = {
  /** 当前处理后的照片数据 */
  currentPhoto: null,

  /** 照片区域元素 */
  photoArea: null,

  /** 文件输入元素 */
  photoInput: null,

  /** 处理中状态 */
  isProcessing: false,

  /**
   * 初始化模块
   * 绑定事件监听器
   */
  init() {
    this.photoArea = document.getElementById('photo-area');
    this.photoInput = document.getElementById('photo-input');

    if (this.photoArea && this.photoInput) {
      // 点击照片区域触发文件选择
      this.photoArea.addEventListener('click', () => {
        this.openCamera();
      });

      // 文件选择变化处理
      this.photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleFileSelect(file);
        }
      });
    }

    console.log('[PhotoModule] 初始化完成');
  },

  /**
   * 打开相机或文件选择器
   */
  openCamera() {
    if (this.photoInput) {
      this.photoInput.click();
    }
  },

  /**
   * 处理文件选择
   * @param {File} file - 用户选择的图片文件
   */
  async handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showToast('请选择有效的图片文件');
      return;
    }

    // 文件大小限制 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('图片大小不能超过 10MB');
      return;
    }

    this.isProcessing = true;
    this.showLoading(true);

    try {
      // 先压缩图片
      const compressedFile = await this.compress(file);

      // 转为 base64
      const base64 = await this.getBase64(compressedFile);

      // Canvas 打码处理
      this.processImage(base64, (processedBase64) => {
        this.isProcessing = false;
        this.showLoading(false);

        if (processedBase64) {
          this.currentPhoto = processedBase64;
          this.updatePhotoPreview(processedBase64);

          // 通知 App 照片已处理完成
          if (typeof App !== 'undefined' && App.onPhotoProcessed) {
            App.onPhotoProcessed(processedBase64);
          }
        } else {
          // 处理失败，使用原图
          this.currentPhoto = base64;
          this.updatePhotoPreview(base64);
          this.showToast('图片处理失败，已使用原图');
        }
      });
    } catch (err) {
      console.error('[PhotoModule] 处理图片失败:', err);
      this.isProcessing = false;
      this.showLoading(false);
      this.showToast('图片读取失败，请重试');
    }
  },

  /**
   * Canvas 打码处理
   * @param {string} imageSrc - 图片 base64 或 URL
   * @param {Function} callback - 处理完成回调，参数为处理后的 base64
   */
  processImage(imageSrc, callback) {
    const img = new Image();

    img.onload = () => {
      try {
        // 计算缩放后尺寸（最大宽度 800px，等比例缩放）
        const maxWidth = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // 创建 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          callback(null);
          return;
        }

        // 绘制原图
        ctx.drawImage(img, 0, 0, width, height);

        // 整体模糊处理 (blur 20px)
        ctx.filter = 'blur(20px)';
        ctx.drawImage(canvas, 0, 0, width, height);
        ctx.filter = 'none';

        // 中央覆盖 💩 emoji
        const shortSide = Math.min(width, height);
        const emojiSize = Math.floor(shortSide * 0.3);
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 绘制 emoji 阴影增强可见性
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText('💩', centerX, centerY);

        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 添加时间戳水印
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        const padding = 16;
        const fontSize = Math.max(12, Math.floor(shortSide * 0.04));

        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        // 水印背景
        const textMetrics = ctx.measureText(timeStr);
        const bgPadding = 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.roundRect(
          padding - bgPadding,
          height - padding - fontSize - bgPadding,
          textMetrics.width + bgPadding * 2,
          fontSize + bgPadding * 2,
          4
        );
        ctx.fill();

        // 水印文字
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(timeStr, padding, height - padding);

        // 输出 JPEG 格式（质量 0.8）
        const result = canvas.toDataURL('image/jpeg', 0.8);
        callback(result);
      } catch (err) {
        console.error('[PhotoModule] Canvas 处理失败:', err);
        callback(null);
      }
    };

    img.onerror = () => {
      console.error('[PhotoModule] 图片加载失败');
      callback(null);
    };

    img.src = imageSrc;
  },

  /**
   * 将文件转为 base64
   * @param {File} file - 图片文件
   * @returns {Promise<string>} base64 字符串
   */
  getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsDataURL(file);
    });
  },

  /**
   * 压缩图片
   * @param {File} file - 原始图片文件
   * @param {Object} options - 压缩选项
   * @returns {Promise<File|Blob>} 压缩后的文件
   */
  compress(file, options = {}) {
    return new Promise((resolve, reject) => {
      const maxWidth = options.maxWidth || 1200;
      const maxHeight = options.maxHeight || 1200;
      const quality = options.quality || 0.85;

      // 如果文件已经很小，直接返回
      if (file.size < 500 * 1024) {
        resolve(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let width = img.width;
        let height = img.height;

        // 等比例缩放
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 创建新的 File 对象
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.src = url;
    });
  },

  /**
   * 更新照片预览
   * @param {string} base64 - 图片 base64
   */
  updatePhotoPreview(base64) {
    if (!this.photoArea) return;

    this.photoArea.innerHTML = `<img src="${base64}" alt="已选照片">`;
    this.photoArea.classList.add('has-photo');
    this.photoArea.dataset.photo = base64;

    // 添加重新选择提示
    const hint = document.createElement('div');
    hint.className = 'photo-reselect-hint';
    hint.textContent = '点击重新选择';
    this.photoArea.appendChild(hint);
  },

  /**
   * 获取当前照片数据
   * @returns {string|null} 照片 base64 或 null
   */
  getCurrentPhoto() {
    return this.currentPhoto;
  },

  /**
   * 清除当前照片
   */
  clearPhoto() {
    this.currentPhoto = null;
    if (this.photoArea) {
      this.photoArea.classList.remove('has-photo');
      delete this.photoArea.dataset.photo;
    }
  },

  /**
   * 显示/隐藏加载状态
   * @param {boolean} show - 是否显示
   */
  showLoading(show) {
    if (!this.photoArea) return;

    if (show) {
      this.photoArea.classList.add('processing');
      const loading = document.createElement('div');
      loading.className = 'photo-loading';
      loading.innerHTML = '<span>处理中...</span>';
      this.photoArea.appendChild(loading);
    } else {
      this.photoArea.classList.remove('processing');
      const loading = this.photoArea.querySelector('.photo-loading');
      if (loading) {
        loading.remove();
      }
    }
  },

  /**
   * 显示提示信息
   * @param {string} message - 提示内容
   */
  showToast(message) {
    // 优先使用 App 的 toast 方法
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(message);
      return;
    }

    // 简单的 toast 实现
    const toast = document.createElement('div');
    toast.className = 'photo-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 触发动画
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  PhotoModule.init();
});
