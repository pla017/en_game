<template>
  <ChoiceGame
    game-id="game-17"
    game-no="Game 17"
    title="反义词冲刺"
    prompt-label="选择反义词"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'hot', answer: 'cold', options: ['warm', 'cold', 'cool', 'dry'] },
  { prompt: 'open', answer: 'close', options: ['start', 'close', 'enter', 'show'] },
  { prompt: 'early', answer: 'late', options: ['late', 'soon', 'first', 'quick'] }
];
</script>
