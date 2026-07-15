<template>
  <ChoiceGame
    game-id="game-05"
    game-no="Game 05"
    title="图片找词"
    prompt-label="根据场景选择"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '画面：一只红色水果', answer: 'apple', options: ['apple', 'table', 'water', 'chair'] },
  { prompt: '画面：一辆公共汽车', answer: 'bus', options: ['bike', 'train', 'bus', 'ship'] },
  { prompt: '画面：正在下雨', answer: 'rainy', options: ['sunny', 'rainy', 'cloudy', 'windy'] }
];
</script>
