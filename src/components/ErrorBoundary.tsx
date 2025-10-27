import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Surface } from 'react-native-paper';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Surface style={styles.errorCard} elevation={2}>
            <Text variant="headlineMedium" style={styles.errorTitle}>
              Oops! Algo deu errado
            </Text>

            <Text variant="bodyLarge" style={styles.errorMessage}>
              Encontramos um erro inesperado. Por favor, tente novamente.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text variant="titleSmall" style={styles.debugTitle}>
                  Informações de Debug:
                </Text>
                <Text variant="bodySmall" style={styles.debugText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text variant="bodySmall" style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <Button
              mode="contained"
              onPress={this.handleRetry}
              icon="refresh"
              style={styles.retryButton}
            >
              Tentar Novamente
            </Button>
          </Surface>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F8FC',
  },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    maxWidth: 400,
    width: '100%',
  },
  errorTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#D32F2F',
  },
  errorMessage: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  debugInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  debugTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 10,
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 8,
  },
});

export default ErrorBoundary;
