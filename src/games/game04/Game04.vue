<template>
  <view
    class="drum-game mini-game-screen"
    @touchstart="resumePageAudio"
    @mousedown="resumePageAudio"
    @tap="resumePageAudio"
  >
    <image class="scene-bg" :src="backgroundUrl" mode="aspectFill" />

    <image class="back-button tap-image" :src="returnUrl" mode="aspectFit" @tap="goBack" />
    <view
      class="music-button tap-image"
      :class="{ playing: isMusicPlaying, muted: !isMusicEnabled }"
      :style="musicButtonStyle"
      :aria-label="isMusicEnabled ? '关闭背景音乐' : '开启背景音乐'"
      @tap.stop="toggleBackgroundMusic"
    >
      <view class="music-disc">
        <text class="music-note">♪</text>
        <view class="music-disc-center" />
      </view>
      <view v-if="!isMusicEnabled" class="music-slash" />
    </view>
    <image class="game-title" :src="titleUrl" mode="aspectFit" />

    <view class="progress-wrap" aria-label="游戏进度">
      <image class="progress-bg" :src="progressBgUrl" mode="aspectFit" />
      <view class="progress-fill-clip" :style="{ width: `${progressPercent}%` }">
        <image class="progress-fill" :src="progressFillUrl" mode="scaleToFill" />
      </view>
      <view class="progress-knob" :style="{ left: `${progressPercent}%` }" />
      <text class="progress-label">{{ currentRound + 1 }} / {{ rounds.length }}</text>
    </view>

    <view class="instruction" :class="{ 'is-listening': isSpeaking }">
      <text>{{ instruction }}</text>
      <view v-if="isSpeaking" class="listening-dots"><text>●</text><text>●</text><text>●</text></view>
    </view>

    <view class="drum-stage" :class="{ locked: isLocked }">
      <view
        v-for="drum in drums"
        :key="drum.id"
        class="drum-button"
        :class="[
          `drum-${drum.position}`,
          { 'is-hit': isDrumStruck(drum.id), 'is-wrong': wrongDrumId === drum.id }
        ]"
        @tap="tapDrum(drum)"
      >
        <image class="drum-image" :src="drum.image" mode="aspectFit" />
        <text class="word-label" :class="`word-${drum.position}`">{{ drum.word }}</text>
        <image
          v-if="isDrumStruck(drum.id)"
          class="burst impact-mark"
          :src="impactMarkUrl"
          mode="aspectFit"
        />
        <image
          v-if="isDrumStruck(drum.id)"
          class="burst impact-rays"
          :src="impactRaysUrl"
          mode="aspectFit"
        />
        <view v-if="isDrumStruck(drum.id)" class="drumstick" />
      </view>
    </view>

    <transition name="feedback">
      <view v-if="feedback === 'correct'" class="feedback-overlay feedback-correct">
        <view class="feedback-card">
          <image :src="answerRightUrl" mode="aspectFit" />
        </view>
      </view>
    </transition>
    <transition name="feedback">
      <view v-if="feedback === 'wrong'" class="feedback-overlay feedback-wrong">
        <view class="feedback-card">
          <image :src="answerWrongUrl" mode="aspectFit" />
        </view>
      </view>
    </transition>

    <view class="bottom-controls">
      <view class="control-button play-button tap-image" @tap="replayWord">
        <image :src="playUrl" mode="aspectFit" />
      </view>
      <view
        class="control-button next-button tap-image"
        :class="{ disabled: !hasAnswered || isComplete }"
        @tap="nextRound"
      >
        <image :src="nextUrl" mode="aspectFit" />
      </view>
    </view>

    <view v-if="isComplete" class="complete-layer">
      <image class="complete-banner" :src="completeBannerUrl" mode="scaleToFill" />
      <view class="complete-stars" aria-label="三颗星">
        <image v-for="star in 3" :key="star" :src="completeStarUrl" mode="aspectFit" />
      </view>
      <view class="complete-time" aria-label="本关用时">
        <image :src="completeHourglassUrl" mode="aspectFit" />
        <text>{{ formattedTime }}</text>
      </view>
      <image class="complete-next tap-image" :src="completeNextUrl" mode="aspectFit" @tap="nextLevel" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';
