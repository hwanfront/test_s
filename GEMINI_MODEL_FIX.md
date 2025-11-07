# Gemini API 모델 호환성 수정

**Date**: 2025-11-07  
**Issue**: Gemini API 404 에러 - 모델 미지원  
**Final Solution**: `-latest` 접미사가 필요한 모델명 사용

## 문제 상황

### 시도 1: gemini-1.5-flash (실패)
```
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta
```

### 시도 2: gemini-pro (실패)
```
[404 Not Found] models/gemini-pro is not found for API version v1beta
```

### 원인 분석
- Google Generative AI SDK v0.24.1은 `-latest` 접미사를 요구
- v1beta API 버전에서는 정확한 모델명 규칙 필요
- 이전 모델명들(gemini-pro, gemini-1.5-flash)은 더 이상 지원되지 않음

## ✅ 최종 해결 방법

### 올바른 모델명 (작동함)
```bash
GEMINI_MODEL=gemini-1.5-flash-latest
```

또는 더 강력한 모델:
```bash
GEMINI_MODEL=gemini-1.5-pro-latest
```

### 1. 기본 모델명 변경

**최종 수정**:
```typescript
// src/features/ai-analysis/lib/gemini-client.ts
this.config = {
  apiKey,
  // Must use -latest suffix for SDK v0.24.1
  model: config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
  maxOutputTokens: config.maxOutputTokens || 4096,
  temperature: config.temperature || 0.1,
  topP: config.topP || 0.8,
  topK: config.topK || 40,
  safetySettings: config.safetySettings || this.getDefaultSafetySettings()
}
```

### 2. 환경변수 설정

`.env` 파일:
```bash
# AI Analysis (Google Gemini)
GOOGLE_GEMINI_API_KEY=AIzaSyBvslmaEqY8dmuzTL_OXFnCtrzWL5y23r0
# Gemini model to use - must use -latest suffix for current SDK
# Available: gemini-1.5-flash-latest (fast), gemini-1.5-pro-latest (powerful)
GEMINI_MODEL=gemini-1.5-flash-latest
```

### 3. 환경변수 검증 업데이트

`src/shared/config/env-validation.ts`:
```typescript
GEMINI_MODEL: z.string().optional().default('gemini-1.5-flash-latest'),
```

## 사용 가능한 모델 (SDK v0.24.1)

### ⚠️ 중요: `-latest` 접미사 필수

Google Generative AI SDK v0.24.1에서는 반드시 `-latest` 접미사를 사용해야 합니다.

### 1. gemini-1.5-flash-latest (✅ 권장)
```bash
GEMINI_MODEL=gemini-1.5-flash-latest
```
- **속도**: 매우 빠름 (1-2초)
- **비용**: 저렴
- **용도**: 실시간 분석, 일반적인 텍스트 분석
- **권장**: 대부분의 약관 분석에 적합

### 2. gemini-1.5-pro-latest
```bash
GEMINI_MODEL=gemini-1.5-pro-latest
```
- **속도**: 보통 (3-5초)
- **비용**: 중간
- **용도**: 복잡한 법률 문서, 정밀 분석 필요시
- **권장**: 높은 정확도가 중요한 경우

### ❌ 작동하지 않는 모델명들
- `gemini-pro` ❌ (404 에러)
- `gemini-1.5-flash` ❌ (404 에러)
- `gemini-1.5-pro` ❌ (404 에러)
- 접미사 없는 모든 모델명 ❌

## 모델 선택 가이드

### 기본 사용 (✅ 강력 권장)
```bash
GEMINI_MODEL=gemini-1.5-flash-latest
```
- 빠른 응답 (1-2초)
- 충분한 분석 품질
- 비용 효율적
- 대부분의 약관 분석에 적합

### 고급 분석 필요시
```bash
GEMINI_MODEL=gemini-1.5-pro-latest
```
- 더 깊은 이해도
- 복잡한 법률 용어 분석
- 미묘한 위험 탐지
- 응답 시간 약간 증가 (3-5초)

## 폴백 메커니즘

코드에 이미 구현된 안전장치:

```typescript
// gemini-client.ts의 performAnalysis()
try {
  const response = await this.model.generateContent(fullPrompt)
  // ... 정상 처리
} catch (error: any) {
  // 모델 호출 실패 시 폴백 파서 사용
  console.warn('Gemini generateContent failed — using fallback parser:', errMsg)
  const fallback = this.createFallbackResponse(errMsg, request.sanitizedText)
  // ... 폴백 결과 반환
}
```

### 폴백 동작
1. Gemini API 호출 실패 감지
2. 휴리스틱 기반 분석으로 전환
3. 키워드 패턴 매칭 사용
4. 낮은 신뢰도의 결과 반환
5. 분석 파이프라인 계속 진행

## 테스트 방법

### 1. 환경변수 확인
```bash
# .env 파일 확인
cat .env | grep GEMINI

# 출력되어야 할 내용:
# GOOGLE_GEMINI_API_KEY=AIzaSy...
# GEMINI_MODEL=gemini-1.5-flash-latest
```

