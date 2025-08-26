import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: ViewStyle;
}

const getVariantStyles = (variant: CardProps['variant']): ViewStyle => {
  const variants = {
    default: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    elevated: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    outlined: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e5e7eb', // gray-200
    },
  };

  return variants[variant || 'default'];
};

const getPaddingStyles = (padding: CardProps['padding']): ViewStyle => {
  const paddings = {
    none: {
      padding: 0,
    },
    sm: {
      padding: 12,
    },
    md: {
      padding: 16,
    },
    lg: {
      padding: 24,
    },
  };

  return paddings[padding || 'md'];
};

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  style,
  children,
  ...props
}: CardProps) {
  const variantStyles = getVariantStyles(variant);
  const paddingStyles = getPaddingStyles(padding);

  return (
    <View
      style={[variantStyles, paddingStyles, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export default Card;
