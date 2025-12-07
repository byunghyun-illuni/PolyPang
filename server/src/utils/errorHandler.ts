/**
 * PolyPang Error Handling Utility
 * 출처: docs/planning/08_API명세서.md (섹션 7.1)
 *
 * 클라이언트에게 에러 메시지를 전송하는 헬퍼 함수
 */

import { Socket } from 'socket.io';

/**
 * 에러 코드 타입
 */
export enum ErrorCode {
  // Room 관련
  INVALID_NICKNAME = 'INVALID_NICKNAME',
  INVALID_CODE = 'INVALID_CODE',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  GAME_IN_PROGRESS = 'GAME_IN_PROGRESS',
  NOT_ENOUGH_PLAYERS = 'NOT_ENOUGH_PLAYERS',

  // 권한 관련
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 네트워크 관련
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT = 'TIMEOUT',

  // 시스템 오류
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 에러 메시지 맵
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_NICKNAME]: '닉네임 형식이 올바르지 않습니다',
  [ErrorCode.INVALID_CODE]: '유효하지 않은 방 코드입니다',
  [ErrorCode.ROOM_NOT_FOUND]: '존재하지 않는 방입니다',
  [ErrorCode.ROOM_FULL]: '방 인원이 가득 찼습니다',
  [ErrorCode.GAME_IN_PROGRESS]: '게임이 이미 시작되었습니다',
  [ErrorCode.NOT_ENOUGH_PLAYERS]: '최소 2명 이상 필요합니다',
  [ErrorCode.PERMISSION_DENIED]: '권한이 없습니다',
  [ErrorCode.CONNECTION_ERROR]: '연결 오류가 발생했습니다',
  [ErrorCode.TIMEOUT]: '요청 시간이 초과되었습니다',
  [ErrorCode.SERVER_ERROR]: '서버 오류가 발생했습니다',
  [ErrorCode.UNKNOWN_ERROR]: '알 수 없는 오류가 발생했습니다',
};

/**
 * Error 이벤트 페이로드
 */
export interface ErrorPayload {
  message: string; // 사용자에게 표시할 메시지
  code?: ErrorCode; // 에러 코드 (디버깅용)
}

/**
 * 에러 메시지 전송 헬퍼
 *
 * @param socket - Socket 인스턴스
 * @param code - 에러 코드
 * @param customMessage - 커스텀 메시지 (선택)
 */
export function sendError(
  socket: Socket,
  code: ErrorCode,
  customMessage?: string
): void {
  const message = customMessage || ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];

  const payload: ErrorPayload = {
    message,
    code,
  };

  socket.emit('error', payload);
  console.error(`[Error] ${socket.id} - ${code}: ${message}`);
}

/**
 * 콜백에 에러 응답 전송
 *
 * @param callback - Socket 콜백 함수
 * @param code - 에러 코드
 */
export function sendErrorCallback(
  callback: ((response: any) => void) | undefined,
  code: ErrorCode
): void {
  if (callback) {
    callback({ error: code });
  }
}
