<template>
  <view class="listen-game mini-game-screen">
    <image class="scene-bg" :src="backgroundUrl" mode="scaleToFill" />

    <image class="back-button tap-image" :src="returnUrl" mode="aspectFit" @tap="goBack" />
    <text class="game-title">听音填词</text>

    <view class="progress-wrap" aria-label="游戏进度">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: `${progressPercent}%` }" />
      </view>
      <text class="progress-label">进度 {{ currentIndex + 1 }}/{{ rounds.length }}</text>
    </view>

    <view
      class="mailbox-stage"
      :class="{ 'mailbox-open': feedback === 'correct' }"
      @touchend="dropInWordArea"
    >
      <image class="mailbox" :src="mailboxUrl" mode="scaleToFill" />
      <view class="mailbox-copy">
        <text class="meaning">{{ currentRound.meaning }}</text>
        <view class="word-row">
          <view
            v-for="(letter, index) in patternLetters"
            :key="`${currentRound.word}-${index}`"
            class="word-letter"
            :class="{ blank: index === currentRound.missingIndex && !filledLetter, filled: index === currentRound.missingIndex && filledLetter }"
          >
            {{ index === currentRound.missingIndex ? (filledLetter || '_') : letter }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="feedback === 'correct'" class="correct-feedback">
      <image :src="rightAnswerUrl" mode="aspectFit" />
      <view v-for="(star, index) in stars" :key="index" class="feedback-star" :style="star.style">
        <image :src="starUrl" mode="aspectFit" />
      </view>
    </view>
    <image v-else-if="feedback === 'wrong'" class="wrong-feedback" :src="wrongAnswerUrl" mode="aspectFit" />

    <view class="keyboard-stage">
      <image class="keyboard" :src="keyboardUrl" mode="scaleToFill" />
      <view class="tile-grid">
        <view
          v-for="tile in currentRound.tiles"
          :key="tile.id"
          class="letter-tile"
          :class="[
            `tile-${tile.tone}`,
            { used: usedTileId === tile.id, dragging: draggingTileId === tile.id }
          ]"
          :style="tileDragStyle(tile)"
          @touchstart.stop="startDrag($event, tile)"
          @touchmove.stop.prevent="moveDrag($event)"
          @touchend.stop.prevent="endDrag($event, tile)"
          @tap="placeLetter(tile)"
        >
          <text>{{ tile.letter }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-controls">
      <view class="control-button listen-button tap-image" :class="{ listening: isSpeaking }" @tap="playWord">
        <image :src="listenUrl" mode="scaleToFill" />
        <text>听发音</text>
      </view>
      <view class="control-button next-button tap-image" :class="{ disabled: isBusy }" @tap="nextWord">
        <image :src="nextButtonUrl" mode="scaleToFill" />
        <text>下一个单词</text>
      </view>
    </view>

    <view v-if="isComplete" class="complete-layer">
      <view class="confetti confetti-one">◆</view>
      <view class="confetti confetti-two">◆</view>
      <view class="complete-panel">
        <image class="complete-banner" :src="completeBannerUrl" mode="scaleToFill" />
        <view class="complete-stars">
          <image v-for="star in 3" :key="star" :src="starUrl" mode="aspectFit" />
        </view>
        <text class="complete-copy">你已经听写完成 {{ rounds.length }} 个单词</text>
        <view class="restart-button" @tap="restart">再玩一次</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';
import backgroundUrl from './assets/game6_bg.jpg';
import completeBannerUrl from './assets/game6_excise.png';
import keyboardUrl from './assets/game6_keyboard.png';
import listenUrl from './assets/game6_listen.png';
import mailboxUrl from './assets/game6_main.png';
import nextButtonUrl from './assets/game6_next2.png';
import returnUrl from './assets/game6_return.png';
import rightAnswerUrl from './assets/game6_answer_right.png';
import starUrl from './assets/game6_star.png';
import wrongAnswerUrl from './assets/game6_answer_wrong.png';
import bananaAudioUrl from '../game04/audio/banana.mp3';
import mangoAudioUrl from '../game04/audio/mango.mp3';
import orangeAudioUrl from '../game04/audio/orange.mp3';
import pearAudioUrl from '../game04/audio/pear.mp3';
import plumAudioUrl from '../game04/audio/plum.mp3';

type TileTone = 'coral' | 'yellow' | 'plain';
interface LetterTile {
  id: string;
  letter: string;
  tone: TileTone;
}
interface Round {
  word: string;
  meaning: string;
  missingIndex: number;
  tiles: LetterTile[];
  audio: string;
}

const rounds: Round[] = [
  {
    word: 'plum',
    meaning: '李子',
    missingIndex: 2,
    audio: plumAudioUrl,
    tiles: makeTiles(['P', 'L', 'L', 'U', 'M', 'T', 'T', 'S', 'R', 'B'], [3])
  },
  {
    word: 'banana',
    meaning: '香蕉',
    missingIndex: 3,
    audio: bananaAudioUrl,
    tiles: makeTiles(['B', 'A', 'N', 'A', 'N', 'A', 'C', 'D', 'P', 'R'], [0, 3])
  },
  {
    word: 'pear',
    meaning: '梨',
    missingIndex: 1,
    audio: pearAudioUrl,
    tiles: makeTiles(['P', 'E', 'A', 'R', 'T', 'L', 'M', 'O', 'B', 'S'], [0, 2])
  },
  {
    word: 'mango',
    meaning: '芒果',
    missingIndex: 2,
    audio: mangoAudioUrl,
    tiles: makeTiles(['M', 'A', 'N', 'G', 'O', 'P', 'B', 'T', 'R', 'L'], [0, 3])
  },
  {
    word: 'orange',
    meaning: '橙子',
    missingIndex: 3,
    audio: orangeAudioUrl,
    tiles: makeTiles(['O', 'R', 'A', 'N', 'G', 'E', 'P', 'B', 'T', 'M'], [0, 3])
  }
];

function makeTiles(letters: string[], coralIndexes: number[]): LetterTile[] {
  return letters.map((letter, index) => ({
    id: `${letter}-${index}`,
    letter,
    tone: (coralIndexes.includes(index) ? 'coral' : index === letters.length - 1 ? 'yellow' : 'plain') as TileTone
  }));
}

const { updateProgress, resetProgress } = useGameProgress('game-06');
const currentIndex = ref(0);
const filledLetter = ref('');
const usedTileId = ref('');
const draggingTileId = ref('');
const feedback = ref<'correct' | 'wrong' | null>(null);
const isSpeaking = ref(false);
const isComplete = ref(false);

const currentRound = computed(() => rounds[currentIndex.value]);
const patternLetters = computed(() => currentRound.value.word.toUpperCase().split(''));
const progressPercent = computed(() => ((currentIndex.value + 1) / rounds.length) * 100);
const isBusy = computed(() => Boolean(feedback.value) || isComplete.value || Boolean(filledLetter.value));
const stars = [
  { style: 'left: 18%; top: 22%; --delay: 0ms' },
  { style: 'left: 42%; top: 2%; --delay: 100ms' },
  { style: 'left: 64%; top: 17%; --delay: 180ms' },
  { style: 'left: 78%; top: 45%; --delay: 240ms' },
  { style: 'left: 12%; top: 50%; --delay: 80ms' }
];

let wordAudio: UniApp.InnerAudioContext | null = null;
let speechTimer: ReturnType<typeof setTimeout> | null = null;
let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;
let dragMoved = false;
const dragStart = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });

