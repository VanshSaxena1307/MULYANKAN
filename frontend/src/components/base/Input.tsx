import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightElement, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-arctic-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-arctic-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-lg border border-arctic-border bg-white/90 px-3.5 py-2 text-sm text-arctic-text-main shadow-arctic-sm placeholder:text-arctic-text-muted transition-colors',
              'focus:border-arctic-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-arctic-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              rightElement && 'pr-11',
              error && 'border-arctic-danger focus:border-arctic-danger focus:ring-arctic-danger/20',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-arctic-danger">{error}</p>}
        {!error && helperText && <p className="text-xs text-arctic-text-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
