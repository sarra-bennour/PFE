
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

interface ExporterSignUpProps {
  onBack?: () => void; // Prop optionnelle pour l'animation dans Login.tsx
  embedded?: boolean;   // Pour ajuster le style si intégré dans le shutter
}

const ExporterSignUp: React.FC<ExporterSignUpProps> = ({ onBack, embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [resentEmail, setResentEmail] = useState(false);
  const [resentLoading, setResentLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    country: '',
    city: '',
    address: '',
    website: '',
    phone: '',
    legalRep: '',
    tin: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const countries = [
    { code: 'FR', name: 'France', dial: '+33' },
    { code: 'IT', name: 'Italie', dial: '+39' },
    { code: 'TR', name: 'Turquie', dial: '+90' },
    { code: 'CN', name: 'Chine', dial: '+86' },
    { code: 'ES', name: 'Espagne', dial: '+34' },
    { code: 'DE', name: 'Allemagne', dial: '+49' },
    { code: 'US', name: 'États-Unis', dial: '+1' },
    { code: 'AE', name: 'Émirats Arabes Unis', dial: '+971' },
    { code: 'DZ', name: 'Algérie', dial: '+213' },
    { code: 'LY', name: 'Libye', dial: '+218' },
    { code: 'SA', name: 'Arabie Saoudite', dial: '+966' },
    { code: 'MA', name: 'Maroc', dial: '+212' },
    { code: 'BE', name: 'Belgique', dial: '+32' },
    { code: 'CH', name: 'Suisse', dial: '+41' },
    { code: 'UK', name: 'Royaume-Uni', dial: '+44' },
  ];

  const getPasswordStyles = (pwd: string) => {
    if (pwd.length === 0) return { score: 0, color: 'border-slate-100 focus:ring-slate-200 focus:border-slate-300', text: '', textColor: 'text-slate-400' };
    if (pwd.length < 8) return { score: 1, color: 'border-red-500 focus:ring-red-200 focus:border-red-500', text: 'Trop court (min 8)', textColor: 'text-red-500' };
    
    const hasNumbers = /\d/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    if (hasNumbers && hasUpper && hasSpecial) return { score: 3, color: 'border-emerald-500 focus:ring-emerald-200 focus:border-emerald-500', text: 'Fort', textColor: 'text-emerald-500' };
    if (hasNumbers || hasUpper || hasSpecial) return { score: 2, color: 'border-amber-500 focus:ring-amber-200 focus:border-amber-500', text: 'Moyen', textColor: 'text-amber-500' };
    return { score: 1, color: 'border-red-500 focus:ring-red-200 focus:border-red-500', text: 'Faible', textColor: 'text-red-500' };
  };

  const strength = getPasswordStyles(formData.password);
  const isMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const isMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const confirmClasses = isMatch 
    ? 'border-emerald-500 focus:ring-emerald-200 focus:border-emerald-500' 
    : isMismatch 
      ? 'border-red-500 focus:ring-red-200 focus:border-red-500' 
      : 'border-slate-100 focus:ring-slate-200 focus:border-slate-300';

  const currentDialCode = countries.find(c => c.code === formData.country)?.dial || '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleResendEmail = async () => {
    setResentLoading(true);
    
    try {
      const response = await fetch('http://localhost:8080/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });

      if (response.ok) {
        setResentEmail(true);
        // Réinitialiser après 5 secondes
        setTimeout(() => {
          setResentEmail(false);
        }, 5000);
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message || 'Échec du renvoi de l\'email'}`);
      }
    } catch (error) {
      console.error('Erreur lors du renvoi de l\'email:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setResentLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (strength.score < 2 || !isMatch) return;
  
  setLoading(true);
  const fullPhoneNumber = `${currentDialCode}${formData.phone}`;
  
  try {
    const response = await fetch('http://localhost:8080/api/auth/signup/exporter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyName: formData.companyName,
        country: formData.country,
        city: formData.city,
        address: formData.address,
        website: formData.website,
        phone: fullPhoneNumber,
        legalRep: formData.legalRep,
        tinNumber: formData.tin,
        email: formData.email,
        password: formData.password
      }),
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('Inscription réussie:', userData);
      setSuccess(true);
      // Rediriger vers le dashboard après inscription
      // setTimeout(() => {
      //   navigate('/login');
      // }, 3000);
    } else {
      const error = await response.json();
      alert(`Erreur: ${error.message || 'Échec de l\'inscription'}`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    alert('Erreur de connexion au serveur');
  } finally {
    setLoading(false);
  }
};

  const containerClasses = embedded 
    ? "h-full w-full flex flex-col md:flex-row overflow-hidden" 
    : "max-w-6xl mx-auto py-12 px-4 animate-fade-in-scale";

  return (
    <div className={containerClasses}>
      <div className={`flex-[2] bg-white ${embedded ? 'p-10' : 'p-12 rounded-[3rem] shadow-2xl border border-slate-100'} flex flex-col justify-center overflow-y-auto`}>
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-2">
              {onBack && (
                <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-tunisia-red flex items-center gap-2 transition-colors w-fit">
                  <i className="fas fa-arrow-up"></i> {t('back_to_login')}
                </button>
              )}
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">Enregistrement International</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Formulaire Officiel de Conformité</p>
            </div>
          </div>

          {success ? (
            <div className="text-center py-12 animate-fade-in-scale">
              <div className="w-20 h-20 bg-green-50 text-green-500 flex items-center justify-center rounded-full mx-auto mb-8 shadow-inner border border-green-100">
                <i className="fas fa-envelope-circle-check text-3xl"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">{t('signup_success')}</h3>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 max-w-sm mx-auto">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Destinataire</p>
                <p className="text-slate-900 font-black text-base break-all tracking-tight italic">{formData.email}</p>
              </div>

              <p className="text-slate-500 font-medium mb-10 max-w-md mx-auto leading-relaxed text-sm">
                Veuillez cliquer sur le lien de validation contenu dans l'e-mail pour activer votre compte professionnel.
              </p>

              {resentEmail && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl max-w-md mx-auto">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <p className="text-sm font-medium text-emerald-700">
                      Email renvoyé avec succès !
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 max-w-xs mx-auto">
                <button 
                  onClick={() => onBack ? onBack() : navigate('/login')} 
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
                >
                  {t('back_to_login')}
                </button>
                
                <button 
                  onClick={handleResendEmail}
                  disabled={resentLoading}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-tunisia-red transition-all flex items-center justify-center gap-2"
                >
                  {resentLoading ? (
                    <i className="fas fa-circle-notch animate-spin"></i>
                  ) : (
                    <i className="fas fa-rotate-right"></i>
                  )}
                  Renvoyer l'e-mail de confirmation
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('company_name')}</label>
                  <input required name="companyName" value={formData.companyName} onChange={handleChange} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs" placeholder="Ex: Global Export Co." />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('country')}</label>
                  <select required name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs appearance-none">
                    <option value="">Sélectionner le pays</option>
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('city')}</label>
                  <input required name="city" value={formData.city} onChange={handleChange} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs" placeholder="Ex: Tunis" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('tin_number')}</label>
                  <input required name="tin" value={formData.tin} onChange={handleChange} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs" placeholder="Ex: 1234567/A" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('address')}</label>
                  <input required name="address" value={formData.address} onChange={handleChange} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs" placeholder="Ex: 123 Avenue de la Liberté" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('legal_rep')}</label>
                  <input required name="legalRep" value={formData.legalRep} onChange={handleChange} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs" placeholder="Nom et Prénom" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('phone_number')}</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-0 h-full flex items-center px-3 border-r border-slate-100 bg-slate-100/50 rounded-l-xl pointer-events-none">
                      <span className="text-[10px] font-black text-slate-500">{currentDialCode || '+--'}</span>
                    </div>
                    <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className={`w-full ${currentDialCode ? 'pl-14' : 'pl-12'} pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs`} placeholder="Numéro de mobile" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('website')}</label>
                  <input name="website" value={formData.website} onChange={handleChange} type="url" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs" placeholder="https://www.company.com" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('email_pro')}</label>
                  <input required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-100 outline-none transition-all font-bold text-xs" placeholder="contact@company.com" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('password')}</label>
                  <div className="relative">
                    <input 
                      required 
                      name="password" 
                      value={formData.password} 
                      onChange={handleChange} 
                      type={showPassword ? "text" : "password"} 
                      className={`w-full pl-4 pr-10 py-2.5 rounded-xl border-2 ${strength.color} bg-slate-50 focus:ring-4 outline-none transition-all font-bold text-xs`} 
                      placeholder="••••••••" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {strength.text && <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${strength.textColor}`}>{strength.text}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('confirm_password')}</label>
                  <div className="relative">
                    <input 
                      required 
                      name="confirmPassword" 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      type={showConfirmPassword ? "text" : "password"} 
                      className={`w-full pl-4 pr-10 py-2.5 rounded-xl border-2 ${confirmClasses} bg-slate-50 focus:ring-4 outline-none transition-all font-bold text-xs`} 
                      placeholder="••••••••" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {isMismatch && <p className="text-[8px] font-black uppercase tracking-widest text-red-500 mt-1">Les mots de passe diffèrent</p>}
                  {isMatch && <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mt-1">Conforme</p>}
                </div>
              </div>
              
              <button type="submit" disabled={loading || strength.score < 2 || !isMatch} className={`w-full py-4 ${loading || strength.score < 2 || !isMatch ? 'bg-slate-300' : 'bg-tunisia-red hover:bg-red-700'} text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 mt-2`}>
                {loading ? 'Traitement...' : t('register_btn')}
              </button>
            </form>
          )}
          
          {!embedded && (
            <div className="mt-12 pt-8 border-t border-slate-100 text-center flex flex-col items-center gap-4">
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-relaxed max-w-sm">Portail sécurisé de la République Tunisienne. Protection des données garantie par la loi.</p>
               <Link 
                to="/" 
                className="text-slate-900 text-[10px] font-black uppercase tracking-widest hover:text-tunisia-red transition-all flex items-center gap-2"
              >
                <i className="fas fa-book-open text-[8px]"></i>
                {t('help_needs_home_button')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {embedded && (
        <div className="flex-1 bg-slate-900 text-white p-10 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <i className="fas fa-file-contract text-[15rem] transform -rotate-12"></i>
          </div>
          <div className="max-w-xs w-full z-10 mx-auto">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
              <i className="fas fa-shield-halved text-3xl text-emerald-400"></i>
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6">Conformité</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <i className="fas fa-check-circle text-emerald-500 mt-1"></i>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-1">Agréé État</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Reconnaissance immédiate par les douanes tunisiennes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <i className="fas fa-bolt text-emerald-500 mt-1"></i>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-1">Fast-Track</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Réduction drastique des délais de contrôle.</p>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/5 text-center flex flex-col items-center gap-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 leading-relaxed">Portail sécurisé de la République Tunisienne. Protection des données garantie par la loi.</p>
              <Link 
                to="/" 
                className="text-white text-[10px] font-black uppercase tracking-widest hover:text-tunisia-red transition-all flex items-center gap-2"
              >
                <i className="fas fa-book-open text-[8px]"></i>
                  {t('help_needs_home_button')}              
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExporterSignUp;
