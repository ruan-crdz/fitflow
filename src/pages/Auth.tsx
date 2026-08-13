import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function ptSupabaseError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('email not confirmed')) return 'E-mail ainda não confirmado.';
  if (lower.includes('email rate limit exceeded')) return 'Muitas tentativas de envio de e-mail. Aguarde alguns minutos e tente novamente.';
  if (lower.includes('invalid login credentials')) return 'E-mail/usuário ou senha incorretos.';
  if (lower.includes('already registered') || lower.includes('already exists')) return 'Esse e-mail já está cadastrado.';
  if (lower.includes('password')) return 'Senha inválida.';
  return message || 'Não consegui concluir agora. Tente novamente.';
}

function buildEmailConfirmRedirectUrl() {
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`;
  return `${base}#/auth`;
}

function getAuthHashParams() {
  const hash = window.location.hash || '';
  if (!hash) return new URLSearchParams();

  if (hash.includes('?')) {
    return new URLSearchParams(hash.slice(hash.indexOf('?') + 1));
  }

  if (hash.startsWith('#access_token=') || hash.startsWith('#type=')) {
    return new URLSearchParams(hash.slice(1));
  }

  return new URLSearchParams();
}

function readAuthUrlParam(name: string) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) ?? getAuthHashParams().get(name);
}

