<template>
  <view class="game05-page">
    <view class="game-stage" @touchmove="handleStageTouchMove" @touchend="handleStageTouchEnd">
      <image class="stage-background" :src="topBackgroundUrl" mode="aspectFill" />
      <image class="top-grass" :src="topGrassUrl" mode="aspectFill" />
      <image class="bottom-background" :src="bottomBackgroundUrl" mode="aspectFill" />

      <image class="back-button" :src="returnUrl" mode="aspectFit" @tap="goBack" />
      <text class="page-title">单词拼图</text>

      <view class="progress-wrap" aria-label="游戏进度">
        <view class="progress-rail">
          <image class="progress-track" :src="progressBackgroundUrl" mode="scaleToFill" />
          <view class="progress-fill-clip" :style="{ width: `${progressPercent}%` }">
            <image class="progress-fill" :src="progressFillUrl" mode="scaleToFill" />
          </view>
          <image class="progress-circle" :src="progressCircleUrl" :style="{ left: `${progressPercent}%` }" mode="aspectFit" />
        </view>
        <text class="progress-label">{{ currentRound + 1 }} / {{ rounds.length }}</text>
      </view>

      <image class="info-card" :src="topCardUrl" mode="aspectFill" />
      <view class="word-info">
        <text class="word-spelling">{{ currentRoundData.word }}</text>
        <view class="word-underline" />
        <text class="word-meaning">{{ currentRoundData.meaning }}</text>
        <text class="word-description">{{ currentRoundData.description }}</text>
      </view>
      <image class="robot" :src="robotUrl" mode="aspectFit" />

      <view class="instruction-pill">
        <text>请把字母拖到下方框框里</text>
      </view>

      <view class="answer-slots">
        <view
          v-for="(letter, index) in answerSlots"
          :key="`${currentRound}-${index}`"
          class="answer-slot"
          :class="{ filled: Boolean(letter), active: index === answerSlots.length - 1 && !letter }"
          @tap="removeLetter(index)"
        >
          <image :src="letter ? tileForLetter(letter).image : emptySlotUrl" mode="aspectFit" />
          <text v-if="letter" class="slot-letter">{{ letter }}</text>
        </view>
      </view>

      <transition name="feedback-pop">
        <image v-if="feedback === 'wrong'" class="feedback feedback-wrong" :src="wrongAnswerUrl" mode="aspectFit" />
        <image v-else-if="feedback === 'correct'" class="feedback feedback-right" :src="rightAnswerUrl" mode="aspectFit" />
      </transition>

      <view class="letter-bank">
        <view
          v-for="tile in availableTiles"
          :key="tile.id"
          class="letter-tile"
          :class="[`tile-${tile.id}`, { dragging: draggingId === tile.id }]"
          :style="tileStyle(tile)"
          @touchstart.stop="handleTileTouchStart(tile, $event)"
          @tap.stop="tapTile(tile)"
        >
          <image :src="tile.image" mode="aspectFit" />
          <text class="tile-letter">{{ tile.letter }}</text>
        </view>
      </view>

      <view class="bottom-actions">
        <image class="action-button" :class="{ playing: isSpeaking }" :src="playUrl" mode="aspectFit" @tap="speakWord" />
        <image
          class="action-button next-action"
          :class="{ disabled: !isRoundSolved && !isComplete }"
          :src="nextUrl"
          mode="aspectFit"
          @tap="nextRound"
        />
      </view>

      <view v-if="isComplete" class="complete-layer">
        <image class="complete-banner" :src="completeUrl" mode="aspectFit" />
        <view class="complete-details">
          <text class="time-line">闯关用时：{{ completionTime }}</text>
          <view class="stars-line">
            <text>获得星星：</text>
            <image v-for="star in 3" :key="star" :src="starUrl" mode="aspectFit" />
          </view>
        </view>
        <image class="next-step-button" :src="nextStepUrl" mode="aspectFit" @tap="nextRound" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';
