<template>
  <ChoiceGame
    game-id="game-08"
    game-no="Game 08"
    title="快速翻译"
    prompt-label="选择翻译"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '早上好', answer: 'Good morning', options: ['Good night', 'Good morning', 'Goodbye', 'Thank you'] },
  { prompt: '多少钱？', answer: 'How much is it?', options: ['How are you?', 'What is it?', 'How much is it?', 'Where is it?'] },
  { prompt: '我不知道。', answer: "I don't know.", options: ["I don't know.", 'I am fine.', 'I like it.', 'I can see.'] }
];
</script>
