<template>
  <ChoiceGame
    game-id="game-20"
    game-no="Game 20"
    title="阅读闯关"
    prompt-label="阅读后作答"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: 'Tom has a dog. It is black. What color is the dog?', answer: 'black', options: ['white', 'black', 'brown', 'yellow'] },
  { prompt: 'Lily goes to school by bike. How does Lily go to school?', answer: 'by bike', options: ['by bus', 'by bike', 'on foot', 'by car'] },
  { prompt: 'There are five apples on the table. How many apples are there?', answer: 'five', options: ['three', 'four', 'five', 'six'] }
];
</script>