import answerRightUrl from './assets/game4_answer_right.png';
import answerWrongUrl from './assets/game4_answer_wrong.png';
import backgroundUrl from './assets/game_bg.jpg';
import nextUrl from './assets/game4_next.png';
import playUrl from './assets/game4_play.png';
import progressBgUrl from './assets/game4_progress_bar_bg.png';
import progressFillUrl from './assets/game4_progress_bar_ing.png';
import returnUrl from './assets/game4_return.png';
import impactMarkUrl from './assets/game4_boom1.png';
import titleUrl from './assets/game4_tit.png';
import impactRaysUrl from './assets/game4_boom2.png';
import drum4Url from './assets/game4_drum4.png';
import completeBannerUrl from './assets/game4_tc.png';
import completeHourglassUrl from './assets/game4_ld.png';
import completeNextUrl from './assets/game4_next_step.png';
import completeStarUrl from './assets/game4_star.png';
import backgroundMusicUrl from '../game05/audio/background-music.mp3';
import bananaAudioUrl from './audio/banana.mp3';
import correctAudioUrl from './audio/correct.mp3';
import correctVoiceAudioUrl from './audio/correct-voice.mp3';
import drumHitAudioUrl from './audio/drum-hit.mp3';
import mangoAudioUrl from './audio/mango.mp3';
import openingGuideAudioUrl from './audio/opening-guide.mp3';
import orangeAudioUrl from './audio/orange.mp3';
import pearAudioUrl from './audio/pear.mp3';
import plumAudioUrl from './audio/plum.mp3';
import wrongAudioUrl from './audio/wrong.mp3';

type Position = 'left-top' | 'center-top' | 'right-top' | 'left-bottom' | 'center-bottom';
type Feedback = 'correct' | 'wrong' | null;
type EffectName = 'drum' | 'correct' | 'wrong';

interface Round {
  word: string;
  options: string[];
}

interface Drum {
  id: string;
  word: string;
  position: Position;
  image: string;
}

const rounds: Round[] = [
  { word: 'plum', options: ['mango', 'plum', 'pear', 'orange', 'banana'] },
  { word: 'banana', options: ['orange', 'banana', 'mango', 'pear', 'plum'] },
  { word: 'pear', options: ['plum', 'mango', 'pear', 'banana', 'orange'] },
  { word: 'mango', options: ['pear', 'orange', 'banana', 'mango', 'plum'] },
  { word: 'orange', options: ['banana', 'pear', 'orange', 'plum', 'mango'] }
];

const positions: Position[] = ['left-top', 'center-top', 'right-top', 'left-bottom', 'center-bottom'];
// Every option uses the same front-facing drum so its visible size and angle stay consistent.
const drumImageUrl = drum4Url;
const wordAudioUrls: Record<string, string> = {
  banana: bananaAudioUrl,
  mango: mangoAudioUrl,
  orange: orangeAudioUrl,
  pear: pearAudioUrl,
  plum: plumAudioUrl
};
const effectAudioUrls: Record<EffectName, string> = {
  drum: drumHitAudioUrl,
  correct: correctAudioUrl,
  wrong: wrongAudioUrl
};
const { updateProgress, resetProgress } = useGameProgress('game-04');

const currentRound = ref(0);
const drums = ref<Drum[]>([]);
const feedback = ref<Feedback>(null);
const hitDrumId = ref<string | null>(null);
const wrongDrumId = ref<string | null>(null);
const hasAnswered = ref(false);
const isSpeaking = ref(false);
const isGuiding = ref(false);
const isComplete = ref(false);
const wrongAttempts = ref(0);
const elapsedSeconds = ref(0);
const studyStartedAt = ref(0);
const isMusicEnabled = ref(true);
const isMusicPlaying = ref(false);
const openingGuidePending = ref(false);
const musicButtonStyle = ref<Record<string, string>>({});

