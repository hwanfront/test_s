import { GoogleGenerativeAI } from '@google/generative-ai'

export interface GeminiResponse {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: 'stop' | 'length' | 'safety' | 'recitation'
}

export interface GeminiConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
}

/**
 * Client for interacting with Google's Gemini AI API
 * Handles content generation for legal document analysis
 */
export class GeminiClient {
  private client: GoogleGenerativeAI
  private model: any
  private config: Required<GeminiConfig>

  constructor(config: GeminiConfig = {}) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }

    this.client = new GoogleGenerativeAI(apiKey)
    
    this.config = {
      model: 'gemini-1.5-flash',
      temperature: 0.2, // Low temperature for consistent analysis
      maxTokens: 4096,
      topP: 0.8,
      topK: 40,
      ...config
    }

    this.model = this.client.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      }
    })
  }

  /**
   * Generate content using Gemini AI
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
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Missing API key')
      }
      
      if (this.config.temperature < 0 || this.config.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2')
      }
      
      if (this.config.maxTokens < 1 || this.config.maxTokens > 8192) {
        throw new Error('Max tokens must be between 1 and 8192')
      }
      
      return true
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Test the connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateContent('Test connection. Respond with "OK".')
      return response.text.includes('OK') || response.text.includes('ok')
    } catch (error) {
      return false
    }
  }

  /**
   * Get current usage statistics (if available)
   */
  getUsageStats(): { model: string; config: GeminiConfig } {
    return {
      model: this.config.model,
      config: { ...this.config }
    }
  }
}