import bottomBackgroundUrl from './assets/game5_bottom.png';
import completeUrl from './assets/game5_excise.png';
import emptySlotUrl from './assets/game5_kuang.png';
import nextUrl from './assets/game5_next.png';
import nextStepUrl from './assets/game5_next_step.png';
import playUrl from './assets/game5_play.png';
import progressBackgroundUrl from './assets/game5_progress_bar_bg.png';
import progressCircleUrl from './assets/game5_progress_bar_circle.png';
import progressFillUrl from './assets/game5_progress_bar_ing.png';
import returnUrl from './assets/game5_return.png';
import rightAnswerUrl from './assets/game5_answer_right.png';
import robotUrl from './assets/game5_top_robot.png';
import starUrl from './assets/game5_star.png';
import topBackgroundUrl from './assets/game5_top_bg.png';
import topCardUrl from './assets/game5_top.png';
import topGrassUrl from './assets/game5_top2.png';
import wrongAnswerUrl from './assets/game5_answer_wrong.png';
import appleAudioUrl from './audio/apple.mp3';
import houseAudioUrl from './audio/house.mp3';
import plantAudioUrl from './audio/plant.mp3';
import tigerAudioUrl from './audio/tiger.mp3';
import zebraAudioUrl from './audio/zebra.mp3';
import word01Url from './assets/game5_word01.png';
import word02Url from './assets/game5_word02.png';
import word03Url from './assets/game5_word03.png';
import word04Url from './assets/game5_word04.png';
import word05Url from './assets/game5_word05.png';
import word06Url from './assets/game5_word06.png';
import word07Url from './assets/game5_word07.png';
import word08Url from './assets/game5_word08.png';
import word09Url from './assets/game5_word09.png';
import word10Url from './assets/game5_word10.png';

interface Round {
  word: string;
  meaning: string;
  description: string;
  extraLetters: string[];
}

interface LetterTile {
  id: number;
  letter: string;
  image: string;
}

type Feedback = 'wrong' | 'correct' | null;

const rounds: Round[] = [
  { word: 'zebra', meaning: '斑马', description: '生活在草原上的动物', extraLetters: ['f', 'g', 'h', 'j', 'q'] },
  { word: 'apple', meaning: '苹果', description: '一种圆圆的红色水果', extraLetters: ['b', 'd', 'm', 'r', 't'] },
  { word: 'tiger', meaning: '老虎', description: '身上有黑色条纹的动物', extraLetters: ['a', 'c', 'l', 'n', 's'] },
  { word: 'house', meaning: '房子', description: '人们生活和休息的地方', extraLetters: ['a', 'b', 'd', 'i', 't'] },
  { word: 'plant', meaning: '植物', description: '会生长的绿色生命', extraLetters: ['c', 'e', 'r', 's', 'y'] }
];

const tileImages = [word01Url, word02Url, word03Url, word04Url, word05Url, word06Url, word07Url, word08Url, word09Url, word10Url];
const tileLayouts = [
  { left: 5, top: 68.8, width: 19, rotate: -14 },
  { left: 25, top: 71.2, width: 19, rotate: -9 },
  { left: 42, top: 66.3, width: 19, rotate: 7 },
  { left: 62, top: 71.1, width: 19, rotate: 14 },
  { left: 79, top: 67.1, width: 19, rotate: 16 },
  { left: 2, top: 78.1, width: 19, rotate: -15 },
  { left: 23, top: 79.8, width: 19, rotate: -7 },
  { left: 42, top: 77.5, width: 19, rotate: 9 },
  { left: 62, top: 79.4, width: 19, rotate: 9 },
  { left: 79, top: 77.1, width: 19, rotate: 16 }
];

const { updateProgress, resetProgress } = useGameProgress('game-05');
const currentRound = ref(0);
const answerSlots = ref<Array<string | null>>([]);
const usedTileIds = ref<number[]>([]);
const feedback = ref<Feedback>(null);
const isComplete = ref(false);
const draggingId = ref<number | null>(null);
const dragStart = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });
const isSpeaking = ref(false);
const completionTime = ref('0分00秒');

let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
let nextTimer: ReturnType<typeof setTimeout> | null = null;
let completionTimer: ReturnType<typeof setTimeout> | null = null;
let wordAudio: UniApp.InnerAudioContext | null = null;
let roundStartedAt = Date.now();

const currentRoundData = computed(() => rounds[currentRound.value]);
const progressPercent = computed(() => (currentRound.value / rounds.length) * 100);
const isRoundSolved = computed(() => answerSlots.value.join('') === currentRoundData.value.word);
const allLetters = computed(() => [
  ...currentRoundData.value.word.split(''),
  ...currentRoundData.value.extraLetters
].map((letter, id) => ({ id, letter, image: tileImages[id] })));
const availableTiles = computed(() => allLetters.value.filter((tile) => !usedTileIds.value.includes(tile.id)));
const wordAudioUrls: Record<string, string> = {
  apple: appleAudioUrl,
  house: houseAudioUrl,
  plant: plantAudioUrl,
  tiger: tigerAudioUrl,
  zebra: zebraAudioUrl
};

