// DOM元素获取
const mainTimerDisplay = document.getElementById("main-timer-display");
const randomTimerDisplay = document.getElementById("random-timer-display");
const tenSecondTimerDisplay = document.getElementById(
  "ten-second-timer-display"
);
const tenSecondTimerCard = document.getElementById("ten-second-timer-card");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");

// 设置相关的DOM元素
const settingsButton = document.getElementById("settings-button");
const settingsModal = document.getElementById("settings-modal");
const closeSettingsButton = document.getElementById("close-settings");
const saveSettingsButton = document.getElementById("save-settings");
const cancelSettingsButton = document.getElementById("cancel-settings");
const mainDurationInput = document.getElementById("main-duration");
const randomMinInput = document.getElementById("random-min");
const randomMaxInput = document.getElementById("random-max");
const restDurationInput = document.getElementById("rest-duration");

// 统计功能相关的DOM元素
const statsButton = document.getElementById("stats-button");
const statsModal = document.getElementById("stats-modal");
const closeStatsButton = document.getElementById("close-stats");
const closeStatsFooterButton = document.getElementById("close-stats-footer");
const exportDataButton = document.getElementById("export-data");
const resetStatsButton = document.getElementById("reset-stats");

// 成就动画模态框元素
const achievementModal = document.getElementById("achievement-modal");
const achievementTitle = document.getElementById("achievement-title");
const achievementDescription = document.getElementById("achievement-description");

// 设置配置的键名
const SETTINGS_KEY = "randomTimerSettings";
// 统计数据的键名
const STATS_KEY = "focusTimerStats";

// 默认设置值
const defaultSettings = {
  mainDuration: 90,      // 主流程时间（分钟）
  randomMin: 3,          // 随机间隔最小时间（分钟）
  randomMax: 5,          // 随机间隔最大时间（分钟）
  restDuration: 10       // 休息时间（秒）
};

// 当前设置（初始化为默认值，稍后会从localStorage加载）
let currentSettings = { ...defaultSettings };

// 统计数据结构
let statsData = {
  totalFocusTime: 0,        // 总专注时间（毫秒）
  totalSessions: 0,         // 总专注次数
  dailyStats: {},           // 日统计数据 {date: {duration, sessions, timeSegments}}
  weeklyStats: {},          // 周统计数据 {weekStart: {duration, sessions}}
  monthlyStats: {},         // 月统计数据 {month: {duration, sessions}}
  achievements: {},         // 解锁的成就 {achievementId: unlockDate}
  lastSaveDate: null,       // 最后保存日期
  currentSessionStart: null // 当前专注会话开始时间
};

// 成就定义
const achievementDefinitions = [
  {
    id: 'first_focus',
    name: '专注新手',
    description: '完成第一次专注训练',
    icon: '🌱',
    condition: (stats) => stats.totalSessions >= 1
  },
  {
    id: 'focus_10',
    name: '专注小能手',
    description: '完成10次专注训练',
    icon: '⭐',
    condition: (stats) => stats.totalSessions >= 10
  },
  {
    id: 'focus_50',
    name: '专注达人',
    description: '完成50次专注训练',
    icon: '🏆',
    condition: (stats) => stats.totalSessions >= 50
  },
  {
    id: 'focus_100',
    name: '专注大师',
    description: '完成100次专注训练',
    icon: '👑',
    condition: (stats) => stats.totalSessions >= 100
  },
  {
    id: 'hour_marathon',
    name: '一小时马拉松',
    description: '单次专注超过60分钟',
    icon: '🔥',
    condition: (stats) => {
      return Object.values(stats.dailyStats).some(day => 
        day.sessions && day.sessions.some(session => session.duration >= 60 * 60 * 1000)
      );
    }
  },
  {
    id: 'weekly_warrior',
    name: '每周勇士',
    description: '连续7天每天至少专注30分钟',
    icon: '⚔️',
    condition: (stats) => {
      const today = new Date();
      let consecutiveDays = 0;
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = formatDate(date);
        const dayStats = stats.dailyStats[dateStr];
        if (dayStats && dayStats.duration >= 30 * 60 * 1000) {
          consecutiveDays++;
        } else {
          break;
        }
      }
      return consecutiveDays >= 7;
    }
  },
  {
    id: 'morning_person',
    name: '早起鸟儿',
    description: '在早上6-9点之间完成5次专注',
    icon: '🌅',
    condition: (stats) => {
      let morningCount = 0;
      Object.values(stats.dailyStats).forEach(day => {
        if (day.timeSegments) {
          for (let hour = 6; hour <= 8; hour++) {
            if (day.timeSegments[hour] && day.timeSegments[hour].sessions > 0) {
              morningCount += day.timeSegments[hour].sessions;
            }
          }
        }
      });
      return morningCount >= 5;
    }
  },
  {
    id: 'night_owl',
    name: '夜猫子',
    description: '在晚上20-23点之间完成5次专注',
    icon: '🦉',
    condition: (stats) => {
      let nightCount = 0;
      Object.values(stats.dailyStats).forEach(day => {
        if (day.timeSegments) {
          for (let hour = 20; hour <= 22; hour++) {
            if (day.timeSegments[hour] && day.timeSegments[hour].sessions > 0) {
              nightCount += day.timeSegments[hour].sessions;
            }
          }
        }
      });
      return nightCount >= 5;
    }
  }
];

// 当前图表实例存储
let chartInstances = {
  daily: null,
  weekly: null,
  monthly: null,
  heatmap: null
};

// --- 统计数据管理函数 ---

// 格式化日期为YYYY-MM-DD格式
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 格式化周开始日期（周一）
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
  d.setDate(diff);
  return formatDate(d);
}

// 格式化月份为YYYY-MM格式
function formatMonth(date) {
  return date.toISOString().substring(0, 7);
}

