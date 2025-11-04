import { render, screen } from '@/tests/setup/test-utils'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />)
    
    const heading = screen.getByRole('heading', { name: /terms watcher/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders the analyze terms button', () => {
    render(<HomePage />)
    
    const analyzeButton = screen.getByRole('link', { name: /analyze terms/i })
    expect(analyzeButton).toBeInTheDocument()
    expect(analyzeButton).toHaveAttribute('href', '/analysis')
  })

  it('renders the feature descriptions', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Transparent Analysis')).toBeInTheDocument()
    expect(screen.getByText('Privacy Protected')).toBeInTheDocument()
    expect(screen.getByText('Fast & Accurate')).toBeInTheDocument()
  })
})