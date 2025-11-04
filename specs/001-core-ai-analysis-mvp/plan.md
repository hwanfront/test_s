# Implementation Plan: Core AI Analysis MVP

**Branch**: `001-core-ai-analysis-mvp` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-ai-analysis-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Core AI analysis functionality for Terms Watcher MVP enabling users to paste terms and conditions text and receive transparent, categorized risk analysis. Technical approach uses Next.js with Feature-Sliced Design, strict module separation (preprocessing → AI analysis → UI presentation), Gemini API integration, and Supabase for user management and quota tracking. System prioritizes legal compliance by storing only analysis outcomes, never original terms text.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 18+  
**Primary Dependencies**: Next.js 14+, React 18+, Tailwind CSS 3.x, shadcn/ui, Zustand, Supabase client, Google Gemini API  
**Storage**: Supabase (PostgreSQL) for user accounts, analysis records, and quota tracking  
**Testing**: Jest + React Testing Library (RTL) for component testing, focusing on user interactions  
**Target Platform**: Web application (responsive design for desktop and mobile browsers)
**Project Type**: Web application with full-stack Next.js architecture  
**Performance Goals**: <30s analysis time for 15k character terms, <200ms UI response time, 1000+ concurrent users  
**Constraints**: No original terms text storage, 99% uptime dependency on Gemini API, OAuth2-only authentication  
**Scale/Scope**: MVP targeting mobile gaming terms analysis, 10k+ daily active users, 3 free analyses per user per day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Principle of Transparency ✅ PASS (Re-validated)
- AI analysis results MUST show clear categorization and rationale
- System MUST display limitations of analysis clearly
- **Implementation Verified**: 
  - API returns detailed `rationale` field for each risk assessment
  - UI displays confidence scores and analysis limitations
  - Results include suggested actions and context explanations
  - QuickStart documents transparency requirements

### II. Principle of Legal Risk Minimization ✅ PASS (Re-validated)
- System MUST NOT store original terms text
- Only analysis outcomes and generalized patterns SHALL be persisted
- **Implementation Verified**: 
  - Preprocessing module generates content hash then discards original
  - Database schema contains no fields for original content storage
  - API contracts specify only processed results and metadata
  - Data model enforces hash-based deduplication without content retention

### III. Principle of Substantive User Benefit ✅ PASS (Re-validated)
- System SHALL prioritize detection of disadvantageous clauses
- Focus on fairness deviation, not just legal compliance
- **Implementation Verified**: 
  - Mobile gaming clause patterns target user-unfriendly practices
  - Risk categories include fairness assessment beyond legal minimums
  - Analysis summary provides actionable recommendations
  - Pattern library focuses on practical user protection

### Module Separation (NON-NEGOTIABLE) ✅ PASS (Re-validated)
- Text Preprocessing Module: Isolated input processing and sanitization
- AI Judgment Module: Isolated Gemini API calls and pattern matching  
- UI Presentation Module: Isolated result display and user interaction
- **Implementation Verified**: 
  - FSD architecture enforces strict module boundaries
  - Features directory separates preprocessing, AI analysis, and display
  - API contracts prevent cross-module data contamination
  - Testing strategy validates independent module operation

**FINAL GATE STATUS**: ✅ ALL CHECKS PASS - Design maintains constitutional compliance

## Project Structure

### Documentation (this feature)

```text
specs/001-core-ai-analysis-mvp/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Feature-Sliced Design (FSD) Web Application Structure
src/
├── app/                    # Next.js app router pages and layouts
│   ├── (auth)/            # OAuth2 authentication routes
│   ├── api/               # API routes for analysis and quota
│   ├── analysis/          # Analysis interface and results pages
│   └── layout.tsx         # Root layout with providers
├── shared/                # Shared utilities, UI components, and libs
│   ├── ui/                # shadcn/ui components and design system
│   ├── lib/               # Utility functions and configurations
│   └── config/            # Environment and API configurations
├── entities/              # Business entities (User, Analysis, Quota)
│   ├── user/              # User entity with auth and profile logic
│   ├── analysis/          # Analysis session and results entity
│   └── quota/             # Usage quota tracking entity
├── features/              # Isolated feature implementations
│   ├── text-preprocessing/ # Text sanitization and processing
│   ├── ai-analysis/       # Gemini API integration and risk scoring
│   ├── auth-oauth/        # OAuth2 authentication flow
│   └── analysis-display/  # Results presentation and highlighting
└── widgets/               # Page-level component compositions
    ├── analysis-form/     # Text input and submission widget
    ├── auth-widget/       # Login/logout interface widget
    └── results-dashboard/ # Analysis results and history widget

tests/
├── __mocks__/             # Mock implementations for external APIs
├── integration/           # Feature integration tests
├── unit/                  # Component and utility unit tests
└── setup/                 # Test configuration and helpers

# Configuration files at root
├── package.json           # pnpm package management
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Jest testing configuration
└── .env.local             # Environment variables (Supabase, Gemini API keys)
```

**Structure Decision**: Selected Feature-Sliced Design (FSD) web application structure to ensure strict module separation required by constitution. FSD layers (app, shared, entities, features, widgets) provide clear dependency boundaries and enable independent development/testing of preprocessing, AI analysis, and UI presentation modules.

