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

// 设置配置的键名
const SETTINGS_KEY = "randomTimerSettings";

// 默认设置值
const defaultSettings = {
  mainDuration: 90,      // 主流程时间（分钟）
  randomMin: 3,          // 随机间隔最小时间（分钟）
  randomMax: 5,          // 随机间隔最大时间（分钟）
  restDuration: 10       // 休息时间（秒）
};

// 当前设置（初始化为默认值，稍后会从localStorage加载）
let currentSettings = { ...defaultSettings };

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
  } else if (resumeData && resumeData.mainTargetEndTime) {
    console.log("主流程恢复中...");
    appState.mainTargetEndTime = resumeData.mainTargetEndTime;
    appState.isAppRunning = true;
    // currentCyclePhase 会在后续恢复逻辑中设置
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

// 点击模态框外部关闭
settingsModal.addEventListener("click", function(e) {
  if (e.target === settingsModal) {
    closeSettingsModal();
  }
});

// ESC键关闭模态框
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape" && !settingsModal.classList.contains("hidden")) {
    closeSettingsModal();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  console.log("页面加载完成，尝试加载并恢复应用状态。");

  // 检查桌面通知支持
  checkNotificationSupport();
  
  // 加载保存的设置
  loadSettings();

  // 加载并恢复应用状态
  loadAndResumeAppState();
  
  // 初始化智能休息系统
  initializeRestSystem();
});

// ============ 智能休息提醒系统 ============

// 智能休息系统相关的DOM元素
const restModeButton = document.getElementById("rest-mode-button");
const restModeOverlay = document.getElementById("rest-mode-overlay");
const restModeClose = document.getElementById("rest-mode-close");
const restTimer = document.getElementById("rest-timer");
const fatigueBar = document.getElementById("fatigue-bar");
const fatigueFill = document.getElementById("fatigue-fill");
const fatigueText = document.getElementById("fatigue-text");
const restFatiguePercentage = document.getElementById("rest-fatigue-percentage");
const restFatigueStatus = document.getElementById("rest-fatigue-status");
const activityIcon = document.getElementById("activity-icon");
const activityTitle = document.getElementById("activity-title");
const activityDescription = document.getElementById("activity-description");
const activitySteps = document.getElementById("activity-steps");
const prevActivityBtn = document.getElementById("prev-activity");
const nextActivityBtn = document.getElementById("next-activity");
const restMusicToggle = document.getElementById("rest-music-toggle");
const restBrightnessToggle = document.getElementById("rest-brightness-toggle");
const customDurationBtn = document.getElementById("custom-duration");
const breathingAnimation = document.getElementById("breathing-animation");

// 设置相关的新元素
const fatigueThresholdInput = document.getElementById("fatigue-threshold");
const focusWeightInput = document.getElementById("focus-weight");
const focusWeightValue = document.getElementById("focus-weight-value");
const defaultRestDurationInput = document.getElementById("default-rest-duration");
const prefBreathingInput = document.getElementById("pref-breathing");
const prefStretchingInput = document.getElementById("pref-stretching");
const prefEyeCareInput = document.getElementById("pref-eye-care");

// 疲劳度监测相关变量
let fatigueData = {
  currentFatigue: 0,           // 当前疲劳度 (0-100)
  focusStartTime: null,        // 专注开始时间
  totalFocusTime: 0,           // 总专注时间（毫秒）
  restHistory: [],             // 休息历史记录
  lastRestTime: null,          // 上次休息时间
  continuousFocusTime: 0       // 连续专注时间（毫秒）
};

// 休息模式相关变量
let restModeData = {
  isActive: false,             // 休息模式是否激活
  startTime: null,             // 休息开始时间
  duration: 5 * 60 * 1000,     // 休息时长（毫秒）
  timerId: null,               // 休息计时器ID
  currentActivityIndex: 0,     // 当前活动索引
  isMusicPlaying: false,       // 音乐播放状态
  isDimmed: false,             // 屏幕调暗状态
  audioContext: null,          // Web Audio Context
  oscillators: null,            // 音频振荡器数组
  gainNode: null               // 音量控制节点
};

