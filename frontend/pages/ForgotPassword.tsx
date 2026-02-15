import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

interface ForgotPasswordProps {
  onBack: () => void;
  onEmailSent?: (email: string) => void; // NOUVEAU: Callback pour informer Login
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onEmailSent }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Configuration axios
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

  // Fonction pour initier la réinitialisation du mot de passe
  const initiatePasswordReset = async (email: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || error.response.data?.message || 'Une erreur est survenue');
      }
      throw new Error('Erreur de connexion au serveur');
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!resetEmail || !resetEmail.includes('@')) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setLoading(true);
    
    try {
      await initiatePasswordReset(resetEmail);
      setSuccessMessage(`Un email de réinitialisation a été envoyé à ${resetEmail}`);
      
      // NOUVEAU: Informer le composant parent (Login) que l'email a été envoyé
      if (onEmailSent) {
        onEmailSent(resetEmail);
      }
    } catch (err) {
      const apiError = err as Error;
      setError(apiError.message || 'Une erreur est survenue lors de l\'envoi de l\'email de réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = () => {
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row">
      {/* Colonne de gauche : Visuel/Information */}
      <div className="flex-1 bg-slate-900 text-white p-12 flex flex-col justify-center items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <i className="fas fa-lock-open text-[20rem] absolute -bottom-10 -right-10"></i>
        </div>
        <div className="max-w-xs z-10">
          <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
             <i className="fas fa-user-shield text-3xl text-emerald-400"></i>
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-6">Souveraineté & Sécurité</h2>
          <p className="text-slate-400 text-xs font-bold leading-relaxed">
            L'infrastructure du Ministère du Commerce applique les plus hauts standards de cryptage pour protéger vos transactions internationales.
          </p>
        </div>
      </div>

      {/* Colonne de droite : Formulaire */}
      <div className="flex-1 bg-white p-12 flex flex-col justify-center items-center relative">
        <button 
          onClick={onBack} 
          className="absolute top-8 right-8 text-slate-400 hover:text-tunisia-red transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
        >
          <i className="fas fa-arrow-up"></i> {t('back_to_login')}
        </button>

        <div className="max-w-xs w-full">
          {/* Affichage des messages d'erreur/succès */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in-scale">
              <p className="text-red-600 text-xs font-bold flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </p>
            </div>
          )}
          
          {successMessage ? (
            <div className="text-center space-y-8 animate-fade-in-scale">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                <i className="fas fa-paper-plane text-2xl"></i>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{t('reset_link_sent')}</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  {t('reset_link_desc')} à l'adresse <span className="font-black text-slate-900">{resetEmail}</span>.
                </p>
                <p className="text-slate-400 text-[10px] font-bold leading-relaxed pt-2">
                  Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
                </p>
              </div>
              
              <div className="pt-4 space-y-4">
                <button 
                  onClick={handleResendLink}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <i className="fas fa-redo text-emerald-400"></i>
                  Renvoyer le lien
                </button>
                <button 
                  onClick={onBack}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-tunisia-red transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in-scale">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{t('reset_password_title')}</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed">
                  {t('reset_password_desc')}
                </p>
              </div>

              <form onSubmit={handleResetRequest} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Professionnel</label>
                  <input 
                    required 
                    type="email" 
                    value={resetEmail} 
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-tunisia-red outline-none transition-all font-bold text-sm shadow-sm" 
                    placeholder="votre-email@entreprise.com" 
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-tunisia-red text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-circle-notch animate-spin"></i>
                      Envoi en cours...
                    </span>
                  ) : (
                    t('send_reset_link')
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;