import mockResponse from './mock.json';
import { toWordChoiceRounds } from './adapter';
import type { WordChoiceRound, WordListResponse } from './types';

export async function fetchGame01Words(): Promise<WordListResponse> {
  return mockResponse as WordListResponse;
}

export async function fetchGame01Rounds(): Promise<WordChoiceRound[]> {
  const response = await fetchGame01Words();

  if (response.code !== 0) {
    throw new Error(response.msg || '获取单词数据失败');
  }

  return toWordChoiceRounds(response.data);
}