function getTouch(event: any) {
  return event?.touches?.[0] || event?.changedTouches?.[0] || null;
}

function startDrag(event: any, tile: LetterTile) {
  if (isBusy.value || usedTileId.value) return;
  const touch = getTouch(event);
  if (!touch) return;
  draggingTileId.value = tile.id;
  dragStart.value = { x: touch.clientX, y: touch.clientY };
  dragOffset.value = { x: 0, y: 0 };
  dragMoved = false;
}

function moveDrag(event: any) {
  if (!draggingTileId.value) return;
  const touch = getTouch(event);
  if (touch) {
    dragMoved = true;
    dragOffset.value = {
      x: touch.clientX - dragStart.value.x,
      y: touch.clientY - dragStart.value.y
    };
  }
}

function tileDragStyle(tile: LetterTile) {
  if (draggingTileId.value !== tile.id) return {};
  return {
    transform: `translate(${dragOffset.value.x}px, ${dragOffset.value.y}px) scale(1.08)`,
    zIndex: 4
  };
}

function endDrag(event: any, tile: LetterTile) {
  if (draggingTileId.value !== tile.id) return;
  const touch = getTouch(event);
  const systemInfo = uni.getSystemInfoSync();
  const inWordArea = Boolean(touch) && touch.clientY > systemInfo.windowHeight * 0.31 && touch.clientY < systemInfo.windowHeight * 0.54;
  draggingTileId.value = '';
  dragOffset.value = { x: 0, y: 0 };

  if (!dragMoved || inWordArea) {
    placeLetter(tile);
  }
}

