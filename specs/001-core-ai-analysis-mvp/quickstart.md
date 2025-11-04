# Quickstart: Core AI Analysis MVP

**Feature**: Core AI Analysis MVP  
**Last Updated**: 2025-11-05  
**Prerequisites**: Node.js 18+, pnpm, Supabase account, Google Cloud account

## Overview

This guide walks you through setting up and running the Terms Watcher MVP locally. The application analyzes terms and conditions using AI to identify potentially unfair clauses while maintaining strict privacy compliance.

## Architecture Quick Reference

### Module Separation (Constitutional Requirement)
```
Text Input → Preprocessing Module → AI Analysis Module → UI Presentation Module
     ↓              ↓                    ↓                    ↓
No storage    Hash + sanitize      Gemini API calls    Results display
             (discard original)    (patterns only)    (with rationale)
```

### Technology Stack
- **Frontend**: Next.js 14+ with React 18+, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes with TypeScript
- **Database**: Supabase (PostgreSQL) for users, quotas, analysis results
- **AI**: Google Gemini Pro API for text analysis
- **Auth**: NextAuth.js with Google + Naver OAuth2
- **State**: Zustand for global state management
- **Testing**: Jest + React Testing Library

## Initial Setup

### 1. Environment Configuration

Create `.env.local` in project root:

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Analysis (Google Gemini)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# OAuth2 Providers
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
NAVER_CLIENT_ID=your_naver_oauth_client_id
NAVER_CLIENT_SECRET=your_naver_oauth_secret

# Optional: Error Monitoring
SENTRY_DSN=your_sentry_dsn
```

### 2. Database Setup

Run the database migration scripts in Supabase SQL editor:

```sql
-- Copy and execute the schema from data-model.md
-- This creates: users, analysis_sessions, risk_assessments, daily_quotas, clause_patterns tables
```

### 3. Dependency Installation

```bash
# Install dependencies
pnpm install

# Install development dependencies
pnpm install -D jest @testing-library/react @testing-library/jest-dom
```

### 4. Seed Initial Data

```bash
# Seed clause patterns for mobile gaming analysis
pnpm run db:seed
```

## Development Workflow

### Starting the Development Server

```bash
# Start Next.js development server
pnpm dev

# Application will be available at http://localhost:3000
```

### Directory Structure Overview

```
src/
├── app/                          # Next.js 14 app router
│   ├── (auth)/                   # Authentication pages
│   │   ├── signin/page.tsx       # OAuth2 sign-in page
│   │   └── signout/page.tsx      # Sign-out confirmation
│   ├── api/                      # API route handlers
│   │   ├── auth/[...nextauth]/   # NextAuth.js configuration
│   │   ├── analysis/             # Analysis endpoints
│   │   └── quota/                # Quota management endpoints
│   ├── analysis/                 # Analysis interface pages
│   │   ├── page.tsx              # Main analysis form
│   │   └── [sessionId]/page.tsx  # Results display page
│   ├── dashboard/                # User dashboard
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Landing page
├── shared/                       # Shared utilities and components
│   ├── ui/                       # shadcn/ui components
│   ├── lib/                      # Utility functions
│   └── config/                   # App configuration
├── entities/                     # Core business entities
│   ├── user/                     # User management
│   ├── analysis/                 # Analysis sessions
│   └── quota/                    # Usage quota tracking
├── features/                     # Isolated feature modules
│   ├── text-preprocessing/       # Text sanitization (Module 1)
│   ├── ai-analysis/              # Gemini API integration (Module 2)
│   ├── auth-oauth/               # OAuth2 authentication
│   └── analysis-display/         # Results presentation (Module 3)
└── widgets/                      # Page-level compositions
    ├── analysis-form/            # Text input interface
    ├── auth-widget/              # Login/logout controls
    └── results-dashboard/        # Analysis results display
```

## Core Module Implementation

### Module 1: Text Preprocessing (`features/text-preprocessing/`)

**Purpose**: Sanitize and process input text without storing original content

```typescript
// features/text-preprocessing/lib/preprocessor.ts
export interface ProcessingResult {
  contentHash: string;      // SHA-256 hash for deduplication
  contentLength: number;    // Original length for analysis
  sanitizedText: string;    // Anonymized text for AI analysis
  metadata: {
    estimatedTokens: number;
    language: string;
    documentType: string;
  };
}

export async function preprocessTermsText(
  originalText: string
): Promise<ProcessingResult> {
  // 1. Validate input length and format
  // 2. Remove/anonymize company names and specific products
  // 3. Normalize formatting and structure
  // 4. Generate content hash (original → hash, then discard original)
  // 5. Return sanitized text for AI analysis
}
```

**Key Files**:
- `lib/preprocessor.ts` - Core preprocessing logic
- `lib/content-hasher.ts` - SHA-256 hashing utilities
- `lib/text-sanitizer.ts` - Content anonymization
- `hooks/use-preprocessing.ts` - React hook for UI integration

### Module 2: AI Analysis (`features/ai-analysis/`)

**Purpose**: Analyze sanitized text using Gemini API and pattern matching

```typescript
// features/ai-analysis/lib/gemini-client.ts
export interface AnalysisResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  riskAssessments: RiskAssessment[];
  processingTimeMs: number;
}

