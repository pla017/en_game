<template>
  <view
    class="listen-game mini-game-screen"
    @touchstart="resumeBackgroundMusic"
    @mousedown="resumeBackgroundMusic"
  >
    <image class="scene-bg" :src="backgroundUrl" mode="scaleToFill" />

    <image class="back-button tap-image" :src="returnUrl" mode="aspectFit" @tap="goBack" />
    <view
      class="music-button tap-image"
      :class="{ playing: isMusicPlaying, muted: !isMusicEnabled }"
      :style="musicButtonStyle"
      :aria-label="isMusicEnabled ? '关闭背景音乐' : '开启背景音乐'"
      @touchstart.stop="toggleBackgroundMusic($event)"
      @mousedown.stop="toggleBackgroundMusic($event)"
    >
      <view class="music-spinner" />
      <text class="music-note">♪</text>
      <view v-if="!isMusicEnabled" class="music-muted-line" />
    </view>
    <text class="game-title">听音填词</text>

    <view class="progress-wrap" aria-label="游戏进度">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: `${progressPercent}%` }">
          <view class="progress-highlight" />
        </view>
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
        <view class="word-row" :style="wordRowStyle">
          <view
            v-for="(letter, index) in patternLetters"
            :key="`${currentRound.word}-${index}`"
            class="word-letter"
            :class="{
              blank: currentRound.missingIndices.includes(index) && !filledLetters[index],
              filled: currentRound.missingIndices.includes(index) && filledLetters[index]
            }"
          >
            {{ currentRound.missingIndices.includes(index) ? filledLetters[index] : letter }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="feedback === 'correct'" class="correct-feedback">
      <image class="correct-art" :src="rightAnswerUrl" mode="aspectFit" />
      <view v-for="(star, index) in stars" :key="index" class="feedback-star" :style="star.style">
        <image class="feedback-star-art" :src="starUrl" mode="aspectFit" />
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
            { used: usedTileIds.includes(tile.id), dragging: draggingTileId === tile.id }
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
        <image class="control-art" :src="listenUrl" mode="scaleToFill" />
        <text>听发音</text>
      </view>
      <view class="control-button next-button tap-image" :class="{ disabled: isBusy || !isRoundSolved }" @tap="nextWord">
        <image class="control-art" :src="nextButtonUrl" mode="scaleToFill" />
        <text>下个单词</text>
      </view>
    </view>

    <view v-if="isComplete" class="complete-layer">
      <view class="confetti confetti-one">◆</view>
      <view class="confetti confetti-two">◆</view>
      <view class="complete-dialog">
        <image class="complete-banner" :src="completeBannerUrl" mode="aspectFit" />
        <view class="complete-stars">
          <image v-for="star in rounds.length" :key="star" class="complete-star-art" :src="starUrl" mode="aspectFit" />
        </view>
        <text class="complete-time">闯关用时：{{ completionTime }}</text>
      </view>
      <image class="complete-next" :src="nextStageUrl" mode="aspectFit" @tap="goToNextGame" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';
import backgroundUrl from './assets/game6_bg.jpg';
import completeBannerUrl from './assets/game6_excise.png';
import keyboardUrl from './assets/game6_keyboard.png';
import listenUrl from './assets/game6_listen.png';
import mailboxUrl from './assets/game6_main.png';
import nextButtonUrl from './assets/game6_next2.png';
import nextStageUrl from './assets/game6_next.png';
import returnUrl from './assets/game6_return.png';
import rightAnswerUrl from './assets/game6_answer_right.png';
import starUrl from './assets/game6_star.png';
import wrongAnswerUrl from './assets/game6_answer_wrong.png';
import bananaAudioUrl from '../game04/audio/banana.mp3';
import backgroundMusicUrl from '../game05/audio/background-music.mp3';
import correctEffectAudioUrl from '../game04/audio/correct.mp3';
import correctVoiceAudioUrl from '../game04/audio/correct-voice.mp3';
import mangoAudioUrl from '../game04/audio/mango.mp3';
import orangeAudioUrl from '../game04/audio/orange.mp3';
import openingGuideAudioUrl from '../game05/audio/opening-guide.mp3';
import pearAudioUrl from '../game04/audio/pear.mp3';
import plumAudioUrl from '../game04/audio/plum.mp3';
import letterPlaceAudioUrl from '../game02/audio/select.mp3';
import wrongEffectAudioUrl from '../game04/audio/wrong.mp3';

type TileTone = 'coral' | 'yellow' | 'mint' | 'blue' | 'lavender' | 'plain';
interface LetterTile {
  id: string;
  letter: string;
  tone: TileTone;
}
interface Round {
  word: string;
  meaning: string;
  missingIndices: number[];
  tiles: LetterTile[];
  audio: string;
}

const rounds: Round[] = [
  {
    word: 'plum',
    meaning: '李子',
    missingIndices: [2],
    audio: plumAudioUrl,
    tiles: makeTiles(['p', 'l', 'l', 'u', 'm', 't', 't', 's', 'r', 'b'], ['plain', 'mint', 'plain', 'coral', 'blue', 'plain', 'lavender', 'plain', 'mint', 'yellow'])
  },
  {
    word: 'banana',
    meaning: '香蕉',
    missingIndices: [1, 3, 5],
    audio: bananaAudioUrl,
    tiles: makeTiles(['b', 'a', 'n', 'a', 'n', 'a', 'c', 'd', 'p', 'r'], ['yellow', 'plain', 'mint', 'coral', 'blue', 'plain', 'lavender', 'plain', 'mint', 'coral'])
  },
  {
    word: 'pear',
    meaning: '梨',
    missingIndices: [1, 3],
    audio: pearAudioUrl,
    tiles: makeTiles(['p', 'e', 'a', 'r', 't', 'l', 'm', 'o', 'b', 's'], ['blue', 'coral', 'mint', 'plain', 'lavender', 'plain', 'coral', 'plain', 'mint', 'yellow'])
  },
  {
    word: 'mango',
    meaning: '芒果',
    missingIndices: [1, 3],
    audio: mangoAudioUrl,
    tiles: makeTiles(['m', 'a', 'n', 'g', 'o', 'p', 'b', 't', 'r', 'l'], ['coral', 'mint', 'plain', 'blue', 'yellow', 'plain', 'lavender', 'plain', 'mint', 'coral'])
  },
  {
    word: 'orange',
    meaning: '橙子',
    missingIndices: [1, 3, 5],
    audio: orangeAudioUrl,
    tiles: makeTiles(['o', 'r', 'a', 'n', 'g', 'e', 'p', 'b', 't', 'm'], ['coral', 'plain', 'mint', 'blue', 'yellow', 'coral', 'plain', 'lavender', 'mint', 'plain'])
  }
];

function makeTiles(letters: string[], tones: TileTone[]): LetterTile[] {
  return letters.map((letter, index) => ({
    id: `${letter}-${index}`,
    letter,
    tone: tones[index] || 'plain'
  }));
}

const { updateProgress, resetProgress } = useGameProgress('game-06');
const currentIndex = ref(0);
const filledLetters = ref<string[]>([]);
const usedTileIds = ref<string[]>([]);
const draggingTileId = ref('');
const feedback = ref<'correct' | 'wrong' | null>(null);
const isSpeaking = ref(false);
const isGuiding = ref(false);
const isComplete = ref(false);
const isMusicEnabled = ref(true);
const isMusicPlaying = ref(false);
const completionTime = ref('0分00秒');
const musicButtonStyle = ref<Record<string, string>>({});

const currentRound = computed(() => rounds[currentIndex.value]);
const patternLetters = computed(() => currentRound.value.word.split(''));
const wordRowStyle = computed(() => {
  const length = currentRound.value.word.length;
  const width = length <= 4 ? 68 : length === 5 ? 82 : 94;
  const size = length <= 4 ? 7.4 : length === 5 ? 6.6 : 5.8;
  return {
    width: `${width}%`,
    fontSize: `clamp(24px, ${size}vw, 46px)`,
    gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))`
  };
});
const progressPercent = computed(() => ((currentIndex.value + 1) / rounds.length) * 100);
const isRoundSolved = computed(() => currentRound.value.missingIndices.every((index) => Boolean(filledLetters.value[index])));
const nextMissingIndex = computed(() => currentRound.value.missingIndices.find((index) => !filledLetters.value[index]));
const isBusy = computed(() => Boolean(feedback.value) || isGuiding.value || isComplete.value);
const stars = [
  { style: 'left: 18%; top: 22%; --delay: 0ms' },
  { style: 'left: 42%; top: 2%; --delay: 100ms' },
  { style: 'left: 64%; top: 17%; --delay: 180ms' },
  { style: 'left: 78%; top: 45%; --delay: 240ms' },
  { style: 'left: 12%; top: 50%; --delay: 80ms' }
];

let wordAudio: UniApp.InnerAudioContext | null = null;
let completionWordAudio: UniApp.InnerAudioContext | null = null;
let openingGuideAudio: UniApp.InnerAudioContext | null = null;
let letterPlaceAudio: UniApp.InnerAudioContext | null = null;
let correctEffectAudio: UniApp.InnerAudioContext | null = null;
let correctVoiceAudio: UniApp.InnerAudioContext | null = null;
let wrongEffectAudio: UniApp.InnerAudioContext | null = null;
let backgroundMusicAudio: UniApp.InnerAudioContext | null = null;
let speechTimer: ReturnType<typeof setTimeout> | null = null;
let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;
let openingGuideTimer: ReturnType<typeof setTimeout> | null = null;
let dragMoved = false;
let openingGuidePending = false;
let lastMusicButtonTouchAt = 0;
let gameStartedAt = Date.now();
const dragStart = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });

function getTouch(event: any) {
  return event?.touches?.[0] || event?.changedTouches?.[0] || null;
}

function startDrag(event: any, tile: LetterTile) {
  resumeBackgroundMusic();
  if (isBusy.value || usedTileIds.value.includes(tile.id) || isRoundSolved.value) return;
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
  resumeBackgroundMusic();
  if (isBusy.value || usedTileIds.value.includes(tile.id) || isRoundSolved.value) return;
  playLetterPlaceEffect();
  const missingIndex = nextMissingIndex.value;
  if (missingIndex == null) return;

  if (tile.letter.toLowerCase() === currentRound.value.word[missingIndex]) {
    const nextFilledLetters = [...filledLetters.value];
    nextFilledLetters[missingIndex] = tile.letter;
    filledLetters.value = nextFilledLetters;
    usedTileIds.value = [...usedTileIds.value, tile.id];
    if (isRoundSolved.value) {
      feedback.value = 'correct';
      updateProgress((currentIndex.value + 1) * 20, currentIndex.value === rounds.length - 1);
      playCorrectEffect();
      playCorrectSequence();
      vibrate('light');
      feedbackTimer = setTimeout(() => advanceRound(), 3600);
    }
    return;
  }

  feedback.value = 'wrong';
  playWrongEffect();
  speakWithSystemVoice('不对，请再试一次', 'zh-CN', 0.9);
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    feedback.value = null;
    feedbackTimer = null;
    playWord();
  }, 850);
}

function playWord() {
  if (isComplete.value || isGuiding.value) return;
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

function ensureBackgroundMusic() {
  if (backgroundMusicAudio) return backgroundMusicAudio;
  backgroundMusicAudio = uni.createInnerAudioContext();
  backgroundMusicAudio.obeyMuteSwitch = false;
  backgroundMusicAudio.loop = true;
  backgroundMusicAudio.volume = 0.16;
  backgroundMusicAudio.src = backgroundMusicUrl;
  backgroundMusicAudio.onPlay(() => { isMusicPlaying.value = true; });
  backgroundMusicAudio.onPause(() => { isMusicPlaying.value = false; });
  backgroundMusicAudio.onStop(() => { isMusicPlaying.value = false; });
  backgroundMusicAudio.onError(() => { isMusicPlaying.value = false; });
  return backgroundMusicAudio;
}

function canStartAudio() {
  if (typeof navigator === 'undefined') return true;
  const navigatorWithActivation = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  return navigatorWithActivation.userActivation?.hasBeenActive ?? true;
}

function startBackgroundMusic() {
  if (!isMusicEnabled.value) return;
  ensureBackgroundMusic().play();
}

function resumeBackgroundMusic() {
  if (isMusicEnabled.value) startBackgroundMusic();
  if (openingGuidePending) playOpeningGuide();
}

function toggleBackgroundMusic(event?: { type?: string }) {
  const now = Date.now();
  if (event?.type === 'mousedown' && now - lastMusicButtonTouchAt < 700) return;
  if (event?.type === 'touchstart') lastMusicButtonTouchAt = now;

  // Audio state is authoritative here: an autoplay-blocked but enabled track should retry on tap.
  if (!isMusicPlaying.value) {
    isMusicEnabled.value = true;
    startBackgroundMusic();
    return;
  }
  isMusicEnabled.value = false;
  isMusicPlaying.value = false;
  backgroundMusicAudio?.pause();
}

function positionMusicButton() {
  const uniWithMenuButton = uni as typeof uni & {
    getMenuButtonBoundingClientRect?: () => { bottom?: number };
  };
  const menuButton = uniWithMenuButton.getMenuButtonBoundingClientRect?.();
  if (!menuButton?.bottom) return;
  musicButtonStyle.value = { top: `${menuButton.bottom + 12}px` };
}

function playLetterPlaceEffect() {
  if (!letterPlaceAudio) {
    letterPlaceAudio = uni.createInnerAudioContext();
    letterPlaceAudio.obeyMuteSwitch = false;
  }
  letterPlaceAudio.stop();
  letterPlaceAudio.src = letterPlaceAudioUrl;
  letterPlaceAudio.play();
}

function playCorrectEffect() {
  if (!correctEffectAudio) {
    correctEffectAudio = uni.createInnerAudioContext();
    correctEffectAudio.obeyMuteSwitch = false;
  }
  correctEffectAudio.stop();
  correctEffectAudio.src = correctEffectAudioUrl;
  correctEffectAudio.play();
}

function playWrongEffect() {
  if (!wrongEffectAudio) {
    wrongEffectAudio = uni.createInnerAudioContext();
    wrongEffectAudio.obeyMuteSwitch = false;
  }
  wrongEffectAudio.stop();
  wrongEffectAudio.src = wrongEffectAudioUrl;
  wrongEffectAudio.play();
}

function playCorrectSequence() {
  isSpeaking.value = true;
  if (!completionWordAudio) {
    completionWordAudio = uni.createInnerAudioContext();
    completionWordAudio.obeyMuteSwitch = false;
    completionWordAudio.onEnded(playCorrectVoice);
    completionWordAudio.onError(playCorrectVoice);
  }
  completionWordAudio.stop();
  completionWordAudio.src = currentRound.value.audio;
  completionWordAudio.play();
}

function playCorrectVoice() {
  if (!correctVoiceAudio) {
    correctVoiceAudio = uni.createInnerAudioContext();
    correctVoiceAudio.obeyMuteSwitch = false;
    correctVoiceAudio.onEnded(() => { isSpeaking.value = false; });
    correctVoiceAudio.onError(() => speakWithSystemVoice('答对了', 'zh-CN', 0.9));
  }
  correctVoiceAudio.stop();
  correctVoiceAudio.src = correctVoiceAudioUrl;
  correctVoiceAudio.play();
}

function speakWithSystemVoice(text: string, lang = 'en-US', rate = 0.72, onFinished?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    isSpeaking.value = false;
    onFinished?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.onend = () => {
    isSpeaking.value = false;
    onFinished?.();
  };
  utterance.onerror = () => {
    isSpeaking.value = false;
    onFinished?.();
  };
  window.speechSynthesis.speak(utterance);
}

function playOpeningGuideFallback() {
  speakWithSystemVoice('请先听单词发音，再选择正确字母填入空格。', 'zh-CN', 0.9, finishOpeningGuide);
}

function finishOpeningGuide() {
  if (openingGuideTimer) {
    clearTimeout(openingGuideTimer);
    openingGuideTimer = null;
  }
  if (!isGuiding.value) return;
  isGuiding.value = false;
  playWord();
}

function playOpeningGuide() {
  openingGuidePending = false;
  if (isComplete.value) return;
  isGuiding.value = true;
  isSpeaking.value = true;
  wordAudio?.stop();
  if (!openingGuideAudio) {
    openingGuideAudio = uni.createInnerAudioContext();
    openingGuideAudio.obeyMuteSwitch = false;
    openingGuideAudio.onEnded(finishOpeningGuide);
    openingGuideAudio.onError(playOpeningGuideFallback);
  }
  openingGuideAudio.stop();
  openingGuideAudio.src = openingGuideAudioUrl;
  openingGuideAudio.play();
  openingGuideTimer = setTimeout(finishOpeningGuide, 4300);
}

function playOpeningGuideAfterDelay(delay: number) {
  if (openingGuideTimer) clearTimeout(openingGuideTimer);
  openingGuidePending = false;
  isGuiding.value = true;
  openingGuideTimer = setTimeout(() => {
    openingGuideTimer = null;
    if (!canStartAudio()) {
      openingGuidePending = true;
      return;
    }
    playOpeningGuide();
  }, delay);
}

function advanceRound() {
  feedback.value = null;
  feedbackTimer = null;
  completionWordAudio?.stop();
  correctVoiceAudio?.stop();
  isSpeaking.value = false;
  if (currentIndex.value >= rounds.length - 1) {
    completionTime.value = formatElapsed(Date.now() - gameStartedAt);
    isComplete.value = true;
    return;
  }
  currentIndex.value += 1;
  filledLetters.value = [];
  usedTileIds.value = [];
  transitionTimer = setTimeout(playWord, 180);
}

function nextWord() {
  if (isBusy.value || !isRoundSolved.value) return;
  advanceRound();
}

function restart() {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (transitionTimer) clearTimeout(transitionTimer);
  if (openingGuideTimer) clearTimeout(openingGuideTimer);
  openingGuideAudio?.stop();
  completionWordAudio?.stop();
  correctVoiceAudio?.stop();
  resetProgress();
  currentIndex.value = 0;
  completionTime.value = '0分00秒';
  gameStartedAt = Date.now();
  filledLetters.value = [];
  usedTileIds.value = [];
  feedback.value = null;
  isGuiding.value = false;
  isComplete.value = false;
  playOpeningGuideAfterDelay(220);
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
}

function goToNextGame() {
  uni.redirectTo({ url: '/pages/play/play?id=game-07' });
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
  gameStartedAt = Date.now();
  nextTick(positionMusicButton);
  startBackgroundMusic();
  playOpeningGuideAfterDelay(450);
});

onUnmounted(() => {
  if (speechTimer) clearTimeout(speechTimer);
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (transitionTimer) clearTimeout(transitionTimer);
  if (openingGuideTimer) clearTimeout(openingGuideTimer);
  openingGuideAudio?.destroy();
  letterPlaceAudio?.destroy();
  correctEffectAudio?.destroy();
  correctVoiceAudio?.destroy();
  wrongEffectAudio?.destroy();
  completionWordAudio?.destroy();
  wordAudio?.destroy();
  backgroundMusicAudio?.destroy();
  openingGuideAudio = null;
  letterPlaceAudio = null;
  correctEffectAudio = null;
  correctVoiceAudio = null;
  wrongEffectAudio = null;
  completionWordAudio = null;
  wordAudio = null;
  backgroundMusicAudio = null;
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

.music-button {
  position: absolute;
  top: max(150rpx, calc(env(safe-area-inset-top) + 100rpx));
  right: 5%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 10.5%;
  aspect-ratio: 1;
  border: 2rpx solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  background: #f2b532;
  box-shadow: 0 4rpx 0 #d98523, 0 6rpx 12rpx rgba(83, 115, 38, 0.22);
}

.music-spinner {
  position: absolute;
  inset: -0.35vh;
  border: 0.35vh solid #fff7c8;
  border-top-color: #fff;
  border-radius: 50%;
}

.music-button.playing .music-spinner,
.music-button.playing .music-note { animation: music-spin 2.4s linear infinite; }
.music-note { display: block; color: #fff; font-size: 3.1vh; font-weight: 800; line-height: 1; text-shadow: 0 0.16vh 0 rgba(146, 78, 14, 0.3); transform-origin: center; }
.music-muted-line { position: absolute; width: 72%; height: 0.32vh; border-radius: 1vh; background: #fff; transform: rotate(-45deg); box-shadow: 0 0.12vh 0 rgba(146, 78, 14, 0.25); }
.music-button.muted { background: #9a9da0; box-shadow: 0 4rpx 0 #74777a, 0 6rpx 12rpx rgba(70, 70, 70, 0.18); }

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
  top: 15.3%;
  left: 50%;
  width: 66%;
  height: 8.8%;
  z-index: 2;
  transform: translateX(-50%);
}

.progress-track {
  position: absolute;
  top: 12%;
  left: 5%;
  width: 90%;
  height: 28%;
  overflow: hidden;
  border-radius: 999rpx;
  border: 3rpx solid #ee8195;
  background: linear-gradient(180deg, #73152e 0%, #9b2943 52%, #6d1329 100%);
  box-shadow:
    0 2rpx 0 rgba(255, 203, 207, 0.92),
    inset 0 3rpx 7rpx rgba(70, 8, 29, 0.62),
    0 3rpx 7rpx rgba(130, 25, 50, 0.22);
}

.progress-fill {
  position: relative;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffc72b 0%, #ffde38 52%, #ffb62a 100%);
  box-shadow:
    inset 0 -3rpx 4rpx rgba(239, 137, 26, 0.45),
    2rpx 0 8rpx rgba(255, 196, 31, 0.72);
  transition: width 0.45s ease;
}

.progress-highlight {
  position: absolute;
  top: 13%;
  right: 12%;
  left: 12%;
  height: 27%;
  border-radius: 999rpx;
  background: rgba(255, 255, 205, 0.76);
}

.progress-label {
  position: absolute;
  top: 55%;
  left: 0;
  width: 100%;
  color: #6f241f;
  font-size: clamp(14px, 3.7vw, 23px);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: 0 1rpx 0 rgba(255, 255, 255, 0.72);
}

.mailbox-stage {
  position: absolute;
  top: 26.4%;
  left: 50%;
  // Keep the supplied mailbox art at its native 680:432 ratio across phone aspect ratios.
  width: min(70%, 53.5vh);
  aspect-ratio: 680 / 432;
  height: auto;
  transition: transform 0.22s ease, filter 0.22s ease;
  transform: translateX(-50%);
}

.mailbox-stage.mailbox-open {
  filter: brightness(1.06) drop-shadow(0 0 18rpx rgba(255, 234, 97, 0.82));
  transform: translateX(-50%) scale(1.02);
}

.mailbox {
  width: 100%;
  height: 100%;
}

.mailbox-copy {
  position: absolute;
  top: 40%;
  left: 15%;
  width: 70%;
  height: 42%;
  overflow: hidden;
  text-align: center;
}

.meaning {
  display: block;
  color: #5c1a1d;
  font-size: clamp(20px, 5.2vw, 34px);
  font-weight: 700;
  line-height: 1.1;
}

.word-row {
  display: grid;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  column-gap: 2%;
  margin: 7% auto 0;
  overflow: hidden;
}

.word-letter {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 1.1em;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: #5c0f18;
  font-size: inherit;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.22);
}

.word-letter.blank {
  border-bottom: 3px solid #5c0f18;
  color: transparent;
}

.word-letter.filled {
  color: #bd4b31;
  animation: letter-land 0.36s ease both;
}

.correct-feedback {
  position: absolute;
  top: 56%;
  left: 50%;
  width: 27%;
  height: 15%;
  z-index: 2;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.correct-art {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  animation: success-pop 0.78s ease both;
}

.feedback-star {
  position: absolute;
  width: 16%;
  height: 16%;
  animation: star-fly 0.9s ease both;
  animation-delay: var(--delay);
}

.feedback-star-art {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
}

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
  top: 64.5%;
  left: 10%;
  width: 80%;
  height: 26%;
}

.keyboard {
  width: 100%;
  height: 100%;
}

.tile-grid {
  position: absolute;
  top: 16%;
  left: 11.5%;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 4.5% 4%;
  width: 77%;
  height: 63%;
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
.letter-tile.tile-mint {
  border-color: #7ec9a5;
  background: linear-gradient(#e5fff0, #a9e8c5);
  box-shadow: 0 4rpx 0 #70b894, inset 0 2rpx 4rpx rgba(255, 255, 255, 0.72);
}
.letter-tile.tile-mint text { color: #32845a; }
.letter-tile.tile-blue {
  border-color: #7aa8d9;
  background: linear-gradient(#e6f3ff, #acd1f6);
  box-shadow: 0 4rpx 0 #7199c5, inset 0 2rpx 4rpx rgba(255, 255, 255, 0.72);
}
.letter-tile.tile-blue text { color: #3f6e9f; }
.letter-tile.tile-lavender {
  border-color: #b18ed0;
  background: linear-gradient(#f3e9ff, #d2b5ed);
  box-shadow: 0 4rpx 0 #a47bc3, inset 0 2rpx 4rpx rgba(255, 255, 255, 0.72);
}
.letter-tile.tile-lavender text { color: #76519c; }
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

.control-art {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
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
  background: rgba(31, 27, 54, 0.62);
}

.complete-dialog {
  position: absolute;
  top: 31%;
  left: 50%;
  width: 86%;
  height: 30%;
  transform: translateX(-50%);
}

.complete-banner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 28%;
}

.complete-stars {
  position: absolute;
  top: 39%;
  left: 0;
  display: flex;
  width: 100%;
  height: 17%;
  align-items: center;
  justify-content: center;
  gap: 2%;
}

.complete-star-art { width: 12%; height: 100%; }

.complete-time {
  position: absolute;
  top: 69%;
  left: 0;
  width: 100%;
  color: #ffd522;
  font-size: clamp(16px, 4.2vw, 26px);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: 0 2rpx 0 rgba(113, 56, 20, 0.3);
}

.complete-next {
  position: absolute;
  top: 67%;
  left: 50%;
  width: 50%;
  height: 10%;
  transform: translateX(-50%);
  animation: complete-next-pop 0.42s 0.45s ease both;
}

.confetti { position: absolute; color: #ff3b76; font-size: 34px; animation: confetti-drop 1.2s ease infinite; }
.confetti-one { top: 15%; left: 14%; }
.confetti-two { top: 22%; right: 16%; color: #8d41ff; animation-delay: 180ms; }

@keyframes success-pop { 0% { opacity: 0; transform: scale(0.55) rotate(-8deg); } 60% { opacity: 1; transform: scale(1.12) rotate(3deg); } 100% { transform: scale(1); } }
@keyframes star-fly { 0% { opacity: 0; transform: scale(0.2) rotate(-30deg); } 55% { opacity: 1; transform: scale(1.2) rotate(16deg); } 100% { opacity: 0.92; transform: scale(1) rotate(0); } }
@keyframes wrong-pop { 0%, 100% { transform: translate(-50%, -50%); } 45% { transform: translate(-50%, -50%) scale(1.06); } }
@keyframes letter-land { 0% { transform: translateY(-24%) scale(0.7); opacity: 0.2; } 75% { transform: translateY(6%) scale(1.1); } 100% { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes listen-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); filter: brightness(1.1); } }
@keyframes music-spin { to { transform: rotate(360deg); } }
@keyframes confetti-drop { 0%, 100% { transform: translateY(-8px) rotate(0); } 50% { transform: translateY(14px) rotate(35deg); } }
@keyframes complete-next-pop { from { opacity: 0; transform: translateX(-50%) translateY(24px) scale(0.72); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
</style>
