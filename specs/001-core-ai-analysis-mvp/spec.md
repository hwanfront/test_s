# Feature Specification: Core AI Analysis MVP

**Feature Branch**: `001-core-ai-analysis-mvp`  
**Created**: 2025-11-05  
**Status**: Draft  
**Input**: User description: "Draft a plan for the initial phase (Phase 1) of the Terms Watcher project, focusing on implementing the core AI analysis functionality (MVP) and setting up the fundamental technical stack."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Terms Analysis (Priority: P1)

A user can paste terms and conditions text into the application and receive a highlighted analysis showing potentially disadvantageous clauses with clear risk categorization and rationale.

**Why this priority**: This is the core value proposition of Terms Watcher - providing immediate, transparent analysis of terms and conditions to protect user rights.

**Independent Test**: Can be fully tested by pasting sample mobile game terms, receiving highlighted risk points with clear explanations, and verifying no original text is stored (only analysis results).

**Acceptance Scenarios**:

1. **Given** a user has terms and conditions text, **When** they paste it into the analysis interface, **Then** the system processes the text and displays risk highlights with clear categorization
2. **Given** the analysis is complete, **When** user views results, **Then** each highlighted clause shows risk level, category, and detailed rationale for the assessment
3. **Given** analysis results are displayed, **When** user reviews the output, **Then** limitations of the AI analysis are clearly stated

---

### User Story 2 - Authentication and Usage Limits (Priority: P2)

A user can authenticate via Naver or Google OAuth2 to access their daily free analysis quota and track usage.

**Why this priority**: Essential for implementing the freemium model and preventing API abuse while maintaining user convenience.

**Independent Test**: Can be tested by logging in with OAuth2, performing 3 analyses to verify free quota, and confirming quota reset mechanism.

**Acceptance Scenarios**:

1. **Given** a new user visits the site, **When** they attempt to analyze terms, **Then** they are prompted to authenticate via Naver or Google
2. **Given** a user is authenticated, **When** they perform analysis, **Then** their daily quota (3 free analyses) is tracked and displayed
3. **Given** a user has exhausted free quota, **When** they attempt another analysis, **Then** they are informed of the 50 KRW charge for additional analyses

---

### User Story 3 - Text Preprocessing and Privacy (Priority: P3)

The system preprocesses and analyzes terms text without storing the original content, only retaining analysis outcomes and patterns to ensure legal compliance.

**Why this priority**: Critical for legal risk minimization (Principle II) but can be implemented and verified after core functionality is working.

**Independent Test**: Can be tested by verifying that only processed analysis results are stored in the database, not original terms text.

**Acceptance Scenarios**:

1. **Given** terms text is submitted for analysis, **When** preprocessing occurs, **Then** only sanitized, processed data is passed to the AI module
2. **Given** analysis is complete, **When** checking data storage, **Then** only analysis outcomes and generalized patterns are persisted, not original text
3. **Given** analysis results exist, **When** reviewing stored data, **Then** no identifiable terms text can be recovered from the database

### Edge Cases

- What happens when terms text exceeds reasonable length limits (>50,000 characters)?
- How does system handle non-English terms or mixed-language content?
- What occurs when Gemini API is unavailable or returns errors?
- How are malformed or non-terms text inputs handled?
- What happens when user quota data is inconsistent or corrupted?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept terms and conditions text via copy-paste interface
- **FR-002**: System MUST process text through isolated preprocessing module without storing original content
- **FR-003**: System MUST analyze processed text using Gemini API to identify potentially unfair clauses
- **FR-004**: System MUST present analysis results with clear risk categorization and detailed rationale
- **FR-005**: System MUST authenticate users via OAuth2 (Naver and Google only)
- **FR-006**: System MUST track daily analysis quota (3 free per authenticated user)
- **FR-007**: System MUST display analysis limitations and confidence levels clearly
- **FR-008**: System MUST maintain strict module separation between preprocessing, AI analysis, and UI presentation
- **FR-009**: System MUST store only analysis outcomes and generalized patterns, never original terms text
- **FR-010**: System MUST use Feature-Sliced Design (FSD) architecture for modularity
- **FR-011**: System MUST implement responsive UI using Tailwind CSS and shadcn/ui components
- **FR-012**: System MUST focus initial analysis patterns on mobile gaming terms and conditions

### Key Entities

- **User**: Authenticated entity with OAuth2 credentials, daily quota tracking, and analysis history
- **Analysis Session**: Individual terms analysis with input metadata, processing results, and risk assessments
- **Risk Assessment**: Categorized evaluation of specific clauses with severity, rationale, and confidence scores
- **Usage Quota**: Daily limit tracking per user with reset mechanism and overage handling
- **Clause Pattern**: Generalized unfair clause templates for matching and analysis (initially mobile gaming focused)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete terms analysis from paste to results in under 30 seconds for typical mobile game terms (5,000-15,000 characters)
- **SC-002**: System correctly identifies and highlights at least 80% of known problematic clauses in test mobile game terms datasets
- **SC-003**: Analysis results display clear rationale and risk categorization that 90% of test users can understand without legal background
- **SC-004**: No original terms text can be recovered from system storage, only processed analysis outcomes and patterns
- **SC-005**: Daily quota system accurately tracks and enforces 3 free analyses per authenticated user with proper reset
- **SC-006**: System maintains 99% uptime for core analysis functionality during normal Gemini API availability
- **SC-007**: Module separation architecture allows independent testing and deployment of preprocessing, AI analysis, and UI components