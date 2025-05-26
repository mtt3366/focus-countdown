// DOM元素获取
const mainTimerDisplay = document.getElementById("main-timer-display");
const randomTimerDisplay = document.getElementById("random-timer-display");
const tenSecondTimerDisplay = document.getElementById(
  "ten-second-timer-display"
);
const tenSecondTimerCard = document.getElementById("ten-second-timer-card");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");

// 音频资源初始化
const soundA = new Audio("sounds/soundA.mp3"); // 随机倒计时结束音
const soundB = new Audio("sounds/soundB.mp3"); // 10秒倒计时结束音
const soundC = new Audio("sounds/soundC.mp3"); // 主流程结束音

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

// 工具函数：获取3-5分钟的随机时间（毫秒）
function getRandomMillisecondsForCycle() {
  const randomMinutes = Math.random() * 2 + 3; // 3-5 分钟
  return Math.floor(randomMinutes * 60 * 1000); // 转换为毫秒
}

// 格式化分钟秒显示函数
function formatMinuteSecond(minutes, seconds) {
  return `${pad(minutes)}:${pad(seconds)}`;
}

function startTimers(isResuming = false, resumeData = null) {
  if (!isResuming) {
    console.log("主流程开始 (新启动)...");
    const mainDuration = 90 * 60 * 1000;
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
        appState.isAppRunning = false;
        clearAppStateFromLocalStorage();
        resetAllInternals(); // 只重置内部变量和UI，不重复清除localStorage
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
    appState.tenSecondTargetEndTime = Date.now() + 10 * 1000;
    console.log(
      `启动10秒准备计时器 (将结束于: ${new Date(
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
        tenSecondTimerDisplay.innerHTML = "10";
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

  appState.mainTargetEndTime = null;
  appState.randomTargetEndTime = null;
  appState.tenSecondTargetEndTime = null;
  appState.currentCyclePhase = null;
  appState.isAppRunning = false;

  soundA.pause();
  soundA.currentTime = 0;
  soundB.pause();
  soundB.currentTime = 0;
  // soundC is handled by its own end or if main timer is cleared elsewhere

  if (updateUI) {
    mainTimerDisplay.innerHTML = "90:00";
    randomTimerDisplay.innerHTML = "--:--";
    tenSecondTimerDisplay.innerHTML = "10";
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
  appState = { ...appState, ...loadedState }; // 合并加载的状态到当前appState

  const now = Date.now();

  // 检查主计时器是否已过期
  if (appState.mainTargetEndTime <= now) {
    console.log("主计时器在页面关闭期间已到期。");
    mainTimerDisplay.innerHTML = "流程已在您离开时完成！";
    soundC.play(); // 可以在这里播放，因为用户是主动打开页面的
    clearAppStateFromLocalStorage();
    resetAllInternals(true); // 更新UI到结束状态
    startButton.disabled = true; // 确保开始按钮禁用
    resetButton.disabled = false; // 重置按钮应该可用，以便用户可以开始新的
    return;
  }

  // 恢复主计时器
  console.log("尝试恢复主计时器...");
  startTimers(true, { mainTargetEndTime: appState.mainTargetEndTime });

  // 根据保存的阶段恢复子计时器
  if (appState.currentCyclePhase === "random" && appState.randomTargetEndTime) {
    if (appState.randomTargetEndTime > now) {
      console.log("尝试恢复随机间隔计时器...");
      startRandomIntervalTimer(true, appState.randomTargetEndTime);
    } else {
      console.log("随机间隔在页面关闭期间已到期。启动10秒准备。");
      soundA.play(); // 随机计时结束，播放声音A
      startTenSecondPrepTimer(); // 启动下一个阶段
    }
  } else if (
    appState.currentCyclePhase === "ten_second" &&
    appState.tenSecondTargetEndTime
  ) {
    if (appState.tenSecondTargetEndTime > now) {
      console.log("尝试恢复10秒准备计时器...");
      startTenSecondPrepTimer(true, appState.tenSecondTargetEndTime);
    } else {
      console.log("10秒准备在页面关闭期间已到期。启动随机间隔。");
      soundB.play(); // 10秒计时结束，播放声音B
      startRandomIntervalTimer(); // 启动下一个阶段
    }
  } else {
    // 如果没有明确的子循环阶段，或者子循环的目标时间无效，则启动新的随机间隔
    console.log("未找到有效子循环阶段或时间，启动新的随机间隔。");
    startRandomIntervalTimer();
  }
  saveAppStateToLocalStorage(); // 确保恢复后的当前状态被保存
}

// --- 事件监听器 ---
startButton.addEventListener("click", () => startTimers(false));
resetButton.addEventListener("click", resetAll);

document.addEventListener("DOMContentLoaded", function () {
  console.log("页面加载完成，尝试加载并恢复应用状态。");
  loadAndResumeAppState();
});