// 休息活动数据库
const restActivities = [
  {
    icon: "🧘‍♀️",
    title: "深呼吸练习",
    description: "放松身心，缓解压力",
    type: "breathing",
    steps: [
      "1. 坐直身体，闭上眼睛",
      "2. 缓慢深呼吸4秒",
      "3. 屏住呼吸4秒",
      "4. 缓慢呼气4秒",
      "5. 重复这个循环"
    ],
    animation: "breathing"
  },
  {
    icon: "🤸‍♀️",
    title: "颈部伸展",
    description: "缓解颈部疲劳",
    type: "stretching",
    steps: [
      "1. 缓慢向左转头，保持5秒",
      "2. 缓慢向右转头，保持5秒", 
      "3. 低头看胸部，保持5秒",
      "4. 抬头看天花板，保持5秒",
      "5. 轻柔地顺时针转动颈部"
    ],
    animation: "stretch"
  },
  {
    icon: "👀",
    title: "护眼休息",
    description: "缓解眼部疲劳",
    type: "eye-care",
    steps: [
      "1. 向远处看20秒（20英尺外）",
      "2. 缓慢眨眼10次",
      "3. 闭眼休息10秒",
      "4. 眼球顺时针转动5圈",
      "5. 眼球逆时针转动5圈"
    ],
    animation: "eye"
  },
  {
    icon: "🏃‍♀️",
    title: "肩部运动",
    description: "放松肩膀肌肉",
    type: "stretching",
    steps: [
      "1. 耸肩向上，保持5秒",
      "2. 肩膀向后转动5圈",
      "3. 肩膀向前转动5圈",
      "4. 双臂上举，向后伸展",
      "5. 双手抱胸，伸展背部"
    ],
    animation: "stretch"
  },
  {
    icon: "🌱",
    title: "正念放松",
    description: "专注当下，内心平静",
    type: "breathing",
    steps: [
      "1. 专注于呼吸的节奏",
      "2. 感受身体的重量",
      "3. 注意周围的声音",
      "4. 观察内心的想法，让它们流过",
      "5. 保持专注和平静"
    ],
    animation: "breathing"
  },
  {
    icon: "🤲",
    title: "手腕运动",
    description: "预防鼠标手",
    type: "stretching",
    steps: [
      "1. 伸直手臂，手掌向下",
      "2. 用另一只手轻压手背",
      "3. 保持15秒，换另一只手",
      "4. 握拳后张开手指5次",
      "5. 顺时针和逆时针转动手腕"
    ],
    animation: "stretch"
  }
];

// 扩展默认设置以包含新的配置
const extendedDefaultSettings = {
  ...defaultSettings,
  fatigueThreshold: 70,        // 疲劳度阈值
  focusWeight: 1.0,            // 专注时长权重
  defaultRestDuration: 5,      // 默认休息时长（分钟）
  restPreferences: {           // 休息活动偏好
    breathing: true,
    stretching: true,
    eyeCare: true
  }
};

// 初始化智能休息系统
function initializeRestSystem() {
  console.log("初始化智能休息系统...");
  
  // 扩展当前设置
  currentSettings = { ...extendedDefaultSettings, ...currentSettings };
  
  // 初始化疲劳度显示
  updateFatigueDisplay();
  
  // 设置事件监听器
  setupRestEventListeners();
  
  // 初始化音频上下文（需要用户交互后才能创建）
  setupAudioContext();
  
  // 开始疲劳度监测
  startFatigueMonitoring();
  
  console.log("智能休息系统初始化完成");
}

// 设置休息系统事件监听器
function setupRestEventListeners() {
  // 休息模式按钮
  restModeButton.addEventListener("click", toggleRestMode);
  
  // 关闭休息模式
  restModeClose.addEventListener("click", closeRestMode);
  
  // 活动切换按钮
  prevActivityBtn.addEventListener("click", () => changeActivity(-1));
  nextActivityBtn.addEventListener("click", () => changeActivity(1));
  
  // 休息控制按钮
  restMusicToggle.addEventListener("click", toggleRestMusic);
  restBrightnessToggle.addEventListener("click", toggleBrightness);
  customDurationBtn.addEventListener("click", showCustomDurationDialog);
  
  // 设置页面的事件监听器
  if (focusWeightInput) {
    focusWeightInput.addEventListener("input", function() {
      if (focusWeightValue) {
        focusWeightValue.textContent = this.value;
      }
    });
  }
  
  // 点击覆盖层外部关闭休息模式
  restModeOverlay.addEventListener("click", function(e) {
    if (e.target === restModeOverlay) {
      closeRestMode();
    }
  });
  
  // ESC键关闭休息模式
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && restModeData.isActive) {
      closeRestMode();
    }
  });
}

