/**
 * Structured Prompt Builder (Task T051)
 * 
 * Constitutional Compliance: This module builds AI prompts while maintaining
 * transparency about AI limitations and ensuring ethical analysis guidance
 */

import { ClausePattern, PatternMatch } from './pattern-matcher'

export interface PromptTemplate {
  id: string
  name: string
  category: string
  systemPrompt: string
  userPromptTemplate: string
  contextInstructions?: string
  outputFormat?: string
  constraints?: string[]
  variables?: PromptVariable[]
  enabled?: boolean
  lastUpdated?: string
}

export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  defaultValue?: any
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    enum?: any[]
  }
}

export interface AnalysisPrompt {
  systemPrompt: string
  userPrompt: string
  context?: string
  patterns?: ClausePattern[]
  metadata?: {
    templateId: string
    templateName: string
    generatedAt: string
    contextHash: string
  }
}

export interface PromptBuildOptions {
  includePatterns?: boolean
  maxPromptLength?: number
  enableExplanations?: boolean
  strictMode?: boolean
  customVariables?: Record<string, any>
}

// Legacy interface for backward compatibility
export interface PromptContext {
  contentType?: string
  industryFocus?: string
  jurisdiction?: string
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive'
  // New context fields
  documentType?: string
  language?: string
  industry?: string
  userRole?: string
  focusAreas?: string[]
  customInstructions?: string
}

/**
 * Predefined Prompt Templates for Different Analysis Types
 */
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'mobile_gaming_basic',
    name: 'Mobile Gaming Basic Analysis',
    category: 'mobile_gaming',
    systemPrompt: `You are a legal AI assistant specialized in analyzing Terms of Service and Privacy Policies for mobile gaming applications. Your role is to help users understand potentially problematic clauses that may affect their rights or user experience.

CRITICAL LIMITATIONS AND TRANSPARENCY:
- You are an AI assistant, not a licensed attorney
- This analysis is for educational purposes only and does not constitute legal advice
- Users should consult qualified legal professionals for specific legal guidance
- Your analysis is based on pattern recognition and may not identify all risks
- Legal interpretations can vary by jurisdiction and individual circumstances

CONSTITUTIONAL COMPLIANCE REQUIREMENTS:
- Analyze only the sanitized text provided, never store or reference original content
- Provide transparent explanations of your reasoning process
- Acknowledge uncertainty when assessment confidence is low
- Focus on user empowerment through understanding, not fear-mongering
- Maintain objectivity and avoid bias toward any party`,
    userPromptTemplate: `Please analyze the following Terms of Service for a mobile gaming application. Focus on identifying clauses that may be unfavorable to users, particularly regarding:

1. Payment and subscription terms
2. Data collection and privacy practices  
3. Account termination policies
4. Virtual currency and in-app purchases
5. Dispute resolution mechanisms
6. Content ownership and user rights

For each identified issue:
- Provide a clear explanation of the potential risk
- Rate the severity (low/medium/high/critical)
- Suggest user-friendly actions where applicable
- Explain your confidence level in the assessment

Remember to maintain objectivity and acknowledge where legal interpretation may vary.`,
    outputFormat: `{
  "overallRiskScore": <0-100>,
  "overallRiskLevel": "<low|medium|high|critical>",
  "confidenceScore": <0-100>,
  "riskAssessments": [
    {
      "category": "<category>",
      "riskLevel": "<low|medium|high|critical>",
      "riskScore": <0-100>,
      "confidenceScore": <0-100>,
      "summary": "<brief description>",
      "rationale": "<detailed explanation>",
      "suggestedAction": "<user-friendly advice>",
      "startPosition": <character position>,
      "endPosition": <character position>
    }
  ]
}`,
    constraints: [
      'Analysis must be based only on provided text',
      'Acknowledge AI limitations clearly',
      'Avoid providing specific legal advice',
      'Maintain educational focus',
      'Rate confidence honestly'
    ],
    enabled: true
  },
  {
    id: 'privacy_policy_analysis',
    name: 'Privacy Policy Analysis',
    category: 'privacy',
    systemPrompt: `You are an AI assistant specialized in analyzing Privacy Policies for digital services. Your expertise focuses on data protection practices, user rights, and privacy risks.

TRANSPARENCY AND LIMITATIONS:
- This is an automated analysis tool, not a substitute for privacy counsel
- Privacy laws vary significantly by jurisdiction (GDPR, CCPA, etc.)
- Your analysis provides general guidance, not legal compliance assessment
- Users should verify findings with qualified privacy professionals
- AI analysis may not capture all nuances of privacy regulations

CONSTITUTIONAL COMPLIANCE:
- Analyze only the preprocessed text provided
- Provide clear reasoning for all assessments
- Acknowledge areas of uncertainty
- Focus on user empowerment and understanding
- Maintain neutrality between service providers and users`,
    userPromptTemplate: `Analyze this Privacy Policy for data protection practices and user rights. Pay special attention to:

1. Types of personal data collected
2. Purposes for data processing
3. Data sharing with third parties
4. User control and rights (access, deletion, portability)
5. Data retention policies
6. Security measures and breach notification
7. International data transfers
8. Children's privacy protections

Assess each area for transparency, user-friendliness, and potential privacy risks.`,
    enabled: true
  }
]

