<template>
  <ChoiceGame
    game-id="game-01"
    game-no="Game 01"
    title="单词快选"
    prompt-label="选择英文"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '苹果', answer: 'apple', options: ['apple', 'orange', 'banana', 'grape'] },
  { prompt: '书包', answer: 'bag', options: ['book', 'bag', 'pen', 'desk'] },
  { prompt: '快乐的', answer: 'happy', options: ['sad', 'happy', 'small', 'fast'] }
];
</script>
