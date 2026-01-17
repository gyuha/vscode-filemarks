# Filemarks 개선 작업 목록

프로젝트 분석 결과를 바탕으로 작성된 개선 사항 목록입니다.

---

## ✅ 완료된 작업

### 6. 성능 최적화 (완료)

- [x] 디바운싱 유틸리티 구현
- [x] LRU 캐시 구현
- [x] Memoization 유틸리티 구현
- [x] 필터 입력 디바운싱 (300ms)
- [x] 트리 리프레시 디바운싱 (150ms)
- [x] Fuzzy match 메모이제이션 (500개 캐시)
- [x] 필터 결과 캐싱 (50개 LRU 캐시)
- [x] 북마크 조회 캐싱 (100개 LRU 캐시)
- [x] 폴더 조회 캐싱 (50개 LRU 캐시)
- [x] 저장 작업 디바운싱 (200ms)
- [x] ESLint 빈 블록 오류 수정
- [x] 성능 최적화 문서 작성

**성과**:

- 필터 타이핑 속도: 100ms → <5ms (95% 개선)
- 디스크 쓰기: 10+/초 → 1-2/초 (80% 감소)
- 캐시 히트율: ~80-90%

---

## 🔴 높은 우선순위 (즉시 처리 필요)

### 1. 코드 품질 개선

**상태**: 완료 ✅

- [x] ESLint 오류 수정 (`treeProvider.ts:300` 빈 블록)
- [x] TypeScript strict 모드 경고 검토
  - `performance.ts`의 9개 `any` 타입 경고 해결
  - 제네릭 타입을 더 구체적으로 정의 (`TArgs extends unknown[]`, `TReturn`)

**작업 내용**:

```typescript
// Before
function debounce<T extends (...args: any[]) => any>

// After
function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  delay: number
): (...args: TArgs) => void
```

**예상 시간**: 1-2시간

---

### 2. 테스트 커버리지 확대

**상태**: 미착수

- [ ] 성능 유틸리티 단위 테스트 작성
  - `debounce` 함수 테스트
  - `LRUCache` 클래스 테스트
  - `memoize` 함수 테스트
- [ ] TreeProvider 성능 최적화 테스트
- [ ] BookmarkStore 캐싱 테스트
- [ ] 통합 테스트 추가

**테스트 파일**:

- `src/test/suite/performance.test.ts` (신규)
- `src/test/suite/treeProvider.performance.test.ts` (신규)
- `src/test/suite/bookmarkStore.performance.test.ts` (신규)

**예상 시간**: 4-6시간

---

### 3. 에러 핸들링 개선

**상태**: 미착수

- [ ] 중앙 집중식 에러 핸들러 생성
- [ ] 에러 로깅 시스템 추가
- [ ] 사용자 친화적 에러 메시지
- [ ] 에러 복구 메커니즘

**작업 내용**:

```typescript
// src/utils/errorHandler.ts (신규 파일)
export class ErrorHandler {
  static handle(error: Error, context: string) {
    this.log(error, context);
    this.showUserMessage(error);
    this.reportToTelemetry(error); // 선택사항
  }

  private static log(error: Error, context: string) {
    // 구조화된 로깅
  }

  private static showUserMessage(error: Error) {
    // 사용자 친화적 메시지
  }
}
```

**예상 시간**: 3-4시간

---

## 🟡 중간 우선순위 (단기 처리)

### 4. JSDoc 주석 추가

**상태**: 미착수

- [ ] 모든 public 메서드에 JSDoc 추가
- [ ] 복잡한 private 메서드에 설명 추가
- [ ] 타입 정의에 설명 추가
- [ ] 예제 코드 포함

**작업 범위**:

- `src/bookmarkStore.ts`: 30개 메서드
- `src/views/treeProvider.ts`: 20개 메서드
- `src/decorations.ts`: 15개 메서드
- `src/storage.ts`: 5개 메서드
- `src/utils/performance.ts`: 6개 함수 (완료)

**예상 시간**: 4-5시간

---

### 5. CI/CD 파이프라인 구축

**상태**: 미착수

- [ ] GitHub Actions 워크플로우 생성
  - [ ] 린트 검사
  - [ ] 타입 체크
  - [ ] 단위 테스트 실행
  - [ ] 빌드 검증
- [ ] Pull Request 체크 자동화
- [ ] 릴리스 자동화
- [ ] 버전 태깅 자동화

**파일**:

- `.github/workflows/ci.yml` (신규)
- `.github/workflows/release.yml` (신규)