let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
let correctVoiceTimer: ReturnType<typeof setTimeout> | null = null;
let openingGuideTimer: ReturnType<typeof setTimeout> | null = null;
let openingGuideFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let initialWordTimer: ReturnType<typeof setTimeout> | null = null;
let speechTimer: ReturnType<typeof setTimeout> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let backgroundMusicAudio: UniApp.InnerAudioContext | null = null;
let wordAudio: UniApp.InnerAudioContext | null = null;
let correctVoiceAudio: UniApp.InnerAudioContext | null = null;
let openingGuideAudio: UniApp.InnerAudioContext | null = null;
const effectAudios: Partial<Record<EffectName, UniApp.InnerAudioContext>> = {};

const progressPercent = computed(() => (currentRound.value / rounds.length) * 100);
const formattedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60);
  const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});
const isLocked = computed(() => openingGuidePending.value || isGuiding.value || hasAnswered.value || Boolean(feedback.value));
const instruction = computed(() => {
  if (openingGuidePending.value) return '点击页面，先听操作提示';
  if (isSpeaking.value) return '认真听，找出对应的单词';
  if (hasAnswered.value) return '答对啦！点击右下角继续';
  return '听一听，点击对应单词的鼓面';
});

function buildDrums() {
  const round = rounds[currentRound.value];
  drums.value = positions.map((position, index) => ({
    id: `${currentRound.value}-${round.options[index]}`,
    word: round.options[index],
    position,
    image: drumImageUrl
  }));
}

function isDrumStruck(drumId: string) {
  return hitDrumId.value === drumId || wrongDrumId.value === drumId;
}

function finishOpeningGuide() {
  if (!isGuiding.value) return;
  if (openingGuideFallbackTimer) {
    clearTimeout(openingGuideFallbackTimer);
    openingGuideFallbackTimer = null;
  }
  isGuiding.value = false;
  isSpeaking.value = false;
  if (currentRound.value === 0 && !hasAnswered.value && !isComplete.value) {
    if (initialWordTimer) clearTimeout(initialWordTimer);
    initialWordTimer = setTimeout(() => {
      initialWordTimer = null;
      sayWord();
    }, 160);
  }
}

function playOpeningGuide() {
  if (!canStartAudio()) {
    openingGuidePending.value = true;
    isGuiding.value = false;
    isSpeaking.value = false;
    return;
  }
  openingGuidePending.value = false;
  isGuiding.value = true;
  isSpeaking.value = true;
  if (speechTimer) {
    clearTimeout(speechTimer);
    speechTimer = null;
  }
  if (!openingGuideAudio) {
    openingGuideAudio = uni.createInnerAudioContext();
    openingGuideAudio.obeyMuteSwitch = false;
    openingGuideAudio.onEnded(finishOpeningGuide);
    openingGuideAudio.onError(finishOpeningGuide);
  }
  openingGuideAudio.stop();
  openingGuideAudio.src = openingGuideAudioUrl;
  openingGuideAudio.play();
  // Some runtimes do not dispatch ended/error for an autoplay-blocked guide clip.
  openingGuideFallbackTimer = setTimeout(finishOpeningGuide, 4300);
}

function canStartAudio() {
  if (typeof navigator === 'undefined') return true;
  const navigatorWithActivation = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  return navigatorWithActivation.userActivation?.hasBeenActive ?? true;
}

function sayWord() {
  if (isComplete.value) return;
  const round = rounds[currentRound.value];
  isSpeaking.value = true;
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    isSpeaking.value = false;
    speechTimer = null;
  }, 1800);

  if (!wordAudio) {
    wordAudio = uni.createInnerAudioContext();
    wordAudio.obeyMuteSwitch = false;
    wordAudio.onEnded(finishSpeaking);
    wordAudio.onError(() => {
      speakWithSystemVoice(rounds[currentRound.value].word);
    });
  }
  wordAudio.stop();
  wordAudio.src = wordAudioUrls[round.word];
  wordAudio.play();
}

