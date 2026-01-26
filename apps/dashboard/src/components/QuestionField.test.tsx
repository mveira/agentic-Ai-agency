import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionField } from './QuestionField';
import type { ClarificationQuestion } from '@/types/portal';

function makeQuestion(overrides: Partial<ClarificationQuestion> = {}): ClarificationQuestion {
  return {
    id: 'q-test',
    text: 'Test question?',
    inputType: 'short_text',
    required: false,
    answer: null,
    ...overrides,
  };
}

describe('QuestionField', () => {
  describe('short_text', () => {
    it('renders a text input', () => {
      const onChange = vi.fn();
      render(
        <QuestionField
          question={makeQuestion({ inputType: 'short_text' })}
          value={null}
          onChange={onChange}
        />
      );

      const input = screen.getByTestId('input-short-text-q-test');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('fires onChange with string value', () => {
      const onChange = vi.fn();
      render(
        <QuestionField
          question={makeQuestion({ inputType: 'short_text' })}
          value=""
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('input-short-text-q-test'), {
        target: { value: 'hello' },
      });
      expect(onChange).toHaveBeenCalledWith('q-test', 'hello');
    });
  });

  describe('long_text', () => {
    it('renders a textarea', () => {
      render(
        <QuestionField
          question={makeQuestion({ inputType: 'long_text' })}
          value={null}
          onChange={vi.fn()}
        />
      );

      const textarea = screen.getByTestId('input-long-text-q-test');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });

  describe('number', () => {
    it('renders a number input', () => {
      render(
        <QuestionField
          question={makeQuestion({ inputType: 'number' })}
          value={null}
          onChange={vi.fn()}
        />
      );

      const input = screen.getByTestId('input-number-q-test');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'number');
    });

    it('fires onChange with numeric value', () => {
      const onChange = vi.fn();
      render(
        <QuestionField
          question={makeQuestion({ inputType: 'number' })}
          value={null}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('input-number-q-test'), {
        target: { value: '42' },
      });
      expect(onChange).toHaveBeenCalledWith('q-test', 42);
    });
  });

  describe('date', () => {
    it('renders a date input', () => {
      render(
        <QuestionField
          question={makeQuestion({ inputType: 'date' })}
          value={null}
          onChange={vi.fn()}
        />
      );

      const input = screen.getByTestId('input-date-q-test');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });
  });

  describe('single_select', () => {
    it('renders radio buttons for each option', () => {
      render(
        <QuestionField
          question={makeQuestion({
            inputType: 'single_select',
            options: ['Option A', 'Option B', 'Option C'],
          })}
          value={null}
          onChange={vi.fn()}
        />
      );

      const container = screen.getByTestId('input-single-select-q-test');
      const radios = container.querySelectorAll('input[type="radio"]');
      expect(radios).toHaveLength(3);
    });

    it('fires onChange with selected option', () => {
      const onChange = vi.fn();
      render(
        <QuestionField
          question={makeQuestion({
            inputType: 'single_select',
            options: ['Option A', 'Option B'],
          })}
          value={null}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Option B'));
      expect(onChange).toHaveBeenCalledWith('q-test', 'Option B');
    });
  });

  describe('multi_select', () => {
    it('renders checkboxes for each option', () => {
      render(
        <QuestionField
          question={makeQuestion({
            inputType: 'multi_select',
            options: ['A', 'B', 'C', 'D'],
          })}
          value={[]}
          onChange={vi.fn()}
        />
      );

      const container = screen.getByTestId('input-multi-select-q-test');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(4);
    });

    it('fires onChange adding to selection', () => {
      const onChange = vi.fn();
      render(
        <QuestionField
          question={makeQuestion({
            inputType: 'multi_select',
            options: ['A', 'B', 'C'],
          })}
          value={['A']}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('C'));
      expect(onChange).toHaveBeenCalledWith('q-test', ['A', 'C']);
    });

    it('fires onChange removing from selection', () => {
      const onChange = vi.fn();
      render(
        <QuestionField
          question={makeQuestion({
            inputType: 'multi_select',
            options: ['A', 'B'],
          })}
          value={['A', 'B']}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('A'));
      expect(onChange).toHaveBeenCalledWith('q-test', ['B']);
    });
  });

  describe('required indicator', () => {
    it('shows asterisk for required questions', () => {
      render(
        <QuestionField
          question={makeQuestion({ required: true })}
          value={null}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not show asterisk for optional questions', () => {
      render(
        <QuestionField
          question={makeQuestion({ required: false })}
          value={null}
          onChange={vi.fn()}
        />
      );

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('shows error message when provided', () => {
      render(
        <QuestionField
          question={makeQuestion()}
          value={null}
          onChange={vi.fn()}
          error="This field is required"
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('does not show error when not provided', () => {
      render(
        <QuestionField
          question={makeQuestion()}
          value={null}
          onChange={vi.fn()}
        />
      );

      expect(screen.queryByTestId('error-q-test')).not.toBeInTheDocument();
    });
  });
});
