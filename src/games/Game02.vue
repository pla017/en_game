<template>
  <view class="matching-game mini-game-screen">
    <image class="scene-bg" src="/static/games/game-02/bg.jpg" mode="aspectFill" />

    <image class="back-button tap-image" src="/static/games/game-02/return.png" mode="aspectFit" @tap="goBack" />

    <view class="game-title">
      <text>消消乐</text>
    </view>

    <view class="progress-area">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: `${progressPercent}%` }" />
        <view class="progress-knob" :style="{ left: `${progressPercent}%` }" />
      </view>
      <text class="progress-count">{{ matchedCount }}/{{ pairs.length }}</text>
    </view>

    <view class="card-stage">
      <image
        v-if="selectedWord && !showWrong"
        class="selection-light"
        src="/static/games/game-02/light.png"
        mode="aspectFit"
      />

      <view
        v-for="card in cards"
        :key="card.id"
        class="word-card"
        :class="[
          `card-${card.position}`,
          `card-shape-${card.shape}`,
          card.language === 'en' ? 'english-card' : 'meaning-card',
          {
            'is-selected': selectedWord === card.id,
            'is-clearing': clearingCards.includes(card.id),
            'is-dropping': droppingCards.includes(card.id),
            'is-wrong': wrongCards.includes(card.id),
          }
        ]"
        @tap="tapCard(card)"
      >
        <image class="card-bg" :src="cardBackground(card.shape)" mode="scaleToFill" />
        <text class="card-label" :class="{ 'long-word': card.value.length > 7 }">{{ card.value }}</text>
        <view v-if="selectedWord === card.id" class="sound-pulse">
          <view class="sound-arc arc-one" />
          <view class="sound-arc arc-two" />
        </view>
      </view>

      <image
        v-for="card in clearingCardItems"
        :key="`light-${card.id}`"
        class="clear-light"
        :class="`clear-light-${card.position}`"
        src="/static/games/game-02/light.png"
        mode="aspectFit"
      />

      <view v-if="showWrong" class="wrong-notice">
        <image src="/static/games/game-02/Wrong-answer.png" mode="aspectFit" />
      </view>

      <view v-if="successVisible" class="success-notice">
        <text>配对成功！</text>
      </view>

      <view v-for="particle in particles" :key="particle" class="success-spark" :class="`spark-${particle}`">★</view>
    </view>

    <view class="bottom-decoration">
      <view class="leaf leaf-one" />
      <view class="leaf leaf-two" />
      <view class="leaf leaf-three" />
    </view>

    <view class="bottom-actions">
      <view class="listen-button tap-image" @tap="replaySelected">
        <view class="play-triangle" />
      </view>
      <image class="next-button tap-image" src="/static/games/game-02/next.png" mode="aspectFit" @tap="restart" />
    </view>

    <view v-if="isComplete" class="complete-layer">
      <view class="complete-panel">
        <text class="complete-title">全部配对成功！</text>
        <text class="complete-copy">你完成了本轮单词消消乐</text>
        <view class="complete-stars">
          <image v-for="star in 3" :key="star" src="/static/games/game-02/star.png" mode="aspectFit" />
        </view>
        <view class="restart-button" @tap="restart">再玩一次</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';

type Language = 'en' | 'cn';
type Shape = 1 | 2 | 3 | 4 | 5;

interface Card {
  id: string;
  pairId: string;
  language: Language;
  value: string;
  shape: Shape;
  position: string;
}

const pairs = [
  { id: 'dog', en: 'dog', cn: '狗' },
  { id: 'cat', en: 'cat', cn: '猫' },
  { id: 'rat', en: 'rat', cn: '老鼠' },
  { id: 'dinosaur', en: 'dinosaur', cn: '恐龙' },
  { id: 'snake', en: 'snake', cn: '蛇' }
];

const refillPairs = [
  { id: 'horse', en: 'horse', cn: '马' },
  { id: 'lion', en: 'lion', cn: '狮子' },
  { id: 'tiger', en: 'tiger', cn: '老虎' },
  { id: 'rabbit', en: 'rabbit', cn: '兔子' },
  { id: 'zebra', en: 'zebra', cn: '斑马' }
];