function finishSpeaking() {
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    isSpeaking.value = false;
    speechTimer = null;
  }, 150);
}

function speakWithSystemVoice(word: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.72;
  utterance.pitch = 1.06;
  utterance.onend = finishSpeaking;
  utterance.onerror = () => {
    isSpeaking.value = false;
  };
  window.speechSynthesis.speak(utterance);
}

function clearFeedback() {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
  feedback.value = null;
  wrongDrumId.value = null;
}

function ensureBackgroundMusic() {
  if (backgroundMusicAudio) return backgroundMusicAudio;
  backgroundMusicAudio = uni.createInnerAudioContext();
  backgroundMusicAudio.obeyMuteSwitch = false;
  backgroundMusicAudio.loop = true;
  backgroundMusicAudio.volume = 0.16;
  backgroundMusicAudio.src = backgroundMusicUrl;
  backgroundMusicAudio.onPlay(() => {
    isMusicPlaying.value = true;
  });
  backgroundMusicAudio.onPause(() => {
    isMusicPlaying.value = false;
  });
  backgroundMusicAudio.onStop(() => {
    isMusicPlaying.value = false;
  });
  backgroundMusicAudio.onError(() => {
    isMusicPlaying.value = false;
  });
  return backgroundMusicAudio;
}

function playBackgroundMusic() {
  if (!isMusicEnabled.value) return;
  ensureBackgroundMusic().play();
}

function resumeBackgroundMusic() {
  if (isMusicEnabled.value && !isMusicPlaying.value) playBackgroundMusic();
}

function resumePageAudio() {
  if (openingGuidePending.value) playOpeningGuide();
  resumeBackgroundMusic();
}

function positionMusicButton() {
  const uniWithMenuButton = uni as typeof uni & {
    getMenuButtonBoundingClientRect?: () => { bottom?: number };
  };
  const menuButton = uniWithMenuButton.getMenuButtonBoundingClientRect?.();
  if (!menuButton?.bottom) return;
  musicButtonStyle.value = { top: `${menuButton.bottom + 12}px` };
}

function toggleBackgroundMusic() {
  isMusicEnabled.value = !isMusicEnabled.value;
  if (isMusicEnabled.value) {
    playBackgroundMusic();
    return;
  }
  isMusicPlaying.value = false;
  backgroundMusicAudio?.pause();
}

function playEffect(effect: EffectName) {
  let audio = effectAudios[effect];
  if (!audio) {
    audio = uni.createInnerAudioContext();
    audio.obeyMuteSwitch = false;
    effectAudios[effect] = audio;
  }
  audio.stop();
  audio.src = effectAudioUrls[effect];
  audio.play();
}

function playCorrectVoice() {
  if (!correctVoiceAudio) {
    correctVoiceAudio = uni.createInnerAudioContext();
    correctVoiceAudio.obeyMuteSwitch = false;
  }
  correctVoiceAudio.stop();
  correctVoiceAudio.src = correctVoiceAudioUrl;
  correctVoiceAudio.play();
}

function tapDrum(drum: Drum) {
  if (isLocked.value || isComplete.value) return;
  playEffect('drum');
  if (drum.word === rounds[currentRound.value].word) {
    const isLastRound = currentRound.value === rounds.length - 1;
    hasAnswered.value = true;
    hitDrumId.value = drum.id;
    feedback.value = 'correct';
    updateProgress((currentRound.value + 1) * 20, isLastRound);
    setTimeout(() => playEffect('correct'), 90);
    if (correctVoiceTimer) clearTimeout(correctVoiceTimer);
    correctVoiceTimer = setTimeout(() => {
      playCorrectVoice();
      correctVoiceTimer = null;
    }, 420);
    vibrate('medium');
    feedbackTimer = setTimeout(() => {
      feedback.value = null;
      feedbackTimer = null;
      if (isLastRound) {
        elapsedSeconds.value = Math.max(1, Math.round((Date.now() - studyStartedAt.value) / 1000));
        isComplete.value = true;
      }
    }, isLastRound ? 1250 : 1650);
    return;
  }

  wrongAttempts.value += 1;
  wrongDrumId.value = drum.id;
  feedback.value = 'wrong';
  setTimeout(() => playEffect('wrong'), 70);
  feedbackTimer = setTimeout(() => {
    clearFeedback();
    sayWord();
  }, 1550);
}

