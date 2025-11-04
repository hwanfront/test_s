import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Mock Web APIs for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Request and Response for API route testing
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url
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