function clearAuthTokensFromUrl() {
  const cleanHash = '#/auth';
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}${cleanHash}`);
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-password';

type AuthProps = {
  onResetFlowComplete?: () => void;
};

export function Auth({ onResetFlowComplete }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const type = readAuthUrlParam('type');
    const action = readAuthUrlParam('action');
    if (type !== 'recovery' && action !== 'recovery') return;

    setMode('reset-password');
    setError('');
    setMessage('Link validado. Defina sua nova senha.');
    clearAuthTokensFromUrl();
  }, []);

  const canSubmit = useMemo(() => {
    if (mode === 'forgot') return Boolean(resetEmail.trim());
    if (mode === 'reset-password') return Boolean(newPassword.trim() && confirmPassword.trim());
    if (!password.trim()) return false;
    if (mode === 'login') return Boolean(loginIdentifier.trim());
    return Boolean(email.trim() && username.trim() && displayName.trim());
  }, [confirmPassword, displayName, email, loginIdentifier, mode, newPassword, password, resetEmail, username]);

  const handleSendResetLink = async () => {
    if (!supabase) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const redirectTo = `${buildEmailConfirmRedirectUrl()}?action=recovery`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo,
      });

      if (resetError) throw resetError;
      setMessage('Se esse e-mail existir, enviamos um link para redefinir a senha.');
    } catch (requestError) {
      const text = requestError instanceof Error ? requestError.message : 'Não foi possível enviar o link.';
      setError(ptSupabaseError(text));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPassword = async () => {
    if (!supabase) return;

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setMessage('Senha atualizada com sucesso.');
      onResetFlowComplete?.();
    } catch (saveError) {
      const text = saveError instanceof Error ? saveError.message : 'Não foi possível atualizar sua senha.';
      setError(ptSupabaseError(text));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!supabase) return;

    if (mode === 'forgot') {
      await handleSendResetLink();
      return;
    }

    if (mode === 'reset-password') {
      await handleSaveNewPassword();
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        const cleanUsername = normalizeUsername(username);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: buildEmailConfirmRedirectUrl(),
            data: {
              username: cleanUsername,
              display_name: displayName.trim() || cleanUsername,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setPendingConfirmationEmail(email.trim());
          setMessage('Conta criada! Enviamos um e-mail de confirmação.');
        } else {
          setMessage('Conta criada com sucesso. Entrando...');
        }
        return;
      }

      let loginEmail = loginIdentifier.trim();
      if (!loginEmail.includes('@')) {
        const { data, error: lookupError } = await supabase.rpc('get_login_email', {
          p_username: normalizeUsername(loginEmail),
        });
        if (lookupError || !data) {
          setError('Username não encontrado. Tente com e-mail.');
          return;
        }
        loginEmail = data as string;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (loginError) throw loginError;
      setMessage('Login realizado com sucesso.');
    } catch (authError) {
      const text = authError instanceof Error ? authError.message : 'Erro de autenticação';
      setError(ptSupabaseError(text));
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6">
        <div className="card max-w-md w-full space-y-3">
          <h1 className="text-2xl font-bold">Configuração pendente</h1>
          <p className="text-sm text-white/55">
            Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar cadastro e login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-24 h-24 rounded-3xl bg-dark-100 border border-primary-500/25 mx-auto flex items-center justify-center overflow-hidden shadow-2xl shadow-primary-500/15">
            <img src="/gympilot/icons/logo.png" alt="GymPilot" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-bold">Bem-vindo ao GymPilot</h1>
          <p className="text-white/50 text-sm">Entre na sua conta para continuar.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            className={`py-3 rounded-xl text-sm font-bold ${mode === 'login' ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/50'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
            className={`py-3 rounded-xl text-sm font-bold ${mode === 'signup' ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/50'}`}
          >
            Criar conta
          </button>
        </div>

        <div className="card space-y-3">
          {mode === 'login' ? (
            <input
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="E-mail ou username"
              className="input-field text-sm"
            />
          ) : mode === 'signup' ? (
            <>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nome exibido"
                className="input-field text-sm"
              />
              <input
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                placeholder="username"
                className="input-field text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="input-field text-sm"
                type="email"
              />
            </>
          ) : mode === 'forgot' ? (
            <input
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              className="input-field text-sm"
              type="email"
            />
          ) : (
            <>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha"
                type={showPassword ? 'text' : 'password'}
                className="input-field text-sm"
              />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                type={showPassword ? 'text' : 'password'}
                className="input-field text-sm"
              />
            </>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                type={showPassword ? 'text' : 'password'}
                className="input-field text-sm pr-20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit && !loading) void handleAuth();
                }}
              />
              <button
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 h-9 rounded-xl text-white/45 text-xs font-semibold"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          )}

          {mode === 'reset-password' && (
            <button
              onClick={() => setShowPassword((value) => !value)}
              className="w-full py-2 rounded-xl bg-white/5 text-white/55 text-xs font-semibold"
            >
              {showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>
          )}

          <button
            disabled={loading || !canSubmit}
            onClick={() => void handleAuth()}
            className="btn-primary text-sm py-3 disabled:opacity-40"
          >
            <MaterialIcon name={mode === 'signup' ? 'person_add' : mode === 'forgot' ? 'mail' : mode === 'reset-password' ? 'lock_reset' : 'login'} />
            {mode === 'signup' ? 'Criar conta' : mode === 'forgot' ? 'Enviar link de redefinição' : mode === 'reset-password' ? 'Salvar nova senha' : 'Entrar'}
          </button>

          {mode === 'login' && (
            <button
              onClick={() => {
                setMode('forgot');
                setError('');
                setMessage('');
              }}
              className="w-full text-xs text-primary-300 font-semibold py-1"
            >
              Esqueci minha senha
            </button>
          )}

          {(mode === 'forgot' || mode === 'reset-password') && (
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
              className="w-full text-xs text-white/55 font-semibold py-1"
            >
              Voltar para login
            </button>
          )}

          {message && <p className="text-xs text-primary-300">{message}</p>}
          {error && <p className="text-xs text-red-300">{error}</p>}

          {pendingConfirmationEmail && (
            <div className="rounded-xl border border-primary-500/35 bg-primary-500/10 p-3 space-y-3">
              <p className="text-xs text-white/85 font-semibold">Confirme seu e-mail para ativar a conta</p>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Enviamos para <span className="text-primary-300">{pendingConfirmationEmail}</span>. Abra sua caixa de entrada,
                clique em <span className="text-primary-300">Confirmar e-mail</span> e depois volte ao app para entrar.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.open('https://mail.google.com', '_blank', 'noopener,noreferrer')}
                  className="py-2.5 rounded-xl bg-white/10 text-white/80 text-xs font-semibold"
                >
                  Abrir Gmail
                </button>
                <button
                  onClick={() => window.open('https://outlook.live.com/mail/', '_blank', 'noopener,noreferrer')}
                  className="py-2.5 rounded-xl bg-white/10 text-white/80 text-xs font-semibold"
                >
                  Abrir Outlook
                </button>
              </div>
              <button
                onClick={() => {
                  setMode('login');
                  setLoginIdentifier(pendingConfirmationEmail);
                  setPendingConfirmationEmail('');
                  setMessage('Depois de confirmar no e-mail, faça login normalmente.');
                }}
                className="w-full py-2.5 rounded-xl bg-primary-500 text-white text-xs font-bold"
              >
                Já confirmei, ir para login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
