<template>
  <view class="word-game mini-game-screen" :style="gameStyle">
    <image class="scene-bg" src="/static/games/game-01/bg2.jpg" mode="aspectFill" />

    <view class="top-bar">
      <image class="back-button tap-image" src="/static/games/game-01/return.png" mode="aspectFit" @tap="goBack" />
      <view class="title-wrap">
        <image class="title-board" src="/static/games/game-01/wooden.png" mode="aspectFit" />
      </view>
    </view>

    <image class="cloud cloud-left" src="/static/games/game-01/clound3.png" mode="aspectFit" />
    <image class="cloud cloud-right" src="/static/games/game-01/clound1.png" mode="aspectFit" />
    <image class="cloud cloud-far" src="/static/games/game-01/clound4.png" mode="aspectFit" />

    <view v-if="loading" class="state-panel">
      <text class="state-text">加载单词数据...</text>
    </view>

    <view v-else-if="errorMessage" class="state-panel">
      <text class="error-text">{{ errorMessage }}</text>
    </view>

    <view v-else-if="currentWord" class="card-stage">
      <view class="progress-row">
        <view class="count-pill">
          <text class="count-text">{{ currentIndex + 1 }}/{{ words.length }}</text>
        </view>
        <view
          v-for="(item, index) in words"
          :key="item.id"
          class="progress-dot"
          :class="{ done: index < currentIndex, active: index === currentIndex }"
        />
      </view>

      <view class="main-card">
        <image class="card-bg" src="/static/games/game-01/main_bg.png" mode="scaleToFill" />

        <view class="card-content">
          <!-- 英文单词：字母逐个弹跳入场 -->
          <view class="letter-row">
            <text
              v-for="(letter, index) in wordLetters"
              :key="`${currentWord.id}-${index}`"
              class="letter"
              :class="letterClass"
              :style="{ color: letterColors[index % letterColors.length], animationDelay: `${index * 70}ms` }"
            >{{ letter }}</text>
          </view>

          <view v-if="phonetic" class="phonetic-pill" @tap="playAudio">
            <text class="phonetic-text">🔊 {{ phonetic }}</text>
          </view>

          <!-- 机器人 + 实物便签：点击发光并发音 -->
          <view class="picture-stage" @tap="playAudio">
            <view class="halo" :class="{ 'halo-on': glowing }" />
            <template v-if="glowing">
              <view class="glow-ring ring-1" />
              <view class="glow-ring ring-2" />
              <text
                v-for="(sparkle, index) in sparkles"
                :key="index"
                class="sparkle"
                :style="sparkle.style"
              >{{ sparkle.icon }}</text>
              <view class="sound-waves">
                <view class="wave wave-1" />
                <view class="wave wave-2" />
                <view class="wave wave-3" />
              </view>
            </template>

            <view class="speech-bubble" :class="{ talking: glowing }">
              <text class="speech-text">{{ glowing ? '跟我读～' : '点我听发音' }}</text>
            </view>

            <view class="picture-note" :class="[swapClass, { 'note-glow': glowing }]">
              <image class="note-bg" src="/static/games/game-01/card_bg.png" mode="scaleToFill" />
              <image class="word-picture" :src="wordImageSrc" mode="aspectFit" />
            </view>

            <image
              class="robot"
              :class="{ 'robot-bounce': glowing }"
              src="/static/games/game-01/robot.png"
              mode="aspectFit"
            />
          </view>

          <!-- 中文释义 -->
          <view class="meaning-row" :class="swapClass">
            <text v-if="currentWord.partOfSpeech" class="pos-text">{{ currentWord.partOfSpeech }}</text>
            <text class="meaning-text">{{ primaryMeaning }}</text>
          </view>

          <view class="card-actions">
            <view class="action-item" @tap="playAudio">
              <image class="action-button tap-image" src="/static/games/game-01/icon_play.png" mode="aspectFit" />
              <text class="action-label">发音</text>
            </view>
            <view class="action-item" @tap="nextWord">
              <image class="action-button tap-image" src="/static/games/game-01/icon_next.png" mode="aspectFit" />
              <text class="action-label">下一个</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { CSSProperties } from 'vue';
import { fetchGame01Words } from './game01/service';
import type { WordItem } from './game01/types';
import { useGameProgress } from '@/composables/progress';

