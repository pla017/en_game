<template>
  <ChoiceGame
    game-id="game-07"
    game-no="Game 07"
    title="句子排序"
    prompt-label="选择正确句子"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '我喜欢英语。', answer: 'I like English.', options: ['Like I English.', 'I English like.', 'I like English.', 'English like I.'] },
  { prompt: '她会游泳。', answer: 'She can swim.', options: ['Can she swim.', 'She can swim.', 'Swim can she.', 'She swim can.'] },
  { prompt: '这是我的书。', answer: 'This is my book.', options: ['This my is book.', 'My book is this.', 'This is my book.', 'Is this my book.'] }
];
</script>