/**
 * Main Prompt Builder Class
 */
export class PromptBuilder {
  private templates: Map<string, PromptTemplate>
  private defaultOptions: Required<PromptBuildOptions>
  // Legacy properties for backward compatibility
  private industryContexts: Record<string, string>
  private contentTypeContexts: Record<string, string>

  constructor(templates: PromptTemplate[] = DEFAULT_PROMPT_TEMPLATES) {
    this.templates = new Map()
    templates.forEach(template => this.templates.set(template.id, template))

    this.defaultOptions = {
      includePatterns: true,
      maxPromptLength: 12000,
      enableExplanations: true,
      strictMode: false,
      customVariables: {}
    }

    // Initialize legacy contexts for backward compatibility
    this.industryContexts = this.initializeIndustryContexts()
    this.contentTypeContexts = this.initializeContentTypeContexts()
  }

  /**
   * Build analysis prompt using template and context (Primary Method for Task T051)
   */
  buildPrompt(
    templateId: string,
    context: PromptContext = {},
    patterns: ClausePattern[] = [],
    options: PromptBuildOptions = {}
  ): AnalysisPrompt {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    if (!template.enabled) {
      throw new Error(`Template is disabled: ${templateId}`)
    }

    const mergedOptions = { ...this.defaultOptions, ...options }
    
    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(template, context, mergedOptions)
    
    // Build user prompt with variables
    const userPrompt = this.buildUserPrompt(template, context, mergedOptions)
    
    // Build context string
    const contextString = this.buildContextString(context)
    
    // Filter and prepare patterns
    const relevantPatterns = mergedOptions.includePatterns ? patterns : []
    
    // Generate metadata
    const metadata = {
      templateId: template.id,
      templateName: template.name,
      generatedAt: new Date().toISOString(),
      contextHash: this.generateContextHash(context, relevantPatterns)
    }

    const result: AnalysisPrompt = {
      systemPrompt,
      userPrompt,
      context: contextString,
      patterns: relevantPatterns,
      metadata
    }

    // Validate prompt length
    const totalLength = this.calculatePromptLength(result)
    if (totalLength > mergedOptions.maxPromptLength) {
      throw new Error(`Prompt too long: ${totalLength} characters (max: ${mergedOptions.maxPromptLength})`)
    }

    return result
  }

  /**
   * Build system prompt with context awareness
   */
  private buildSystemPrompt(
    template: PromptTemplate,
    context: PromptContext,
    options: Required<PromptBuildOptions>
  ): string {
    let systemPrompt = template.systemPrompt

    // Add context-specific instructions
    if (context.documentType || context.contentType) {
      const docType = context.documentType || context.contentType
      systemPrompt += `\n\nDOCUMENT CONTEXT: You are analyzing a ${docType}.`
    }

    if (context.industry || context.industryFocus) {
      const industry = context.industry || context.industryFocus
      systemPrompt += `\nINDUSTRY CONTEXT: This document is from the ${industry} sector.`
    }

    if (context.jurisdiction) {
      systemPrompt += `\nJURISDICTIONAL CONTEXT: Consider ${context.jurisdiction} legal context where applicable.`
    }

    if (context.analysisDepth) {
      const depthInstructions = {
        basic: 'Provide a high-level overview focusing on the most significant issues.',
        detailed: 'Conduct a thorough analysis covering all major risk areas.',
        comprehensive: 'Perform detailed analysis including nuanced risks and edge cases.',
        standard: 'Conduct a thorough analysis covering all major risk areas.'
      }
      systemPrompt += `\nANALYSIS DEPTH: ${depthInstructions[context.analysisDepth] || depthInstructions.detailed}`
    }

    if (context.focusAreas && context.focusAreas.length > 0) {
      systemPrompt += `\nFOCUS AREAS: Pay special attention to: ${context.focusAreas.join(', ')}`
    }

    // Add constitutional compliance reminders
    systemPrompt += `\n\nCONSTITUTIONAL COMPLIANCE REMINDERS:
- You are analyzing preprocessed, sanitized text only
- Never reference or store original document content
- Provide transparent explanations of your reasoning
- Acknowledge limitations and uncertainties clearly
- Focus on user education and empowerment`

    if (template.constraints) {
      systemPrompt += `\n\nANALYSIS CONSTRAINTS:\n${template.constraints.map(c => `- ${c}`).join('\n')}`
    }

    return systemPrompt
  }

