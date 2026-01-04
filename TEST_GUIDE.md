# Filemarks Extension - Manual Test Guide

## 테스트 환경 준비

1. VSCode에서 현재 프로젝트 열기
2. **F5** 키를 눌러 Extension Development Host 실행
3. 새 창이 열리면 `test-workspace` 폴더 열기:
   - File → Open Folder → `test-workspace` 선택

---

## Test Case 1: 북마크 추가 (Toggle ON)

**Steps:**
1. `test-workspace/src/app.js` 파일 열기
2. 2번 라인 (`console.log('Hello World');`)으로 커서 이동
3. **Ctrl+Shift+1** (Mac: Cmd+Shift+1) 누르기

**Expected:**
- ✅ 메시지 표시: "Bookmark 1 toggled at line 2"
- ✅ `.vscode/filemarks.json` 파일 자동 생성
- ✅ JSON 내용:
```json
{
  "version": "1.0",
  "items": [
    {
      "type": "bookmark",
      "id": "<uuid>",
      "filePath": "src/app.js",
      "numbers": {
        "1": 1
      },
      "createdAt": "<timestamp>",
      "updatedAt": "<timestamp>"
    }
  ]
}
```

---

## Test Case 2: 같은 파일에 다른 숫자 북마크 추가

**Steps:**
1. 같은 파일 (`app.js`)에서 6번 라인 (`return a + b;`)으로 커서 이동
2. **Ctrl+Shift+3** 누르기

**Expected:**
- ✅ 메시지 표시: "Bookmark 3 toggled at line 6"
- ✅ JSON 파일에 `numbers`에 3번 추가됨:
```json
"numbers": {
  "1": 1,
  "3": 5
}
```
- ✅ `items` 배열 길이는 여전히 1 (같은 파일이므로 하나의 BookmarkNode)

---

## Test Case 3: 다른 파일에 북마크 추가

**Steps:**
1. `test-workspace/src/utils.js` 파일 열기
2. 7번 라인 (`return n * factorial(n - 1);`)으로 커서 이동
3. **Ctrl+Shift+5** 누르기

**Expected:**
- ✅ 메시지 표시: "Bookmark 5 toggled at line 7"
- ✅ JSON 파일에 새로운 BookmarkNode 추가:
```json
{
  "version": "1.0",
  "items": [
    {
      "type": "bookmark",
      "filePath": "src/app.js",
      "numbers": { "1": 1, "3": 5 }
    },
    {
      "type": "bookmark",
      "filePath": "src/utils.js",
      "numbers": { "5": 6 }
    }
  ]
}
```

---

## Test Case 4: 북마크로 점프 (Jump)

**Steps:**
1. 아무 파일이나 열기 (또는 현재 파일 유지)
2. **Ctrl+1** (Mac: Cmd+1) 누르기

**Expected:**
- ✅ `src/app.js` 파일이 자동으로 열림
- ✅ 커서가 2번 라인 (`console.log('Hello World');`)으로 이동
- ✅ 해당 라인이 화면 중앙에 표시됨
- ✅ 메시지: "Jumped to bookmark 1: src/app.js:2"

**Steps:**
1. **Ctrl+5** 누르기

**Expected:**
- ✅ `src/utils.js` 파일이 자동으로 열림
- ✅ 커서가 7번 라인으로 이동
- ✅ 메시지: "Jumped to bookmark 5: src/utils.js:7"

---

## Test Case 5: 북마크 이동 (Update)

**Steps:**
1. `src/app.js` 열기
2. 10번 라인 (`return a * b;`)으로 커서 이동
3. **Ctrl+Shift+1** 누르기 (기존 1번 북마크를 새 위치로 이동)

**Expected:**
- ✅ 메시지: "Bookmark 1 toggled at line 10"
- ✅ JSON 파일에서 1번 북마크의 라인번호가 1 → 9로 변경:
```json
"numbers": {
  "1": 9,
  "3": 5
}
```

---

## Test Case 6: 북마크 삭제 (Toggle OFF)

**Steps:**
1. `src/app.js` 10번 라인에 커서 유지 (1번 북마크가 있는 위치)
2. **Ctrl+Shift+1** 다시 누르기 (같은 위치에서 토글 → 삭제)

**Expected:**
- ✅ 메시지: "Bookmark 1 toggled at line 10"
- ✅ JSON 파일에서 1번 북마크 삭제:
```json
"numbers": {
  "3": 5
}
```

**Steps:**
1. 6번 라인으로 이동
2. **Ctrl+Shift+3** 누르기 (마지막 남은 북마크 삭제)

**Expected:**
- ✅ 3번 북마크 삭제
- ✅ `src/app.js`의 BookmarkNode 전체가 삭제됨 (numbers가 비었으므로)
- ✅ JSON 파일에서 해당 BookmarkNode 제거됨

---

## Test Case 7: 존재하지 않는 북마크로 점프

**Steps:**
1. **Ctrl+9** 누르기 (아직 설정하지 않은 9번 북마크)

**Expected:**
- ✅ 경고 메시지: "Bookmark 9 is not defined"
- ✅ 아무 동작 없음

---

## Test Case 8: 영속성 테스트 (Persistence)

**Steps:**
1. 북마크 몇 개 추가 (예: 1, 2, 3번)
2. Extension Development Host 창 닫기
3. **F5** 다시 눌러 재시작
4. `test-workspace` 폴더 다시 열기
5. **Ctrl+1** 눌러서 점프 시도

**Expected:**
- ✅ 이전에 설정한 북마크가 그대로 유지됨
- ✅ 점프 정상 작동
- ✅ `.vscode/filemarks.json` 파일 내용 유지됨

---

## Test Case 9: Workspace 없이 실행

**Steps:**
1. Extension Development Host에서 폴더 없이 VSCode 실행 (File → Close Folder)
2. 파일 하나만 열기

**Expected:**
- ✅ 경고 메시지: "Filemarks requires an open workspace"
- ✅ 확장 기능 비활성화 (커맨드 동작 안 함)

---

## 체크리스트

테스트 완료 후 체크:

- [ ] 북마크 추가 (Toggle ON)
- [ ] 같은 파일에 여러 숫자 북마크
- [ ] 다른 파일에 북마크
- [ ] 북마크로 점프 (같은 파일)
- [ ] 북마크로 점프 (다른 파일)
- [ ] 북마크 이동 (다른 라인으로 업데이트)
- [ ] 북마크 삭제 (Toggle OFF)
- [ ] 마지막 북마크 삭제 시 BookmarkNode 제거
- [ ] 존재하지 않는 북마크 점프 시 경고
- [ ] 재시작 후 북마크 유지 (영속성)
- [ ] Workspace 없을 때 경고 표시

---

## Debugging Tips

### 문제: 북마크가 저장되지 않음
- `.vscode/filemarks.json` 파일 확인
- VSCode 출력 창에서 에러 메시지 확인

### 문제: 점프가 안 됨
- JSON 파일에서 `filePath`가 올바른지 확인 (상대 경로여야 함)
- 파일이 실제로 존재하는지 확인

### 문제: 커맨드가 실행되지 않음
- Command Palette (Ctrl+Shift+P)에서 "Filemarks" 검색해서 커맨드 목록 확인
- Extension Host가 정상 실행되었는지 확인

---

## Next Steps

모든 테스트 통과 후:
1. 거터 아이콘 추가 (DecorationProvider)
2. 사이드바 TreeView 구현
3. 폴더 기능 구현 (드래그 앤 드롭)
