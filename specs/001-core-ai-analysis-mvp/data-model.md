# Data Model: Core AI Analysis MVP

**Feature**: Core AI Analysis MVP  
**Phase**: 1 - Data Design and Entity Modeling  
**Date**: 2025-11-05

## Core Entities

### User
**Purpose**: Authenticated user with OAuth2 credentials and usage tracking

```typescript
interface User {
  id: string;                    // UUID primary key
  email: string;                 // Email from OAuth provider
  name: string;                  // Display name from OAuth provider
  provider: 'google' | 'naver';  // OAuth provider type
  providerId: string;            // Provider-specific user ID
  avatarUrl?: string;            // Profile picture URL
  createdAt: Date;               // Account creation timestamp
  lastLoginAt: Date;             // Last successful login
  isActive: boolean;             // Account status flag
}
```

**Validation Rules**:
- Email must be valid format and unique
- Provider + providerId combination must be unique
- Name required, 1-100 characters
- CreatedAt and lastLoginAt must be valid timestamps

**Relationships**:
- One User has many AnalysisSessions
- One User has one DailyQuota (current day)
- One User has many UsageRecords (historical)

### AnalysisSession
**Purpose**: Individual terms analysis session with metadata and results

```typescript
interface AnalysisSession {
  id: string;                    // UUID primary key
  userId: string;                // Foreign key to User
  contentHash: string;           // SHA-256 hash of processed content
  contentLength: number;         // Character count of original input
  status: 'processing' | 'completed' | 'failed' | 'expired';
  riskScore: number;             // Overall risk score 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;       // AI confidence level 0-100
  processingTimeMs: number;      // Analysis duration
  createdAt: Date;               // Session start time
  completedAt?: Date;            // Analysis completion time
  expiresAt: Date;               // Result expiration (7 days)
  errorMessage?: string;         // Error details if failed
}
```

**Validation Rules**:
- ContentHash must be 64-character hexadecimal (SHA-256)
- ContentLength must be positive integer, max 100,000
- RiskScore and confidenceScore must be 0-100
- ProcessingTimeMs must be positive integer
- ExpiresAt must be 7 days from createdAt

**State Transitions**:
- `processing` → `completed` (successful analysis)
- `processing` → `failed` (API error or processing failure)
- `completed` → `expired` (after 7 days)
- `failed` → `expired` (after 7 days)

### RiskAssessment
**Purpose**: Individual clause risk evaluation with categorization

```typescript
interface RiskAssessment {
  id: string;                    // UUID primary key
  sessionId: string;             // Foreign key to AnalysisSession
  clauseCategory: string;        // Risk category (e.g., 'account-termination')
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;             // Clause-specific risk score 0-100
  confidenceScore: number;       // AI confidence for this finding 0-100
  summary: string;               // Brief description of the risk
  rationale: string;             // Detailed explanation of why it's risky
  suggestedAction?: string;      // Recommended user action
  startPosition: number;         // Character position in original (for highlighting)
  endPosition: number;           // End character position
  createdAt: Date;               // Assessment timestamp
}
```

**Validation Rules**:
- ClauseCategory must be from predefined set (see Clause Categories below)
- RiskScore and confidenceScore must be 0-100
- Summary required, 10-200 characters
- Rationale required, 50-1000 characters
- Position values must be non-negative integers

**Relationships**:
- Many RiskAssessments belong to one AnalysisSession
- Ordered by startPosition for UI display

### DailyQuota
**Purpose**: Daily usage quota tracking per user

```typescript
interface DailyQuota {
  id: string;                    // UUID primary key
  userId: string;                // Foreign key to User
  date: string;                  // Date in YYYY-MM-DD format
  freeAnalysesUsed: number;      // Number of free analyses used (0-3)
  paidAnalysesUsed: number;      // Number of paid analyses used
  freeAnalysesLimit: number;     // Free analysis limit (default: 3)
  lastResetAt: Date;             // Last quota reset timestamp
  createdAt: Date;               // Quota record creation
  updatedAt: Date;               // Last quota update
}
```

**Validation Rules**:
- Date must be valid YYYY-MM-DD format
- User + date combination must be unique
- FreeAnalysesUsed must be 0 <= value <= freeAnalysesLimit
- PaidAnalysesUsed must be non-negative
- FreeAnalysesLimit must be positive (default: 3)

**Business Logic**:
- Reset freeAnalysesUsed to 0 daily at midnight KST
- Track overage for billing purposes
- Enforce limits before analysis processing

### ClausePattern
**Purpose**: Predefined unfair clause patterns for AI matching

```typescript
interface ClausePattern {
  id: string;                    // UUID primary key
  category: string;              // Pattern category
  name: string;                  // Human-readable pattern name
  description: string;           // Pattern description
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];            // Key terms for pattern matching
  promptTemplate: string;        // AI prompt template for detection
  isActive: boolean;             // Pattern enabled/disabled
  industry: string;              // Target industry (e.g., 'mobile-gaming')
  version: number;               // Pattern version for updates
  createdAt: Date;               // Pattern creation time
  updatedAt: Date;               // Last pattern update
}
```

