// X Reply Counter - Content Script

(function() {
  'use strict';

  let counterElement = null;
  let currentCount = 0;
  let dailyTarget = 10;
  let isEnabled = true;
  let isExpanded = false;
  let currentTheme = 'dark';

  // Detect X/Twitter theme
  function detectTheme() {
    const body = document.body;
    const bgColor = window.getComputedStyle(body).backgroundColor;

    const rgb = bgColor.match(/\d+/g);
    if (rgb) {
      const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
      return brightness > 128 ? 'light' : 'dark';
    }

    const html = document.documentElement;
    if (html.style.colorScheme === 'light' || document.body.classList.contains('light')) {
      return 'light';
    }

    return 'dark';
  }

  // Update theme
  function updateTheme() {
    const newTheme = detectTheme();
    if (newTheme !== currentTheme && counterElement) {
      currentTheme = newTheme;
      counterElement.setAttribute('data-theme', currentTheme);
    }
  }

  // Create SVG icon element
  function createXIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'currentColor');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z');
    svg.appendChild(path);

    return svg;
  }

  // Create the floating counter UI
  function createCounter() {
    if (counterElement) {
      counterElement.remove();
    }

    currentTheme = detectTheme();

    counterElement = document.createElement('div');
    counterElement.id = 'x-reply-counter';
    counterElement.setAttribute('data-theme', currentTheme);
    counterElement.classList.add('xrc-bubble'); // Start as bubble

    // Bubble content (shown when minimized)
    const bubbleContent = document.createElement('div');
    bubbleContent.className = 'xrc-bubble-content';

    const bubbleCount = document.createElement('span');
    bubbleCount.className = 'xrc-bubble-count';
    bubbleCount.id = 'xrc-bubble-count';
    bubbleCount.textContent = '0';

    bubbleContent.appendChild(bubbleCount);

    // Panel content (shown when expanded)
    const panel = document.createElement('div');
    panel.className = 'xrc-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'xrc-header';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'xrc-icon';
    iconSpan.appendChild(createXIcon());

    const titleSpan = document.createElement('span');
    titleSpan.className = 'xrc-title';
    titleSpan.textContent = "Today's Posts";

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'xrc-minimize';
    minimizeBtn.title = 'Minimize';
    minimizeBtn.textContent = '−';

    header.appendChild(iconSpan);
    header.appendChild(titleSpan);
    header.appendChild(minimizeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'xrc-body';

    // Count container
    const countContainer = document.createElement('div');
    countContainer.className = 'xrc-count-container';

    const countSpan = document.createElement('span');
    countSpan.className = 'xrc-count';
    countSpan.id = 'xrc-total-count';
    countSpan.textContent = '0';

    const targetSpan = document.createElement('span');
    targetSpan.className = 'xrc-target';
    targetSpan.textContent = '/ ';

    const targetValueSpan = document.createElement('span');
    targetValueSpan.className = 'xrc-target-value';
    targetValueSpan.id = 'xrc-target-value';
    targetValueSpan.textContent = '10';
    targetSpan.appendChild(targetValueSpan);

    countContainer.appendChild(countSpan);
    countContainer.appendChild(targetSpan);

    // Progress container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'xrc-progress-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'xrc-progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'xrc-progress-fill';
    progressFill.id = 'xrc-progress-fill';
    progressBar.appendChild(progressFill);

    const progressText = document.createElement('span');
    progressText.className = 'xrc-progress-text';
    progressText.id = 'xrc-progress-text';
    progressText.textContent = '0%';

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);

    body.appendChild(countContainer);
    body.appendChild(progressContainer);

    panel.appendChild(header);
    panel.appendChild(body);

    counterElement.appendChild(bubbleContent);
    counterElement.appendChild(panel);

    document.body.appendChild(counterElement);

    // Minimize button to collapse back to bubble
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      collapseCounter();
    });

    makeDraggable(counterElement, bubbleContent);
    loadPosition();

    // Theme observer
    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  }

  function expandCounter() {
    if (!counterElement) return;
    isExpanded = true;
    counterElement.classList.remove('xrc-bubble');
    counterElement.classList.add('xrc-expanded');
    chrome.storage.local.set({ counterExpanded: true });
  }

  function collapseCounter() {
    if (!counterElement) return;
    isExpanded = false;
    counterElement.classList.remove('xrc-expanded');
    counterElement.classList.add('xrc-bubble');
    chrome.storage.local.set({ counterExpanded: false });
  }

  // Make element draggable
  function makeDraggable(element, bubbleContent) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    let hasMoved = false;
    let dragPrevented = false;

    const startDrag = (e) => {
      // For expanded mode, only allow dragging from header
      if (isExpanded) {
        const header = element.querySelector('.xrc-header');
        if (!header.contains(e.target) || e.target.classList.contains('xrc-minimize')) {
          return;
        }
      }

      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      element.classList.add('xrc-dragging');
    };

    element.addEventListener('mousedown', startDrag);

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
      }

      const newX = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, initialX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, initialY + dy));

      element.style.left = newX + 'px';
      element.style.top = newY + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.classList.remove('xrc-dragging');
        if (hasMoved) {
          savePosition();
          dragPrevented = true;
          setTimeout(() => { dragPrevented = false; }, 50);
        }
      }
    });

    // Click bubble to expand (only if not dragging)
    bubbleContent.addEventListener('click', (e) => {
      if (dragPrevented || hasMoved) {
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      expandCounter();
    });
  }

  function savePosition() {
    if (!counterElement) return;
    const rect = counterElement.getBoundingClientRect();
    chrome.storage.local.set({
      counterPosition: { left: rect.left, top: rect.top }
    });
  }

  function loadPosition() {
    chrome.storage.local.get(['counterPosition', 'counterExpanded']).then(data => {
      if (data.counterPosition && counterElement) {
        counterElement.style.left = data.counterPosition.left + 'px';
        counterElement.style.top = data.counterPosition.top + 'px';
        counterElement.style.right = 'auto';
        counterElement.style.bottom = 'auto';
      }
      // Restore expanded state
      if (data.counterExpanded) {
        expandCounter();
      }
    });
  }

  // Update counter display
  function updateDisplay() {
    if (!counterElement) return;

    const bubbleCountEl = document.getElementById('xrc-bubble-count');
    const totalEl = document.getElementById('xrc-total-count');
    const targetEl = document.getElementById('xrc-target-value');
    const progressFill = document.getElementById('xrc-progress-fill');
    const progressText = document.getElementById('xrc-progress-text');

    // Update bubble count
    if (bubbleCountEl) bubbleCountEl.textContent = currentCount;

    // Update panel count
    if (totalEl) totalEl.textContent = currentCount;
    if (targetEl) targetEl.textContent = dailyTarget;

    const percentage = Math.min(100, Math.round((currentCount / dailyTarget) * 100));
    if (progressFill) {
      progressFill.style.width = percentage + '%';
      progressFill.classList.remove('xrc-low', 'xrc-mid', 'xrc-high');
      if (percentage >= 100) {
        progressFill.classList.add('xrc-high');
      } else if (percentage >= 50) {
        progressFill.classList.add('xrc-mid');
      } else {
        progressFill.classList.add('xrc-low');
      }
    }
    if (progressText) progressText.textContent = percentage + '%';

    // Pulse animation
    if (totalEl) {
      totalEl.classList.add('xrc-pulse');
      setTimeout(() => totalEl.classList.remove('xrc-pulse'), 300);
    }
  }

  // Initialize
  function init() {
    chrome.runtime.sendMessage({ type: 'GET_COUNT' }, (response) => {
      if (response) {
        currentCount = response.total || 0;
        dailyTarget = response.target;
        isEnabled = response.enabled;

        if (isEnabled) {
          createCounter();
          updateDisplay();
        }
      }
    });
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'COUNTER_UPDATE') {
      currentCount = message.total || 0;
      updateDisplay();
    }

    if (message.type === 'COUNTER_RESET') {
      currentCount = 0;
      updateDisplay();
    }

    if (message.type === 'TOGGLE_COUNTER') {
      isEnabled = message.enabled;
      if (isEnabled) {
        createCounter();
        updateDisplay();
      } else if (counterElement) {
        counterElement.remove();
        counterElement = null;
      }
    }

    if (message.type === 'UPDATE_TARGET') {
      dailyTarget = message.target;
      updateDisplay();
    }
  });

  // Intercept fetch to detect tweet creation
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = args[0]?.toString?.() || args[0];
      if (typeof url === 'string') {
        const lowerUrl = url.toLowerCase();
        const isPost = args[1]?.method?.toUpperCase() === 'POST';

        if (isPost && response.ok && lowerUrl.includes('createtweet')) {
          setTimeout(() => {
            chrome.runtime.sendMessage({ type: 'TWEET_POSTED' });
          }, 100);
        }
      }
    } catch (e) {}

    return response;
  };

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._xrcMethod = method;
    this._xrcUrl = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', function() {
      try {
        if (this._xrcMethod?.toUpperCase() === 'POST' && this.status >= 200 && this.status < 300) {
          const url = this._xrcUrl?.toLowerCase() || '';
          if (url.includes('createtweet')) {
            chrome.runtime.sendMessage({ type: 'TWEET_POSTED' });
          }
        }
      } catch (e) {}
    });
    return originalXHRSend.apply(this, [body]);
  };

  // Wait for page ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