const initialCards: Card[] = [
  { id: 'dog-cn', pairId: 'dog', language: 'cn', value: '狗', shape: 1, position: 'one' },
  { id: 'rat-cn', pairId: 'rat', language: 'cn', value: '老鼠', shape: 2, position: 'two' },
  { id: 'cat-cn', pairId: 'cat', language: 'cn', value: '猫', shape: 3, position: 'three' },
  { id: 'cat-en', pairId: 'cat', language: 'en', value: 'cat', shape: 4, position: 'four' },
  { id: 'dog-en', pairId: 'dog', language: 'en', value: 'dog', shape: 4, position: 'five' },
  { id: 'dinosaur-cn', pairId: 'dinosaur', language: 'cn', value: '恐龙', shape: 1, position: 'six' },
  { id: 'rat-en', pairId: 'rat', language: 'en', value: 'rat', shape: 3, position: 'seven' },
  { id: 'snake-cn', pairId: 'snake', language: 'cn', value: '蛇', shape: 2, position: 'eight' },
  { id: 'dinosaur-en', pairId: 'dinosaur', language: 'en', value: 'dinosaur', shape: 5, position: 'nine' },
  { id: 'snake-en', pairId: 'snake', language: 'en', value: 'snake', shape: 4, position: 'ten' }
];

const { updateProgress, resetProgress } = useGameProgress('game-02');
const cards = ref<Card[]>(initialCards);
const selectedWord = ref('');
const clearingCards = ref<string[]>([]);
const droppingCards = ref<string[]>([]);
const wrongCards = ref<string[]>([]);
const showWrong = ref(false);
const successVisible = ref(false);
const particles = ref<number[]>([]);
const isComplete = ref(false);
const matchedCount = ref(0);
let refillIndex = 0;
let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let successTimer: ReturnType<typeof setTimeout> | null = null;
let completionTimer: ReturnType<typeof setTimeout> | null = null;
let dropTimer: ReturnType<typeof setTimeout> | null = null;
let effectAudio: UniApp.InnerAudioContext | null = null;

const progressPercent = computed(() => (matchedCount.value / pairs.length) * 100);
const clearingCardItems = computed(() => cards.value.filter((card) => clearingCards.value.includes(card.id)));

function cardBackground(shape: Shape) {
  return `/static/games/game-02/word0${shape}_bg.png`;
}

function tapCard(card: Card) {
  if (isComplete.value || clearingCards.value.length || droppingCards.value.length) return;

  if (card.language === 'en') {
    selectedWord.value = selectedWord.value === card.id ? '' : card.id;
    wrongCards.value = [];
    showWrong.value = false;
    if (selectedWord.value) {
      playEffect('select');
      playWord(card.value);
    }
    return;
  }

  const selected = cards.value.find((item) => item.id === selectedWord.value);
  if (!selected) {
    wrongCards.value = [card.id];
    playEffect('wrong');
    clearFeedback(420);
    return;
  }

  if (selected.pairId !== card.pairId) {
    wrongCards.value = [selected.id, card.id];
    showWrong.value = true;
    playEffect('wrong');
    clearFeedback(3250);
    return;
  }

  clearMatchedPair(selected.id, card.id);
}

function clearMatchedPair(wordId: string, meaningId: string) {
  clearingCards.value = [wordId, meaningId];
  particles.value = [1, 2, 3, 4, 5, 6];
  selectedWord.value = '';
  successVisible.value = true;
  playEffect('correct');
  void uni.vibrateShort?.({ type: 'light' });

  if (successTimer) clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successVisible.value = false;
    particles.value = [];
  }, 980);

  clearTimer = setTimeout(() => {
    const completed = matchedCount.value + 1 === pairs.length;
    clearingCards.value = [];
    matchedCount.value += 1;
    updateProgress(matchedCount.value * 20, completed);
    if (completed) {
      completionTimer = setTimeout(() => {
        isComplete.value = true;
      }, 720);
      return;
    }

    refillMatchedSlots(wordId, meaningId);
  }, 820);
}

