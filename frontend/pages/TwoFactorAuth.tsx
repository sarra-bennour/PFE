import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface TwoFactorAuthProps {
  onVerify: (code: string) => void;
  onBack: () => void;
  loading?: boolean;
  email?: string; // AJOUT: email pour la vérification
  tempToken?: string; // AJOUT: token temporaire
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ 
  onVerify, 
  onBack, 
  loading = false,
  email = '',
  tempToken = ''
}) => {
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!canResend && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer, canResend]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = code.join('');
    if (finalCode.length !== 6) {
      setError('Veuillez saisir les 6 chiffres du code');
      return;
    }

    // Appeler directement onVerify avec le code
    // La vérification sera gérée par le composant parent (Login.tsx)
    onVerify(finalCode);
  };

  const handleResendCode = async () => {
    if (!canResend || !email) return;
    
    setVerifying(true);
    try {
      // Appel API pour renvoyer un code 2FA
      const response = await fetch('http://localhost:8080/api/auth/2fa/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setResendTimer(45);
        setCanResend(false);
        setError('');
      } else {
        setError('Erreur lors du renvoi du code');
      }
    } catch (error) {
      setError('Erreur de connexion au serveur');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row">
      <div className="flex-1 bg-slate-900 text-white p-12 flex flex-col justify-center items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <i className="fas fa-shield-halved text-[20rem] absolute -bottom-10 -left-10 text-emerald-500"></i>
        </div>
        <div className="max-w-xs z-10">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
            <i className="fas fa-user-shield text-3xl text-emerald-400"></i>
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-6">Sécurité Renforcée</h2>
          <p className="text-slate-400 text-xs font-bold leading-relaxed">
            Conformément aux protocoles de sécurité du Ministère du Commerce, une double vérification est requise pour accéder aux données sensibles.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white p-12 flex flex-col justify-center items-center relative">
        <button 
          onClick={onBack} 
          className="absolute top-8 right-8 text-slate-400 hover:text-tunisia-red transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <i className="fas fa-arrow-left mr-2"></i> {t('back_to_login')}
        </button>

        <div className="max-w-md w-full text-center">
          <div className="mb-10 space-y-3">
            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{t('two_factor_title')}</h3>
            <p className="text-slate-400 text-xs font-bold leading-relaxed px-4">
              {t('two_factor_desc')}
            </p>
            {email && (
              <p className="text-xs font-bold text-tunisia-red">
                {email}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="flex justify-center gap-3">
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-12 h-16 text-center text-2xl font-black bg-slate-50 border-2 ${
                    error ? 'border-tunisia-red' : 'border-slate-100'
                  } rounded-2xl focus:border-tunisia-red focus:bg-white outline-none transition-all shadow-inner`}
                  disabled={loading || verifying}
                />
              ))}
            </div>

            {error && (
              <p className="text-[10px] font-bold text-tunisia-red mt-1 animate-fade-in-scale">
                <i className="fas fa-circle-exclamation mr-1"></i> {error}
              </p>
            )}

            <div className="space-y-6">
              <button 
                type="submit" 
                disabled={loading || verifying || code.join('').length < 6}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(loading || verifying) && <i className="fas fa-spinner fa-spin"></i>}
                {loading || verifying ? 'Vérification...' : t('verify_btn')}
              </button>
              
              <button 
                type="button" 
                onClick={handleResendCode}
                disabled={!canResend || verifying}
                className="text-[10px] font-black text-tunisia-red uppercase tracking-[0.2em] hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {canResend ? t('resend_code') : `${t('resend_code')} (${resendTimer}s)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;