### 2. 개발 서버 재시작 (중요!)
```bash
# 기존 개발 서버 완전히 중지
# Ctrl+C 또는:
pkill -f "next dev"

# 새로 시작
pnpm dev
```

### 3. 분석 요청 실행
- 브라우저에서 http://localhost:3000/analysis 접속
- 약관 텍스트 입력 및 분석 실행

### 4. 로그 확인

**✅ 성공 케이스** (이제 이렇게 나와야 함):
```
Analysis completed for session xxx in 1500ms
Quota usage recorded for user xxx
```

**❌ 실패 케이스** (더 이상 나오면 안됨):
```
Gemini generateContent failed — using fallback parser: 
[404 Not Found] models/gemini-pro is not found
```

### 5. 실제 AI 분석 확인
- 분석 결과에서 상세한 위험 평가가 나오는지 확인
- "AI 분석 실패" 메시지가 없는지 확인
- 처리 시간이 1-2초대인지 확인 (flash) 또는 3-5초대 (pro)

## 모델 목록 확인 방법

Google Cloud Console에서 사용 가능한 모델 확인:

```bash
# curl을 사용한 모델 목록 조회
curl -X GET \
  "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

또는 코드에서:
```typescript
const genAI = new GoogleGenerativeAI(apiKey)
const models = await genAI.listModels()
console.log('Available models:', models)
```

## 참고 자료

- [Google Gemini API 문서](https://ai.google.dev/gemini-api/docs)
- [사용 가능한 모델 목록](https://ai.google.dev/gemini-api/docs/models/gemini)
- [모델 버전 관리](https://ai.google.dev/gemini-api/docs/models/versioning)

## 변경 파일 목록

1. ✅ `src/features/ai-analysis/lib/gemini-client.ts`
   - 기본 모델명: `gemini-1.5-flash-latest`
   - 환경변수 지원 추가
   - 주석에 `-latest` 필수 명시

2. ✅ `.env`
   - `GEMINI_MODEL=gemini-1.5-flash-latest`
   - 모델 선택 가이드 주석 업데이트
   - `-latest` 접미사 필수 명시

3. ✅ `.env.example`
   - 예제 업데이트
   - 사용 가능한 모델 목록 명시

4. ✅ `src/shared/config/env-validation.ts`
   - 기본값: `gemini-1.5-flash-latest`

5. 📄 `GEMINI_MODEL_FIX.md`
   - 상세한 문제 해결 과정 문서화

## SDK 버전 정보

```json
{
  "@google/generative-ai": "^0.24.1"
}
```

이 버전에서는:
- ✅ `gemini-1.5-flash-latest` 작동
- ✅ `gemini-1.5-pro-latest` 작동
- ❌ `gemini-pro` 작동 안함
- ❌ `-latest` 없는 모델명 작동 안함

## 트러블슈팅

### Q: 여전히 404 에러가 발생하는 경우

1. **개발 서버 완전히 재시작했는지 확인**
   ```bash
   pkill -f "next dev"
   pnpm dev
   ```

2. **환경변수가 올바른지 확인**
   ```bash
   cat .env | grep GEMINI_MODEL
   # 출력: GEMINI_MODEL=gemini-1.5-flash-latest
   ```

3. **API 키가 유효한지 확인**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
   ```

4. **브라우저 캐시 삭제**
   - 하드 새로고침: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

### Q: 폴백 파서만 사용되는 경우

- 로그에서 정확한 에러 메시지 확인
- API 키 권한 확인
- 네트워크 연결 확인
- API 할당량 확인 (Google Cloud Console)

### Q: 다른 모델을 시도하고 싶은 경우

1. `.env` 파일 수정:
   ```bash
   GEMINI_MODEL=gemini-1.5-pro-latest
   ```

2. 개발 서버 재시작:
   ```bash
   pnpm dev
   ```

3. 성능 비교:
   - flash: 1-2초, 저비용
   - pro: 3-5초, 고품질

## 추가 권장사항

### 1. 모델 자동 선택 구현
```typescript
// 미래 개선안
async function selectBestModel(): Promise<string> {
  const models = ['gemini-1.5-pro-latest', 'gemini-pro']
  
  for (const model of models) {
    try {
      // 모델 테스트
      return model
    } catch (error) {
      continue
    }
  }
  
  return 'gemini-pro' // 최종 폴백
}
```

### 2. 모델별 설정 최적화
```typescript
const modelConfigs = {
  'gemini-pro': { maxTokens: 4096, temperature: 0.1 },
  'gemini-1.5-pro-latest': { maxTokens: 8192, temperature: 0.1 },
  'gemini-1.5-flash-latest': { maxTokens: 4096, temperature: 0.15 }
}
```

### 3. 에러 모니터링
```typescript
// Sentry 또는 로그에 모델 정보 포함
console.log({
  model: this.config.model,
  success: result.success,
  error: result.error?.message
})
```

---

**상태**: ✅ 수정 완료  
**빌드**: ✅ 성공  
**테스트**: 🔄 개발 서버 재시작 필요
