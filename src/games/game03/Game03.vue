<template>
  <view class="game03 mini-game-screen">
    <view class="game-stage" @touchstart="resumeInitialGuide" @mousedown="resumeInitialGuide">
      <image class="scene-bg" :src="bgUrl" mode="aspectFill" />

      <image class="return-button tap-image" :src="returnUrl" mode="aspectFit" @tap="goBack" />

      <view
        class="music-button tap-image"
        :class="{ playing: isMusicPlaying, muted: !isMusicEnabled }"
        :aria-label="isMusicEnabled ? '关闭背景音乐' : '开启背景音乐'"
        @tap.stop="toggleBackgroundMusic"
      >
        <image class="music-icon" :src="musicIconUrl" mode="aspectFit" />
        <view v-if="!isMusicEnabled" class="music-slash" />
      </view>

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

      <view class="robot">
        <image :key="currentWord.word" :src="speakingRobotUrl" mode="aspectFit" />
        <view v-if="isRobotSpeaking" class="robot-sound-waves" aria-hidden="true">
          <view v-for="wave in 3" :key="wave" class="robot-sound-wave" :class="`wave-${wave}`" />
        </view>
      </view>
      <view :key="bubbleVersion" class="speech-bubble" :class="{ 'bubble-speaking': isRobotSpeaking }">
        <image :src="bubbleUrl" mode="aspectFit" />
        <text class="bubble-copy">{{ bubbleText }}</text>
      </view>

      <view v-if="isPreparing" class="countdown-layer">
        <view class="countdown-card">
          <text :key="countdown" class="countdown-number">{{ countdown }}</text>
          <text class="countdown-copy">准备录音</text>
        </view>
      </view>

      <view class="controls">
        <view class="control-button play-button tap-image" @tap="playOriginal">
          <image :src="playBgUrl" mode="aspectFit" />
          <image class="control-icon" :src="playIconUrl" mode="aspectFit" />
        </view>

        <view
          class="control-button record-button tap-image"
          :class="{ recording: isRecording, preparing: isPreparing }"
          @tap.stop="toggleRecording"
        >
          <image :src="recordBgUrl" mode="aspectFit" />
          <image class="control-icon" :src="recordIconUrl" mode="aspectFit" />
          <view v-if="isRecording" class="recording-wash" />
          <view v-if="isRecording" class="recording-ring" />
          <view v-if="isRecording" class="recording-state-label recording-label">录音中 · {{ recordingSecondsLeft }} 秒</view>
          <view v-if="isFinalizingRecording" class="recording-state-label saving-label">保存中...</view>
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
        <view class="complete-dialog">
          <image class="complete-main" :src="completeMainUrl" mode="aspectFit" />
          <view class="complete-stars" aria-label="获得五星">
            <image
              v-for="(star, index) in completeStars"
              :key="index"
              :class="`complete-star-${index}`"
              :src="star"
              mode="aspectFit"
            />
          </view>
          <text class="complete-time">共用 {{ completionTime }}</text>
        </view>
        <view class="complete-next tap-image" @tap="goToNextGame">下一关</view>
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
import speakingRobotUrl from './assets/speak.gif';
import completeMainUrl from './assets/game3_tc_main.png';
import completeStarBigUrl from './assets/game3_star_big.png';
import completeStarMiddleUrl from './assets/game3_star_middle.png';
import completeStarSmallUrl from './assets/game3_star_small.png';
import progressBgUrl from './assets/progress_bar_bg.png';
import progressFillUrl from './assets/progress_bar_ing.png';
import progressPointUrl from './assets/progress_bar_point.png';
import returnUrl from './assets/game3_return.png';
import musicIconUrl from '../game04/assets/game4_music.png';
import backgroundMusicUrl from './audio/background-music.mp3';
import beeAudioUrl from './audio/bee.mp3';
import cloudAudioUrl from './audio/cloud.mp3';
import flowerAudioUrl from './audio/flower.mp3';
import openingGuideAudioUrl from './audio/opening-guide.mp3';
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
const isPreparing = ref(false);
const countdown = ref(3);
const isRecording = ref(false);
const recordingSecondsLeft = ref(15);
const isRobotSpeaking = ref(false);
const isGuiding = ref(false);
const isMusicEnabled = ref(true);
const isMusicPlaying = ref(false);
const isFinalizingRecording = ref(false);
const canRecord = ref(false);
const hasPassed = ref(false);
const bubbleText = ref('');
const bubbleVersion = ref(0);
const isComplete = ref(false);
const elapsedSeconds = ref(0);
const recordingsByWord = ref<Record<string, string[]>>({});
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
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let recordingCountdownTimer: ReturnType<typeof setInterval> | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let openingGuideFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let recordingStartedAt = 0;
let recordingWord = '';
let pendingFileCapture: Promise<void> = Promise.resolve();
let wordAudio: UniApp.InnerAudioContext | null = null;
let openingGuideAudio: UniApp.InnerAudioContext | null = null;
let backgroundMusic: UniApp.InnerAudioContext | null = null;
let practiceFinalized = false;
let speechMatched = false;
let studyStartedAt = 0;
let openingGuidePending = false;