// 保存统计数据到localStorage
function saveStatsData() {
  try {
    statsData.lastSaveDate = new Date().toISOString();
    localStorage.setItem(STATS_KEY, JSON.stringify(statsData));
    console.log("统计数据已保存");
  } catch (e) {
    console.error("保存统计数据失败:", e);
  }
}

// 从localStorage加载统计数据
function loadStatsData() {
  try {
    const savedStats = localStorage.getItem(STATS_KEY);
    if (savedStats) {
      const parsedStats = JSON.parse(savedStats);
      statsData = { ...statsData, ...parsedStats };
      console.log("统计数据已加载:", statsData);
    } else {
      console.log("未找到保存的统计数据，使用默认数据");
    }
  } catch (e) {
    console.error("加载统计数据失败:", e);
    statsData = {
      totalFocusTime: 0,
      totalSessions: 0,
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
      achievements: {},
      lastSaveDate: null,
      currentSessionStart: null
    };
  }
}

// 记录专注会话开始
function startFocusSession() {
  statsData.currentSessionStart = Date.now();
  console.log("专注会话开始:", new Date(statsData.currentSessionStart));
}

// 记录专注会话结束并更新统计
function endFocusSession() {
  if (!statsData.currentSessionStart) {
    console.log("没有进行中的专注会话");
    return;
  }

  const sessionDuration = Date.now() - statsData.currentSessionStart;
  const sessionDate = new Date(statsData.currentSessionStart);
  const dateStr = formatDate(sessionDate);
  const weekStart = getWeekStart(sessionDate);
  const monthStr = formatMonth(sessionDate);
  const hour = sessionDate.getHours();

  // 更新总统计
  statsData.totalFocusTime += sessionDuration;
  statsData.totalSessions += 1;

  // 更新日统计
  if (!statsData.dailyStats[dateStr]) {
    statsData.dailyStats[dateStr] = {
      duration: 0,
      sessions: [],
      timeSegments: {}
    };
  }
  
  statsData.dailyStats[dateStr].duration += sessionDuration;
  statsData.dailyStats[dateStr].sessions.push({
    start: statsData.currentSessionStart,
    duration: sessionDuration
  });

  // 更新时段统计
  if (!statsData.dailyStats[dateStr].timeSegments[hour]) {
    statsData.dailyStats[dateStr].timeSegments[hour] = {
      duration: 0,
      sessions: 0
    };
  }
  statsData.dailyStats[dateStr].timeSegments[hour].duration += sessionDuration;
  statsData.dailyStats[dateStr].timeSegments[hour].sessions += 1;

  // 更新周统计
  if (!statsData.weeklyStats[weekStart]) {
    statsData.weeklyStats[weekStart] = { duration: 0, sessions: 0 };
  }
  statsData.weeklyStats[weekStart].duration += sessionDuration;
  statsData.weeklyStats[weekStart].sessions += 1;

  // 更新月统计
  if (!statsData.monthlyStats[monthStr]) {
    statsData.monthlyStats[monthStr] = { duration: 0, sessions: 0 };
  }
  statsData.monthlyStats[monthStr].duration += sessionDuration;
  statsData.monthlyStats[monthStr].sessions += 1;

  console.log(`专注会话结束，时长: ${Math.round(sessionDuration / 1000 / 60)}分钟`);
  
  // 重置当前会话
  statsData.currentSessionStart = null;
  
  // 保存数据
  saveStatsData();
  
  // 检查成就
  checkAchievements();
  
  // 如果统计面板打开，刷新显示
  if (!statsModal.classList.contains('hidden')) {
    updateStatsDisplay();
  }
}

// 检查并解锁成就
function checkAchievements() {
  achievementDefinitions.forEach(achievement => {
    // 如果成就尚未解锁且满足条件
    if (!statsData.achievements[achievement.id] && achievement.condition(statsData)) {
      unlockAchievement(achievement);
    }
  });
}

// 解锁成就并显示动画
function unlockAchievement(achievement) {
  // 记录解锁时间
  statsData.achievements[achievement.id] = new Date().toISOString();
  
  // 保存数据
  saveStatsData();
  
  // 显示解锁动画
  showAchievementUnlock(achievement);
  
  console.log(`成就解锁: ${achievement.name}`);
}

// 显示成就解锁动画
function showAchievementUnlock(achievement) {
  achievementTitle.textContent = achievement.name;
  achievementDescription.textContent = achievement.description;
  
  // 更新图标
  const iconElement = achievementModal.querySelector('.achievement-icon');
  iconElement.textContent = achievement.icon;
  
  // 显示模态框
  achievementModal.classList.remove('hidden');
  
  // 3秒后自动关闭
  setTimeout(() => {
    achievementModal.classList.add('hidden');
  }, 3000);
}

// --- 格式化工具函数 ---

// 将毫秒转换为可读的时间格式
function formatDuration(milliseconds) {
  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
}

// 将毫秒转换为小时数（保留一位小数）
function formatDurationHours(milliseconds) {
  return (milliseconds / (1000 * 60 * 60)).toFixed(1);
}

// 音频资源初始化
const soundA = new Audio("sounds/soundA.mp3");
soundA.preload = "auto"; // 提示浏览器预加载音频
const soundB = new Audio("sounds/soundB.mp3");
soundB.preload = "auto"; // 提示浏览器预加载音频
const soundC = new Audio("sounds/soundC.mp3");
soundC.preload = "auto"; // 提示浏览器预加载音频

// 桌面通知功能
let notificationPermission = "default";

// 检查浏览器是否支持通知
function checkNotificationSupport() {
  if (!("Notification" in window)) {
    console.warn("此浏览器不支持桌面通知");
    return false;
  }
  notificationPermission = Notification.permission;
  console.log("通知权限状态:", notificationPermission);
  return true;
}

