import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Button, Input } from '../ui';
import { useAuth } from '../../hooks';
import { isValidEmail } from '../../utils/formatters';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  passwordConfirmation?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { register, isLoading } = useAuth();

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Password confirmation validation
    if (!formData.passwordConfirmation) {
      newErrors.passwordConfirmation = 'Password confirmation is required';
    } else if (formData.password !== formData.passwordConfirmation) {
      newErrors.passwordConfirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const result = await register({
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      passwordConfirmation: formData.passwordConfirmation,
    });

    if (result.success) {
      onSuccess?.();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          <Input
            label="Full Name"
            value={formData.name}
            onChangeText={(text) => updateField('name', text)}
            placeholder="Enter your full name"
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Password"
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            placeholder="Create a password"
            secureTextEntry
            showPasswordToggle
            autoComplete="password-new"
            error={errors.password}
            hint="Password must be at least 6 characters"
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Confirm Password"
            value={formData.passwordConfirmation}
            onChangeText={(text) => updateField('passwordConfirmation', text)}
            placeholder="Confirm your password"
            secureTextEntry
            showPasswordToggle
            autoComplete="password-new"
            error={errors.passwordConfirmation}
            containerStyle={styles.inputContainer}
          />

          <Button
            title="Create Account"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
          />

          {onSwitchToLogin && (
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                Already have an account?{' '}
              </Text>
              <Button
                title="Sign In"
                variant="ghost"
                onPress={onSwitchToLogin}
                style={styles.switchButton}
                textStyle={styles.switchButtonText}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },

  inputContainer: {
    marginBottom: 20,
  },

  submitButton: {
    marginTop: 8,
    marginBottom: 24,
  },

  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  switchText: {
    fontSize: 16,
    color: '#8E8E93',
  },

  switchButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 'auto',
  },

  switchButtonText: {
    fontSize: 16,
  },
});
