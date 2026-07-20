import type { GameMeta } from '@/types/game';

export const gameList: GameMeta[] = [
  { id: 'game-01', title: '单词快选', description: '根据提示快速选择正确单词。', difficulty: 'easy', status: 'ready' },
  { id: 'game-02', title: '单词消消乐', description: '配对英文单词和中文释义并消除词卡。', difficulty: 'easy', status: 'ready' },
  { id: 'game-03', title: '听音辨词', description: '听发音后选择对应单词。', difficulty: 'normal', status: 'ready' },
  { id: 'game-04', title: '击鼓识词', description: '听单词发音，点击对应的鼓面。', difficulty: 'normal', status: 'ready' },
  { id: 'game-05', title: '单词拼图', description: '拖动字母拼出完整的英文单词。', difficulty: 'easy', status: 'ready' },
  { id: 'game-06', title: '听音填词', description: '听发音并拖拽字母补全单词。', difficulty: 'normal', status: 'ready' },
  { id: 'game-07', title: '句子排序', description: '调整词块顺序组成句子。', difficulty: 'normal', status: 'ready' },
  { id: 'game-08', title: '快速翻译', description: '限时选择中文对应英文。', difficulty: 'normal', status: 'ready' },
  { id: 'game-09', title: '单词接龙', description: '用上一个尾字母接下一个词。', difficulty: 'hard', status: 'ready' },
  { id: 'game-10', title: '语法侦探', description: '找出句子中的语法问题。', difficulty: 'hard', status: 'ready' },
  { id: 'game-11', title: '颜色听令', description: '按英文颜色指令点击色块。', difficulty: 'easy', status: 'ready' },
  { id: 'game-12', title: '数字竞速', description: '听数字并点选正确答案。', difficulty: 'easy', status: 'ready' },
  { id: 'game-13', title: '动物记忆', description: '记住动物英文并完成匹配。', difficulty: 'normal', status: 'ready' },
  { id: 'game-14', title: '食物分类', description: '把食物单词放进正确类别。', difficulty: 'normal', status: 'ready' },
  { id: 'game-15', title: '场景问答', description: '根据场景回答英文问题。', difficulty: 'normal', status: 'ready' },
  { id: 'game-16', title: '同义词连线', description: '连接含义相近的英文单词。', difficulty: 'hard', status: 'ready' },
  { id: 'game-17', title: '反义词冲刺', description: '快速找到目标词的反义词。', difficulty: 'hard', status: 'ready' },
  { id: 'game-18', title: '时态训练', description: '选择正确时态完成句子。', difficulty: 'hard', status: 'ready' },
  { id: 'game-19', title: '短语补全', description: '补全常用英文短语。', difficulty: 'normal', status: 'ready' },
  { id: 'game-20', title: '阅读闯关', description: '读短文并回答理解题。', difficulty: 'hard', status: 'ready' }
];

export function getGameMeta(gameId: string) {
  return gameList.find((game) => game.id === gameId);
}
