<template>
  <view class="page">
    <view class="header">
      <view>
        <text class="kicker">uni-app Vue3</text>
        <text class="heading">20 个小游戏</text>
      </view>
      <text class="count">{{ gameList.length }} 个</text>
    </view>

    <view class="game-list">
      <view v-for="game in gameList" :key="game.id" class="game-card" @tap="openGame(game.id)">
        <view class="game-main">
          <text class="game-title">{{ game.title }}</text>
          <text class="game-desc">{{ game.description }}</text>
        </view>
        <view class="meta">
          <text class="tag">{{ difficultyText[game.difficulty] }}</text>
          <text class="arrow">></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { gameList } from '@/games/registry';

const difficultyText = {
  easy: '基础',
  normal: '进阶',
  hard: '挑战'
};

function openGame(gameId: string) {
  uni.navigateTo({
    url: `/pages/play/play?id=${gameId}`
  });
}
</script>

<style scoped lang="scss">
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.kicker {
  display: block;
  margin-bottom: 10rpx;
  color: #64748b;
  font-size: 24rpx;
}

.heading {
  display: block;
  color: #111827;
  font-size: 48rpx;
  font-weight: 800;
  line-height: 1.15;
}

.count {
  flex: 0 0 auto;
  color: #2563eb;
  font-size: 26rpx;
  font-weight: 700;
}

.game-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.game-card {
  min-height: 144rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 8rpx;
  background: #fff;
  border: 2rpx solid #e3e9f4;
}

.game-main {
  min-width: 0;
}

.game-title {
  display: block;
  color: #182033;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.25;
}

.game-desc {
  display: block;
  margin-top: 10rpx;
  color: #667085;
  font-size: 24rpx;
  line-height: 1.35;
}

.meta {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.tag {
  min-width: 72rpx;
  padding: 8rpx 12rpx;
  border-radius: 8rpx;
  background: #eef4ff;
  color: #1d4ed8;
  text-align: center;
  font-size: 22rpx;
}

.arrow {
  color: #94a3b8;
  font-size: 32rpx;
}
</style>