function replayWord() {
  if (!isComplete.value && !isGuiding.value) sayWord();
}

function nextRound() {
  if (!hasAnswered.value || isComplete.value || feedback.value) return;
  clearFeedback();
  if (currentRound.value === rounds.length - 1) {
    isComplete.value = true;
    return;
  }
  currentRound.value += 1;
  hasAnswered.value = false;
  hitDrumId.value = null;
  buildDrums();
  setTimeout(sayWord, 280);
}

function restart() {
  isGuiding.value = false;
  openingGuidePending.value = false;
  openingGuideAudio?.stop();
  if (openingGuideTimer) clearTimeout(openingGuideTimer);
  if (openingGuideFallbackTimer) clearTimeout(openingGuideFallbackTimer);
  if (initialWordTimer) clearTimeout(initialWordTimer);
  resetProgress();
  currentRound.value = 0;
  hasAnswered.value = false;
  isComplete.value = false;
  hitDrumId.value = null;
  wrongDrumId.value = null;
  wrongAttempts.value = 0;
  elapsedSeconds.value = 0;
  studyStartedAt.value = Date.now();
  clearFeedback();
  buildDrums();
  openingGuideTimer = setTimeout(() => {
    openingGuideTimer = null;
    playOpeningGuide();
  }, 350);
}

function nextLevel() {
  uni.redirectTo({ url: '/pages/play/play?id=game-05' });
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
  nextTick(positionMusicButton);
  studyStartedAt.value = Date.now();
  buildDrums();
  playBackgroundMusic();
  clockTimer = setInterval(() => {
    if (!isComplete.value && studyStartedAt.value) {
      elapsedSeconds.value = Math.floor((Date.now() - studyStartedAt.value) / 1000);
    }
  }, 1000);
  openingGuideTimer = setTimeout(() => {
    openingGuideTimer = null;
    playOpeningGuide();
  }, 500);
});

onUnmounted(() => {
  clearFeedback();
  if (correctVoiceTimer) clearTimeout(correctVoiceTimer);
  if (openingGuideTimer) clearTimeout(openingGuideTimer);
  if (openingGuideFallbackTimer) clearTimeout(openingGuideFallbackTimer);
  if (initialWordTimer) clearTimeout(initialWordTimer);
  if (speechTimer) clearTimeout(speechTimer);
  if (clockTimer) clearInterval(clockTimer);
  openingGuidePending.value = false;
  isGuiding.value = false;
  openingGuideAudio?.destroy();
  openingGuideAudio = null;
  wordAudio?.destroy();
  wordAudio = null;
  correctVoiceAudio?.destroy();
  correctVoiceAudio = null;
  backgroundMusicAudio?.destroy();
  backgroundMusicAudio = null;
  Object.values(effectAudios).forEach((audio) => audio?.destroy());
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
});
</script>

<style scoped lang="scss">
.drum-game {
  isolation: isolate;
  background: #7fd8fa;
}

.scene-bg {
  position: absolute;
  z-index: -1;
  inset: 0;
  width: 100%;
  height: 100%;
}

.back-button {
  position: absolute;
  top: 70rpx;
  left: 48rpx;
  width: 80rpx;
  height: 76rpx;
}