const currentWord = computed(() => words[currentIndex.value]);
const progressPercent = computed(() => ((currentIndex.value + 1) / words.length) * 100);
const completionTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0');
  return `${Number(minutes)}分${seconds}秒`;
});
const completeStars = [
  completeStarSmallUrl,
  completeStarMiddleUrl,
  completeStarBigUrl,
  completeStarMiddleUrl,
  completeStarSmallUrl
];

let previewPlayCount = 0;
let isPreviewing = false;
let previewFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let bubbleTypewriterTimer: ReturnType<typeof setInterval> | null = null;

function setBubbleText(message: string, typewrite = isRobotSpeaking.value) {
  if (bubbleTypewriterTimer) {
    clearInterval(bubbleTypewriterTimer);
    bubbleTypewriterTimer = null;
  }
  bubbleVersion.value += 1;
  if (!typewrite || !message) {
    bubbleText.value = message;
    return;
  }

  const characters = Array.from(message);
  let characterIndex = 0;
  bubbleText.value = '';
  bubbleTypewriterTimer = setInterval(() => {
    bubbleText.value += characters[characterIndex] || '';
    characterIndex += 1;
    if (characterIndex >= characters.length) {
      clearInterval(bubbleTypewriterTimer!);
      bubbleTypewriterTimer = null;
    }
  }, 55);
}

function setBackgroundMusicVolume(volume: number) {
  if (backgroundMusic) backgroundMusic.volume = volume;
}

function ensureBackgroundMusic() {
  if (backgroundMusic) return backgroundMusic;
  backgroundMusic = uni.createInnerAudioContext();
  backgroundMusic.obeyMuteSwitch = false;
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.12;
  backgroundMusic.src = backgroundMusicUrl;
  backgroundMusic.onPlay(() => {
    isMusicPlaying.value = true;
  });
  backgroundMusic.onPause(() => {
    isMusicPlaying.value = false;
  });
  backgroundMusic.onStop(() => {
    isMusicPlaying.value = false;
  });
  backgroundMusic.onError(() => {
    isMusicPlaying.value = false;
  });
  return backgroundMusic;
}

function playBackgroundMusic() {
  if (!isMusicEnabled.value) return;
  const music = ensureBackgroundMusic();
  isMusicPlaying.value = true;
  music.play();
}

function toggleBackgroundMusic() {
  isMusicEnabled.value = !isMusicEnabled.value;
  if (isMusicEnabled.value) {
    playBackgroundMusic();
    return;
  }
  isMusicPlaying.value = false;
  backgroundMusic?.pause();
}