// 疲劳度计算算法
function calculateFatigue() {
  const now = Date.now();
  
  // 如果应用正在运行，更新连续专注时间
  if (appState.isAppRunning && fatigueData.focusStartTime) {
    fatigueData.continuousFocusTime = now - fatigueData.focusStartTime;
  }
  
  // 基础疲劳度计算（基于连续专注时间）
  const maxContinuousFocus = 90 * 60 * 1000; // 90分钟
  const continuousFatigueRate = Math.min(
    (fatigueData.continuousFocusTime / maxContinuousFocus) * 100, 
    80
  );
  
  // 考虑专注时长权重
  const weightedFatigue = continuousFatigueRate * currentSettings.focusWeight;
  
  // 休息历史加成（最近休息过会降低疲劳度）
  let restBonus = 0;
  if (fatigueData.lastRestTime) {
    const timeSinceRest = now - fatigueData.lastRestTime;
    const restEffect = Math.max(0, 30 - (timeSinceRest / (60 * 1000))); // 30分钟内有效
    restBonus = Math.min(restEffect, 25);
  }
  
  // 最终疲劳度计算
  fatigueData.currentFatigue = Math.max(0, Math.min(100, weightedFatigue - restBonus));
  
  return fatigueData.currentFatigue;
}

// 开始疲劳度监测
function startFatigueMonitoring() {
  // 如果应用开始运行，记录专注开始时间
  if (appState.isAppRunning && !fatigueData.focusStartTime) {
    fatigueData.focusStartTime = Date.now();
    console.log("开始专注时间监测");
  }
  
  // 每30秒更新一次疲劳度
  setInterval(() => {
    if (appState.isAppRunning) {
      const newFatigue = calculateFatigue();
      updateFatigueDisplay();
      
      // 检查是否需要主动建议休息
      checkFatigueThreshold(newFatigue);
    }
  }, 30000); // 30秒
}

// 更新疲劳度显示
function updateFatigueDisplay() {
  const fatigue = fatigueData.currentFatigue;
  
  // 更新主界面的疲劳度条
  if (fatigueFill) {
    fatigueFill.style.width = `${fatigue}%`;
  }
  
  // 更新疲劳度文本和状态
  let status = "正常";
  let statusClass = "normal";
  
  if (fatigue >= 80) {
    status = "严重疲劳";
    statusClass = "severe";
  } else if (fatigue >= currentSettings.fatigueThreshold) {
    status = "疲劳";
    statusClass = "tired";
  } else if (fatigue >= 40) {
    status = "轻度疲劳";
    statusClass = "mild";
  }
  
  if (fatigueText) {
    fatigueText.textContent = `${status} (${Math.round(fatigue)}%)`;
    fatigueText.className = `fatigue-text ${statusClass}`;
  }
  
  // 更新休息模式中的疲劳度显示
  if (restFatiguePercentage) {
    restFatiguePercentage.textContent = `${Math.round(fatigue)}%`;
  }
  if (restFatigueStatus) {
    restFatigueStatus.textContent = status;
  }
}

// 检查疲劳度阈值
function checkFatigueThreshold(fatigue) {
  if (fatigue >= currentSettings.fatigueThreshold && !restModeData.isActive) {
    // 发送疲劳提醒通知
    sendDesktopNotification(
      "🚨 疲劳提醒",
      `您的疲劳度已达到 ${Math.round(fatigue)}%，建议您进行休息`,
      {
        requireInteraction: true,
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiNkYzM1NDUiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0xIDEzaC0ydi0yaDJ2MnptMC04aC0yVjZoMnY0eiIvPgo8L3N2Zz4KPC9zdmc+"
      }
    );
    
    // 高亮休息按钮
    restModeButton.style.animation = "pulse 2s infinite";
    setTimeout(() => {
      if (restModeButton.style.animation) {
        restModeButton.style.animation = "";
      }
    }, 10000); // 10秒后停止闪烁
  }
}

// 根据疲劳度智能推荐休息活动
function getRecommendedActivity() {
  const fatigue = fatigueData.currentFatigue;
  const preferences = currentSettings.restPreferences || extendedDefaultSettings.restPreferences;
  
  // 过滤符合偏好的活动
  let availableActivities = restActivities.filter(activity => {
    return preferences[activity.type.replace('-', '')];
  });
  
  // 如果没有符合偏好的活动，使用所有活动
  if (availableActivities.length === 0) {
    availableActivities = restActivities;
  }
  
  // 根据疲劳度推荐活动
  let recommendedActivities;
  if (fatigue >= 80) {
    // 高疲劳度：推荐呼吸练习和护眼休息
    recommendedActivities = availableActivities.filter(a => 
      a.type === "breathing" || a.type === "eye-care"
    );
  } else if (fatigue >= 50) {
    // 中等疲劳度：推荐伸展运动
    recommendedActivities = availableActivities.filter(a => 
      a.type === "stretching" || a.type === "breathing"
    );
  } else {
    // 低疲劳度：所有活动都可以
    recommendedActivities = availableActivities;
  }
  
  if (recommendedActivities.length === 0) {
    recommendedActivities = availableActivities;
  }
  
  // 随机选择一个推荐活动
  const randomIndex = Math.floor(Math.random() * recommendedActivities.length);
  return recommendedActivities[randomIndex];
}