const words = ref<WordItem[]>([]);
const currentIndex = ref(0);
const loading = ref(true);
const errorMessage = ref('');
const glowing = ref(false);
const swapFlip = ref(false);
const windowWidth = ref(375);
const windowHeight = ref(667);
const statusBarHeight = ref(0);
const menuButtonLeft = ref(375);
const availableWordImages = ['dog'];

const letterColors = ['#ff8fab', '#ffb84c', '#38a5ed', '#5ec9a4', '#b39dff'];

const sparkles = [
  { icon: '✨', style: 'left: 4%; top: 26%; --tx: -70rpx; --ty: -110rpx; animation-delay: 0ms;' },
  { icon: '⭐', style: 'right: 4%; top: 22%; --tx: 80rpx; --ty: -100rpx; animation-delay: 80ms;' },
  { icon: '💫', style: 'left: 10%; top: 60%; --tx: -90rpx; --ty: -20rpx; animation-delay: 160ms;' },
  { icon: '🌟', style: 'right: 8%; top: 58%; --tx: 90rpx; --ty: -30rpx; animation-delay: 120ms;' },
  { icon: '✨', style: 'left: 42%; top: 2%; --tx: -20rpx; --ty: -120rpx; animation-delay: 200ms;' },
  { icon: '⭐', style: 'right: 38%; top: 4%; --tx: 40rpx; --ty: -130rpx; animation-delay: 40ms;' }
];

const { updateProgress } = useGameProgress('game-01');

let audioContext: UniApp.InnerAudioContext | null = null;
let glowTimer: ReturnType<typeof setTimeout> | null = null;
let autoPlayTimer: ReturnType<typeof setTimeout> | null = null;

function rpxToPx(value: number) {
  return (windowWidth.value * value) / 750;
}

const currentWord = computed(() => words.value[currentIndex.value]);
const primaryMeaning = computed(() => currentWord.value?.meaningCn.split(/[；;]/)[0] || '');
const phonetic = computed(() => currentWord.value?.phoneticUs || currentWord.value?.phoneticUk || '');
const wordLetters = computed(() => (currentWord.value?.word || '').split(''));
const cardScale = computed(() => {
  const cardHeight = rpxToPx(1112);
  const cardTop = statusBarHeight.value + rpxToPx(168 + 92);
  const availableHeight = windowHeight.value - cardTop - rpxToPx(24);

  return Math.min(1, Math.max(0.76, availableHeight / cardHeight));
});
const gameStyle = computed<CSSProperties>(() => {
  const cardWidth = rpxToPx(694);
  const cardHeight = rpxToPx(1112) * cardScale.value;
  const stageTop = statusBarHeight.value + rpxToPx(168);
  const stageHeight = windowHeight.value - stageTop;
  const cardTop = Math.max(rpxToPx(16), (stageHeight - cardHeight) / 2);
  const progressWidth = rpxToPx(620);
  const titleWidth = rpxToPx(356);
  const centeredTitleLeft = (windowWidth.value - titleWidth) / 2;
  const minTitleLeft = rpxToPx(140);
  const maxTitleLeft = Math.max(minTitleLeft, menuButtonLeft.value - titleWidth - rpxToPx(28));
  const titleLeft = Math.min(Math.max(centeredTitleLeft, minTitleLeft), maxTitleLeft);

  return {
    '--game-width': `${windowWidth.value}px`,
    '--game-height': `${windowHeight.value}px`,
    '--card-left': `${(windowWidth.value - cardWidth) / 2}px`,
    '--card-top': `${cardTop}px`,
    '--card-scale': String(cardScale.value),
    '--progress-left': `${(windowWidth.value - progressWidth) / 2}px`,
    '--title-left': `${titleLeft}px`
  } as CSSProperties;
});
const wordImageSrc = computed(() => {
  const word = currentWord.value?.word.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (word && availableWordImages.includes(word)) {
    return `/static/games/game-01/${word}.png`;
  }

  return '/static/games/game-01/dog.png';
});

// 交替两组同样的关键帧，保证小程序端切词时入场动画能重新播放
const swapClass = computed(() => (swapFlip.value ? 'swap-a' : 'swap-b'));
const letterClass = computed(() => (swapFlip.value ? 'letter-a' : 'letter-b'));