.music-button {
  position: absolute;
  z-index: 10;
  top: max(150rpx, calc(env(safe-area-inset-top) + 100rpx));
  right: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 106rpx;
  height: 106rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.96);
  border-radius: 50%;
  background: #f2b532;
  box-shadow: 0 7rpx 0 #d98523, 0 9rpx 16rpx rgba(83, 115, 38, 0.18);
}

.music-disc {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: #fff;
  animation: music-spin 3.2s linear infinite;
  animation-play-state: paused;
}

.music-button.playing .music-disc { animation-play-state: running; }
.music-note { color: #f29e25; font-family: Arial, sans-serif; font-size: 50rpx; font-weight: 900; line-height: 1; transform: translate(-2rpx, -2rpx); }
.music-disc-center { position: absolute; right: 10rpx; bottom: 10rpx; width: 10rpx; height: 10rpx; border-radius: 50%; background: #39b4d6; }
.music-slash { position: absolute; width: 78rpx; height: 8rpx; border: 3rpx solid #fff; border-radius: 8rpx; background: #ee5e5e; transform: rotate(-45deg); box-shadow: 0 2rpx 0 rgba(135, 48, 48, 0.24); }
.music-button.muted { background: #9aadae; box-shadow: 0 7rpx 0 #747f80, 0 9rpx 16rpx rgba(70, 70, 70, 0.18); }

.game-title {
  position: absolute;
  top: 46rpx;
  left: 50%;
  width: 400rpx;
  height: 160rpx;
  transform: translateX(-50%);
}

.progress-wrap {
  position: absolute;
  top: 202rpx;
  left: 50%;
  width: 460rpx;
  height: 94rpx;
  transform: translateX(-50%);
}

.progress-bg,
.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 460rpx;
  height: 42rpx;
}

.progress-fill-clip {
  position: absolute;
  top: 0;
  left: 0;
  height: 42rpx;
  overflow: hidden;
  transition: width 0.35s ease;
}

.progress-knob {
  position: absolute;
  top: 9rpx;
  width: 24rpx;
  height: 24rpx;
  border: 3rpx solid #fff;
  border-radius: 50%;
  background: #f8fbff;
  box-shadow: 0 2rpx 4rpx rgba(29, 135, 201, 0.36);
  transform: translateX(-50%);
  transition: left 0.35s ease;
}

.progress-label {
  position: absolute;
  top: 49rpx;
  width: 100%;
  color: #fff;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  text-shadow: 0 2rpx 2rpx rgba(27, 123, 175, 0.25);
}

.instruction {
  position: absolute;
  top: 322rpx;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  width: 540rpx;
  min-height: 52rpx;
  padding: 4rpx 22rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.76);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.5);
  color: #217aa9;
  font-size: 25rpx;
  font-weight: 700;
  transform: translateX(-50%);
}

.instruction.is-listening {
  color: #f36f34;
}

.listening-dots {
  display: flex;
  gap: 5rpx;
  color: #ff7840;
  font-size: 14rpx;
}

.listening-dots text {
  animation: dot-bounce 0.85s ease-in-out infinite;
}

.listening-dots text:nth-child(2) { animation-delay: 0.12s; }
.listening-dots text:nth-child(3) { animation-delay: 0.24s; }

.drum-stage {
  position: absolute;
  top: 576rpx;
  left: 0;
  width: 100%;
  height: 770rpx;
}

.drum-button {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 230rpx;
  height: 194rpx;
  transition: transform 0.14s ease, filter 0.14s ease;
}

.drum-button:active { transform: scale(0.94); }
.drum-stage.locked .drum-button { pointer-events: none; }
.drum-button.is-hit { z-index: 5; animation: drum-hit 0.72s cubic-bezier(0.22, 1.1, 0.36, 1); }
.drum-button.is-wrong { z-index: 5; animation: drum-shake 0.64s ease; }
.drum-button.is-wrong .drum-image { filter: saturate(1.25) brightness(1.1); }

.drum-image {
  width: 100%;
  height: 100%;
}

.word-label {
  position: absolute;
  z-index: 4;
  left: 50%;
  font-family: Arial, sans-serif;
  font-size: 50rpx;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    -3rpx -3rpx 0 #fff,
    3rpx -3rpx 0 #fff,
    3rpx 3rpx 0 #fff,
    -3rpx 3rpx 0 #fff,
    0 5rpx 0 rgba(80, 92, 102, 0.18);
}

.word-left-top {
  top: -46rpx;
  left: 50%;
  color: #f23879;
  transform: translateX(-50%);
}

.word-center-top {
  top: -48rpx;
  left: 50%;
  color: #f3743f;
  transform: translateX(-50%);
}

.word-right-top {
  top: -46rpx;
  left: 50%;
  color: #168ae3;
  text-transform: capitalize;
  transform: translateX(-50%);
}

.word-left-bottom {
  top: -48rpx;
  left: 50%;
  color: #20c895;
  text-transform: capitalize;
  transform: translateX(-50%);
}

.word-center-bottom {
  top: -48rpx;
  color: #d926b8;
  text-transform: capitalize;
  transform: translateX(-50%);
}

.drum-left-top { top: 178rpx; left: 15rpx; }
.drum-center-top { top: 40rpx; left: 304rpx; }
.drum-right-top { top: 239rpx; right: 6rpx; }
.drum-left-bottom { top: 478rpx; left: 16rpx; }
.drum-center-bottom { top: 512rpx; right: 183rpx; }

.burst {
  position: absolute;
  z-index: 7;
  pointer-events: none;
  animation: burst-pop 0.46s 0.1s cubic-bezier(0.22, 1.15, 0.36, 1) both;
}

.impact-mark { top: 72rpx; left: 50rpx; width: 70rpx; height: 90rpx; }
.impact-rays { top: 70rpx; right: 34rpx; width: 62rpx; height: 84rpx; }

.drumstick {
  position: absolute;
  z-index: 9;
  top: 44rpx;
  left: 115rpx;
  width: 126rpx;
  height: 22rpx;
  border: 5rpx solid #b94b27;
  border-radius: 14rpx;
  background: #f6a63a;
  box-shadow: inset 0 3rpx 0 rgba(255, 222, 112, 0.75), 0 3rpx 0 rgba(126, 55, 29, 0.18);
  box-sizing: border-box;
  transform-origin: 0 50%;
  pointer-events: none;
  animation: drumstick-strike 0.48s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
}

.drumstick::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 42rpx;
  height: 42rpx;
  border: 5rpx solid #b94b27;
  border-radius: 50%;
  background: #f6a63a;
  box-shadow: inset 0 4rpx 0 rgba(255, 222, 112, 0.78);
  box-sizing: border-box;
  content: '';
  transform: translate(-50%, -50%);
}

