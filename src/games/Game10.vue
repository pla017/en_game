<template>
  <ChoiceGame
    game-id="game-10"
    game-no="Game 10"
    title="语法侦探"
    prompt-label="选择正确表达"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '第三人称单数', answer: 'He likes music.', options: ['He like music.', 'He likes music.', 'He liking music.', 'He liked music now.'] },
  { prompt: '一般疑问句', answer: 'Do you play football?', options: ['You do play football?', 'Do you play football?', 'Play do you football?', 'You play football do?'] },
  { prompt: '可数名词复数', answer: 'three apples', options: ['three apple', 'three apples', 'three applese', 'three applees'] }
];
</script>
