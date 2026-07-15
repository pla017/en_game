<template>
  <view class="matching-game mini-game-screen">
    <image class="scene-bg" :src="bgUrl" mode="aspectFill" />
    <image class="back-button tap-image" :src="returnUrl" mode="aspectFit" @tap="goBack" />

    <view class="game-title"><text>消消乐</text></view>

    <view class="progress-area">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: `${progressPercent}%` }" />
        <view class="progress-knob" :style="{ left: `${progressPercent}%` }" />
      </view>
      <text class="progress-count">{{ totalMatched }}/{{ allPairs.length }}</text>
      <text class="round-count">第 {{ roundIndex + 1 }} 轮 · {{ roundMatched }}/{{ pairsPerRound }}</text>
    </view>

    <view class="card-stage">
      <view v-for="slot in slots" :key="slot" class="card-slot" :class="`slot-${slot}`">
        <view
          v-if="slotCards[slot]"
          class="word-card-hit"
          @tap="tapCard(slotCards[slot] as Card)"
        >
          <view
            class="word-card"
            :class="[
              `card-${slotCards[slot]?.language}`,
              `palette-${slotCards[slot]?.palette}`,
              {
                'is-selected': selectedIds.includes(slotCards[slot]?.id || ''),
                'is-clearing': clearingIds.includes(slotCards[slot]?.id || ''),
                'is-wrong': wrongIds.includes(slotCards[slot]?.id || '')
              }
            ]"
          >
            <view v-if="clearingIds.includes(slotCards[slot]?.id || '')" class="card-glow" />
            <text class="card-label" :class="{ 'long-word': (slotCards[slot]?.value.length || 0) > 10 }">
              {{ slotCards[slot]?.value }}
            </text>
            <view v-if="selectedIds.includes(slotCards[slot]?.id || '')" class="selected-mark">✓</view>
          </view>
        </view>
      </view>

      <view v-if="showWrong" class="wrong-notice">
        <image :src="wrongAnswerUrl" mode="aspectFit" />
      </view>
      <view v-if="roundTransition" class="round-notice">第 {{ roundIndex + 2 }} 轮开始！</view>
      <view v-for="spark in sparks" :key="spark" class="success-spark" :class="`spark-${spark}`">★</view>
    </view>

    <view v-if="isComplete" class="complete-layer">
      <view class="complete-panel">
        <text class="complete-title">全部配对成功！</text>
        <view class="result-line">
          <text>本局用时</text>
          <text class="result-value">{{ formattedTime }}</text>
        </view>
        <view class="result-line">
          <text>星级评分</text>
          <view class="result-stars">
            <text v-for="star in 3" :key="star" :class="{ muted: star > earnedStars }">★</text>
          </view>
        </view>
        <view class="restart-button" @tap="restart">再玩一次</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';
import bgUrl from './assets/bg.jpg';
import returnUrl from './assets/return.png';
import wrongAnswerUrl from './assets/Wrong-answer.png';
import selectAudioUrl from './audio/select.mp3';
import correctAudioUrl from './audio/correct.mp3';
import wrongAudioUrl from './audio/wrong.mp3';

type Language = 'en' | 'cn';
type Palette = 'blue' | 'lavender' | 'peach' | 'mint' | 'yellow';

interface PairWord {
  id: string;
  en: string;
  cn: string;
}

interface Card {
  id: string;
  pairId: string;
  language: Language;
  value: string;
  palette: Palette;
}

const allPairs: PairWord[] = [
  { id: 'dog', en: 'dog', cn: '狗' },
  { id: 'cat', en: 'cat', cn: '猫' },
  { id: 'rat', en: 'rat', cn: '老鼠' },
  { id: 'dinosaur', en: 'dinosaur', cn: '恐龙' },
  { id: 'snake', en: 'snake', cn: '蛇' },
  { id: 'elephant', en: 'elephant', cn: '大象' },
  { id: 'giraffe', en: 'giraffe', cn: '长颈鹿' },
  { id: 'monkey', en: 'monkey', cn: '猴子' },
  { id: 'rabbit', en: 'rabbit', cn: '兔子' },
  { id: 'zebra', en: 'zebra', cn: '斑马' }
];