.feedback-overlay {
  position: absolute;
  z-index: 16;
  top: 382rpx;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transform: translateX(-50%);
  pointer-events: none;
}

.feedback-card { position: relative; display: flex; align-items: center; justify-content: center; }
.feedback-card::before { position: absolute; top: 50%; left: 50%; width: 440rpx; height: 180rpx; border-radius: 50%; content: ''; filter: blur(14rpx); opacity: 0; animation: feedback-halo 0.8s ease-out both; }
.feedback-card image { position: relative; width: 394rpx; height: 268rpx; animation: feedback-pop 0.48s cubic-bezier(0.2, 1.2, 0.36, 1) both; }
.feedback-correct .feedback-card::before { background: rgba(139, 242, 76, 0.46); }
.feedback-wrong { top: 445rpx; }
.feedback-wrong .feedback-card::before { width: 480rpx; height: 110rpx; background: rgba(255, 175, 52, 0.42); }
.feedback-wrong .feedback-card image { width: 440rpx; height: 90rpx; animation-name: wrong-feedback-pop; }
.feedback-enter-active, .feedback-leave-active { transition: opacity 0.16s ease; }
.feedback-enter-from, .feedback-leave-to { opacity: 0; }

.bottom-controls {
  position: absolute;
  right: 0;
  bottom: max(60rpx, env(safe-area-inset-bottom));
  left: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 92rpx;
}

