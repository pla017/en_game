<template>
  <view class="game03 mini-game-screen">
    <view class="game-stage">
      <image class="scene-bg" :src="bgUrl" mode="aspectFill" />

      <image class="return-button tap-image" :src="returnUrl" mode="aspectFit" @tap="goBack" />

      <text class="game-title">跟读小能手</text>

      <view class="progress-wrap" aria-label="学习进度">
        <view class="progress-track">
          <image class="progress-bg" :src="progressBgUrl" mode="aspectFit" />
          <view class="progress-fill-clip" :style="{ width: `${progressPercent}%` }">
            <image class="progress-fill" :src="progressFillUrl" mode="scaleToFill" />
          </view>
          <image
            class="progress-point"
            :style="{ left: `${progressPercent}%` }"
            :src="progressPointUrl"
            mode="aspectFit"
          />
        </view>
        <text class="progress-count">{{ currentIndex + 1 }}/{{ words.length }}</text>
      </view>

      <view class="word-panel">
        <text class="word">{{ currentWord.word }}</text>
        <text class="phonetic">/{{ currentWord.phonetic }}/</text>
        <text class="meaning">{{ currentWord.meaning }}</text>
      </view>

      <image class="robot" :src="robotUrl" mode="aspectFit" />
      <view class="speech-bubble">
        <image :src="bubbleUrl" mode="aspectFit" />
        <text class="bubble-copy">{{ bubbleText }}</text>
      </view>

      <view class="controls">
        <view class="control-button play-button tap-image" @tap="playOriginal">
          <image :src="playBgUrl" mode="aspectFit" />
          <image class="control-icon" :src="playIconUrl" mode="aspectFit" />
        </view>

        <view
          class="control-button record-button tap-image"
          :class="{ recording: isRecording, passed: hasPassed }"
          @touchstart.stop.prevent="beginRecording"
          @touchend.stop.prevent="finishRecording"
          @touchcancel.stop.prevent="finishRecording"
          @tap.stop="toggleRecording"
        >
          <image :src="recordBgUrl" mode="aspectFit" />
          <image class="control-icon" :src="recordIconUrl" mode="aspectFit" />
          <view v-if="hasPassed" class="pass-glow" />
        </view>

        <view class="control-button next-button tap-image" @tap="nextWord">
          <image :src="nextBgUrl" mode="aspectFit" />
          <image class="control-icon" :src="nextIconUrl" mode="aspectFit" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';
import bgUrl from './assets/game3_bg.jpg';
import bubbleUrl from './assets/game3_bubble.gif';
import nextBgUrl from './assets/game3_icon_next_bg.png';
import nextIconUrl from './assets/game3_icon_next.png';
import playBgUrl from './assets/game3_icon_play_bg.png';
import playIconUrl from './assets/game3_icon_play.png';
import recordBgUrl from './assets/game3_icon_Record_bg.png';
import recordIconUrl from './assets/game3_icon_Record.png';
import robotUrl from './assets/game3_rabot.png';
import progressBgUrl from './assets/progress_bar_bg.png';
import progressFillUrl from './assets/progress_bar_ing.png';
import progressPointUrl from './assets/progress_bar_point.png';
import returnUrl from './assets/game3_return.png';
import beeAudioUrl from './audio/bee.mp3';
import cloudAudioUrl from './audio/cloud.mp3';
import flowerAudioUrl from './audio/flower.mp3';
import sunAudioUrl from './audio/sun.mp3';
import treeAudioUrl from './audio/tree.mp3';

interface WordItem {
  word: string;
  phonetic: string;
  meaning: string;
  audioUrl: string;
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const words: WordItem[] = [
  { word: 'SUN', phonetic: 'sʌn', meaning: '太阳', audioUrl: sunAudioUrl },
  { word: 'TREE', phonetic: 'triː', meaning: '树', audioUrl: treeAudioUrl },
  { word: 'CLOUD', phonetic: 'klaʊd', meaning: '白云', audioUrl: cloudAudioUrl },
  { word: 'FLOWER', phonetic: 'ˈflaʊər', meaning: '花朵', audioUrl: flowerAudioUrl },
  { word: 'BEE', phonetic: 'biː', meaning: '蜜蜂', audioUrl: beeAudioUrl }
];

// The reference artwork is the third card, so the first playable screen starts at 3/5.
const currentIndex = ref(2);
const isRecording = ref(false);
const hasPassed = ref(false);
const bubbleText = ref('单词音频听完啦，长按录音按钮跟读试试吧！');
const { updateProgress } = useGameProgress('game-03');

let recognition: SpeechRecognitionLike | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordStream: MediaStream | null = null;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
let recordingStartedAt = 0;
let lastTouchEndAt = 0;
let wordAudio: UniApp.InnerAudioContext | null = null;

const currentWord = computed(() => words[currentIndex.value]);
const progressPercent = computed(() => ((currentIndex.value + 1) / words.length) * 100);

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
}