function dropInWordArea() {
  // A tile touchend is handled above; this keeps the mailbox itself a valid drop target on touch devices.
}

function placeLetter(tile: LetterTile) {
  if (isBusy.value || usedTileId.value) return;
  if (tile.letter.toLowerCase() === currentRound.value.word[currentRound.value.missingIndex]) {
    filledLetter.value = tile.letter;
    usedTileId.value = tile.id;
    feedback.value = 'correct';
    updateProgress((currentIndex.value + 1) * 20, currentIndex.value === rounds.length - 1);
    vibrate('light');
    feedbackTimer = setTimeout(() => advanceRound(), 1050);
    return;
  }

  feedback.value = 'wrong';
  vibrate('light');
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    feedback.value = null;
    feedbackTimer = null;
  }, 850);
}

function playWord() {
  if (isComplete.value) return;
  isSpeaking.value = true;
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    isSpeaking.value = false;
    speechTimer = null;
  }, 1800);

  if (!wordAudio) {
    wordAudio = uni.createInnerAudioContext();
    wordAudio.obeyMuteSwitch = false;
    wordAudio.onEnded(() => {
      isSpeaking.value = false;
    });
    wordAudio.onError(() => speakWithSystemVoice(currentRound.value.word));
  }
  wordAudio.stop();
  wordAudio.src = currentRound.value.audio;
  wordAudio.play();
}

function speakWithSystemVoice(word: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.75;
  utterance.onend = () => { isSpeaking.value = false; };
  window.speechSynthesis.speak(utterance);
}

function advanceRound() {
  feedback.value = null;
  feedbackTimer = null;
  if (currentIndex.value >= rounds.length - 1) {
    isComplete.value = true;
    return;
  }
  currentIndex.value += 1;
  filledLetter.value = '';
  usedTileId.value = '';
  transitionTimer = setTimeout(playWord, 180);
}

function nextWord() {
  if (isBusy.value) return;
  advanceRound();
}

function restart() {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (transitionTimer) clearTimeout(transitionTimer);
  resetProgress();
  currentIndex.value = 0;
  filledLetter.value = '';
  usedTileId.value = '';
  feedback.value = null;
  isComplete.value = false;
  setTimeout(playWord, 220);
}

function goBack() {
  uni.navigateBack();
}

function vibrate(type: 'light' | 'medium') {
  const uniApi = uni as typeof uni & {
    vibrateShort?: (options?: { type?: 'light' | 'medium' }) => void;
  };
  void uniApi.vibrateShort?.({ type });
}

onMounted(() => {
  setTimeout(playWord, 450);
});

onUnmounted(() => {
  if (speechTimer) clearTimeout(speechTimer);
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (transitionTimer) clearTimeout(transitionTimer);
  wordAudio?.destroy();
  wordAudio = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
});
</script>

<style scoped lang="scss">
.listen-game {
  isolation: isolate;
  background: #bfeafa;
}

.scene-bg {
  position: absolute;
  z-index: -1;
  top: 0;
  bottom: 0;
  left: -16.24%;
  // The supplied JPG contains a second, blank half; scale the illustrated 750px canvas to the screen.
  width: 197.06%;
  height: 100%;
}