  /**
   * Build user prompt with variable substitution
   */
  private buildUserPrompt(
    template: PromptTemplate,
    context: PromptContext,
    options: Required<PromptBuildOptions>
  ): string {
    let userPrompt = template.userPromptTemplate

    // Substitute template variables
    if (template.variables) {
      for (const variable of template.variables) {
        const value = options.customVariables[variable.name] || 
                     (context as any)[variable.name] || 
                     variable.defaultValue

        if (value !== undefined) {
          const placeholder = `{{${variable.name}}}`
          userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), String(value))
        }
      }
    }

    // Add custom instructions if provided
    if (context.customInstructions) {
      userPrompt += `\n\nADDITIONAL INSTRUCTIONS: ${context.customInstructions}`
    }

    // Add output format if specified
    if (template.outputFormat) {
      userPrompt += `\n\nEXPECTED OUTPUT FORMAT:\n${template.outputFormat}`
    }

    return userPrompt
  }

  /**
   * Build context string from context object
   */
  private buildContextString(context: PromptContext): string {
    const contextParts: string[] = []

    if (context.documentType || context.contentType) {
      contextParts.push(`Document Type: ${context.documentType || context.contentType}`)
    }

    if (context.language) {
      contextParts.push(`Language: ${context.language}`)
    }

    if (context.industry || context.industryFocus) {
      contextParts.push(`Industry: ${context.industry || context.industryFocus}`)
    }

    if (context.userRole) {
      contextParts.push(`User Role: ${context.userRole}`)
    }

    if (context.analysisDepth) {
      contextParts.push(`Analysis Depth: ${context.analysisDepth}`)
    }

    return contextParts.join(', ')
  }

  /**
   * Calculate total prompt length
   */
  private calculatePromptLength(prompt: AnalysisPrompt): number {
    let length = prompt.systemPrompt.length + prompt.userPrompt.length

    if (prompt.context) {
      length += prompt.context.length
    }

    if (prompt.patterns) {
      length += prompt.patterns.reduce((sum, pattern) => 
        sum + pattern.name.length + pattern.description.length + pattern.keywords.join(' ').length, 0
      )
    }

    return length
  }

  /**
   * Generate hash for context and patterns (for caching/deduplication)
   */
  private generateContextHash(context: PromptContext, patterns: ClausePattern[]): string {
    const contextStr = JSON.stringify(context)
    const patternsStr = patterns.map(p => p.id).sort().join(',')
    const combined = contextStr + '|' + patternsStr
    
    // Simple hash function (for demo purposes - use crypto.subtle in production)
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Template management methods
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, {
      ...template,
      enabled: template.enabled !== false,
      lastUpdated: new Date().toISOString()
    })
  }

  removeTemplate(templateId: string): boolean {
    return this.templates.delete(templateId)
  }

  updateTemplate(templateId: string, updates: Partial<PromptTemplate>): boolean {
    const existing = this.templates.get(templateId)
    if (!existing) return false

    this.templates.set(templateId, {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString()
    })
    return true
  }

  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId)
  }

  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values())
  }

  getTemplatesByCategory(category: string): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category)
  }

  getEnabledTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.enabled !== false)
  }

  /**
   * Validate template configuration
   */
  validateTemplate(template: PromptTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!template.id || !template.id.trim()) {
      errors.push('Template ID is required')
    }

    if (!template.name || !template.name.trim()) {
      errors.push('Template name is required')
    }

    if (!template.systemPrompt || !template.systemPrompt.trim()) {
      errors.push('System prompt is required')
    }

    if (!template.userPromptTemplate || !template.userPromptTemplate.trim()) {
      errors.push('User prompt template is required')
    }

    if (template.variables) {
      template.variables.forEach((variable, index) => {
        if (!variable.name || !variable.name.trim()) {
          errors.push(`Variable ${index}: name is required`)
        }
        if (!variable.description || !variable.description.trim()) {
          errors.push(`Variable ${index}: description is required`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Export/Import templates
   */
  exportTemplates(): string {
    return JSON.stringify(Array.from(this.templates.values()), null, 2)
  }

  importTemplates(templatesJson: string): { imported: number; errors: string[] } {
    try {
      const templates: PromptTemplate[] = JSON.parse(templatesJson)
      let imported = 0
      const errors: string[] = []

      for (const template of templates) {
        const validation = this.validateTemplate(template)
        if (validation.valid) {
          this.addTemplate(template)
          imported++
        } else {
          errors.push(`Template ${template.id || 'unknown'}: ${validation.errors.join(', ')}`)
        }
      }

      return { imported, errors }
    } catch (error) {
      throw new Error(`Failed to import templates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    totalTemplates: number
    enabledTemplates: number
    templatesByCategory: Record<string, number>
  } {
    const allTemplates = this.getAllTemplates()
    const enabledTemplates = this.getEnabledTemplates()

    const templatesByCategory: Record<string, number> = {}
    allTemplates.forEach(template => {
      templatesByCategory[template.category] = (templatesByCategory[template.category] || 0) + 1
    })

    return {
      totalTemplates: allTemplates.length,
      enabledTemplates: enabledTemplates.length,
      templatesByCategory
    }
  }

  // Legacy methods for backward compatibility

  /**
   * Legacy method - Build an analysis prompt for the AI
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
${this.buildLegacySystemPrompt()}

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
   * Legacy method - Build system prompt with role and capabilities
   */
  private buildLegacySystemPrompt(): string {
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
      .map(pattern => `- ${pattern.category}: "${pattern.matchedText}" (confidence: ${Math.round(pattern.confidence * 100)}%)`)
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

${depthInstructions[depth] || depthInstructions.detailed}`
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