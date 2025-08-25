import React from 'react';
import { View, ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      className={[
        'rounded-xl bg-white dark:bg-slate-900',
        'shadow-sm border border-slate-200 dark:border-slate-800',
        'p-4',
        className || '',
      ].join(' ')}
    >
      {children}
    </View>
  );
}

export default Card;

