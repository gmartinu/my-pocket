import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AuthScreenNavigationProp } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  validateEmail,
  validatePassword,
  validateName,
} from '../../utils/errorMessages';

export default function RegisterScreen() {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const theme = useTheme();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    console.log('📝 [RegisterScreen] Starting registration...');
    // Clear previous errors
    setError('');

    // Validate inputs
    const nameError = validateName(name);
    if (nameError) {
      console.log('❌ [RegisterScreen] Name validation failed:', nameError);
      setError(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      console.log('❌ [RegisterScreen] Email validation failed:', emailError);
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      console.log('❌ [RegisterScreen] Password validation failed:', passwordError);
      setError(passwordError);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      console.log('❌ [RegisterScreen] Passwords do not match');
      setError('As senhas não coincidem');
      return;
    }

    console.log('✅ [RegisterScreen] All validations passed');
    console.log('✅ [RegisterScreen] Calling signUp with:', { email: email.trim(), name: name.trim() });

    // Attempt sign up
    setLoading(true);
    try {
      // Supabase signature: signUp(email, password, displayName?)
      await signUp(email.trim(), password, name.trim());
      console.log('✅ [RegisterScreen] SignUp completed successfully');
      // User will be automatically navigated after successful registration
      // via the AuthContext's onAuthStateChanged listener
    } catch (err: any) {
      console.error('❌ [RegisterScreen] SignUp error:', err);
      console.error('❌ [RegisterScreen] Error message:', err.message);
      console.error('❌ [RegisterScreen] Error code:', err.code);
      setError(err.message || 'Erro desconhecido ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.surface} elevation={2}>
          <Text variant="headlineMedium" style={styles.title}>
            Criar conta
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Preencha os dados abaixo
          </Text>

          <TextInput
            label="Nome"
            value={name}
            onChangeText={setName}
            mode="outlined"
            autoCapitalize="words"
            autoComplete="name"
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            disabled={loading}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
            disabled={loading}
          />

          <TextInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
            disabled={loading}
          />

          <TextInput
            label="Confirmar senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="password"
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
            style={styles.input}
            disabled={loading}
          />

          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Cadastrar
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
            style={styles.linkButton}
          >
            Já tem uma conta? Entrar
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 8,
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
});
