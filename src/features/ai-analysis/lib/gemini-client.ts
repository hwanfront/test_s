/**
 * Gemini API Client (Task T049)
 * 
 * Constitutional Compliance: This module strictly isolates AI analysis
 * and ensures transparent, ethical AI processing with clear limitations
 */

import { 
  GoogleGenerativeAI, 
  GenerativeModel, 
  GenerationConfig, 
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold
} from '@google/generative-ai'

export interface GeminiConfig {
  apiKey?: string
  model?: string
  maxOutputTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  safetySettings?: SafetySetting[]
}

export interface AnalysisPrompt {
  systemPrompt: string
  userPrompt: string
  context?: string
  patterns?: ClausePattern[]
}

export interface ClausePattern {
  id: string
  category: string
  name: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  keywords: string[]
  promptTemplate: string
}

export interface GeminiAnalysisRequest {
  sanitizedText: string
  prompt: AnalysisPrompt
  options?: {
    maxRetries?: number
    timeoutMs?: number
    language?: string
  }
}

export interface GeminiAnalysisResponse {
  success: boolean
  result?: {
    analysis: string
    riskAssessments: Array<{
      category: string
      riskLevel: 'low' | 'medium' | 'high' | 'critical'
      riskScore: number
      confidenceScore: number
      summary: string
      rationale: string
      suggestedAction?: string
      startPosition: number
      endPosition: number
    }>
    overallRiskScore: number
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical'
    confidenceScore: number
    processingTimeMs: number
  }
  error?: {
    code: string
    message: string
    details?: any
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// Legacy interface for backward compatibility
export interface GeminiResponse {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: 'stop' | 'length' | 'safety' | 'recitation'
}

/**
 * Main Gemini API client class
 */
export class GeminiClient {
  private client: GoogleGenerativeAI
  private model: GenerativeModel
  private config: Required<GeminiConfig>

  constructor(config: GeminiConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Gemini API key is required')
    }

    this.config = {
      apiKey,
      model: config.model || 'gemini-1.5-flash',
      maxOutputTokens: config.maxOutputTokens || 4096,
      temperature: config.temperature || 0.1, // Low temperature for consistent analysis
      topP: config.topP || 0.8,
      topK: config.topK || 40,
      safetySettings: config.safetySettings || this.getDefaultSafetySettings()
    }

    this.client = new GoogleGenerativeAI(this.config.apiKey)
    this.model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: this.getGenerationConfig(),
      safetySettings: this.config.safetySettings
    })
  }

  /**
   * Analyze terms text using Gemini AI (Primary Method for Task T049)
   */
  async analyzeTerms(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResponse> {
    const startTime = Date.now()
    const maxRetries = request.options?.maxRetries || 3
    const timeoutMs = request.options?.timeoutMs || 30000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        })

        // Create analysis promise
        const analysisPromise = this.performAnalysis(request, startTime)

        // Race between analysis and timeout
        const result = await Promise.race([analysisPromise, timeoutPromise])
        return result

      } catch (error) {
        console.warn(`Gemini API attempt ${attempt}/${maxRetries} failed:`, error)

        if (attempt === maxRetries) {
          return {
            success: false,
            error: {
              code: 'GEMINI_API_ERROR',
              message: error instanceof Error ? error.message : 'Unknown API error',
              details: { attempts: maxRetries, lastError: error }
            }
          }
        }

        // Exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected error in retry loop'
      }
    }
  }

  /**
   * Perform the actual analysis with Gemini
   */
  private async performAnalysis(
    request: GeminiAnalysisRequest,
    startTime: number
  ): Promise<GeminiAnalysisResponse> {
    // Build the complete prompt
    const fullPrompt = this.buildFullPrompt(request.prompt, request.sanitizedText)

    // Call Gemini API
    const response = await this.model.generateContent(fullPrompt)
    const result = response.response

    if (!result.text()) {
      throw new Error('No response text from Gemini API')
    }

    // Parse the response
    const parsedResult = this.parseGeminiResponse(result.text(), request.sanitizedText)
    const processingTimeMs = Date.now() - startTime

    return {
      success: true,
      result: {
        ...parsedResult,
        processingTimeMs
      },
      usage: this.extractUsageInfo(response)
    }
  }

  /**
   * Build the complete prompt for Gemini
   */
  private buildFullPrompt(prompt: AnalysisPrompt, sanitizedText: string): string {
    let fullPrompt = `${prompt.systemPrompt}\n\n`

    if (prompt.context) {
      fullPrompt += `Context: ${prompt.context}\n\n`
    }

    if (prompt.patterns && prompt.patterns.length > 0) {
      fullPrompt += `Known Risk Patterns to Look For:\n`
      prompt.patterns.forEach((pattern, index) => {
        fullPrompt += `${index + 1}. ${pattern.name} (${pattern.riskLevel} risk): ${pattern.description}\n`
        fullPrompt += `   Keywords: ${pattern.keywords.join(', ')}\n`
      })
      fullPrompt += '\n'
    }

    fullPrompt += `${prompt.userPrompt}\n\n`
    fullPrompt += `Terms and Conditions Text to Analyze:\n${sanitizedText}\n\n`
    fullPrompt += `Please provide your analysis in the following JSON format:\n`
    fullPrompt += this.getResponseFormat()

    return fullPrompt
  }

  /**
   * Get the expected response format for Gemini
   */
  private getResponseFormat(): string {
    return `{
  "overallRiskScore": <number 0-100>,
  "overallRiskLevel": "<low|medium|high|critical>",
  "confidenceScore": <number 0-100>,
  "riskAssessments": [
    {
      "category": "<string>",
      "riskLevel": "<low|medium|high|critical>",
      "riskScore": <number 0-100>,
      "confidenceScore": <number 0-100>,
      "summary": "<brief description>",
      "rationale": "<detailed explanation>",
      "suggestedAction": "<recommended action>",
      "startPosition": <character position>,
      "endPosition": <character position>
    }
  ]
}`
  }

  /**
   * Parse Gemini's response into structured data
   */
  private parseGeminiResponse(responseText: string, originalText: string): Omit<NonNullable<GeminiAnalysisResponse['result']>, 'processingTimeMs'> {
    try {
      // Try to extract JSON from the response
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        // Fallback: create a basic response if no JSON found
        return this.createFallbackResponse(responseText, originalText)
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate and sanitize the parsed response
      return this.validateAndSanitizeResponse(parsed, originalText)

    } catch (error) {
      console.warn('Failed to parse Gemini response as JSON:', error)
      return this.createFallbackResponse(responseText, originalText)
    }
  }

  /**
   * Validate and sanitize Gemini's response
   */
  private validateAndSanitizeResponse(parsed: any, originalText: string): Omit<NonNullable<GeminiAnalysisResponse['result']>, 'processingTimeMs'> {
    const sanitized = {
      analysis: String(parsed.analysis || 'Analysis completed'),
      overallRiskScore: this.clampScore(parsed.overallRiskScore),
      overallRiskLevel: this.validateRiskLevel(parsed.overallRiskLevel),
      confidenceScore: this.clampScore(parsed.confidenceScore),
      riskAssessments: []
    }

    if (Array.isArray(parsed.riskAssessments)) {
      sanitized.riskAssessments = parsed.riskAssessments
        .filter((assessment: any) => assessment && typeof assessment === 'object')
        .map((assessment: any) => ({
          category: String(assessment.category || 'unknown'),
          riskLevel: this.validateRiskLevel(assessment.riskLevel),
          riskScore: this.clampScore(assessment.riskScore),
          confidenceScore: this.clampScore(assessment.confidenceScore),
          summary: String(assessment.summary || 'Risk identified').substring(0, 200),
          rationale: String(assessment.rationale || 'No rationale provided').substring(0, 1000),
          suggestedAction: assessment.suggestedAction ? String(assessment.suggestedAction).substring(0, 500) : undefined,
          startPosition: Math.max(0, Math.min(originalText.length, Number(assessment.startPosition) || 0)),
          endPosition: Math.max(0, Math.min(originalText.length, Number(assessment.endPosition) || 0))
        }))
    }

    return sanitized
  }

  /**
   * Create fallback response when parsing fails
   */
  private createFallbackResponse(responseText: string, originalText: string): Omit<NonNullable<GeminiAnalysisResponse['result']>, 'processingTimeMs'> {
    // Try to extract some insights from the raw text
    const hasHighRiskKeywords = /critical|dangerous|concerning|problematic|unfair/i.test(responseText)
    const hasMediumRiskKeywords = /questionable|unclear|potentially|may be/i.test(responseText)

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let riskScore = 30

    if (hasHighRiskKeywords) {
      riskLevel = 'high'
      riskScore = 75
    } else if (hasMediumRiskKeywords) {
      riskLevel = 'medium'
      riskScore = 50
    }

    return {
      analysis: responseText.substring(0, 2000),
      overallRiskScore: riskScore,
      overallRiskLevel: riskLevel,
      confidenceScore: 50, // Low confidence for fallback
      riskAssessments: [{
        category: 'general',
        riskLevel,
        riskScore,
        confidenceScore: 50,
        summary: 'General analysis (parsing failed)',
        rationale: 'Response parsing failed, providing general assessment based on text analysis',
        startPosition: 0,
        endPosition: Math.min(100, originalText.length)
      }]
    }
  }

  /**
   * Helper methods for validation
   */
  private clampScore(score: any): number {
    const num = Number(score)
    if (isNaN(num)) return 0
    return Math.max(0, Math.min(100, Math.round(num)))
  }

  private validateRiskLevel(level: any): 'low' | 'medium' | 'high' | 'critical' {
    if (typeof level === 'string') {
      const normalized = level.toLowerCase()
      if (['low', 'medium', 'high', 'critical'].includes(normalized)) {
        return normalized as 'low' | 'medium' | 'high' | 'critical'
      }
    }
    return 'low'
  }

  private getGenerationConfig(): GenerationConfig {
    return {
      maxOutputTokens: this.config.maxOutputTokens,
      temperature: this.config.temperature,
      topP: this.config.topP,
      topK: this.config.topK
    }
  }

  private getDefaultSafetySettings(): SafetySetting[] {
    // Defensive: fall back to string constants if the imported enums are not
    // available (test mocks may not provide them). This keeps tests stable.
    const HC = (HarmCategory as any) || {
      HARM_CATEGORY_HARASSMENT: 'harassment',
      HARM_CATEGORY_HATE_SPEECH: 'hate_speech',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sexually_explicit',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'dangerous_content'
    }

    const HBT = (HarmBlockThreshold as any) || {
      BLOCK_MEDIUM_AND_ABOVE: 'block_medium_and_above'
    }

    return [
      { category: HC.HARM_CATEGORY_HARASSMENT, threshold: HBT.BLOCK_MEDIUM_AND_ABOVE },
      { category: HC.HARM_CATEGORY_HATE_SPEECH, threshold: HBT.BLOCK_MEDIUM_AND_ABOVE },
      { category: HC.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HBT.BLOCK_MEDIUM_AND_ABOVE },
      { category: HC.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HBT.BLOCK_MEDIUM_AND_ABOVE }
    ]
  }

  private extractUsageInfo(response: any): { promptTokens: number; completionTokens: number; totalTokens: number } {
    const usageMetadata = response?.usageMetadata
    return {
      promptTokens: usageMetadata?.promptTokenCount || 0,
      completionTokens: usageMetadata?.candidatesTokenCount || 0,
      totalTokens: usageMetadata?.totalTokenCount || 0
    }
  }

  /**
   * Generate content using Gemini AI (Legacy method for backward compatibility)
   * @param prompt The prompt to send to the AI
   * @returns AI response with usage statistics
   */
  async generateContent(prompt: string): Promise<GeminiResponse> {
    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      
      const text = response.text()
      
      // Extract usage information (if available)
      const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }

      // Determine finish reason
      const finishReason = this.mapFinishReason(response.candidates?.[0]?.finishReason)

      return {
        text,
        usage,
        finishReason
      }
    } catch (error) {
      this.handleApiError(error)
      throw error // This line will never be reached due to handleApiError throwing
    }
  }

  /**
   * Generate content with streaming (for future use)
   * @param prompt The prompt to send to the AI
   * @returns Async generator yielding chunks of text
   */
  async* generateContentStream(prompt: string): AsyncGenerator<string, void, unknown> {
    try {
      const result = await this.model.generateContentStream(prompt)
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        if (chunkText) {
          yield chunkText
        }
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  /**
   * Map Gemini finish reason to our standardized format
   */
  private mapFinishReason(reason: string | undefined): GeminiResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop'
      case 'MAX_TOKENS':
        return 'length'
      case 'SAFETY':
        return 'safety'
      case 'RECITATION':
        return 'recitation'
      default:
        return 'stop'
    }
  }

  /**
   * Handle API errors with specific error types
   */
  private handleApiError(error: any): never {
    if (error?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later.')
    }
    
    if (error?.status === 403) {
      throw new Error('API access forbidden. Check your API key and permissions.')
    }
    
    if (error?.status === 400) {
      throw new Error('Invalid request. Please check your prompt format.')
    }
    
    if (error?.status === 500) {
      throw new Error('Gemini API server error. Please try again later.')
    }

    if (error?.message?.includes('safety')) {
      throw new Error('Content filtered by safety settings. Please modify your input.')
    }

    if (error?.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please check your usage limits.')
    }

    // Generic error
    throw new Error(`Gemini API error: ${error?.message || 'Unknown error'}`)
  }

  /**
   * Validate the current configuration
   */
  validateConfig(): boolean {
    try {
      if (!this.config.apiKey) {
        throw new Error('Missing API key')
      }
      
      if (this.config.temperature < 0 || this.config.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2')
      }
      
      if (this.config.maxOutputTokens < 1 || this.config.maxOutputTokens > 8192) {
        throw new Error('Max tokens must be between 1 and 8192')
      }
      
      return true
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testResponse = await this.generateContent('Hello, please respond with "OK" if you can see this message.')
      
      if (testResponse.text) {
        return { success: true }
      } else {
        return { success: false, error: 'No response from API' }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get current API configuration (without sensitive data)
   */
  getConfig(): Omit<Required<GeminiConfig>, 'apiKey'> {
    const { apiKey, ...configWithoutKey } = this.config
    return configWithoutKey
  }

  /**
   * Get current usage statistics (if available)
   */
  getUsageStats(): { model: string; config: Omit<GeminiConfig, 'apiKey'> } {
    const { apiKey, ...publicConfig } = this.config
    return {
      model: this.config.model,
      config: publicConfig
    }
  }
}