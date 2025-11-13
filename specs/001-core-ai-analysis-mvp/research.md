# Research: Core AI Analysis MVP

**Feature**: Core AI Analysis MVP  
**Phase**: 0 - Research and Technology Validation  
**Date**: 2025-11-05

## Research Tasks Completed

### 1. Gemini API Integration for Legal Text Analysis

**Decision**: Use Google Gemini Pro API for contextual legal text analysis  
**Rationale**: 
- Excellent Natural Language Understanding capabilities for complex legal text
- Built-in content safety and ethical guidelines alignment
- Cost-effective compared to OpenAI GPT-4 for batch processing
- Strong context window (32k tokens) sufficient for typical terms documents
- Google Cloud integration provides reliable enterprise-grade service

**Alternatives Considered**:
- OpenAI GPT-4: Higher cost, similar capabilities
- Claude-3: Good legal reasoning but limited API availability in target markets
- Open-source models (Llama, Mistral): Insufficient legal domain fine-tuning

**Implementation Approach**:
- Use `@google/generative-ai` npm package
- Implement structured prompting for consistent risk categorization
- Include few-shot examples of mobile gaming terms analysis
- Implement retry logic and rate limiting for API reliability

### 2. Feature-Sliced Design (FSD) Architecture for Next.js

**Decision**: Implement FSD methodology adapted for Next.js app router  
**Rationale**:
- Enforces constitutional requirement for strict module separation
- Clear dependency direction prevents architectural drift
- Enables independent testing and development of preprocessing, AI, and UI modules
- Scales well for future feature additions while maintaining boundaries

**Alternatives Considered**:
- Traditional Next.js structure: Insufficient separation of concerns
- Monorepo with separate packages: Overkill for MVP, adds deployment complexity
- Clean Architecture: Too complex for current scope, harder team onboarding

**Implementation Approach**:
- Use app/ layer for Next.js routing and page components
- Implement shared/ layer for reusable UI components and utilities
- Create entities/ layer for core business logic (User, Analysis, Quota)
- Build features/ layer for isolated functionality modules
- Compose widgets/ layer for page-level component integration

### 3. Mobile Gaming Terms Analysis Patterns

**Decision**: Focus initial clause pattern recognition on mobile gaming industry  
**Rationale**:
- Well-documented predatory practices in mobile gaming terms
- Clear patterns of user-unfriendly clauses (in-app purchases, data collection, account termination)
- Smaller domain allows for more accurate initial AI training
- High user value due to widespread mobile gaming adoption

**Key Patterns Identified**:
- Arbitrary account termination clauses
- Excessive data collection permissions
- Unclear in-app purchase refund policies
- Forced arbitration and class action waivers
- Unilateral terms modification rights
- Virtual currency forfeiture conditions

**Implementation Approach**:
- Create structured prompt templates for each pattern category
- Implement confidence scoring for pattern matches
- Use examples from known problematic mobile gaming terms
- Build pattern library that can expand to other industries

### 4. OAuth2 Implementation with Naver and Google

**Decision**: Use NextAuth.js with custom Naver provider alongside Google  
**Rationale**:
- NextAuth.js provides robust OAuth2 flow management
- Google provider built-in, Naver provider can be custom implemented
- Session management integrates well with Next.js architecture
- Meets constitutional requirement for controlled access

**Alternatives Considered**:
- Supabase Auth: Limited Naver support, requires custom implementation
- Custom OAuth2 implementation: Security risks, unnecessary complexity
- Firebase Auth: Good features but adds Google dependency beyond Gemini

**Implementation Approach**:
- Use NextAuth.js v4 with JWT strategy
- Implement custom Naver OAuth2 provider
- Store session data in Supabase for quota tracking
- Implement middleware for route protection

### 5. Text Preprocessing for Legal Compliance

**Decision**: Implement aggressive text sanitization with hash-based deduplication  
**Rationale**:
- Constitutional requirement: no original terms text storage
- Hash-based approach allows deduplication without content storage
- Preprocessing enables consistent AI analysis input format
- Supports audit trail without privacy violations

**Implementation Approach**:
- Remove personally identifiable information (company names, specific products)
- Normalize text formatting and structure
- Generate content hash for deduplication without storing content
- Extract only structural elements and clause categories for analysis
- Pass sanitized, anonymized text to AI module

### 6. Performance and Scaling Architecture

**Decision**: Implement async processing with job queue for analysis  
**Rationale**:
- 30-second target requires non-blocking UI
- Gemini API calls can be unpredictable in timing
- Queue system enables better error handling and retry logic
- Supports future scaling to multiple AI providers

**Alternatives Considered**:
- Synchronous processing: Poor user experience for longer documents
- Client-side streaming: Security risks with API keys, quota tracking complexity
- WebSocket real-time updates: Unnecessary complexity for current scope

**Implementation Approach**:
- Use Redis or Supabase Realtime for job queue
- Implement analysis progress tracking
- Provide estimated completion times
- Enable graceful degradation on API failures

## Technical Specifications Resolved

### Environment Configuration
- Node.js 18+ with TypeScript 5.x
- Next.js 14+ with app router
- pnpm package manager for efficient dependency management
- Vercel deployment for seamless CI/CD

### Key Dependencies Finalized
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@google/generative-ai": "^0.2.0",
    "@supabase/supabase-js": "^2.0.0",
    "next-auth": "^4.24.0",
    "zustand": "^4.4.0",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.3.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Database Schema Requirements
- Users table: OAuth provider data, daily quota tracking
- Analysis sessions: metadata without original content
- Risk assessments: categorized findings with confidence scores
- Usage tracking: quota management and billing preparation

### API Integration Specifications
- Gemini Pro API with structured prompting
- Rate limiting: 60 requests/minute per API key
- Error handling: retry logic with exponential backoff
- Cost optimization: token usage tracking and optimization

## Phase 0 Complete ✅

All technical unknowns resolved. Ready to proceed to Phase 1 design and contract generation.