function finishOpeningGuide() {
  if (!isGuiding.value) return;
  isGuiding.value = false;
  isRobotSpeaking.value = false;
  if (openingGuideFallbackTimer) {
    clearTimeout(openingGuideFallbackTimer);
    openingGuideFallbackTimer = null;
  }
  if (isComplete.value) {
    setBackgroundMusicVolume(0.12);
    return;
  }
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    previewTimer = null;
    startWordPreview();
  }, 160);
}

function stopOpeningGuide() {
  if (openingGuideFallbackTimer) {
    clearTimeout(openingGuideFallbackTimer);
    openingGuideFallbackTimer = null;
  }
  isGuiding.value = false;
  openingGuideAudio?.stop();
}

function canStartAudio() {
  if (typeof navigator === 'undefined') return true;
  const navigatorWithActivation = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  return navigatorWithActivation.userActivation?.hasBeenActive ?? true;
}

function deferOpeningGuide() {
  openingGuidePending = true;
  canRecord.value = false;
  isGuiding.value = false;
  isRobotSpeaking.value = false;
  setBubbleText('点击页面，收听操作提示。');
}

function resumeInitialGuide() {
  if (!openingGuidePending) return;
  playOpeningGuide();
}

function playOpeningGuide() {
  if (!canStartAudio()) {
    deferOpeningGuide();
    return;
  }
  stopOpeningGuide();
  openingGuidePending = false;
  canRecord.value = false;
  isGuiding.value = true;
  isRobotSpeaking.value = true;
  setBubbleText('先听操作提示，再自动播放第一个单词原音。');
  setBackgroundMusicVolume(0.04);
  if (!openingGuideAudio) {
    openingGuideAudio = uni.createInnerAudioContext();
    openingGuideAudio.obeyMuteSwitch = false;
    openingGuideAudio.onEnded(finishOpeningGuide);
    openingGuideAudio.onError(finishOpeningGuide);
  }
  openingGuideAudio.stop();
  openingGuideAudio.src = openingGuideAudioUrl;
  openingGuideFallbackTimer = setTimeout(finishOpeningGuide, 7000);
  openingGuideAudio.play();
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
  if (isGuiding.value || isRecording.value || isPreparing.value || isFinalizingRecording.value || isComplete.value || isPreviewing) return;
  startWordPreview();
}

function startWordPreview() {
  previewPlayCount = 0;
  isPreviewing = true;
  canRecord.value = false;
  isRobotSpeaking.value = false;
  setBackgroundMusicVolume(0.04);
  setBubbleText('正在播放原音，请认真听哦。', true);
  if (previewFallbackTimer) clearTimeout(previewFallbackTimer);
  previewFallbackTimer = setTimeout(() => {
    if (isPreviewing) finishWordPreview();
  }, 5000);
  playWordAudio(currentWord.value.audioUrl);
}

function finishWordPreview() {
  isPreviewing = false;
  isRobotSpeaking.value = false;
  canRecord.value = true;
  setBackgroundMusicVolume(0.12);
  if (previewFallbackTimer) {
    clearTimeout(previewFallbackTimer);
    previewFallbackTimer = null;
  }
  if (hasPassed.value) {
    setBubbleText('音频播放完成，可以重新录音，系统只保留最近两次。');
  } else if (practiceCount.value > 0) {
    setBubbleText('音频播放完成，可以开始第 2 次跟读。');
  } else {
    setBubbleText('单词音频听完啦，请点击录音按钮跟读。');
  }
}

