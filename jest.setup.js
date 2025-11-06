import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Mock Web APIs for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Request and Response for API route testing
global.Request = class Request {
  constructor(input, init = {}) {
    // Store as an own, writable property to be compatible with NextRequest which may
    // attempt to assign or read `url` on request instances. Use defineProperty so the
    // property is configurable/writable to avoid TypeError in tests that wrap Next's
    // Request implementation.
    const _url = typeof input === 'string' ? input : input.url
    Object.defineProperty(this, 'url', { value: _url, writable: true, configurable: true, enumerable: true })
    this.method = init.method || 'GET'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.body = init.body
    this._bodyUsed = false
  }
  
  async json() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return this.body ? JSON.parse(this.body) : null
  }
  
  async text() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return this.body || ''
  }
}

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(Object.entries(init.headers || {}))
  }
  
  async json() {
    return JSON.parse(this.body)
  }
  
  async text() {
    return this.body
  }
  
  // Static helper to mimic NextResponse.json and fetch Response.json usage in server
  static json(body, init = {}) {
    return new global.Response(JSON.stringify(body), { status: init.status || 200, headers: init.headers || {} })
  }
}

global.Headers = class Headers extends Map {
  constructor(init = {}) {
    super(Object.entries(init))
  }
  
  get(name) {
    return super.get(name.toLowerCase())
  }
  
  set(name, value) {
    return super.set(name.toLowerCase(), value)
  }
  
  has(name) {
    return super.has(name.toLowerCase())
  }
  
  delete(name) {
    return super.delete(name.toLowerCase())
  }
}

// Mock URL and URLSearchParams
global.URL = class URL {
  constructor(url, base) {
    if (typeof url === 'string') {
      // Simple URL parsing for tests
      const match = url.match(/^(https?:)\/\/([^\/]+)(\/.*)?$/) || []
      this.protocol = match[1] || 'http:'
      this.hostname = match[2] || 'localhost'
      this.pathname = match[3] || '/'
      this.href = `${this.protocol}//${this.hostname}${this.pathname}`
      this.origin = `${this.protocol}//${this.hostname}`
      this.port = ''
      this.search = ''
      this.hash = ''
      this.searchParams = new URLSearchParams()
    } else {
      // If url is already a URL object, copy its properties
      this.href = url.href || 'http://localhost/'
      this.origin = url.origin || 'http://localhost'
      this.protocol = url.protocol || 'http:'
      this.hostname = url.hostname || 'localhost'
      this.port = url.port || ''
      this.pathname = url.pathname || '/'
      this.search = url.search || ''
      this.hash = url.hash || ''
      this.searchParams = new URLSearchParams(this.search)
    }
  }
}

global.URLSearchParams = class URLSearchParams {
  constructor(init = '') {
    this.params = new Map()
    if (typeof init === 'string') {
      init.replace(/^\?/, '').split('&').forEach(pair => {
        const [key, value] = pair.split('=')
        if (key) this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''))
      })
    }
  }
  
  get(name) { return this.params.get(name) }
  set(name, value) { this.params.set(name, value) }
  has(name) { return this.params.has(name) }
  delete(name) { this.params.delete(name) }
  
  forEach(callback) {
    this.params.forEach(callback)
  }
}

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.NAVER_CLIENT_ID = 'test-naver-client-id'
process.env.NAVER_CLIENT_SECRET = 'test-naver-client-secret'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-supabase-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-supabase-service-key'
process.env.GEMINI_API_KEY = 'test-gemini-api-key'

// Global test mocks
global.fetch = jest.fn()

// Provide a minimal TransformStream polyfill for environments that don't expose it
if (typeof global.TransformStream === 'undefined') {
  try {
    // Prefer Node's web stream implementation when available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TransformStream } = require('stream/web')
    global.TransformStream = TransformStream
  } catch (e) {
    // Fallback minimal stub so tests that only import Playwright don't crash during Jest runs
    // This is NOT a full implementation but avoids ReferenceError in test environment
    global.TransformStream = class {
      constructor() {
        this.readable = { locked: false }
        this.writable = { locked: false }
      }
    }
  }
}

// Mock next-auth/react to provide a default authenticated session and a passthrough SessionProvider
jest.mock('next-auth/react', () => {
  const React = require('react')
  return {
    useSession: () => ({ data: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com' } }, status: 'authenticated' }),
    SessionProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    // expose signIn/signOut as jest.fn so individual tests can spy/mock them
    signIn: jest.fn(() => Promise.resolve()),
    signOut: jest.fn(() => Promise.resolve()),
  }
})

// Mock quota display hook so unit tests that rely on canAnalyze don't get blocked by external API
jest.mock('@/widgets/analysis-form/ui/quota-display', () => {
  const React = require('react')
  return {
    QuotaDisplay: (props) => React.createElement('div', { 'data-testid': 'quota-display' }, props.children),
    useQuotaStatus: () => ({ canAnalyze: true, quotaStatus: null, refresh: jest.fn() })
  }
})

// Mock the Gemini/Google generative-ai client so unit tests don't call the real API
jest.mock('@google/generative-ai', () => {
  class DummyModel {
    async generateContent(_prompt) {
      return { response: { text: () => '{}' , usageMetadata: {} , candidates: [] } }
    }
    async *generateContentStream() {
      // no-op stream
    }
  }

  class DummyClient {
    constructor() {}
    getGenerativeModel() {
      return new DummyModel()
    }
  }

  return {
    GoogleGenerativeAI: DummyClient,
    GenerativeModel: DummyModel,
    GenerationConfig: {},
    SafetySetting: {},
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'harassment',
      HARM_CATEGORY_HATE_SPEECH: 'hate_speech',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sexually_explicit',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'dangerous_content'
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'block_medium_and_above'
    }
  }
})

// Mock next-auth/jwt to avoid importing ESM jose-based implementation during Jest runs
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn().mockResolvedValue(null) }))

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}))