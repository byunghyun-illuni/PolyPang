/**
 * 방 코드 생성 유틸리티
 * 출처: docs/planning/01_PRD_게임기획.md
 *
 * 6자리 영문+숫자 코드 생성 (I, O, 0, 1 제외)
 */

import { ROOM_CODE_CHARS, GAME_CONSTANTS } from './constants';

/**
 * 랜덤 방 코드 생성
 *
 * @returns 6자리 방 코드 (예: "AB3F9K")
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[randomIndex];
  }
  return code;
}

/**
 * 방 코드 유효성 검사
 *
 * @param code - 방 코드
 * @returns true if 유효함
 */
export function isValidRoomCode(code: string): boolean {
  if (code.length !== GAME_CONSTANTS.ROOM_CODE_LENGTH) {
    return false;
  }

  // 모든 문자가 ROOM_CODE_CHARS에 포함되어 있는지 확인
  for (const char of code) {
    if (!ROOM_CODE_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}
