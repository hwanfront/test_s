import { PatternMatch } from './pattern-matcher'

export interface PromptContext {
  contentType: string
  industryFocus?: string
  jurisdiction?: string
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive'
}

/**
 * Builder for creating structured prompts for AI analysis
 * Constructs context-aware prompts based on content type and found patterns
 */
export class PromptBuilder {
  private industryContexts: Record<string, string>
  private contentTypeContexts: Record<string, string>

  constructor() {
    this.industryContexts = this.initializeIndustryContexts()
    this.contentTypeContexts = this.initializeContentTypeContexts()
  }

  /**
   * Build an analysis prompt for the AI
   * @param content The legal document content to analyze
   * @param patterns Previously found pattern matches
   * @param contentType Type of document (terms-and-conditions, privacy-policy, etc.)
   * @param context Additional context for the analysis
   * @returns Structured prompt for AI analysis
   */
  buildAnalysisPrompt(
    content: string,
    patterns: PatternMatch[],
    contentType: string = 'terms-and-conditions',
    context?: PromptContext
  ): string {
    const industryContext = this.getIndustryContext(context?.industryFocus)
    const documentContext = this.getDocumentContext(contentType)
    const patternContext = this.buildPatternContext(patterns)
    const analysisInstructions = this.buildAnalysisInstructions(context?.analysisDepth)

    return `
${this.buildSystemPrompt()}

${documentContext}

${industryContext}

CONTENT TO ANALYZE:
\`\`\`
${content}
\`\`\`

${patternContext}

${analysisInstructions}

${this.buildOutputFormatInstructions()}

${this.buildValidationInstructions()}
    `.trim()
  }

  /**
   * Build system prompt with role and capabilities
   */
  private buildSystemPrompt(): string {
    return `You are a legal document analyzer specializing in consumer protection and digital service terms. Your role is to identify potentially unfair, deceptive, or harmful clauses in terms of service and privacy policies.

You have expertise in:
- Consumer protection law
- Digital service regulations
- Mobile gaming industry practices
- Data privacy regulations (GDPR, CCPA, etc.)
- Contract law and unfair terms

Your analysis should be objective, accurate, and focused on protecting consumer interests.`
  }

  /**
   * Get industry-specific context
   */
  private getIndustryContext(industryFocus?: string): string {
    const industry = industryFocus || 'mobile-gaming'
    const context = this.industryContexts[industry] || this.industryContexts['mobile-gaming']
    
    return `INDUSTRY CONTEXT - ${industry.toUpperCase()}:
${context}`
  }

  /**
   * Get document type context
   */
  private getDocumentContext(contentType: string): string {
    const context = this.contentTypeContexts[contentType] || this.contentTypeContexts['terms-and-conditions']
    
    return `DOCUMENT TYPE: ${contentType.toUpperCase()}
${context}`
  }

  /**
   * Build context from found patterns
   */
  private buildPatternContext(patterns: PatternMatch[]): string {
    if (patterns.length === 0) {
      return 'PRELIMINARY ANALYSIS: No obvious problematic patterns detected through initial screening.'
    }

    const patternSummary = patterns
      .slice(0, 5) // Top 5 patterns
      .map(pattern => `- ${pattern.category}: "${pattern.matchedText}" (confidence: ${pattern.confidence}%)`)
      .join('\n')

    return `PRELIMINARY PATTERN ANALYSIS:
The following potentially problematic patterns were detected:

${patternSummary}

Please provide detailed analysis of these and any additional risks you identify.`
  }

  /**
   * Build analysis instructions based on depth
   */
  private buildAnalysisInstructions(depth: PromptContext['analysisDepth'] = 'detailed'): string {
    const baseInstructions = `ANALYSIS INSTRUCTIONS:
1. Carefully read through the entire document
2. Identify all potentially unfair, deceptive, or harmful clauses
3. Assess the risk level of each problematic clause
4. Consider the impact on consumers and users
5. Provide specific rationale for each risk assessment
6. Suggest alternative approaches where appropriate`

    const depthInstructions = {
      basic: 'Focus on the most obvious and high-impact risks.',
      detailed: 'Provide comprehensive analysis including context and implications.',
      comprehensive: 'Include thorough legal analysis, precedent considerations, and detailed recommendations.'
    }

    return `${baseInstructions}

${depthInstructions[depth]}`
  }

