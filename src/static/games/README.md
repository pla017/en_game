# Game Assets

从第二个游戏开始，页面和独立资源放在同一个游戏目录：

```text
src/games/game02/
  Game02.vue
  assets/
  audio/
src/games/game03/
  Game03.vue
  assets/
```

资源在页面中使用模块引用：

```ts
import bgUrl from './assets/bg.jpg';
```

`src/static/games/` 只保留旧版 `game-01` 的公共静态资源。新的游戏资源不要再写绝对 `/static/games/...` 路径。
