/**
 * Translates Firebase error codes to user-friendly Portuguese messages
 */
export function translateFirebaseError(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    // Auth errors
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Usuário desabilitado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Email já cadastrado',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/invalid-credential': 'Credenciais inválidas',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',

    // Firestore errors
    'permission-denied': 'Permissão negada',
    'unavailable': 'Serviço temporariamente indisponível',
    'not-found': 'Documento não encontrado',
  };

  return errorMessages[errorCode] || 'Erro desconhecido. Tente novamente';
}

/**
 * Validates email format
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email é obrigatório';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email inválido';
  }

  return null;
}

/**
 * Validates password
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Senha é obrigatória';
  }

  if (password.length < 6) {
    return 'Senha deve ter no mínimo 6 caracteres';
  }

  return null;
}

/**
 * Validates name
 */
export function validateName(name: string): string | null {
  if (!name) {
    return 'Nome é obrigatório';
  }

  if (name.trim().length < 3) {
    return 'Nome deve ter no mínimo 3 caracteres';
  }

  return null;
}