// 切换休息模式
function toggleRestMode() {
  if (restModeData.isActive) {
    closeRestMode();
  } else {
    openRestMode();
  }
}

// 打开休息模式
function openRestMode() {
  console.log("打开智能休息模式");
  
  restModeData.isActive = true;
  restModeData.startTime = Date.now();
  restModeData.duration = currentSettings.defaultRestDuration * 60 * 1000;
  
  // 显示休息模式界面
  restModeOverlay.classList.remove("hidden");
  
  // 设置推荐活动
  const recommendedActivity = getRecommendedActivity();
  restModeData.currentActivityIndex = restActivities.findIndex(a => a === recommendedActivity);
  if (restModeData.currentActivityIndex === -1) {
    restModeData.currentActivityIndex = 0;
  }
  
  // 更新活动显示
  updateActivityDisplay();
  
  // 更新疲劳度显示
  updateFatigueDisplay();
  
  // 开始休息倒计时
  startRestTimer();
  
  // 发送休息开始通知
  sendDesktopNotification(
    "🧘‍♀️ 智能休息开始",
    `开始 ${currentSettings.defaultRestDuration} 分钟的智能休息时间`,
    { requireInteraction: false }
  );
  
  // 停止按钮闪烁动画
  if (restModeButton.style.animation) {
    restModeButton.style.animation = "";
  }
}

// 关闭休息模式
function closeRestMode() {
  console.log("关闭智能休息模式");
  
  restModeData.isActive = false;
  
  // 清除计时器
  if (restModeData.timerId) {
    clearInterval(restModeData.timerId);
    restModeData.timerId = null;
  }
  
  // 停止音乐
  if (restModeData.isMusicPlaying) {
    stopRestMusic();
  }
  
  // 恢复亮度
  if (restModeData.isDimmed) {
    restoreBrightness();
  }
  
  // 隐藏休息模式界面
  restModeOverlay.classList.add("hidden");
  
  // 记录休息历史
  if (restModeData.startTime) {
    const restDuration = Date.now() - restModeData.startTime;
    fatigueData.restHistory.push({
      startTime: restModeData.startTime,
      duration: restDuration,
      fatigueBefore: fatigueData.currentFatigue,
      activity: restActivities[restModeData.currentActivityIndex]?.title || "未知"
    });
    fatigueData.lastRestTime = Date.now();
    
    // 休息后降低疲劳度
    const restBenefit = Math.min(30, (restDuration / (60 * 1000)) * 10); // 每分钟降低10%
    fatigueData.currentFatigue = Math.max(0, fatigueData.currentFatigue - restBenefit);
    
    // 重置连续专注时间
    fatigueData.focusStartTime = Date.now();
    fatigueData.continuousFocusTime = 0;
    
    console.log(`休息结束，休息时长: ${Math.round(restDuration / 1000)}秒，疲劳度降低: ${restBenefit}%`);
  }
  
  // 更新疲劳度显示
  updateFatigueDisplay();
  
  // 发送休息结束通知
  sendDesktopNotification(
    "✅ 休息结束",
    "休息时间结束，您可以继续专注工作了",
    { requireInteraction: false }
  );
}

// 开始休息计时器
function startRestTimer() {
  updateRestTimerDisplay();
  
  restModeData.timerId = setInterval(() => {
    const elapsed = Date.now() - restModeData.startTime;
    const remaining = restModeData.duration - elapsed;
    
    if (remaining <= 0) {
      // 休息时间结束
      closeRestMode();
    } else {
      updateRestTimerDisplay();
    }
  }, 1000);
}

// 更新休息计时器显示
function updateRestTimerDisplay() {
  const elapsed = Date.now() - restModeData.startTime;
  const remaining = Math.max(0, restModeData.duration - elapsed);
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  if (restTimer) {
    restTimer.textContent = formatMinuteSecond(minutes, seconds);
  }
}