function tileForLetter(letter: string) {
  return allLetters.value.find((tile) => tile.letter === letter) || allLetters.value[0];
}

function tileStyle(tile: LetterTile) {
  const layout = tileLayouts[tile.id];
  if (draggingId.value !== tile.id) {
    return {
      left: `${layout.left}%`,
      top: `${layout.top}%`,
      width: `${layout.width}%`,
      transform: `rotate(${layout.rotate}deg)`
    };
  }

  return {
    left: `${layout.left}%`,
    top: `${layout.top}%`,
    width: `${layout.width}%`,
    transform: `translate(${dragOffset.value.x}px, ${dragOffset.value.y}px) rotate(${layout.rotate}deg)`,
    zIndex: 20
  };
}

function resetRound() {
  answerSlots.value = Array(currentRoundData.value.word.length).fill(null);
  usedTileIds.value = [];
  feedback.value = null;
  draggingId.value = null;
  dragOffset.value = { x: 0, y: 0 };
  roundStartedAt = Date.now();
}

function tapTile(tile: LetterTile) {
  if (draggingId.value !== null || isComplete.value || feedback.value) return;
  placeTile(tile);
}

function handleTileTouchStart(tile: LetterTile, event: any) {
  if (isComplete.value || feedback.value) return;
  const touch = event.touches?.[0];
  draggingId.value = tile.id;
  dragStart.value = { x: touch?.clientX || 0, y: touch?.clientY || 0 };
  dragOffset.value = { x: 0, y: 0 };
}

function handleStageTouchMove(event: any) {
  if (draggingId.value === null) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  dragOffset.value = {
    x: touch.clientX - dragStart.value.x,
    y: touch.clientY - dragStart.value.y
  };
}

function handleStageTouchEnd(event: any) {
  if (draggingId.value === null) return;
  const tile = allLetters.value.find((item) => item.id === draggingId.value);
  const touch = event.changedTouches?.[0];
  const tileId = draggingId.value;
  const moved = Math.abs(dragOffset.value.x) + Math.abs(dragOffset.value.y) > 12;
  draggingId.value = null;
  dragOffset.value = { x: 0, y: 0 };
  if (!tile) return;

  if (moved && touch && isTouchInAnswerArea(touch)) {
    placeTile(tile);
  } else if (!moved) {
    placeTile(tile);
  } else {
    usedTileIds.value = usedTileIds.value.filter((id) => id !== tileId);
  }
}

function isTouchInAnswerArea(touch: any) {
  const systemInfo = uni.getSystemInfoSync();
  const stageWidth = Math.min(systemInfo.windowWidth, systemInfo.windowHeight * 750 / 1624);
  const stageLeft = (systemInfo.windowWidth - stageWidth) / 2;
  const stageX = ((touch.clientX - stageLeft) / stageWidth) * 750;
  const stageY = (touch.clientY / systemInfo.windowHeight) * 1624;
  return stageX >= 55 && stageX <= 700 && stageY >= 775 && stageY <= 930;
}

function placeTile(tile: LetterTile) {
  if (usedTileIds.value.includes(tile.id) || feedback.value || isComplete.value) return;
  const targetIndex = answerSlots.value.findIndex((letter) => letter === null);
  if (targetIndex < 0) return;

  usedTileIds.value = [...usedTileIds.value, tile.id];
  answerSlots.value[targetIndex] = tile.letter;
  if (tile.letter !== currentRoundData.value.word[targetIndex]) {
    feedback.value = 'wrong';
    clearFeedbackTimer();
    feedbackTimer = setTimeout(() => {
      answerSlots.value[targetIndex] = null;
      usedTileIds.value = usedTileIds.value.filter((id) => id !== tile.id);
      feedback.value = null;
      feedbackTimer = null;
    }, 1200);
    return;
  }

  if (isRoundSolved.value) {
    feedback.value = 'correct';
    updateProgress((currentRound.value + 1) * 20, currentRound.value === rounds.length - 1);
    clearFeedbackTimer();
    feedbackTimer = setTimeout(() => {
      feedback.value = null;
      feedbackTimer = null;
    }, 1350);
    if (completionTimer) clearTimeout(completionTimer);
    completionTime.value = formatElapsed(Date.now() - roundStartedAt);
    completionTimer = setTimeout(() => {
      isComplete.value = true;
      completionTimer = null;
    }, 620);
  }
}

