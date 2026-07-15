<template>
  <ChoiceGame
    game-id="game-14"
    game-no="Game 14"
    title="食物分类"
    prompt-label="选择所属分类"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'carrot', answer: 'vegetable', options: ['drink', 'fruit', 'vegetable', 'dessert'] },
  { prompt: 'banana', answer: 'fruit', options: ['fruit', 'meat', 'drink', 'grain'] },
  { prompt: 'milk', answer: 'drink', options: ['dessert', 'drink', 'vegetable', 'meat'] }
];
</script>
