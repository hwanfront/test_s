/**
 * Component tests for Analysis Form Widget
 * Test: T042 [US1] Component test for analysis form widget
 * 
 * This tests the analysis form widget UI components and user interactions
 * Following TDD approach: These tests should FAIL before implementation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisForm } from '@/widgets/analysis-form/ui/analysis-form';
import { useAnalysisFormStore } from '@/widgets/analysis-form/model/store';
import { createWrapper } from '@/tests/setup/test-utils';

// Mock the store
jest.mock('@/widgets/analysis-form/model/store');

describe('Analysis Form Widget', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  
  const defaultStoreState = {
    content: '',
    isSubmitting: false,
    errors: {},
    setContent: jest.fn(),
    setSubmitting: jest.fn(),
    setErrors: jest.fn(),
    validateContent: jest.fn(),
    reset: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalysisFormStore as jest.Mock).mockReturnValue(defaultStoreState);
  });

  describe('Form Rendering and Layout', () => {
    it('should render form with all required elements', () => {
      render(
        <AnalysisForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('form', { name: /analysis form/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/terms and conditions text/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('should display character count and validation info', () => {
      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/0 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/minimum 100 characters required/i)).toBeInTheDocument();
      expect(screen.getByText(/maximum 100,000 characters allowed/i)).toBeInTheDocument();
    });

    it('should show placeholder text with helpful guidance', () => {
      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/terms and conditions text/i);
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('Paste your terms'));
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('privacy policy'));
    });

    it('should be accessible with proper ARIA attributes', () => {
      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-labelledby');

      const textarea = screen.getByLabelText(/terms and conditions text/i);
      expect(textarea).toHaveAttribute('aria-describedby');
      expect(textarea).toHaveAttribute('aria-required', 'true');

      const submitButton = screen.getByRole('button', { name: /analyze/i });
      expect(submitButton).toHaveAttribute('aria-describedby');
    });
  });

  describe('Text Input and Validation', () => {
    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      const mockSetContent = jest.fn();
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        setContent: mockSetContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/terms and conditions text/i);
      await user.type(textarea, 'Sample terms text');

      expect(mockSetContent).toHaveBeenCalledWith('Sample terms text');
    });

    it('should validate minimum length requirement', () => {
      const mockValidateContent = jest.fn().mockReturnValue({
        isValid: false,
        errors: { content: 'Content must be at least 100 characters long' }
      });

      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: 'Too short',
        errors: { content: 'Content must be at least 100 characters long' },
        validateContent: mockValidateContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Content must be at least 100 characters long')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
    });

    it('should validate maximum length requirement', () => {
      const longContent = 'A'.repeat(100001);
      const mockValidateContent = jest.fn().mockReturnValue({
        isValid: false,
        errors: { content: 'Content must not exceed 100,000 characters' }
      });

      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: longContent,
        errors: { content: 'Content must not exceed 100,000 characters' },
        validateContent: mockValidateContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Content must not exceed 100,000 characters')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
    });

    it('should show real-time character count updates', () => {
      const validContent = 'A'.repeat(1000);
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: validContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('1,000 characters')).toBeInTheDocument();
      expect(screen.getByText(/900 characters to go/i)).toBeInTheDocument();
    });

    it('should handle paste operations correctly', async () => {
      const user = userEvent.setup();
      const mockSetContent = jest.fn();
      const pastedContent = 'Pasted terms and conditions content that is long enough to meet requirements.';
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        setContent: mockSetContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/terms and conditions text/i);
      await user.click(textarea);
      await user.paste(pastedContent);

      expect(mockSetContent).toHaveBeenCalledWith(pastedContent);
    });
  });

  describe('Form Submission', () => {
    const validContent = 'Valid terms and conditions content that meets the minimum length requirement for analysis processing.';

    it('should submit form with valid content', async () => {
      const user = userEvent.setup();
      const mockValidateContent = jest.fn().mockReturnValue({ isValid: true, errors: {} });
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: validContent,
        validateContent: mockValidateContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /analyze/i });
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: validContent,
        skipCache: false
      });
    });

    it('should prevent submission with invalid content', async () => {
      const user = userEvent.setup();
      const mockValidateContent = jest.fn().mockReturnValue({
        isValid: false,
        errors: { content: 'Content too short' }
      });
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: 'Short',
        errors: { content: 'Content too short' },
        validateContent: mockValidateContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /analyze/i });
      expect(submitButton).toBeDisabled();

      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should handle submission loading state', () => {
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: validContent,
        isSubmitting: true
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /analyzing/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should support keyboard submission', async () => {
      const user = userEvent.setup();
      const mockValidateContent = jest.fn().mockReturnValue({ isValid: true, errors: {} });
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: validContent,
        validateContent: mockValidateContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/terms and conditions text/i);
      await user.click(textarea);
      await user.keyboard('{Control>}{Enter}'); // Ctrl+Enter to submit

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe('Form Controls and Actions', () => {
    it('should clear content when clear button is clicked', async () => {
      const user = userEvent.setup();
      const mockReset = jest.fn();
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: 'Some content to be cleared',
        reset: mockReset
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(mockReset).toHaveBeenCalled();
    });

    it('should handle cancel action', async () => {
      const user = userEvent.setup();
      
      render(<AnalysisForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should show skip cache option for advanced users', () => {
      render(<AnalysisForm onSubmit={mockOnSubmit} showAdvancedOptions />);

      expect(screen.getByLabelText(/skip cache/i)).toBeInTheDocument();
      expect(screen.getByText(/force new analysis/i)).toBeInTheDocument();
    });

    it('should handle skip cache option submission', async () => {
      const user = userEvent.setup();
      const validContent = 'Valid content for testing cache skip functionality.';
      const mockValidateContent = jest.fn().mockReturnValue({ isValid: true, errors: {} });
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: validContent,
        validateContent: mockValidateContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} showAdvancedOptions />);

      const skipCacheCheckbox = screen.getByLabelText(/skip cache/i);
      await user.click(skipCacheCheckbox);

      const submitButton = screen.getByRole('button', { name: /analyze/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: validContent,
        skipCache: true
      });
    });
  });

  describe('User Experience Features', () => {
    it('should provide helpful input suggestions', () => {
      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/tip:/i)).toBeInTheDocument();
      expect(screen.getByText(/look for sections/i)).toBeInTheDocument();
      expect(screen.getByText(/account termination/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });

    it('should show content type detection', () => {
      const privacyPolicyContent = 'Privacy Policy - We collect your personal information...';
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: privacyPolicyContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/privacy policy detected/i)).toBeInTheDocument();
    });

    it('should provide content formatting suggestions', () => {
      const messyContent = 'Terms   of   Service\n\n\n\nSection 1:\n   Important stuff...';
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: messyContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/format detected issues/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clean formatting/i })).toBeInTheDocument();
    });

    it('should estimate analysis time based on content length', () => {
      const longContent = 'A'.repeat(50000); // Large content
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: longContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/estimated analysis time/i)).toBeInTheDocument();
      expect(screen.getByText(/45-60 seconds/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should display validation errors clearly', () => {
      const errors = {
        content: 'Content contains invalid characters',
        format: 'Unsupported file format detected'
      };
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        errors
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Content contains invalid characters')).toBeInTheDocument();
      expect(screen.getByText('Unsupported file format detected')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: 'Valid content for testing error handling in submission process.',
        validateContent: jest.fn().mockReturnValue({ isValid: true, errors: {} })
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /analyze/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      });
    });

    it('should auto-save draft content', () => {
      const mockSetContent = jest.fn();
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        setContent: mockSetContent
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} enableAutoSave />);

      // Should indicate auto-save is enabled
      expect(screen.getByText(/auto-save enabled/i)).toBeInTheDocument();
      expect(screen.getByTestId('autosave-indicator')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<AnalysisForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/terms and conditions text/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /analyze/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /clear/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
    });

    it('should announce status changes to screen readers', () => {
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        isSubmitting: true
      });

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveTextContent(/analyzing/i);
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide clear focus indicators', () => {
      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/terms and conditions text/i);
      expect(textarea).toHaveStyle('outline: none'); // Relies on CSS focus-visible
      
      const submitButton = screen.getByRole('button', { name: /analyze/i });
      expect(submitButton).toHaveClass('focus:ring-2');
    });
  });

  describe('Integration with Form Store', () => {
    it('should synchronize with store state correctly', () => {
      const storeState = {
        content: 'Test content from store',
        isSubmitting: false,
        errors: { content: 'Store validation error' },
        setContent: jest.fn(),
        setSubmitting: jest.fn(),
        setErrors: jest.fn(),
        validateContent: jest.fn().mockReturnValue({ isValid: false, errors: {} }),
        reset: jest.fn()
      };
      
      (useAnalysisFormStore as jest.Mock).mockReturnValue(storeState);

      render(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByDisplayValue('Test content from store')).toBeInTheDocument();
      expect(screen.getByText('Store validation error')).toBeInTheDocument();
    });

    it('should handle store updates correctly', () => {
      const mockSetContent = jest.fn();
      
      const { rerender } = render(<AnalysisForm onSubmit={mockOnSubmit} />);

      // Initial state
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: 'Initial content',
        setContent: mockSetContent
      });

      rerender(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByDisplayValue('Initial content')).toBeInTheDocument();

      // Updated state
      (useAnalysisFormStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        content: 'Updated content',
        setContent: mockSetContent
      });

      rerender(<AnalysisForm onSubmit={mockOnSubmit} />);

      expect(screen.getByDisplayValue('Updated content')).toBeInTheDocument();
    });
  });
});