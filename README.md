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
    game01/
      mock.json             # 第一个游戏接口模拟返回
      types.ts              # 接口原始字段类型
      adapter.ts            # 接口数据转游戏题目
      service.ts            # 当前返回 mock，后续替换真实接口
    Game02.vue              # 字母配对
    ...
    Game20.vue              # 阅读闯关
    registry.ts             # 20 个游戏的标题、描述、列表元信息
  pages/
    index/index.vue         # 游戏列表
    play/play.vue           # 根据 id 展示对应游戏，小程序端使用静态组件分支
  styles/
    global.scss
  static/
    games/
      game-01/              # Game01 独立图片资源
      ...
      game-20/              # Game20 独立图片资源
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
npm run open:weixin
```

微信小程序构建产物默认在 `dist/build/mp-weixin`，可用微信开发者工具打开。构建后会自动把开发者工具基础库固定到 `3.8.12`，规避游客模式下新基础库安全接口异常导致的白屏。
`npm run open:weixin` 会先构建微信小程序，再调用微信开发者工具 CLI 打开构建产物。

如果微信开发者工具控制台出现 `webapi_getwxasyncsecinfo:fail`、`Cannot read property 'errMsg' of undefined`，并且环境显示 `lib: 3.15.x`，这是开发者工具游客模式或新基础库内部安全接口异常，不是页面样式导致的。先执行 `npm run open:weixin` 重新构建打开；如果仍然显示 `3.15.x`，请在开发者工具详情里把调试基础库切到 `3.8.12`，或者使用客户真实 AppID 导入 `dist/build/mp-weixin`。

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

## 第一个游戏 mock 数据

第一个游戏已经按客户接口结构封装在 `src/games/game01/`：

- `mock.json`：保存接口原始返回结构 `code/msg/data`
- `types.ts`：声明接口响应和单词字段类型
- `adapter.ts`：把单词列表转换成选择题题目
- `service.ts`：暴露 `fetchGame01Words` 和 `fetchGame01Rounds`

后面接真实接口时，优先替换 `service.ts` 里的 `fetchGame01Words`，`Game01.vue` 不需要改。
