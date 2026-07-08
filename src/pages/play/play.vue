<template>
  <view class="game-shell">
    <Game01 v-if="gameId === 'game-01'" />
    <Game02 v-else-if="gameId === 'game-02'" />
    <Game03 v-else-if="gameId === 'game-03'" />
    <Game04 v-else-if="gameId === 'game-04'" />
    <Game05 v-else-if="gameId === 'game-05'" />
    <Game06 v-else-if="gameId === 'game-06'" />
    <Game07 v-else-if="gameId === 'game-07'" />
    <Game08 v-else-if="gameId === 'game-08'" />
    <Game09 v-else-if="gameId === 'game-09'" />
    <Game10 v-else-if="gameId === 'game-10'" />
    <Game11 v-else-if="gameId === 'game-11'" />
    <Game12 v-else-if="gameId === 'game-12'" />
    <Game13 v-else-if="gameId === 'game-13'" />
    <Game14 v-else-if="gameId === 'game-14'" />
    <Game15 v-else-if="gameId === 'game-15'" />
    <Game16 v-else-if="gameId === 'game-16'" />
    <Game17 v-else-if="gameId === 'game-17'" />
    <Game18 v-else-if="gameId === 'game-18'" />
    <Game19 v-else-if="gameId === 'game-19'" />
    <Game20 v-else-if="gameId === 'game-20'" />

    <view v-if="!isKnownGame" class="empty">
      <text class="empty-title">游戏不存在</text>
      <button class="primary-button" @tap="goHome">返回列表</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getGameMeta } from '@/games/registry';
import Game01 from '@/games/Game01.vue';
import Game02 from '@/games/Game02.vue';
import Game03 from '@/games/Game03.vue';
import Game04 from '@/games/Game04.vue';
import Game05 from '@/games/Game05.vue';
import Game06 from '@/games/Game06.vue';
import Game07 from '@/games/Game07.vue';
import Game08 from '@/games/Game08.vue';
import Game09 from '@/games/Game09.vue';
import Game10 from '@/games/Game10.vue';
import Game11 from '@/games/Game11.vue';
import Game12 from '@/games/Game12.vue';
import Game13 from '@/games/Game13.vue';
import Game14 from '@/games/Game14.vue';
import Game15 from '@/games/Game15.vue';
import Game16 from '@/games/Game16.vue';
import Game17 from '@/games/Game17.vue';
import Game18 from '@/games/Game18.vue';
import Game19 from '@/games/Game19.vue';
import Game20 from '@/games/Game20.vue';

const gameId = ref('');
const isKnownGame = computed(() => Boolean(getGameMeta(gameId.value)));

onLoad((query) => {
  gameId.value = typeof query?.id === 'string' ? query.id : '';
  const meta = getGameMeta(gameId.value);

  if (!meta) {
    return;
  }

  uni.setNavigationBarTitle({
    title: meta.title
  });
});

function goHome() {
  uni.navigateBack();
}
</script>

<style scoped lang="scss">
.empty {
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 32rpx) 32rpx calc(env(safe-area-inset-bottom) + 32rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
}

.empty-title {
  color: #182033;
  font-size: 36rpx;
  font-weight: 700;
}

.game-shell {
  position: fixed;
  inset: 0;
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f5f7fb;
  touch-action: none;
}
</style>
