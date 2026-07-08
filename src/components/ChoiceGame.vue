<template>
  <view class="choice-game">
    <view class="game-head">
      <view>
        <text class="eyebrow">{{ gameNo }}</text>
        <text class="title">{{ title }}</text>
      </view>
      <view class="score-box">
        <text class="score">{{ score }}</text>
        <text class="score-label">得分</text>
      </view>
    </view>

    <view class="prompt-panel">
      <text class="prompt-label">{{ promptLabel }}</text>
      <text class="prompt">{{ prompt }}</text>
    </view>

    <view class="option-grid">
      <button
        v-for="option in options"
        :key="option"
        class="option-button"
        :class="{
          correct: answered && option === answer,
          wrong: answered && selected === option && option !== answer
        }"
        :disabled="answered"
        @tap="choose(option)"
      >
        {{ option }}
      </button>
    </view>

    <view class="result-row" v-if="answered">
      <text class="result" :class="{ success: selected === answer }">
        {{ selected === answer ? '回答正确' : `正确答案：${answer}` }}
      </text>
    </view>

    <view class="actions">
      <button class="secondary-button" @tap="reset">重玩</button>
      <button class="primary-button" :disabled="!answered" @tap="nextRound">下一题</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameProgress } from '@/composables/progress';

interface Round {
  prompt: string;
  answer: string;
  options: string[];
}

const props = defineProps<{
  gameId: string;
  gameNo: string;
  title: string;
  promptLabel: string;
  rounds: Round[];
}>();

const { updateProgress, resetProgress } = useGameProgress(props.gameId);

const roundIndex = ref(0);
const score = ref(0);
const selected = ref('');
const answered = ref(false);

const currentRound = computed(() => props.rounds[roundIndex.value % props.rounds.length]);
const prompt = computed(() => currentRound.value.prompt);
const answer = computed(() => currentRound.value.answer);
const options = computed(() => currentRound.value.options);

function choose(option: string) {
  if (answered.value) return;

  selected.value = option;
  answered.value = true;

  if (option === answer.value) {
    score.value += 10;
  }

  updateProgress(score.value, score.value >= props.rounds.length * 10);
}

function nextRound() {
  roundIndex.value += 1;
  selected.value = '';
  answered.value = false;
}

function reset() {
  roundIndex.value = 0;
  score.value = 0;
  selected.value = '';
  answered.value = false;
  resetProgress();
}
</script>

<style scoped lang="scss">
.choice-game {
  min-height: calc(100vh - 64rpx);
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.game-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.eyebrow {
  display: block;
  margin-bottom: 8rpx;
  color: #6c7890;
  font-size: 24rpx;
}

.title {
  display: block;
  color: #182033;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.2;
}

.score-box {
  width: 132rpx;
  height: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: #172554;
  color: #fff;
}

.score {
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  margin-top: 8rpx;
  color: #dbeafe;
  font-size: 22rpx;
}

.prompt-panel {
  padding: 36rpx;
  border-radius: 8rpx;
  background: #fff;
  border: 2rpx solid #e3e9f4;
}

.prompt-label {
  display: block;
  margin-bottom: 16rpx;
  color: #5b6980;
  font-size: 26rpx;
}

.prompt {
  display: block;
  color: #111827;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.35;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.option-button {
  min-height: 116rpx;
  padding: 0 20rpx;
  border: 2rpx solid #c9d4e5;
  border-radius: 8rpx;
  background: #fff;
  color: #1d293f;
  font-size: 30rpx;
  line-height: 1.25;
}

.option-button.correct {
  border-color: #16a34a;
  background: #dcfce7;
  color: #166534;
}

.option-button.wrong {
  border-color: #dc2626;
  background: #fee2e2;
  color: #991b1b;
}

.result-row {
  min-height: 52rpx;
}

.result {
  color: #991b1b;
  font-size: 28rpx;
}

.result.success {
  color: #166534;
}

.actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
</style>