**Validation Rules**:
- Category must be from predefined set
- Name and description required, non-empty
- Keywords array must have at least one element
- PromptTemplate must be valid prompt format
- Industry must be from supported list
- Version must be positive integer

## Clause Categories

### Mobile Gaming Focused Categories (Phase 1)

1. **account-termination**: Arbitrary account closure policies
2. **virtual-currency**: Virtual currency forfeiture and devaluation
3. **data-collection**: Excessive personal data collection
4. **purchase-refunds**: Unclear or restrictive refund policies
5. **content-ownership**: User-generated content ownership claims
6. **liability-limitation**: Excessive liability disclaimers
7. **arbitration-clauses**: Forced arbitration and class action waivers
8. **terms-modification**: Unilateral terms change policies
9. **age-restrictions**: Unclear age verification and parental consent
10. **service-interruption**: Service availability and interruption policies

### Risk Level Guidelines

- **Critical (90-100)**: Potentially illegal or highly unfair clauses
- **High (70-89)**: Significantly disadvantageous to users
- **Medium (40-69)**: Somewhat unfavorable but not uncommon
- **Low (10-39)**: Minor concerns or standard industry practices

## Database Schema (Supabase PostgreSQL)

```sql
-- Users table with OAuth2 data
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(10) NOT NULL CHECK (provider IN ('google', 'naver')),
  provider_id VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(provider, provider_id)
);

-- Analysis sessions without original content
CREATE TABLE analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) NOT NULL,
  content_length INTEGER NOT NULL CHECK (content_length > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'processing' 
    CHECK (status IN ('processing', 'completed', 'failed', 'expired')),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  error_message TEXT
);

-- Risk assessments for individual clauses
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  clause_category VARCHAR(50) NOT NULL,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  summary VARCHAR(200) NOT NULL,
  rationale TEXT NOT NULL,
  suggested_action TEXT,
  start_position INTEGER NOT NULL CHECK (start_position >= 0),
  end_position INTEGER NOT NULL CHECK (end_position >= start_position),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily quota tracking
CREATE TABLE daily_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  free_analyses_used INTEGER NOT NULL DEFAULT 0 CHECK (free_analyses_used >= 0),
  paid_analyses_used INTEGER NOT NULL DEFAULT 0 CHECK (paid_analyses_used >= 0),
  free_analyses_limit INTEGER NOT NULL DEFAULT 3 CHECK (free_analyses_limit > 0),
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Clause patterns for AI analysis
CREATE TABLE clause_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  keywords JSONB NOT NULL,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  industry VARCHAR(50) NOT NULL DEFAULT 'mobile-gaming',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX idx_analysis_sessions_expires_at ON analysis_sessions(expires_at);
CREATE INDEX idx_risk_assessments_session_id ON risk_assessments(session_id);
CREATE INDEX idx_daily_quotas_user_date ON daily_quotas(user_id, date);
CREATE INDEX idx_clause_patterns_category ON clause_patterns(category);
CREATE INDEX idx_clause_patterns_industry ON clause_patterns(industry, is_active);
```

## Data Flows

### Analysis Flow
1. User submits terms text → Text preprocessing
2. Generate content hash → Check for existing analysis
3. Create AnalysisSession with 'processing' status
4. Process text through AI module → Generate RiskAssessments
5. Update AnalysisSession to 'completed' with overall scores
6. Return results to UI for presentation

### Quota Management Flow
1. User requests analysis → Check DailyQuota
2. If under free limit → Allow and increment freeAnalysesUsed
3. If over free limit → Require payment or deny
4. Daily reset process → Reset freeAnalysesUsed to 0

### Data Retention
- AnalysisSessions expire after 7 days (automatic cleanup)
- RiskAssessments cascade delete with sessions
- DailyQuotas retained for billing history
- Users and ClausePatterns persist indefinitely

## Privacy and Compliance

### Data Minimization
- No original terms text stored in database
- Only processed content hashes and analysis results
- Personal data limited to OAuth2 profile information

### Content Hash Strategy
- SHA-256 hash of preprocessed, anonymized text
- Enables deduplication without content storage
- Supports analysis caching while maintaining privacy

### Legal Compliance
- GDPR: User data portability and deletion rights
- CCPA: Data access and deletion compliance
- Korean Personal Information Protection Act compliance
- No copyright infringement through text storage avoidance

## Validation and Constraints

### Business Rules
- Maximum 3 free analyses per user per day
- Analysis results expire after 7 days
- Maximum input text length: 100,000 characters
- Minimum confidence score for display: 60%

### Technical Constraints
- Database connection pooling for concurrent users
- Automatic cleanup of expired sessions
- Rate limiting on analysis requests
- Content hash collision handling (extremely unlikely but graceful degradation)

This data model ensures constitutional compliance while enabling efficient analysis workflow and user quota management.