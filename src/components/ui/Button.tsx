import React from 'react';
import { Pressable, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary',
  secondary: 'bg-brand-secondary',
  ghost: 'bg-transparent border border-slate-300',
};

const textVariantClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-black',
  ghost: 'text-slate-900',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 rounded-md',
  md: 'px-4 py-3 rounded-lg',
  lg: 'px-5 py-4 rounded-xl',
};

export function Button({
  title,
  onPress,
  disabled,
  variant = 'primary',
  size = 'md',
  className,
  textClassName,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        'active:opacity-90',
        'items-center justify-center',
        variantClasses[variant],
        sizeClasses[size],
        disabled ? 'opacity-50' : '',
        className || '',
      ].join(' ')}
    >
      <Text className={['font-semibold', textVariantClasses[variant], textClassName || ''].join(' ')}>
        {title}
      </Text>
    </Pressable>
  );
}

export default Button;

