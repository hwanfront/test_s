---

description: "Task list for Core AI Analysis MVP implementation with FSD architecture and mandatory testing"
---

# Tasks: Core AI Analysis MVP

**Input**: Design documents from `/specs/001-core-ai-analysis-mvp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: All tasks include mandatory testing with Jest and React Testing Library (RTL) as requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story, following Feature-Sliced Design (FSD) architecture.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Feature-Sliced Design (FSD) structure as defined in plan.md:
- **App Layer**: `src/app/` (Next.js pages and API routes)
- **Shared Layer**: `src/shared/` (UI components, utilities, config)
- **Entities Layer**: `src/entities/` (Business entities)
- **Features Layer**: `src/features/` (Isolated feature implementations)
- **Widgets Layer**: `src/widgets/` (Page-level compositions)
- **Tests**: `tests/` (Unit, integration, and mock implementations)

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Initialize Next.js project with FSD architecture and core dependencies

- [x] T001 Create Feature-Sliced Design (FSD) directory structure per plan.md
- [x] T002 Initialize Next.js 14+ project with TypeScript 5.x and pnpm package manager
- [x] T003 [P] Install and configure core dependencies (React 18+, Tailwind CSS 3.x, shadcn/ui)
- [x] T004 [P] Install AI and database dependencies (Gemini API, Supabase client)
- [x] T005 [P] Install authentication dependencies (NextAuth.js, OAuth2 providers)
- [x] T006 [P] Install testing framework (Jest, React Testing Library, testing utilities)
- [x] T007 [P] Configure TypeScript with strict mode and path aliases for FSD layers
- [x] T008 [P] Configure Tailwind CSS with shadcn/ui integration
- [x] T009 [P] Setup Jest configuration with React Testing Library and FSD path mapping
- [x] T010 [P] Configure ESLint and Prettier for code quality and formatting
- [x] T011 [P] Setup environment configuration files (.env.local template, types)
- [x] T012 [P] Create root layout with providers in src/app/layout.tsx
- [x] T013 [P] Initialize landing page in src/app/page.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database and Schema Setup

- [x] T014 Setup Supabase project and configure connection in src/shared/config/supabase.ts
- [x] T015 Create database schema migration scripts based on data-model.md
- [x] T016 [P] Implement User entity model in src/entities/user/model/types.ts
- [x] T017 [P] Implement AnalysisSession entity model in src/entities/analysis/model/types.ts
- [x] T018 [P] Implement DailyQuota entity model in src/entities/quota/model/types.ts
- [x] T019 [P] Implement RiskAssessment entity model in src/entities/analysis/model/types.ts
- [x] T020 [P] Implement ClausePattern entity model in src/entities/analysis/model/types.ts

### Authentication Framework

- [x] T021 Configure NextAuth.js with Google and Naver providers in src/app/api/auth/[...nextauth]/route.ts
- [x] T022 [P] Create authentication middleware in src/shared/lib/auth/middleware.ts
- [x] T023 [P] Implement session management utilities in src/shared/lib/auth/session.ts
- [x] T024 [P] Create authentication context provider in src/shared/lib/auth/provider.tsx

### API Infrastructure

- [x] T025 [P] Setup API error handling middleware in src/shared/lib/api/error-handler.ts
- [x] T026 [P] Create API response utilities in src/shared/lib/api/response.ts
- [x] T027 [P] Implement rate limiting middleware in src/shared/lib/api/rate-limit.ts
- [x] T028 [P] Setup API validation utilities with Zod in src/shared/lib/api/validation.ts

### External Service Configuration

- [x] T029 Configure Google Gemini API client in src/shared/config/gemini.ts
- [x] T030 [P] Setup error monitoring with Sentry in src/shared/config/sentry.ts
- [x] T031 [P] Create environment variables validation in src/shared/config/env.ts

### Testing Infrastructure

- [x] T032 [P] Create mock implementations for external APIs in tests/__mocks__/
- [x] T033 [P] Setup test database utilities in tests/setup/database.ts
- [x] T034 [P] Create testing helpers for authentication in tests/setup/auth.ts
- [x] T035 [P] Setup test environment configuration in tests/setup/env.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Terms Analysis (Priority: P1) 🎯 MVP

**Goal**: Enable users to paste terms text and receive AI-powered risk analysis with transparent categorization and rationale

**Independent Test**: Paste sample mobile game terms, receive highlighted risk points with explanations, verify no original text storage

### Tests for User Story 1 (Mandatory) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T036 [P] [US1] Contract test for POST /api/analysis endpoint in tests/integration/analysis-api.test.ts
- [x] T037 [P] [US1] Contract test for GET /api/analysis/{sessionId} endpoint in tests/integration/analysis-api.test.ts
- [x] T038 [P] [US1] Unit test for text preprocessing module in tests/unit/features/text-preprocessing.test.ts
- [x] T039 [P] [US1] Unit test for AI analysis module in tests/unit/features/ai-analysis.test.ts
- [x] T040 [P] [US1] Unit test for analysis display components in tests/unit/features/analysis-display.test.ts
- [x] T041 [P] [US1] Integration test for complete analysis workflow in tests/integration/analysis-workflow.test.ts
- [x] T042 [P] [US1] Component test for analysis form widget in tests/unit/widgets/analysis-form.test.tsx
- [x] T043 [P] [US1] Component test for results dashboard widget in tests/unit/widgets/results-dashboard.test.tsx

### Module 1: Text Preprocessing (Constitutional Isolation)

- [ ] T044 [P] [US1] Implement text preprocessor core logic in src/features/text-preprocessing/lib/preprocessor.ts
- [ ] T045 [P] [US1] Implement content hasher (SHA-256) in src/features/text-preprocessing/lib/content-hasher.ts
- [ ] T046 [P] [US1] Implement text sanitizer for anonymization in src/features/text-preprocessing/lib/text-sanitizer.ts
- [ ] T047 [P] [US1] Create preprocessing React hook in src/features/text-preprocessing/hooks/use-preprocessing.ts
- [ ] T048 [US1] Implement preprocessing API utilities in src/features/text-preprocessing/lib/api.ts

### Module 2: AI Analysis (Constitutional Isolation)

- [ ] T049 [P] [US1] Implement Gemini API client in src/features/ai-analysis/lib/gemini-client.ts
- [ ] T050 [P] [US1] Implement clause pattern matcher in src/features/ai-analysis/lib/pattern-matcher.ts
- [ ] T051 [P] [US1] Implement structured prompt builder in src/features/ai-analysis/lib/prompt-builder.ts
- [ ] T052 [P] [US1] Implement AI response parser and validator in src/features/ai-analysis/lib/result-parser.ts
- [ ] T053 [US1] Create analysis service orchestrator in src/features/ai-analysis/lib/analysis-service.ts
- [ ] T054 [US1] Implement mobile gaming clause patterns seeder in src/features/ai-analysis/lib/pattern-seeder.ts

### Module 3: UI Presentation (Constitutional Isolation)

- [ ] T055 [P] [US1] Create risk highlight component in src/features/analysis-display/components/risk-highlight.tsx
- [ ] T056 [P] [US1] Create risk assessment card component in src/features/analysis-display/components/risk-card.tsx
- [ ] T057 [P] [US1] Create analysis summary component in src/features/analysis-display/components/analysis-summary.tsx
- [ ] T058 [P] [US1] Create confidence indicator component in src/features/analysis-display/components/confidence-indicator.tsx
- [ ] T059 [US1] Implement results viewer main component in src/features/analysis-display/components/results-viewer.tsx
- [ ] T060 [US1] Create analysis display React hooks in src/features/analysis-display/hooks/use-analysis-results.ts

### API Routes Implementation

- [ ] T061 [US1] Implement POST /api/analysis route in src/app/api/analysis/route.ts
- [ ] T062 [US1] Implement GET /api/analysis/[sessionId] route in src/app/api/analysis/[sessionId]/route.ts
- [ ] T063 [US1] Implement GET /api/analysis/[sessionId]/status route in src/app/api/analysis/[sessionId]/status/route.ts

### Widget Composition

- [ ] T064 [US1] Create analysis form widget in src/widgets/analysis-form/ui/analysis-form.tsx
- [ ] T065 [US1] Create analysis form state management in src/widgets/analysis-form/model/store.ts
- [ ] T066 [US1] Create results dashboard widget in src/widgets/results-dashboard/ui/results-dashboard.tsx
- [ ] T067 [US1] Create results dashboard state management in src/widgets/results-dashboard/model/store.ts

### Page Implementation

- [ ] T068 [US1] Create analysis interface page in src/app/analysis/page.tsx
- [ ] T069 [US1] Create analysis results page in src/app/analysis/[sessionId]/page.tsx

### Entity Services

- [ ] T070 [US1] Implement analysis entity service in src/entities/analysis/lib/analysis-service.ts
- [ ] T071 [US1] Implement analysis entity API client in src/entities/analysis/lib/api.ts

**Checkpoint**: User Story 1 complete - users can analyze terms and view results independently

---

## Phase 4: User Story 2 - Authentication and Usage Limits (Priority: P2)

**Goal**: Enable OAuth2 authentication with Google/Naver and implement daily quota tracking (3 free analyses)

**Independent Test**: Login with OAuth2, perform 3 analyses to verify quota, confirm quota reset and overage handling

### Tests for User Story 2 (Mandatory) ⚠️

- [ ] T072 [P] [US2] Contract test for GET /api/auth/session endpoint in tests/integration/auth-api.test.ts
- [ ] T073 [P] [US2] Contract test for GET /api/quota endpoint in tests/integration/quota-api.test.ts
- [ ] T074 [P] [US2] Unit test for OAuth authentication feature in tests/unit/features/auth-oauth.test.ts
- [ ] T075 [P] [US2] Unit test for quota management entity in tests/unit/entities/quota.test.ts
- [ ] T076 [P] [US2] Component test for auth widget in tests/unit/widgets/auth-widget.test.tsx
- [ ] T077 [P] [US2] Integration test for quota enforcement workflow in tests/integration/quota-workflow.test.ts

### OAuth2 Authentication Feature

- [ ] T078 [P] [US2] Implement Google OAuth2 provider configuration in src/features/auth-oauth/lib/google-provider.ts
- [ ] T079 [P] [US2] Implement custom Naver OAuth2 provider in src/features/auth-oauth/lib/naver-provider.ts
- [ ] T080 [P] [US2] Create authentication flow hooks in src/features/auth-oauth/hooks/use-auth.ts
- [ ] T081 [P] [US2] Create sign-in component in src/features/auth-oauth/components/sign-in.tsx
- [ ] T082 [P] [US2] Create sign-out component in src/features/auth-oauth/components/sign-out.tsx

### Quota Management Entity

- [ ] T083 [P] [US2] Implement quota calculation utilities in src/entities/quota/lib/quota-calculator.ts
- [ ] T084 [P] [US2] Implement quota validation service in src/entities/quota/lib/quota-validator.ts
- [ ] T085 [P] [US2] Create quota reset scheduler in src/entities/quota/lib/quota-scheduler.ts
- [ ] T086 [P] [US2] Implement quota API client in src/entities/quota/lib/api.ts

### User Entity Services

- [ ] T087 [P] [US2] Implement user profile service in src/entities/user/lib/user-service.ts
- [ ] T088 [P] [US2] Implement user API client in src/entities/user/lib/api.ts
- [ ] T089 [P] [US2] Create user profile hooks in src/entities/user/hooks/use-user.ts

### API Routes Implementation

- [ ] T090 [US2] Implement GET /api/auth/session route in src/app/api/auth/session/route.ts
- [ ] T091 [US2] Implement GET /api/quota route in src/app/api/quota/route.ts
- [ ] T092 [US2] Add quota enforcement to analysis routes (update T061, T062)

### Widget and Page Integration

- [ ] T093 [US2] Create auth widget in src/widgets/auth-widget/ui/auth-widget.tsx
- [ ] T094 [US2] Create auth widget state management in src/widgets/auth-widget/model/store.ts
- [ ] T095 [US2] Create authentication pages in src/app/(auth)/signin/page.tsx
- [ ] T096 [US2] Create sign-out confirmation page in src/app/(auth)/signout/page.tsx
- [ ] T097 [US2] Add authentication guards to analysis pages (update T068, T069)
- [ ] T098 [US2] Add quota display to analysis form widget (update T064)

### Shared UI Components

- [ ] T099 [P] [US2] Create quota indicator component in src/shared/ui/quota-indicator.tsx
- [ ] T100 [P] [US2] Create user avatar component in src/shared/ui/user-avatar.tsx
- [ ] T101 [P] [US2] Create provider icon component in src/shared/ui/provider-icon.tsx

**Checkpoint**: User Story 2 complete - authentication and quota system fully functional

---

## Phase 5: User Story 3 - Text Preprocessing and Privacy (Priority: P3)

**Goal**: Ensure strict privacy compliance by implementing secure text preprocessing that stores only analysis outcomes

**Independent Test**: Verify no original terms text can be recovered from database, only processed results and patterns

### Tests for User Story 3 (Mandatory) ⚠️

- [ ] T102 [P] [US3] Privacy compliance test for database content in tests/integration/privacy-compliance.test.ts
- [ ] T103 [P] [US3] Unit test for enhanced content hasher in tests/unit/features/text-preprocessing-enhanced.test.ts
- [ ] T104 [P] [US3] Integration test for data retention policies in tests/integration/data-retention.test.ts
- [ ] T105 [P] [US3] Unit test for audit trail functionality in tests/unit/shared/audit.test.ts

### Enhanced Preprocessing Security

- [ ] T106 [P] [US3] Implement enhanced anonymization in src/features/text-preprocessing/lib/enhanced-anonymizer.ts
- [ ] T107 [P] [US3] Create content deduplication service in src/features/text-preprocessing/lib/deduplication-service.ts
- [ ] T108 [P] [US3] Implement secure hash comparison in src/features/text-preprocessing/lib/hash-comparison.ts
- [ ] T109 [P] [US3] Create preprocessing audit logger in src/features/text-preprocessing/lib/audit-logger.ts

### Data Retention and Cleanup

- [ ] T110 [P] [US3] Implement analysis session cleanup service in src/shared/lib/cleanup/session-cleanup.ts
- [ ] T111 [P] [US3] Create data retention policy enforcement in src/shared/lib/cleanup/retention-policy.ts
- [ ] T112 [P] [US3] Implement automated cleanup scheduler in src/shared/lib/cleanup/cleanup-scheduler.ts

### Privacy Compliance Utilities

- [ ] T113 [P] [US3] Create privacy audit utilities in src/shared/lib/privacy/audit-utils.ts
- [ ] T114 [P] [US3] Implement data export functionality in src/shared/lib/privacy/data-export.ts
- [ ] T115 [P] [US3] Create data deletion utilities in src/shared/lib/privacy/data-deletion.ts

### API Routes for Privacy Compliance

- [ ] T116 [US3] Implement GET /api/privacy/audit route in src/app/api/privacy/audit/route.ts
- [ ] T117 [US3] Implement POST /api/privacy/export route in src/app/api/privacy/export/route.ts
- [ ] T118 [US3] Implement DELETE /api/privacy/delete route in src/app/api/privacy/delete/route.ts

### Enhanced Analysis Session Management

- [ ] T119 [US3] Add privacy compliance checks to analysis entity (update T070)
- [ ] T120 [US3] Implement secure session expiration in src/entities/analysis/lib/session-expiration.ts
- [ ] T121 [US3] Add privacy indicators to results display (update T059)

**Checkpoint**: User Story 3 complete - full privacy compliance and data protection implemented

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, performance optimization, and production readiness

### Documentation and Error Handling

- [ ] T122 [P] Create comprehensive API documentation in docs/api.md
- [ ] T123 [P] Add error boundary components in src/shared/ui/error-boundary.tsx
- [ ] T124 [P] Implement global error handling in src/shared/lib/error/global-handler.ts
- [ ] T125 [P] Create user-friendly error pages in src/app/error.tsx

### Performance Optimization

- [ ] T126 [P] Implement analysis result caching in src/shared/lib/cache/analysis-cache.ts
- [ ] T127 [P] Add loading states and skeletons to all components
- [ ] T128 [P] Optimize bundle size with dynamic imports
- [ ] T129 [P] Implement image optimization and CDN setup

### Security Hardening

- [ ] T130 [P] Add CSRF protection to API routes
- [ ] T131 [P] Implement request rate limiting across all endpoints
- [ ] T132 [P] Add security headers configuration in next.config.js
- [ ] T133 [P] Create security audit utilities in src/shared/lib/security/audit.ts

### Testing and Quality Assurance

- [ ] T134 [P] Add end-to-end tests with Playwright in tests/e2e/
- [ ] T135 [P] Implement test coverage reporting
- [ ] T136 [P] Add performance testing for analysis pipeline
- [ ] T137 [P] Create accessibility tests for all UI components

### Deployment and Monitoring

- [ ] T138 [P] Configure Vercel deployment with environment variables
- [ ] T139 [P] Setup Sentry error monitoring and alerts
- [ ] T140 [P] Implement health check endpoints
- [ ] T141 [P] Add logging and metrics collection

### Documentation Validation

- [ ] T142 Run quickstart.md validation and verify all setup steps
- [ ] T143 Update README.md with deployment and usage instructions
- [ ] T144 Create troubleshooting guide for common issues
- [ ] T145 Validate constitutional compliance checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1 but independently testable

### Critical Path Analysis

#### Sequential Implementation (Single Developer)
1. **Phase 1 + 2**: 15-20 tasks (Foundation) → ~3-4 days
2. **Phase 3 (US1)**: 36 tasks (Core MVP) → ~5-7 days
3. **Phase 4 (US2)**: 27 tasks (Auth + Quota) → ~3-4 days
4. **Phase 5 (US3)**: 20 tasks (Privacy) → ~2-3 days
5. **Phase 6**: 24 tasks (Polish) → ~2-3 days
**Total**: ~15-21 days

#### Parallel Implementation (3 Developers)
1. **Phase 1 + 2**: All devs → ~2-3 days
2. **Phase 3-5**: Parallel development:
   - Dev A: User Story 1 (MVP Core)
   - Dev B: User Story 2 (Auth/Quota)
   - Dev C: User Story 3 (Privacy)
   **Parallel Duration**: ~5-7 days
3. **Phase 6**: All devs → ~1-2 days
**Total**: ~8-12 days

### Testing Strategy

#### Test-First Approach (Mandatory)
- All test tasks marked with ⚠️ MUST be completed before implementation
- Tests should FAIL initially, then pass after implementation
- Each user story has comprehensive test coverage:
  - Contract tests for API endpoints
  - Unit tests for business logic
  - Component tests for UI elements
  - Integration tests for complete workflows

#### Testing Categories by Story
- **User Story 1**: 8 test tasks (T036-T043)
- **User Story 2**: 6 test tasks (T072-T077)
- **User Story 3**: 4 test tasks (T102-T105)
- **Cross-cutting**: 4 test tasks (T134-T137)
**Total Test Tasks**: 22 of 145 tasks (15%)

### Parallel Execution Examples

#### Phase 2 Foundational (High Parallelism)
```bash
# Database & Schema (can run together)
T014, T015, T016, T017, T018, T019, T020

