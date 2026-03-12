import React, { useState } from 'react';
import FormAlert from './FormAlert';

interface PaymentFormProps {
  amount: number;
  onSubmit: (paymentDetails: {
    paymentMethodId: string;
    cardHolder: string;
    receiptEmail: string;
  }) => Promise<void>;
  onCancel?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  error?: string | null;
  success?: {
    message: string;
    amount?: number;
  } | null;
}

// Mapping des numéros de carte vers les PaymentMethod IDs Stripe
const CARD_TO_PAYMENT_METHOD: Record<string, string> = {
  '4242424242424242': 'pm_card_visa',
  '4000056655665556': 'pm_card_mastercard',
  '5555555555554444': 'pm_card_mastercard',
  '378282246310005': 'pm_card_amex',
  '4012888888881881': 'pm_card_visa',
  '4000000000000077': 'pm_card_chargeDeclined',
  '4000000000009995': 'pm_card_chargeDeclinedInsufficientFunds',
  '4000000000000069': 'pm_card_chargeDeclinedExpiredCard',
  '4000000000000127': 'pm_card_chargeDeclinedIncorrectCvc',
  '4000000000000101': 'pm_card_chargeDeclinedLostCard',
  '4000000000000119': 'pm_card_chargeDeclinedStolenCard',
  '4000002760003184': 'pm_card_threeDSecureRequired',
};

