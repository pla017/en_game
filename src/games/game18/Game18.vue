<template>
  <ChoiceGame
    game-id="game-18"
    game-no="Game 18"
    title="时态训练"
    prompt-label="选择正确时态"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'yesterday', answer: 'I played tennis yesterday.', options: ['I play tennis yesterday.', 'I played tennis yesterday.', 'I playing tennis yesterday.', 'I plays tennis yesterday.'] },
  { prompt: 'now', answer: 'She is reading now.', options: ['She reads now.', 'She read now.', 'She is reading now.', 'She reading now.'] },
  { prompt: 'tomorrow', answer: 'We will visit the museum tomorrow.', options: ['We visited the museum tomorrow.', 'We will visit the museum tomorrow.', 'We visits the museum tomorrow.', 'We visiting the museum tomorrow.'] }
];
</script>
