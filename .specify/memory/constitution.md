<!--
Sync Impact Report:
- Version change: Initial → 1.0.0
- Modified principles: N/A (initial creation)
- Added sections: Core Principles, Technical Architecture, Monetization Model, Development Methodology, Governance
- Removed sections: N/A
- Templates requiring updates: ⚠ Plan template, spec template, tasks template need review for consistency
- Follow-up TODOs: None
-->

# Terms Watcher (Provisional) Constitution

## Core Principles

### I. Principle of Transparency
All AI analysis results (risk scores and warnings) MUST be presented with clear categorization and rationale, ensuring users understand the basis of the judgment. Limitations of the analysis MUST be clearly stated.

**Rationale**: User trust depends on understanding how decisions are made. Black-box AI recommendations without context undermine user agency and informed consent.

### II. Principle of Legal Risk Minimization
The service MUST NOT store or utilize the full text of other services' terms and conditions. Only the AI's analysis outcomes and generalized unfair clause patterns SHALL be used to minimize copyright and data-related legal disputes.

**Rationale**: Legal compliance requires avoiding potential copyright infringement while maintaining analytical value through processed insights rather than raw content storage.

### III. Principle of Substantive User Benefit
The system SHALL prioritize the detection and warning of potentially disadvantageous clauses to the user, even if not strictly illegal. The core criteria for judgment SHALL be deviation from fairness and standard agreements.

**Rationale**: User protection extends beyond legal compliance to include practical fairness and industry standard deviations that may disadvantage users.

## Technical Architecture

### Technology Stack Requirements
- **Framework**: Next.js for full-stack capabilities, SSR-based performance optimization, and efficient routing
- **Styling**: Tailwind CSS for utility-first styling; shadcn/ui for accessible, customizable components
- **Architecture**: Feature-Sliced Design (FSD) for modularity, scalability, and strict dependency rules
- **Testing**: Jest + React Testing Library (RTL) focusing on user perspective
- **Package Management**: pnpm for efficient content-addressable storage and faster installations
- **AI/Data**: Gemini API for Natural Language Understanding and contextual legal text analysis
- **Database**: Supabase (PostgreSQL) for user accounts, analysis records, and charging history
- **State Management**: Zustand for simple, lightweight global state management
- **Error Monitoring**: Sentry for comprehensive error logging and monitoring
- **Authentication**: OAuth2 (Naver and Google only) for controlled access and usage limits

## Monetization Model

### Pay-as-you-go Freemium Structure
- **Purpose**: Cover minimum operational costs and prevent API request overload while prioritizing public interest over profit
- **Initial Plan**: 3 free analyses per day after login, 50 KRW per additional analysis
- **Philosophy**: Service prioritizes user protection and public benefit over revenue generation

## Development Methodology

### Module Separation (NON-NEGOTIABLE)
Strict separation MUST be maintained between:
- Text Preprocessing Module
- AI Judgment Module (Gemini API calls)
- UI Presentation Module

**Rationale**: Clear boundaries ensure testability, maintainability, and enable independent scaling of components.

### Deployment Pipeline
Continuous Integration/Continuous Delivery (CI/CD) via GitHub Actions with Vercel deployment for automation and reliability.

## Governance

This constitution supersedes all other development practices. All code reviews and feature implementations MUST verify compliance with core principles. Amendments require:
1. Documentation of rationale and impact
2. Version increment following semantic versioning
3. Update of dependent templates and guidance files

**Version**: 1.0.0 | **Ratified**: 2025-11-04 | **Last Amended**: 2025-11-04
