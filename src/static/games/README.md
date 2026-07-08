# Game Assets

每个小游戏的独立图片资源放在对应目录：

```text
src/static/games/game-01/
src/static/games/game-02/
...
src/static/games/game-20/
```

在 Vue 中引用示例：

```vue
<image src="/static/games/game-01/bg.png" mode="aspectFill" />
```

建议每个游戏目录内继续按用途命名，例如 `bg.png`、`icon.png`、`question-01.png`。