.back-button {
  position: absolute;
  top: 3.8%;
  left: 5%;
  width: 10.7%;
  height: 5%;
  z-index: 3;
}

.game-title {
  position: absolute;
  top: 2.1%;
  left: 50%;
  color: #6d2719;
  font-size: clamp(26px, 7vw, 44px);
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 -2px 0 #fff;
  transform: translateX(-50%);
  white-space: nowrap;
}

.progress-wrap {
  position: absolute;
  top: 15.5%;
  left: 50%;
  width: 64%;
  height: 10%;
  transform: translateX(-50%);
}

.progress-track {
  position: absolute;
  top: 18%;
  left: 5%;
  width: 90%;
  height: 22%;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(102, 24, 53, 0.74);
  box-shadow: inset 0 2rpx 4rpx rgba(86, 20, 49, 0.4);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #fbd32c, #ff9e35);
  box-shadow: 0 0 12rpx rgba(255, 226, 73, 0.92);
  transition: width 0.45s ease;
}

.progress-label {
  position: absolute;
  top: 52%;
  left: 0;
  width: 100%;
  color: #6d2719;
  font-size: clamp(20px, 5vw, 32px);
  font-weight: 900;
  line-height: 1;
  text-align: center;
}

.mailbox-stage {
  position: absolute;
  top: 26.4%;
  left: 15%;
  width: 70%;
  height: 27%;
  transition: transform 0.22s ease, filter 0.22s ease;
}

.mailbox-stage.mailbox-open {
  filter: brightness(1.06) drop-shadow(0 0 18rpx rgba(255, 234, 97, 0.82));
  transform: scale(1.02);
}

.mailbox {
  width: 100%;
  height: 100%;
}

.mailbox-copy {
  position: absolute;
  top: 38%;
  left: 15%;
  width: 70%;
  height: 45%;
  text-align: center;
}

.meaning {
  display: block;
  color: #5c1a1d;
  font-size: clamp(16px, 4.5vw, 26px);
  line-height: 1;
}

.word-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(3px, 1.1vw, 9px);
  margin-top: 2%;
}

.word-letter {
  min-width: 0.55em;
  color: #5c0f18;
  font-size: clamp(34px, 9vw, 60px);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.22);
}

.word-letter.blank {
  min-width: 0.7em;
  border-bottom: 3px solid #5c0f18;
  color: transparent;
}

.word-letter.filled {
  color: #bd4b31;
  animation: letter-land 0.36s ease both;
}

