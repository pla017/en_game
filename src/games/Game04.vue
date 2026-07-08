<template>
  <ChoiceGame
    game-id="game-04"
    game-no="Game 04"
    title="拼写挑战"
    prompt-label="选择正确拼写"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '漂亮的', answer: 'beautiful', options: ['beautifull', 'beautiful', 'beutiful', 'beautyful'] },
  { prompt: '因为', answer: 'because', options: ['becouse', 'because', 'becase', 'beacuse'] },
  { prompt: '星期三', answer: 'Wednesday', options: ['Wensday', 'Wednesday', 'Wednsday', 'Wendesday'] }
];
</script>
