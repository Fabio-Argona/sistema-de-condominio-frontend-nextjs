/**
 * Formatadores e validadores de texto e input
 */

// Validador de Email
export const formatEmail = (value: string): string => {
  return value.toLowerCase().trim();
};

export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  // Regex básico de validação de e-mail (RFC 2822 standard)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Formatador e Validador de Telefone (Máscara Celular/Fixo BR)
export const formatPhone = (value: string): string => {
  if (!value) return '';
  // Remove tudo o que não é dígito
  let cleanValue = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  if (cleanValue.length > 11) {
    cleanValue = cleanValue.slice(0, 11);
  }

  // Aplica a máscara dependendo do tamanho (Fixo vs Celular)
  if (cleanValue.length === 0) return '';
  if (cleanValue.length <= 2) return `(${cleanValue}`;
  if (cleanValue.length <= 6) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
  if (cleanValue.length <= 10) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 6)}-${cleanValue.slice(6)}`;
  
  // 11 dígitos celulares (XX) 9XXXX-XXXX
  return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7)}`;
};

export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

// Formatador e Validador de CPF
export const formatCPF = (value: string): string => {
  if (!value) return '';
  const cleanValue = value.replace(/\D/g, '').slice(0, 11);
  
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 6) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
  if (cleanValue.length <= 9) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
  
  return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9)}`;
};

export const isValidCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.length === 11;
};

// Formatador de Inícios de Parágrafos (Primeira Letra Maiúscula)
export const capitalizeSentences = (value: string): string => {
  if (!value) return '';
  
  // Esta regex acha: 
  // 1. O ínicio da string (ou precedido por espaços nulos)
  // 2. Pontos finais (.), Exclamações (!), Interrogações (?) ou Quebras de Linha (\n) seguidos de espaço ou não
  // E substitui a próxima letra encontrada por uma letra Maiúscula
  return value.replace(/(^\s*|[.!?]\s+|\n\s*)([a-z\u00E0-\u00FC])/g, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  });
};