  /**
   * Build output format instructions
   */
  private buildOutputFormatInstructions(): string {
    return `OUTPUT FORMAT:
Respond with a valid JSON object in exactly this structure:

{
  "overallRiskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "confidenceScore": <number 0-100>,
  "riskAssessments": [
    {
      "category": "<category-name>",
      "riskLevel": "<low|medium|high|critical>",
      "riskScore": <number 0-100>,
      "confidenceScore": <number 0-100>,
      "summary": "<brief description>",
      "rationale": "<detailed explanation of why this is problematic>",
      "suggestedAction": "<recommendation for users>",
      "startPosition": <character position where problematic text starts>,
      "endPosition": <character position where problematic text ends>
    }
  ]
}

IMPORTANT: 
- Return ONLY the JSON object, no additional text
- Ensure all numeric values are within valid ranges
- Include at least one risk assessment if any risks are found
- Use precise character positions for startPosition and endPosition`
  }

  /**
   * Build validation instructions
   */
  private buildValidationInstructions(): string {
    return `VALIDATION REQUIREMENTS:
- overallRiskScore: 0-100 (higher = more risky)
- riskLevel: must be "low", "medium", "high", or "critical"
- confidenceScore: 0-100 (your confidence in the analysis)
- category: use kebab-case (e.g., "account-termination", "data-collection")
- startPosition/endPosition: exact character positions in the original text
- Ensure JSON is valid and parseable`
  }

  /**
   * Initialize industry-specific contexts
   */
  private initializeIndustryContexts(): Record<string, string> {
    return {
      'mobile-gaming': `Mobile gaming applications often include terms related to:
- Virtual currency and in-app purchases
- Account suspension and termination policies
- User-generated content and intellectual property
- Data collection for advertising and analytics
- Age restrictions and parental controls
- Refund policies for digital purchases

Pay special attention to clauses that may be unfair to players, especially regarding virtual currency value, account termination without cause, and excessive data collection.`,

      'social-media': `Social media platforms typically include terms covering:
- User content ownership and licensing
- Content moderation and removal policies
- Data collection and sharing practices
- Advertising and algorithmic targeting
- Account suspension and appeal processes
- Third-party integrations and data sharing

Focus on privacy implications, content ownership rights, and fairness of moderation policies.`,

      'e-commerce': `E-commerce platforms commonly address:
- Return and refund policies
- Product liability and warranties
- Payment processing and security
- Seller terms and marketplace rules
- Shipping and delivery obligations
- Dispute resolution mechanisms

Examine fairness of return policies, liability limitations, and consumer protection measures.`,

      'saas': `Software-as-a-Service agreements typically include:
- Service availability and uptime guarantees
- Data security and backup policies
- Subscription terms and cancellation
- Feature changes and deprecation
- API access and integration rights
- Data portability and export

Analyze fairness of service level commitments, data handling practices, and termination procedures.`
    }
  }

  /**
   * Initialize content type contexts
   */
  private initializeContentTypeContexts(): Record<string, string> {
    return {
      'terms-and-conditions': `Terms and Conditions typically govern the relationship between service provider and user, including rights, obligations, and limitations.`,
      'privacy-policy': `Privacy Policies explain how personal data is collected, used, stored, and shared. Focus on data protection and user privacy rights.`,
      'cookie-policy': `Cookie Policies detail how tracking technologies are used. Examine consent mechanisms and data collection practices.`,
      'user-agreement': `User Agreements define acceptable use and behavior on the platform. Look for overly broad restrictions or unfair penalties.`,
      'eula': `End User License Agreements govern software usage rights. Focus on license restrictions and user obligations.`
    }
  }

  /**
   * Build a quick analysis prompt for pattern validation
   */
  buildValidationPrompt(content: string, specificClause: string): string {
    return `Please analyze this specific clause from a legal document:

CLAUSE: "${specificClause}"

FULL CONTEXT:
\`\`\`
${content}
\`\`\`

Provide a brief assessment:
1. Is this clause potentially problematic? (Yes/No)
2. Risk level (low/medium/high/critical)
3. Brief explanation (1-2 sentences)

Respond in JSON format:
{
  "isProblematic": <boolean>,
  "riskLevel": "<level>",
  "explanation": "<brief explanation>"
}`
  }

  /**
   * Build comparison prompt for multiple documents
   */
  buildComparisonPrompt(documents: Array<{ title: string; content: string }>): string {
    const documentSections = documents.map((doc, index) => 
      `DOCUMENT ${index + 1}: ${doc.title}\n\`\`\`\n${doc.content}\n\`\`\`\n`
    ).join('\n')

    return `Compare these legal documents and identify which has more favorable terms for users:

${documentSections}

Provide a comparative analysis in JSON format:
{
  "comparison": {
    "mostFavorable": <document index>,
    "keyDifferences": ["<difference 1>", "<difference 2>"],
    "recommendation": "<which to choose and why>"
  }
}`
  }
}