import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

export interface SurfaceProps extends ViewProps {
  variant?: 'default' | 'secondary' | 'tertiary';
  className?: string;
  style?: ViewStyle;
}

const getVariantStyles = (variant: SurfaceProps['variant']): ViewStyle => {
  const variants = {
    default: {
      backgroundColor: '#ffffff', // white
    },
    secondary: {
      backgroundColor: '#f9fafb', // gray-50
    },
    tertiary: {
      backgroundColor: '#f3f4f6', // gray-100
    },
  };

  return variants[variant || 'default'];
};

export function Surface({
  variant = 'default',
  className,
  style,
  children,
  ...props
}: SurfaceProps) {
  const variantStyles = getVariantStyles(variant);

  return (
    <View
      style={[variantStyles, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export default Surface;
