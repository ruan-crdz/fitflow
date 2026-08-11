import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { readBackupFile, restoreBackup } from '@/utils/backup';

interface BackupRestoreProps {
  onNewUser: () => void;
}

export function BackupRestore({ onNewUser }: BackupRestoreProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'choice' | 'restore'>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const raw = await readBackupFile(file);
      restoreBackup(raw);
      window.location.reload();
    } catch {
      setError('Não consegui restaurar esse arquivo. Confirme se ele e um backup completo do GymPilot.');
      setLoading(false);
    }
  };

  if (mode === 'restore') {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="space-y-2">
            <p className="text-primary-400 text-sm font-semibold">Restaurar conta</p>
            <h1 className="text-3xl font-bold">Envie seu backup</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Escolha o arquivo .json baixado no Perfil. Ele restaura perfil, treinos, histórico, alimentos, água e progresso.
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="hidden"
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Restaurando...' : 'Selecionar backup'}
          </button>

          {error && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}

          <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4">
            <p className="text-xs text-yellow-200/90 leading-relaxed">
              Sem backup, infelizmente não tem como recuperar os dados locais depois de apagar o app da tela inicial.
              Nesse caso vai precisar fazer o cadastro do zero.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setMode('choice')}
              className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-semibold"
            >
              Voltar
            </button>
            <button
              onClick={onNewUser}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/45 text-sm font-semibold"
            >
              Fazer do zero
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-center">
        <div className="space-y-3">
          <div className="w-24 h-24 rounded-3xl bg-dark-100 border border-primary-500/25 mx-auto flex items-center justify-center overflow-hidden shadow-2xl shadow-primary-500/15">
            <img
              src="/fitflow/icons/logo.png"
              alt="GymPilot"
              className="w-20 h-20 object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bem-vindo ao GymPilot</h1>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              Antes de começar, me fala se você já usava o app ou se esta entrando pela primeira vez.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setMode('restore')}
            className="w-full p-5 rounded-2xl bg-primary-500/10 border border-primary-500/30 text-left active:scale-[0.98] transition-transform"
          >
            <p className="font-bold text-lg">Já sou usuário</p>
            <p className="text-white/45 text-xs mt-1">Tenho um backup e quero restaurar meus dados</p>
          </button>

          <button
            onClick={onNewUser}
            className="w-full p-5 rounded-2xl bg-dark-200 border border-white/10 text-left active:scale-[0.98] transition-transform"
          >
            <p className="font-bold text-lg">Sou novo usuário</p>
            <p className="text-white/45 text-xs mt-1">Começar cadastro e criar meus treinos do zero</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
