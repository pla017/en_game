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

      <image class="robot" :class="{ 'robot-listening': isRecording }" :src="robotUrl" mode="aspectFit" />
      <view :key="bubbleVersion" class="speech-bubble bubble-pop">
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
          @touchend.stop.prevent="finishRecording()"
          @touchcancel.stop.prevent="finishRecording()"
          @tap.stop="toggleRecording"
        >
          <image :src="recordBgUrl" mode="aspectFit" />
          <image class="control-icon" :src="recordIconUrl" mode="aspectFit" />
          <view v-if="hasPassed" class="pass-glow" />
        </view>

        <view
          class="control-button next-button tap-image"
          :class="{ disabled: !hasPassed || isComplete }"
          @tap="nextWord"
        >
          <image :src="nextBgUrl" mode="aspectFit" />
          <image class="control-icon" :src="nextIconUrl" mode="aspectFit" />
        </view>
      </view>

      <view v-if="isComplete" class="complete-layer">
        <view class="complete-panel">
          <text class="complete-title">跟读挑战完成！</text>
          <view class="complete-line">
            <text>本局用时</text>
            <text class="complete-value">{{ formattedTime }}</text>
          </view>
          <view class="complete-line">
            <text>星级评分</text>
            <view class="complete-stars">
              <text v-for="star in 3" :key="star" :class="{ muted: star > earnedStars }">★</text>
            </view>
          </view>
          <view class="complete-restart" @tap="restart">再玩一次</view>
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
import robotUrl from './assets/game3_rabot.gif';
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

const currentIndex = ref(0);
const completedWords = ref(0);
const practiceCount = ref(0);
const isRecording = ref(false);
const hasPassed = ref(false);
const bubbleText = ref('单词音频听完啦，长按录音按钮跟读试试吧！');
const bubbleVersion = ref(0);
const isComplete = ref(false);
const elapsedSeconds = ref(0);
const recordedFilePaths = ref<string[]>([]);
const { updateProgress } = useGameProgress('game-03');

let recognition: SpeechRecognitionLike | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordStream: MediaStream | null = null;
let recorderManager: UniApp.RecorderManager | null = null;
let usingUniRecorder = false;
let awaitingRecorderStop = false;
let recordingChunks: Blob[] = [];
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
let maxRecordTimer: ReturnType<typeof setTimeout> | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let recordingStartedAt = 0;
let lastTouchEndAt = 0;
let wordAudio: UniApp.InnerAudioContext | null = null;
let practiceFinalized = false;
let speechMatched = false;
let studyStartedAt = 0;

const currentWord = computed(() => words[currentIndex.value]);
const progressPercent = computed(() => ((currentIndex.value + 1) / words.length) * 100);
const formattedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});
const earnedStars = computed(() => (completedWords.value === words.length ? 3 : 2));

let previewPlayCount = 0;
let isPreviewing = false;
let previewFallbackTimer: ReturnType<typeof setTimeout> | null = null;

function setBubbleText(message: string) {
  bubbleText.value = message;
  bubbleVersion.value += 1;
}

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
  if (isRecording.value || isComplete.value || isPreviewing) return;
  startWordPreview();
}

function startWordPreview() {
  previewPlayCount = 0;
  isPreviewing = true;
  setBubbleText('正在播放原音，请认真听哦。');
  if (previewFallbackTimer) clearTimeout(previewFallbackTimer);
  previewFallbackTimer = setTimeout(() => {
    if (isPreviewing) finishWordPreview();
  }, 5000);
  playWordAudio(currentWord.value.audioUrl);
}

function finishWordPreview() {
  isPreviewing = false;
  if (previewFallbackTimer) {
    clearTimeout(previewFallbackTimer);
    previewFallbackTimer = null;
  }
  setBubbleText('单词音频听完啦，请按住录音按钮跟读两次！');
}

