import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

interface ResetPasswordFormProps {
  token?: string | null;
  requireCurrentPassword?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ 
  token = null,
  requireCurrentPassword = false, 
  onSuccess, 
  onCancel 
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showPassCurrent, setShowPassCurrent] = useState(false);
  const [showPassNew, setShowPassNew] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Configuration axios
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

  // Fonction pour réinitialiser le mot de passe avec token
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        newPassword
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || error.response.data?.message || 'Erreur lors de la réinitialisation');
      }
      throw new Error('Erreur de connexion au serveur');
    }
  };

  // Fonction pour changer le mot de passe (requiert authentification)
  const changePassword = async (data: ChangePasswordRequest) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/auth/change-password`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || error.response.data?.message || 'Erreur lors du changement');
      }
      throw new Error('Erreur de connexion au serveur');
    }
  };

  // Fonction de validation du mot de passe
  const validatePassword = (password: string): boolean => {
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    
    // Validation optionnelle pour renforcer la sécurité
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasDigit) {
      // Avertissement mais pas d'erreur
      console.warn('Mot de passe de sécurité faible - recommande majuscules, minuscules et chiffres');
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (passwordData.new !== passwordData.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (!validatePassword(passwordData.new)) {
      return;
    }
    
    if (requireCurrentPassword && !passwordData.current) {
      setError('Veuillez saisir votre mot de passe actuel');
      return;
    }

    setLoading(true);

    try {
      if (token) {
        // Réinitialisation de mot de passe avec token
        await resetPassword(token, passwordData.new);
      } else if (requireCurrentPassword) {
        // Changement de mot de passe avec authentification
        await changePassword({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        });
      }
      
      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      const apiError = err as Error;
      setError(apiError.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="py-8 text-center space-y-4 animate-fade-in-scale">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
          <i className="fas fa-check-circle text-2xl"></i>
        </div>
        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
          {token ? 'Mot de passe réinitialisé avec succès' : t('password_update_success')}
        </p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {token ? 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe' : 'Vos nouveaux identifiants sont actifs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-scale">
      {/* Affichage des erreurs */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-red-600 text-xs font-bold flex items-center gap-2">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {requireCurrentPassword && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('current_password')}</label>
            <div className="relative">
              <input 
                required
                type={showPassCurrent ? "text" : "password"}
                value={passwordData.current}
                onChange={(e) => {
                  setPasswordData({...passwordData, current: e.target.value});
                  setError(null);
                }}
                className="w-full pl-5 pr-12 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassCurrent(!showPassCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <i className={`fas ${showPassCurrent ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('new_password')}</label>
          <div className="relative">
            <input 
              required
              type={showPassNew ? "text" : "password"}
              value={passwordData.new}
              onChange={(e) => {
                setPasswordData({...passwordData, new: e.target.value});
                setError(null);
              }}
              className="w-full pl-5 pr-12 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
              placeholder="••••••••"
            />
            <button 
              type="button" 
              onClick={() => setShowPassNew(!showPassNew)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <i className={`fas ${showPassNew ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          <p className="text-[8px] text-slate-400 font-medium ml-1">
            Minimum 6 caractères. Recommandé: majuscules, minuscules et chiffres.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('confirm_new_password')}</label>
          <div className="relative">
            <input 
              required
              type={showPassConfirm ? "text" : "password"}
              value={passwordData.confirm}
              onChange={(e) => {
                setPasswordData({...passwordData, confirm: e.target.value});
                setError(null);
              }}
              className={`w-full pl-5 pr-12 py-3.5 rounded-2xl border-2 font-bold bg-slate-50 outline-none transition-all text-sm shadow-sm ${
                passwordData.confirm && passwordData.new !== passwordData.confirm 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-slate-50 focus:border-tunisia-red'
              }`}
              placeholder="••••••••"
            />
            <button 
              type="button" 
              onClick={() => setShowPassConfirm(!showPassConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <i className={`fas ${showPassConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          {passwordData.confirm && passwordData.new !== passwordData.confirm && (
            <p className="text-[8px] font-black text-red-500 uppercase tracking-widest ml-1">
              Les mots de passe ne correspondent pas
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button 
            type="submit"
            disabled={loading || !passwordData.new || passwordData.new !== passwordData.confirm || (requireCurrentPassword && !passwordData.current)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-circle-notch animate-spin"></i>
                {token ? 'Réinitialisation...' : 'Mise à jour...'}
              </span>
            ) : (
              token ? 'Réinitialiser le mot de passe' : t('update_password_btn')
            )}
          </button>
          
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;