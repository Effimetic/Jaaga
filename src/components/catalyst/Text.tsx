import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'small';
export type TextColor = 'primary' | 'secondary' | 'muted' | 'error' | 'success' | 'warning';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  className?: string;
  style?: TextStyle;
}

const getVariantStyles = (variant: TextVariant): TextStyle => {
  const variants = {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    h6: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
  };

  return variants[variant];
};

const getColorStyles = (color: TextColor): TextStyle => {
  const colors = {
    primary: {
      color: '#111827', // gray-900
    },
    secondary: {
      color: '#374151', // gray-700
    },
    muted: {
      color: '#6b7280', // gray-500
    },
    error: {
      color: '#dc2626', // red-600
    },
    success: {
      color: '#16a34a', // green-600
    },
    warning: {
      color: '#d97706', // amber-600
    },
  };

  return colors[color];
};

export function Text({
  variant = 'body',
  color = 'primary',
  className,
  style,
  children,
  ...props
}: TextProps) {
  const variantStyles = getVariantStyles(variant);
  const colorStyles = getColorStyles(color);

  return (
    <RNText
      style={[variantStyles, colorStyles, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// Convenience components for common text variants
export function Heading({ level = 1, ...props }: { level?: 1 | 2 | 3 | 4 | 5 | 6 } & Omit<TextProps, 'variant'>) {
  const variant = `h${level}` as TextVariant;
  return <Text variant={variant} {...props} />;
}

export function Subheading({ level = 2, ...props }: { level?: 1 | 2 | 3 | 4 | 5 | 6 } & Omit<TextProps, 'variant'>) {
  const variant = `h${level}` as TextVariant;
  return <Text variant={variant} {...props} />;
}

export function BodyText(props: Omit<TextProps, 'variant'>) {
  return <Text variant="body" {...props} />;
}

export function Caption(props: Omit<TextProps, 'variant'>) {
  return <Text variant="caption" {...props} />;
}

export function SmallText(props: Omit<TextProps, 'variant'>) {
  return <Text variant="small" {...props} />;
}

export default Text;
