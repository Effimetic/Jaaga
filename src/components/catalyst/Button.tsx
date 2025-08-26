import React from 'react';
import { Pressable, Text, TextStyle, ViewStyle } from 'react-native';

type ButtonVariant = 'solid' | 'outline' | 'plain';
type ButtonColor = 'zinc' | 'dark' | 'white' | 'indigo' | 'blue' | 'green' | 'red';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  className?: string;
  style?: ViewStyle;
}

const baseStyles = {
  // Base styles for all buttons
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 8,
    borderWidth: 1,
  },
  
  // Size variants
  sizes: {
    sm: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 36,
    },
    md: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
    },
    lg: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      minHeight: 52,
    },
  },
  
  // Text styles
  textSizes: {
    sm: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    md: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    lg: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
  },
};

const getColorStyles = (color: ButtonColor, variant: ButtonVariant) => {
  const colors = {
    zinc: {
      solid: {
        backgroundColor: '#52525b', // zinc-600
        borderColor: '#3f3f46', // zinc-700
        textColor: '#ffffff',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#a1a1aa', // zinc-400
        textColor: '#27272a', // zinc-900
      },
      plain: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#27272a', // zinc-900
      },
    },
    dark: {
      solid: {
        backgroundColor: '#18181b', // zinc-900
        borderColor: '#09090b', // zinc-950
        textColor: '#ffffff',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#27272a', // zinc-800
        textColor: '#18181b', // zinc-900
      },
      plain: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#18181b', // zinc-900
      },
    },
    white: {
      solid: {
        backgroundColor: '#ffffff',
        borderColor: '#e4e4e7', // zinc-200
        textColor: '#18181b', // zinc-900
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#e4e4e7', // zinc-200
        textColor: '#18181b', // zinc-900
      },
      plain: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#18181b', // zinc-900
      },
    },
    indigo: {
      solid: {
        backgroundColor: '#6366f1', // indigo-500
        borderColor: '#4f46e5', // indigo-600
        textColor: '#ffffff',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#6366f1', // indigo-500
        textColor: '#6366f1', // indigo-500
      },
      plain: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#6366f1', // indigo-500
      },
    },
    blue: {
      solid: {
        backgroundColor: '#2563eb', // blue-600
        borderColor: '#1d4ed8', // blue-700
        textColor: '#ffffff',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#2563eb', // blue-600
        textColor: '#2563eb', // blue-600
      },
      plain: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#2563eb', // blue-600
      },
    },
    green: {
      solid: {
        backgroundColor: '#16a34a', // green-600
        borderColor: '#15803d', // green-700
        textColor: '#ffffff',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#16a34a', // green-600
        textColor: '#16a34a', // green-600
      },
      plain: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#16a34a', // green-600
      },
    },
    red: {
      solid: {
        backgroundColor: '#dc2626', // red-600
        borderColor: '#b91c1c', // red-700
        textColor: '#ffffff',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#dc2626', // red-600
        textColor: '#dc2626', // red-600
      },
      plain: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#dc2626', // red-600
      },
    },
  };

  return colors[color][variant];
};

export function Button({
  children,
  onPress,
  disabled = false,
  variant = 'solid',
  color = 'zinc',
  size = 'md',
  className,
  style,
}: ButtonProps) {
  const colorStyles = getColorStyles(color, variant);
  const sizeStyles = baseStyles.sizes[size];
  const textSizeStyles = baseStyles.textSizes[size];

  const buttonStyle: ViewStyle = {
    ...baseStyles.base,
    ...sizeStyles,
    ...colorStyles,
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  const textStyle: TextStyle = {
    ...textSizeStyles,
    color: colorStyles.textColor,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        buttonStyle,
        pressed && !disabled && {
          opacity: 0.8,
          transform: [{ scale: 0.98 }],
        },
      ]}
    >
      <Text style={textStyle}>{children}</Text>
    </Pressable>
  );
}

export default Button;
