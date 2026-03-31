'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { formatEmail, isValidEmail } from '@/utils/formatters';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (!isValidEmail(email)) {
      toast.error('Por favor, digite um endereço de e-mail válido!');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, senha });
      toast.success('Login realizado com sucesso!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Credenciais inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail || !isValidEmail(recoverEmail)) {
      toast.error('Informe um e-mail válido!');
      return;
    }

    setIsRecovering(true);
    try {
      const response = await api.post('/auth/recuperar-senha', { email: recoverEmail });
      toast.success('Nova senha enviada para seu e-mail!');
      
      setIsRecoverModalOpen(false);
      setRecoverEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao recuperar senha');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <>
      <Modal 
        isOpen={isRecoverModalOpen} 
        onClose={() => setIsRecoverModalOpen(false)} 
        title="Recuperação de Senha"
        size="sm"
      >
        <form onSubmit={handleRecover} className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Digite seu e-mail de acesso. O sistema gerará uma nova senha temporária para você.
          </p>
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={recoverEmail}
            onChange={(e) => setRecoverEmail(formatEmail(e.target.value))}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <Button type="button" variant="outline" onClick={() => setIsRecoverModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isRecovering}>
              Recuperar
            </Button>
          </div>
        </form>
      </Modal>

      <div className="min-h-screen flex relative overflow-hidden">
            {/* Desenvolvedores - canto inferior direito */}
            <div className="hidden lg:block fixed bottom-4 right-8 z-40 text-xs text-slate-400 dark:text-slate-500 font-medium select-none pointer-events-none">
              Desenvolvido por Fabio Argona e Patricia Martins
            </div>
      {/* Background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 transition-colors duration-500" />
      
      {/* Animated orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10 p-12">
        <div className="max-w-lg animate-slide-up">
          {/* Logo */}
          <div className="flex flex-col items-center gap-1 mb-[5px]">
            <img src="/oceano-logo.png" alt="Logo Oceano Residences" className="w-[300px] h-[300px] object-contain" />
          </div>

          <h2 className="text-4xl font-bold text-slate-800 dark:text-white leading-tight mb-4">
            Gestão inteligente para seu{' '}
            <span className="gradient-text">condomínio</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
            Controle moradores, reservas, ocorrências, pagamentos e muito mais. 
            Tudo em um só lugar, de forma simples e eficiente.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: '🏠', text: 'Gestão completa de moradores e unidades' },
              { icon: '📋', text: 'Controle de ocorrências e manutenções' },
              { icon: '📅', text: 'Reservas de áreas comuns online' },
              { icon: '💰', text: 'Relatórios financeiros e inadimplência' },
            ].map((feature, i) => (
                <div
                key={i}
                className="flex items-center gap-3 text-slate-700 dark:text-slate-300 animate-slide-in-right"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                <span className="text-xl">{feature.icon}</span>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6">
        <div className="w-full max-w-md animate-scale-in">
          {/* Theme toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
          </div>

          <div className="p-8 bg-white/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 border backdrop-blur-xl rounded-[1.5rem] shadow-2xl dark:shadow-black/50 transition-colors duration-500">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div className="flex flex-col justify-center">
                 <span className="text-[10px] font-bold tracking-[0.2em] text-blue-600 dark:text-blue-400 uppercase leading-none mb-[-3px] ml-[1px] z-10">Residencial</span>
                 <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-0">OCEANO</h1>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Bem-vindo de volta</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Entre com suas credenciais para acessar o sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="E-mail"
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(formatEmail(e.target.value))}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                }
              />

              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  name="senha"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-sm text-slate-400">Lembrar-me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setIsRecoverModalOpen(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                size="lg"
                className="w-full"
              >
                Entrar
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-500 mb-3 font-semibold uppercase tracking-wider">Credenciais de demonstração</p>
              <div className="space-y-2">
                {[
                  { role: 'Síndico', email: 'sindico@condogest.com' },
                  { role: 'Morador', email: 'morador@condogest.com' },
                  { role: 'Porteiro', email: 'porteiro@condogest.com' },
                ].map((cred) => (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => {
                      setEmail(cred.email);
                      setSenha('123456');
                    }}
                    className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-blue-400 transition-colors group"
                  >
                    <span className="font-medium">{cred.role}</span>
                    <span className="text-slate-500 group-hover:text-blue-400 transition-colors">{cred.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            © 2026 Residencial Oceano. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