function refillMatchedSlots(wordId: string, meaningId: string) {
  const wordCard = cards.value.find((card) => card.id === wordId);
  const meaningCard = cards.value.find((card) => card.id === meaningId);
  const nextPair = refillPairs[refillIndex % refillPairs.length];
  refillIndex += 1;

  if (!wordCard || !meaningCard || !nextPair) return;

  const nextWordId = `${nextPair.id}-en-${refillIndex}`;
  const nextMeaningId = `${nextPair.id}-cn-${refillIndex}`;
  cards.value = cards.value.map((card) => {
    if (card.id === wordId) {
      return { ...card, id: nextWordId, pairId: nextPair.id, value: nextPair.en };
    }
    if (card.id === meaningId) {
      return { ...card, id: nextMeaningId, pairId: nextPair.id, value: nextPair.cn };
    }
    return card;
  });
  droppingCards.value = [nextWordId, nextMeaningId];

  if (dropTimer) clearTimeout(dropTimer);
  dropTimer = setTimeout(() => {
    droppingCards.value = [];
  }, 680);
}

function clearFeedback(delay: number) {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    selectedWord.value = '';
    wrongCards.value = [];
    showWrong.value = false;
  }, delay);
}

function replaySelected() {
  const selected = cards.value.find((card) => card.id === selectedWord.value);
  if (selected) {
    playWord(selected.value);
    return;
  }

  const firstVisibleWord = cards.value.find((card) => card.language === 'en');
  if (firstVisibleWord) {
    selectedWord.value = firstVisibleWord.id;
    playEffect('select');
    playWord(firstVisibleWord.value);
  }
}

function playEffect(effect: 'select' | 'correct' | 'wrong') {
  if (!effectAudio) {
    effectAudio = uni.createInnerAudioContext();
    effectAudio.obeyMuteSwitch = false;
  }

  effectAudio.stop();
  effectAudio.src = `/static/games/game-02/audio/${effect}.mp3`;
  effectAudio.play();
}

function playWord(word: string) {
  // H5 can use the browser's built-in speech engine; the visual pulse remains the fallback in WeChat.
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.78;
    window.speechSynthesis.speak(utterance);
  }
}

function restart() {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (clearTimer) clearTimeout(clearTimer);
  if (successTimer) clearTimeout(successTimer);
  if (completionTimer) clearTimeout(completionTimer);
  if (dropTimer) clearTimeout(dropTimer);
  effectAudio?.stop();
  selectedWord.value = '';
  cards.value = initialCards;
  matchedCount.value = 0;
  refillIndex = 0;
  clearingCards.value = [];
  droppingCards.value = [];
  wrongCards.value = [];
  showWrong.value = false;
  successVisible.value = false;
  particles.value = [];
  isComplete.value = false;
  resetProgress();
}

function goBack() {
  uni.navigateBack();
}

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (clearTimer) clearTimeout(clearTimer);
  if (successTimer) clearTimeout(successTimer);
  if (completionTimer) clearTimeout(completionTimer);
  if (dropTimer) clearTimeout(dropTimer);
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

.scene-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.back-button {
  position: absolute;
  z-index: 10;
  top: calc(var(--status-bar-height) + 38rpx);
  left: 34rpx;
  width: 88rpx;
  height: 88rpx;
}

.game-title {
  position: absolute;
  z-index: 5;
  top: calc(var(--status-bar-height) + 58rpx);
  left: 160rpx;
  right: 160rpx;
  color: #713300;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 1.1;
  text-align: center;
  text-shadow: 0 4rpx 0 rgba(255, 245, 113, 0.7);
}

.progress-area {
  position: absolute;
  z-index: 5;
  top: calc(var(--status-bar-height) + 158rpx);
  left: 50%;
  width: 464rpx;
  transform: translateX(-50%);
}

.progress-track {
  position: relative;
  width: 464rpx;
  height: 45rpx;
  overflow: visible;
  border: 6rpx solid #fff;
  border-radius: 999rpx;
  background: #bd8a00;
  box-shadow: 0 3rpx 0 rgba(110, 69, 0, 0.18);
}

