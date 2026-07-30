<template>
  <view class="mole-game mini-game-screen" :class="{ paused: !isPlaying }">
    <image class="scene-background" :src="backgroundUrl" mode="scaleToFill" />
    <image class="grass grass-left" :src="grassUrl" mode="aspectFit" />

    <view class="top-bar">
      <image class="back-button" :src="returnUrl" mode="aspectFit" @tap="goBack" />
      <text class="game-title">地鼠大闯关</text>
      <view class="top-actions" :style="topActionsStyle">
        <view class="sound-button" :class="{ muted: !soundOn }" @tap="toggleSound">
          <image :src="audioIconUrl" mode="aspectFit" />
          <text v-if="!soundOn" class="muted-mark">/</text>
        </view>
        <view class="pause-button" @tap="togglePause">
          <text>{{ isPlaying ? 'Ⅱ' : '▶' }}</text>
        </view>
      </view>
    </view>

    <view class="progress-wrap">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: `${progressPercent}%` }" />
        <view class="progress-knob" :style="{ left: `${progressPercent}%` }" />
      </view>
      <text class="progress-label">{{ Math.min(roundIndex + 1, rounds.length) }}/{{ rounds.length }}</text>
    </view>

    <view class="prompt-cloud" :class="{ 'prompt-chinese': promptText.length > 8 }">
      <text class="prompt-hint">{{ promptMode === 'meaning' ? '找到英文' : '找到中文' }}</text>
      <text class="prompt-word">{{ promptText }}</text>
    </view>

    <view class="mole-field" :class="[`phase-${molePhase}`, { locked: isLocked }]">
      <view
        v-for="hole in holes"
        :key="hole.id"
        class="hole-unit"
        :class="[`hole-${hole.id}`, { 'is-hit': hitHoleId === hole.id, 'is-wrong': wrongHoleId === hole.id }]"
        :style="{ left: hole.left, top: hole.top, '--mole-delay': `${hole.id * 45}ms` }"
        @tap.stop="hitMole(hole)"
      >
        <view class="speech-bubble" :class="{ compact: displayWord(hole.word).length > 9 }">
          <text>{{ displayWord(hole.word) }}</text>
        </view>
        <view v-if="hitHoleId === hole.id && feedback === 'correct'" class="hit-stars" aria-hidden="true">
          <text class="star star-a">★</text>
          <text class="star star-b">★</text>
          <text class="star star-c">★</text>
          <view class="hit-ring" />
        </view>
        <view v-if="wrongHoleId === hole.id && feedback === 'wrong'" class="wrong-mark" aria-hidden="true">×</view>
        <image class="mole" :src="moleUrl" mode="aspectFit" />
        <image class="hole" :src="holeUrl" mode="aspectFit" />
      </view>
    </view>

    <image class="robot" :src="robotUrl" mode="aspectFit" />
    <image class="hammer" :class="{ swinging: hammerSwing }" :src="hammerUrl" mode="aspectFit" />

    <view v-if="feedback" class="feedback" :class="feedback">
      <text>{{ feedback === 'correct' ? `答对了！+${lastGain}` : '再想想，继续加油' }}</text>
    </view>

    <view class="score-panel">
      <text class="score-label">得分</text>
      <text class="score-value">{{ score }}</text>
      <text class="combo" v-if="combo > 1">{{ combo }} 连击</text>
    </view>

    <view v-if="!isPlaying && !isComplete" class="pause-mask" @tap="togglePause">
      <view class="pause-card">
        <text class="pause-title">游戏暂停</text>
        <text class="pause-copy">点击继续打地鼠</text>
        <view class="resume-button">继续游戏</view>
      </view>
    </view>

    <view v-if="isComplete" class="complete-layer">
      <view class="confetti confetti-a">✦</view>
      <view class="confetti confetti-b">✦</view>
      <view class="confetti confetti-c">★</view>
      <view class="confetti confetti-d">◆</view>
      <view class="complete-card">
        <text class="complete-kicker">CHALLENGE COMPLETE</text>
        <text class="complete-title">闯关成功！</text>
        <text class="complete-score">{{ score }}<text> 分</text></text>
        <view class="stars"><text v-for="star in 3" :key="star" :class="{ muted: star > earnedStars }">★</text></view>
        <text class="complete-copy">你完成了 {{ rounds.length }} 个词汇挑战</text>
        <view class="restart-button" @tap="restart">再玩一次</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';
