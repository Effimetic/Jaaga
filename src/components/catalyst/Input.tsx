import React, { forwardRef } from 'react';
import { Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  containerStyle,
  inputStyle,
  labelStyle,
  style,
  ...props
}, ref) => {
  const hasError = !!error;
  
  const containerStyles: ViewStyle = {
    marginBottom: 16,
    ...containerStyle,
  };

  const labelStyles: TextStyle = {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', // gray-700
    marginBottom: 6,
    ...labelStyle,
  };

  const inputContainerStyles: ViewStyle = {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: hasError ? '#dc2626' : '#d1d5db', // red-600 : gray-300
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  };

  const inputStyles: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: '#111827', // gray-900
    paddingVertical: 0,
    ...inputStyle,
    ...style,
  };

  const helperTextStyles: TextStyle = {
    fontSize: 12,
    color: hasError ? '#dc2626' : '#6b7280', // red-600 : gray-500
    marginTop: 4,
  };

  const iconContainerStyles: ViewStyle = {
    marginRight: 8,
  };

  const rightIconContainerStyles: ViewStyle = {
    marginLeft: 8,
  };

  return (
    <View style={containerStyles}>
      {label && <Text style={labelStyles}>{label}</Text>}
      
      <View style={inputContainerStyles}>
        {leftIcon && (
          <View style={iconContainerStyles}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={ref}
          style={inputStyles}
          placeholderTextColor="#9ca3af" // gray-400
          {...props}
        />
        
        {rightIcon && (
          <View style={rightIconContainerStyles}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={helperTextStyles}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

export default Input;