// 请求通知权限
async function requestNotificationPermission() {
  if (!checkNotificationSupport()) {
    return false;
  }

  if (notificationPermission === "granted") {
    console.log("通知权限已授予");
    return true;
  }

  if (notificationPermission === "denied") {
    console.warn("通知权限被拒绝，无法发送桌面通知");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    console.log("通知权限请求结果:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("请求通知权限失败:", error);
    return false;
  }
}

// 发送桌面通知
function sendDesktopNotification(title, body, options = {}) {
  if (notificationPermission !== "granted") {
    console.warn("没有通知权限，无法发送桌面通知");
    return null;
  }

  const defaultOptions = {
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01aDNWOGgydjRoM2wtMyAzeiIvPgo8L3N2Zz4KPC9zdmc+", // 简单的SVG图标
    badge:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM2NjdlZWEiLz4KPC9zdmc+",
    tag: "random-timer-notification",
    requireInteraction: false, // 通知会自动消失
    silent: false, // 允许通知音效
  };

  const notificationOptions = { ...defaultOptions, ...options };

  try {
    const notification = new Notification(title, {
      body: body,
      ...notificationOptions,
    });

    // 设置通知点击事件
    notification.onclick = function () {
      window.focus(); // 聚焦到浏览器窗口
      notification.close();
    };

    // 自动关闭通知（5秒后）
    setTimeout(() => {
      notification.close();
    }, 5000);

    console.log("桌面通知已发送:", title);
    return notification;
  } catch (error) {
    console.error("发送桌面通知失败:", error);
    return null;
  }
}

// 计时器ID存储变量
let mainTimerId = null;
let randomTimerId = null;
let tenSecondTimerId = null;

// LocalStorage 键名
const APP_STATE_KEY = "randomTimerAppState";

// 应用状态变量 (用于保存和恢复)
let appState = {
  mainTargetEndTime: null,
  randomTargetEndTime: null,
  tenSecondTargetEndTime: null,
  currentCyclePhase: null, // 'random', 'ten_second'
  isAppRunning: false,
};

// --- LocalStorage 辅助函数 ---
function saveAppStateToLocalStorage() {
  try {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
    console.log("应用状态已保存: ", appState);
  } catch (e) {
    console.error("保存应用状态到localStorage失败: ", e);
  }
}

function clearAppStateFromLocalStorage() {
  try {
    localStorage.removeItem(APP_STATE_KEY);
    console.log("应用状态已从localStorage清除。");
  } catch (e) {
    console.error("从localStorage清除应用状态失败: ", e);
  }
}

// --- 核心计时器逻辑 ---

// 工具函数：数字补零
function pad(num) {
  return num.toString().padStart(2, "0");
}

// 工具函数：根据设置获取随机时间（毫秒）
function getRandomMillisecondsForCycle() {
  const minMinutes = currentSettings.randomMin;
  const maxMinutes = currentSettings.randomMax;
  const randomMinutes = Math.random() * (maxMinutes - minMinutes) + minMinutes;
  return Math.floor(randomMinutes * 60 * 1000); // 转换为毫秒
}

// 格式化分钟秒显示函数
function formatMinuteSecond(minutes, seconds) {
  return `${pad(minutes)}:${pad(seconds)}`;
}

function startTimers(isResuming = false, resumeData = null) {
  // 如果是首次启动（不是恢复），请求通知权限
  if (!isResuming) {
    requestNotificationPermission();
  }

  if (!isResuming) {
    console.log("主流程开始 (新启动)...");
    const mainDuration = currentSettings.mainDuration * 60 * 1000; // 使用设置中的主流程时间
    appState.mainTargetEndTime = Date.now() + mainDuration;
    appState.isAppRunning = true;
    appState.currentCyclePhase = null; // 初始时没有子循环
    
    // 记录专注会话开始
    startFocusSession();
  } else if (resumeData && resumeData.mainTargetEndTime) {
    console.log("主流程恢复中...");
    appState.mainTargetEndTime = resumeData.mainTargetEndTime;
    appState.isAppRunning = true;
    // currentCyclePhase 会在后续恢复逻辑中设置
    
    // 如果有进行中的专注会话，恢复记录
    if (statsData.currentSessionStart) {
      console.log("恢复专注会话记录");
    }
  } else {
    console.error("启动计时器参数错误或恢复数据不足");
    return;
  }

  startButton.disabled = true;
  resetButton.disabled = false;

  // 清除任何可能残留的主计时器
  if (mainTimerId) clearInterval(mainTimerId);

  mainTimerId = countdown(
    appState.mainTargetEndTime,
    function (ts) {
      if (ts.value >= 0) {
        console.log("主流程结束 - 时间到");
        
        // 结束专注会话并记录统计数据
        endFocusSession();
        
        soundC.play();
        mainTimerDisplay.innerHTML = "流程完成！";

        // 发送主流程完成通知
        sendDesktopNotification(
          "🎉 专注训练完成！",
          `${currentSettings.mainDuration}分钟的专注训练已圆满结束，恭喜您！`,
          { requireInteraction: true }
        );

        appState.isAppRunning = false;
        clearAppStateFromLocalStorage();
        resetAllInternals(true); // 只重置内部变量和UI，不重复清除localStorage
        return;
      }
      const totalMinutes = ts.hours * 60 + ts.minutes;
      mainTimerDisplay.innerHTML = formatMinuteSecond(totalMinutes, ts.seconds);
    },
    countdown.HOURS | countdown.MINUTES | countdown.SECONDS
  );
  console.log(
    `主计时器已启动/恢复 (ID: ${mainTimerId}, 结束于: ${new Date(
      appState.mainTargetEndTime
    ).toLocaleTimeString()})`
  );

  if (!isResuming) {
    startRandomIntervalTimer();
    saveAppStateToLocalStorage(); // 仅在新启动时保存，恢复时由loadAndResumeAppState处理后续子循环和保存
  }
}

function startRandomIntervalTimer(isResuming = false, resumeTargetTime = null) {
  if (!appState.isAppRunning || mainTimerId === null) {
    console.log("主计时器未运行，不启动随机间隔计时器。");
    return;
  }

  if (randomTimerId) {
    clearInterval(randomTimerId);
    randomTimerId = null;
  }

  if (isResuming && resumeTargetTime) {
    appState.randomTargetEndTime = resumeTargetTime;
    console.log(
      `恢复随机间隔计时器 (将结束于: ${new Date(
        appState.randomTargetEndTime
      ).toLocaleTimeString()})`
    );
  } else {
    const randomMs = getRandomMillisecondsForCycle();
    appState.randomTargetEndTime = Date.now() + randomMs;
    console.log(
      `启动新的随机间隔计时器 (将持续 ${randomMs / 1000} 秒, 结束于: ${new Date(
        appState.randomTargetEndTime
      ).toLocaleTimeString()})`
    );
  }

  appState.currentCyclePhase = "random";
  appState.tenSecondTargetEndTime = null; // 清除可能存在的10秒计时器目标时间
  randomTimerDisplay.innerHTML = formatMinuteSecond(
    Math.floor((appState.randomTargetEndTime - Date.now()) / 60000),
    Math.floor(((appState.randomTargetEndTime - Date.now()) % 60000) / 1000)
  );

  randomTimerId = countdown(
    appState.randomTargetEndTime,
    function (ts) {
      if (ts.value >= 0) {
        console.log(`随机间隔计时器 (ID: ${randomTimerId}) 结束。播放声音A。`);

        // 计算这次专注的时长
        const focusDurationMs =
          Date.now() -
          (appState.randomTargetEndTime - getRandomMillisecondsForCycle());
        const focusMinutes = Math.floor(focusDurationMs / 60000);
        const focusSeconds = Math.floor((focusDurationMs % 60000) / 1000);

        // 发送桌面通知
        sendDesktopNotification("⏰ 间隔", `放空${currentSettings.restDuration}秒`, {
          requireInteraction: false,
          icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiNmZjk1MDAiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptMS0xM2gtMnY2bDUuMjUgMy4xNS43NS0xLjIzLTQuNS0yLjY3VjdoLTV6Ii8+Cjwvc3ZnPgo8L3N2Zz4=",
        });

        soundA.currentTime = 0;
        soundA.play();
        randomTimerDisplay.innerHTML = "--:--";
        if (randomTimerId) {
          clearInterval(randomTimerId);
          randomTimerId = null;
        }
        appState.randomTargetEndTime = null;
        startTenSecondPrepTimer();
        saveAppStateToLocalStorage();
        return;
      }
      randomTimerDisplay.innerHTML = formatMinuteSecond(ts.minutes, ts.seconds);
    },
    countdown.MINUTES | countdown.SECONDS
  );
  if (!isResuming) saveAppStateToLocalStorage(); // 恢复时，保存由更高层函数处理
  console.log(`随机间隔计时器已启动/恢复 (ID: ${randomTimerId})`);
}

function startTenSecondPrepTimer(isResuming = false, resumeTargetTime = null) {
  if (!appState.isAppRunning || mainTimerId === null) {
    console.log("主计时器未运行，不启动10秒准备计时器。");
    if (tenSecondTimerCard) tenSecondTimerCard.classList.add("hidden");
    return;
  }

  if (tenSecondTimerId) {
    clearInterval(tenSecondTimerId);
    tenSecondTimerId = null;
  }

  if (isResuming && resumeTargetTime) {
    appState.tenSecondTargetEndTime = resumeTargetTime;
    console.log(
      `恢复10秒准备计时器 (将结束于: ${new Date(
        appState.tenSecondTargetEndTime
      ).toLocaleTimeString()})`
    );
  } else {
    appState.tenSecondTargetEndTime = Date.now() + currentSettings.restDuration * 1000; // 使用设置中的休息时间
    console.log(
      `启动${currentSettings.restDuration}秒准备计时器 (将结束于: ${new Date(
        appState.tenSecondTargetEndTime
      ).toLocaleTimeString()})`
    );
  }

  appState.currentCyclePhase = "ten_second";
  appState.randomTargetEndTime = null; // 清除随机计时器目标时间
  tenSecondTimerCard.classList.remove("hidden");
  tenSecondTimerDisplay.innerHTML = Math.max(
    0,
    Math.floor((appState.tenSecondTargetEndTime - Date.now()) / 1000)
  ).toString();

  tenSecondTimerId = countdown(
    appState.tenSecondTargetEndTime,
    function (ts) {
      if (ts.value >= 0) {
        console.log(
          `10秒准备计时器 (ID: ${tenSecondTimerId}) 结束。播放声音B。`
        );
        soundB.play();
        tenSecondTimerCard.classList.add("hidden");
        tenSecondTimerDisplay.innerHTML = currentSettings.restDuration.toString();
        if (tenSecondTimerId) {
          clearInterval(tenSecondTimerId);
          tenSecondTimerId = null;
        }
        appState.tenSecondTargetEndTime = null;
        startRandomIntervalTimer();
        saveAppStateToLocalStorage();
        return;
      }
      tenSecondTimerDisplay.innerHTML = ts.seconds.toString();
    },
    countdown.SECONDS
  );
  if (!isResuming) saveAppStateToLocalStorage();
  console.log(`10秒准备计时器已启动/恢复 (ID: ${tenSecondTimerId})`);
}

function resetAllInternals(updateUI = true) {
  // 清除所有计时器
  if (mainTimerId) {
    clearInterval(mainTimerId);
    mainTimerId = null;
  }
  if (randomTimerId) {
    clearInterval(randomTimerId);
    randomTimerId = null;
  }
  if (tenSecondTimerId) {
    clearInterval(tenSecondTimerId);
    tenSecondTimerId = null;
  }

  // 重置应用状态
  appState.mainTargetEndTime = null;
  appState.randomTargetEndTime = null;
  appState.tenSecondTargetEndTime = null;
  appState.currentCyclePhase = null;
  appState.isAppRunning = false;

  // 停止并重置音频
  soundA.pause();
  soundA.currentTime = 0;
  soundB.pause();
  soundB.currentTime = 0;
  // soundC is handled by its own end or if main timer is cleared elsewhere

  // 更新UI显示
  if (updateUI) {
    // 使用设置中的值更新显示
    mainTimerDisplay.innerHTML = formatMinuteSecond(currentSettings.mainDuration, 0);
    randomTimerDisplay.innerHTML = "--:--";
    tenSecondTimerDisplay.innerHTML = currentSettings.restDuration.toString();
    if (tenSecondTimerCard) tenSecondTimerCard.classList.add("hidden");
    startButton.disabled = false;
    resetButton.disabled = true;
  }
  
  console.log("内部状态和计时器已重置。");
}

function resetAll() {
  console.log("执行全局重置...");
  
  // 如果有进行中的专注会话，先结束并记录
  if (statsData.currentSessionStart && appState.isAppRunning) {
    endFocusSession();
  }
  
  resetAllInternals(true); // 重置内部状态和UI
  clearAppStateFromLocalStorage(); // 从localStorage清除状态
  console.log("全局重置完成。");
}

function loadAndResumeAppState() {
  let storedStateString;
  try {
    storedStateString = localStorage.getItem(APP_STATE_KEY);
  } catch (e) {
    console.error("读取localStorage失败: ", e);
    resetAll();
    return;
  }

  if (!storedStateString) {
    console.log("未找到已保存的应用状态，执行初始重置。");
    resetAll();
    return;
  }

  let loadedState;
  try {
    loadedState = JSON.parse(storedStateString);
  } catch (e) {
    console.error("解析已保存的应用状态失败: ", e);
    clearAppStateFromLocalStorage(); // 清理损坏的状态
    resetAll();
    return;
  }

  if (
    !loadedState ||
    !loadedState.isAppRunning ||
    !loadedState.mainTargetEndTime
  ) {
    console.log("无效或非运行状态，执行初始重置。");
    clearAppStateFromLocalStorage(); // 确保旧的无效状态被清除
    resetAll();
    return;
  }

  console.log("找到已保存的应用状态: ", loadedState);
  appState = { ...appState, ...loadedState };

  const now = Date.now();

  // 检查主计时器是否已过期
  if (appState.mainTargetEndTime <= now) {
    console.log("主计时器在页面关闭期间已到期。");
    mainTimerDisplay.innerHTML = "流程已在您离开时完成！";
    // 尝试播放 soundC，如果浏览器因无交互而阻止，则静默失败
    soundC
      .play()
      .catch((e) => console.warn("恢复时播放soundC失败 (可能无用户交互):", e));
    clearAppStateFromLocalStorage();
    resetAllInternals(true);
    startButton.disabled = true;
    resetButton.disabled = false;
    return;
  }

  // 恢复主计时器
  console.log("尝试恢复主计时器...");
  startTimers(true, { mainTargetEndTime: appState.mainTargetEndTime });

  // 根据保存的阶段恢复子计时器
  if (appState.currentCyclePhase === "random" && appState.randomTargetEndTime) {
    if (appState.randomTargetEndTime > now) {
      // 还在进行中
      console.log("尝试恢复随机间隔计时器...");
      startRandomIntervalTimer(true, appState.randomTargetEndTime);
    } else {
      // 已过期
      console.log(
        "随机间隔在页面关闭期间已到期。不播放声音A，直接启动10秒准备。"
      );
      // 不尝试播放 soundA.play();
      startTenSecondPrepTimer();
    }
  } else if (
    appState.currentCyclePhase === "ten_second" &&
    appState.tenSecondTargetEndTime
  ) {
    if (appState.tenSecondTargetEndTime > now) {
      // 还在进行中
      console.log("尝试恢复10秒准备计时器...");
      startTenSecondPrepTimer(true, appState.tenSecondTargetEndTime);
    } else {
      // 已过期
      console.log(
        "10秒准备在页面关闭期间已到期。不播放声音B，直接启动随机间隔。"
      );
      // 不尝试播放 soundB.play();
      startRandomIntervalTimer();
    }
  } else {
    console.log("未找到有效子循环阶段或时间，启动新的随机间隔。");
    startRandomIntervalTimer();
  }
  saveAppStateToLocalStorage();
}

// --- 设置相关函数 ---
// 保存设置到localStorage
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    console.log("设置已保存:", currentSettings);
  } catch (e) {
    console.error("保存设置失败:", e);
  }
}

