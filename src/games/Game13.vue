<template>
  <ChoiceGame
    game-id="game-13"
    game-no="Game 13"
    title="动物记忆"
    prompt-label="选择动物英文"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '长颈鹿', answer: 'giraffe', options: ['giraffe', 'tiger', 'rabbit', 'monkey'] },
  { prompt: '大象', answer: 'elephant', options: ['lion', 'elephant', 'zebra', 'horse'] },
  { prompt: '企鹅', answer: 'penguin', options: ['panda', 'penguin', 'parrot', 'puppy'] }
];
</script>
