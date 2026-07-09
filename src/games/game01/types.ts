export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface WordItem {
  id: string;
  word: string;
  phoneticUk: string | null;
  phoneticUs: string | null;
  audioUrl: string | null;
  meaningAudioUrl: string | null;
  partOfSpeech: string | null;
  meaningCn: string;
  meaningEn: string | null;
  grade: number | null;
  wordForms: string | null;
  fixedCollocation: string | null;
  memorySkill: string | null;
  exampleSentence: string | null;
  confusingTip: string | null;
  stage: number | null;
  difficulty: number | null;
  textbookVersion: string | null;
  unitCode: string | null;
  examFrequency: number | null;
  status: number | null;
  remark: string | null;
  createTime: number | null;
  version: number | null;
  ext01: string | null;
  ext02: string | null;
  ext03: string | null;
  retrievalCount: number | null;
  vectorStatus: number | null;
  vectorMsg: string | null;
  vectorId: string | null;
  score: number | null;
}

export type WordListResponse = ApiResponse<WordItem[]>;

export interface WordChoiceRound {
  id: string;
  prompt: string;
  answer: string;
  options: string[];
  word: WordItem;
}
