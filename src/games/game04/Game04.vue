<template>
  <view class="drum-game mini-game-screen">
    <image class="scene-bg" :src="backgroundUrl" mode="aspectFill" />

    <image class="back-button tap-image" :src="returnUrl" mode="aspectFit" @tap="goBack" />
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
          { 'is-hit': hitDrumId === drum.id, 'is-wrong': wrongDrumId === drum.id }
        ]"
        @tap="tapDrum(drum)"
      >
        <image class="drum-image" :src="drum.image" mode="aspectFit" />
        <text class="word-label" :class="`word-${drum.position}`">{{ drum.word }}</text>
        <image
          v-if="hitDrumId === drum.id"
          class="burst impact-mark"
          :src="impactMarkUrl"
          mode="aspectFit"
        />
        <image
          v-if="hitDrumId === drum.id"
          class="burst impact-rays"
          :src="impactRaysUrl"
          mode="aspectFit"
        />
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
      <view class="complete-panel">
        <text class="complete-title">击鼓认词完成！</text>
        <text class="complete-copy">你已经听出了 {{ rounds.length }} 个单词</text>
        <view class="complete-stars"><text>★ ★ ★</text></view>
        <view class="restart-button" @tap="restart">再玩一次</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
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
import drum1Url from './assets/game4_drum1.png';
import drum2Url from './assets/game4_drum2.png';
import drum3Url from './assets/game4_drum3.png';
import drum4Url from './assets/game4_drum4.png';
import drum5Url from './assets/game4_drum5.png';
import bananaAudioUrl from './audio/banana.mp3';
import correctAudioUrl from './audio/correct.mp3';
import drumHitAudioUrl from './audio/drum-hit.mp3';
import mangoAudioUrl from './audio/mango.mp3';
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
const drumImages = [drum1Url, drum2Url, drum3Url, drum4Url, drum5Url];
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
const isComplete = ref(false);
const wrongAttempts = ref(0);

let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
let speechTimer: ReturnType<typeof setTimeout> | null = null;
let wordAudio: UniApp.InnerAudioContext | null = null;
const effectAudios: Partial<Record<EffectName, UniApp.InnerAudioContext>> = {};

const progressPercent = computed(() => (currentRound.value / rounds.length) * 100);
const isLocked = computed(() => hasAnswered.value || Boolean(feedback.value));
const instruction = computed(() => {
  if (isSpeaking.value) return '认真听，找出对应的单词';
  if (hasAnswered.value) return '答对啦！点击右下角继续';
  return '听一听，点击对应单词的鼓面';
});

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[targetIndex]] = [result[targetIndex], result[index]];
  }
  return result;
}

function buildDrums() {
  const round = rounds[currentRound.value];
  const shuffledPositions = shuffle(positions);
  drums.value = round.options.map((word, index) => ({
    id: `${currentRound.value}-${word}`,
    word,
    position: shuffledPositions[index],
    image: drumImages[index]
  }));
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
    vibrate('medium');
    feedbackTimer = setTimeout(() => {
      feedback.value = null;
      feedbackTimer = null;
      if (isLastRound) isComplete.value = true;
    }, isLastRound ? 1250 : 1650);
    return;
  }

  wrongAttempts.value += 1;
  wrongDrumId.value = drum.id;
  feedback.value = 'wrong';
  setTimeout(() => playEffect('wrong'), 70);
  vibrate('light');
  feedbackTimer = setTimeout(() => {
    clearFeedback();
    sayWord();
  }, 1550);
}

function replayWord() {
  if (!isComplete.value) sayWord();
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
  resetProgress();
  currentRound.value = 0;
  hasAnswered.value = false;
  isComplete.value = false;
  hitDrumId.value = null;
  wrongDrumId.value = null;
  wrongAttempts.value = 0;
  clearFeedback();
  buildDrums();
  setTimeout(sayWord, 350);
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
  buildDrums();
  setTimeout(sayWord, 500);
});