const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  onSubmit,
  onCancel,
  onBack,
  isLoading = false,
  error = null,
  success = null
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [receiptEmail, setReceiptEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [formError, setFormError] = useState('');

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const currentYear = new Date().getFullYear() % 100;
  const years = Array.from({ length: 11 }, (_, i) => (currentYear + i).toString());

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (formError) setFormError('');
  };

  const getPaymentMethodId = (cleanCardNumber: string): string => {
    // Retourne le PaymentMethod ID correspondant au numéro de carte de test
    return CARD_TO_PAYMENT_METHOD[cleanCardNumber] || 'pm_card_visa';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setEmailError('');

    // Validation
    if (!cardHolder.trim()) {
      setEmailError("Veuillez saisir le nom du détenteur de la carte.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(receiptEmail)) {
      setEmailError("Veuillez saisir une adresse e-mail valide pour le reçu.");
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length !== 16) {
      setFormError("Le numéro de carte doit comporter 16 chiffres.");
      return;
    }

    if (!expiryMonth || !expiryYear) {
      setFormError("Veuillez sélectionner la date d'expiration.");
      return;
    }

    if (cvv.length !== 3) {
      setFormError("Le code CVV doit comporter 3 chiffres.");
      return;
    }

    // Convertir le numéro de carte en PaymentMethod ID
    const paymentMethodId = getPaymentMethodId(cleanCard);
    
    console.log(`💳 Carte ${cleanCard} → PaymentMethod ID: ${paymentMethodId}`);

    await onSubmit({
      paymentMethodId,
      cardHolder: cardHolder.toUpperCase(),
      receiptEmail
    });
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-fade-in-scale">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-10">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Paiement Sécurisé</h2>
          <div className="flex gap-2">
            <i className="fab fa-cc-visa text-slate-300 text-2xl"></i>
            <i className="fab fa-cc-mastercard text-slate-300 text-2xl"></i>
          </div>
        </div>

        {/* ALERTE DE SUCCÈS */}
        {success && (
          <div className="mb-6 animate-fade-in-scale">
            <FormAlert 
              type="success"
              message={
                <>
                  <span className="font-bold block mb-1">{success.message}</span>
                  {success.amount && (
                    <span className="text-xs opacity-90 block">Montant: {success.amount} DT</span>
                  )}
                  <span className="text-xs opacity-75 block mt-2">Redirection dans quelques instants...</span>
                </>
              }
              onClose={() => {}}
            />
          </div>
        )}

        {/* ALERTE D'ERREUR */}
        {error && (
          <div className="mb-6 animate-fade-in-scale">
            <FormAlert 
              type="error"
              message={error}
              onClose={() => {}}
            />
          </div>
        )}

        {/* ALERTE D'ERREUR DE FORMULAIRE */}
        {formError && (
          <div className="mb-4">
            <FormAlert 
              message={formError} 
              type="error" 
              onClose={() => setFormError('')} 
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du détenteur</label>
            <input 
              type="text" 
              value={cardHolder}
              onChange={(e) => { setCardHolder(e.target.value.toUpperCase()); if (formError) setFormError(''); }}
              className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 ${emailError && !cardHolder ? 'border-tunisia-red' : 'border-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm uppercase`} 
              placeholder="NOM PRÉNOM"  
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse e-mail (Reçu)</label>
            <input 
              type="text" 
              value={receiptEmail}
              onChange={(e) => { 
                setReceiptEmail(e.target.value); 
                if (emailError) setEmailError(''); 
              }}
              className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 ${emailError ? 'border-tunisia-red bg-red-50/30' : 'border-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm`} 
              placeholder="votre@email.com" 
            />
            {emailError && (
              <p className="text-[10px] font-bold text-tunisia-red mt-1 ml-1 animate-fade-in-scale">
                <i className="fas fa-circle-exclamation mr-1"></i> {emailError}
              </p>
            )}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro de carte</label>
            <div className="relative">
              <input 
                type="text" 
                value={cardNumber}
                onChange={handleCardNumberChange}
                className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 ${formError && cardNumber.replace(/\s/g, '').length !== 16 ? 'border-tunisia-red' : 'border-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm`} 
                placeholder="4242 4242 4242 4242" 
              />
              <i className="fas fa-credit-card absolute right-5 top-1/2 -translate-y-1/2 text-slate-200 text-xs"></i>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mois</label>
              <select 
                value={expiryMonth}
                onChange={(e) => { setExpiryMonth(e.target.value); if (formError) setFormError(''); }}
                className={`w-full px-4 py-4 rounded-2xl bg-slate-50 border-2 ${formError && !expiryMonth ? 'border-tunisia-red' : 'border-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm appearance-none cursor-pointer`}
              >
                <option value="">MM</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Année</label>
              <select 
                value={expiryYear}
                onChange={(e) => { setExpiryYear(e.target.value); if (formError) setFormError(''); }}
                className={`w-full px-4 py-4 rounded-2xl bg-slate-50 border-2 ${formError && !expiryYear ? 'border-tunisia-red' : 'border-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm appearance-none cursor-pointer`}
              >
                <option value="">YY</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CVV</label>
              <input 
                type="text" 
                value={cvv}
                onChange={(e) => { 
                  const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                  setCvv(value);
                  if (formError) setFormError(''); 
                }}
                className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 ${formError && cvv.length !== 3 ? 'border-tunisia-red' : 'border-slate-50'} focus:border-tunisia-red outline-none transition-all font-bold text-sm text-center`} 
                placeholder="123" 
                maxLength={3}
              />
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isLoading || success !== null} 
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : (
                <>
                  <i className="fas fa-shield-halved text-emerald-500"></i>
                  Payer {amount.toLocaleString('fr-FR')} DT
                </>
              )}
            </button>
            {onBack && (
              <button 
                type="button" 
                onClick={onBack} 
                className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors mt-2"
              >
                Retour à la facture
              </button>
            )}
            {onCancel && (
              <button 
                type="button" 
                onClick={onCancel} 
                className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors mt-2"
              >
                Annuler
              </button>
            )}
          </div>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-50 text-center flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 opacity-40">
            <i className="fas fa-fingerprint text-xl"></i>
            <i className="fas fa-key text-xl"></i>
            <i className="fas fa-user-shield text-xl"></i>
          </div>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">
            Paiement sécurisé par Stripe
          </p>
          <p className="text-[6px] font-black uppercase tracking-widest text-slate-400">
            Test : 4242 4242 4242 4242 | 12/34 | 123
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;