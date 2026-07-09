import mockResponse from './mock.json';
import { toWordChoiceRounds } from './adapter';
import type { LearningTimeReportPayload, WordChoiceRound, WordListResponse } from './types';

const GAME01_WORDS_API = '';
const GAME01_LEARNING_TIME_API = '';

function requestWords(url: string) {
  return new Promise<WordListResponse>((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      success: (response) => {
        resolve(response.data as WordListResponse);
      },
      fail: reject
    });
  });
}

export async function fetchGame01Words(): Promise<WordListResponse> {
  if (GAME01_WORDS_API) {
    return requestWords(GAME01_WORDS_API);
  }

  return mockResponse as WordListResponse;
}

export async function fetchGame01Rounds(): Promise<WordChoiceRound[]> {
  const response = await fetchGame01Words();

  if (response.code !== 0) {
    throw new Error(response.msg || '获取单词数据失败');
  }

  return toWordChoiceRounds(response.data);
}

export async function reportGame01LearningTime(payload: LearningTimeReportPayload) {
  if (!GAME01_LEARNING_TIME_API) {
    console.log('Game01 learning time report skipped:', payload);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    uni.request({
      url: GAME01_LEARNING_TIME_API,
      method: 'POST',
      data: payload,
      success: () => resolve(),
      fail: reject
    });
  });
}
