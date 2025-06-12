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
  mainDuration: 90, // 主流程时间（分钟）
  randomMin: 3, // 随机间隔最小时间（分钟）
  randomMax: 5, // 随机间隔最大时间（分钟）
  restDuration: 10, // 休息时间（秒）
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
let notificationSupported = false;

// 检查浏览器是否支持通知
function checkNotificationSupport() {
  notificationSupported = "Notification" in window;
  if (!notificationSupported) {
    console.warn("此浏览器不支持桌面通知");
    return false;
  }

  // 更新权限状态
  notificationPermission = Notification.permission;
  console.log("通知权限状态:", notificationPermission);

  // 如果权限是默认状态，主动请求权限
  if (notificationPermission === "default") {
    requestNotificationPermission();
  }

  return true;
}

// 请求通知权限
async function requestNotificationPermission() {
  if (!notificationSupported) {
    console.warn("此浏览器不支持桌面通知");
    return false;
  }

  if (notificationPermission === "granted") {
    console.log("通知权限已授予");
    return true;
  }

  if (notificationPermission === "denied") {
    console.warn("通知权限被拒绝，无法发送桌面通知");
    // 显示权限被拒绝的提示
    alert(
      "通知权限已被拒绝。要启用通知，请：\n1. 点击地址栏左侧的锁定图标\n2. 在权限设置中找到'通知'\n3. 将通知权限改为'允许'"
    );
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    console.log("通知权限请求结果:", permission);

    if (permission === "denied") {
      alert(
        "通知权限被拒绝。要启用通知，请：\n1. 点击地址栏左侧的锁定图标\n2. 在权限设置中找到'通知'\n3. 将通知权限改为'允许'"
      );
    }

    return permission === "granted";
  } catch (error) {
    console.error("请求通知权限失败:", error);
    return false;
  }
}

// 发送桌面通知
function sendDesktopNotification(title, body, options = {}) {
  // 如果不支持通知或没有权限，尝试使用alert作为降级方案
  if (!notificationSupported || notificationPermission !== "granted") {
    console.warn("无法发送桌面通知，使用alert作为降级方案");
    alert(`${title}\n${body}`);
    return null;
  }

  const defaultOptions = {
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01aDNWOGgydjRoM2wtMyAzeiIvPgo8L3N2Zz4KPC9zdmc+",
    badge:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM2NjdlZWEiLz4KPC9zdmc+",
    tag: "random-timer-notification",
    requireInteraction: false,
    silent: false,
  };

  const notificationOptions = { ...defaultOptions, ...options };

  try {
    const notification = new Notification(title, {
      body: body,
      ...notificationOptions,
    });

    // 设置通知点击事件
    notification.onclick = function () {
      window.focus();
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
    // 发送失败时使用alert作为降级方案
    alert(`${title}\n${body}`);
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
        sendDesktopNotification(
          "⏰ 间隔",
          `放空${currentSettings.restDuration}秒`,
          {
            requireInteraction: false,
            icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiNmZjk1MDAiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptMS0xM2gtMnY2bDUuMjUgMy4xNS43NS0xLjIzLTQuNS0yLjY3VjdoLTV6Ii8+Cjwvc3ZnPgo8L3N2Zz4=",
          }
        );

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
    appState.tenSecondTargetEndTime =
      Date.now() + currentSettings.restDuration * 1000; // 使用设置中的休息时间
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
        tenSecondTimerDisplay.innerHTML =
          currentSettings.restDuration.toString();
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
    mainTimerDisplay.innerHTML = formatMinuteSecond(
      currentSettings.mainDuration,
      0
    );
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
    restDuration,
  };

  // 保存设置
  saveSettings();

  // 如果当前没有运行计时器，更新显示
  if (!appState.isAppRunning) {
    mainTimerDisplay.innerHTML = formatMinuteSecond(
      currentSettings.mainDuration,
      0
    );
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
settingsModal.addEventListener("click", function (e) {
  if (e.target === settingsModal) {
    closeSettingsModal();
  }
});

// ESC键关闭模态框
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !settingsModal.classList.contains("hidden")) {
    closeSettingsModal();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  console.log("页面加载完成，尝试加载并恢复应用状态。");

  // 检查通知支持并初始化
  checkNotificationSupport();

  // 加载保存的设置
  loadSettings();

  // 加载并恢复应用状态
  loadAndResumeAppState();
});
