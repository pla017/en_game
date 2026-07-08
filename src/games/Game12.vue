<template>
  <ChoiceGame
    game-id="game-12"
    game-no="Game 12"
    title="数字竞速"
    prompt-label="选择数字英文"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '12', answer: 'twelve', options: ['twenty', 'twelve', 'ten', 'two'] },
  { prompt: '30', answer: 'thirty', options: ['thirteen', 'three', 'thirty', 'third'] },
  { prompt: '100', answer: 'one hundred', options: ['one hundred', 'one thousand', 'ten hundred', 'hundreds'] }
];
</script>
