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

// 启动主流程函数
function startTimers() {
  console.log("主流程开始...");
  startButton.disabled = true;
  resetButton.disabled = false;

  const mainDuration = 90 * 60 * 1000; // 90分钟
  const mainEndTime = new Date(Date.now() + mainDuration);

  mainTimerId = countdown(
    mainEndTime.getTime(),
    function (ts) {
      if (ts.value >= 0) {
        console.log("主流程结束 - 时间到");
        soundC.play();
        mainTimerDisplay.innerHTML = "流程完成！";
        resetAll(); // This will stop and nullify all other timers
        return;
      }
      const totalMinutes = ts.hours * 60 + ts.minutes;
      mainTimerDisplay.innerHTML = formatMinuteSecond(totalMinutes, ts.seconds);
    },
    countdown.HOURS | countdown.MINUTES | countdown.SECONDS
  );
  console.log(`主计时器已启动 (ID: ${mainTimerId})`);
  startRandomIntervalTimer(); // 启动第一个随机间隔计时器
}

// 启动随机间隔计时器 (3-5秒)
function startRandomIntervalTimer() {
  if (mainTimerId === null) {
    console.log("主计时器已停止，不启动随机间隔计时器。");
    return;
  }

  // 清除任何可能存在的旧的随机计时器实例
  if (randomTimerId !== null) {
    console.log(`清除旧的随机间隔计时器 (ID: ${randomTimerId})`);
    clearInterval(randomTimerId);
    randomTimerId = null;
  }

  const randomMs = getRandomMillisecondsForCycle();
  const endTime = new Date(Date.now() + randomMs);
  console.log(`启动新的随机间隔计时器 (将持续 ${randomMs / 1000} 秒)`);
  randomTimerDisplay.innerHTML = formatMinuteSecond(
    Math.floor(randomMs / 60000),
    Math.floor((randomMs % 60000) / 1000)
  );

  randomTimerId = countdown(
    endTime.getTime(),
    function (ts) {
      if (ts.value >= 0) {
        // 随机间隔结束
        console.log(`随机间隔计时器 (ID: ${randomTimerId}) 结束。播放声音A。`);
        soundA.play();
        randomTimerDisplay.innerHTML = "--:--"; // 重置显示

        // 明确停止并清除自身ID
        if (randomTimerId !== null) {
          clearInterval(randomTimerId);
          randomTimerId = null;
        }

        startTenSecondPrepTimer(); // 启动10秒准备计时器
        return; // 停止此回调的进一步执行
      }
      // 更新进行中的计时器显示
      randomTimerDisplay.innerHTML = formatMinuteSecond(ts.minutes, ts.seconds);
    },
    countdown.MINUTES | countdown.SECONDS
  );
  console.log(`新的随机间隔计时器已启动 (ID: ${randomTimerId})`);
}

// 启动10秒准备计时器
function startTenSecondPrepTimer() {
  if (mainTimerId === null) {
    console.log("主计时器已停止，不启动10秒准备计时器。");
    if (tenSecondTimerCard) tenSecondTimerCard.classList.add("hidden");
    return;
  }

  // 清除任何可能存在的旧的10秒计时器实例
  if (tenSecondTimerId !== null) {
    console.log(`清除旧的10秒准备计时器 (ID: ${tenSecondTimerId})`);
    clearInterval(tenSecondTimerId);
    tenSecondTimerId = null;
  }

  console.log("启动10秒准备计时器。");
  tenSecondTimerCard.classList.remove("hidden");
  tenSecondTimerDisplay.innerHTML = "10"; // 初始显示
  const endTime = new Date(Date.now() + 10 * 1000); // 10秒

  tenSecondTimerId = countdown(
    endTime.getTime(),
    function (ts) {
      if (ts.value >= 0) {
        // 10秒准备结束
        console.log(
          `10秒准备计时器 (ID: ${tenSecondTimerId}) 结束。播放声音B。`
        );
        soundB.play();
        tenSecondTimerCard.classList.add("hidden");
        tenSecondTimerDisplay.innerHTML = "10"; // 重置显示

        // 明确停止并清除自身ID
        if (tenSecondTimerId !== null) {
          clearInterval(tenSecondTimerId);
          tenSecondTimerId = null;
        }

        startRandomIntervalTimer(); // 启动下一个随机间隔
        return; // 停止此回调的进一步执行
      }
      // 更新进行中的计时器显示
      tenSecondTimerDisplay.innerHTML = ts.seconds.toString();
    },
    countdown.SECONDS
  );
  console.log(`10秒准备计时器已启动 (ID: ${tenSecondTimerId})`);
}

// 重置所有状态函数
function resetAll() {
  console.log("重置所有状态...");
  // 停止并清除主计时器
  if (mainTimerId !== null) {
    console.log(`停止主计时器 (ID: ${mainTimerId})`);
    clearInterval(mainTimerId);
    mainTimerId = null;
  }
  // 停止并清除随机间隔计时器
  if (randomTimerId !== null) {
    console.log(`停止随机间隔计时器 (ID: ${randomTimerId})`);
    clearInterval(randomTimerId);
    randomTimerId = null;
  }
  // 停止并清除10秒准备计时器
  if (tenSecondTimerId !== null) {
    console.log(`停止10秒准备计时器 (ID: ${tenSecondTimerId})`);
    clearInterval(tenSecondTimerId);
    tenSecondTimerId = null;
  }

  soundA.pause();
  soundA.currentTime = 0;
  soundB.pause();
  soundB.currentTime = 0;

  mainTimerDisplay.innerHTML = "90:00";
  randomTimerDisplay.innerHTML = "--:--";
  tenSecondTimerDisplay.innerHTML = "10";
  if (tenSecondTimerCard) tenSecondTimerCard.classList.add("hidden");

  startButton.disabled = false;
  resetButton.disabled = true;
  console.log("重置完成。");
}

// 事件监听器
startButton.addEventListener("click", startTimers);
resetButton.addEventListener("click", resetAll);

// 页面加载时初始化
document.addEventListener("DOMContentLoaded", function () {
  console.log("页面加载完成，初始化应用状态。");
  resetAll();
});
