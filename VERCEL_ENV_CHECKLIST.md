# Vercel 환경 변수 체크리스트

배포 후 인증 오류가 발생하는 경우, 다음을 확인하세요:

## 1. Vercel 대시보드에서 환경 변수 확인

https://vercel.com/hwanfronts-projects/test-s/settings/environment-variables

### 필수 환경 변수 (Production)

```bash
# Authentication - 가장 중요!
NEXTAUTH_URL=https://test-s.vercel.app  # 실제 프로덕션 URL로 변경
NEXTAUTH_SECRET=your-nextauth-secret-from-env-local

# OAuth (Google)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth (Naver) - 아직 사용하지 않음
NAVER_CLIENT_ID=your_naver_oauth_client_id
NAVER_CLIENT_SECRET=your_naver_oauth_secret

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Analysis (Google Gemini)
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Error Monitoring (선택사항)
SENTRY_DSN=your-sentry-dsn

# Environment
NODE_ENV=production
```

## 2. Google OAuth 설정 확인

https://console.cloud.google.com/apis/credentials

**승인된 리디렉션 URI에 다음이 추가되어 있는지 확인:**

```
https://test-s.vercel.app/api/auth/callback/google
https://your-actual-domain.vercel.app/api/auth/callback/google
```

## 3. 환경 변수 확인 명령어

```bash
# Vercel CLI로 환경 변수 확인
vercel env ls

# 특정 환경 변수 가져오기
vercel env pull .env.production
```

## 4. 디버그 엔드포인트 확인

배포 후 다음 URL에 접속하여 환경 설정 확인:

```
https://test-s.vercel.app/api/auth/debug
```

## 5. 로그 확인

```bash
# 실시간 로그 확인
vercel logs --follow

# 최근 로그 확인
vercel logs
```

## 6. 재배포

환경 변수 변경 후 반드시 재배포:

```bash
vercel --prod
```

또는 Vercel 대시보드에서 "Redeploy" 버튼 클릭

## 문제 해결

### 인증 오류가 계속 발생하는 경우:

1. **NEXTAUTH_URL이 정확한지 확인**
   - Production: `https://your-domain.vercel.app`
   - Preview: Vercel이 자동으로 설정
   - Development: `http://localhost:3000`

2. **NEXTAUTH_SECRET이 설정되어 있는지 확인**
   - 빈 문자열이나 없으면 안 됨
   - 최소 32자 이상의 랜덤 문자열

3. **Google OAuth 리디렉션 URI 확인**
   - Google Cloud Console에서 승인된 URI 목록 확인
   - 프로덕션 도메인이 추가되어 있는지 확인

4. **쿠키 도메인 설정**
   - `NEXTAUTH_URL`의 도메인과 실제 접속 도메인이 일치해야 함
   - HTTPS 필수 (로컬은 HTTP 가능)

5. **캐시 클리어**
   - 브라우저 캐시 및 쿠키 삭제
   - 시크릿/프라이빗 모드에서 테스트