onUnmounted(() => {
  clearFeedback();
  if (speechTimer) clearTimeout(speechTimer);
  wordAudio?.destroy();
  wordAudio = null;
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
  height: 250rpx;
  transition: transform 0.14s ease, filter 0.14s ease;
}

.drum-button:active { transform: scale(0.94); }
.drum-stage.locked .drum-button { pointer-events: none; }
.drum-button.is-hit { z-index: 5; animation: drum-hit 0.72s cubic-bezier(0.22, 1.1, 0.36, 1); }
.drum-button.is-wrong { z-index: 5; animation: drum-shake 0.64s ease; }
.drum-button.is-hit .drum-image { animation: drum-surface-hit 0.72s ease; }
.drum-button.is-wrong .drum-image { filter: saturate(1.25) brightness(1.1); }

.drum-image {
  width: 100%;
  height: 100%;
}

.word-label {
  position: absolute;
  z-index: 4;
  top: 48rpx;
  left: 50%;
  color: #fff;
  font-size: 34rpx;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.1;
  white-space: nowrap;
  text-shadow: -2rpx 0 #f04e47, 0 2rpx #f04e47, 2rpx 0 #f04e47, 0 -2rpx #f04e47, 2rpx 3rpx 0 rgba(149, 61, 47, 0.4);
  transform: translateX(-50%);
}

.drum-left-top { top: 110rpx; left: 15rpx; }
.drum-center-top { top: 20rpx; left: 260rpx; }
.drum-right-top { top: 125rpx; right: 6rpx; }
.drum-left-bottom { top: 410rpx; left: 66rpx; }
.drum-center-bottom { top: 455rpx; right: 108rpx; }

.burst {
  position: absolute;
  z-index: 7;
  pointer-events: none;
  animation: burst-pop 0.54s cubic-bezier(0.22, 1.15, 0.36, 1) both;
}

.impact-mark { top: 28rpx; left: 56rpx; width: 94rpx; height: 120rpx; }
.impact-rays { top: 58rpx; right: 18rpx; width: 86rpx; height: 116rpx; }

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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
  background: rgba(24, 110, 167, 0.28);
}

.complete-panel {
  width: 100%;
  padding: 62rpx 42rpx 46rpx;
  border: 6rpx solid #fff;
  border-radius: 26rpx;
  background: #fff9e5;
  box-shadow: 0 12rpx 0 rgba(207, 119, 55, 0.25);
  text-align: center;
}

.complete-title { display: block; color: #f06043; font-size: 46rpx; font-weight: 800; }
.complete-copy { display: block; margin-top: 22rpx; color: #4e88a9; font-size: 28rpx; }
.complete-stars { margin: 26rpx 0 34rpx; color: #ffc746; font-size: 48rpx; letter-spacing: 6rpx; }
.restart-button { width: 260rpx; height: 76rpx; margin: 0 auto; border-radius: 38rpx; background: #ff7a43; color: #fff; font-size: 30rpx; font-weight: 800; line-height: 76rpx; box-shadow: 0 6rpx 0 #d95735; }

@keyframes dot-bounce { 0%, 100% { transform: translateY(0); opacity: 0.3; } 45% { transform: translateY(-7rpx); opacity: 1; } }
@keyframes drum-hit { 0%, 100% { transform: scale(1); } 20% { transform: scale(0.84) rotate(-5deg); } 48% { transform: scale(1.2) rotate(4deg); } 70% { transform: scale(0.97) rotate(-1deg); } }
@keyframes drum-surface-hit { 0%, 100% { filter: brightness(1); } 34% { filter: brightness(1.5) saturate(1.3); } }
@keyframes drum-shake { 0%, 100% { transform: translateX(0); } 16%, 48% { transform: translateX(-20rpx) rotate(-5deg); } 32%, 64% { transform: translateX(20rpx) rotate(5deg); } 78% { transform: translateX(-8rpx); } }
@keyframes burst-pop { 0% { opacity: 0; transform: scale(0.3) rotate(-22deg); } 56% { opacity: 1; transform: scale(1.16) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes feedback-pop { 0% { opacity: 0; transform: scale(0.38) translateY(34rpx); } 65% { opacity: 1; transform: scale(1.12) translateY(-8rpx); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes wrong-feedback-pop { 0% { opacity: 0; transform: scale(0.52); } 56% { opacity: 1; transform: scale(1.12) rotate(-3deg); } 72% { transform: scale(0.98) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes feedback-halo { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 100% { opacity: 0.42; transform: translate(-50%, -50%) scale(1); } }

@media (max-height: 1450rpx) {
  .drum-stage { top: 540rpx; transform: scale(0.88); transform-origin: top center; }
  .bottom-controls { bottom: max(28rpx, env(safe-area-inset-bottom)); }
}
</style>
