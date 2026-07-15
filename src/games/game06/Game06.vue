<template>
  <ChoiceGame
    game-id="game-06"
    game-no="Game 06"
    title="单词消消乐"
    prompt-label="选择相同含义"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'big', answer: 'large', options: ['small', 'large', 'short', 'thin'] },
  { prompt: 'quick', answer: 'fast', options: ['slow', 'quiet', 'fast', 'late'] },
  { prompt: 'start', answer: 'begin', options: ['finish', 'begin', 'close', 'leave'] }
];
</script>