// 从localStorage加载设置
function loadSettings() {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      currentSettings = { ...defaultSettings, ...parsedSettings };
      console.log("已加载保存的设置:", currentSettings);
    } else {
      console.log("使用默认设置");
    }
  } catch (e) {
    console.error("加载设置失败:", e);
    currentSettings = { ...defaultSettings };
  }
}

// 打开设置模态框
function openSettingsModal() {
  // 将当前设置值填充到输入框
  mainDurationInput.value = currentSettings.mainDuration;
  randomMinInput.value = currentSettings.randomMin;
  randomMaxInput.value = currentSettings.randomMax;
  restDurationInput.value = currentSettings.restDuration;
  
  // 显示模态框
  settingsModal.classList.remove("hidden");
}

// 关闭设置模态框
function closeSettingsModal() {
  settingsModal.classList.add("hidden");
}

// 保存设置并关闭模态框
function saveAndCloseSettings() {
  // 获取输入值
  const mainDuration = parseFloat(mainDurationInput.value);
  const randomMin = parseFloat(randomMinInput.value);
  const randomMax = parseFloat(randomMaxInput.value);
  const restDuration = parseInt(restDurationInput.value);
  
  // 验证输入
  if (mainDuration < 1 || mainDuration > 180) {
    alert("主流程时间必须在1-180分钟之间");
    return;
  }
  
  if (randomMin < 1 || randomMin > 30 || randomMax < 1 || randomMax > 30) {
    alert("随机间隔时间必须在1-30分钟之间");
    return;
  }
  
  if (randomMin > randomMax) {
    alert("最小间隔时间不能大于最大间隔时间");
    return;
  }
  
  if (restDuration < 5 || restDuration > 60) {
    alert("休息时间必须在5-60秒之间");
    return;
  }
  
  // 更新设置
  currentSettings = {
    mainDuration,
    randomMin,
    randomMax,
    restDuration
  };
  
  // 保存设置
  saveSettings();
  
  // 如果当前没有运行计时器，更新显示
  if (!appState.isAppRunning) {
    mainTimerDisplay.innerHTML = formatMinuteSecond(currentSettings.mainDuration, 0);
    tenSecondTimerDisplay.innerHTML = currentSettings.restDuration.toString();
  }
  
  // 关闭模态框
  closeSettingsModal();
  
  console.log("设置已更新:", currentSettings);
}

