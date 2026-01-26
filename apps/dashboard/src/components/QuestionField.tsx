'use client';

import type { ClarificationQuestion } from '@/types/portal';

export interface QuestionFieldProps {
  question: ClarificationQuestion;
  value: string | string[] | number | null;
  onChange: (questionId: string, value: string | string[] | number) => void;
  error?: string;
}

export function QuestionField({ question, value, onChange, error }: QuestionFieldProps) {
  const { id, text, inputType, required, options } = question;

  const fieldStyle: React.CSSProperties = {
    marginBottom: '16px',
    padding: '12px',
    border: error ? '1px solid #e53e3e' : '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: '6px',
    fontSize: '14px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  return (
    <div style={fieldStyle} data-testid={`question-field-${id}`}>
      <label style={labelStyle} htmlFor={`q-${id}`}>
        {text}
        {required && <span style={{ color: '#e53e3e', marginLeft: '4px' }}>*</span>}
      </label>

      {inputType === 'short_text' && (
        <input
          id={`q-${id}`}
          type="text"
          style={inputStyle}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(id, e.target.value)}
          placeholder="Type your answer..."
          data-testid={`input-short-text-${id}`}
        />
      )}

      {inputType === 'long_text' && (
        <textarea
          id={`q-${id}`}
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(id, e.target.value)}
          placeholder="Describe in detail..."
          data-testid={`input-long-text-${id}`}
        />
      )}

      {inputType === 'number' && (
        <input
          id={`q-${id}`}
          type="number"
          style={inputStyle}
          value={value !== null ? String(value) : ''}
          onChange={(e) => onChange(id, Number(e.target.value))}
          placeholder="Enter a number..."
          data-testid={`input-number-${id}`}
        />
      )}

      {inputType === 'date' && (
        <input
          id={`q-${id}`}
          type="date"
          style={inputStyle}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(id, e.target.value)}
          data-testid={`input-date-${id}`}
        />
      )}

      {inputType === 'single_select' && options && (
        <div data-testid={`input-single-select-${id}`}>
          {options.map((option) => (
            <label
              key={option}
              style={{
                display: 'block',
                padding: '6px 0',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <input
                type="radio"
                name={`q-${id}`}
                value={option}
                checked={value === option}
                onChange={() => onChange(id, option)}
                style={{ marginRight: '8px' }}
              />
              {option}
            </label>
          ))}
        </div>
      )}

      {inputType === 'multi_select' && options && (
        <div data-testid={`input-multi-select-${id}`}>
          {options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option);
            return (
              <label
                key={option}
                style={{
                  display: 'block',
                  padding: '6px 0',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    const next = selected
                      ? current.filter((v) => v !== option)
                      : [...current, option];
                    onChange(id, next);
                  }}
                  style={{ marginRight: '8px' }}
                />
                {option}
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }} data-testid={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}
