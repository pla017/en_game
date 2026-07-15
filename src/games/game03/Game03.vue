<template>
  <ChoiceGame
    game-id="game-03"
    game-no="Game 03"
    title="听音辨词"
    prompt-label="模拟听到的发音"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '/kæt/', answer: 'cat', options: ['cut', 'cat', 'coat', 'kite'] },
  { prompt: '/dɔːr/', answer: 'door', options: ['dog', 'door', 'doll', 'duck'] },
  { prompt: '/fiːʃ/', answer: 'fish', options: ['face', 'fresh', 'fish', 'finish'] }
];
</script>