function removeLetter(index: number) {
  if (!answerSlots.value[index] || feedback.value === 'correct' || isComplete.value) return;
  const letter = answerSlots.value[index];
  const tile = allLetters.value.find((item) => item.letter === letter && usedTileIds.value.includes(item.id));
  if (tile) usedTileIds.value = usedTileIds.value.filter((id) => id !== tile.id);
  answerSlots.value[index] = null;
  feedback.value = null;
}

function nextRound() {
  if (!isComplete.value && !isRoundSolved.value) return;
  clearCompletionTimer();
  if (currentRound.value === rounds.length - 1) {
    restart();
    return;
  }
  isComplete.value = false;
  currentRound.value += 1;
  resetRound();
  speakAfterDelay(280);
}

function speakWord() {
  const word = currentRoundData.value.word;
  isSpeaking.value = true;
  if (!wordAudio) {
    wordAudio = uni.createInnerAudioContext();
    wordAudio.obeyMuteSwitch = false;
    wordAudio.onEnded(() => {
      isSpeaking.value = false;
    });
    wordAudio.onError(() => {
      isSpeaking.value = false;
      speakWithSystemVoice(word);
    });
  }
  wordAudio.stop();
  wordAudio.src = wordAudioUrls[word];
  wordAudio.play();
}

function speakWithSystemVoice(word: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.72;
  utterance.pitch = 1.05;
  utterance.onend = () => {
    isSpeaking.value = false;
  };
  window.speechSynthesis.speak(utterance);
}

function speakAfterDelay(delay: number) {
  if (nextTimer) clearTimeout(nextTimer);
  nextTimer = setTimeout(() => {
    speakWord();
    nextTimer = null;
  }, delay);
}

function clearFeedbackTimer() {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
}

function clearCompletionTimer() {
  if (completionTimer) {
    clearTimeout(completionTimer);
    completionTimer = null;
  }
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
}

function restart() {
  resetProgress();
  clearCompletionTimer();
  currentRound.value = 0;
  isComplete.value = false;
  resetRound();
  speakAfterDelay(280);
}

function goBack() {
  uni.navigateBack();
}

onMounted(() => {
  resetRound();
  speakAfterDelay(520);
});

onUnmounted(() => {
  clearFeedbackTimer();
  clearCompletionTimer();
  if (nextTimer) clearTimeout(nextTimer);
  wordAudio?.destroy();
  wordAudio = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
});
</script>

<style scoped lang="scss">
.game05-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fbfcf0;
  touch-action: none;
}

.game-stage {
  position: relative;
  width: 100vw;
  max-width: 46.1823vh;
  height: 100vh;
  overflow: hidden;
  background: #fcfcf0;
  color: #171b17;
  user-select: none;
}

.stage-background,
.bottom-background,
.top-grass,
.info-card {
  position: absolute;
  pointer-events: none;
}

.stage-background {
  top: 18.8%;
  left: 0;
  width: 100%;
  height: 21.6%;
}

.top-grass {
  top: 72.9%;
  left: 0;
  width: 100%;
  height: 4.7%;
}

.bottom-background {
  top: 73.2%;
  left: 0;
  width: 100%;
  height: 26.8%;
}

.back-button {
  position: absolute;
  top: 2.5%;
  left: 5.4%;
  width: 10.6%;
  height: 5.1%;
  z-index: 3;
}

.page-title {
  position: absolute;
  top: 3.3%;
  left: 35.5%;
  width: 34%;
  color: #181b18;
  font-size: 2.38vh;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}

.progress-wrap {
  position: absolute;
  top: 10.8%;
  left: 19.3%;
  width: 61.4%;
  height: 9.2%;
}

.progress-rail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 460 / 42;
}

.progress-track,
.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.progress-track {
  z-index: 1;
}

.progress-fill-clip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  height: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(180deg, #c9e867 0%, #9cca3e 100%);
  transition: width 0.3s ease;
}

.progress-circle {
  position: absolute;
  top: 50%;
  z-index: 3;
  width: 7.8%;
  aspect-ratio: 1;
  height: auto;
  transform: translate(-50%, -50%);
  transition: left 0.3s ease;
}

.progress-label {
  position: absolute;
  top: 30%;
  left: 0;
  width: 100%;
  color: #161a17;
  font-size: 2.36vh;
  font-weight: 500;
  line-height: 1;
  text-align: center;
}

.info-card {
  top: 19.9%;
  left: 0;
  width: 100%;
  height: 19.9%;
}

.word-info {
  position: absolute;
  top: 21.6%;
  left: 15%;
  width: 56%;
  z-index: 2;
}

.word-spelling,
.word-meaning,
.word-description {
  display: block;
}