// 切换活动
function changeActivity(direction) {
  const preferences = currentSettings.restPreferences || extendedDefaultSettings.restPreferences;
  
  // 过滤符合偏好的活动
  let availableActivities = restActivities.filter(activity => {
    return preferences[activity.type.replace('-', '')];
  });
  
  if (availableActivities.length === 0) {
    availableActivities = restActivities;
  }
  
  // 找到当前活动在可用活动中的索引
  const currentActivity = restActivities[restModeData.currentActivityIndex];
  let currentAvailableIndex = availableActivities.findIndex(a => a === currentActivity);
  
  if (currentAvailableIndex === -1) {
    currentAvailableIndex = 0;
  }
  
  // 计算新的索引
  currentAvailableIndex = (currentAvailableIndex + direction + availableActivities.length) % availableActivities.length;
  
  // 找到新活动在原数组中的索引
  const newActivity = availableActivities[currentAvailableIndex];
  restModeData.currentActivityIndex = restActivities.findIndex(a => a === newActivity);
  
  // 更新显示
  updateActivityDisplay();
}

// 更新活动显示
function updateActivityDisplay() {
  const activity = restActivities[restModeData.currentActivityIndex];
  
  if (!activity) return;
  
  // 更新活动信息
  if (activityIcon) activityIcon.textContent = activity.icon;
  if (activityTitle) activityTitle.textContent = activity.title;
  if (activityDescription) activityDescription.textContent = activity.description;
  
  // 更新步骤
  if (activitySteps) {
    activitySteps.innerHTML = "";
    activity.steps.forEach(step => {
      const stepElement = document.createElement("div");
      stepElement.className = "step";
      stepElement.textContent = step;
      activitySteps.appendChild(stepElement);
    });
  }
  
  // 更新动画
  updateActivityAnimation(activity.animation);
}

// 更新活动动画
function updateActivityAnimation(animationType) {
  if (!breathingAnimation) return;
  
  // 清除现有动画类
  breathingAnimation.className = "breathing-animation";
  
  // 根据活动类型设置动画
  switch (animationType) {
    case "breathing":
      breathingAnimation.classList.add("breathing-active");
      break;
    case "stretch":
      breathingAnimation.classList.add("stretch-active");
      break;
    case "eye":
      breathingAnimation.classList.add("eye-active");
      break;
    default:
      breathingAnimation.classList.add("breathing-active");
  }
}

// 设置音频上下文
function setupAudioContext() {
  try {
    restModeData.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log("音频上下文初始化成功");
  } catch (error) {
    console.warn("音频上下文初始化失败:", error);
  }
}

// 切换休息音乐
function toggleRestMusic() {
  if (restModeData.isMusicPlaying) {
    stopRestMusic();
  } else {
    startRestMusic();
  }
}