import backgroundUrl from './assets/game7_bg.jpg';
import grassUrl from './assets/game7_grassland01.gif';
import hammerUrl from './assets/game7_cz.png';
import audioIconUrl from './assets/game7_audio.png';
import holeUrl from './assets/未标题-3.png';
import moleUrl from './assets/未标题-4.png';
import robotUrl from './assets/未标题5-2.png';
import returnUrl from './assets/game7_return.png';
import drumHitAudioUrl from '../game04/audio/drum-hit.mp3';
import correctAudioUrl from '../game04/audio/correct.mp3';
import wrongAudioUrl from '../game04/audio/wrong.mp3';

interface Word {
  id: string;
  en: string;
  cn: string;
}

interface Hole {
  id: number;
  left: string;
  top: string;
  word: Word;
}

const words: Word[] = [
  { id: 'apple', en: 'apple', cn: '苹果' },
  { id: 'orange', en: 'orange', cn: '橙子' },
  { id: 'banana', en: 'banana', cn: '香蕉' },
  { id: 'watermelon', en: 'watermelon', cn: '西瓜' },
  { id: 'mango', en: 'mango', cn: '芒果' },
  { id: 'plum', en: 'plum', cn: '李子' }
];

const rounds = Array.from({ length: 10 }, (_, index) => ({
  target: words[index % words.length],
  mode: (index % 2 === 0 ? 'meaning' : 'word') as 'meaning' | 'word'
}));

const holePositions = [
  { left: '50%', top: '28%' },
  { left: '17%', top: '40%' },
  { left: '83%', top: '40%' },
  { left: '50%', top: '53%' },
  { left: '17%', top: '67%' },
  { left: '83%', top: '67%' }
];

const { updateProgress, resetProgress } = useGameProgress('game-07');
const roundIndex = ref(0);
const score = ref(0);
const combo = ref(0);
const isPlaying = ref(true);
const soundOn = ref(true);
const isComplete = ref(false);
const hitHoleId = ref<number | null>(null);
const wrongHoleId = ref<number | null>(null);
const feedback = ref<'correct' | 'wrong' | ''>('');
const hammerSwing = ref(false);
const lastGain = ref(0);
const molePhase = ref<'hidden' | 'rising' | 'visible' | 'hiding'>('hidden');
const topActionsStyle = ref<Record<string, string>>({});
let advanceTimer: ReturnType<typeof setTimeout> | null = null;
let phaseTimer: ReturnType<typeof setTimeout> | null = null;
type EffectName = 'drum' | 'correct' | 'wrong';
const effectAudioUrls: Record<EffectName, string> = {
  drum: drumHitAudioUrl,
  correct: correctAudioUrl,
  wrong: wrongAudioUrl
};
const effectAudios: Partial<Record<EffectName, UniApp.InnerAudioContext>> = {};

const currentRound = computed(() => rounds[roundIndex.value] || rounds[rounds.length - 1]);
const promptMode = computed(() => currentRound.value.mode);
const promptText = computed(() => promptMode.value === 'meaning' ? currentRound.value.target.cn : currentRound.value.target.en);
const progressPercent = computed(() => Math.min(100, (roundIndex.value / rounds.length) * 100));
const isLocked = computed(() => !isPlaying.value || molePhase.value !== 'visible' || Boolean(feedback.value) || isComplete.value);
const earnedStars = computed(() => score.value >= 90 ? 3 : score.value >= 60 ? 2 : 1);

const holes = computed<Hole[]>(() => {
  const offset = (roundIndex.value * 2 + 1) % words.length;
  const shuffled = words.map((_, index) => words[(index * 5 + offset) % words.length]);
  return holePositions.map((position, index) => ({ ...position, id: index, word: shuffled[index] }));
});

function displayWord(word: Word) {
  return promptMode.value === 'meaning' ? word.en : word.cn;
}