const palettes: Palette[] = ['blue', 'lavender', 'peach', 'mint', 'yellow'];
const pairsPerRound = 5;
const roundsTotal = Math.ceil(allPairs.length / pairsPerRound);
const slots = Array.from({ length: pairsPerRound * 2 }, (_, index) => index);
const { updateProgress, resetProgress } = useGameProgress('game-02');

const roundIndex = ref(0);
const roundMatched = ref(0);
const totalMatched = ref(0);
const slotCards = ref<Array<Card | null>>(Array(slots.length).fill(null));
const selectedIds = ref<string[]>([]);
const clearingIds = ref<string[]>([]);
const wrongIds = ref<string[]>([]);
const sparks = ref<number[]>([]);
const showWrong = ref(false);
const roundTransition = ref(false);
const isComplete = ref(false);
const elapsedSeconds = ref(0);
const wrongAttempts = ref(0);
const studyStartedAt = ref(0);

let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let effectAudio: UniApp.InnerAudioContext | null = null;
const effectAudioUrls = {
  select: selectAudioUrl,
  correct: correctAudioUrl,
  wrong: wrongAudioUrl
};

const progressPercent = computed(() => (totalMatched.value / allPairs.length) * 100);
const earnedStars = computed(() => {
  if (wrongAttempts.value <= 2) return 3;
  if (wrongAttempts.value <= 5) return 2;
  return 1;
});
const formattedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function loadRound(index: number) {
  const start = index * pairsPerRound;
  const roundWords = allPairs.slice(start, start + pairsPerRound);
  const nextCards = shuffle(roundWords.flatMap((pair, pairIndex) => [
    {
      id: `${pair.id}-en`,
      pairId: pair.id,
      language: 'en' as Language,
      value: pair.en,
      palette: palettes[pairIndex % palettes.length]
    },
    {
      id: `${pair.id}-cn`,
      pairId: pair.id,
      language: 'cn' as Language,
      value: pair.cn,
      palette: palettes[(pairIndex + 2) % palettes.length]
    }
  ]));

  slotCards.value = nextCards;
  selectedIds.value = [];
  clearingIds.value = [];
  wrongIds.value = [];
  roundMatched.value = 0;
  showWrong.value = false;
}

function tapCard(card: Card) {
  if (isComplete.value || roundTransition.value || clearingIds.value.length) return;

  if (selectedIds.value.includes(card.id)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== card.id);
    return;
  }

  playEffect('select');
  playWord(card.value, card.language);

  if (!selectedIds.value.length) {
    selectedIds.value = [card.id];
    return;
  }

  const first = findCard(selectedIds.value[0]);
  if (!first) {
    selectedIds.value = [card.id];
    return;
  }

  if (first.language === card.language) {
    wrongAttempts.value += 1;
    wrongIds.value = [first.id, card.id];
    showWrong.value = true;
    playEffect('wrong');
    clearFeedback(2700);
    return;
  }

  if (first.pairId === card.pairId) {
    clearPair(first, card);
    return;
  }

  wrongAttempts.value += 1;
  wrongIds.value = [first.id, card.id];
  showWrong.value = true;
  playEffect('wrong');
  clearFeedback(2700);
}

function findCard(id: string) {
  return slotCards.value.find((card) => card?.id === id) || null;
}

function clearPair(first: Card, second: Card) {
  selectedIds.value = [first.id, second.id];
  clearingIds.value = [first.id, second.id];
  sparks.value = [1, 2, 3, 4, 5, 6];
  playEffect('correct');
  void uni.vibrateShort?.({ type: 'light' });

  clearTimer = setTimeout(() => {
    slotCards.value = slotCards.value.map((card) => (
      card && clearingIds.value.includes(card.id) ? null : card
    ));
    selectedIds.value = [];
    clearingIds.value = [];
    sparks.value = [];
    roundMatched.value += 1;
    totalMatched.value += 1;
    updateProgress(totalMatched.value * 10, totalMatched.value === allPairs.length);

    if (roundMatched.value === pairsPerRound) {
      if (roundIndex.value < roundsTotal - 1) {
        roundTransition.value = true;
        transitionTimer = setTimeout(() => {
          roundIndex.value += 1;
          loadRound(roundIndex.value);
          roundTransition.value = false;
        }, 760);
      } else {
        elapsedSeconds.value = Math.max(1, Math.round((Date.now() - studyStartedAt.value) / 1000));
        setTimeout(() => {
          isComplete.value = true;
        }, 420);
      }
    }
  }, 640);
}