onMounted(async () => {
  updateLayout();
  (uni as any).onWindowResize?.(updateLayout);

  try {
    const response = await fetchGame01Words();

    if (response.code !== 0) {
      throw new Error(response.msg || '获取单词数据失败');
    }

    words.value = response.data;
    autoPlayTimer = setTimeout(playAudio, 700);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  (uni as any).offWindowResize?.(updateLayout);
  if (glowTimer) clearTimeout(glowTimer);
  if (autoPlayTimer) clearTimeout(autoPlayTimer);
  audioContext?.destroy();
  audioContext = null;
});

function updateLayout() {
  const info = uni.getSystemInfoSync();

  windowWidth.value = info.windowWidth || 375;
  windowHeight.value = info.windowHeight || 667;
  statusBarHeight.value = info.statusBarHeight || 0;

  const menuButton = (uni as any).getMenuButtonBoundingClientRect?.();
  menuButtonLeft.value = menuButton?.left || windowWidth.value - rpxToPx(34);
}

function goBack() {
  uni.navigateBack();
}

function nextWord() {
  if (!words.value.length) return;

  swapFlip.value = !swapFlip.value;
  currentIndex.value = (currentIndex.value + 1) % words.value.length;
  updateProgress((currentIndex.value + 1) * 10, currentIndex.value === words.value.length - 1);

  if (autoPlayTimer) clearTimeout(autoPlayTimer);
  autoPlayTimer = setTimeout(playAudio, 500);
}

function triggerGlow() {
  glowing.value = false;

  if (glowTimer) clearTimeout(glowTimer);

  // 先关再开，确保连续点击时粒子动画重播
  setTimeout(() => {
    glowing.value = true;
    glowTimer = setTimeout(() => {
      glowing.value = false;
    }, 1200);
  }, 30);
}

function playAudio() {
  const word = currentWord.value;

  if (!word) return;

  triggerGlow();

  if (!word.audioUrl) {
    uni.showToast({
      title: word.phoneticUs || word.word,
      icon: 'none'
    });
    return;
  }

  if (!audioContext) {
    audioContext = uni.createInnerAudioContext();
    audioContext.onError((error) => {
      console.error('Game01 audio play failed:', error);
      uni.showToast({
        title: '音频播放失败',
        icon: 'none'
      });
    });
  }

  audioContext.stop();
  audioContext.src = word.audioUrl;
  audioContext.play();
}
</script>

<style scoped lang="scss">
.word-game {
  position: relative;
  left: 0;
  top: 0;
  width: var(--game-width);
  max-width: var(--game-width);
  height: var(--game-height);
  overflow: hidden;
  touch-action: none;
}

.scene-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ---------- 顶部栏 ---------- */
.top-bar {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  z-index: 2;
  width: var(--game-width);
  height: calc(var(--status-bar-height) + 168rpx);
  padding: calc(var(--status-bar-height) + 18rpx) 36rpx 0;
}

.back-button {
  position: absolute;
  left: 34rpx;
  top: calc(var(--status-bar-height) + 18rpx);
  width: 86rpx;
  height: 90rpx;
}

.title-wrap {
  position: absolute;
  left: var(--title-left);
  top: calc(var(--status-bar-height) + 8rpx);
  width: 356rpx;
  height: 144rpx;
  animation: title-drop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes title-drop {
  from { transform: translateY(-160rpx); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.title-board {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.count-pill {
  flex: 0 0 78rpx;
  width: 78rpx;
  height: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2rpx 8rpx rgba(16, 88, 135, 0.24);
}

.count-text {
  color: #2488c5;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 34rpx;
}

/* ---------- 云朵 ---------- */
.cloud {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  animation: cloud-drift 6s ease-in-out infinite;
}

.cloud-left {
  left: 178rpx;
  top: calc(var(--status-bar-height) + 154rpx);
  width: 222rpx;
  height: 121rpx;
}

.cloud-right {
  right: 72rpx;
  top: calc(var(--status-bar-height) + 202rpx);
  width: 168rpx;
  height: 93rpx;
  animation-delay: 2.2s;
}

.cloud-far {
  left: 28rpx;
  top: calc(var(--status-bar-height) + 320rpx);
  width: 120rpx;
  height: 66rpx;
  opacity: 0.8;
  animation-delay: 3.4s;
  animation-duration: 8s;
}

@keyframes cloud-drift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(28rpx); }
}

/* ---------- 状态 ---------- */
.state-panel {
  position: relative;
  z-index: 2;
  min-height: calc(100vh - var(--status-bar-height) - 132rpx);
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-text,
.error-text {
  padding: 20rpx 28rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.86);
  color: #64748b;
  font-size: 30rpx;
}

.error-text {
  color: #dc2626;
}

/* ---------- 卡片舞台 ---------- */
.card-stage {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--status-bar-height) + 168rpx);
  bottom: 0;
  z-index: 2;
  width: var(--game-width);
  max-width: var(--game-width);
  overflow: hidden;
  touch-action: none;
  animation: stage-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes stage-enter {
  from { transform: translateY(90rpx) scale(0.86); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.progress-row {
  position: absolute;
  left: calc((var(--game-width) - 520rpx) / 2);
  top: max(20rpx, calc(var(--card-top) - 76rpx));
  width: 520rpx;
  min-height: 44rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(35, 116, 166, 0.34);
  box-shadow: inset 0 2rpx 8rpx rgba(9, 79, 128, 0.2), 0 3rpx 10rpx rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8rpx);
}

.progress-dot {
  width: 20rpx;
  height: 20rpx;
  flex: 0 0 20rpx;
  border-radius: 50%;
  background: #ffffff;
  border: 3rpx solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 2rpx 8rpx rgba(20, 86, 132, 0.35);
  transition: all 0.3s ease;
}

.progress-dot.done {
  background: #ffb84c;
  border-color: #ffe4a7;
  box-shadow: 0 2rpx 8rpx rgba(171, 99, 18, 0.32);
}

.progress-dot.active {
  background: #ff8fab;
  border-color: #fff3f6;
  transform: scale(1.46);
  box-shadow: 0 0 0 6rpx rgba(255, 255, 255, 0.34), 0 0 18rpx rgba(255, 90, 138, 0.86);
}

.main-card {
  position: absolute;
  left: var(--card-left);
  top: var(--card-top);
  width: 694rpx;
  height: 1112rpx;
  transform-origin: top center;
  transform: scale(var(--card-scale));
}

@media screen and (max-height: 760px) {
}

@media screen and (max-height: 680px) {
}

.card-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.card-content {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 96rpx 74rpx 78rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ---------- 英文单词 ---------- */
.letter-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  max-width: 540rpx;
  min-height: 96rpx;
}

.letter {
  font-size: 84rpx;
  font-weight: 900;
  line-height: 96rpx;
  text-transform: uppercase;
  text-shadow: 0 4rpx 0 rgba(255, 255, 255, 0.9), 0 8rpx 10rpx rgba(150, 110, 60, 0.2);
}

.letter-a {
  animation: letter-pop-a 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.letter-b {
  animation: letter-pop-b 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes letter-pop-a {
  from { transform: translateY(50rpx) scale(0.3); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes letter-pop-b {
  from { transform: translateY(50rpx) scale(0.3); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.phonetic-pill {
  margin-top: 6rpx;
  padding: 6rpx 30rpx;
  border-radius: 999rpx;
  background: rgba(255, 224, 168, 0.6);
}

.phonetic-text {
  color: #c07a2c;
  font-size: 30rpx;
  font-weight: 600;
}

/* ---------- 机器人舞台 ---------- */
.picture-stage {
  position: relative;
  width: 480rpx;
  height: 450rpx;
  margin-top: 26rpx;
}

.halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 460rpx;
  height: 460rpx;
  margin: -230rpx 0 0 -230rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 236, 160, 0.95) 0%, rgba(255, 214, 120, 0.35) 45%, transparent 70%);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.halo-on {
  opacity: 1;
  animation: halo-pulse 0.9s ease-in-out infinite;
}

@keyframes halo-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

.glow-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 400rpx;
  height: 400rpx;
  margin: -200rpx 0 0 -200rpx;
  border-radius: 50%;
  border: 8rpx solid rgba(255, 184, 76, 0.85);
  pointer-events: none;
  animation: ring-burst 1s ease-out both;
}

.ring-2 {
  border-color: rgba(255, 143, 171, 0.7);
  animation-delay: 0.22s;
}

@keyframes ring-burst {
  from { transform: scale(0.55); opacity: 1; }
  to { transform: scale(1.45); opacity: 0; }
}

.sparkle {
  position: absolute;
  z-index: 4;
  font-size: 44rpx;
  pointer-events: none;
  animation: sparkle-fly 1s ease-out both;
}

@keyframes sparkle-fly {
  0% { transform: translate(0, 0) scale(0.3) rotate(0deg); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(1.25) rotate(50deg); opacity: 0; }
}

.sound-waves {
  position: absolute;
  z-index: 3;
  right: 262rpx;
  top: 30rpx;
  width: 120rpx;
  height: 120rpx;
  pointer-events: none;
}

.wave {
  position: absolute;
  right: 0;
  top: 50%;
  border: 8rpx solid transparent;
  border-left-color: #ffb84c;
  border-radius: 50%;
  animation: wave-fade 0.9s ease-out infinite;
}

.wave-1 {
  width: 40rpx;
  height: 40rpx;
  margin-top: -20rpx;
}

.wave-2 {
  width: 76rpx;
  height: 76rpx;
  margin-top: -38rpx;
  animation-delay: 0.15s;
}

.wave-3 {
  width: 112rpx;
  height: 112rpx;
  margin-top: -56rpx;
  animation-delay: 0.3s;
}

@keyframes wave-fade {
  0% { opacity: 0; transform: scale(0.7); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.1); }
}

.speech-bubble {
  position: absolute;
  z-index: 4;
  left: -16rpx;
  top: -34rpx;
  padding: 12rpx 26rpx;
  border-radius: 26rpx 26rpx 26rpx 6rpx;
  background: #fff;
  border: 4rpx solid #ffe0a8;
  box-shadow: 0 6rpx 14rpx rgba(200, 160, 90, 0.25);
  animation: bubble-wobble 2.6s ease-in-out infinite;
}

.speech-bubble.talking {
  background: #fff6df;
  border-color: #ffb84c;
}

@keyframes bubble-wobble {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-10rpx) rotate(2deg); }
}

.speech-text {
  color: #e8973c;
  font-size: 26rpx;
  font-weight: 800;
}

.picture-note {
  position: absolute;
  z-index: 2;
  left: 0;
  top: 108rpx;
  width: 210rpx;
  height: 220rpx;
  transform: rotate(-8deg);
  animation: note-bob 3.4s 0.8s ease-in-out infinite;
}

@keyframes note-bob {
  0%, 100% { transform: rotate(-8deg) translateY(0); }
  50% { transform: rotate(-5deg) translateY(-12rpx); }
}

.note-glow .note-bg {
  filter: drop-shadow(0 0 24rpx rgba(255, 200, 90, 0.95));
}

.note-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.word-picture {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150rpx;
  height: 150rpx;
  margin: -75rpx 0 0 -75rpx;
}

.robot {
  position: absolute;
  z-index: 2;
  right: 0;
  top: 0;
  width: 300rpx;
  height: 440rpx;
  animation: robot-enter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both, robot-float 3.2s 0.7s ease-in-out infinite;
}

.robot-bounce {
  animation: robot-jump 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes robot-enter {
  from { transform: translateY(120rpx) scale(0.6); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes robot-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16rpx); }
}

@keyframes robot-jump {
  0% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-32rpx) scale(1.06, 0.96); }
  60% { transform: translateY(0) scale(0.97, 1.04); }
  100% { transform: translateY(0) scale(1); }
}

/* ---------- 中文释义 ---------- */
.meaning-row {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
}

.pos-text {
  flex-shrink: 0;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 184, 76, 0.9);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

.meaning-text {
  color: #7c3f13;
  font-size: 60rpx;
  font-weight: 900;
  line-height: 80rpx;
  text-align: center;
}

/* ---------- 换词入场动画（交替两组以便小程序端重播） ---------- */
.swap-a {
  animation: card-pop-a 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.swap-b {
  animation: card-pop-b 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes card-pop-a {
  from { transform: translateY(40rpx) scale(0.82); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes card-pop-b {
  from { transform: translateY(40rpx) scale(0.82); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* 便签有自己的旋转+浮动动画，换词时用不带位移的淡入避免覆盖旋转角度 */
.picture-note.swap-a {
  animation: note-pop-a 0.5s ease-out both, note-bob 3.4s 0.8s ease-in-out infinite;
}

.picture-note.swap-b {
  animation: note-pop-b 0.5s ease-out both, note-bob 3.4s 0.8s ease-in-out infinite;
}

@keyframes note-pop-a {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes note-pop-b {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---------- 底部操作 ---------- */
.card-actions {
  width: 100%;
  margin-top: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 28rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.action-button {
  width: 116rpx;
  height: 116rpx;
}

.action-label {
  color: #8a6d52;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
