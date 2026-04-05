// ============================================
// TYPES - Sistema de Gestão de Condomínio
// ============================================

// Roles
export type UserRole = 'SINDICO' | 'MORADOR' | 'PORTEIRO';

// Auth
export interface User {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  apartamento?: string;
  bloco?: string;
  telefone?: string;
  avatar?: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DecodedToken {
  sub: string;
  role: UserRole;
  userId: number;
  nome: string;
  exp: number;
  iat: number;
}

// Morador (Resident)
export interface Morador {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  apartamento: string;
  bloco: string;
  dataNascimento?: string;
  dataEntrada?: string;
  ativo: boolean;
  role?: UserRole;
  avatar?: string;
  ultimoAcesso?: string;
}

// Log de Acesso
export interface LogAcesso {
  id: number;
  usuarioNome: string;
  usuarioEmail: string;
  role: string;
  dataHora: string;
  ip: string;
  pagina?: string;
}

export interface MoradorFormData {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  apartamento: string;
  bloco: string;
  dataNascimento?: string;
  senha?: string;
}

// Ocorrência (Occurrence)
export type OcorrenciaStatus = 'ABERTA' | 'EM_ANDAMENTO' | 'RESOLVIDA' | 'FECHADA';
export type OcorrenciaPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Ocorrencia {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  status: OcorrenciaStatus;
  prioridade: OcorrenciaPrioridade;
  moradorId: number;
  moradorNome: string;
  apartamento: string;
  bloco: string;
  dataCriacao: string;
  dataAtualizacao: string;
  respostasSindico?: string[];
}

export interface OcorrenciaFormData {
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: OcorrenciaPrioridade;
}

// Reserva (Reservation)
export type ReservaStatus = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA';

export interface AreaComum {
  id: number;
  nome: string;
  descricao: string;
  capacidade: number;
  valorReserva: number;
  horarioAbertura: string;
  horarioFechamento: string;
  imagem?: string;
  disponivel: boolean;
  regras?: string;
}

export interface Reserva {
  id: number;
  areaComumId: number;
  areaComumNome: string;
  moradorId: number;
  moradorNome: string;
  apartamento: string;
  bloco: string;
  dataReserva: string;
  horaInicio: string;
  horaFim: string;
  status: ReservaStatus;
  observacoes?: string;
  dataCriacao: string;
}

export interface ReservaFormData {
  areaComumId: number;
  dataReserva: string;
  horaInicio: string;
  horaFim: string;
  observacoes?: string;
}

// Boleto / Pagamento
export type BoletoStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO';

export interface Boleto {
  id: number;
  moradorId: number;
  moradorNome: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string | null;
  status: BoletoStatus;
  linhaDigitavel: string;
  descricao: string;
  pdfBase64?: string;
}

// Comunicado (Announcement)
export interface Comunicado {
  id: number;
  titulo: string;
  conteudo: string;
  autor: string;
  dataCriacao: string;
  importante: boolean;
  categoria: string;
}

// Visitante (Visitor)
export interface Visitante {
  id: number;
  nome: string;
  documento: string;
  telefone?: string;
  moradorId: number;
  moradorNome: string;
  apartamento: string;
  bloco: string;
  dataEntrada: string;
  dataSaida?: string;
  veiculo?: string;
  placaVeiculo?: string;
  observacoes?: string;
  porteiroNome: string;
}

export interface VisitanteFormData {
  nome: string;
  documento: string;
  telefone?: string;
  moradorId?: number;
  apartamento: string;
  bloco: string;
  veiculo?: string;
  placaVeiculo?: string;
  observacoes?: string;
}

// Relatórios
export interface RelatorioPagamento {
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  inadimplentes: number;
  adimplentes: number;
  pagamentosPorMes: { mes: string; valor: number }[];
  taxaAdimplencia: number;
}

// API Response
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalMoradores: number;
  totalOcorrenciasAbertas: number;
  totalReservasHoje: number;
  taxaAdimplencia: number;
  receitaMensal: number;
  visitantesHoje: number;
}