export async function analyzeTermsWithGemini(
  sanitizedText: string,
  patterns: ClausePattern[]
): Promise<AnalysisResult> {
  // 1. Load mobile gaming clause patterns
  // 2. Build structured prompts for Gemini API
  // 3. Call Gemini Pro API with rate limiting
  // 4. Parse and validate AI response
  // 5. Generate risk scores and classifications
}
```

**Key Files**:
- `lib/gemini-client.ts` - Gemini API integration
- `lib/pattern-matcher.ts` - Clause pattern matching
- `lib/prompt-builder.ts` - Structured prompt generation
- `lib/result-parser.ts` - AI response parsing and validation

### Module 3: UI Presentation (`features/analysis-display/`)

**Purpose**: Present analysis results with clear rationale and transparency

```typescript
// features/analysis-display/components/results-viewer.tsx
export function AnalysisResultsViewer({ sessionId }: { sessionId: string }) {
  // 1. Fetch analysis results from API
  // 2. Display overall risk score and level
  // 3. Show individual risk assessments with highlighting
  // 4. Include AI confidence levels and limitations
  // 5. Provide clear rationale for each finding
}
```

**Key Files**:
- `components/results-viewer.tsx` - Main results display
- `components/risk-highlight.tsx` - Text highlighting component
- `components/risk-card.tsx` - Individual risk display
- `components/analysis-summary.tsx` - Overall summary

## Testing Strategy

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run specific module tests
pnpm test features/text-preprocessing
pnpm test features/ai-analysis
pnpm test features/analysis-display
```

### Integration Tests

```bash
# Test complete analysis workflow
pnpm test:integration

# Test API endpoints
pnpm test:api
```

### Key Test Scenarios

1. **Text Preprocessing Module**:
   - Original text is never stored
   - Content hashes are consistent and unique
   - Sanitization removes sensitive information
   - Processing handles edge cases (empty text, too long, special characters)

2. **AI Analysis Module**:
   - Gemini API integration handles errors gracefully
   - Pattern matching identifies known risk clauses
   - Risk scores are consistent and explainable
   - Rate limiting prevents API quota exhaustion

3. **UI Presentation Module**:
   - Results display all required transparency elements
   - Risk highlighting is accurate to character positions
   - Confidence levels and limitations are clearly shown
   - Error states are handled gracefully

## API Usage Examples

### Submit Analysis

```typescript
// POST /api/analysis
const response = await fetch('/api/analysis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: termsText,
    skipCache: false
  })
});

const { sessionId } = await response.json();
```

### Check Analysis Status

```typescript
// GET /api/analysis/{sessionId}/status
const statusResponse = await fetch(`/api/analysis/${sessionId}/status`);
const { status, progress } = await statusResponse.json();

// Poll until status is 'completed' or 'failed'
```

### Get Analysis Results

```typescript
// GET /api/analysis/{sessionId}
const resultsResponse = await fetch(`/api/analysis/${sessionId}`);
const { session, riskAssessments, summary } = await resultsResponse.json();
```

## Deployment

### Vercel Deployment

```bash
# Deploy to Vercel
pnpm build
vercel --prod

# Environment variables must be configured in Vercel dashboard
```

### Environment Variables Checklist

- [ ] Supabase URL and keys configured
- [ ] Google Gemini API key configured
- [ ] OAuth2 client IDs and secrets configured
- [ ] NextAuth.js secret generated
- [ ] Sentry DSN configured (optional)

## Monitoring and Debugging

### Key Metrics to Monitor

1. **Analysis Success Rate**: Percentage of successful analyses
2. **Processing Time**: Average time from submission to completion
3. **API Error Rate**: Gemini API failures and retries
4. **User Quota Usage**: Daily free analysis consumption
5. **Data Compliance**: Verification that no original text is stored

### Debugging Common Issues

1. **Authentication Problems**: Check OAuth2 configuration and provider settings
2. **Analysis Failures**: Verify Gemini API key and quota limits
3. **Database Errors**: Check Supabase connection and schema
4. **Module Separation**: Ensure no data flows between restricted modules

## Next Steps

After MVP deployment:

1. **Performance Optimization**: Implement caching and CDN
2. **Pattern Expansion**: Add more industry-specific clause patterns
3. **Payment Integration**: Implement paid analysis for quota overages
4. **Advanced Analytics**: Add user behavior and analysis quality metrics
5. **Mobile App**: Consider React Native implementation

## Constitutional Compliance Checklist

- [ ] **Transparency**: All AI results show clear rationale and confidence
- [ ] **Legal Risk Minimization**: No original terms text stored anywhere
- [ ] **User Benefit**: Focus on unfair clauses, not just legal compliance
- [ ] **Module Separation**: Preprocessing, AI, and UI are strictly isolated
- [ ] **Data Privacy**: Only processed results and patterns are persisted

## Support

For technical issues or questions:
- Check the troubleshooting section in each module's README
- Review API documentation in `contracts/api.yaml`
- Consult the constitution at `.specify/memory/constitution.md`
- Contact development team for architectural guidance

This quickstart gets you running with the Terms Watcher MVP while maintaining all constitutional requirements for transparency, privacy, and module separation.