// --- 事件监听器 ---
startButton.addEventListener("click", () => startTimers(false));
resetButton.addEventListener("click", resetAll);

// 设置相关的事件监听器
settingsButton.addEventListener("click", openSettingsModal);
closeSettingsButton.addEventListener("click", closeSettingsModal);
cancelSettingsButton.addEventListener("click", closeSettingsModal);
saveSettingsButton.addEventListener("click", saveAndCloseSettings);

// 统计功能相关的事件监听器
statsButton.addEventListener("click", openStatsModal);
closeStatsButton.addEventListener("click", closeStatsModal);
closeStatsFooterButton.addEventListener("click", closeStatsModal);
exportDataButton.addEventListener("click", exportStatsData);
resetStatsButton.addEventListener("click", resetStatsData);

// 统计标签页切换事件
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', function() {
    const tabName = this.getAttribute('data-tab');
    switchStatsTab(tabName);
  });
});

// 点击模态框外部关闭
settingsModal.addEventListener("click", function(e) {
  if (e.target === settingsModal) {
    closeSettingsModal();
  }
});

// 点击统计模态框外部关闭
statsModal.addEventListener("click", function(e) {
  if (e.target === statsModal) {
    closeStatsModal();
  }
});

// ESC键关闭模态框
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    if (!settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
    }
    if (!statsModal.classList.contains("hidden")) {
      closeStatsModal();
    }
    if (!achievementModal.classList.contains("hidden")) {
      achievementModal.classList.add("hidden");
    }
  }
});

