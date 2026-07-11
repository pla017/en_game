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
    <image class="cloud cloud-mid" src="/static/games/game-01/clound5.png" mode="aspectFit" />

    <view v-if="loading" class="state-panel">
      <text class="state-text">加载单词数据...</text>
    </view>

    <view v-else-if="errorMessage" class="state-panel">
      <text class="error-text">{{ errorMessage }}</text>
    </view>

      <view v-else-if="currentWord" class="card-stage">
      <view
        class="blackboard-stage"
        :class="[
          wordCardClass,
          `word-card-target-${hideTarget}`
        ]"
      >
        <image class="blackboard-bg" src="/static/games/game-01/main.png" mode="scaleToFill" />

        <view v-if="glowing" class="board-effect board-effect-on">
          <view class="halo" />
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
        </view>

        <view class="board-content">
          <view class="letter-row">
            <text
              v-for="(letter, index) in wordLetters"
              :key="`${currentWord.id}-${index}`"
              class="letter"
              :class="letterClass"
              :style="{ color: letterColors[index % letterColors.length], animationDelay: `${index * 70}ms` }"
            >{{ letter }}</text>
          </view>

          <view v-if="phonetic" class="phonetic-pill" @tap="manualPlayAudio">
            <text class="speaker-icon">🔊</text>
            <text class="phonetic-text">{{ phonetic }}</text>
          </view>

          <view class="meaning-row" :class="swapClass">
            <text v-if="currentWord.partOfSpeech" class="pos-text">{{ currentWord.partOfSpeech }}</text>
            <text class="meaning-text">{{ primaryMeaning }}</text>
          </view>
        </view>
      </view>

      <view class="picture-stage">
        <image
          class="robot"
          :class="{ 'robot-bounce': glowing }"
          src="/static/games/game-01/robot.png"
          mode="aspectFit"
        />
        <view v-if="isWordHidden" class="robot-bubble">
          <image class="robot-bubble-bg" src="/static/games/game-01/diagno.png" mode="scaleToFill" />
          <text class="robot-bubble-text">{{ robotHint }}</text>
        </view>
      </view>

      <view
        v-if="isWordHidden"
        class="search-guide"
        :class="`search-guide-${hideTarget}`"
        @tap="findHiddenWord(hideTarget)"
      >
        <image
          v-if="isCloudTarget"
          class="search-cloud-cover"
          :src="hideTargetImage"
          mode="aspectFit"
        />
        <view v-else class="search-grass-marker" />
        <view class="search-tap-ring ring-one" />
        <view class="search-tap-ring ring-two" />
        <image class="search-hand" src="/static/games/game-01/touch.gif" mode="aspectFit" />
      </view>

      <image
        v-if="isHideTargetCovered && isCloudTarget"
        class="hide-target-cover"
        :class="`hide-target-cover-${hideTarget}`"
        :src="hideTargetImage"
        mode="aspectFit"
      />

      <view class="game-actions">
        <image class="action-button tap-image" :class="{ 'play-button-active': playButtonActive }" src="/static/games/game-01/icon_play.png" mode="aspectFit" @tap="manualPlayAudio" />
        <image
          class="action-button tap-image next-button"
          :class="{ 'next-button-locked': !nextWordUnlocked }"
          src="/static/games/game-01/icon_next.png"
          mode="aspectFit"
          @tap="nextWord"
        />
      </view>

      <view v-if="successVisible" class="success-mask">
        <image class="success-light" src="/static/games/game-01/light.png" mode="aspectFit" />
        <view class="success-cloud success-cloud-left" />
        <view class="success-cloud success-cloud-right" />
        <image class="success-title-img" src="/static/games/game-01/Challenge.png" mode="aspectFit" />
        <view class="success-star-field">
          <image class="success-star-img star-1" src="/static/games/game-01/star.png" mode="aspectFit" />
          <image class="success-star-img star-2" src="/static/games/game-01/star.png" mode="aspectFit" />
          <image class="success-star-img star-3" src="/static/games/game-01/star.png" mode="aspectFit" />
          <image class="success-star-img star-4" src="/static/games/game-01/star.png" mode="aspectFit" />
          <image class="success-star-img star-5" src="/static/games/game-01/star.png" mode="aspectFit" />
          <image class="success-star-img star-6" src="/static/games/game-01/star.png" mode="aspectFit" />
        </view>
        <image class="success-award" src="/static/games/game-01/award.png" mode="aspectFit" />
        <view class="success-info">
          <view class="success-line">
            <text class="success-label">闯关用时：</text>
            <text class="success-value">{{ formattedStudyTime }}</text>
          </view>
          <view class="success-line">
            <text class="success-label">获得星星：</text>
            <view class="success-earned-stars">
              <image class="success-earned-star" src="/static/games/game-01/star.png" mode="aspectFit" />
              <image class="success-earned-star" src="/static/games/game-01/star.png" mode="aspectFit" />
              <image class="success-earned-star" src="/static/games/game-01/star.png" mode="aspectFit" />
            </view>
          </view>
        </view>
        <image
          class="next-level-button tap-image"
          src="/static/games/game-01/next_step.png"
          mode="aspectFit"
          @tap="goNextLevel"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { CSSProperties } from 'vue';