function playOriginal() {
  if (isRecording.value) return;
  bubbleText.value = '正在播放原音，请认真听哦。';
  playWordAudio(currentWord.value.audioUrl);
}

function playWordAudio(audioUrl: string) {
  if (!wordAudio) {
    wordAudio = uni.createInnerAudioContext();
    wordAudio.obeyMuteSwitch = false;
    wordAudio.onEnded(() => {
      if (!isRecording.value) bubbleText.value = '单词音频听完啦，长按录音按钮跟读试试吧！';
    });
    wordAudio.onError(() => {
      bubbleText.value = '音频播放失败，请再点一次试试。';
      speak(currentWord.value.word);
    });
  }
  wordAudio.stop();
  wordAudio.src = audioUrl;
  wordAudio.play();
}

function speak(value: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value.toLowerCase());
  utterance.lang = 'en-US';
  utterance.rate = 0.72;
  window.speechSynthesis.speak(utterance);
}

function beginRecording() {
  if (isRecording.value || hasPassed.value) return;
  isRecording.value = true;
  recordingStartedAt = Date.now();
  bubbleText.value = '正在听你读，松开按钮提交。';
  startSpeechRecognition();
  startMediaRecording();
}

function finishRecording() {
  if (!isRecording.value) return;
  lastTouchEndAt = Date.now();
  isRecording.value = false;
  stopSpeechRecognition();
  stopMediaRecording();

  const elapsed = Date.now() - recordingStartedAt;
  // Some H5/WebView shells have no SpeechRecognition API. Keep the lesson usable there.
  if (!recognition && !hasPassed.value) {
    fallbackTimer = setTimeout(() => markPassed('录音完成，读得很棒！'), Math.max(280, 900 - elapsed));
  } else if (!hasPassed.value) {
    bubbleText.value = '再听一次，读清楚后再试试吧。';
  }
}

function toggleRecording() {
  // Tap is useful on touch environments that do not emit a complete touch sequence.
  if (Date.now() - lastTouchEndAt < 500) return;
  if (isRecording.value) finishRecording();
  else beginRecording();
}

function startSpeechRecognition() {
  recognition = getSpeechRecognition();
  if (!recognition) return;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  recognition.onresult = (event) => {
    const transcripts = Array.from(event.results).map((result) => result[0]?.transcript || '');
    const spoken = normalize(transcripts.join(' '));
    if (spoken.includes(normalize(currentWord.value.word))) markPassed('读对啦，继续保持！');
  };
  recognition.onerror = () => {
    recognition = null;
  };
  recognition.onend = () => {
    recognition = null;
  };
  try {
    recognition.start();
  } catch {
    recognition = null;
  }
}

function stopSpeechRecognition() {
  try {
    recognition?.stop();
  } catch {
    // The recognition object may already have ended in some WebViews.
  }
}

function startMediaRecording() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    if (!isRecording.value) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    recordStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
  }).catch(() => {
    // SpeechRecognition can still work without exposing a MediaRecorder stream.
  });
}

function stopMediaRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  recordStream?.getTracks().forEach((track) => track.stop());
  mediaRecorder = null;
  recordStream = null;
}

function markPassed(message: string) {
  if (hasPassed.value) return;
  hasPassed.value = true;
  isRecording.value = false;
  bubbleText.value = message;
  updateProgress(currentIndex.value + 1, currentIndex.value === words.length - 1);
}