// --- 统计UI管理函数 ---

// 打开统计模态框
function openStatsModal() {
  updateStatsDisplay();
  statsModal.classList.remove("hidden");
}

// 关闭统计模态框
function closeStatsModal() {
  statsModal.classList.add("hidden");
  // 销毁图表实例以释放内存
  Object.values(chartInstances).forEach(chart => {
    if (chart) {
      chart.destroy();
    }
  });
  chartInstances = { daily: null, weekly: null, monthly: null, heatmap: null };
}

// 切换统计标签页
function switchStatsTab(tabName) {
  // 移除所有活动状态
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // 激活当前标签
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // 根据标签更新内容
  updateTabContent(tabName);
}

// 更新标签页内容
function updateTabContent(tabName) {
  switch (tabName) {
    case 'daily':
      updateDailyStats();
      break;
    case 'weekly':
      updateWeeklyStats();
      break;
    case 'monthly':
      updateMonthlyStats();
      break;
    case 'achievements':
      updateAchievements();
      break;
  }
}

// 更新所有统计显示
function updateStatsDisplay() {
  updateDailyStats();
  updateWeeklyStats();
  updateMonthlyStats();
  updateAchievements();
}

// 更新日统计
function updateDailyStats() {
  const today = formatDate(new Date());
  const todayStats = statsData.dailyStats[today] || { duration: 0, sessions: [] };
  
  // 更新统计卡片
  document.getElementById('today-duration').textContent = formatDuration(todayStats.duration);
  document.getElementById('today-sessions').textContent = `${todayStats.sessions.length}次`;
  
  const avgDuration = todayStats.sessions.length > 0 
    ? todayStats.duration / todayStats.sessions.length 
    : 0;
  document.getElementById('today-avg').textContent = formatDuration(avgDuration);
  
  // 绘制日趋势图（最近7天）
  drawDailyChart();
}

// 更新周统计
function updateWeeklyStats() {
  const today = new Date();
  const weekStart = getWeekStart(today);
  
  // 计算本周数据
  let weekDuration = 0;
  let weekSessions = 0;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + 1 + i); // 从周一开始
    const dateStr = formatDate(date);
    const dayStats = statsData.dailyStats[dateStr];
    if (dayStats) {
      weekDuration += dayStats.duration;
      weekSessions += dayStats.sessions.length;
    }
  }
  
  // 更新统计卡片
  document.getElementById('week-duration').textContent = formatDuration(weekDuration);
  document.getElementById('week-sessions').textContent = `${weekSessions}次`;
  
  const avgDailyDuration = weekDuration / 7;
  document.getElementById('week-avg').textContent = formatDuration(avgDailyDuration);
  
  // 绘制周趋势图（最近4周）
  drawWeeklyChart();
}

