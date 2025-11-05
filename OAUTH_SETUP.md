# OAuth2 Google Authentication Setup Guide

This guide will help you configure Google OAuth2 authentication for your Next.js application.

## Prerequisites

- Google Cloud Console access
- Domain or localhost setup for development
- Environment variables properly configured

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "AI Analysis Platform")
4. Click "Create"

### 1.2 Enable Google+ API
1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on "Google+ API" and press "Enable"
4. Also enable "Google Identity and Access Management (IAM) API"

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (for public apps) or "Internal" (for organization-only)
3. Fill in the required information:
   - **Application name**: Your app name
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
5. Save and continue

### 1.4 Create OAuth2 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure:
   - **Name**: Your app name
   - **Authorized JavaScript origins**:
     - Development: `http://localhost:3000`
     - Production: `https://yourdomain.com`
   - **Authorized redirect URIs**:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://yourdomain.com/api/auth/callback/google`
5. Click "Create"
6. **Copy the Client ID and Client Secret** - you'll need these for environment variables

## Step 2: Environment Configuration

### 2.1 Create .env.local file
Create a `.env.local` file in your project root with the following variables:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Database (Supabase)
DATABASE_URL=your-supabase-database-url
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
```

### 2.2 Generate NextAuth Secret
Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use this Node.js command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.3 Production Environment Variables
For production deployment, ensure all environment variables are set in your hosting platform:

**Vercel:**
1. Go to your project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add all the variables from your `.env.local`

**Other platforms:**
Follow your platform's documentation for setting environment variables.

## Step 3: Domain and Redirect URI Configuration

### 3.1 Development Setup
- Use `http://localhost:3000` for local development
- Ensure your dev server runs on port 3000

### 3.2 Production Setup
- Update `NEXTAUTH_URL` to your production domain
- Add your production domain to Google Cloud Console:
  - Authorized JavaScript origins: `https://yourdomain.com`
  - Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`

## Step 4: Database Setup (Supabase)

### 4.1 Create Required Tables
The application expects these tables in your Supabase database:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table (for OAuth)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis sessions table
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  input_text TEXT NOT NULL,
  analysis_result JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quota tracking table
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analyses_used INTEGER DEFAULT 0,
  analyses_limit INTEGER DEFAULT 100,
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 4.2 Set Up Row Level Security (RLS)
Enable RLS for security:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Create policies for analysis_sessions
CREATE POLICY "Users can view own analysis sessions" ON analysis_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own analysis sessions" ON analysis_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own analysis sessions" ON analysis_sessions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create policies for user_quotas
CREATE POLICY "Users can view own quota" ON user_quotas
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own quota" ON user_quotas
  FOR UPDATE USING (auth.uid()::text = user_id::text);
```

## Step 5: Testing Your Setup

### 5.1 Validate Environment
Run the environment validation:

```bash
npm run validate-env
```

Or create a validation script:

```javascript
// scripts/validate-setup.js
const { validateEnvironment } = require('./src/shared/config/env-validation');

try {
  const config = validateEnvironment();
  console.log('✅ Environment configuration is valid');
  console.log('OAuth Configuration:', {
    clientId: config.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
    clientSecret: config.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
    nextAuthSecret: config.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
    nextAuthUrl: config.NEXTAUTH_URL
  });
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}
```

### 5.2 Test Authentication Flow
1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/signin`
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. Check if you're redirected back successfully

### 5.3 Debug OAuth Issues
If authentication fails, check:

1. **Console Errors**: Open browser DevTools → Console
2. **Network Tab**: Check for failed requests
3. **OAuth Debug**: Visit `/api/auth/debug` for diagnostic information
4. **Error Page**: Check `/auth/error` for detailed error messages

## Common Issues and Solutions

### Issue: "redirect_uri_mismatch"
**Solution**: Ensure your redirect URI in Google Cloud Console exactly matches:
- Development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://yourdomain.com/api/auth/callback/google`

### Issue: "Client credentials are invalid"
**Solution**: 
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure there are no extra spaces or characters
- Regenerate credentials if necessary

### Issue: "Access denied" error
**Solution**:
- Check OAuth consent screen configuration
- Ensure your email is added as a test user (for apps in testing)
- Verify required scopes are configured

### Issue: "NextAuth configuration error"
**Solution**:
- Ensure `NEXTAUTH_SECRET` is set and secure
- Verify `NEXTAUTH_URL` matches your current domain
- Check that all required environment variables are present

### Issue: Database connection errors
**Solution**:
- Verify Supabase URL and keys are correct
- Ensure required tables exist
- Check RLS policies are properly configured

## Security Best Practices

1. **Environment Variables**: Never commit `.env.local` to version control
2. **NextAuth Secret**: Use a cryptographically secure random string
3. **OAuth Scopes**: Only request the minimum required scopes
4. **Database Security**: Always use RLS in production
5. **HTTPS**: Use HTTPS in production for secure token transmission
6. **Token Rotation**: Configure refresh tokens for long-term sessions

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

## Support

If you continue to experience issues:

1. Check the error page at `/auth/error` for specific error details
2. Use the OAuth debug utility at `/api/auth/debug`
3. Review server logs for additional context
4. Consult the documentation for your specific deployment platform

---

**Last Updated**: December 2024
**Version**: 1.0