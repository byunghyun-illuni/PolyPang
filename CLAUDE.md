# PolyPang - AI 개발 규칙

## 프로젝트
정N각형 경기장 기반 실시간 멀티플레이어 핀볼 생존 게임

## 기술 스택
- **Client**: Vite + React + TypeScript + PixiJS + Zustand + Tailwind
- **Server**: Node.js + Socket.io (authoritative)
- **문서**: `docs/planning/` 참조 필수

## 핵심 UX 원칙
- **내 Side 하단 고정**: Arena를 회전시켜 내 Side가 항상 화면 하단에 위치
- **좌우 터치 홀드**: 화면 좌/우 터치로 패들 이동 (홀드 시 이동, 릴리즈 시 감속)
- **화면 비율**: Header 6%, 생존자 4%, Arena 52%, 조작 38%

## 개발 원칙
1. **문서 우선**: PRD/화면기획서/아키텍처 문서 기준으로 개발
2. **질문 우선**: 애매한 요구사항은 구현 전 반드시 유저에게 질문
3. **모바일 퍼스트**: 9:16 세로 화면 기준, PC는 중앙 정렬
4. **타입 안정성**: 모든 엔티티/이벤트는 TypeScript 타입 정의 필수
5. **성능 최적화**: 60fps 유지, PixiJS 렌더링 최적화, Zustand 셀렉터 활용
6. **서버 권위**: 게임 판정(OUT, 충돌)은 서버가 최종 결정, 클라는 예측 렌더링만

## 주요 상수
- α = 0.3 (패들 길이 / Side 길이)
- β = 0.6 (패들 이동 범위, Side 중심 기준 ±30%)
- 공 속도: HIT마다 ×1.05
- 틱레이트: 서버 30fps, 클라이언트 60fps

## 주요 파일 위치
- 화면: `client/src/components/screens/` (S01~S06)
- Arena: `client/src/components/arena/renderers/`
- 물리: `client/src/physics/` (geometry, collision, reflection)
- 타입: `client/src/types/`
- 상수: `client/src/utils/constants.ts`

## 작업 단위
- 화면 단위(S01~S06)로 작업
- Arena 변경 시 N=2,3,5,8 모두 테스트
- 기능 완성 후 테스트 가능한 상태로 커밋

## 금지 사항
- 클라이언트에서 OUT/충돌 최종 판정 금지
- Arena 회전 없이 렌더링 금지

## 코드 품질
- SOLID 원칙 준수
- 컴포넌트 재사용 (`components/shared/`, `components/ui/`)
- 명확한 변수명 (물리 계산, 좌표 변환)
- Tidy First 접근법
- 하드코딩은 절대로 금지