// 更新月统计
function updateMonthlyStats() {
  const today = new Date();
  const currentMonth = formatMonth(today);
  
  // 计算本月数据
  let monthDuration = 0;
  let monthSessions = 0;
  
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const dayStats = statsData.dailyStats[dateStr];
    if (dayStats) {
      monthDuration += dayStats.duration;
      monthSessions += dayStats.sessions.length;
    }
  }
  
  // 更新统计卡片
  document.getElementById('month-duration').textContent = formatDuration(monthDuration);
  document.getElementById('month-sessions').textContent = `${monthSessions}次`;
  
  const avgDailyDuration = monthDuration / daysInMonth;
  document.getElementById('month-avg').textContent = formatDuration(avgDailyDuration);
  
  // 绘制月趋势图（最近6个月）
  drawMonthlyChart();
  
  // 绘制时段热力图
  drawHeatmapChart();
}

// 更新成就显示
function updateAchievements() {
  const achievementsList = document.getElementById('achievements-list');
  const progressList = document.getElementById('achievement-progress-list');
  
  // 清空现有内容
  achievementsList.innerHTML = '';
  progressList.innerHTML = '';
  
  achievementDefinitions.forEach(achievement => {
    // 创建成就项目
    const achievementItem = document.createElement('div');
    achievementItem.className = 'achievement-item';
    
    const isUnlocked = statsData.achievements[achievement.id];
    if (isUnlocked) {
      achievementItem.classList.add('unlocked');
    }
    
    achievementItem.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-description">${achievement.description}</div>
      ${isUnlocked ? `<div class="unlock-date">解锁于: ${new Date(isUnlocked).toLocaleDateString()}</div>` : ''}
    `;
    
    achievementsList.appendChild(achievementItem);
    
    // 如果未解锁，创建进度项目
    if (!isUnlocked) {
      const progressItem = createProgressItem(achievement);
      if (progressItem) {
        progressList.appendChild(progressItem);
      }
    }
  });
}

// 创建成就进度项目
function createProgressItem(achievement) {
  let progress = 0;
  let progressText = '';
  
  switch (achievement.id) {
    case 'first_focus':
      progress = Math.min(100, (statsData.totalSessions / 1) * 100);
      progressText = `${statsData.totalSessions}/1 次专注`;
      break;
    case 'focus_10':
      progress = Math.min(100, (statsData.totalSessions / 10) * 100);
      progressText = `${statsData.totalSessions}/10 次专注`;
      break;
    case 'focus_50':
      progress = Math.min(100, (statsData.totalSessions / 50) * 100);
      progressText = `${statsData.totalSessions}/50 次专注`;
      break;
    case 'focus_100':
      progress = Math.min(100, (statsData.totalSessions / 100) * 100);
      progressText = `${statsData.totalSessions}/100 次专注`;
      break;
    case 'hour_marathon':
      // 检查是否有超过60分钟的单次专注
      let hasLongSession = false;
      Object.values(statsData.dailyStats).forEach(day => {
        if (day.sessions) {
          day.sessions.forEach(session => {
            if (session.duration >= 60 * 60 * 1000) {
              hasLongSession = true;
            }
          });
        }
      });
      progress = hasLongSession ? 100 : 0;
      progressText = hasLongSession ? '已完成60分钟专注' : '需要完成一次60分钟专注';
      break;
    case 'weekly_warrior':
      // 计算连续专注天数
      const today = new Date();
      let consecutiveDays = 0;
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = formatDate(date);
        const dayStats = statsData.dailyStats[dateStr];
        if (dayStats && dayStats.duration >= 30 * 60 * 1000) {
          consecutiveDays++;
        } else {
          break;
        }
      }
      progress = Math.min(100, (consecutiveDays / 7) * 100);
      progressText = `连续${consecutiveDays}/7天专注30分钟`;
      break;
    case 'morning_person':
      let morningCount = 0;
      Object.values(statsData.dailyStats).forEach(day => {
        if (day.timeSegments) {
          for (let hour = 6; hour <= 8; hour++) {
            if (day.timeSegments[hour]) {
              morningCount += day.timeSegments[hour].sessions;
            }
          }
        }
      });
      progress = Math.min(100, (morningCount / 5) * 100);
      progressText = `早晨专注${morningCount}/5次`;
      break;
    case 'night_owl':
      let nightCount = 0;
      Object.values(statsData.dailyStats).forEach(day => {
        if (day.timeSegments) {
          for (let hour = 20; hour <= 22; hour++) {
            if (day.timeSegments[hour]) {
              nightCount += day.timeSegments[hour].sessions;
            }
          }
        }
      });
      progress = Math.min(100, (nightCount / 5) * 100);
      progressText = `夜晚专注${nightCount}/5次`;
      break;
    default:
      return null;
  }
  
  if (progress >= 100) return null; // 如果已完成就不显示进度
  
  const progressItem = document.createElement('div');
  progressItem.className = 'progress-item';
  progressItem.innerHTML = `
    <div class="progress-header">
      <span class="progress-name">${achievement.name}</span>
      <span class="progress-percentage">${Math.round(progress)}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>
    <div class="progress-description">${progressText}</div>
  `;
  
  return progressItem;
}

// 导出统计数据
function exportStatsData() {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalFocusTime: statsData.totalFocusTime,
    totalSessions: statsData.totalSessions,
    dailyStats: statsData.dailyStats,
    weeklyStats: statsData.weeklyStats,
    monthlyStats: statsData.monthlyStats,
    achievements: statsData.achievements,
    formattedTotalTime: formatDuration(statsData.totalFocusTime)
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `focus-stats-${formatDate(new Date())}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  console.log("统计数据已导出");
}

// 重置统计数据
function resetStatsData() {
  if (confirm('确定要重置所有统计数据吗？此操作不可恢复。')) {
    // 清空统计数据
    statsData = {
      totalFocusTime: 0,
      totalSessions: 0,
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
      achievements: {},
      lastSaveDate: null,
      currentSessionStart: null
    };
    
    // 保存清空的数据
    saveStatsData();
    
    // 刷新显示
    if (!statsModal.classList.contains('hidden')) {
      updateStatsDisplay();
    }
    
    console.log("统计数据已重置");
    alert('统计数据已重置');
  }
}

// 点击成就模态框外部关闭
achievementModal.addEventListener('click', function(e) {
  if (e.target === achievementModal) {
    achievementModal.classList.add('hidden');
  }
});

document.addEventListener("DOMContentLoaded", function () {
  console.log("页面加载完成，尝试加载并恢复应用状态。");

  // 检查桌面通知支持
  checkNotificationSupport();
  
  // 加载保存的设置
  loadSettings();
  
  // 加载统计数据
  loadStatsData();

  // 加载并恢复应用状态
  loadAndResumeAppState();
});

// --- 图表绘制函数 ---

// 绘制日趋势图（最近7天）
function drawDailyChart() {
  const canvas = document.getElementById('daily-chart');
  if (!canvas) return;
  
  // 销毁现有图表
  if (chartInstances.daily) {
    chartInstances.daily.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  const today = new Date();
  const labels = [];
  const data = [];
  
  // 生成最近7天的数据
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = formatDate(date);
    const dayStats = statsData.dailyStats[dateStr] || { duration: 0 };
    
    labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
    data.push(Math.round(dayStats.duration / (1000 * 60))); // 转换为分钟
  }
  
  chartInstances.daily = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '专注时长（分钟）',
        data: data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + '分钟';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `专注时长: ${context.parsed.y}分钟`;
            }
          }
        }
      }
    }
  });
}