import { fetchGame01Words, reportGame01LearningTime } from './game01/service';
import type { WordItem } from './game01/types';
import { useGameProgress } from '@/composables/progress';

const words = ref<WordItem[]>([]);
const currentIndex = ref(0);
const loading = ref(true);
const errorMessage = ref('');
const glowing = ref(false);
const playButtonActive = ref(false);
const swapFlip = ref(false);
const successVisible = ref(false);
const wordStage = ref<'preview' | 'hiding' | 'hidden' | 'revealing' | 'revealed'>('preview');
const searchRound = ref(0);
type HideTarget = 'cloud-left' | 'cloud-right' | 'cloud-mid' | 'grass';

const hideTarget = ref<HideTarget>('cloud-left');
const audioPlaying = ref(false);
const studyDurationSeconds = ref(0);
const windowWidth = ref(375);
const windowHeight = ref(667);
const statusBarHeight = ref(0);
const menuButtonLeft = ref(375);

const letterColors = ['#ff8fab', '#ffb84c', '#38a5ed', '#5ec9a4', '#b39dff'];

const sparkles = [
  { icon: '✨', style: 'left: 50%; top: 50%; --tx: -205rpx; --ty: -150rpx; animation-delay: 0ms;' },
  { icon: '⭐', style: 'left: 50%; top: 50%; --tx: 190rpx; --ty: -150rpx; animation-delay: 70ms;' },
  { icon: '💫', style: 'left: 50%; top: 50%; --tx: -230rpx; --ty: 8rpx; animation-delay: 140ms;' },
  { icon: '🌟', style: 'left: 50%; top: 50%; --tx: 220rpx; --ty: 14rpx; animation-delay: 120ms;' },
  { icon: '✨', style: 'left: 50%; top: 50%; --tx: -88rpx; --ty: -214rpx; animation-delay: 200ms;' },
  { icon: '⭐', style: 'left: 50%; top: 50%; --tx: 92rpx; --ty: -214rpx; animation-delay: 40ms;' },
  { icon: '✨', style: 'left: 50%; top: 50%; --tx: -120rpx; --ty: 178rpx; animation-delay: 180ms;' },
  { icon: '⭐', style: 'left: 50%; top: 50%; --tx: 130rpx; --ty: 176rpx; animation-delay: 110ms;' }
];

const { updateProgress } = useGameProgress('game-01');
const SEARCH_ROUND_LIMIT = 3;
const hideTargetOptions: HideTarget[] = ['cloud-left', 'cloud-right', 'cloud-mid', 'grass'];
const fallbackAudioMap: Record<string, { en: string; cn: string }> = {
  hello: { en: '/static/games/game-01/audio/hello.mp3', cn: '/static/games/game-01/audio/hello_cn.mp3' },
  hi: { en: '/static/games/game-01/audio/hi.mp3', cn: '/static/games/game-01/audio/hi_cn.mp3' },
  i: { en: '/static/games/game-01/audio/i.mp3', cn: '/static/games/game-01/audio/i_cn.mp3' },
  am: { en: '/static/games/game-01/audio/am.mp3', cn: '/static/games/game-01/audio/am_cn.mp3' },
  im: { en: '/static/games/game-01/audio/im.mp3', cn: '/static/games/game-01/audio/im_cn.mp3' },
  my: { en: '/static/games/game-01/audio/my.mp3', cn: '/static/games/game-01/audio/my_cn.mp3' },
  name: { en: '/static/games/game-01/audio/name.mp3', cn: '/static/games/game-01/audio/name_cn.mp3' },
  is: { en: '/static/games/game-01/audio/is.mp3', cn: '/static/games/game-01/audio/is_cn.mp3' },
  what: { en: '/static/games/game-01/audio/what.mp3', cn: '/static/games/game-01/audio/what_cn.mp3' },
  whats: { en: '/static/games/game-01/audio/whats.mp3', cn: '/static/games/game-01/audio/whats_cn.mp3' }
};

