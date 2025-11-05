import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'

// Mock session for testing
export const mockSession: Session = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: '2025-01-01',
}

interface AllTheProvidersProps {
  children: ReactNode
  session?: Session | null
}

const AllTheProviders = ({ children, session = mockSession }: AllTheProvidersProps) => {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null
}

const customRender = (
  ui: ReactElement,
  { session, ...options }: CustomRenderOptions = {}
) =>
  render(ui, { 
    wrapper: ({ children }) => (
      <AllTheProviders session={session}>
        {children}
      </AllTheProviders>
    ), 
    ...options 
  })

// Export createWrapper function for cases where a wrapper is needed separately
export const createWrapper = (session?: Session | null) => 
  ({ children }: { children: ReactNode }) => (
    <AllTheProviders session={session}>
      {children}
    </AllTheProviders>
  )

export * from '@testing-library/react'
export { customRender as render }