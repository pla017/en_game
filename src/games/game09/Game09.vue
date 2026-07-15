<template>
  <ChoiceGame
    game-id="game-09"
    game-no="Game 09"
    title="单词接龙"
    prompt-label="选择可接龙单词"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'apple 的尾字母是 e', answer: 'egg', options: ['book', 'egg', 'cat', 'dog'] },
  { prompt: 'train 的尾字母是 n', answer: 'nose', options: ['nose', 'fish', 'tree', 'apple'] },
  { prompt: 'desk 的尾字母是 k', answer: 'kite', options: ['star', 'moon', 'kite', 'lamp'] }
];
</script>