let audioContext: UniApp.InnerAudioContext | null = null;
let glowTimer: ReturnType<typeof setTimeout> | null = null;
let autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
let playButtonTimer: ReturnType<typeof setTimeout> | null = null;
let stageTimer: ReturnType<typeof setTimeout> | null = null;
let playbackToken = 0;
let flowToken = 0;
let cancelActiveAudio: (() => void) | null = null;
let completionModalShown = false;
let studyStartedAt = 0;

function rpxToPx(value: number) {
  return (windowWidth.value * value) / 750;
}

const currentWord = computed(() => words.value[currentIndex.value]);
const primaryMeaning = computed(() => currentWord.value?.meaningCn || '');
const phonetic = computed(() => currentWord.value?.phoneticUs || currentWord.value?.phoneticUk || '');
const wordLetters = computed(() => (currentWord.value?.word || '').split(''));
const formattedStudyTime = computed(() => formatDuration(studyDurationSeconds.value));
const isWordHidden = computed(() => wordStage.value === 'hidden');
const isHideTargetCovered = computed(() => (
  wordStage.value === 'hidden'
));
const isCloudTarget = computed(() => hideTarget.value.startsWith('cloud'));
const hideTargetImage = computed(() => ({
  'cloud-left': '/static/games/game-01/clound3.png',
  'cloud-right': '/static/games/game-01/clound1.png',
  'cloud-mid': '/static/games/game-01/clound5.png',
  grass: ''
}[hideTarget.value]));
const nextWordUnlocked = computed(() => searchRound.value >= SEARCH_ROUND_LIMIT && wordStage.value === 'revealed');
const robotHint = computed(() => (
  isCloudTarget.value
    ? '单词躲在云朵咯，点一点把它找出来！'
    : '单词躲在草丛里咯，点一点把它找出来！'
));
const wordCardClass = computed(() => ({
  'word-card-hiding': wordStage.value === 'hiding',
  'word-card-hidden': wordStage.value === 'hidden',
  'word-card-revealing': wordStage.value === 'revealing'
}));
const gameStyle = computed<CSSProperties>(() => {
  const titleWidth = rpxToPx(356);
  const centeredTitleLeft = (windowWidth.value - titleWidth) / 2;
  const minTitleLeft = rpxToPx(140);
  const maxTitleLeft = Math.max(minTitleLeft, menuButtonLeft.value - titleWidth - rpxToPx(28));
  const titleLeft = Math.min(Math.max(centeredTitleLeft, minTitleLeft), maxTitleLeft);
  const boardWidth = Math.min(rpxToPx(640), windowWidth.value - rpxToPx(64));
  const boardHeight = boardWidth * 598 / 694;
  const boardTop = Math.max(statusBarHeight.value + rpxToPx(400), windowHeight.value * 0.31);
  const actionBottom = Math.max(rpxToPx(48), windowHeight.value * 0.04);

  return {
    '--game-width': `${windowWidth.value}px`,
    '--game-height': `${windowHeight.value}px`,
    '--status-bar-height': `${statusBarHeight.value}px`,
    '--title-left': `${titleLeft}px`,
    '--board-width': `${boardWidth}px`,
    '--board-height': `${boardHeight}px`,
    '--board-left': `${(windowWidth.value - boardWidth) / 2}px`,
    '--board-top': `${boardTop}px`,
    '--action-bottom': `${actionBottom}px`
  } as CSSProperties;
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
    studyStartedAt = Date.now();
    resetWordInteraction();
    autoPlayTimer = setTimeout(playInitialAudio, 700);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  (uni as any).offWindowResize?.(updateLayout);
  flowToken += 1;
  if (glowTimer) clearTimeout(glowTimer);
  if (playButtonTimer) clearTimeout(playButtonTimer);
  cancelScheduledFlow();
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
  if (!words.value.length || successVisible.value || !nextWordUnlocked.value) return;

  flowToken += 1;
  cancelScheduledFlow();
  swapFlip.value = !swapFlip.value;
  currentIndex.value += 1;
  completionModalShown = false;
  resetWordInteraction();

  if (autoPlayTimer) clearTimeout(autoPlayTimer);
  autoPlayTimer = setTimeout(playInitialAudio, 500);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}秒`;
  }

  return `${minutes}分${seconds}秒`;
}

function triggerGlow() {
  glowing.value = false;

  if (glowTimer) clearTimeout(glowTimer);

  // 先关再开，确保连续点击时粒子动画重播
  setTimeout(() => {
    glowing.value = true;
    glowTimer = setTimeout(() => {
      glowing.value = false;
    }, 1600);
  }, 30);
}

function triggerPlayButtonEffect() {
  playButtonActive.value = true;

  if (playButtonTimer) clearTimeout(playButtonTimer);

  playButtonTimer = setTimeout(() => {
    playButtonActive.value = false;
  }, 520);
}

function getFallbackAudioKey(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getAudioSources(word: WordItem) {
  const fallbackAudio = fallbackAudioMap[getFallbackAudioKey(word.word)];

  return [
    word.audioUrl || fallbackAudio?.en,
    word.meaningAudioUrl || fallbackAudio?.cn
  ].filter(Boolean) as string[];
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = uni.createInnerAudioContext();
  }

  return audioContext;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stopCurrentAudio() {
  playbackToken += 1;
  cancelActiveAudio?.();
  cancelActiveAudio = null;
  audioContext?.stop();
}

function cancelScheduledFlow() {
  if (autoPlayTimer) clearTimeout(autoPlayTimer);
  if (stageTimer) clearTimeout(stageTimer);
  stopCurrentAudio();
}

function resetWordInteraction() {
  searchRound.value = 0;
  wordStage.value = 'preview';
  hideTarget.value = getHideTarget();
}

function getHideTarget(excludedTarget?: HideTarget): HideTarget {
  const candidates = hideTargetOptions.filter((target) => target !== excludedTarget);
  return candidates[Math.floor(Math.random() * candidates.length)] || hideTargetOptions[0];
}

function startHideAnimation(expectedFlow = flowToken) {
  if (expectedFlow !== flowToken) return;
  if (stageTimer) clearTimeout(stageTimer);
  if (glowTimer) clearTimeout(glowTimer);
  glowing.value = false;

  wordStage.value = 'hiding';
  stageTimer = setTimeout(() => {
    if (expectedFlow !== flowToken || wordStage.value !== 'hiding') return;
    wordStage.value = 'hidden';
  }, 1100);
}

function playSource(src: string, token: number) {
  return new Promise<void>((resolve, reject) => {
    if (token !== playbackToken) {
      resolve();
      return;
    }

    const context = getAudioContext();
    let settled = false;

    const cleanup = () => {
      (context as any).offEnded?.(handleEnded);
      (context as any).offError?.(handleError);
      if (cancelActiveAudio === finish) cancelActiveAudio = null;
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleEnded = () => finish();
    const handleError = (error: unknown) => fail(error);

    cancelActiveAudio = finish;
    context.stop();
    context.onEnded(handleEnded);
    context.onError(handleError);
    context.src = src;
    context.play();
  });
}

function showCompleteDialog() {
  if (completionModalShown) return;

  completionModalShown = true;
  studyDurationSeconds.value = Math.max(1, Math.round((Date.now() - studyStartedAt) / 1000));
  successVisible.value = true;
  updateProgress(words.value.length * 10, true);
  reportLearningTime();
}

async function reportLearningTime() {
  try {
    await reportGame01LearningTime({
      gameId: 'game-01',
      durationSeconds: studyDurationSeconds.value,
      wordCount: words.value.length,
      completedAt: Date.now()
    });
  } catch (error) {
    console.error('Game01 learning time report failed:', error);
  }
}

function goNextLevel() {
  flowToken += 1;
  cancelScheduledFlow();
  uni.redirectTo({
    url: '/pages/play/play?id=game-02'
  });
}

async function playWordAudioOnce() {
  const word = currentWord.value;

  if (!word || successVisible.value || audioPlaying.value) return false;

  audioPlaying.value = true;
  stopCurrentAudio();
  const token = playbackToken;
  const sources = getAudioSources(word);

  try {
    triggerGlow();
    triggerPlayButtonEffect();

    if (!sources.length) {
      uni.showToast({
        title: '接口未返回音频',
        icon: 'none'
      });
      await wait(650);
      return token === playbackToken;
    }

    for (const src of sources) {
      if (token !== playbackToken) return false;
      await playSource(src, token);
      await wait(160);
    }

    return token === playbackToken;
  } catch (error) {
    console.error('Game01 audio play failed:', error);
    uni.showToast({
      title: '音频播放失败',
      icon: 'none'
    });
    return false;
  } finally {
    audioPlaying.value = false;
  }
}

async function playInitialAudio() {
  const expectedFlow = flowToken;
  if (wordStage.value !== 'preview' || audioPlaying.value) return;

  const played = await playWordAudioOnce();
  if (played && expectedFlow === flowToken && wordStage.value === 'preview') {
    startHideAnimation(expectedFlow);
  }
}

function manualPlayAudio() {
  if (audioPlaying.value || successVisible.value) return;
  if (wordStage.value !== 'preview' && wordStage.value !== 'revealed') return;

  if (wordStage.value === 'preview' && autoPlayTimer) {
    clearTimeout(autoPlayTimer);
  }

  const expectedFlow = flowToken;
  void playWordAudioOnce().then((played) => {
    if (played && expectedFlow === flowToken && wordStage.value === 'preview') {
      startHideAnimation(expectedFlow);
    }
  });
}

async function findHiddenWord(target: HideTarget) {
  if (wordStage.value !== 'hidden' || target !== hideTarget.value) return;

  const expectedFlow = flowToken;
  wordStage.value = 'revealing';
  const played = await playWordAudioOnce();
  if (!played || expectedFlow !== flowToken || wordStage.value !== 'revealing') {
    if (expectedFlow === flowToken && wordStage.value === 'revealing') {
      wordStage.value = 'hidden';
    }
    return;
  }

  await wait(420);
  if (expectedFlow !== flowToken || wordStage.value !== 'revealing') return;
  searchRound.value += 1;

  if (searchRound.value >= SEARCH_ROUND_LIMIT) {
    wordStage.value = 'revealed';
    updateProgress((currentIndex.value + 1) * 10, currentIndex.value === words.value.length - 1);

    if (currentIndex.value === words.value.length - 1) {
      showCompleteDialog();
    }
    return;
  }

  hideTarget.value = getHideTarget(hideTarget.value);
  startHideAnimation(expectedFlow);
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
  z-index: 100;
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

.round-count-pill {
  flex: 0 0 66rpx;
  width: 66rpx;
  height: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(255, 245, 170, 0.96);
  box-shadow: 0 2rpx 8rpx rgba(117, 91, 17, 0.24);
}

.round-count-text {
  color: #c07824;
  font-size: 22rpx;
  font-weight: 900;
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
  left: 156rpx;
  top: calc(var(--status-bar-height) + 230rpx);
  width: 222rpx;
  height: 121rpx;
}

.cloud-right {
  right: 72rpx;
  top: calc(var(--status-bar-height) + 262rpx);
  width: 168rpx;
  height: 93rpx;
  animation-delay: 2.2s;
}

.cloud-far {
  left: -18rpx;
  top: calc(var(--status-bar-height) + 40rpx);
  width: 142rpx;
  height: 90rpx;
  opacity: 0.95;
  animation-delay: 3.4s;
  animation-duration: 8s;
}

.cloud-mid {
  left: calc((var(--game-width) - 232rpx) / 2 + 62rpx);
  top: calc(var(--status-bar-height) + 402rpx);
  width: 232rpx;
  height: 116rpx;
  animation-delay: 1.3s;
  animation-duration: 7.2s;
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
  top: 0;
  bottom: 0;
  z-index: 20;
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
  top: calc(var(--status-bar-height) + 472rpx);
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

.blackboard-stage {
  position: absolute;
  left: var(--board-left);
  top: var(--board-top);
  z-index: 80;
  width: var(--board-width);
  height: var(--board-height);
  transform-origin: center center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  will-change: transform, opacity;
  transition: transform 1.1s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 1.1s ease;
  transform: translate3d(0, 0, 0) scale(1);
  animation: stage-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.word-card-hidden {
  visibility: visible;
  opacity: 0;
  pointer-events: none;
  animation: none;
  transform: translate3d(var(--hide-x), var(--hide-y), 0) scale(0.08);
}

.word-card-target-cloud-left {
  --hide-x: -78rpx;
  --hide-y: -292rpx;
  --hide-x-28: -22rpx;
  --hide-y-28: -82rpx;
  --hide-x-72: -56rpx;
  --hide-y-72: -218rpx;
}

.word-card-target-cloud-right {
  --hide-x: 174rpx;
  --hide-y: -254rpx;
  --hide-x-28: 49rpx;
  --hide-y-28: -71rpx;
  --hide-x-72: 125rpx;
  --hide-y-72: -190rpx;
}

.word-card-target-cloud-mid {
  --hide-x: 8rpx;
  --hide-y: -196rpx;
  --hide-x-28: 2rpx;
  --hide-y-28: -55rpx;
  --hide-x-72: 6rpx;
  --hide-y-72: -146rpx;
}

.word-card-target-cloud-far {
  --hide-x: -174rpx;
  --hide-y: -386rpx;
  --hide-x-28: -49rpx;
  --hide-y-28: -108rpx;
  --hide-x-72: -125rpx;
  --hide-y-72: -288rpx;
}

.word-card-target-grass {
  --hide-x: -108rpx;
  --hide-y: 266rpx;
  --hide-x-28: -30rpx;
  --hide-y-28: 74rpx;
  --hide-x-72: -78rpx;
  --hide-y-72: 192rpx;
}

.word-card-hiding[class*="word-card-target-cloud"],
.word-card-hiding.word-card-target-grass {
  animation: none;
  opacity: 0;
  transform: translate3d(var(--hide-x), var(--hide-y), 0) scale(0.08);
}

.word-card-revealing[class*="word-card-target-cloud"],
.word-card-revealing.word-card-target-grass {
  animation: none;
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

.blackboard-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.board-effect {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.board-content {
  position: absolute;
  left: 12%;
  top: 49%;
  z-index: 3;
  width: 76%;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}

/* ---------- 英文单词 ---------- */
.letter-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  max-width: 520rpx;
  min-height: 100rpx;
}

.letter {
  font-size: 82rpx;
  font-weight: 900;
  line-height: 100rpx;
  text-shadow: 0 4rpx 0 rgba(255, 255, 255, 0.45), 0 9rpx 8rpx rgba(38, 67, 42, 0.34);
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
  margin-top: 24rpx;
  min-width: 282rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 0 32rpx;
  border-radius: 999rpx;
  background: #fff0c8;
  box-shadow: 0 3rpx 0 rgba(132, 95, 43, 0.22);
}

.speaker-icon {
  font-size: 30rpx;
  line-height: 1;
}

.phonetic-text {
  color: #9b6532;
  font-size: 34rpx;
  font-weight: 800;
}

/* ---------- 机器人舞台 ---------- */
.picture-stage {
  position: absolute;
  right: 36rpx;
  top: calc(var(--board-top) + var(--board-height) - 24rpx);
  width: 230rpx;
  height: 270rpx;
  z-index: 35;
}

.robot-bubble {
  position: absolute;
  right: 96rpx;
  top: -50rpx;
  z-index: 6;
  width: 306rpx;
  height: 204rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44rpx 34rpx 38rpx 40rpx;
  transform-origin: 72% 100%;
  will-change: transform, opacity;
  animation: bubble-pop 0.42s cubic-bezier(0.22, 1.1, 0.36, 1) both;
}

.robot-bubble-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
}

.robot-bubble-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
  line-height: 34rpx;
  text-align: center;
  text-shadow: 0 2rpx 2rpx rgba(35, 108, 177, 0.42);
}

@keyframes bubble-pop {
  from { transform: translateY(18rpx) rotate(-7deg) scale(0.72); opacity: 0; }
  to { transform: translateY(0) rotate(-7deg) scale(1); opacity: 1; }
}

.hide-target-cover {
  position: absolute;
  z-index: 40;
  pointer-events: none;
}

.hide-target-cover-cloud-left {
  left: 156rpx;
  top: calc(var(--status-bar-height) + 230rpx);
  width: 222rpx;
  height: 121rpx;
}

.hide-target-cover-cloud-right {
  right: 72rpx;
  top: calc(var(--status-bar-height) + 262rpx);
  width: 168rpx;
  height: 93rpx;
}

.hide-target-cover-cloud-mid {
  left: calc((var(--game-width) - 232rpx) / 2 + 62rpx);
  top: calc(var(--status-bar-height) + 402rpx);
  width: 232rpx;
  height: 116rpx;
}

.hide-target-cover-cloud-far {
  left: -18rpx;
  top: calc(var(--status-bar-height) + 40rpx);
  width: 255rpx;
  height: 128rpx;
}

.search-guide {
  position: absolute;
  z-index: 45;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: search-guide-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.search-guide-cloud-left {
  left: 156rpx;
  top: calc(var(--status-bar-height) + 230rpx);
  width: 222rpx;
  height: 121rpx;
}

.search-guide-cloud-right {
  right: 72rpx;
  top: calc(var(--status-bar-height) + 262rpx);
  width: 168rpx;
  height: 93rpx;
}

.search-guide-cloud-mid {
  left: calc((var(--game-width) - 232rpx) / 2 + 62rpx);
  top: calc(var(--status-bar-height) + 402rpx);
  width: 232rpx;
  height: 116rpx;
}

.search-guide-cloud-far {
  left: -18rpx;
  top: calc(var(--status-bar-height) + 40rpx);
  width: 255rpx;
  height: 128rpx;
}

.search-guide-grass {
  left: 34rpx;
  bottom: 110rpx;
  width: 308rpx;
  height: 196rpx;
}

.search-cloud-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.search-grass-marker {
  position: absolute;
  left: 14rpx;
  right: 18rpx;
  bottom: 0;
  height: 96rpx;
  border-radius: 50% 50% 42% 42%;
  background: rgba(86, 198, 54, 0.16);
  box-shadow: inset 0 0 0 5rpx rgba(255, 255, 255, 0.42), 0 0 24rpx rgba(255, 255, 255, 0.36);
  pointer-events: none;
  animation: grass-marker-pulse 1.5s ease-in-out infinite;
}

.search-hand {
  position: absolute;
  z-index: 3;
  width: 126rpx;
  height: 126rpx;
  object-fit: contain;
  pointer-events: none;
  animation: hand-tap 1.1s ease-in-out infinite;
}

.search-guide-cloud-left .search-hand,
.search-guide-cloud-right .search-hand,
.search-guide-cloud-mid .search-hand,
.search-guide-cloud-far .search-hand {
  left: 54rpx;
  top: 44rpx;
}

.search-guide-grass .search-hand {
  right: 42rpx;
  top: 16rpx;
}

.search-tap-ring {
  position: absolute;
  z-index: 2;
  width: 86rpx;
  height: 86rpx;
  border: 7rpx solid rgba(255, 125, 108, 0.72);
  border-radius: 50%;
  pointer-events: none;
  animation: tap-ring 1.1s ease-out infinite;
}

.search-guide-cloud-left .search-tap-ring,
.search-guide-cloud-right .search-tap-ring,
.search-guide-cloud-mid .search-tap-ring,
.search-guide-cloud-far .search-tap-ring {
  left: 74rpx;
  top: 64rpx;
}

.search-guide-grass .search-tap-ring {
  right: 62rpx;
  top: 38rpx;
}

.ring-two {
  animation-delay: 0.42s;
}

@keyframes search-guide-enter {
  from { transform: scale(0.7); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes grass-marker-pulse {
  0%, 100% { opacity: 0.42; transform: scale(0.96); }
  50% { opacity: 0.9; transform: scale(1.03); }
}

@keyframes hand-tap {
  0%, 100% { transform: translateY(0) scale(1); }
  42% { transform: translateY(10rpx) scale(0.92); }
  68% { transform: translateY(-4rpx) scale(1.03); }
}

@keyframes tap-ring {
  0% { transform: scale(0.48); opacity: 0.88; }
  78%, 100% { transform: scale(1.36); opacity: 0; }
}

.halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 360rpx;
  height: 360rpx;
  margin: -180rpx 0 0 -180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 236, 160, 0.95) 0%, rgba(255, 214, 120, 0.35) 45%, transparent 70%);
  opacity: 1;
  transition: opacity 0.25s ease;
  pointer-events: none;
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
  width: 330rpx;
  height: 330rpx;
  margin: -165rpx 0 0 -165rpx;
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
  margin: -22rpx 0 0 -22rpx;
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
  left: calc(50% - 45rpx);
  top: calc(50% - 45rpx);
  width: 90rpx;
  height: 90rpx;
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
  width: 30rpx;
  height: 30rpx;
  margin-top: -15rpx;
}

.wave-2 {
  width: 56rpx;
  height: 56rpx;
  margin-top: -28rpx;
  animation-delay: 0.15s;
}

.wave-3 {
  width: 82rpx;
  height: 82rpx;
  margin-top: -41rpx;
  animation-delay: 0.3s;
}

@keyframes wave-fade {
  0% { opacity: 0; transform: scale(0.7); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.1); }
}

.picture-note {
  position: absolute;
  z-index: 2;
  left: 0;
  top: 20rpx;
  width: 156rpx;
  height: 170rpx;
  transform: rotate(-8deg);
  animation: note-bob 3.4s 0.8s ease-in-out infinite;
}

@keyframes note-bob {
  0%, 100% { transform: rotate(-8deg) translateY(0); }
  50% { transform: rotate(-5deg) translateY(-12rpx); }
}

.note-glow {
  filter: drop-shadow(0 0 22rpx rgba(255, 200, 90, 0.92));
}

.robot {
  position: absolute;
  z-index: 2;
  right: 0;
  top: 18rpx;
  width: 154rpx;
  height: 228rpx;
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
  margin-top: 54rpx;
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}

.pos-text {
  flex-shrink: 0;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #ffb84c;
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 3rpx 0 rgba(126, 90, 35, 0.22);
}

.meaning-text {
  max-width: 88%;
  color: #9b4f28;
  font-size: 56rpx;
  font-weight: 900;
  line-height: 70rpx;
  text-align: center;
  word-break: break-all;
  text-shadow: 0 4rpx 0 rgba(255, 238, 190, 0.72), 0 7rpx 8rpx rgba(48, 55, 40, 0.35);
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

.game-actions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--action-bottom);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 116rpx;
}

.action-button {
  width: 116rpx;
  height: 116rpx;
  transition: transform 0.12s ease, filter 0.12s ease;
}

.play-button-active {
  animation: play-button-pop 0.52s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  filter: drop-shadow(0 0 22rpx rgba(255, 211, 75, 0.95));
}

@keyframes play-button-pop {
  0% { transform: scale(1); }
  38% { transform: scale(1.22) rotate(-6deg); }
  70% { transform: scale(0.96) rotate(3deg); }
  100% { transform: scale(1); }
}

.next-button {
  width: 104rpx;
  height: 104rpx;
}

.next-button-locked {
  opacity: 0.42;
  filter: grayscale(1) saturate(0.25);
}

.success-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0, 76, 92, 0.62);
  overflow: hidden;
  animation: success-fade 0.28s ease-out both;
}

@keyframes success-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.success-light {
  position: absolute;
  left: 50%;
  top: 39%;
  z-index: 1;
  width: 720rpx;
  height: 632rpx;
  margin: -316rpx 0 0 -360rpx;
  opacity: 0.95;
  pointer-events: none;
  animation: success-light-pulse 2s ease-in-out infinite;
}

@keyframes success-light-pulse {
  0%, 100% { transform: scale(0.98); opacity: 0.82; }
  50% { transform: scale(1.05); opacity: 1; }
}

.success-cloud {
  position: absolute;
  width: 128rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.55);
}

.success-cloud::before,
.success-cloud::after {
  content: '';
  position: absolute;
  bottom: 14rpx;
  border-radius: 50%;
  background: inherit;
}

.success-cloud::before {
  left: 22rpx;
  width: 58rpx;
  height: 58rpx;
}

.success-cloud::after {
  right: 18rpx;
  width: 46rpx;
  height: 46rpx;
}

.success-cloud-left {
  left: 132rpx;
  top: 17%;
}

.success-cloud-right {
  right: 84rpx;
  top: 20%;
}

.success-title-img {
  position: absolute;
  left: 50%;
  top: 13.5%;
  z-index: 4;
  width: 410rpx;
  height: 129rpx;
  margin-left: -205rpx;
  animation: title-pop 0.48s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes title-pop {
  from { transform: scale(0.62); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.success-star-field {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.success-star-img {
  position: absolute;
  width: 58rpx;
  height: 56rpx;
  filter: drop-shadow(0 5rpx 6rpx rgba(88, 59, 0, 0.26));
  animation: success-star-twinkle 1.35s ease-in-out infinite;
}

.star-1 {
  left: 88rpx;
  top: 24%;
}

.star-2 {
  right: 106rpx;
  top: 31%;
  width: 48rpx;
  height: 47rpx;
  animation-delay: 0.22s;
}

.star-3 {
  left: 74rpx;
  top: 38%;
  width: 66rpx;
  height: 64rpx;
  animation-delay: 0.44s;
}

.star-4 {
  right: 76rpx;
  top: 41%;
  width: 42rpx;
  height: 41rpx;
  animation-delay: 0.12s;
}

.star-5 {
  left: 112rpx;
  top: 53%;
  width: 42rpx;
  height: 41rpx;
  animation-delay: 0.34s;
}

.star-6 {
  right: 92rpx;
  top: 53%;
  width: 56rpx;
  height: 54rpx;
  animation-delay: 0.58s;
}

@keyframes success-star-twinkle {
  0%, 100% { transform: scale(0.82) rotate(-8deg); opacity: 0.74; }
  50% { transform: scale(1.18) rotate(10deg); opacity: 1; }
}

.success-award {
  position: absolute;
  left: 50%;
  top: 24%;
  z-index: 3;
  width: 438rpx;
  height: 597rpx;
  margin-left: -219rpx;
  animation: medal-pop 0.58s 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes medal-pop {
  from { transform: translateY(80rpx) scale(0.5); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.success-info {
  position: absolute;
  left: 50%;
  top: 61%;
  z-index: 6;
  width: 590rpx;
  margin-left: -295rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4rpx;
  pointer-events: none;
}

.success-line {
  width: 590rpx;
  min-height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 48rpx;
}

.success-label,
.success-value {
  color: #fff739;
  font-size: 38rpx;
  font-weight: 800;
  line-height: 52rpx;
  text-shadow:
    0 4rpx 0 rgba(52, 142, 26, 0.9),
    0 7rpx 9rpx rgba(0, 56, 32, 0.45);
}

.success-earned-stars {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-left: 10rpx;
}

.success-earned-star {
  width: 58rpx;
  height: 56rpx;
  filter: drop-shadow(0 5rpx 5rpx rgba(90, 65, 0, 0.28));
}

.next-level-button {
  position: absolute;
  left: 50%;
  top: 76%;
  z-index: 7;
  width: 338rpx;
  height: 110rpx;
  margin-left: -169rpx;
  animation: next-button-enter 0.45s 0.28s ease-out both;
}

@keyframes next-button-enter {
  from { transform: translateY(40rpx); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