function hitMole(hole: Hole) {
  if (isLocked.value) return;

  playEffect('drum');
  hammerSwing.value = true;
  if (hole.word.id === currentRound.value.target.id) {
    hitHoleId.value = hole.id;
    combo.value += 1;
    lastGain.value = 10 + Math.min(10, (combo.value - 1) * 2);
    score.value += lastGain.value;
    feedback.value = 'correct';
    setTimeout(() => playEffect('correct'), 80);
    vibrate('medium');
    updateProgress(score.value, false);
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(hideMolesForNextRound, 620);
  } else {
    hitHoleId.value = null;
    combo.value = 0;
    lastGain.value = 0;
    wrongHoleId.value = hole.id;
    feedback.value = 'wrong';
    playEffect('wrong');
    vibrate('light');
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(clearWrongFeedback, 700);
  }
}

function clearAdvanceTimer() {
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function clearPhaseTimer() {
  if (phaseTimer) {
    clearTimeout(phaseTimer);
    phaseTimer = null;
  }
}

function clearWrongFeedback() {
  clearAdvanceTimer();
  wrongHoleId.value = null;
  feedback.value = '';
  hammerSwing.value = false;
}

function revealMoles(delay = 260) {
  clearPhaseTimer();
  molePhase.value = 'hidden';
  phaseTimer = setTimeout(() => {
    molePhase.value = 'rising';
    phaseTimer = setTimeout(() => {
      molePhase.value = 'visible';
      phaseTimer = null;
    }, 620);
  }, delay);
}

function hideMolesForNextRound() {
  clearAdvanceTimer();
  molePhase.value = 'hiding';
  phaseTimer = setTimeout(advanceRound, 360);
}

function advanceRound() {
  clearPhaseTimer();
  if (roundIndex.value >= rounds.length - 1) {
    isComplete.value = true;
    isPlaying.value = false;
    feedback.value = '';
    updateProgress(score.value, true);
    return;
  }
  roundIndex.value += 1;
  hitHoleId.value = null;
  wrongHoleId.value = null;
  feedback.value = '';
  hammerSwing.value = false;
  revealMoles(180);
}

function togglePause() {
  if (isComplete.value) return;
  isPlaying.value = !isPlaying.value;
}

function toggleSound() {
  soundOn.value = !soundOn.value;
  if (!soundOn.value) {
    Object.values(effectAudios).forEach((audio) => audio?.stop());
  }
}

function playEffect(effect: EffectName) {
  if (!soundOn.value) return;
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

function vibrate(type: 'light' | 'medium') {
  const uniApi = uni as typeof uni & {
    vibrateShort?: (options?: { type?: 'light' | 'medium' }) => void;
  };
  void uniApi.vibrateShort?.({ type });
}

function restart() {
  clearAdvanceTimer();
  clearPhaseTimer();
  resetProgress();
  roundIndex.value = 0;
  score.value = 0;
  combo.value = 0;
  isComplete.value = false;
  isPlaying.value = true;
  feedback.value = '';
  hitHoleId.value = null;
  wrongHoleId.value = null;
  hammerSwing.value = false;
  revealMoles(450);
}

function goBack() {
  uni.navigateBack();
}

function positionTopActions() {
  const uniWithMenuButton = uni as typeof uni & {
    getMenuButtonBoundingClientRect?: () => { bottom?: number };
  };
  const menuButton = uniWithMenuButton.getMenuButtonBoundingClientRect?.();
  if (!menuButton?.bottom) return;

  const { windowHeight } = uni.getSystemInfoSync();
  const topBarTop = windowHeight * 0.048;
  topActionsStyle.value = { top: `${Math.max(0, menuButton.bottom + 8 - topBarTop)}px` };
}

onMounted(() => {
  positionTopActions();
  revealMoles(520);
});

onUnmounted(() => {
  clearAdvanceTimer();
  clearPhaseTimer();
  Object.values(effectAudios).forEach((audio) => audio?.destroy());
});
</script>

<style scoped lang="scss">
.mole-game {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #b7ed7a;
  color: #4b260d;
  user-select: none;
}

.scene-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.top-bar {
  position: absolute;
  z-index: 10;
  top: 4.8%;
  left: 5.2%;
  right: 5.2%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-button,
.pause-button,
.sound-button {
  width: 52rpx;
  height: 52rpx;
  flex: 0 0 52rpx;
}

.back-button {
  filter: drop-shadow(0 2rpx 2rpx rgba(41, 88, 34, .2));
}

.pause-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #f7ad1b;
  border-radius: 50%;
  background: #ffc52b;
  box-shadow: 0 3rpx 0 #e19b16;
  color: #fff;
  font-size: 27rpx;
  font-weight: 800;
}

.top-actions {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sound-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, .9);
  border-radius: 50%;
  background: rgba(255, 255, 255, .78);
  box-shadow: 0 3rpx 0 rgba(51, 111, 38, .22);
}

.sound-button image {
  width: 39rpx;
  height: 39rpx;
}

.sound-button.muted {
  opacity: .62;
}

.muted-mark {
  position: absolute;
  top: 5rpx;
  right: 8rpx;
  color: #a45e24;
  font-size: 35rpx;
  font-weight: 900;
  line-height: 1;
  transform: rotate(-35deg);
}

.game-title {
  position: absolute;
  left: 50%;
  color: #fff;
  font-size: clamp(28px, 7vw, 48px);
  font-weight: 900;
  letter-spacing: 2rpx;
  line-height: 1;
  text-shadow: 0 3rpx 0 #3c7928, 2rpx 0 #3c7928, -2rpx 0 #3c7928;
  transform: translateX(-50%);
  white-space: nowrap;
}

.progress-wrap {
  position: absolute;
  z-index: 8;
  top: 13.1%;
  left: 18.2%;
  width: 63.6%;
}

.progress-track {
  position: relative;
  height: 24rpx;
  overflow: visible;
  border: 5rpx solid #fff;
  border-radius: 30rpx;
  background: rgba(28, 117, 36, .72);
  box-shadow: 0 2rpx 0 rgba(75, 120, 44, .2);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #f6ca35;
  transition: width .3s ease;
}

.progress-knob {
  position: absolute;
  top: 50%;
  width: 29rpx;
  height: 29rpx;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: #f8d74a;
  box-shadow: 0 1rpx 2rpx rgba(56, 99, 33, .4);
  transform: translate(-50%, -50%);
  transition: left .3s ease;
}

.progress-label {
  display: block;
  margin-top: 12rpx;
  color: #c27613;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1;
  text-align: center;
}

.prompt-cloud {
  position: absolute;
  z-index: 7;
  top: 73.2%;
  left: 50%;
  width: min(190px, 42vw);
  min-height: 62rpx;
  padding: 11rpx 18rpx 14rpx;
  border: 3rpx solid #efad00;
  border-radius: 45% 55% 48% 52%;
  background: #ffd11f;
  box-shadow: 0 3rpx 0 rgba(184, 120, 0, .25);
  text-align: center;
  transform: translateX(-50%) rotate(-2deg);
}

.prompt-cloud::after {
  position: absolute;
  right: 17%;
  bottom: -17rpx;
  width: 21rpx;
  height: 21rpx;
  border-right: 3rpx solid #efad00;
  border-bottom: 3rpx solid #efad00;
  background: #ffd11f;
  content: '';
  transform: rotate(35deg);
}

.prompt-hint {
  display: block;
  color: #a7630d;
  font-size: 20rpx;
  font-weight: 700;
}

.prompt-word {
  display: block;
  margin-top: 2rpx;
  color: #633211;
  font-size: clamp(20px, 6vw, 38px);
  font-weight: 800;
  line-height: 1.05;
}

.prompt-chinese .prompt-word {
  font-size: clamp(26px, 7vw, 42px);
}

.mole-field {
  position: absolute;
  z-index: 5;
  inset: 0;
}

.mole-field.locked .hole-unit {
  pointer-events: none;
}

.hole-unit {
  position: absolute;
  width: 42%;
  height: 10.2%;
  transform: translate(-50%, -50%);
}

.hole {
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: 50%;
  width: 100%;
  height: 100%;
  transform: translateX(-50%);
}

.mole {
  position: absolute;
  z-index: 2;
  bottom: 3%;
  left: 50%;
  width: 57%;
  height: 88%;
  opacity: 0;
  transform: translateX(-50%) translateY(72%) scale(.9);
  transform-origin: 50% 100%;
  transition: transform .38s cubic-bezier(.22, .92, .32, 1.18), opacity .2s ease;
}

.speech-bubble {
  position: absolute;
  z-index: 4;
  top: -50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132%;
  min-height: 44rpx;
  padding: 7rpx 10rpx 12rpx;
  border: 2rpx solid #789a08;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 4rpx rgba(81, 103, 23, .18);
  color: #6b3212;
  font-size: clamp(13px, 3.5vw, 24px);
  font-weight: 800;
  line-height: 1;
  text-align: center;
  opacity: 0;
  transform: translateX(-50%) translateY(14rpx) scale(.86);
  transition: transform .26s ease, opacity .2s ease;
}

.speech-bubble::after {
  position: absolute;
  bottom: -9rpx;
  left: 42%;
  width: 13rpx;
  height: 13rpx;
  border-right: 2rpx solid #789a08;
  border-bottom: 2rpx solid #789a08;
  background: #fff;
  content: '';
  transform: rotate(45deg);
}

.speech-bubble.compact {
  font-size: clamp(9px, 2.5vw, 17px);
}

.hole-unit.is-hit .mole {
  transform: translateX(-50%) translateY(12%) scale(.88) rotate(-8deg);
}

.mole-field.phase-rising .mole,
.mole-field.phase-visible .mole {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.mole-field.phase-rising .mole {
  transition-delay: var(--mole-delay);
}

.mole-field.phase-rising .speech-bubble,
.mole-field.phase-visible .speech-bubble {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.mole-field.phase-rising .speech-bubble {
  transition-delay: calc(var(--mole-delay) + 160ms);
}

.mole-field.phase-visible .hole-unit.is-hit .mole {
  transform: translateX(-50%) translateY(12%) scale(.88) rotate(-8deg);
}

.mole-field.phase-hiding .hole-unit .mole,
.mole-field.phase-hidden .hole-unit .mole {
  opacity: 0;
  transform: translateX(-50%) translateY(72%) scale(.9);
  transition-delay: 0ms;
}

.mole-field.phase-hiding .hole-unit .speech-bubble,
.mole-field.phase-hidden .hole-unit .speech-bubble {
  opacity: 0;
  transform: translateX(-50%) translateY(14rpx) scale(.86);
  transition-delay: 0ms;
}

.hit-stars,
.wrong-mark {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}

.hit-ring {
  position: absolute;
  top: 14%;
  left: 50%;
  width: 62%;
  height: 68%;
  border: 5rpx solid rgba(255, 214, 52, .86);
  border-radius: 50%;
  transform: translate(-50%, -12%);
  animation: ring-pop .46s ease-out forwards;
}

.star {
  position: absolute;
  color: #ffd138;
  font-size: clamp(18px, 5vw, 28px);
  line-height: 1;
  text-shadow: 0 2rpx 0 #ba7515;
  animation: star-pop .52s ease-out forwards;
}

.star-a { top: 3%; left: 5%; }
.star-b { top: -6%; right: 7%; animation-delay: .06s; }
.star-c { top: 32%; right: -6%; animation-delay: .12s; }

.wrong-mark {
  top: -14%;
  left: 50%;
  color: #ef6a3c;
  font-size: clamp(42px, 12vw, 68px);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: 0 3rpx 0 #fff;
  transform: translateX(-50%);
  animation: wrong-pop .35s ease-out forwards;
}

.hole-unit.is-wrong .mole {
  animation: shake .32s ease;
}

.robot {
  position: absolute;
  z-index: 4;
  right: 2%;
  bottom: 2.6%;
  width: 26%;
  max-width: 155px;
  height: 21.2%;
}

.hammer {
  position: absolute;
  z-index: 6;
  left: 42%;
  bottom: 6.4%;
  width: 25%;
  max-width: 145px;
  height: 10%;
  transform-origin: 78% 17%;
}

.hammer.swinging {
  animation: hammer-hit .38s ease;
}

.grass {
  position: absolute;
  z-index: 4;
  bottom: -2%;
  left: -3%;
  width: 28%;
  max-width: 165px;
  height: 13%;
}

.score-panel {
  position: absolute;
  z-index: 10;
  top: 18.1%;
  right: 5%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #935313;
}

.score-label { font-size: 19rpx; font-weight: 700; }
.score-value { font-size: 30rpx; font-weight: 900; line-height: 1.05; }
.combo { margin-top: 2rpx; color: #ed7611; font-size: 18rpx; font-weight: 800; }

.feedback {
  position: absolute;
  z-index: 12;
  top: 23%;
  left: 50%;
  padding: 10rpx 25rpx;
  border-radius: 30rpx;
  color: #fff;
  font-size: 27rpx;
  font-weight: 800;
  transform: translateX(-50%);
  animation: feedback-in .25s ease;
}

.feedback.correct { background: #27a643; }
.feedback.wrong { background: #e4831c; }

.pause-mask,
.complete-layer {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  background: rgba(35, 79, 38, .32);
}

.confetti {
  position: absolute;
  color: #ffd13b;
  font-size: 54rpx;
  font-weight: 900;
  text-shadow: 0 3rpx 0 rgba(132, 81, 14, .2);
  animation: confetti-float 1.2s ease-in-out infinite alternate;
}

.confetti-a { top: 19%; left: 13%; color: #f47d43; }
.confetti-b { top: 26%; right: 12%; color: #69b85a; animation-delay: .22s; }
.confetti-c { bottom: 22%; left: 20%; color: #ffc52b; animation-delay: .4s; }
.confetti-d { bottom: 18%; right: 19%; color: #ec8860; animation-delay: .58s; }

.pause-card,
.complete-card {
  width: min(82vw, 450px);
  padding: 45rpx 30rpx 34rpx;
  border: 4rpx solid #e8a31e;
  border-radius: 24rpx;
  background: #fffce9;
  box-shadow: 0 12rpx 25rpx rgba(63, 78, 28, .22);
  text-align: center;
}

.pause-title,
.complete-title { display: block; color: #6a3718; font-size: 44rpx; font-weight: 900; }
.pause-copy,
.complete-copy { display: block; margin-top: 14rpx; color: #967448; font-size: 26rpx; }
.resume-button,
.restart-button {
  margin: 30rpx auto 0;
  width: 72%;
  padding: 19rpx;
  border-radius: 40rpx;
  background: #f6ae1b;
  color: #fff;
  font-size: 29rpx;
  font-weight: 800;
}

.complete-kicker { display: block; color: #9f9a72; font-size: 18rpx; letter-spacing: 2rpx; }
.complete-title { margin-top: 12rpx; }
.complete-score { display: block; margin-top: 16rpx; color: #ea7b13; font-size: 62rpx; font-weight: 900; line-height: 1; }
.complete-score text { font-size: 24rpx; }
.stars { margin-top: 18rpx; color: #f8b927; font-size: 38rpx; letter-spacing: 5rpx; }
.stars .muted { color: #d6d1b9; }

@keyframes hammer-hit {
  0% { transform: rotate(0); }
  45% { transform: rotate(-28deg) translate(-6%, -7%); }
  100% { transform: rotate(0); }
}

@keyframes ring-pop {
  0% { opacity: .9; transform: translate(-50%, -12%) scale(.45); }
  100% { opacity: 0; transform: translate(-50%, -12%) scale(1.18); }
}

@keyframes star-pop {
  0% { opacity: 0; transform: translate(0, 15rpx) scale(.2) rotate(-15deg); }
  45% { opacity: 1; }
  100% { opacity: 0; transform: translate(-10rpx, -28rpx) scale(1.05) rotate(15deg); }
}

@keyframes wrong-pop {
  0% { opacity: 0; transform: translateX(-50%) scale(.4); }
  45% { opacity: 1; transform: translateX(-50%) scale(1.15); }
  100% { opacity: 0; transform: translateX(-50%) scale(1); }
}

@keyframes confetti-float {
  from { transform: translateY(0) rotate(-8deg) scale(.92); }
  to { transform: translateY(-16rpx) rotate(12deg) scale(1.06); }
}

@keyframes shake {
  0%, 100% { transform: translateX(-50%); }
  25% { transform: translateX(-56%); }
  75% { transform: translateX(-44%); }
}

@keyframes feedback-in {
  from { opacity: 0; transform: translate(-50%, -15%); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