.word-spelling {
  color: #171b17;
  font-size: 3.28vh;
  font-weight: 800;
  line-height: 1;
}

.word-underline {
  width: 12%;
  height: 0.45vh;
  margin: 4.2% 0 4.6%;
  border-radius: 4px;
  background: #f8b33d;
}

.word-meaning {
  color: #171b17;
  font-size: 2.4vh;
  font-weight: 800;
  line-height: 1;
}

.word-description {
  margin-top: 4.4%;
  color: #171b17;
  font-size: 1.62vh;
  line-height: 1.15;
  white-space: nowrap;
}

.robot {
  position: absolute;
  top: 20%;
  right: 3.8%;
  width: 26%;
  height: 18%;
  z-index: 2;
}

.instruction-pill {
  position: absolute;
  top: 42%;
  left: 28%;
  width: 44%;
  min-height: 3.8%;
  padding: 1.2% 2%;
  border-radius: 999px;
  background: #fff3cc;
  color: #332b1c;
  font-size: 1.57vh;
  line-height: 1.3;
  text-align: center;
  white-space: nowrap;
}

.answer-slots {
  position: absolute;
  top: 48.5%;
  left: 8.6%;
  display: flex;
  justify-content: space-between;
  width: 82.8%;
  height: 7.3%;
  z-index: 4;
}

.answer-slot {
  position: relative;
  width: 15%;
  height: 100%;
}

.answer-slot image {
  width: 100%;
  height: 100%;
}

.slot-letter {
  position: absolute;
  top: 9%;
  left: 0;
  width: 100%;
  color: #4f4f4a;
  font-size: 3.23vh;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  text-transform: lowercase;
}

.answer-slot.active image {
  content: url('./assets/game5_kuang2.png');
}

.feedback {
  position: absolute;
  left: 50%;
  z-index: 8;
  width: 62%;
  transform: translateX(-50%);
  pointer-events: none;
}

.feedback-wrong {
  top: 58.7%;
}

.feedback-right {
  top: 58%;
  width: 57%;
}

.letter-bank {
  position: absolute;
  inset: 0;
  z-index: 6;
}

.letter-tile {
  position: absolute;
  aspect-ratio: 1 / 0.92;
  transition: transform 0.12s ease, opacity 0.16s ease;
}

.letter-tile image {
  width: 100%;
  height: 100%;
}

.letter-tile.dragging {
  opacity: 0.82;
  filter: drop-shadow(0 8px 4px rgba(54, 74, 18, 0.25));
}

.tile-letter {
  position: absolute;
  top: 25%;
  left: 0;
  width: 100%;
  color: #777872;
  font-size: 3.23vh;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  text-transform: lowercase;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.45);
}

.tile-0 .tile-letter,
.tile-9 .tile-letter { color: #f3612e; }
.tile-1 .tile-letter,
.tile-5 .tile-letter,
.tile-8 .tile-letter { color: #2d8c85; }
.tile-4 .tile-letter { color: #fff2aa; text-shadow: 1px 1px 0 #ee8c00; }

.bottom-actions {
  position: absolute;
  right: 16.5%;
  bottom: 3.5%;
  left: 16.5%;
  display: flex;
  justify-content: space-between;
  height: 9%;
  z-index: 7;
}

.action-button {
  width: 25%;
  height: 100%;
}

.action-button.playing {
  animation: play-pulse 0.8s ease-in-out infinite alternate;
}

.next-action.disabled {
  opacity: 0.48;
  filter: saturate(0.5);
}

.complete-layer {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(97, 126, 32, 0.34);
}

.complete-banner {
  position: absolute;
  top: 25.5%;
  left: 0;
  width: 100%;
  height: 19.8%;
}

.complete-details {
  position: absolute;
  top: 45.5%;
  left: 0;
  width: 100%;
  color: #fff62e;
  font-size: 2.13vh;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  text-shadow: 1px 2px 0 rgba(82, 64, 13, 0.24);
}

.time-line,
.stars-line {
  display: block;
}

.stars-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3%;
  margin-top: 2.2%;
}

.stars-line image {
  width: 4.3vh;
  height: 4.3vh;
}

.next-step-button {
  position: absolute;
  top: 81.5%;
  left: 25.5%;
  width: 49%;
  height: 6.9%;
}

@keyframes play-pulse {
  from { transform: scale(1); }
  to { transform: scale(1.05); }
}

.feedback-pop-enter-active,
.feedback-pop-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.feedback-pop-enter-from,
.feedback-pop-leave-to { opacity: 0; transform: translate(-50%, 12px) scale(0.9); }
</style>
