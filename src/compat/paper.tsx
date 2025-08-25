import React from 'react';
import { View, Text as RNText, TextInput as RNTextInput, TextInputProps as RnTextInputProps, ViewProps, StyleProp, ViewStyle, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UIButton from '../components/ui/Button';
import UICard from '../components/ui/Card';
import UISurface from '../components/ui/Surface';

// Text compatibility
type PaperTextVariant =
  | 'displayLarge' | 'displayMedium' | 'displaySmall'
  | 'headlineLarge' | 'headlineMedium' | 'headlineSmall'
  | 'titleLarge' | 'titleMedium' | 'titleSmall'
  | 'labelLarge' | 'labelMedium' | 'labelSmall'
  | 'bodyLarge' | 'bodyMedium' | 'bodySmall';

export interface PaperTextProps extends React.ComponentProps<typeof RNText> {
  variant?: PaperTextVariant;
}

const textVariantClass: Record<PaperTextVariant, string> = {
  displayLarge: 'text-5xl font-extrabold',
  displayMedium: 'text-4xl font-extrabold',
  displaySmall: 'text-3xl font-bold',
  headlineLarge: 'text-2xl font-bold',
  headlineMedium: 'text-xl font-bold',
  headlineSmall: 'text-lg font-semibold',
  titleLarge: 'text-xl font-semibold',
  titleMedium: 'text-lg font-semibold',
  titleSmall: 'text-base font-semibold',
  labelLarge: 'text-sm font-semibold uppercase tracking-wide',
  labelMedium: 'text-xs font-semibold uppercase tracking-wide',
  labelSmall: 'text-[10px] font-semibold uppercase tracking-wide',
  bodyLarge: 'text-base',
  bodyMedium: 'text-sm',
  bodySmall: 'text-xs',
};

export function Text({ variant = 'bodyMedium', className, style, ...rest }: PaperTextProps & { className?: string }) {
  return <RNText {...rest} style={style} className={[textVariantClass[variant], className || ''].join(' ')} />;
}

// Button compatibility
type PaperButtonMode = 'text' | 'outlined' | 'contained';
export interface PaperButtonProps {
  mode?: PaperButtonMode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Button({ mode = 'contained', onPress, disabled, children, style }: PaperButtonProps) {
  const title = typeof children === 'string' ? children : undefined;
  const variant = mode === 'contained' ? 'primary' : mode === 'outlined' ? 'ghost' : 'ghost';
  return (
    <UIButton title={title || ''} onPress={onPress} disabled={disabled} variant={variant} style={style as ViewStyle} />
  );
}

// Card compatibility
export interface PaperCardProps extends ViewProps { }

function CardBase({ children, ...rest }: PaperCardProps) {
  return <UICard {...rest}>{children}</UICard>;
}

function CardContent({ children, style, ...rest }: ViewProps) {
  return (
    <View {...rest} style={style} className={['p-4'].join(' ')}>
      {children}
    </View>
  );
}

export const Card = Object.assign(CardBase, { Content: CardContent });

// Surface compatibility
export interface PaperSurfaceProps extends ViewProps {
  elevation?: number;
}

export function Surface({ children, elevation, style, ...rest }: PaperSurfaceProps) {
  return (
    <UISurface {...rest} style={style} className={['rounded-xl'].join(' ')}>
      {children}
    </UISurface>
  );
}

// TextInput compatibility
export interface PaperTextInputProps extends Omit<RnTextInputProps, 'onChangeText'> {
  label?: string;
  mode?: 'outlined' | 'flat';
  left?: React.ReactNode;
  right?: React.ReactNode;
  onChangeText?: (text: string) => void;
}

function TextInputBase({ label, left, right, style, ...rest }: PaperTextInputProps) {
  return (
    <View style={style}>
      {label ? <RNText className="text-xs text-slate-600 mb-1">{label}</RNText> : null}
      <View className="flex-row items-center border border-slate-300 rounded-lg bg-white">
        {left}
        <RNTextInput
          {...rest}
          className="flex-1 px-3 py-3 text-slate-900"
          placeholderTextColor="#9ca3af"
        />
        {right}
      </View>
    </View>
  );
}

function TextInputIcon({ icon, color = '#64748b', size = 20 }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={icon} color={color} size={size} />;
}

export const TextInput = Object.assign(TextInputBase, { Icon: TextInputIcon });

// Chip compatibility
export interface ChipProps {
  children?: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ children, selected, onPress, style }: ChipProps) {
  return (
    <Pressable onPress={onPress} style={style as ViewStyle} className={[
      'px-3 py-1 rounded-full border',
      selected ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300',
    ].join(' ')}>
      <RNText className={[selected ? 'text-white' : 'text-slate-800', 'text-sm'].join(' ')}>{children as any}</RNText>
    </Pressable>
  );
}

// Divider compatibility
export function Divider() {
  return <View className="h-px bg-slate-200 my-3" />;
}

// Simple Switch compatibility
export function Switch({ value, onValueChange }: { value: boolean; onValueChange?: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      className={[
        'w-11 h-6 rounded-full flex-row items-center px-0.5',
        value ? 'bg-slate-900' : 'bg-slate-300',
      ].join(' ')}
    >
      <View className={[
        'w-5 h-5 rounded-full bg-white',
        value ? 'ml-5' : 'ml-0',
      ].join(' ')} />
    </Pressable>
  );
}

// Minimal Portal/Modal compatibility
export function Portal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function Modal({ visible, onDismiss, children }: { visible: boolean; onDismiss?: () => void; children?: React.ReactNode }) {
  if (!visible) return null;
  return (
    <View className="absolute inset-0 items-center justify-center bg-black/40">
      <Pressable className="absolute inset-0" onPress={onDismiss} />
      <View className="mx-6 rounded-xl bg-white p-4 shadow-xl">
        {children}
      </View>
    </View>
  );
}

// IconButton compatibility
export function IconButton({ icon, onPress, size = 20 }: { icon: keyof typeof MaterialCommunityIcons.glyphMap | React.ReactNode; onPress?: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} className="p-2 rounded-full">
      {typeof icon === 'string' ? (
        <MaterialCommunityIcons name={icon} size={size} />
      ) : (
        icon
      )}
    </Pressable>
  );
}

