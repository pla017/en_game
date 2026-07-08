<template>
  <ChoiceGame
    game-id="game-11"
    game-no="Game 11"
    title="颜色听令"
    prompt-label="选择颜色英文"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '红色', answer: 'red', options: ['red', 'blue', 'green', 'yellow'] },
  { prompt: '紫色', answer: 'purple', options: ['orange', 'black', 'purple', 'white'] },
  { prompt: '灰色', answer: 'gray', options: ['brown', 'pink', 'gray', 'gold'] }
];
</script>
