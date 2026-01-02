// X Reply Counter - Background Service Worker

// Reminder messages
const REMINDER_MESSAGES = [
  { title: "Time to post!", message: "Your audience is waiting. Share something great!" },
  { title: "Gotta try harder!", message: "You're falling behind on your daily goal." },
  { title: "Post reminder", message: "Consistency is key. Time to engage!" },
  { title: "Don't forget to post!", message: "Keep your streak alive. Post something now!" },
  { title: "Your followers miss you", message: "It's been a while. Share your thoughts!" },
  { title: "Goal check", message: "How's your posting goal going? Time to catch up!" }
];

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['dailyTarget', 'counterEnabled', 'stats', 'reminderEnabled', 'reminderInterval']);

  if (!data.dailyTarget) {
    await chrome.storage.local.set({ dailyTarget: 10 });
  }
  if (data.counterEnabled === undefined) {
    await chrome.storage.local.set({ counterEnabled: true });
  }
  if (data.reminderEnabled === undefined) {
    await chrome.storage.local.set({ reminderEnabled: false });
  }
  if (!data.reminderInterval) {
    await chrome.storage.local.set({ reminderInterval: 60 });
  }
  if (!data.stats) {
    await chrome.storage.local.set({ stats: {} });
  }

  setupDailyResetAlarm();
  setupReminderAlarm();
});

// Set up alarm for daily reset at midnight
function setupDailyResetAlarm() {
  chrome.alarms.clear('dailyReset');

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  chrome.alarms.create('dailyReset', {
    delayInMinutes: msUntilMidnight / 60000,
    periodInMinutes: 24 * 60
  });
}

// Set up reminder alarm
async function setupReminderAlarm() {
  chrome.alarms.clear('postReminder');

  const data = await chrome.storage.local.get(['reminderEnabled', 'reminderInterval']);

  if (data.reminderEnabled) {
    chrome.alarms.create('postReminder', {
      delayInMinutes: data.reminderInterval || 60,
      periodInMinutes: data.reminderInterval || 60
    });
  }
}

// Show reminder notification
async function showReminderNotification() {
  const data = await chrome.storage.local.get(['todayCount', 'dailyTarget']);
  const total = data.todayCount || 0;
  const target = data.dailyTarget || 10;

  // Don't show if goal already achieved
  if (total >= target) {
    return;
  }

  const remaining = target - total;
  const randomMessage = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: randomMessage.title,
    message: `${randomMessage.message}\n${remaining} more to reach your goal!`,
    priority: 2
  });
}

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    resetDailyCounter();
  }
  if (alarm.name === 'postReminder') {
    showReminderNotification();
  }
});

// Handle notification click - open X
chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'https://x.com' });
});

// Reset daily counter
async function resetDailyCounter() {
  await chrome.storage.local.set({ todayCount: 0 });

  const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, { type: 'COUNTER_RESET' }).catch(() => {});
  });
}

// Get today's date key
function getTodayKey() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Get month key
function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Increment counter
async function incrementCounter() {
  const todayKey = getTodayKey();
  const monthKey = getMonthKey();
  const dayOfMonth = new Date().getDate().toString();

  const data = await chrome.storage.local.get(['todayCount', 'todayDate', 'stats']);

  let todayCount = data.todayCount || 0;
  const todayDate = data.todayDate;
  let stats = data.stats || {};

  // Reset if it's a new day
  if (todayDate !== todayKey) {
    todayCount = 0;
  }

  todayCount++;

  // Update monthly stats
  if (!stats[monthKey]) {
    stats[monthKey] = {};
  }

  stats[monthKey][dayOfMonth] = todayCount;

  await chrome.storage.local.set({
    todayCount,
    todayDate: todayKey,
    stats
  });

  // Notify content scripts
  const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'COUNTER_UPDATE',
      total: todayCount
    }).catch(() => {});
  });

  return { total: todayCount };
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_COUNT') {
    chrome.storage.local.get(['todayCount', 'todayDate', 'dailyTarget', 'counterEnabled', 'stats']).then(data => {
      const todayKey = getTodayKey();
      const monthKey = getMonthKey();
      const dayOfMonth = new Date().getDate().toString();
      let count = data.todayCount || 0;
      let stats = data.stats || {};

      // Reset if it's a new day
      if (data.todayDate !== todayKey) {
        count = 0;
        chrome.storage.local.set({ todayCount: 0, todayDate: todayKey });
      } else {
        // Sync with stats if they differ (stats is source of truth)
        const statsCount = stats[monthKey]?.[dayOfMonth] || 0;
        if (statsCount > count) {
          count = statsCount;
          chrome.storage.local.set({ todayCount: count });
        }
      }

      sendResponse({
        total: count,
        target: data.dailyTarget || 10,
        enabled: data.counterEnabled !== false
      });
    });
    return true;
  }

  if (message.type === 'GET_STATS') {
    chrome.storage.local.get(['stats', 'dailyTarget']).then(data => {
      sendResponse({
        stats: data.stats || {},
        target: data.dailyTarget || 10
      });
    });
    return true;
  }

  if (message.type === 'GET_REMINDER_SETTINGS') {
    chrome.storage.local.get(['reminderEnabled', 'reminderInterval']).then(data => {
      sendResponse({
        enabled: data.reminderEnabled || false,
        interval: data.reminderInterval || 60
      });
    });
    return true;
  }

  if (message.type === 'SET_TARGET') {
    chrome.storage.local.set({ dailyTarget: message.target }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SET_ENABLED') {
    chrome.storage.local.set({ counterEnabled: message.enabled }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SET_REMINDER') {
    chrome.storage.local.set({
      reminderEnabled: message.enabled,
      reminderInterval: message.interval
    }).then(() => {
      setupReminderAlarm();
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'TWEET_POSTED') {
    incrementCounter().then(counts => {
      sendResponse(counts);
    });
    return true;
  }

  if (message.type === 'EXPORT_CSV') {
    chrome.storage.local.get(['stats', 'dailyTarget']).then(data => {
      sendResponse({
        stats: data.stats || {},
        target: data.dailyTarget || 10
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_STATS') {
    chrome.storage.local.set({ stats: {}, todayCount: 0 }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Monitor network requests for tweet creation
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.method === 'POST' && details.statusCode >= 200 && details.statusCode < 300) {
      const url = details.url.toLowerCase();

      if (url.includes('createtweet')) {
        await incrementCounter();
      }
    }
  },
  { urls: ['*://twitter.com/*', '*://x.com/*', '*://api.twitter.com/*', '*://api.x.com/*'] }
);