// 绘制周趋势图（最近4周）
function drawWeeklyChart() {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas) return;
  
  // 销毁现有图表
  if (chartInstances.weekly) {
    chartInstances.weekly.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  const today = new Date();
  const labels = [];
  const data = [];
  
  // 生成最近4周的数据
  for (let i = 3; i >= 0; i--) {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - (i * 7));
    const weekStart = getWeekStart(weekDate);
    
    // 计算该周的总时长
    let weekDuration = 0;
    for (let j = 0; j < 7; j++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + j);
      const dateStr = formatDate(date);
      const dayStats = statsData.dailyStats[dateStr];
      if (dayStats) {
        weekDuration += dayStats.duration;
      }
    }
    
    const startDate = new Date(weekStart);
    labels.push(`${startDate.getMonth() + 1}/${startDate.getDate()}`);
    data.push(Math.round(weekDuration / (1000 * 60))); // 转换为分钟
  }
  
  chartInstances.weekly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '专注时长（分钟）',
        data: data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + '分钟';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `专注时长: ${context.parsed.y}分钟`;
            }
          }
        }
      }
    }
  });
}

// 绘制月趋势图（最近6个月）
function drawMonthlyChart() {
  const canvas = document.getElementById('monthly-chart');
  if (!canvas) return;
  
  // 销毁现有图表
  if (chartInstances.monthly) {
    chartInstances.monthly.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  const today = new Date();
  const labels = [];
  const data = [];
  
  // 生成最近6个月的数据
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = formatMonth(date);
    const monthStats = statsData.monthlyStats[monthStr] || { duration: 0 };
    
    labels.push(date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }));
    data.push(Math.round(monthStats.duration / (1000 * 60 * 60))); // 转换为小时
  }
  
  chartInstances.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '专注时长（小时）',
        data: data,
        backgroundColor: 'rgba(118, 75, 162, 0.8)',
        borderColor: '#764ba2',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + '小时';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `专注时长: ${context.parsed.y}小时`;
            }
          }
        }
      }
    }
  });
}

// 绘制时段热力图
function drawHeatmapChart() {
  const canvas = document.getElementById('heatmap-chart');
  if (!canvas) return;
  
  // 销毁现有图表
  if (chartInstances.heatmap) {
    chartInstances.heatmap.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  
  // 准备热力图数据
  const hours = Array.from({length: 24}, (_, i) => i);
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const heatmapData = [];
  
  // 生成热力图数据点
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      let totalDuration = 0;
      let sessionCount = 0;
      
      // 计算该时段的总专注时长
      Object.values(statsData.dailyStats).forEach(dayStats => {
        if (dayStats.timeSegments && dayStats.timeSegments[hour]) {
          const date = Object.keys(statsData.dailyStats).find(dateStr => 
            statsData.dailyStats[dateStr] === dayStats
          );
          if (date) {
            const dayOfWeek = new Date(date).getDay();
            if (dayOfWeek === day) {
              totalDuration += dayStats.timeSegments[hour].duration;
              sessionCount += dayStats.timeSegments[hour].sessions;
            }
          }
        }
      });
      
      heatmapData.push({
        x: hour,
        y: day,
        v: Math.round(totalDuration / (1000 * 60)) // 转换为分钟
      });
    }
  }
  
  chartInstances.heatmap = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: '专注时长（分钟）',
        data: heatmapData,
        backgroundColor: function(context) {
          const value = context.parsed.v;
          const alpha = Math.min(value / 60, 1); // 最大值按60分钟计算
          return `rgba(102, 126, 234, ${alpha})`;
        },
        borderColor: '#667eea',
        borderWidth: 1,
        pointRadius: function(context) {
          const value = context.parsed.v;
          return Math.max(3, Math.min(value / 5, 15)); // 根据时长调整点的大小
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: 23,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return value + ':00';
            }
          },
          title: {
            display: true,
            text: '时间'
          }
        },
        y: {
          type: 'linear',
          min: 0,
          max: 6,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return days[value];
            }
          },
          title: {
            display: true,
            text: '星期'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              const point = context[0];
              return `${days[point.parsed.y]} ${point.parsed.x}:00`;
            },
            label: function(context) {
              return `专注时长: ${context.parsed.v}分钟`;
            }
          }
        }
      }
    }
  });
}
