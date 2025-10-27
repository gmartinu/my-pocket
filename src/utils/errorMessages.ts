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