.progress-fill {
  position: absolute;
  top: 5rpx;
  bottom: 5rpx;
  left: 5rpx;
  max-width: calc(100% - 10rpx);
  border-radius: 999rpx;
  background: #ffe07b;
  transition: width 0.35s ease;
}

.progress-knob {
  position: absolute;
  top: 50%;
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid #fff;
  border-radius: 50%;
  background: #fffdf3;
  box-shadow: 0 3rpx 5rpx rgba(105, 67, 0, 0.18);
  transform: translate(-50%, -50%);
  transition: left 0.35s ease;
}

.progress-count {
  display: block;
  margin-top: 8rpx;
  color: #713300;
  font-size: 42rpx;
  font-weight: 900;
  line-height: 1;
  text-align: center;
}

.card-stage {
  position: absolute;
  z-index: 2;
  top: calc(var(--status-bar-height) + 466rpx);
  right: 0;
  bottom: 188rpx;
  left: 0;
}

.word-card {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  transition: transform 0.18s ease, filter 0.18s ease, opacity 0.28s ease;
}

.card-bg {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
}

.card-label {
  position: relative;
  z-index: 2;
  max-width: 86%;
  overflow: hidden;
  color: #225a92;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 1.05;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meaning-card .card-label {
  color: #713c94;
  font-size: 58rpx;
}

.card-two .card-label,
.card-eight .card-label {
  color: #a83b2a;
}

.card-shape-4 .card-label,
.card-shape-5 .card-label {
  font-size: 50rpx;
}

.card-shape-5 .card-label.long-word {
  font-size: 46rpx;
}

.card-one { top: 0; left: 42rpx; width: 188rpx; height: 188rpx; transform: rotate(-7deg); }
.card-two { top: 26rpx; left: 274rpx; width: 190rpx; height: 184rpx; transform: rotate(3deg); }
.card-three { top: 4rpx; right: 36rpx; width: 188rpx; height: 188rpx; transform: rotate(7deg); }
.card-four { top: 206rpx; left: 66rpx; width: 198rpx; height: 132rpx; transform: rotate(8deg); }
.card-five { top: 210rpx; right: 68rpx; width: 242rpx; height: 148rpx; transform: rotate(5deg); }
.card-six { top: 395rpx; left: 30rpx; width: 194rpx; height: 192rpx; transform: rotate(-2deg); }
.card-seven { top: 388rpx; left: 264rpx; width: 190rpx; height: 184rpx; transform: rotate(-5deg); }
.card-eight { top: 397rpx; right: 36rpx; width: 190rpx; height: 184rpx; transform: rotate(4deg); }
.card-nine { top: 595rpx; left: 40rpx; width: 318rpx; height: 196rpx; transform: rotate(-7deg); }
.card-ten { top: 596rpx; right: 32rpx; width: 208rpx; height: 138rpx; transform: rotate(6deg); }