function clearFeedback(delay: number) {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    selectedIds.value = [];
    wrongIds.value = [];
    showWrong.value = false;
  }, delay);
}

function playEffect(effect: 'select' | 'correct' | 'wrong') {
  if (!effectAudio) {
    effectAudio = uni.createInnerAudioContext();
    effectAudio.obeyMuteSwitch = false;
  }
  effectAudio.stop();
  effectAudio.src = effectAudioUrls[effect];
  effectAudio.play();
}

function playWord(value: string, language: Language) {
  if (language !== 'en' || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = 'en-US';
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

function restart() {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (clearTimer) clearTimeout(clearTimer);
  if (transitionTimer) clearTimeout(transitionTimer);
  resetProgress();
  roundIndex.value = 0;
  roundMatched.value = 0;
  totalMatched.value = 0;
  wrongAttempts.value = 0;
  elapsedSeconds.value = 0;
  isComplete.value = false;
  roundTransition.value = false;
  loadRound(0);
  studyStartedAt.value = Date.now();
}

function goBack() {
  uni.navigateBack();
}

onMounted(() => {
  studyStartedAt.value = Date.now();
  loadRound(0);
  clockTimer = setInterval(() => {
    if (!isComplete.value && studyStartedAt.value) {
      elapsedSeconds.value = Math.floor((Date.now() - studyStartedAt.value) / 1000);
    }
  }, 1000);
});

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (clearTimer) clearTimeout(clearTimer);
  if (transitionTimer) clearTimeout(transitionTimer);
  if (clockTimer) clearInterval(clockTimer);
  effectAudio?.destroy();
  effectAudio = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});
</script>

<style scoped lang="scss">
.matching-game {
  position: relative;
  overflow: hidden;
  background: #f5d800;
  touch-action: none;
}

