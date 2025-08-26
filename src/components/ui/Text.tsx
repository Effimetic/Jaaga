import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

const variantClasses: Record<TextVariant, string> = {
  title: 'text-2xl font-bold text-slate-900',
  subtitle: 'text-lg font-semibold text-slate-800',
  body: 'text-base text-slate-800',
  caption: 'text-xs text-slate-500',
};

export function Text({ variant = 'body', className, children, ...rest }: TextProps) {
  return (
    <RNText {...rest} className={[variantClasses[variant], className || ''].join(' ')}>
      {children}
    </RNText>
  );
}

export default Text;

