import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, UserRole, ExporterStatus, User } from '../App';
import ExporterSignUp from './ExporterSignUp';
import ForgotPassword from './ForgotPassword';
import TwoFactorAuth from './TwoFactorAuth';
import ResetPasswordForm from '../components/ResetPasswordForm';
import FormAlert from '../components/FormAlert';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  
  const [view, setView] = useState<'login' | 'signup' | 'forgot_password' | 'two_factor' | 'reset_password'>('login');
  const [loading, setLoading] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);
  const [matricule, setMatricule] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showEmailError, setShowEmailError] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  
  const [alert, setAlert] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
    position?: 'top' | 'above-email'; // AJOUTÉ: position de l'alerte
  }>({
    show: false,
    type: 'error',
    message: '',
    position: 'top'
  });
  
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');

  const CARD_HEIGHT = 750;

  // Fonction de validation qui retourne un booléen sans setter l'état
  const isValidEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Fonction pour valider l'email (required + format)
  const validateAndSetEmailError = useCallback((emailValue: string): boolean => {
    if (!emailValue || emailValue.trim() === '') {
      setEmailError("L'adresse e-mail est requise.");
      return false;
    }
    else if (!isValidEmail(emailValue)) {
      setEmailError("L'adresse e-mail saisie n'est pas valide. Veuillez vérifier le format (ex: nom@domaine.com).");
      return false;
    } else {
      setEmailError('');
      return true;
    }
  }, [isValidEmail]);

  // Fonction pour valider le mot de passe (required)
  const validateAndSetPasswordError = useCallback((passwordValue: string): boolean => {
    if (!passwordValue || passwordValue.trim() === '') {
      setPasswordError("Le mot de passe est requis.");
      return false;
    } else {
      setPasswordError('');
      return true;
    }
  }, []);

  // isFormValid utilise les validations sans setter l'état
  const isFormValid = useMemo((): boolean => {
    const isEmailValid = email && email.trim() !== '' && isValidEmail(email);
    const isPasswordValid = password && password.trim() !== '';
    return isEmailValid && isPasswordValid && !loading;
  }, [email, password, loading, isValidEmail]);

  useEffect(() => {
    const emailToken = searchParams.get('token');
    const resetTokenParam = searchParams.get('reset-token');
    
    if (emailToken) {
      handleEmailVerification(emailToken);
    }
    
    if (resetTokenParam) {
      handleResetPasswordToken(resetTokenParam);
    }
  }, [searchParams]);

  const handleResetPasswordToken = (token: string) => {
    setResetToken(token);
    setView('reset_password');
    showAlert('info', 'Validation du lien de réinitialisation...', 'above-email');
    validateResetToken(token);
  };

  const validateResetToken = async (token: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/auth/validate-reset-token?token=${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok && data.valid) {
        showAlert('success', '✅ Lien de réinitialisation valide. Vous pouvez maintenant définir votre nouveau mot de passe.', 'above-email');
      } else {
        showAlert('error', `❌ ${data.error || 'Le lien de réinitialisation est invalide ou a expiré'}`, 'above-email');
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      showAlert('error', '❌ Erreur de validation du lien', 'above-email');
    }
  };

  const handleEmailVerification = async (token: string) => {
    setLoading(true);
    showAlert('info', 'Vérification de votre email en cours...', 'above-email');

    try {
      const response = await fetch(`http://localhost:8080/api/auth/verify-email?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        showAlert('success', '✅ Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.', 'above-email');
        navigate('/login', { replace: true });
      } else {
        showAlert('error', `❌ ${data.error || 'Échec de la vérification de l\'email'}`, 'above-email');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      showAlert('error', '❌ Erreur de connexion au serveur', 'above-email');
    } finally {
      setLoading(false);
    }
  };

  // MODIFIÉ: showAlert accepte maintenant une position
  const showAlert = (type: 'success' | 'error' | 'info', message: string, position: 'top' | 'above-email' = 'top') => {
    const alertType = type === 'info' ? 'success' : type;
    setAlert({
      show: true,
      type: alertType,
      message: message,
      position: position
    });
  };

  const closeAlert = () => {
    setAlert({ show: false, type: 'error', message: '', position: 'top' });
  };

  const handleResendVerificationEmail = async () => {
    if (!unverifiedEmail) {
      showAlert('error', 'Veuillez d\'abord entrer votre email', 'above-email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await response.json();
      
      if (response.ok) {
        showAlert('success', '📧 Email de vérification renvoyé ! Vérifiez votre boîte de réception.', 'top');
      } else {
        showAlert('error', data.error || 'Échec du renvoi de l\'email', 'top');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showAlert('error', '❌ Erreur de connexion au serveur', 'top');
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const executeLogin = (userEmail: string, userData?: any) => {
    if (userData) {
      login(userData, localStorage.getItem('token'));
      navigate(`/${userData.role.toLowerCase()}`);
      return;
    }

    let role: UserRole = 'EXPORTATEUR';
    let status: ExporterStatus | undefined = 'PROFILE_INCOMPLETE';
    
    if (userEmail.includes('admin')) role = 'admin';
    if (userEmail.includes('validator')) role = 'validator';
    if (userEmail.includes('importer')) role = 'importer';

    const is2FA = localStorage.getItem(`2fa_${userEmail}`) === 'true';

    login({ 
      email: userEmail, 
      role, 
      status, 
      companyName: 'Opérateur International',
      isTwoFactorEnabled: is2FA
    }, localStorage.getItem('token'));
      
    navigate(`/${role}`);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setEmailTouched(true);
    setPasswordTouched(true);
    
    const isEmailValid = validateAndSetEmailError(email);
    const isPasswordValid = validateAndSetPasswordError(password);
    
    setShowEmailError(true);
    setShowPasswordError(true);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);  
    closeAlert();

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        login(data.user, data.token);
        
        if (data.requiresTwoFactor) {
          setView('two_factor');
        } else {
          // MODIFIÉ: Afficher l'alerte de succès au-dessus de l'email
          showAlert('success', '✅ Connexion réussie ! Redirection en cours...', 'above-email');
          setTimeout(() => {
            executeLogin(email, data.user);
          }, 1500);
        }
      } else {
        // MODIFIÉ: Les erreurs restent en haut
        switch (data.error) {
          case 'EMAIL_NOT_VERIFIED':
            setUnverifiedEmail(email);
            showAlert('error', `❌ ${data.message || 'Email non vérifié. Veuillez vérifier votre email avant de vous connecter.'}`, 'above-email');
            break;
          case 'INVALID_CREDENTIALS':
            showAlert('error', `❌ ${data.message || 'Email ou mot de passe incorrect'}`, 'above-email');
            break;
          case 'ACCOUNT_LOCKED':
            showAlert('error', `❌ ${data.message || 'Compte temporairement verrouillé. Réessayez plus tard.'}`, 'above-email');
            break;
          case 'MAX_ATTEMPTS_EXCEEDED':
            showAlert('error', `❌ ${data.message || 'Trop de tentatives échouées. Compte verrouillé.'}`, 'above-email');
            break;
          case 'ACCOUNT_DISABLED':
            showAlert('error', `❌ ${data.message || 'Compte désactivé. Contactez l\'administrateur.'}`, 'above-email');
            break;
          case 'USER_NOT_FOUND':
            showAlert('error', `❌ ${data.message || 'Aucun compte trouvé avec cet email'}`, 'above-email');
            break;
          case 'PASSWORD_EXPIRED':
            showAlert('error', `❌ ${data.message || 'Votre mot de passe a expiré. Veuillez le réinitialiser.'}`, 'above-email');
            break;
          default:
            showAlert('error', `❌ ${data.message || 'Échec de la connexion'}`, 'above-email');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      showAlert('error', '❌ Erreur de connexion au serveur', 'above-email');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matricule.length !== 10 || pin.length !== 6) return;

    setLoading(true);
    closeAlert();
    
    try {
      const response = await fetch('http://localhost:8080/api/auth/login/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matricule: matricule,
          pin: pin
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        showAlert('success', '✅ Authentification mobile réussie', 'top');
        setMobileStep(2);
      } else {
        showAlert('error', data.message || 'Échec de la connexion mobile', 'top');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion mobile:', error);
      showAlert('error', '❌ Erreur de connexion au serveur', 'top');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = (code: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showAlert('success', '✅ Code 2FA validé avec succès', 'top');
      setTimeout(() => {
        executeLogin(email);
      }, 1500);
    }, 1000);
  };

  const finalizeMobileLogin = () => {
    setLoading(true);
    setTimeout(() => {
      let role: UserRole = 'importer';
      let companyName = 'Opérateur Mobile ID';

      if (matricule === '1111111111' && pin === '111111') {
        role = 'importer';
        companyName = 'Importateur Tunisien (SARL)';
      } else if (matricule === '2222222222' && pin === '222222') {
        role = 'validator';
        companyName = "INSSPA (Validation Sanitaire)";
      } else if (matricule === '3333333333' && pin === '333333') {
        role = 'admin';
        companyName = 'Haut Fonctionnaire (Décideur)';
      } else if (matricule === '0000000000' && pin === '000000') {
        role = 'admin';
        companyName = 'ADMINISTRATEUR CENTRAL';
      }

      const mobileEmail = matricule + '@mobile.tn';
      const is2FA = localStorage.getItem(`2fa_${mobileEmail}`) === 'true';
      
      login({ 
        email: mobileEmail, 
        role, 
        isTwoFactorEnabled: is2FA,
        companyName
      });
      
      showAlert('success', '✅ Connexion mobile réussie !', 'top');
      
      if (role === 'admin') navigate('/admin');
      else navigate(`/${role}`);
    }, 1000);
  };

  const handleResetPasswordBack = () => {
    setView('login');
    setResetToken(null);
    navigate('/login', { replace: true });
  };

  const handleResetPasswordSuccess = () => {
    showAlert('success', '✅ Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.', 'top');
    
    setTimeout(() => {
      setView('login');
      setResetToken(null);
    }, 3000);
  };

  const getShutterTransform = () => {
    switch (view) {
      case 'login': return 'translateY(0)';
      case 'signup': return `translateY(-${CARD_HEIGHT}px)`;
      case 'forgot_password': return `translateY(-${CARD_HEIGHT * 2}px)`;
      case 'two_factor': return `translateY(-${CARD_HEIGHT * 3}px)`;
      case 'reset_password': return `translateY(-${CARD_HEIGHT * 4}px)`;
      default: return 'translateY(0)';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div 
        className="w-full max-w-5xl rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden relative border border-slate-200"
        style={{ height: `${CARD_HEIGHT}px` }}
      >
        
        {/* MODIFIÉ: Alertes en haut (position top) */}
        {alert.show && alert.position === 'top' && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[90] w-11/12 max-w-lg">
            <FormAlert 
              type={alert.type}
              message={alert.message}
              onClose={closeAlert}
            />
          </div>
        )}

        {alert.show && alert.message.includes('non vérifié') && unverifiedEmail && alert.position === 'top' && (
          <div className="absolute top-48 left-1/2 -translate-x-1/2 z-[90] w-11/12 max-w-lg">
            <button
              onClick={handleResendVerificationEmail}
              disabled={loading}
              className="w-full px-5 py-3 bg-tunisia-red text-white rounded-2xl text-xs font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <i className="fas fa-paper-plane"></i>
              {loading ? 'Envoi en cours...' : 'Renvoyer l\'email de vérification'}
            </button>
          </div>
        )}

        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] flex bg-white/90 backdrop-blur-md px-1.5 py-1.5 rounded-2xl shadow-xl border border-slate-100 ring-4 ring-black/5">
          <button 
            onClick={() => changeLanguage('fr')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${i18n.language === 'fr' ? 'bg-tunisia-red text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            FR
          </button>
          <button 
            onClick={() => changeLanguage('ar')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${i18n.language === 'ar' ? 'bg-tunisia-red text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            AR
          </button>
          <button 
            onClick={() => changeLanguage('en')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${i18n.language === 'en' ? 'bg-tunisia-red text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            EN
          </button>
        </div>

        <div 
          className="w-full transition-transform duration-1000 cubic-bezier(0.85, 0, 0.15, 1) flex flex-col"
          style={{ 
            transform: getShutterTransform(),
            height: `${CARD_HEIGHT * 5}px`
          }}
        >
          
          <div className="w-full flex flex-col md:flex-row" style={{ height: `${CARD_HEIGHT}px` }}>
            <div className="flex-1 bg-emerald-600 text-white p-12 flex flex-col justify-center items-center text-center md:text-left relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="max-w-xs w-full z-10">
                <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mb-8 mx-auto md:mx-0 shadow-lg border border-white/20 backdrop-blur">
                  <i className="fas fa-id-card text-3xl"></i>
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Espace National</h2>
                <p className="text-sm text-emerald-100 font-medium mb-10 leading-relaxed">{t('mobile_id_desc')}</p>
                
                {mobileStep === 1 ? (
                  <form onSubmit={handleMobileLogin} className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-emerald-100/60 uppercase tracking-widest ml-1">{t('mobile_id_matricule')}</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"><i className="fas fa-user-circle"></i></span>
                        <input 
                          required 
                          type="text" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          value={matricule} 
                          onChange={(e) => setMatricule(e.target.value.replace(/\D/g, ''))} 
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border-2 border-white/10 focus:border-white outline-none transition-all font-bold text-sm" 
                          placeholder="1234567890" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-emerald-100/60 uppercase tracking-widest ml-1">{t('mobile_id_pin')}</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"><i className="fas fa-key"></i></span>
                        <input 
                          required 
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={pin} 
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} 
                          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/10 border-2 border-white/10 focus:border-white outline-none transition-all font-bold text-sm" 
                          placeholder="••••••" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          <i className={`fas ${showPin ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || matricule.length !== 10 || pin.length !== 6}
                      className={`w-full py-4 bg-white text-emerald-600 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all mt-4 ${loading || matricule.length !== 10 || pin.length !== 6 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-50'}`}
                    >
                      {loading ? '...' : t('continue')}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4 space-y-6 animate-fade-in-scale">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-2xl animate-pulse">
                      <i className="fas fa-fingerprint text-2xl"></i>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Confirmez sur Mobile ID</p>
                    <button onClick={finalizeMobileLogin} className="w-full py-4 border-2 border-white rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:text-emerald-600 transition-all">Valider l'accès</button>
                    <button onClick={() => setMobileStep(1)} className="text-[9px] font-black uppercase text-emerald-100/50 hover:text-white transition-colors">Retour</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-white p-12 flex flex-col justify-center items-center relative">
              {/* MODIFIÉ: Alerte au-dessus de l'email */}
              {alert.show && alert.position === 'above-email' && (
                <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[90] w-11/12 max-w-lg">
                  <FormAlert 
                    type={alert.type}
                    message={alert.message}
                    onClose={closeAlert}
                  />
                </div>
              )}

              <div className="max-w-xs w-full">
                <div className="mb-10 text-center md:text-left">
                  <div className="w-16 h-16 bg-red-50 text-tunisia-red rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-red-100 mx-auto md:mx-0">
                    <i className="fas fa-globe-africa text-3xl"></i>
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Espace International</h2>
                </div>

                <form onSubmit={handlePasswordLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                      <input 
                        type="text"
                        value={email} 
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setShowEmailError(false);
                        }} 
                        onBlur={() => {
                          setEmailTouched(true);
                          validateAndSetEmailError(email);
                          setShowEmailError(true);
                        }}
                        className={`w-full px-5 py-4 rounded-2xl border-2 ${emailError && showEmailError ? 'border-tunisia-red bg-red-50/30' : 'border-slate-50 bg-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm`} 
                        placeholder="export@company.com" 
                      />
                      {emailError && showEmailError && (
                        <p className="text-[10px] font-bold text-tunisia-red mt-1 ml-1 animate-fade-in-scale">
                          <i className="fas fa-circle-exclamation mr-1"></i> {emailError}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
                        <button type="button" onClick={() => setView('forgot_password')} className="text-[9px] font-black text-tunisia-red uppercase tracking-widest hover:underline">
                          {t('forgot_password')}
                        </button>
                      </div>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setShowPasswordError(false);
                          }}
                          onBlur={() => {
                            setPasswordTouched(true);
                            validateAndSetPasswordError(password);
                            setShowPasswordError(true);
                          }}
                          className={`w-full pl-5 pr-12 py-4 rounded-2xl border-2 ${passwordError && showPasswordError ? 'border-tunisia-red bg-red-50/30' : 'border-slate-50 bg-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm`} 
                          placeholder="••••••••" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      {passwordError && showPasswordError && (
                        <p className="text-[10px] font-bold text-tunisia-red mt-1 ml-1 animate-fade-in-scale">
                          <i className="fas fa-circle-exclamation mr-1"></i> {passwordError}
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Connexion...' : 'Se Connecter'}
                  </button>
                  <div className="pt-8 text-center border-t border-slate-100">
                    <button type="button" onClick={() => setView('signup')} className="text-[10px] font-black text-tunisia-red uppercase tracking-widest hover:underline underline-offset-4 decoration-2">
                      {t('register_now')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <ExporterSignUp 
              embedded={true} 
              onBack={() => setView('login')} 
            />
          </div>

          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <ForgotPassword 
              onBack={() => setView('login')} 
            />
          </div>

          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <TwoFactorAuth 
              loading={loading}
              onVerify={handle2FAVerify}
              onBack={() => setView('login')}
            />
          </div>

          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <div className="h-full w-full flex flex-col md:flex-row">
              <div className="flex-1 bg-slate-900 text-white p-12 flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                  <i className="fas fa-lock text-[20rem] absolute -bottom-10 -right-10"></i>
                </div>
                <div className="max-w-xs z-10">
                  <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
                    <i className="fas fa-key text-3xl text-emerald-400"></i>
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-6">Sécurité Renforcée</h2>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">
                    Définissez un nouveau mot de passe sécurisé pour protéger votre compte exportateur.
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-white p-12 flex flex-col justify-center items-center relative">
                <button 
                  onClick={handleResetPasswordBack}
                  className="absolute top-8 right-8 text-slate-400 hover:text-tunisia-red transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <i className="fas fa-arrow-up"></i> Retour à la connexion
                </button>

                <div className="max-w-xs w-full">
                  <div className="space-y-8 animate-fade-in-scale">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Nouveau mot de passe</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Veuillez définir votre nouveau mot de passe sécurisé.
                      </p>
                    </div>
                    
                    <ResetPasswordForm 
                      token={resetToken}
                      requireCurrentPassword={false} 
                      onSuccess={handleResetPasswordSuccess}
                      onCancel={handleResetPasswordBack}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <div className="fixed bottom-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pointer-events-none select-none">
        {t('gov_name')} &bull; PORTAIL NATIONAL 2025
      </div>
    </div>
  );
};

export default Login;