// 开始播放休息音乐
function startRestMusic() {
  if (!restModeData.audioContext) {
    setupAudioContext();
  }
  
  if (!restModeData.audioContext) {
    console.warn("无法启动音频上下文");
    return;
  }
  
  try {
    // 确保音频上下文处于运行状态
    if (restModeData.audioContext.state === 'suspended') {
      restModeData.audioContext.resume();
    }
    
    // 创建多个振荡器生成和谐音
    const frequencies = [220, 275, 330, 415]; // A3, C#4, E4, G#4 - A major 和弦
    const oscillators = [];
    
    // 创建主增益节点
    restModeData.gainNode = restModeData.audioContext.createGain();
    restModeData.gainNode.gain.setValueAtTime(0.05, restModeData.audioContext.currentTime);
    
    frequencies.forEach((freq, index) => {
      const oscillator = restModeData.audioContext.createOscillator();
      const gainNode = restModeData.audioContext.createGain();
      
      // 设置振荡器参数
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, restModeData.audioContext.currentTime);
      
      // 为不同的音符设置不同的音量
      const volume = 1 / (index + 1); // 高音音量较小
      gainNode.gain.setValueAtTime(volume, restModeData.audioContext.currentTime);
      
      // 添加轻微的频率变化以产生柔和效果
      oscillator.frequency.exponentialRampToValueAtTime(
        freq * 1.01, 
        restModeData.audioContext.currentTime + 8
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        freq, 
        restModeData.audioContext.currentTime + 16
      );
      
      // 连接音频节点
      oscillator.connect(gainNode);
      gainNode.connect(restModeData.gainNode);
      
      // 开始播放
      oscillator.start();
      
      oscillators.push({ oscillator, gainNode });
    });
    
    // 连接到音频输出
    restModeData.gainNode.connect(restModeData.audioContext.destination);
    
    // 存储振荡器数组以便后续停止
    restModeData.oscillators = oscillators;
    
    // 添加音频可视化效果
    addAudioVisualizer();
    
    restModeData.isMusicPlaying = true;
    restMusicToggle.classList.add("active");
    restMusicToggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      停止音乐
    `;
    
    console.log("开始播放舒缓和谐音乐");
  } catch (error) {
    console.error("播放休息音乐失败:", error);
    
    // 显示用户友好的错误消息
    showMusicErrorMessage();
  }
}

// 停止播放休息音乐
function stopRestMusic() {
  try {
    // 停止所有振荡器
    if (restModeData.oscillators) {
      restModeData.oscillators.forEach(({ oscillator, gainNode }) => {
        try {
          oscillator.stop();
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          console.warn("停止振荡器时出错:", e);
        }
      });
      restModeData.oscillators = null;
    }
    
    // 清理单个振荡器（兼容性处理）
    if (restModeData.oscillator) {
      restModeData.oscillator.stop();
      restModeData.oscillator.disconnect();
      restModeData.oscillator = null;
    }
    
    if (restModeData.gainNode) {
      restModeData.gainNode.disconnect();
      restModeData.gainNode = null;
    }
    
    // 移除音频可视化效果
    removeAudioVisualizer();
    
    restModeData.isMusicPlaying = false;
    restMusicToggle.classList.remove("active");
    restMusicToggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
      舒缓音乐
    `;
    
    console.log("停止播放舒缓音乐");
  } catch (error) {
    console.error("停止休息音乐失败:", error);
  }
}

// 显示音乐错误消息
function showMusicErrorMessage() {
  const errorMessage = document.createElement("div");
  errorMessage.className = "error-toast";
  errorMessage.innerHTML = `
    <div class="error-content">
      <span>音频播放失败，请检查浏览器设置或稍后再试</span>
      <button onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  document.body.appendChild(errorMessage);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (errorMessage.parentNode) {
      errorMessage.remove();
    }
  }, 3000);
}

// 切换屏幕亮度
function toggleBrightness() {
  if (restModeData.isDimmed) {
    restoreBrightness();
  } else {
    dimScreen();
  }
}

// 调暗屏幕
function dimScreen() {
  document.body.classList.add("dim-mode");
  restModeData.isDimmed = true;
  restBrightnessToggle.classList.add("active");
  restBrightnessToggle.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
    恢复亮度
  `;
  console.log("屏幕已调暗");
}

// 恢复屏幕亮度
function restoreBrightness() {
  document.body.classList.remove("dim-mode");
  restModeData.isDimmed = false;
  restBrightnessToggle.classList.remove("active");
  restBrightnessToggle.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
    调节亮度
  `;
  console.log("屏幕亮度已恢复");
}

// 显示自定义时长对话框
function showCustomDurationDialog() {
  const customDuration = prompt("请输入自定义休息时长（分钟）:", currentSettings.defaultRestDuration);
  
  if (customDuration && !isNaN(customDuration)) {
    const minutes = parseInt(customDuration);
    if (minutes >= 1 && minutes <= 30) {
      restModeData.duration = minutes * 60 * 1000;
      restModeData.startTime = Date.now(); // 重置开始时间
      console.log(`自定义休息时长设置为 ${minutes} 分钟`);
      
      // 重新开始计时器
      if (restModeData.timerId) {
        clearInterval(restModeData.timerId);
      }
      startRestTimer();
    } else {
      alert("请输入1-30之间的数字");
    }
  }
}

// 添加音频可视化效果
function addAudioVisualizer() {
  const visualizer = document.createElement("div");
  visualizer.className = "audio-visualizer";
  visualizer.id = "audio-visualizer";
  
  for (let i = 0; i < 5; i++) {
    const bar = document.createElement("div");
    bar.className = "audio-bar";
    visualizer.appendChild(bar);
  }
  
  // 插入到休息动画容器中
  const animationContainer = document.querySelector(".rest-animation-container");
  if (animationContainer) {
    animationContainer.appendChild(visualizer);
  }
}

// 移除音频可视化效果
function removeAudioVisualizer() {
  const visualizer = document.getElementById("audio-visualizer");
  if (visualizer) {
    visualizer.remove();
  }
}

console.log("智能休息提醒系统加载完成");
