# 패들 히트 포인트 시각화 기능 계획

## 목표
패들에 공이 맞았을 때, 맞은 위치를 0.2초간 시각적으로 표시하여 사용자에게 피드백 제공

## 현재 상태 분석

### 서버 측
- `hit_pang` 이벤트에 `paddleOffset` (-1 ~ 1) 값이 이미 포함됨
- `paddleOffset`: 패들 중심 기준 -1(왼쪽 끝) ~ 0(중앙) ~ 1(오른쪽 끝)

### 클라이언트 측
- `MultiplayerGameScreen.tsx`: 소켓 이벤트 처리하지만 `hit_pang` 이벤트 리스너 없음
- `PaddleRenderer.ts`: 패들 렌더링만, 히트 이펙트 기능 없음
- `BallRenderer.ts`: `hitEffectActive` 옵션으로 공 글로우 이펙트 지원 (참고용)

## 구현 계획

### Step 1: hit_pang 이벤트 수신 (MultiplayerGameScreen.tsx)
- `hit_pang` 소켓 이벤트 리스너 추가
- 히트 정보 상태 관리 (playerId, sideIndex, paddleOffset, timestamp)

### Step 2: PaddleRenedrer 히트 이펙트 기능 추가
- `showHitEffect(sideIndex, paddleOffset)` 메서드 추가
- 히트 포인트에 원형 이펙트 또는 플래시 효과 표시
- 0.2초 후 자동 제거 (Ticker 또는 setTimeout 사용)

### Step 3: 시각 효과 구현
**Option A: 히트 포인트 원형 이펙트 (추천)**
- 맞은 위치에 작은 노란색 원 + 확장되는 링 애니메이션
- 패들 색상에 따른 글로우 효과

**Option B: 패들 플래시**
- 맞은 패들 전체가 순간 밝아지는 효과

**Option C: 히트 마커**
- 맞은 위치에 작은 점 + 파티클

## 상세 구현

### 1. MultiplayerGameScreen.tsx 수정
```typescript
// 히트 이펙트 상태
const [hitEffect, setHitEffect] = useState<{
  sideIndex: number
  paddleOffset: number
  playerId: string
} | null>(null)

// hit_pang 이벤트 리스너
const handleHitPang = (data: {
  playerId: string
  sideIndex: number
  paddleOffset: number
}) => {
  setHitEffect({
    sideIndex: data.sideIndex,
    paddleOffset: data.paddleOffset,
    playerId: data.playerId,
  })

  // 0.2초 후 제거
  setTimeout(() => setHitEffect(null), 200)
}
```

### 2. PaddleRenderer.ts 수정
```typescript
interface HitEffect {
  sideIndex: number
  paddleOffset: number  // -1 ~ 1
  progress: number      // 0 ~ 1 (애니메이션 진행도)
}

// 히트 이펙트 표시 메서드
showHitEffect(sideIndex: number, paddleOffset: number): void {
  // 히트 포인트 좌표 계산
  // 원형 이펙트 + 확장 링 그리기
}
```

### 3. 시각 효과 상세
- **내부 원**: 반지름 6px, 노란색(#fcd34d), alpha 1.0
- **외부 링**: 반지름 6px → 20px 확장, alpha 1.0 → 0 fade out
- **지속 시간**: 200ms
- **이징**: ease-out

## 파일 변경 목록
1. `client/src/components/screens/MultiplayerGameScreen.tsx` - hit_pang 이벤트 처리
2. `client/src/components/arena/renderers/PaddleRenderer.ts` - 히트 이펙트 렌더링

## 대안 검토

### 별도 HitEffectRenderer 생성
- 장점: 관심사 분리, PaddleRenderer 단순화
- 단점: 파일 추가, Container 관리 복잡

### PaddleRenderer에 통합 (추천)
- 장점: 패들 좌표 계산 로직 재사용, 간단한 구현
- 단점: PaddleRenderer 책임 증가

## 추천 구현: Option A + PaddleRenderer 통합
- 히트 포인트에 노란색 원 + 확장 링 애니메이션
- PaddleRenderer에 히트 이펙트 상태와 렌더링 추가
- 외부에서 `showHitEffect()` 호출로 이펙트 트리거
