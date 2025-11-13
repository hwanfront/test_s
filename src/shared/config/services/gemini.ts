import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required')
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)

export interface AnalysisPromptData {
  termsText: string
  language?: string
}

export interface GeminiAnalysisResult {
  overall_risk_score: number
  summary: string
  issues_found: Array<{
    type: 'data_collection' | 'user_rights' | 'liability' | 'termination' | 'pricing' | 'other'
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    quote: string
    explanation: string
    confidence_score: number
    suggestions: string[]
  }>
  metadata: {
    text_length: number
    processing_time_ms: number
    model_version: string
    language: string
    confidence_score: number
  }
}

class GeminiAnalysisService {
  private model: GenerativeModel

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    })
  }

  async analyzeTerms(data: AnalysisPromptData): Promise<GeminiAnalysisResult> {
    const startTime = Date.now()
    
    const prompt = this.buildAnalysisPrompt(data.termsText, data.language || 'auto')
    
    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Parse the JSON response
      const analysisResult = JSON.parse(text)
      
      // Add metadata
      analysisResult.metadata = {
        text_length: data.termsText.length,
        processing_time_ms: Date.now() - startTime,
        model_version: 'gemini-1.5-flash',
        language: data.language || 'auto',
        confidence_score: this.calculateOverallConfidence(analysisResult.issues_found || []),
      }
      
      return analysisResult
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error('Failed to analyze terms with AI')
    }
  }

  private buildAnalysisPrompt(termsText: string, language: string): string {
    return `
You are an expert legal analyst specializing in consumer protection and terms of service analysis. 

Analyze the following terms and conditions for potentially unfair or concerning clauses that could negatively impact users. Focus on:

1. **Data Collection & Privacy**: Excessive data collection, unclear data usage, sharing with third parties
2. **User Rights**: Restrictions on user rights, limited recourse options, waiver of consumer rights
3. **Liability**: Unfair liability limitations, excessive user responsibility, company liability exclusions
4. **Termination**: Unclear termination conditions, loss of access to paid content, account suspension
5. **Pricing**: Hidden fees, automatic renewals, unclear pricing changes, non-refundable policies
6. **Other**: Any other unfair or unusual clauses

For each issue found, provide:
- Type (data_collection, user_rights, liability, termination, pricing, other)
- Severity (low, medium, high, critical)
- Title (brief description)
- Description (detailed explanation)
- Quote (exact text from terms)
- Explanation (why this is concerning)
- Confidence score (0-100)
- Suggestions (how to improve)

Return a JSON response with this exact structure:
{
  "overall_risk_score": 0-100,
  "summary": "Brief summary of overall risk assessment",
  "issues_found": [
    {
      "type": "data_collection|user_rights|liability|termination|pricing|other",
      "severity": "low|medium|high|critical",
      "title": "Brief issue title",
      "description": "Detailed description",
      "quote": "Exact text from terms",
      "explanation": "Why this is concerning",
      "confidence_score": 0-100,
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ]
}

Language: ${language}
Terms Text:
${termsText}

Provide only the JSON response, no additional text.
`
  }

  private calculateOverallConfidence(issues: any[]): number {
    if (issues.length === 0) return 95 // High confidence when no issues found
    
    const avgConfidence = issues.reduce((sum, issue) => sum + issue.confidence_score, 0) / issues.length
    return Math.round(avgConfidence)
  }
}

export const geminiService = new GeminiAnalysisService()