import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  hintStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  hintStyle,
  leftIcon,
  rightIcon,
  secureTextEntry,
  showPasswordToggle = false,
  ...props
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  
  const inputContainerStyle = [
    styles.inputContainer,
    isFocused && styles.focused,
    hasError && styles.error,
  ];

  const actualRightIcon = showPasswordToggle && secureTextEntry ? (
    <TouchableOpacity
      onPress={() => setIsSecure(!isSecure)}
      style={styles.iconContainer}
    >
      <Text style={styles.toggleText}>{isSecure ? 'Show' : 'Hide'}</Text>
    </TouchableOpacity>
  ) : rightIcon ? (
    <View style={styles.iconContainer}>{rightIcon}</View>
  ) : null;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, hasError && styles.errorLabel, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={inputContainerStyle}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            (actualRightIcon || rightIcon) ? styles.inputWithRightIcon : undefined,
            inputStyle,
          ]}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#999999"
          {...props}
        />
        
        {actualRightIcon}
      </View>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>{error}</Text>
      )}
      
      {hint && !error && (
        <Text style={[styles.hintText, hintStyle]}>{hint}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  
  errorLabel: {
    color: '#FF3B30',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  
  focused: {
    borderColor: '#007AFF',
  },
  
  error: {
    borderColor: '#FF3B30',
  },
  
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  
  inputWithRightIcon: {
    paddingRight: 8,
  },
  
  iconContainer: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  toggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  
  hintText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
});