function playWordAudio(audioUrl: string) {
  if (!wordAudio) {
    wordAudio = uni.createInnerAudioContext();
    wordAudio.obeyMuteSwitch = false;
    wordAudio.onEnded(() => {
      isRobotSpeaking.value = false;
      if (isPreviewing) {
        previewPlayCount += 1;
        if (previewPlayCount < 2) {
          setBubbleText('再听一次，记住这个单词哦。');
          setTimeout(() => playWordAudio(currentWord.value.audioUrl), 140);
        } else {
          finishWordPreview();
        }
      } else if (!isRecording.value) {
        setBubbleText('原音播放完成，请点击录音按钮跟读两次！');
      }
    });
    wordAudio.onError(() => {
      isPreviewing = false;
      isRobotSpeaking.value = false;
      setBackgroundMusicVolume(0.12);
      if (previewFallbackTimer) {
        clearTimeout(previewFallbackTimer);
        previewFallbackTimer = null;
      }
      canRecord.value = true;
      setBubbleText('音频播放失败，可以点击录音按钮继续练习。');
      speak(currentWord.value.word);
    });
  }
  wordAudio.stop();
  wordAudio.src = audioUrl;
  isRobotSpeaking.value = true;
  wordAudio.play();
}

function speak(value: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  isRobotSpeaking.value = true;
  const utterance = new SpeechSynthesisUtterance(value.toLowerCase());
  utterance.lang = 'en-US';
  utterance.rate = 0.72;
  utterance.onend = () => { isRobotSpeaking.value = false; };
  utterance.onerror = () => { isRobotSpeaking.value = false; };
  window.speechSynthesis.speak(utterance);
}

function beginRecording() {
  if (isGuiding.value) {
    setBubbleText('请先听完操作提示和两遍单词原音。');
    return;
  }
  if (isRecording.value || isPreparing.value || isFinalizingRecording.value || isComplete.value) return;
  if (isPreviewing || !canRecord.value) {
    setBubbleText('请先完整听两遍单词，再开始录音。');
    return;
  }
  isPreparing.value = true;
  countdown.value = 3;
  setBubbleText('准备开始，3 秒后进入录音。');
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      isPreparing.value = false;
      startRecordingNow();
    } else {
      setBubbleText(`准备录音，还剩 ${countdown.value} 秒。`);
    }
  }, 1000);
}

function startRecordingNow() {
  isRecording.value = true;
  isFinalizingRecording.value = false;
  canRecord.value = false;
  practiceFinalized = false;
  awaitingRecorderStop = false;
  speechMatched = false;
  recordingStartedAt = Date.now();
  recordingSecondsLeft.value = 15;
  recordingWord = currentWord.value.word;
  pendingFileCapture = Promise.resolve();
  setBackgroundMusicVolume(0.02);
  setBubbleText('正在录音，点击红色按钮结束。');
  startSpeechRecognition();
  startMediaRecording();
  startRecordingCountdown();
  if (maxRecordTimer) clearTimeout(maxRecordTimer);
  maxRecordTimer = setTimeout(() => finishRecording(true), 15000);
}

function startRecordingCountdown() {
  if (recordingCountdownTimer) clearInterval(recordingCountdownTimer);
  recordingCountdownTimer = setInterval(() => {
    const elapsed = Date.now() - recordingStartedAt;
    recordingSecondsLeft.value = Math.max(0, Math.ceil((15000 - elapsed) / 1000));
  }, 250);
}

function stopRecordingCountdown() {
  if (recordingCountdownTimer) clearInterval(recordingCountdownTimer);
  recordingCountdownTimer = null;
  recordingSecondsLeft.value = 15;
}

function finishRecording(autoStop = false) {
  if (isPreparing.value) {
    cancelRecordingPreparation();
    return;
  }
  if ((!isRecording.value && !awaitingRecorderStop) || isFinalizingRecording.value) return;
  isFinalizingRecording.value = true;
  isRecording.value = false;
  setBackgroundMusicVolume(0.12);
  stopRecordingCountdown();
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
  fallbackTimer = setTimeout(() => {
    void pendingFileCapture.finally(() => completePractice());
  }, Math.max(280, 650 - elapsed));
}

function cancelRecordingPreparation() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
  isPreparing.value = false;
  countdown.value = 3;
  setBackgroundMusicVolume(0.12);
  setBubbleText('已取消录音，准备好后再点击录音按钮。');
}

