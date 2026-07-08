<template>
  <ChoiceGame
    game-id="game-02"
    game-no="Game 02"
    title="字母配对"
    prompt-label="选择对应小写字母"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'A', answer: 'a', options: ['a', 'e', 'i', 'o'] },
  { prompt: 'M', answer: 'm', options: ['n', 'w', 'm', 'u'] },
  { prompt: 'Q', answer: 'q', options: ['p', 'q', 'g', 'd'] }
];
</script>