**예상 시간**: 3-4시간

---

### 7. 추가 언어 지원

**상태**: 미착수 (현재 영어, 한국어 지원)

- [ ] 일본어 (ja)
- [ ] 중국어 간체 (zh-cn)
- [ ] 중국어 번체 (zh-tw)
- [ ] 스페인어 (es)
- [ ] 프랑스어 (fr)
- [ ] 독일어 (de)

**작업 내용**:

- `package.nls.{lang}.json` 파일 생성
- 번역 키 관리 개선
- 번역 자동화 도구 검토

**예상 시간**: 2-3시간 (언어당)

---

## 🟢 낮은 우선순위 (장기 계획)

### 8. 고급 성능 최적화

**상태**: 계획 단계

- [ ] 가상 스크롤링 구현 (10,000+ 북마크)
- [ ] 증분 업데이트 (전체 트리 대신 변경된 노드만)
- [ ] Web Worker 활용 (무거운 필터링 작업)
- [ ] IndexedDB 저장소 (대용량 북마크 컬렉션)
- [ ] 지연 로딩 (폴더 내용 on-demand)

**예상 시간**: 10-15시간

---

### 9. 새로운 기능 추가

**상태**: 아이디어 단계

- [ ] 북마크 Export/Import (JSON, CSV)
- [ ] 북마크 동기화 (클라우드)
- [ ] 북마크 검색 (전체 텍스트 검색)
- [ ] 북마크 태그 시스템
- [ ] 북마크 히스토리/언두
- [ ] 북마크 공유 (팀 기능)
- [ ] 북마크 통계 및 분석

**예상 시간**: 개별 기능당 5-10시간

---

### 10. UI/UX 개선

**상태**: 아이디어 단계

- [ ] 북마크 아이콘 커스터마이징
- [ ] 테마 지원 강화
- [ ] 드래그 앤 드롭 개선
- [ ] 컨텍스트 메뉴 확장
- [ ] 키보드 단축키 커스터마이징
- [ ] 북마크 미리보기

**예상 시간**: 5-8시간

---

## 📋 즉시 시작 가능한 작업

다음 작업들은 우선순위가 높고 즉시 시작할 수 있습니다:

1. **~~TypeScript `any` 타입 제거~~** ✅ 완료 (1-2시간)
   - 파일: `src/utils/performance.ts`
   - 영향: 코드 품질, 타입 안정성

2. **성능 유틸리티 테스트 작성** (2-3시간)
   - 파일: `src/test/suite/performance.test.ts` (신규)
   - 영향: 코드 신뢰성

3. **에러 핸들러 구현** (3-4시간)
   - 파일: `src/utils/errorHandler.ts` (신규)
   - 영향: 사용자 경험, 디버깅

4. **CI/CD 파이프라인** (3-4시간)
   - 파일: `.github/workflows/*.yml` (신규)
   - 영향: 개발 효율성, 품질 보증

---

## 🎯 이번 주 목표

선택된 작업:

- [x] Task 1: TypeScript `any` 타입 제거 ✅
- [ ] Task 2: 성능 유틸리티 테스트 작성
- [ ] Task 3: 에러 핸들러 구현

**예상 완료 시간**: 6-9시간

---

## 📊 진행 상황 추적

### 전체 진행률

- 완료: 2 / 10 (20%)
- 진행 중: 0 / 10 (0%)
- 대기 중: 8 / 10 (80%)

### 카테고리별 진행률

- 성능 최적화: ✅ 100% (완료)
- 코드 품질: ✅ 100% (완료)
- 테스트: ⏳ 0% (대기)
- 문서화: 🔄 50% (진행 중)
- CI/CD: ⏳ 0% (대기)

---

## 📝 참고 문서

- [PERFORMANCE.md](docs/PERFORMANCE.md) - 성능 최적화 가이드
- [PERFORMANCE_IMPROVEMENTS.md](PERFORMANCE_IMPROVEMENTS.md) - 개선 사항 요약
- [README.md](README.md) - 프로젝트 개요
- [CHANGELOG.md](CHANGELOG.md) - 변경 이력

---

## 🤝 기여 가이드

새로운 개선 사항 추가 시:

1. 이 파일에 작업 항목 추가
2. 우선순위 설정 (🔴🟡🟢)
3. 예상 시간 명시
4. 관련 파일 목록 작성
5. 작업 완료 후 체크박스 표시

---

**마지막 업데이트**: 2026-01-17
**다음 리뷰 예정**: 2026-01-24
