<template>
  <ChoiceGame
    game-id="game-16"
    game-no="Game 16"
    title="同义词连线"
    prompt-label="选择同义词"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'smart', answer: 'clever', options: ['clever', 'heavy', 'empty', 'noisy'] },
  { prompt: 'glad', answer: 'happy', options: ['angry', 'happy', 'early', 'young'] },
  { prompt: 'easy', answer: 'simple', options: ['simple', 'difficult', 'busy', 'bright'] }
];
</script>
