/**
 * Utilitários para tratamento de datas no fuso horário de Brasília (UTC-3)
 */

export const TIMEZONE_BR = 'America/Sao_Paulo';

/**
 * Retorna a data e hora atual no fuso horário de Brasília
 */
export const getAgoraBR = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE_BR }));
};

/**
 * Converte uma string de data (ISO ou BR) para um objeto Date, 
 * garantindo que a interpretação seja correta no fuso de Brasília.
 * Evita o erro comum de "um dia a menos" ao carregar datas YYYY-MM-DD.
 */
export const parseDataBR = (dataStr: string | Date): Date => {
  if (dataStr instanceof Date) return dataStr;
  
  // Se for formato YYYY-MM-DD (ISO Date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
    const [year, month, day] = dataStr.split('-').map(Number);
    // Cria no fuso local do navegador, mas tratando como 00:00:00
    return new Date(year, month - 1, day, 0, 0, 0);
  }

  // Se for formato DD/MM/YYYY (BR Date)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
    const [day, month, year] = dataStr.split('/').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0);
  }

  return new Date(dataStr);
};

/**
 * Formata uma data para string DD/MM/YYYY no fuso de Brasília
 */
export const formatarDataBR = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseDataBR(date) : date;
  return d.toLocaleDateString('pt-BR', {
    timeZone: TIMEZONE_BR,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata data e hora para string DD/MM/YYYY HH:mm no fuso de Brasília
 */
export const formatarDataHoraBR = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    timeZone: TIMEZONE_BR,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Retorna o nome do mês abreviado em português (ex: Jan, Fev...)
 */
export const getMesAbreviadoBR = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseDataBR(date) : date;
  const monthName = d.toLocaleString('pt-BR', { 
    timeZone: TIMEZONE_BR,
    month: 'short' 
  });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
};