.correct-feedback {
  position: absolute;
  top: 51%;
  left: 50%;
  width: 30%;
  height: 21%;
  z-index: 2;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.correct-feedback > image {
  width: 100%;
  height: 100%;
  animation: success-pop 0.78s ease both;
}

.feedback-star {
  position: absolute;
  width: 16%;
  height: 16%;
  animation: star-fly 0.9s ease both;
  animation-delay: var(--delay);
}

.feedback-star image { width: 100%; height: 100%; }

.wrong-feedback {
  position: absolute;
  top: 54%;
  left: 50%;
  width: 52%;
  height: 10%;
  z-index: 2;
  transform: translate(-50%, -50%);
  animation: wrong-pop 0.24s ease both;
}

.keyboard-stage {
  position: absolute;
  top: 68.8%;
  left: 15%;
  width: 70%;
  height: 21.5%;
}

.keyboard {
  width: 100%;
  height: 100%;
}

.tile-grid {
  position: absolute;
  top: 13%;
  left: 10%;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 7% 5%;
  width: 80%;
  height: 72%;
}

.letter-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  border: 2px solid #8c8c8c;
  border-radius: 13%;
  background: linear-gradient(#fff, #dfe4e7);
  box-shadow: 0 4rpx 0 #a4a5a7, inset 0 2rpx 4rpx rgba(255, 255, 255, 0.8);
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.letter-tile text {
  color: #626365;
  font-size: clamp(24px, 7vw, 44px);
  font-weight: 900;
  line-height: 1;
}

.letter-tile.tile-coral {
  border-color: #ed6d76;
  background: linear-gradient(#ffd2cd, #f59aa2);
  box-shadow: 0 4rpx 0 #d96570, inset 0 2rpx 4rpx rgba(255, 255, 255, 0.72);
}

.letter-tile.tile-coral text { color: #bd4c3d; }

.letter-tile.tile-yellow {
  border-color: #e6a51f;
  background: linear-gradient(#fff3ae, #ffd04b);
  box-shadow: 0 4rpx 0 #d99a1f, inset 0 2rpx 4rpx rgba(255, 255, 255, 0.72);
}

.letter-tile.tile-yellow text { color: #bc6b14; }
.letter-tile.dragging { z-index: 3; transform: translateY(-8%) scale(1.08); box-shadow: 0 10rpx 16rpx rgba(110, 72, 32, 0.28); }
.letter-tile.used { opacity: 0.36; transform: scale(0.94); }

.bottom-controls {
  position: absolute;
  right: 15%;
  bottom: 3.1%;
  left: 15%;
  display: flex;
  justify-content: space-between;
  gap: 14%;
}

.control-button {
  position: relative;
  width: 43%;
  height: 6.1%;
  min-height: 48px;
}

.control-button image { width: 100%; height: 100%; }
.control-button text {
  position: absolute;
  top: 50%;
  left: 37%;
  color: #fff;
  font-size: clamp(15px, 4.2vw, 26px);
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 2rpx 0 rgba(113, 56, 20, 0.25);
  transform: translateY(-50%);
  white-space: nowrap;
}

.listen-button.listening { animation: listen-pulse 0.72s ease-in-out infinite; }
.next-button.disabled { opacity: 0.58; filter: saturate(0.7); }

.complete-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 27, 54, 0.62);
}

.complete-panel {
  width: 84%;
  padding: 8% 6% 6%;
  border: 3px solid rgba(255, 245, 194, 0.94);
  border-radius: 28rpx;
  background: linear-gradient(180deg, #ffd541, #ff9d22);
  box-shadow: 0 12rpx 0 rgba(132, 66, 29, 0.3), 0 0 32rpx rgba(255, 225, 99, 0.5);
  text-align: center;
}

.complete-banner { width: 100%; height: clamp(72px, 12vw, 110px); }
.complete-stars { display: flex; justify-content: center; gap: 6%; margin: 6% 0 3%; }
.complete-stars image { width: 17%; height: clamp(32px, 8vw, 58px); }
.complete-copy { display: block; color: #fff; font-size: clamp(18px, 5vw, 30px); font-weight: 900; text-shadow: 0 2rpx 0 #bf641d; }
.restart-button { width: 52%; margin: 7% auto 0; padding: 3% 0; border: 3px solid #fff; border-radius: 999rpx; background: #ffbd19; color: #fff; font-size: clamp(18px, 5vw, 30px); font-weight: 900; box-shadow: 0 5rpx 0 #cf781c; }
.confetti { position: absolute; color: #ff3b76; font-size: 34px; animation: confetti-drop 1.2s ease infinite; }
.confetti-one { top: 15%; left: 14%; }
.confetti-two { top: 22%; right: 16%; color: #8d41ff; animation-delay: 180ms; }

@keyframes success-pop { 0% { opacity: 0; transform: scale(0.55) rotate(-8deg); } 60% { opacity: 1; transform: scale(1.12) rotate(3deg); } 100% { transform: scale(1); } }
@keyframes star-fly { 0% { opacity: 0; transform: scale(0.2) rotate(-30deg); } 55% { opacity: 1; transform: scale(1.2) rotate(16deg); } 100% { opacity: 0.92; transform: scale(1) rotate(0); } }
@keyframes wrong-pop { 0%, 100% { transform: translate(-50%, -50%); } 45% { transform: translate(-50%, -50%) scale(1.06); } }
@keyframes letter-land { 0% { transform: translateY(-24%) scale(0.7); opacity: 0.2; } 75% { transform: translateY(6%) scale(1.1); } 100% { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes listen-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); filter: brightness(1.1); } }
@keyframes confetti-drop { 0%, 100% { transform: translateY(-8px) rotate(0); } 50% { transform: translateY(14px) rotate(35deg); } }
</style>
