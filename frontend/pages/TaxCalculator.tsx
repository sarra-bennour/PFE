import React, { useState } from 'react';
import { Calculator, Info, ArrowRight, Table, Landmark, AlertCircle, Loader } from 'lucide-react';

interface TaxResult {
  customsDuty: number;
  vat: number;
  otherTaxes: number;
  total: number;
  currency: string;
  details?: {
    dutyRate: number;
    vatRate: number;
    fodec: number;
    ccc: number;
    paf: number;
  };
}

interface TaxRequest {
  hsCode: string;
  value: number;
  currency: string;
  countryCode: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const TaxCalculator: React.FC = () => {
  const [hsCode, setHsCode] = useState('');
  const [countryCode, setCountryCode] = useState('TN'); // Par défaut Tunisie
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('TND');
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Liste des pays disponibles
const countries = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'UK', name: 'Royaume-Uni', flag: '🇬🇧' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
  { code: 'CN', name: 'Chine', flag: '🇨🇳' },
  { code: 'TR', name: 'Turquie', flag: '🇹🇷' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
];

  const handleCalculate = async () => {
  // Validation des champs
  if (!hsCode.trim()) {
    setError('Veuillez saisir un code NGP');
    return;
  }
  if (!value || parseFloat(value) <= 0) {
    setError('Veuillez saisir une valeur valide');
    return;
  }
  if (!countryCode) {
    setError('Veuillez sélectionner un pays d\'origine');
    return;
  }

  setLoading(true);
  setError(null);
  
  const token = localStorage.getItem('token');
  if (!token) {
    setError('Utilisateur non authentifié');
    setLoading(false);
    return;
  }

  try {
    const request: TaxRequest = {
      hsCode: hsCode.trim(),
      value: parseFloat(value),
      currency: currency,
      countryCode: countryCode  // ← Ajoutez cette ligne
    };

    const response = await fetch(`${API_BASE_URL}/api/taxes/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Erreur ${response.status}: ${response.statusText}`);
    }

    const data: TaxResult = await response.json();
    setResult(data);
  } catch (err) {
    console.error('Erreur lors du calcul:', err);
    setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur');
    setResult(null);
  } finally {
    setLoading(false);
  }
};

  const formatNumber = (num: number): string => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
            <Calculator size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-slate-900">Estimateur de Taxes</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simulateur Douanier Tunisien</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest">
          Tarif {new Date().getFullYear()}
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulaire */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Code NGP (HS Code)
            </label>
            <input 
              type="text" 
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
              placeholder="ex: 040610 (Fromages frais)"
              className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm font-mono"
              maxLength={10}
            />
            <p className="text-[8px] text-slate-400 ml-2">
              Code à 10 chiffres (ex: 040610)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Pays d'origine
            </label>
            <select 
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
            >
                {countries.map((country) => (
                <option key={country.code} value={country.code}>
                    {country.flag} {country.name} ({country.code})
                </option>
                ))}
            </select>
            <p className="text-[8px] text-slate-400 ml-2">
                Le pays d'origine affecte les droits de douane (accords de libre-échange)
            </p>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Valeur Facturée
              </label>
              <input 
                type="number" 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Devise
              </label>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
              >
                <option value="TND">TND (Dinar Tunisien)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dollar US)</option>
                <option value="GBP">GBP (Livre Sterling)</option>
                <option value="CHF">CHF (Franc Suisse)</option>
                <option value="TRY">TRY (Livre Turque)</option>
                <option value="CNY">CNY (Yuan Chinois)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 rounded-xl flex items-center gap-2 border border-red-200">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-[10px] font-bold text-red-600">{error}</p>
            </div>
          )}

          <button 
            onClick={handleCalculate}
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Calcul en cours...
              </>
            ) : (
              <>
                Calculer les Frais <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        {/* Résultats */}
        <div className="bg-slate-50 rounded-3xl p-8 flex flex-col justify-center border border-slate-100">
          {!result ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Info size={32} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 max-w-[200px] mx-auto uppercase tracking-tighter">
                Saisissez les informations pour obtenir une estimation des droits et taxes.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="pb-6 border-b border-dashed border-slate-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Total Estimé (TND)
                </p>
                <h4 className="text-4xl font-black italic text-slate-900 tracking-tighter">
                  {formatNumber(result.total)} <span className="text-lg">DT</span>
                </h4>
                {currency !== 'TND' && (
                  <p className="text-[8px] text-slate-400 mt-1">
                    * Converti depuis {currency}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded flex items-center justify-center text-[10px]">
                      <Landmark size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Droits de Douane
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">
                      {formatNumber(result.customsDuty)} DT
                    </span>
                    {result.details?.dutyRate && (
                      <p className="text-[8px] text-slate-400">
                        Taux: {result.details.dutyRate}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center text-[10px]">
                      <Table size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      TVA
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">
                      {formatNumber(result.vat)} DT
                    </span>
                    {result.details?.vatRate && (
                      <p className="text-[8px] text-slate-400">
                        Taux: {result.details.vatRate}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-200 text-slate-500 rounded flex items-center justify-center text-[10px]">
                      <Info size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Autres Taxes
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">
                      {formatNumber(result.otherTaxes)} DT
                    </span>
                  </div>
                </div>
              </div>

              {result.details && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-[8px] text-slate-500 space-y-1">
                    {result.details.fodec > 0 && (
                      <span>✓ FODEC: {formatNumber(result.details.fodec)} DT<br /></span>
                    )}
                    {result.details.ccc > 0 && (
                      <span>✓ CCC: {formatNumber(result.details.ccc)} DT<br /></span>
                    )}
                    {result.details.paf > 0 && (
                      <span>✓ PAF: {formatNumber(result.details.paf)} DT</span>
                    )}
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-white/50 rounded-xl border border-blue-50">
                <p className="text-[8px] font-bold text-blue-600 uppercase tracking-tight leading-relaxed italic">
                  * Cette estimation est donnée à titre indicatif. Seule la liquidation douanière officielle fait foi.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaxCalculator;