# en-game

uni-app 3 + Vue 3 + TypeScript + Vite 的小游戏合集骨架，按“一个游戏一个 Vue 文件”组织，方便客户后续把单个游戏复制进自己的工程。

## 技术栈

- uni-app 3
- Vue 3.4 + Composition API + `<script setup>`
- TypeScript 4.9
- Vite 5.2
- SCSS / Sass 1.69
- 状态：不使用 Pinia/Vuex，使用 `src/composables/progress.ts` 内的 Vue 3 `reactive`

## 目录

```text
src/
  components/
    ChoiceGame.vue          # 通用选择题小游戏壳
  composables/
    progress.ts             # 本地进度和最高分
  games/
    Game01.vue              # 单词快选
    Game02.vue              # 字母配对
    ...
    Game20.vue              # 阅读闯关
    registry.ts             # 20 个游戏的标题、描述、列表元信息
  pages/
    index/index.vue         # 游戏列表
    play/play.vue           # 根据 id 展示对应游戏，小程序端使用静态组件分支
  styles/
    global.scss
  App.vue
  main.ts
  manifest.json
  pages.json
```

## 开发命令

```bash
npm install
npm run dev:h5
npm run dev:mp-weixin
npm run build:h5
npm run build:mp-weixin
```

微信小程序构建产物默认在 `dist/build/mp-weixin`，可用微信开发者工具打开。

## 给客户单独集成某个游戏

以 `Game01.vue` 为例，通常需要复制：

- `src/games/Game01.vue`
- `src/components/ChoiceGame.vue`
- `src/composables/progress.ts`
- `src/types/game.ts`
- `src/styles/global.scss` 中按钮相关样式，或改成客户自己的按钮样式

如果客户工程已经有自己的页面路由，可以直接把 `Game01.vue` 放到客户页面中使用。若保留本项目的总入口，则在 `src/games/registry.ts` 中维护列表元信息，并在 `src/pages/play/play.vue` 中添加对应组件分支。

## 新增游戏

1. 在 `src/games/` 新建 `Game21.vue`。
2. 在 `src/games/registry.ts` 的 `gameList` 添加标题、描述和难度。
3. 在 `src/pages/play/play.vue` 引入组件：

```ts
import Game21 from '@/games/Game21.vue';
```

4. 在模板里添加 `v-else-if="gameId === 'game-21'"` 的展示分支。

当前 20 个文件先使用统一的可玩选择题模板，后续确认每个小游戏的真实规则后，可以只替换对应 `GameXX.vue` 的模板和逻辑。