function playWordAudio(audioUrl: string) {
  if (!wordAudio) {
    wordAudio = uni.createInnerAudioContext();
    wordAudio.obeyMuteSwitch = false;
    wordAudio.onEnded(() => {
      if (isPreviewing) {
        previewPlayCount += 1;
        if (previewPlayCount < 2) {
          setBubbleText('再听一次，记住这个单词哦。');
          setTimeout(() => playWordAudio(currentWord.value.audioUrl), 140);
        } else {
          finishWordPreview();
        }
      } else if (!isRecording.value) {
        setBubbleText('原音播放完成，请按住录音按钮跟读两次！');
      }
    });
    wordAudio.onError(() => {
      isPreviewing = false;
      if (previewFallbackTimer) {
        clearTimeout(previewFallbackTimer);
        previewFallbackTimer = null;
      }
      setBubbleText('音频播放失败，请再点一次试试。');
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
  if (isRecording.value || hasPassed.value || isComplete.value || isPreviewing) return;
  isRecording.value = true;
  practiceFinalized = false;
  awaitingRecorderStop = false;
  speechMatched = false;
  recordingStartedAt = Date.now();
  setBubbleText('正在听你读，松开按钮提交，最长 15 秒。');
  startSpeechRecognition();
  startMediaRecording();
  if (maxRecordTimer) clearTimeout(maxRecordTimer);
  maxRecordTimer = setTimeout(() => finishRecording(true), 15000);
}

function finishRecording(autoStop = false) {
  if (!isRecording.value && !awaitingRecorderStop) return;
  lastTouchEndAt = Date.now();
  isRecording.value = false;
  stopSpeechRecognition();
  if (maxRecordTimer) {
    clearTimeout(maxRecordTimer);
    maxRecordTimer = null;
  }

  if (usingUniRecorder && recorderManager) {
    awaitingRecorderStop = true;
    try {
      recorderManager.stop();
    } catch {
      awaitingRecorderStop = false;
      usingUniRecorder = false;
      completePractice();
    }
    setBubbleText(autoStop ? '录音已达到 15 秒，正在保存。' : '录音完成，正在保存。');
    return;
  }

  stopMediaRecording();

  const elapsed = Date.now() - recordingStartedAt;
  fallbackTimer = setTimeout(() => completePractice(), Math.max(280, 650 - elapsed));
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
    if (spoken.includes(normalize(currentWord.value.word))) {
      speechMatched = true;
      setBubbleText('读对啦，松开按钮完成这次跟读！');
    }
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
  const uniApi = uni as typeof uni & {
    getRecorderManager?: () => UniApp.RecorderManager;
  };
  if (typeof uniApi.getRecorderManager === 'function') {
    try {
      if (!recorderManager) {
        recorderManager = uniApi.getRecorderManager();
        recorderManager.onStop((result: { tempFilePath?: string }) => {
          awaitingRecorderStop = false;
          usingUniRecorder = false;
          if (result?.tempFilePath) captureRecordingFile(result.tempFilePath);
          completePractice();
        });
        recorderManager.onError(() => {
          awaitingRecorderStop = false;
          usingUniRecorder = false;
          isRecording.value = false;
          setBubbleText('录音没有成功，请检查麦克风权限后再试。');
        });
      }
      usingUniRecorder = true;
      recorderManager.start({
        duration: 15000,
        sampleRate: 44100,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3'
      });
      return;
    } catch {
      usingUniRecorder = false;
    }
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    if (!isRecording.value) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    recordStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    recordingChunks = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) recordingChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      if (recordingChunks.length) {
        const blob = new Blob(recordingChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
        captureRecordingFile(URL.createObjectURL(blob));
      }
      recordingChunks = [];
    };
    mediaRecorder.start();
  }).catch(() => {
    // SpeechRecognition can still work without exposing a MediaRecorder stream.
  });
}

function stopMediaRecording() {
  const recorder = mediaRecorder;
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  recordStream?.getTracks().forEach((track) => track.stop());
  mediaRecorder = null;
  recordStream = null;
}

function captureRecordingFile(path: string) {
  if (!path) return;
  if (!path.startsWith('blob:')) {
    try {
      uni.saveFile({
        tempFilePath: path,
        success: ({ savedFilePath }) => persistRecordingPath(savedFilePath || path),
        fail: () => persistRecordingPath(path)
      });
      return;
    } catch {
      // Keep the temporary path when persistent storage is unavailable.
    }
  }
  persistRecordingPath(path);
}

function persistRecordingPath(path: string) {
  if (recordedFilePaths.value.includes(path)) return;
  recordedFilePaths.value = [...recordedFilePaths.value, path];
  uni.setStorageSync('game03-recordings', JSON.stringify(recordedFilePaths.value));
  // Configure VITE_RECORD_UPLOAD_URL when a server endpoint is available.
  const recordUploadUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_RECORD_UPLOAD_URL;
  if (recordUploadUrl && !path.startsWith('blob:') && typeof uni.uploadFile === 'function') {
    uni.uploadFile({
      url: recordUploadUrl,
      filePath: path,
      name: 'file',
      fileType: 'audio',
      formData: { gameId: 'game-03', word: currentWord.value.word },
      fail: () => setBubbleText('录音已保存到本地，后台上传稍后重试。')
    });
  }
}

function completePractice() {
  if (practiceFinalized || isComplete.value) return;
  practiceFinalized = true;
  const nextPracticeCount = Math.min(2, practiceCount.value + 1);
  practiceCount.value = nextPracticeCount;
  isRecording.value = false;

  if (nextPracticeCount < 2) {
    setBubbleText(speechMatched
      ? '读对啦，第 1 次跟读完成，再读 1 次就可以进入下一个单词！'
      : '第 1 次跟读完成，再读 1 次就可以进入下一个单词！');
    return;
  }

  hasPassed.value = true;
  completedWords.value = Math.min(words.length, completedWords.value + 1);
  updateProgress(Math.round((completedWords.value / words.length) * 100), completedWords.value === words.length);
  if (completedWords.value === words.length) {
    elapsedSeconds.value = Math.max(1, Math.round((Date.now() - studyStartedAt) / 1000));
    setBubbleText('全部单词跟读完成，太棒啦！');
    setTimeout(() => { isComplete.value = true; }, 520);
  } else {
    setBubbleText('两次跟读都完成啦，点击右侧箭头继续！');
  }
}

function nextWord() {
  if (!hasPassed.value || isComplete.value || currentIndex.value >= words.length - 1) return;
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  currentIndex.value += 1;
  practiceCount.value = 0;
  hasPassed.value = false;
  isRecording.value = false;
  speechMatched = false;
  startWordPreview();
}

function restart() {
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  if (maxRecordTimer) clearTimeout(maxRecordTimer);
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (previewFallbackTimer) {
    clearTimeout(previewFallbackTimer);
    previewFallbackTimer = null;
  }
  currentIndex.value = 0;
  completedWords.value = 0;
  practiceCount.value = 0;
  hasPassed.value = false;
  isRecording.value = false;
  isComplete.value = false;
  elapsedSeconds.value = 0;
  recordedFilePaths.value = [];
  uni.setStorageSync('game03-recordings', JSON.stringify([]));
  studyStartedAt = Date.now();
  startWordPreview();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function goBack() {
  uni.navigateBack();
}

onMounted(() => {
  studyStartedAt = Date.now();
  clockTimer = setInterval(() => {
    if (!isComplete.value && studyStartedAt) {
      elapsedSeconds.value = Math.floor((Date.now() - studyStartedAt) / 1000);
    }
  }, 1000);
  previewTimer = setTimeout(() => startWordPreview(), 220);
});

onUnmounted(() => {
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  if (maxRecordTimer) clearTimeout(maxRecordTimer);
  if (previewTimer) clearTimeout(previewTimer);
  if (previewFallbackTimer) clearTimeout(previewFallbackTimer);
  if (clockTimer) clearInterval(clockTimer);
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

.robot { position: absolute; z-index: 5; top: 54.5%; left: 64%; width: 216rpx; height: 318rpx; animation: robot-float 2.8s ease-in-out infinite; }
.robot.robot-listening { animation: robot-listen 0.62s ease-in-out infinite alternate; }
.speech-bubble { position: absolute; z-index: 6; top: 54.2%; left: 18.5%; width: 356rpx; height: 212rpx; }
.speech-bubble.bubble-pop { animation: bubble-pop 0.62s cubic-bezier(0.22, 1.15, 0.36, 1) both; transform-origin: 80% 100%; }
.speech-bubble image { position: absolute; inset: 0; width: 100%; height: 100%; }
.bubble-copy { position: absolute; top: 54rpx; left: 32rpx; width: 280rpx; color: #1687d1; font-size: 30rpx; font-weight: 700; line-height: 1.35; text-align: center; animation: bubble-copy-in 0.34s 0.28s ease both; }

.controls { position: absolute; z-index: 8; top: 80.2%; left: 5.3%; display: flex; width: 89.4%; justify-content: space-between; }
.control-button { position: relative; width: 160rpx; height: 160rpx; }
.control-button > image:first-child { position: absolute; inset: 0; width: 100%; height: 100%; }
.control-icon { position: absolute; inset: 3%; width: 94%; height: 94%; }
.record-button { transform: translateY(-2rpx); }
.record-button.recording { transform: translateY(-8rpx) scale(1.04); }
.next-button.disabled { opacity: 0.48; filter: grayscale(0.45); }
.pass-glow { position: absolute; top: -14rpx; right: -14rpx; bottom: -14rpx; left: -14rpx; border: 5rpx solid rgba(255, 222, 70, 0.95); border-radius: 48rpx; box-shadow: 0 0 22rpx 7rpx rgba(255, 224, 66, 0.85); animation: pass-pulse 0.9s ease-in-out infinite alternate; pointer-events: none; }

.complete-layer { position: absolute; z-index: 30; inset: 0; display: flex; align-items: center; justify-content: center; padding: 48rpx; background: rgba(29, 124, 186, 0.24); }
.complete-panel { width: min(570rpx, calc(100vw - 80rpx)); padding: 52rpx 40rpx 42rpx; border: 7rpx solid #fff; border-radius: 24rpx; background: #e5fbff; box-shadow: 0 14rpx 0 rgba(31, 128, 184, 0.24); text-align: center; }
.complete-title { display: block; margin-bottom: 30rpx; color: #1789cb; font-size: 44rpx; font-weight: 900; line-height: 1.2; }
.complete-line { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 10rpx; border-bottom: 2rpx solid rgba(53, 153, 204, 0.2); color: #3b91be; font-size: 30rpx; font-weight: 700; }
.complete-value { color: #147bb9; font-size: 38rpx; font-variant-numeric: tabular-nums; }
.complete-stars { display: flex; gap: 6rpx; color: #f3a42b; font-size: 48rpx; line-height: 1; }.complete-stars .muted { color: #b9d9df; }
.complete-restart { margin-top: 34rpx; height: 82rpx; border-radius: 41rpx; background: #38a9dd; color: #fff; font-size: 30rpx; font-weight: 800; line-height: 82rpx; box-shadow: 0 6rpx 0 #2383b5; }

@keyframes pass-pulse { from { opacity: 0.45; transform: scale(0.94); } to { opacity: 1; transform: scale(1.08); } }
@keyframes robot-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8rpx); } }
@keyframes robot-listen { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-10rpx) rotate(2deg); } }
@keyframes bubble-pop { 0% { opacity: 0; transform: scale(0.62); } 62% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
@keyframes bubble-copy-in { from { opacity: 0; transform: scale(0.72); } to { opacity: 1; transform: scale(1); } }

@media (max-height: 700px) {
  .word-panel { top: 27.5%; }
  .speech-bubble { top: 53%; }
  .robot { top: 53.3%; }
  .controls { top: 78.5%; }
}
</style>
