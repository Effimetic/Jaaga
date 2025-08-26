import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className, ...rest }: InputProps) {
  return (
    <TextInput
      {...rest}
      className={[
        'px-4 py-3 rounded-lg',
        'bg-white dark:bg-slate-900',
        'border border-slate-300 dark:border-slate-700',
        'text-slate-900 dark:text-slate-100',
        'placeholder:text-slate-400',
        className || '',
      ].join(' ')}
    />
  );
}

export default Input;