.word-card:active { filter: brightness(1.06); }
.word-card.is-selected { z-index: 7; filter: brightness(1.1) drop-shadow(0 0 18rpx rgba(255, 255, 255, 0.95)); }
.word-card.is-selected.card-one { transform: rotate(-7deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-two { transform: rotate(3deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-three { transform: rotate(7deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-four { transform: rotate(8deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-five { transform: rotate(5deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-six { transform: rotate(-2deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-seven { transform: rotate(-5deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-eight { transform: rotate(4deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-nine { transform: rotate(-7deg) translateY(-12rpx) scale(1.05); }
.word-card.is-selected.card-ten { transform: rotate(6deg) translateY(-12rpx) scale(1.05); }
.word-card.is-clearing { animation: clear-card 0.52s ease-in forwards; pointer-events: none; }
.word-card.is-dropping { animation: drop-card 0.62s cubic-bezier(0.2, 0.82, 0.32, 1.18) both; pointer-events: none; }
.word-card.is-wrong { animation: wrong-card 0.62s ease-in-out both; }

.clear-light {
  position: absolute;
  z-index: 2;
  width: 430rpx;
  height: 380rpx;
  opacity: 0;
  animation: card-flare 0.82s ease-out both;
  pointer-events: none;
}

.clear-light-one { top: -96rpx; left: -79rpx; }
.clear-light-two { top: -70rpx; left: 154rpx; }
.clear-light-three { top: -96rpx; right: -85rpx; }
.clear-light-four { top: 84rpx; left: -50rpx; }
.clear-light-five { top: 88rpx; right: -26rpx; }
.clear-light-six { top: 300rpx; left: -88rpx; }
.clear-light-seven { top: 296rpx; left: 156rpx; }
.clear-light-eight { top: 306rpx; right: -84rpx; }
.clear-light-nine { top: 505rpx; left: -16rpx; }
.clear-light-ten { top: 484rpx; right: -78rpx; }

.selection-light {
  position: absolute;
  z-index: 1;
  top: -72rpx;
  left: 50%;
  width: 522rpx;
  height: 458rpx;
  opacity: 0.78;
  transform: translateX(-50%);
  animation: shine 0.7s ease-in-out infinite alternate;
  pointer-events: none;
}

.sound-pulse { position: absolute; z-index: 8; top: -22rpx; right: -16rpx; width: 58rpx; height: 58rpx; pointer-events: none; }
.sound-arc { position: absolute; border: 4rpx solid #fff; border-left: 0; border-bottom-color: transparent; border-radius: 50%; opacity: 0; animation: sound-wave 0.8s ease-out infinite; }
.arc-one { inset: 10rpx; }
.arc-two { inset: 0; animation-delay: 0.22s; }

.wrong-notice {
  position: absolute;
  z-index: 20;
  top: -150rpx;
  left: 50%;
  width: 540rpx;
  height: 140rpx;
  animation: wrong-notice-slide 3.2s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  pointer-events: none;
}

.wrong-notice image { width: 100%; height: 100%; }
.success-notice {
  position: absolute;
  z-index: 20;
  top: -62rpx;
  left: 50%;
  width: 420rpx;
  height: 104rpx;
  border: 5rpx solid #fff;
  border-radius: 52rpx;
  background: #f59b2c;
  box-shadow: 0 7rpx 0 rgba(164, 82, 7, 0.34), 0 0 28rpx rgba(255, 255, 255, 0.9);
  color: #fff;
  font-size: 46rpx;
  font-weight: 900;
  line-height: 94rpx;
  text-align: center;
  text-shadow: 0 3rpx 0 rgba(153, 73, 3, 0.35);
  transform: translateX(-50%);
  animation: success-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  pointer-events: none;
}
.success-spark { position: absolute; z-index: 12; left: 50%; top: 48%; color: #fff; font-size: 40rpx; font-weight: 900; opacity: 0; pointer-events: none; animation: sparkle 0.52s ease-out forwards; }
.spark-1 { --x: -220rpx; --y: -160rpx; }
.spark-2 { --x: 210rpx; --y: -142rpx; animation-delay: 40ms; }
.spark-3 { --x: -250rpx; --y: 12rpx; animation-delay: 70ms; }
.spark-4 { --x: 240rpx; --y: 8rpx; animation-delay: 30ms; }
.spark-5 { --x: -120rpx; --y: 162rpx; animation-delay: 90ms; }
.spark-6 { --x: 132rpx; --y: 156rpx; animation-delay: 55ms; }

.bottom-decoration { position: absolute; z-index: 3; bottom: -12rpx; left: 0; width: 250rpx; height: 164rpx; opacity: 0.9; pointer-events: none; }
.leaf { position: absolute; bottom: 0; width: 68rpx; height: 138rpx; border: 5rpx solid #0d9274; border-radius: 100% 0 100% 0; background: #1ab69a; transform-origin: bottom center; }
.leaf-one { left: 72rpx; transform: rotate(-38deg); }
.leaf-two { left: 116rpx; height: 154rpx; transform: rotate(-7deg); }
.leaf-three { left: 162rpx; transform: rotate(30deg); }

.bottom-actions { position: absolute; z-index: 9; right: 42rpx; bottom: calc(env(safe-area-inset-bottom) + 30rpx); left: 68rpx; display: flex; align-items: center; justify-content: space-between; }
.listen-button { position: relative; width: 112rpx; height: 112rpx; border: 7rpx solid #fff; border-radius: 38rpx; background: #409bf2; box-shadow: 0 7rpx 0 #1674c7, 0 8rpx 14rpx rgba(104, 80, 0, 0.25); }
.play-triangle { position: absolute; top: 50%; left: 52%; width: 0; height: 0; border-top: 24rpx solid transparent; border-bottom: 24rpx solid transparent; border-left: 34rpx solid #fff; filter: drop-shadow(0 3rpx 0 rgba(27, 100, 180, 0.22)); transform: translate(-50%, -50%); }
.next-button { width: 118rpx; height: 118rpx; }

.complete-layer { position: absolute; z-index: 30; inset: 0; display: flex; align-items: center; justify-content: center; padding: 48rpx; background: rgba(103, 72, 0, 0.26); }
.complete-panel { width: 570rpx; padding: 60rpx 42rpx 48rpx; border: 7rpx solid #fff; border-radius: 28rpx; background: #ffe86d; box-shadow: 0 14rpx 0 rgba(151, 96, 0, 0.26); text-align: center; }
.complete-title { display: block; color: #733400; font-size: 48rpx; font-weight: 900; line-height: 1.2; }
.complete-copy { display: block; margin-top: 16rpx; color: #99610b; font-size: 28rpx; }
.complete-stars { display: flex; justify-content: center; gap: 8rpx; margin: 28rpx 0 34rpx; }
.complete-stars image { width: 72rpx; height: 74rpx; }
.restart-button { height: 88rpx; border-radius: 44rpx; background: #f69b31; color: #fff; font-size: 32rpx; font-weight: 800; line-height: 88rpx; box-shadow: 0 6rpx 0 #d3791e; }

@keyframes clear-card { 0% { opacity: 1; } 35% { transform: scale(1.12) rotate(0deg); filter: brightness(1.35); } 100% { opacity: 0; transform: scale(0) rotate(0deg); } }
@keyframes card-flare { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45); } 24% { opacity: 0.95; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.34); } }
@keyframes drop-card { 0% { opacity: 0; transform: translateY(-510rpx) scale(0.82); } 72% { opacity: 1; transform: translateY(16rpx) scale(1.04); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes wrong-card {
  0%, 100% { translate: 0 0; }
  15% { translate: -18rpx 0; }
  30% { translate: 18rpx 0; }
  45% { translate: -16rpx 0; }
  60% { translate: 16rpx 0; }
  75% { translate: -9rpx 0; }
  88% { translate: 9rpx 0; }
}
@keyframes wrong-notice-slide {
  0% { opacity: 0; transform: translateX(130%); }
  19% { opacity: 0; transform: translateX(130%); }
  28% { opacity: 1; transform: translateX(-50%); }
  87% { opacity: 1; transform: translateX(-50%); }
  100% { opacity: 0; transform: translateX(-180%); }
}
@keyframes success-pop { from { opacity: 0; transform: translate(-50%, -26rpx) scale(0.68); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
@keyframes sparkle { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.2); } }
@keyframes shine { from { opacity: 0.52; transform: translateX(-50%) scale(0.92); } to { opacity: 0.92; transform: translateX(-50%) scale(1.06); } }
@keyframes sound-wave { 0% { opacity: 0; transform: scale(0.65); } 35% { opacity: 1; } 100% { opacity: 0; transform: scale(1.12); } }

@media (max-height: 680px) {
  .card-stage { top: calc(var(--status-bar-height) + 404rpx); bottom: 144rpx; transform: scale(0.84); transform-origin: top center; }
  .bottom-actions { bottom: calc(env(safe-area-inset-bottom) + 16rpx); }
  .bottom-decoration { transform: scale(0.8); transform-origin: bottom left; }
}
</style>
