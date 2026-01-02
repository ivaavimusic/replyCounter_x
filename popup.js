// X Reply Counter - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentMonth = new Date();
  let stats = {};
  let dailyTarget = 10;
  let todayCount = 0;

  // DOM Elements
  const todayCountEl = document.getElementById('todayCount');
  const todayTargetEl = document.getElementById('todayTarget');
  const progressFillEl = document.getElementById('progressFill');
  const progressPercentEl = document.getElementById('progressPercent');
  const progressMessageEl = document.getElementById('progressMessage');
  const dailyTargetInput = document.getElementById('dailyTarget');
  const saveTargetBtn = document.getElementById('saveTarget');
  const counterEnabledToggle = document.getElementById('counterEnabled');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const currentMonthEl = document.getElementById('currentMonth');
  const contributionGraphEl = document.getElementById('contributionGraph');
  const monthTotalEl = document.getElementById('monthTotal');
  const monthAvgEl = document.getElementById('monthAvg');
  const monthBestEl = document.getElementById('monthBest');
  const monthGoalsEl = document.getElementById('monthGoals');
  const exportCSVBtn = document.getElementById('exportCSV');
  const clearDataBtn = document.getElementById('clearData');
  const reminderEnabledToggle = document.getElementById('reminderEnabled');
  const reminderIntervalSelect = document.getElementById('reminderInterval');
  const reminderIntervalRow = document.getElementById('reminderIntervalRow');

  init();

  async function init() {
    const countResponse = await chrome.runtime.sendMessage({ type: 'GET_COUNT' });
    if (countResponse) {
      todayCount = countResponse.total || 0;
      dailyTarget = countResponse.target;

      dailyTargetInput.value = countResponse.target;
      counterEnabledToggle.checked = countResponse.enabled;

      updateProgressDisplay();
    }

    const statsResponse = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    if (statsResponse) {
      stats = statsResponse.stats || {};
      dailyTarget = statsResponse.target || 10;
    }

    // Load reminder settings
    const reminderResponse = await chrome.runtime.sendMessage({ type: 'GET_REMINDER_SETTINGS' });
    if (reminderResponse) {
      reminderEnabledToggle.checked = reminderResponse.enabled;
      reminderIntervalSelect.value = reminderResponse.interval.toString();
      reminderIntervalRow.style.opacity = reminderResponse.enabled ? '1' : '0.5';
      reminderIntervalSelect.disabled = !reminderResponse.enabled;
    }

    renderMonth();
    updateMonthlyStats();
  }

  function updateProgressDisplay() {
    todayCountEl.textContent = todayCount;
    todayTargetEl.textContent = dailyTarget;

    const percentage = Math.min(100, Math.round((todayCount / dailyTarget) * 100));
    progressFillEl.style.width = percentage + '%';
    progressPercentEl.textContent = percentage + '%';

    progressFillEl.classList.remove('progress-low', 'progress-mid', 'progress-high');

    if (percentage >= 100) {
      progressFillEl.classList.add('progress-high');
      progressMessageEl.textContent = 'Goal achieved! Great job!';
      progressMessageEl.className = 'progress-message message-success';
    } else if (percentage >= 50) {
      progressFillEl.classList.add('progress-mid');
      progressMessageEl.textContent = 'Halfway there, keep it up!';
      progressMessageEl.className = 'progress-message message-warning';
    } else if (percentage > 0) {
      progressFillEl.classList.add('progress-low');
      progressMessageEl.textContent = 'You got this!';
      progressMessageEl.className = 'progress-message message-info';
    } else {
      progressFillEl.classList.add('progress-low');
      progressMessageEl.textContent = 'Start posting to track progress';
      progressMessageEl.className = 'progress-message';
    }
  }

  function renderMonth() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthData = stats[monthKey] || {};

    contributionGraphEl.textContent = '';

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labelsRow = document.createElement('div');
    labelsRow.className = 'graph-labels';
    dayLabels.forEach(label => {
      const labelEl = document.createElement('span');
      labelEl.className = 'day-label';
      labelEl.textContent = label;
      labelsRow.appendChild(labelEl);
    });
    contributionGraphEl.appendChild(labelsRow);

    const gridEl = document.createElement('div');
    gridEl.className = 'graph-grid';

    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'graph-cell graph-empty';
      gridEl.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'graph-cell';

      const dayData = monthData[day.toString()];
      let count = 0;
      if (typeof dayData === 'number') {
        count = dayData;
      } else if (dayData && typeof dayData === 'object') {
        count = dayData.total || 0;
      }

      const level = getActivityLevel(count, dailyTarget);
      cell.classList.add(`graph-${level}`);

      cell.title = `${monthNames[month]} ${day}: ${count} posts`;
      cell.dataset.day = day;
      cell.dataset.count = count;

      gridEl.appendChild(cell);
    }

    contributionGraphEl.appendChild(gridEl);
  }

  function getActivityLevel(count, target) {
    if (count === 0) return 'none';
    const ratio = count / target;
    if (ratio >= 1) return 'high';
    if (ratio >= 0.5) return 'mid';
    return 'low';
  }

  function updateMonthlyStats() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthData = stats[monthKey] || {};
    const values = Object.values(monthData).map(v => {
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object') return v.total || 0;
      return 0;
    });

    const total = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? Math.round(total / values.length) : 0;
    const best = values.length > 0 ? Math.max(...values) : 0;
    const goalsHit = values.filter(v => v >= dailyTarget).length;

    monthTotalEl.textContent = total;
    monthAvgEl.textContent = avg;
    monthBestEl.textContent = best;
    monthGoalsEl.textContent = goalsHit;
  }

  // Event Listeners

  saveTargetBtn.addEventListener('click', async () => {
    const newTarget = parseInt(dailyTargetInput.value) || 10;
    if (newTarget < 1 || newTarget > 1000) {
      alert('Please enter a target between 1 and 1000');
      return;
    }

    await chrome.runtime.sendMessage({ type: 'SET_TARGET', target: newTarget });
    dailyTarget = newTarget;

    updateProgressDisplay();
    renderMonth();
    updateMonthlyStats();

    const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_TARGET', target: newTarget }).catch(() => {});
    });

    saveTargetBtn.textContent = 'Saved!';
    setTimeout(() => { saveTargetBtn.textContent = 'Save'; }, 1500);
  });

  counterEnabledToggle.addEventListener('change', async () => {
    const enabled = counterEnabledToggle.checked;
    await chrome.runtime.sendMessage({ type: 'SET_ENABLED', enabled });

    const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_COUNTER', enabled }).catch(() => {});
    });
  });

  // Reminder settings
  reminderEnabledToggle.addEventListener('change', async () => {
    const enabled = reminderEnabledToggle.checked;
    const interval = parseInt(reminderIntervalSelect.value);

    reminderIntervalRow.style.opacity = enabled ? '1' : '0.5';
    reminderIntervalSelect.disabled = !enabled;

    await chrome.runtime.sendMessage({
      type: 'SET_REMINDER',
      enabled,
      interval
    });
  });

  reminderIntervalSelect.addEventListener('change', async () => {
    if (!reminderEnabledToggle.checked) return;

    const interval = parseInt(reminderIntervalSelect.value);
    await chrome.runtime.sendMessage({
      type: 'SET_REMINDER',
      enabled: true,
      interval
    });
  });

  prevMonthBtn.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderMonth();
    updateMonthlyStats();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderMonth();
    updateMonthlyStats();
  });

  exportCSVBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_CSV' });
    if (!response || !response.stats) {
      alert('No data to export');
      return;
    }

    const csvData = generateCSV(response.stats, response.target);
    downloadCSV(csvData, 'x-reply-counter-data.csv');
  });

  function generateCSV(stats, target) {
    const rows = [['Date', 'Count', 'Target', 'Goal Achieved']];

    const months = Object.keys(stats).sort();

    months.forEach(monthKey => {
      const monthData = stats[monthKey];
      const [year, month] = monthKey.split('-');

      const days = Object.keys(monthData).sort((a, b) => parseInt(a) - parseInt(b));

      days.forEach(day => {
        const dayData = monthData[day];
        let count = 0;

        if (typeof dayData === 'number') {
          count = dayData;
        } else if (dayData && typeof dayData === 'object') {
          count = dayData.total || 0;
        }

        const date = `${year}-${month}-${day.padStart(2, '0')}`;
        const achieved = count >= target ? 'Yes' : 'No';
        rows.push([date, count, target, achieved]);
      });
    });

    return rows.map(row => row.join(',')).join('\n');
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  clearDataBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }

    await chrome.runtime.sendMessage({ type: 'CLEAR_STATS' });
    stats = {};
    todayCount = 0;

    updateProgressDisplay();
    renderMonth();
    updateMonthlyStats();

    const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'COUNTER_RESET' }).catch(() => {});
    });
  });
});
