<template>
  <ChoiceGame
    game-id="game-19"
    game-no="Game 19"
    title="短语补全"
    prompt-label="选择缺失部分"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'look ___ the blackboard', answer: 'at', options: ['at', 'on', 'in', 'for'] },
  { prompt: 'take care ___ yourself', answer: 'of', options: ['to', 'of', 'with', 'by'] },
  { prompt: 'be good ___ English', answer: 'at', options: ['in', 'for', 'with', 'at'] }
];
</script>
