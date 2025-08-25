import React from 'react';
import { View, ViewProps } from 'react-native';

export interface SurfaceProps extends ViewProps {
  className?: string;
}

export function Surface({ className, children, ...rest }: SurfaceProps) {
  return (
    <View
      {...rest}
      className={[
        'bg-slate-50 dark:bg-slate-950',
        className || '',
      ].join(' ')}
    >
      {children}
    </View>
  );
}

export default Surface;