function toggleRecording() {
  if (isPreparing.value) {
    cancelRecordingPreparation();
    return;
  }
  if (isRecording.value) finishRecording();
  else if (!isFinalizingRecording.value) beginRecording();
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
      setBubbleText('读对啦，再点击一次录音按钮结束本次跟读！');
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
          pendingFileCapture = result?.tempFilePath
            ? captureRecordingFile(result.tempFilePath, recordingWord)
            : Promise.resolve();
          void pendingFileCapture.finally(() => completePractice());
        });
        recorderManager.onError(() => {
          awaitingRecorderStop = false;
          usingUniRecorder = false;
          isRecording.value = false;
          isFinalizingRecording.value = false;
          setBackgroundMusicVolume(0.12);
          stopRecordingCountdown();
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
        pendingFileCapture = captureRecordingFile(URL.createObjectURL(blob), recordingWord);
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

function captureRecordingFile(path: string, word: string): Promise<void> {
  if (!path || !word) return Promise.resolve();
  if (!path.startsWith('blob:')) {
    return new Promise((resolve) => {
      try {
        uni.saveFile({
          tempFilePath: path,
          success: ({ savedFilePath }) => {
            persistRecordingPath(savedFilePath || path, word);
            resolve();
          },
          fail: () => {
            persistRecordingPath(path, word);
            resolve();
          }
        });
      } catch {
        persistRecordingPath(path, word);
        resolve();
      }
    });
  }
  persistRecordingPath(path, word);
  return Promise.resolve();
}

function persistRecordingPath(path: string, word: string) {
  const latest = [...(recordingsByWord.value[word] || []).filter((item) => item !== path), path].slice(-2);
  recordingsByWord.value = { ...recordingsByWord.value, [word]: latest };
  uni.setStorageSync('game03-recordings', JSON.stringify(recordingsByWord.value));
}

function submitLatestRecordings(word: string) {
  const recordUploadUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_RECORD_UPLOAD_URL;
  const recordings = recordingsByWord.value[word] || [];
  if (!recordUploadUrl || typeof uni.uploadFile !== 'function') return;
  recordings.forEach((path, index) => {
    if (path.startsWith('blob:')) return;
    uni.uploadFile({
      url: recordUploadUrl,
      filePath: path,
      name: 'file',
      fileType: 'audio',
      formData: { gameId: 'game-03', word, attempt: String(index + 1), total: String(recordings.length) },
      fail: () => setBubbleText('录音已保存到本地，后台上传稍后重试。')
    });
  });
}

function completePractice() {
  if (practiceFinalized || isComplete.value) return;
  practiceFinalized = true;
  isRecording.value = false;
  isFinalizingRecording.value = false;

  if (hasPassed.value) {
    setBubbleText('新的录音已保存，系统只保留最近两次。');
    return;
  }

  practiceCount.value += 1;
  if (practiceCount.value < 2) {
    setBubbleText(speechMatched
      ? '读对啦，第 1 次跟读完成。请点击播放，完整听两遍后再录一次。'
      : '第 1 次跟读完成。请点击播放，完整听两遍后再录一次。');
    return;
  }

  hasPassed.value = true;
  completedWords.value = Math.min(words.length, completedWords.value + 1);
  updateProgress(Math.round((completedWords.value / words.length) * 100), completedWords.value === words.length);
  if (completedWords.value === words.length) {
    submitLatestRecordings(currentWord.value.word);
    finishChallenge();
  } else {
    setBubbleText('两次跟读完成。可重新听两遍后补录，或点击右侧箭头继续。');
  }
}

function finishChallenge() {
  if (isComplete.value) return;
  elapsedSeconds.value = Math.max(1, Math.round((Date.now() - studyStartedAt) / 1000));
  isComplete.value = true;
}

function nextWord() {
  if (!hasPassed.value || isComplete.value) return;
  submitLatestRecordings(currentWord.value.word);
  if (currentIndex.value >= words.length - 1) {
    finishChallenge();
    return;
  }
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  currentIndex.value += 1;
  practiceCount.value = 0;
  hasPassed.value = false;
  isRecording.value = false;
  isFinalizingRecording.value = false;
  canRecord.value = false;
  speechMatched = false;
  startWordPreview();
}

function restart() {
  stopOpeningGuide();
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  if (maxRecordTimer) clearTimeout(maxRecordTimer);
  maxRecordTimer = null;
  stopRecordingCountdown();
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
  isPreparing.value = false;
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
  countdown.value = 3;
  hasPassed.value = false;
  isRecording.value = false;
  isFinalizingRecording.value = false;
  canRecord.value = false;
  isComplete.value = false;
  elapsedSeconds.value = 0;
  recordingsByWord.value = {};
  uni.setStorageSync('game03-recordings', JSON.stringify({}));
  studyStartedAt = Date.now();
  playOpeningGuide();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function goBack() {
  uni.navigateBack();
}

function goToNextGame() {
  uni.redirectTo({ url: '/pages/play/play?id=game-04' });
}

onMounted(() => {
  studyStartedAt = Date.now();
  playBackgroundMusic();
  clockTimer = setInterval(() => {
    if (!isComplete.value && studyStartedAt) {
      elapsedSeconds.value = Math.floor((Date.now() - studyStartedAt) / 1000);
    }
  }, 1000);
  previewTimer = setTimeout(() => {
    previewTimer = null;
    playOpeningGuide();
  }, 220);
});

onUnmounted(() => {
  stopOpeningGuide();
  stopSpeechRecognition();
  stopMediaRecording();
  if (fallbackTimer) clearTimeout(fallbackTimer);
  if (maxRecordTimer) clearTimeout(maxRecordTimer);
  stopRecordingCountdown();
  if (countdownTimer) clearInterval(countdownTimer);
  if (previewTimer) clearTimeout(previewTimer);
  if (openingGuideFallbackTimer) clearTimeout(openingGuideFallbackTimer);
  if (previewFallbackTimer) clearTimeout(previewFallbackTimer);
  if (bubbleTypewriterTimer) clearInterval(bubbleTypewriterTimer);
  if (clockTimer) clearInterval(clockTimer);
  wordAudio?.destroy();
  wordAudio = null;
  openingGuideAudio?.destroy();
  openingGuideAudio = null;
  backgroundMusic?.destroy();
  backgroundMusic = null;
  isMusicPlaying.value = false;
  isRobotSpeaking.value = false;
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
.music-button {
  position: absolute;
  z-index: 40;
  top: 21.2%;
  right: 8.8%;
  width: 82rpx;
  height: 80rpx;
}
.music-icon { width: 100%; height: 100%; }
.music-button.playing .music-icon { animation: music-pulse 1.8s ease-in-out infinite; }
.music-slash { position: absolute; top: 36rpx; left: 2rpx; width: 78rpx; height: 8rpx; border: 3rpx solid #fff; border-radius: 8rpx; background: #ee5e5e; transform: rotate(-45deg); box-shadow: 0 2rpx 0 rgba(135, 48, 48, 0.24); }
.music-button.muted .music-icon { filter: grayscale(0.8); }
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
.robot > image { width: 100%; height: 100%; }
.robot-sound-waves { position: absolute; z-index: 2; top: 35%; right: 93%; display: flex; height: 46rpx; align-items: center; gap: 5rpx; transform: rotate(-8deg); }
.robot-sound-wave { width: 7rpx; border: 4rpx solid #239ce3; border-top-color: transparent; border-bottom-color: transparent; border-radius: 50%; opacity: 0.35; animation: sound-wave 0.8s ease-out infinite; }
.wave-1 { height: 12rpx; animation-delay: 0s; }
.wave-2 { height: 25rpx; animation-delay: 0.14s; }
.wave-3 { height: 40rpx; animation-delay: 0.28s; }
.speech-bubble { position: absolute; z-index: 6; top: 54.2%; left: 18.5%; width: 356rpx; height: 212rpx; }
.speech-bubble.bubble-speaking { animation: bubble-talk 0.72s ease-in-out infinite alternate; transform-origin: 80% 100%; }
.speech-bubble image { position: absolute; inset: 0; width: 100%; height: 100%; }
.bubble-copy { position: absolute; top: 54rpx; left: 32rpx; width: 280rpx; color: #1687d1; font-size: 30rpx; font-weight: 700; line-height: 1.35; text-align: center; }

.countdown-layer { position: absolute; z-index: 20; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(35, 147, 208, 0.18); pointer-events: none; }
.countdown-card { display: flex; width: 310rpx; height: 310rpx; flex-direction: column; align-items: center; justify-content: center; border: 8rpx solid rgba(255, 255, 255, 0.94); border-radius: 50%; background: rgba(58, 165, 221, 0.88); box-shadow: 0 12rpx 0 rgba(26, 113, 177, 0.24), 0 0 0 18rpx rgba(255, 255, 255, 0.26); }
.countdown-number { display: block; color: #fff; font-size: 174rpx; font-weight: 900; line-height: 0.9; text-shadow: 0 8rpx 0 #197eba; animation: center-countdown 0.8s cubic-bezier(0.22, 1.2, 0.38, 1) both; }
.countdown-copy { display: block; margin-top: 18rpx; color: #eaf9ff; font-size: 32rpx; font-weight: 800; }

.controls { position: absolute; z-index: 8; top: 80.2%; left: 5.3%; display: flex; width: 89.4%; justify-content: space-between; }
.control-button { position: relative; width: 160rpx; height: 160rpx; }
.control-button > image:first-child { position: absolute; inset: 0; width: 100%; height: 100%; }
.control-icon { position: absolute; inset: 3%; width: 94%; height: 94%; }
.record-button { transform: translateY(-2rpx); }
.record-button.preparing { transform: translateY(-6rpx) scale(1.03); }
.record-button.recording { transform: translateY(-8rpx) scale(1.06); filter: drop-shadow(0 8rpx 12rpx rgba(225, 57, 57, 0.34)); animation: recording-button-pulse 0.9s ease-in-out infinite alternate; }
.record-button.recording .control-icon { opacity: 0.42; }
.recording-wash { position: absolute; z-index: 2; top: 12rpx; right: 12rpx; bottom: 12rpx; left: 12rpx; border-radius: 50%; background: rgba(238, 69, 69, 0.28); animation: recording-wash 0.9s ease-in-out infinite alternate; pointer-events: none; }
.recording-ring { position: absolute; z-index: 3; top: -18rpx; right: -18rpx; bottom: -18rpx; left: -18rpx; border: 8rpx solid rgba(239, 67, 67, 0.96); border-radius: 50%; box-shadow: 0 0 0 0 rgba(239, 67, 67, 0.55); animation: record-ring 1.15s ease-out infinite; pointer-events: none; }
.recording-state-label { position: absolute; z-index: 7; top: -58rpx; left: 50%; min-width: 178rpx; height: 44rpx; padding: 0 18rpx; border: 3rpx solid #fff; border-radius: 24rpx; color: #fff; font-size: 23rpx; font-weight: 900; line-height: 38rpx; text-align: center; white-space: nowrap; transform: translateX(-50%); box-shadow: 0 5rpx 0 rgba(95, 113, 128, 0.22); pointer-events: none; }
.recording-label { background: #e84e4e; animation: status-pop 0.32s ease both, recording-label-blink 1s ease-in-out infinite alternate; }
.saving-label { background: #538fba; animation: status-pop 0.32s ease both; }
.next-button.disabled { opacity: 0.48; filter: grayscale(0.45); }

.complete-layer { position: absolute; z-index: 50; inset: 0; background: rgba(17, 37, 40, 0.68); animation: complete-fade-in 0.3s ease both; }
.complete-dialog { position: absolute; top: 14%; left: 50%; width: min(700rpx, calc(100vw - 44rpx)); aspect-ratio: 750 / 783; transform: translateX(-50%); animation: complete-pop 0.5s cubic-bezier(0.2, 1.25, 0.35, 1) both; }
.complete-main { position: absolute; inset: 0; width: 100%; height: 100%; }
.complete-stars { position: absolute; top: 60%; left: 50%; display: flex; width: 78%; align-items: center; justify-content: space-between; transform: translateX(-50%); }
.complete-stars image { width: 17%; height: auto; animation: complete-star-pop 0.42s ease both; }
.complete-star-0 { animation-delay: 0.2s !important; }.complete-star-1 { animation-delay: 0.28s !important; }.complete-star-2 { animation-delay: 0.36s !important; }.complete-star-3 { animation-delay: 0.44s !important; }.complete-star-4 { animation-delay: 0.52s !important; }
.complete-time { position: absolute; top: 75%; left: 0; width: 100%; color: #704022; font-size: 42rpx; font-weight: 800; line-height: 1; text-align: center; }
.complete-next { position: absolute; top: 78%; left: 50%; width: 320rpx; height: 104rpx; border: 6rpx solid #b8ff51; border-radius: 30rpx; background: #65d900; box-shadow: 0 9rpx 0 #2ba900, 0 12rpx 18rpx rgba(25, 92, 0, 0.3); color: #fff; font-size: 58rpx; font-weight: 900; line-height: 92rpx; text-align: center; text-shadow: 0 4rpx 0 #399200; transform: translateX(-50%); animation: complete-next-pop 0.42s 0.6s ease both; }

@keyframes center-countdown { 0% { opacity: 0; transform: scale(1.42); } 62% { opacity: 1; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
@keyframes status-pop { from { opacity: 0; transform: translate(-50%, 8rpx) scale(0.8); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
@keyframes recording-button-pulse { from { transform: translateY(-8rpx) scale(1.03); } to { transform: translateY(-8rpx) scale(1.08); } }
@keyframes recording-wash { from { opacity: 0.42; transform: scale(0.92); } to { opacity: 0.82; transform: scale(1.04); } }
@keyframes recording-label-blink { from { opacity: 0.76; } to { opacity: 1; } }
@keyframes record-ring { 0% { opacity: 0.9; transform: scale(0.92); box-shadow: 0 0 0 0 rgba(239, 67, 67, 0.46); } 70% { opacity: 0.28; transform: scale(1.08); box-shadow: 0 0 0 22rpx rgba(239, 67, 67, 0); } 100% { opacity: 0; transform: scale(1.12); box-shadow: 0 0 0 26rpx rgba(239, 67, 67, 0); } }
@keyframes sound-wave { 0% { opacity: 0.18; transform: scaleY(0.65); } 55% { opacity: 1; transform: scaleY(1); } 100% { opacity: 0.2; transform: scaleY(0.75); } }
@keyframes bubble-talk { from { transform: translateY(0) scale(1); } to { transform: translateY(-5rpx) scale(1.015); } }
@keyframes music-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes complete-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes complete-pop { from { opacity: 0; transform: translateX(-50%) scale(0.76); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
@keyframes complete-star-pop { from { opacity: 0; transform: translateY(22rpx) scale(0.35); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes complete-next-pop { from { opacity: 0; transform: translate(-50%, 24rpx) scale(0.72); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }

@media (max-height: 700px) {
  .word-panel { top: 27.5%; }
  .speech-bubble { top: 53%; }
  .robot { top: 53.3%; }
  .controls { top: 78.5%; }
}
</style>
