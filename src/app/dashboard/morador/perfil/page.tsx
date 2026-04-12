'use client';

import { useState } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const EyeIcon = ({ show }: { show: boolean }) => show ? (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
) : (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  validation,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  validation: 'idle' | 'valid' | 'invalid';
  placeholder?: string;
  required?: boolean;
}) {
  const borderClass =
    validation === 'valid'
      ? 'border-emerald-400 dark:border-emerald-500 focus:ring-emerald-500/50 focus:border-emerald-500'
      : validation === 'invalid'
      ? 'border-red-400 dark:border-red-500 focus:ring-red-500/50 focus:border-red-500'
      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500';

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-xl border bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 pl-4 pr-10 py-2.5 ${borderClass}`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <EyeIcon show={show} />
        </button>
        {validation !== 'idle' && (
          <div className={`absolute right-10 top-1/2 -translate-y-1/2 ${validation === 'valid' ? 'text-emerald-500' : 'text-red-500'}`}>
            {validation === 'valid' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MoradorPerfilPage() {
  const { user, updateAuth } = useAuth();
  const { patch, isLoading } = useApi();

  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [show, setShow] = useState({ atual: false, nova: false, confirmar: false });

  const isPrimeiroAcesso = user?.primeiroAcesso ?? false;

  // Validações
  const novaValida = form.novaSenha.length === 0 ? 'idle' : form.novaSenha.length >= 6 ? 'valid' : 'invalid';
  const confirmarValida =
    form.confirmarSenha.length === 0
      ? 'idle'
      : form.confirmarSenha === form.novaSenha && form.novaSenha.length >= 6
      ? 'valid'
      : 'invalid';
  const atualValida = form.senhaAtual.length === 0 ? 'idle' : form.senhaAtual.length >= 1 ? 'valid' : 'invalid';

  const canSubmit =
    novaValida === 'valid' &&
    confirmarValida === 'valid' &&
    (isPrimeiroAcesso || atualValida === 'valid');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await patch(`/usuarios/${user.id}/senha`, {
      senhaAtual: form.senhaAtual,
      novaSenha: form.novaSenha,
    }) as { message?: string; token?: string } | null;

    if (res) {
      toast.success('Senha alterada com sucesso!');
      if (res.token) {
        updateAuth(res.token);
        window.location.href = '/dashboard/morador';
      }
    }
  };

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-2xl px-4 sm:px-8 py-10 space-y-6">

        {/* Cabeçalho */}
        <div className="animate-slide-up">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Trocar Senha</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Atualize sua senha de acesso</p>
        </div>

        {/* Banner primeiro acesso */}
        {isPrimeiroAcesso && (
          <div className="animate-slide-up flex gap-3 items-start bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Você está usando uma senha temporária</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">Por segurança, defina uma senha pessoal antes de continuar usando o sistema.</p>
            </div>
          </div>
        )}

        {/* Card info do usuário */}
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                {user?.nome ? user.nome.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.nome}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {user?.apartamento && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      Apto {user.apartamento}
                    </span>
                  )}
                  {user?.bloco && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                      Bloco {user.bloco}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card formulário */}
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {isPrimeiroAcesso ? 'Defina sua senha' : 'Alterar Senha'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isPrimeiroAcesso ? 'Crie uma senha segura para sua conta' : 'Mantenha sua conta segura com uma senha forte'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Senha atual — oculta no primeiro acesso */}
              {!isPrimeiroAcesso && (
                <>
                  <PasswordField
                    label="Senha atual"
                    value={form.senhaAtual}
                    onChange={v => setForm(p => ({ ...p, senhaAtual: v }))}
                    show={show.atual}
                    onToggleShow={() => setShow(p => ({ ...p, atual: !p.atual }))}
                    validation={atualValida}
                    placeholder="Digite sua senha atual"
                    required
                  />
                  <hr className="border-slate-100 dark:border-slate-800" />
                </>
              )}

              {/* Nova senha */}
              <PasswordField
                label="Nova senha"
                value={form.novaSenha}
                onChange={v => setForm(p => ({ ...p, novaSenha: v }))}
                show={show.nova}
                onToggleShow={() => setShow(p => ({ ...p, nova: !p.nova }))}
                validation={novaValida}
                placeholder="Mínimo 6 caracteres"
                required
              />
              {novaValida === 'invalid' && (
                <p className="text-xs text-red-500 -mt-2">Mínimo 6 caracteres</p>
              )}

              {/* Confirmar nova senha */}
              <PasswordField
                label="Confirmar nova senha"
                value={form.confirmarSenha}
                onChange={v => setForm(p => ({ ...p, confirmarSenha: v }))}
                show={show.confirmar}
                onToggleShow={() => setShow(p => ({ ...p, confirmar: !p.confirmar }))}
                validation={confirmarValida}
                placeholder="Repita a nova senha"
                required
              />
              {confirmarValida === 'invalid' && (
                <p className="text-xs text-red-500 -mt-2">
                  {form.confirmarSenha.length > 0 && form.novaSenha.length < 6
                    ? 'A nova senha deve ter no mínimo 6 caracteres'
                    : 'As senhas não coincidem'}
                </p>
              )}
              {confirmarValida === 'valid' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 -mt-2">Senhas coincidem ✓</p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                disabled={isLoading || !canSubmit}
              >
                {isLoading ? 'Salvando...' : isPrimeiroAcesso ? 'Definir Senha' : 'Alterar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}


export default function MoradorPerfilPage() {
  const { user, updateAuth } = useAuth();
  const { patch, isLoading } = useApi();

  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [showSenhas, setShowSenhas] = useState({ atual: false, nova: false, confirmar: false });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (form.novaSenha !== form.confirmarSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (!user) return;

    const res = await patch(`/usuarios/${user.id}/senha`, {
      senhaAtual: form.senhaAtual,
      novaSenha: form.novaSenha,
    }) as { message?: string; token?: string } | null;

    if (res) {
      toast.success('Senha alterada com sucesso!');
      setForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      if (res.token) {
        updateAuth(res.token);
        window.location.href = '/dashboard/morador';
      }
    }
  };

  const EyeIcon = ({ show }: { show: boolean }) => show ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-2xl px-4 sm:px-8 py-10 space-y-6">

        {/* Cabeçalho */}
        <div className="animate-slide-up">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Trocar Senha</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Atualize sua senha de acesso</p>
        </div>

        {/* Banner de aviso — primeira entrada */}
        {user?.primeiroAcesso && (
          <div className="animate-slide-up flex gap-3 items-start bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Você está usando uma senha temporária</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">Por segurança, defina uma senha pessoal antes de continuar usando o sistema.</p>
            </div>
          </div>
        )}

        {/* Card dados do usuário */}
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                {user?.nome ? user.nome.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.nome}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {user?.apartamento && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      Apto {user.apartamento}
                    </span>
                  )}
                  {user?.bloco && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                      Bloco {user.bloco}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card troca de senha */}
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Alterar Senha</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Mantenha sua conta segura com uma senha forte</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Senha atual */}
              <div className="relative">
                <Input
                  label="Senha atual"
                  type={showSenhas.atual ? 'text' : 'password'}
                  value={form.senhaAtual}
                  onChange={e => handleChange('senhaAtual', e.target.value)}
                  required
                  placeholder="Digite sua senha atual"
                />
                <button
                  type="button"
                  onClick={() => setShowSenhas(p => ({ ...p, atual: !p.atual }))}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <EyeIcon show={showSenhas.atual} />
                </button>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* Nova senha */}
              <div className="relative">
                <Input
                  label="Nova senha"
                  type={showSenhas.nova ? 'text' : 'password'}
                  value={form.novaSenha}
                  onChange={e => handleChange('novaSenha', e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowSenhas(p => ({ ...p, nova: !p.nova }))}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <EyeIcon show={showSenhas.nova} />
                </button>
              </div>

              {/* Confirmar nova senha */}
              <div className="relative">
                <Input
                  label="Confirmar nova senha"
                  type={showSenhas.confirmar ? 'text' : 'password'}
                  value={form.confirmarSenha}
                  onChange={e => handleChange('confirmarSenha', e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                />
                <button
                  type="button"
                  onClick={() => setShowSenhas(p => ({ ...p, confirmar: !p.confirmar }))}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <EyeIcon show={showSenhas.confirmar} />
                </button>
              </div>

              {/* Indicador de força */}
              {form.novaSenha.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          form.novaSenha.length >= level * 3
                            ? level <= 1 ? 'bg-red-400'
                            : level <= 2 ? 'bg-amber-400'
                            : level <= 3 ? 'bg-yellow-400'
                            : 'bg-green-500'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {form.novaSenha.length < 6 ? 'Fraca — mínimo 6 caracteres'
                      : form.novaSenha.length < 9 ? 'Razoável'
                      : form.novaSenha.length < 12 ? 'Boa'
                      : 'Forte'}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                disabled={isLoading || !form.senhaAtual || !form.novaSenha || !form.confirmarSenha}
              >
                {isLoading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
