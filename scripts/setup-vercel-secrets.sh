#!/bin/bash

# Vercel Secrets 설정 스크립트
# 사용법: ./scripts/setup-vercel-secrets.sh

echo "🔐 Vercel Secrets 설정을 시작합니다..."

# .env.local 파일에서 값을 읽어서 Secret 생성
if [ ! -f .env.local ]; then
  echo "❌ .env.local 파일이 없습니다."
  exit 1
fi

# Secret 생성 (이미 존재하면 스킵됨)
source .env.local

echo "Creating nextauth_url..."
echo "$NEXTAUTH_URL" | vercel secrets add nextauth_url

echo "Creating nextauth_secret..."
echo "$NEXTAUTH_SECRET" | vercel secrets add nextauth_secret

echo "Creating google_client_id..."
echo "$GOOGLE_CLIENT_ID" | vercel secrets add google_client_id

echo "Creating google_client_secret..."
echo "$GOOGLE_CLIENT_SECRET" | vercel secrets add google_client_secret

echo "Creating naver_client_id..."
echo "$NAVER_CLIENT_ID" | vercel secrets add naver_client_id

echo "Creating naver_client_secret..."
echo "$NAVER_CLIENT_SECRET" | vercel secrets add naver_client_secret

echo "Creating supabase_url..."
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel secrets add supabase_url

echo "Creating supabase_anon_key..."
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel secrets add supabase_anon_key

echo "Creating supabase_service_role_key..."
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel secrets add supabase_service_role_key

echo "Creating gemini_api_key..."
echo "$GOOGLE_GEMINI_API_KEY" | vercel secrets add gemini_api_key

if [ -n "$SENTRY_DSN" ]; then
  echo "Creating sentry_dsn..."
  echo "$SENTRY_DSN" | vercel secrets add sentry_dsn
fi

if [ -n "$SENTRY_AUTH_TOKEN" ]; then
  echo "Creating sentry_auth_token..."
  echo "$SENTRY_AUTH_TOKEN" | vercel secrets add sentry_auth_token
fi

echo "✅ Vercel Secrets 설정 완료!"
echo "이제 'vercel --prod' 명령으로 배포할 수 있습니다."