.scene-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.back-button { position: absolute; z-index: 10; top: calc(var(--status-bar-height) + 38rpx); left: 34rpx; width: 88rpx; height: 88rpx; }
.game-title { position: absolute; z-index: 5; top: calc(var(--status-bar-height) + 58rpx); left: 160rpx; right: 160rpx; color: #713300; font-size: 48rpx; font-weight: 900; line-height: 1.1; text-align: center; text-shadow: 0 4rpx 0 rgba(255, 245, 113, 0.7); }

.progress-area { position: absolute; z-index: 5; top: calc(var(--status-bar-height) + 158rpx); left: 50%; width: min(464rpx, calc(100vw - 96rpx)); transform: translateX(-50%); }
.progress-track { position: relative; width: 100%; height: 45rpx; border: 6rpx solid #fff; border-radius: 999rpx; background: #bd8a00; box-shadow: 0 3rpx 0 rgba(110, 69, 0, 0.18); }
.progress-fill { position: absolute; top: 5rpx; bottom: 5rpx; left: 5rpx; max-width: calc(100% - 10rpx); border-radius: 999rpx; background: #ffe07b; transition: width 0.35s ease; }
.progress-knob { position: absolute; top: 50%; width: 32rpx; height: 32rpx; border: 3rpx solid #fff; border-radius: 50%; background: #fffdf3; box-shadow: 0 3rpx 5rpx rgba(105, 67, 0, 0.18); transform: translate(-50%, -50%); transition: left 0.35s ease; }
.progress-count { display: block; margin-top: 8rpx; color: #713300; font-size: 36rpx; font-weight: 900; line-height: 1; text-align: center; }
.round-count { display: block; margin-top: 8rpx; color: #a05b12; font-size: 24rpx; font-weight: 800; line-height: 1; text-align: center; }

.card-stage { position: absolute; z-index: 2; top: calc(var(--status-bar-height) + 500rpx); right: 24rpx; left: 24rpx; height: 760rpx; }
.card-slot { position: absolute; left: 0; display: flex; width: 100%; height: 150rpx; align-items: center; justify-content: center; overflow: visible; pointer-events: none; transform: translateX(var(--slot-shift, 0)); }
.slot-0 { top: -12rpx; --slot-shift: -170rpx; --card-rotation: -12deg; }
.slot-1 { top: 42rpx; --slot-shift: 150rpx; --card-rotation: 9deg; }
.slot-2 { top: 158rpx; --slot-shift: -108rpx; --card-rotation: 3deg; }
.slot-3 { top: 214rpx; --slot-shift: 124rpx; --card-rotation: -9deg; }
.slot-4 { top: 318rpx; --slot-shift: -178rpx; --card-rotation: -4deg; }
.slot-5 { top: 372rpx; --slot-shift: 162rpx; --card-rotation: 11deg; }
.slot-6 { top: 480rpx; --slot-shift: -130rpx; --card-rotation: 7deg; }
.slot-7 { top: 534rpx; --slot-shift: 148rpx; --card-rotation: -7deg; }
.slot-8 { top: 642rpx; --slot-shift: -168rpx; --card-rotation: -10deg; }
.slot-9 { top: 696rpx; --slot-shift: 132rpx; --card-rotation: 8deg; }
.word-card-hit { position: relative; z-index: 4; display: inline-flex; min-width: 180rpx; min-height: 170rpx; align-items: center; justify-content: center; padding: 12rpx; pointer-events: auto; touch-action: manipulation; }
.word-card { position: relative; z-index: 3; display: inline-flex; flex: 0 1 auto; min-width: 124rpx; max-width: 100%; min-height: 120rpx; align-items: center; justify-content: center; padding: 18rpx 24rpx; border: 6rpx solid #fff; border-radius: 16rpx; box-shadow: 0 7rpx 0 rgba(103, 71, 0, 0.18), 0 7rpx 14rpx rgba(103, 71, 0, 0.18); transform: rotate(var(--card-rotation, -3deg)); transition: transform 0.18s ease, filter 0.18s ease, opacity 0.24s ease; }
.card-en { color: #245889; }
.card-cn { color: #713d90; }
.palette-blue { background: #a9ddfa; border-color: #fff; }
.palette-lavender { background: #dcd9f8; }
.palette-peach { background: #ffdbad; color: #a7442d; }
.palette-mint { background: #b9efdb; color: #197a67; }
.palette-yellow { background: #ffe99b; color: #93600f; }
.card-label { position: relative; z-index: 2; display: block; min-width: 0; max-width: 100%; overflow: visible; color: inherit; font-size: 38rpx; font-weight: 900; line-height: 1.1; text-align: center; white-space: nowrap; }
.card-cn .card-label { font-size: 48rpx; }
.card-label.long-word { font-size: 32rpx; letter-spacing: 0; }
.card-cn .card-label.long-word { font-size: 36rpx; }
.selected-mark { position: absolute; z-index: 4; top: -22rpx; right: -20rpx; width: 42rpx; height: 42rpx; border: 4rpx solid #fff; border-radius: 50%; background: #f49a2d; color: #fff; font-size: 28rpx; font-weight: 900; line-height: 34rpx; text-align: center; }
.word-card.is-selected { z-index: 7; filter: brightness(1.12) drop-shadow(0 0 18rpx rgba(255, 255, 255, 0.95)); transform: rotate(var(--card-rotation, -3deg)) translateY(-10rpx) scale(1.06); }
.word-card.is-clearing { animation: clear-card 0.58s ease-in forwards; pointer-events: none; }
.word-card.is-wrong { animation: wrong-card 0.62s ease-in-out both; }
.card-glow { position: absolute; z-index: 0; inset: -26rpx; border-radius: 50%; box-shadow: 0 0 54rpx 28rpx rgba(255, 255, 238, 0.95); animation: glow-pulse 0.72s ease-out both; pointer-events: none; }

.wrong-notice { position: absolute; z-index: 20; top: -150rpx; left: 50%; width: 540rpx; height: 140rpx; animation: wrong-notice-slide 3.2s cubic-bezier(0.22, 0.61, 0.36, 1) both; pointer-events: none; }
.wrong-notice image { width: 100%; height: 100%; }
.round-notice { position: absolute; z-index: 20; top: 44%; left: 50%; padding: 18rpx 40rpx; border: 5rpx solid #fff; border-radius: 999rpx; background: #f59b2c; box-shadow: 0 7rpx 0 rgba(164, 82, 7, 0.34); color: #fff; font-size: 38rpx; font-weight: 900; white-space: nowrap; transform: translate(-50%, -50%); animation: notice-pop 0.76s ease both; }
.success-spark { position: absolute; z-index: 12; left: 50%; top: 48%; color: #fff; font-size: 40rpx; font-weight: 900; opacity: 0; pointer-events: none; animation: sparkle 0.58s ease-out forwards; }
.spark-1 { --x: -220rpx; --y: -160rpx; }.spark-2 { --x: 210rpx; --y: -142rpx; animation-delay: 40ms; }.spark-3 { --x: -250rpx; --y: 12rpx; animation-delay: 70ms; }.spark-4 { --x: 240rpx; --y: 8rpx; animation-delay: 30ms; }.spark-5 { --x: -120rpx; --y: 162rpx; animation-delay: 90ms; }.spark-6 { --x: 132rpx; --y: 156rpx; animation-delay: 55ms; }

.complete-layer { position: absolute; z-index: 30; inset: 0; display: flex; align-items: center; justify-content: center; padding: 48rpx; background: rgba(103, 72, 0, 0.28); }
.complete-panel { width: min(570rpx, calc(100vw - 80rpx)); padding: 52rpx 40rpx 42rpx; border: 7rpx solid #fff; border-radius: 22rpx; background: #ffe86d; box-shadow: 0 14rpx 0 rgba(151, 96, 0, 0.26); text-align: center; }
.complete-title { display: block; margin-bottom: 30rpx; color: #733400; font-size: 44rpx; font-weight: 900; line-height: 1.2; }
.result-line { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 10rpx; border-bottom: 2rpx solid rgba(155, 99, 10, 0.2); color: #8d570c; font-size: 30rpx; font-weight: 700; }
.result-value { color: #713300; font-size: 38rpx; font-variant-numeric: tabular-nums; }
.result-stars { display: flex; gap: 6rpx; color: #f29b27; font-size: 48rpx; line-height: 1; }.result-stars .muted { color: #d5bd72; }
.restart-button { margin-top: 34rpx; height: 82rpx; border-radius: 41rpx; background: #f69b31; color: #fff; font-size: 30rpx; font-weight: 800; line-height: 82rpx; box-shadow: 0 6rpx 0 #d3791e; }

@keyframes clear-card { 0% { opacity: 1; transform: scale(1); } 36% { opacity: 1; transform: scale(1.12); filter: brightness(1.35); } 100% { opacity: 0; transform: scale(0); } }
@keyframes glow-pulse { 0% { opacity: 0; transform: scale(0.5); } 28% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.35); } }
@keyframes wrong-card { 0%, 100% { translate: 0 0; } 15% { translate: -18rpx 0; } 30% { translate: 18rpx 0; } 45% { translate: -16rpx 0; } 60% { translate: 16rpx 0; } 75% { translate: -9rpx 0; } 88% { translate: 9rpx 0; } }
@keyframes wrong-notice-slide { 0% { opacity: 0; transform: translateX(130%); } 19% { opacity: 0; transform: translateX(130%); } 28% { opacity: 1; transform: translateX(-50%); } 87% { opacity: 1; transform: translateX(-50%); } 100% { opacity: 0; transform: translateX(-180%); } }
@keyframes notice-pop { from { opacity: 0; transform: translate(-50%, -50%) scale(0.7); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes sparkle { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.2); } }

@media (max-height: 680px) {
  .card-stage { top: calc(var(--status-bar-height) + 420rpx); height: 680rpx; }
  .card-slot { height: 126rpx; }
  .word-card { min-height: 104rpx; padding: 14rpx 18rpx; }
  .card-label { font-size: 34rpx; }.card-cn .card-label { font-size: 42rpx; }.card-label.long-word { font-size: 30rpx; }
}
</style>