# Authentication (independent)
T021, T022, T023, T024

# API Infrastructure (independent)
T025, T026, T027, T028

# External Services (independent)
T029, T030, T031

# Testing Setup (independent)
T032, T033, T034, T035
```

#### User Story 1 Implementation (Moderate Parallelism)
```bash
# Tests first (all parallel)
T036, T037, T038, T039, T040, T041, T042, T043

# Module implementations (parallel within modules)
Module 1: T044, T045, T046, T047 → T048
Module 2: T049, T050, T051, T052 → T053, T054
Module 3: T055, T056, T057, T058 → T059, T060

# API Routes (after modules)
T061, T062, T063

# Widgets (after API)
T064, T065, T066, T067

# Pages (after widgets)
T068, T069

# Entity Services (parallel with widgets)
T070, T071
```

## Implementation Strategy

### MVP First (Recommended)

1. **Complete Phase 1 + 2**: Foundation ready → ~2-3 days
2. **Complete User Story 1 only**: Core analysis functionality → ~5-7 days
3. **STOP and VALIDATE**: Test complete analysis workflow end-to-end
4. **Deploy MVP**: Users can analyze terms without authentication
5. **Iterate**: Add User Stories 2 and 3 incrementally

### Full Feature Delivery

1. **Foundation**: Phase 1 + 2 → ~2-3 days
2. **All User Stories**: Phases 3-5 in priority order → ~10-14 days
3. **Polish**: Phase 6 → ~1-2 days
4. **Production Deployment**: Full feature set ready

### Team Scaling Strategy

#### Single Developer
- Sequential implementation by priority
- Focus on getting US1 (MVP) working first
- Can skip US2/US3 initially for faster time-to-market

#### 2-3 Developers
- One developer per user story after foundation
- Shared work on foundation and polish phases
- Regular integration and testing

#### 4+ Developers
- Parallel work within user stories (modules, components, tests)
- Dedicated QA/testing developer
- DevOps developer for deployment and monitoring

## Constitutional Compliance Validation

### Module Separation Enforcement
- **Text Preprocessing**: `src/features/text-preprocessing/` (Tasks T044-T048)
- **AI Analysis**: `src/features/ai-analysis/` (Tasks T049-T054)
- **UI Presentation**: `src/features/analysis-display/` (Tasks T055-T060)
- **Isolation Tests**: T038, T039, T040 validate independent operation

### Privacy Compliance Verification
- **No Original Text Storage**: T102 validates database content
- **Content Hash Only**: T044, T045 implement hash-based deduplication
- **Data Retention**: T110-T112 implement cleanup policies
- **Audit Trail**: T113-T115 provide compliance verification

### Transparency Requirements
- **Clear Rationale**: T056, T057 display detailed explanations
- **Confidence Scores**: T058 shows AI confidence levels
- **Analysis Limitations**: T059 includes limitation disclosures
- **User Understanding**: T043 tests user comprehension

## Notes

- All tasks include specific file paths following FSD architecture
- Tests are mandatory and must be written before implementation
- Each user story is independently deployable and testable
- Constitutional principles are enforced through architecture and testing
- Parallel execution opportunities are clearly marked with [P]
- Module separation is strictly maintained throughout implementation
- Privacy compliance is built into the core architecture, not added later

This task breakdown ensures complete MVP implementation while maintaining all constitutional requirements and enabling flexible team scaling.