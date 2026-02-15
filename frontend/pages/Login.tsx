import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, UserRole, ExporterStatus, User } from '../App';
import ExporterSignUp from './ExporterSignUp';
import ForgotPassword from './ForgotPassword';
import TwoFactorAuth from './TwoFactorAuth';
import ResetPasswordForm from '../components/ResetPasswordForm'; // AJOUTÉ

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  
  // AJOUTÉ: Nouveau view pour le reset password
  const [view, setView] = useState<'login' | 'signup' | 'forgot_password' | 'two_factor' | 'reset_password'>('login');
  const [loading, setLoading] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);
  const [matricule, setMatricule] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null); // AJOUTÉ
  
  const [verificationStatus, setVerificationStatus] = useState<{
    show: boolean;
    type: 'success' | 'error' | null;
    message: string;
  }>({
    show: false,
    type: null,
    message: ''
  });
  
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const CARD_HEIGHT = 750;

  // MODIFIÉ: useEffect pour vérifier le token d'email ET le token de reset
  useEffect(() => {
    const emailToken = searchParams.get('token');
    const resetTokenParam = searchParams.get('reset-token'); // MODIFIÉ: Utiliser reset-token au lieu de token
    
    if (emailToken) {
      // Token de vérification d'email
      handleEmailVerification(emailToken);
    }
    
    if (resetTokenParam) {
      // Token de réinitialisation de mot de passe
      handleResetPasswordToken(resetTokenParam);
    }
  }, [searchParams]);

  // NOUVELLE FONCTION: Gérer le token de réinitialisation
  const handleResetPasswordToken = (token: string) => {
    setResetToken(token);
    setView('reset_password'); // Affiche directement la 5ème couche
    setVerificationStatus({
      show: true,
      type: null,
      message: 'Validation du lien de réinitialisation...'
    });
    
    // Valider le token via l'API
    validateResetToken(token);
  };

  // NOUVELLE FONCTION: Valider le token de réinitialisation
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
        setVerificationStatus({
          show: true,
          type: 'success',
          message: '✅ Lien de réinitialisation valide. Vous pouvez maintenant définir votre nouveau mot de passe.'
        });
      } else {
        setVerificationStatus({
          show: true,
          type: 'error',
          message: `❌ ${data.error || 'Le lien de réinitialisation est invalide ou a expiré'}`
        });
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      setVerificationStatus({
        show: true,
        type: 'error',
        message: '❌ Erreur de validation du lien'
      });
    }
  };

  const handleEmailVerification = async (token: string) => {
    setLoading(true);
    setVerificationStatus({
      show: true,
      type: null,
      message: 'Vérification de votre email en cours...'
    });

    try {
      const response = await fetch(`http://localhost:8080/api/auth/verify-email?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setVerificationStatus({
          show: true,
          type: 'success',
          message: '✅ Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.'
        });
        
        navigate('/login', { replace: true });
      } else {
        setVerificationStatus({
          show: true,
          type: 'error',
          message: `❌ ${data.error || 'Échec de la vérification de l\'email'}`
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setVerificationStatus({
        show: true,
        type: 'error',
        message: '❌ Erreur de connexion au serveur'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!email) {
      setVerificationStatus({
        show: true,
        type: 'error',
        message: 'Veuillez d\'abord entrer votre email'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setVerificationStatus({
          show: true,
          type: 'success',
          message: '📧 Email de vérification renvoyé ! Vérifiez votre boîte de réception.'
        });
      } else {
        setVerificationStatus({
          show: true,
          type: 'error',
          message: data.error || 'Échec du renvoi de l\'email'
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      setVerificationStatus({
        show: true,
        type: 'error',
        message: '❌ Erreur de connexion au serveur'
      });
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const executeLogin = (userEmail: string) => {
    let role: UserRole = 'exporter';
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
    });
    
    navigate(`/${role}`);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

      if (response.ok) {
        const loginResponse = await response.json();
        console.log('Login réussi:', loginResponse);
        
        localStorage.setItem('token', loginResponse.token);
        localStorage.setItem('user', JSON.stringify(loginResponse.user));
        
        if (loginResponse.requiresTwoFactor) {
          setView('two_factor');
        } else {
          executeLogin(email);
        }
      } else {
        const error = await response.json();
        
        if (error.error === 'EMAIL_NOT_VERIFIED') {
          setVerificationStatus({
            show: true,
            type: 'error',
            message: `❌ Email non vérifié. Un lien de vérification a été envoyé à ${email}.`
          });
        } else {
          alert(`Erreur: ${error.message || 'Échec de la connexion'}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matricule.length !== 10 || pin.length !== 6) return;

    setLoading(true);
    
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

      if (response.ok) {
        const loginResponse = await response.json();
        console.log('Login mobile réussi:', loginResponse);
        
        localStorage.setItem('token', loginResponse.token);
        localStorage.setItem('user', JSON.stringify(loginResponse.user));
        
        setMobileStep(2);
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message || 'Échec de la connexion mobile'}`);
      }
    } catch (error) {
      console.error('Erreur lors de la connexion mobile:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = (code: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      executeLogin(email);
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
      
      if (role === 'admin') navigate('/admin');
      else navigate(`/${role}`);
    }, 1000);
  };

  // MODIFIÉ: Fonction pour gérer le retour depuis le reset password
  const handleResetPasswordBack = () => {
    setView('login');
    setResetToken(null);
    navigate('/login', { replace: true });
  };

  // MODIFIÉ: Fonction pour gérer le succès de réinitialisation
  const handleResetPasswordSuccess = () => {
    setVerificationStatus({
      show: true,
      type: 'success',
      message: '✅ Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
    });
    
    // Revenir à la page de login après un délai
    setTimeout(() => {
      setView('login');
      setResetToken(null);
    }, 3000);
  };

  // MODIFIÉ: Fonction getShutterTransform avec 5ème layer
  const getShutterTransform = () => {
    switch (view) {
      case 'login': return 'translateY(0)';
      case 'signup': return `translateY(-${CARD_HEIGHT}px)`;
      case 'forgot_password': return `translateY(-${CARD_HEIGHT * 2}px)`;
      case 'two_factor': return `translateY(-${CARD_HEIGHT * 3}px)`;
      case 'reset_password': return `translateY(-${CARD_HEIGHT * 4}px)`; // NOUVEAU
      default: return 'translateY(0)';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div 
        className="w-full max-w-5xl rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden relative border border-slate-200"
        style={{ height: `${CARD_HEIGHT}px` }}
      >
        
        {/* Notification de vérification d'email */}
        {verificationStatus.show && (
          <div className={`absolute top-24 left-1/2 -translate-x-1/2 z-[90] w-11/12 max-w-lg ${
            verificationStatus.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : verificationStatus.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          } border-2 rounded-2xl p-4 shadow-lg animate-fade-in-scale`}>
            <div className="flex items-start gap-3">
              {verificationStatus.type === 'success' && (
                <i className="fas fa-check-circle text-emerald-500 text-lg mt-0.5"></i>
              )}
              {verificationStatus.type === 'error' && (
                <i className="fas fa-exclamation-triangle text-red-500 text-lg mt-0.5"></i>
              )}
              {verificationStatus.type === null && (
                <i className="fas fa-spinner fa-spin text-blue-500 text-lg mt-0.5"></i>
              )}
              <div className="flex-1">
                <p className="text-sm font-bold mb-1">
                  {verificationStatus.type === 'success' ? 'Succès' : 
                   verificationStatus.type === 'error' ? 'Attention' : 'Information'}
                </p>
                <p className="text-xs">{verificationStatus.message}</p>
                
                {verificationStatus.type === 'error' && verificationStatus.message.includes('non vérifié') && (
                  <button
                    onClick={handleResendVerificationEmail}
                    disabled={loading}
                    className="mt-3 text-xs font-bold text-tunisia-red hover:underline flex items-center gap-2"
                  >
                    <i className="fas fa-paper-plane"></i>
                    {loading ? 'Envoi en cours...' : 'Renvoyer l\'email de vérification'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setVerificationStatus({ show: false, type: null, message: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        {/* Floating Language Switcher */}
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

        {/* Vertical Shutter Container - MODIFIÉ pour 5 couches */}
        <div 
          className="w-full transition-transform duration-1000 cubic-bezier(0.85, 0, 0.15, 1) flex flex-col"
          style={{ 
            transform: getShutterTransform(),
            height: `${CARD_HEIGHT * 5}px` // MODIFIÉ: 5 couches maintenant
          }}
        >
          
          {/* LAYER 1: LOGIN */}
          <div className="w-full flex flex-col md:flex-row" style={{ height: `${CARD_HEIGHT}px` }}>
            {/* National Login */}
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

            {/* International Login */}
            <div className="flex-1 bg-white p-12 flex flex-col justify-center items-center">
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
                        required 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-tunisia-red outline-none transition-all font-bold text-sm" 
                        placeholder="export@company.com" 
                      />
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
                          required 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className="w-full pl-5 pr-12 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-tunisia-red outline-none transition-all font-bold text-sm" 
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
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          {/* LAYER 2: SIGNUP */}
          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <ExporterSignUp 
              embedded={true} 
              onBack={() => setView('login')} 
            />
          </div>

          {/* LAYER 3: FORGOT PASSWORD */}
          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <ForgotPassword 
              onBack={() => setView('login')} 
            />
          </div>

          {/* LAYER 4: 2FA */}
          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <TwoFactorAuth 
              loading={loading}
              onVerify={handle2FAVerify}
              onBack={() => setView('login')}
            />
          </div>

          {/* NOUVEAU LAYER 5: RESET PASSWORD */}
          <div className="w-full" style={{ height: `${CARD_HEIGHT}px` }}>
            <div className="h-full w-full flex flex-col md:flex-row">
              {/* Colonne de gauche : Visuel/Information */}
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

              {/* Colonne de droite : Formulaire de réinitialisation */}
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
                    
                    {/* Utilisation du composant ResetPasswordForm avec le token */}
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