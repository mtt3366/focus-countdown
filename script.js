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
function getRandomMinutes() {
  // 生成3到5之间的随机浮点数（分钟）
  const randomMinutes = Math.random() * 2 + 3; // 3-5分钟
  return Math.floor(randomMinutes * 60 * 1000); // 转换为毫秒
}

// 格式化分钟秒显示函数
function formatMinuteSecond(minutes, seconds) {
  return `${pad(minutes)}:${pad(seconds)}`;
}

// 启动主流程函数
function startTimers() {
  console.log("开始主流程...");

  // 更新按钮状态
  startButton.disabled = true;
  resetButton.disabled = false;

  // 计算90分钟后的结束时间
  const endTime = new Date(Date.now() + 90 * 60 * 1000);

  // 启动主计时器（90分钟） - 传递毫秒数
  mainTimerId = countdown(
    endTime.getTime(),
    function (ts) {
      // 检查是否已经结束
      if (ts.value >= 0) {
        console.log("主流程结束");
        soundC.play();
        mainTimerDisplay.innerHTML = "流程完成！";
        resetAll();
        return;
      }

      // 更新主计时器显示 - 只显示总分钟数和秒数
      const totalMinutes = ts.hours * 60 + ts.minutes;
      mainTimerDisplay.innerHTML = formatMinuteSecond(totalMinutes, ts.seconds);
    },
    countdown.HOURS | countdown.MINUTES | countdown.SECONDS // 保持请求HOURS以便正确计算totalMinutes
  );

  startRandomCycle();
}

// 启动随机循环计时器
function startRandomCycle() {
  // 安全检查：如果主计时器已重置，则停止
  if (mainTimerId === null) {
    console.log("主计时器已重置，停止随机循环");
    return;
  }

  console.log("开始新的随机间隔...");

  // 获取随机时间（3-5分钟的毫秒数）
  const randomMs = getRandomMinutes();
  const endTime = new Date(Date.now() + randomMs);
  // console.log("Random endTime obj:", endTime);
  // console.log("Random endTime ms:", endTime.getTime());

  // 启动随机计时器 - 传递毫秒数
  randomTimerId = countdown(
    endTime.getTime(), // <--- 修改点：传递毫秒数
    function (ts) {
      // 检查是否已经结束
      if (ts.value >= 0) {
        console.log("随机间隔结束，播放声音A");
        // 播放声音A
        soundA.play();

        // 清空随机计时器显示
        randomTimerDisplay.innerHTML = "等待中...";

        // 监听声音A播放完毕事件
        soundA.onended = function () {
          console.log("声音A播放完毕，开始10秒准备");
          startTenSecondWait();
        };
        return;
      }

      // 更新随机计时器显示
      randomTimerDisplay.innerHTML = formatMinuteSecond(ts.minutes, ts.seconds);
    },
    countdown.MINUTES | countdown.SECONDS
  );
}

// 启动10秒等待计时器
function startTenSecondWait() {
  // 安全检查：如果主计时器已重置，则停止
  if (mainTimerId === null) {
    console.log("主计时器已重置，停止10秒等待");
    return;
  }

  console.log("开始10秒准备时间...");

  // 显示10秒计时器卡片
  tenSecondTimerCard.classList.remove("hidden");

  // 计算10秒后的结束时间
  const endTime = new Date(Date.now() + 10 * 1000);
  // console.log("10s endTime obj:", endTime);
  // console.log("10s endTime ms:", endTime.getTime());

  // 启动10秒计时器 - 传递毫秒数
  tenSecondTimerId = countdown(
    endTime.getTime(), // <--- 修改点：传递毫秒数
    function (ts) {
      // 检查是否已经结束
      if (ts.value >= 0) {
        console.log("10秒准备结束，播放声音B");

        // 隐藏10秒计时器卡片
        tenSecondTimerCard.classList.add("hidden");

        // 播放声音B
        soundB.play();

        // 监听声音B播放完毕事件
        soundB.onended = function () {
          console.log("声音B播放完毕，开始下一个随机循环");
          // 开始下一个随机循环
          startRandomCycle();
        };
        return;
      }

      // 更新10秒计时器显示
      tenSecondTimerDisplay.innerHTML = ts.seconds;
    },
    countdown.SECONDS
  );
}

// 重置所有状态函数
function resetAll() {
  console.log("重置所有状态...");

  // 停止所有计时器
  if (mainTimerId !== null) {
    clearInterval(mainTimerId);
    mainTimerId = null;
  }
  if (randomTimerId !== null) {
    clearInterval(randomTimerId);
    randomTimerId = null;
  }
  if (tenSecondTimerId !== null) {
    clearInterval(tenSecondTimerId);
    tenSecondTimerId = null;
  }

  // 停止所有声音
  soundA.pause();
  soundA.currentTime = 0;
  soundB.pause();
  soundB.currentTime = 0;
  soundC.pause();
  soundC.currentTime = 0;

  // 重置界面显示
  mainTimerDisplay.innerHTML = "90:00";
  randomTimerDisplay.innerHTML = "--:--";
  tenSecondTimerDisplay.innerHTML = "10";

  // 隐藏10秒计时器卡片
  tenSecondTimerCard.classList.add("hidden");

  // 重置按钮状态
  startButton.disabled = false;
  resetButton.disabled = true;

  console.log("重置完成");
}

// 事件监听器
startButton.addEventListener("click", startTimers);
resetButton.addEventListener("click", resetAll);

// 页面加载时初始化
document.addEventListener("DOMContentLoaded", function () {
  console.log("页面加载完成，初始化应用状态");
  resetAll();
});