.control-button { width: 146rpx; height: 146rpx; }
.control-button image { width: 100%; height: 100%; }
.next-button.disabled { opacity: 0.48; filter: saturate(0.5); }

.complete-layer {
  position: absolute;
  z-index: 40;
  inset: 0;
  overflow: hidden;
  background: rgba(17, 39, 50, 0.66);
}

.complete-banner {
  position: absolute;
  left: 0;
  top: 18.5%;
  width: 100%;
  height: 25.25%;
}

.complete-stars {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  width: 336rpx;
  height: 100rpx;
  transform: translateX(-50%);
}

.complete-stars image {
  width: 100rpx;
  height: 100rpx;
  animation: star-pop 0.44s cubic-bezier(0.2, 1.18, 0.36, 1) both;
}

.complete-stars image:nth-child(2) { animation-delay: 90ms; }
.complete-stars image:nth-child(3) { animation-delay: 180ms; }

.complete-time {
  position: absolute;
  top: 58%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 134rpx;
  transform: translateX(-50%);
  white-space: nowrap;
}

.complete-time image {
  width: 108rpx;
  height: 134rpx;
}

.complete-time text {
  margin-left: 22rpx;
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 90rpx;
  font-weight: 900;
  line-height: 1;
  text-shadow: -4rpx -4rpx 0 #e99d00, 4rpx -4rpx 0 #e99d00, 4rpx 4rpx 0 #e99d00, -4rpx 4rpx 0 #e99d00, 0 7rpx 0 #c87700;
}

.complete-next {
  position: absolute;
  top: 79%;
  left: 50%;
  width: 296rpx;
  height: 124rpx;
  transform: translateX(-50%);
}

@keyframes dot-bounce { 0%, 100% { transform: translateY(0); opacity: 0.3; } 45% { transform: translateY(-7rpx); opacity: 1; } }
@keyframes drum-hit { 0%, 100% { transform: scale(1); } 20% { transform: scale(0.84); } 48% { transform: scale(1.2); } 70% { transform: scale(0.97); } }
@keyframes drum-shake { 0%, 100% { transform: translateX(0); } 16%, 48% { transform: translateX(-20rpx); } 32%, 64% { transform: translateX(20rpx); } 78% { transform: translateX(-8rpx); } }
@keyframes burst-pop { 0% { opacity: 0; transform: scale(0.3) rotate(-22deg); } 56% { opacity: 1; transform: scale(1.16) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes drumstick-strike {
  0% { opacity: 0; transform: translate(-36rpx, -48rpx) rotate(142deg); }
  46% { opacity: 1; transform: translate(0, 0) rotate(164deg); }
  68% { transform: translate(3rpx, 4rpx) rotate(160deg); }
  100% { opacity: 1; transform: translate(0, 0) rotate(164deg); }
}
@keyframes feedback-pop { 0% { opacity: 0; transform: scale(0.38) translateY(34rpx); } 65% { opacity: 1; transform: scale(1.12) translateY(-8rpx); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes wrong-feedback-pop { 0% { opacity: 0; transform: scale(0.52); } 56% { opacity: 1; transform: scale(1.12) rotate(-3deg); } 72% { transform: scale(0.98) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes feedback-halo { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 100% { opacity: 0.42; transform: translate(-50%, -50%) scale(1); } }
@keyframes music-spin { to { transform: rotate(360deg); } }
@keyframes star-pop { 0% { opacity: 0; transform: scale(0.35) translateY(32rpx); } 68% { opacity: 1; transform: scale(1.14) translateY(-6rpx); } 100% { opacity: 1; transform: scale(1) translateY(0); } }

@media (max-height: 1450rpx) {
  .drum-stage { top: 540rpx; transform: scale(0.88); transform-origin: top center; }
  .bottom-controls { bottom: max(28rpx, env(safe-area-inset-bottom)); }
}
</style>
