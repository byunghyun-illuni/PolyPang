# PolyPang 개발 환경 세팅 가이드

## 1. 필수 VSCode 플러그인 설치

VSCode를 열면 자동으로 권장 확장 프로그램 설치를 묻습니다.
**"모두 설치"** 클릭 또는 아래 수동 설치:

### 필수 (반드시 설치)
```bash
# 명령 팔레트 (Cmd+Shift+P) → "Extensions: Show Recommended Extensions"
```

1. **ESLint** (`dbaeumer.vscode-eslint`)
   - 코드 품질 검사, 자동 수정

2. **Prettier** (`esbenp.prettier-vscode`)
   - 코드 포맷팅 (저장 시 자동 실행)

3. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
   - Tailwind 클래스 자동완성, 색상 미리보기

### 강력 추천
4. **Error Lens** (`usernamehw.errorlens`)
   - 에러/경고를 코드 라인에 인라인 표시 (디버깅 속도 3배↑)

5. **Better Comments** (`aaron-bond.better-comments`)
   - TODO, FIXME, NOTE 하이라이팅

6. **GitLens** (`eamodio.gitlens`)
   - Git 히스토리/블레임 인라인 표시

---

## 2. 개발 서버 실행

### 방법 1: VSCode 디버거 사용 (권장)
```
F5 또는 디버그 탭 → "🎯 Client + Server (Parallel)" 선택 → 실행
```
- Client: http://localhost:5173
- Server: http://localhost:3000
- 브레이크포인트 디버깅 가능

### 방법 2: 터미널 수동 실행
```bash
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

---

## 3. 디버깅 팁

### Chrome DevTools + VSCode 동시 디버깅
1. F5 → "🎮 Client (Chrome)" 선택
2. VSCode에서 브레이크포인트 설정
3. Chrome에서 동작 실행 → VSCode에서 멈춤
4. 변수 확인, 콜스택 추적 가능

### Server 디버깅
1. F5 → "🔧 Server" 선택
2. `server/src/` 파일에 브레이크포인트 설정
3. Socket 이벤트 발생 시 멈춤

---

## 4. 코드 포맷팅 자동화

### 자동 설정됨 (`.vscode/settings.json`)
- **저장 시 자동 포맷팅** (Prettier)
- **저장 시 ESLint 자동 수정**
- Tailwind 클래스 정렬 (권장 순서대로)

### 수동 실행
```bash
# Client 린트 체크
cd client && npm run lint

# Client 빌드 (타입 체크 포함)
cd client && npm run build
```

---

## 5. 프로젝트 구조 탐색

### 주요 경로 (Path IntelliSense 지원)
```typescript
// Client
import { GameState } from '@/types/game';          // types
import { useGameStore } from '@/stores/gameStore'; // stores
import { Button } from '@/components/ui/button';   // shadcn/ui

// 물리 계산
import { getNormalVector } from '@/physics/geometry';
```

### 파일 빠르게 찾기
- `Cmd+P` → 파일명 입력 (예: `GameScreen`)
- `Cmd+Shift+F` → 전체 검색 (예: `useGameStore`)

---

## 6. 타입스크립트 팁

### 타입 에러 한눈에 보기
- **Error Lens** 설치 시 코드 옆에 빨간 글씨로 표시
- 하단 상태바 → "TypeScript 5.2.2" 클릭 → 프로젝트 전체 에러 확인

### 자동 임포트
- 타입 입력 후 `Cmd+.` → "Quick Fix" → "Add missing import"

---

## 7. Git 워크플로우

### GitLens 활용
- 각 줄에 마우스 오버 → 누가, 언제, 왜 수정했는지 표시
- `Cmd+Shift+G` → Git 탭 → 변경사항 확인

### 커밋 전 체크리스트
```bash
# 1. 린트 체크
cd client && npm run lint

# 2. 타입 체크 (빌드)
cd client && npm run build

# 3. 변경사항 확인
git status
git diff

# 4. 커밋 (VSCode Source Control 탭 권장)
```

---

## 8. 트러블슈팅

### "ESLint/Prettier가 작동 안 함"
```bash
# 1. 의존성 재설치
cd client && rm -rf node_modules package-lock.json && npm install

# 2. VSCode 재시작
Cmd+Shift+P → "Developer: Reload Window"
```

### "타입 에러가 사라지지 않음"
```bash
# TypeScript 서버 재시작
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### "Tailwind 자동완성 안 됨"
- `.vscode/settings.json` 확인
- `tailwindCSS.emmetCompletions: true` 설정됨

---

## 9. 성능 최적화 팁

### VSCode 성능 향상
- **불필요한 확장 비활성화**: 현재 프로젝트와 무관한 확장
- **검색 제외 폴더**: `node_modules`, `dist` (이미 설정됨)

### 개발 서버 느릴 때
```bash
# Vite 캐시 삭제
cd client && rm -rf node_modules/.vite

# 재시작
npm run dev
```

---

## 10. 추가 리소스

- **PixiJS 문서**: https://pixijs.com/guides
- **Zustand 가이드**: https://github.com/pmndrs/zustand
- **Socket.io 문서**: https://socket.io/docs/v4/
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**문제 발생 시**: `.vscode/` 설정 파일 확인 후 VSCode 재시작