function nextWord() {
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  currentIndex.value = (currentIndex.value + 1) % words.length;
  hasPassed.value = false;
  isRecording.value = false;
  bubbleText.value = '单词音频听完啦，长按录音按钮跟读试试吧！';
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function goBack() {
  uni.navigateBack();
}

onMounted(() => {
  // The first sound must be started by a user tap on iOS and WeChat.
});

onUnmounted(() => {
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  wordAudio?.destroy();
  wordAudio = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});
</script>

<style scoped lang="scss">
.game03 {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #d8f9f7;
  touch-action: none;
}

.game-stage {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.scene-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.return-button { position: absolute; z-index: 10; top: 4.9%; left: 6.2%; width: 120rpx; height: 120rpx; }
.game-title {
  position: absolute;
  z-index: 4;
  top: 6.1%;
  left: 29.5%;
  width: 49%;
  color: #fff;
  font-size: 52rpx;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: -2rpx -2rpx 0 #2998d9, 2rpx -2rpx 0 #2998d9, -2rpx 2rpx 0 #2998d9, 2rpx 2rpx 0 #2998d9, 0 5rpx 0 #1378c8;
}

.progress-wrap { position: absolute; z-index: 4; top: 14.2%; left: 22%; width: 61%; }
.progress-track { position: relative; width: 100%; height: 42rpx; overflow: visible; }
.progress-bg { position: absolute; inset: 0; width: 100%; height: 42rpx; }
.progress-fill-clip { position: absolute; top: 0; left: 0; height: 42rpx; overflow: hidden; transition: width 0.35s ease; }
.progress-fill { width: 460rpx; height: 42rpx; max-width: none; }
.progress-point { position: absolute; top: 0; width: 42rpx; height: 42rpx; transform: translateX(-50%); transition: left 0.35s ease; }
.progress-count { display: block; margin-top: 34rpx; color: #2d94d4; font-size: 48rpx; line-height: 1; text-align: center; }

.word-panel { position: absolute; z-index: 3; top: 28.8%; left: 7%; width: 86%; text-align: center; }
.word {
  display: block;
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 116rpx;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.92;
  -webkit-text-stroke: 6rpx #5b9ce5;
  paint-order: stroke fill;
  text-shadow: 0 7rpx 0 #b6d3f3, 0 9rpx 0 #5b9ce5;
}
.phonetic { display: block; margin-top: 28rpx; color: #fff; font-family: Arial, sans-serif; font-size: 62rpx; font-style: italic; font-weight: 800; line-height: 1; -webkit-text-stroke: 4rpx #4e8ed9; paint-order: stroke fill; }
.meaning { display: block; margin-top: 30rpx; color: #1687d1; font-size: 54rpx; font-weight: 500; line-height: 1; }

.robot { position: absolute; z-index: 5; top: 54.5%; left: 64%; width: 216rpx; height: 318rpx; }
.speech-bubble { position: absolute; z-index: 6; top: 54.2%; left: 18.5%; width: 356rpx; height: 212rpx; }
.speech-bubble image { position: absolute; inset: 0; width: 100%; height: 100%; }
.bubble-copy { position: absolute; top: 54rpx; left: 32rpx; width: 280rpx; color: #1687d1; font-size: 30rpx; font-weight: 700; line-height: 1.35; text-align: center; }

.controls { position: absolute; z-index: 8; top: 80.2%; left: 5.3%; display: flex; width: 89.4%; justify-content: space-between; }
.control-button { position: relative; width: 160rpx; height: 160rpx; }
.control-button > image:first-child { position: absolute; inset: 0; width: 100%; height: 100%; }
.control-icon { position: absolute; inset: 3%; width: 94%; height: 94%; }
.record-button { transform: translateY(-2rpx); }
.record-button.recording { transform: translateY(-8rpx) scale(1.04); }
.pass-glow { position: absolute; top: -14rpx; right: -14rpx; bottom: -14rpx; left: -14rpx; border: 5rpx solid rgba(255, 222, 70, 0.95); border-radius: 48rpx; box-shadow: 0 0 22rpx 7rpx rgba(255, 224, 66, 0.85); animation: pass-pulse 0.9s ease-in-out infinite alternate; pointer-events: none; }

@keyframes pass-pulse { from { opacity: 0.45; transform: scale(0.94); } to { opacity: 1; transform: scale(1.08); } }

@media (max-height: 700px) {
  .word-panel { top: 27.5%; }
  .speech-bubble { top: 53%; }
  .robot { top: 53.3%; }
  .controls { top: 78.5%; }
}
</style>
