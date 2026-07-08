<template>
  <ChoiceGame
    game-id="game-15"
    game-no="Game 15"
    title="场景问答"
    prompt-label="选择回答"
    :rounds="rounds"
  />
</template>

<script setup lang="ts">
import ChoiceGame from '@/components/ChoiceGame.vue';

const rounds = [
  { prompt: '别人说 Thank you.', answer: "You're welcome.", options: ['Good night.', "You're welcome.", 'I am ten.', 'See you.'] },
  { prompt: '别人问 How are you?', answer: "I'm fine.", options: ["I'm fine.", 'It is red.', 'At school.', 'On Monday.'] },
  { prompt: '别人问 Where is the library?', answer: 'It is near the park.', options: ['I like books.', 'It is near the park.', 'She is a teacher.', 'It is blue.'] }
];
</script>
