'use client';

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { formatPhone, formatCPF, capitalizeSentences } from '@/utils/formatters';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  helperText?: string;
  mask?: 'phone' | 'cpf' | 'capitalize' | 'none';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className = '', id, mask, onChange, ...props }, ref) => {
    const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (mask === 'phone') {
        e.target.value = formatPhone(e.target.value);
      } else if (mask === 'cpf') {
        e.target.value = formatCPF(e.target.value);
      } else if (mask === 'capitalize') {
        const cursorPosition = e.target.selectionStart;
        const newValue = capitalizeSentences(e.target.value);
        e.target.value = newValue;
        
        // Restore cursor position trick
        setTimeout(() => {
          if (e.target && cursorPosition) {
            e.target.setSelectionRange(cursorPosition, cursorPosition);
          }
        }, 0);
      }
      
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
            <input
              ref={ref}
              id={inputId}
              onChange={handleChange}
              className={`
                w-full rounded-xl border bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                disabled:opacity-50 disabled:cursor-not-allowed
                ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5
                ${
                  error
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500/50'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                }
                ${className}
              `}
              {...props}
            />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
