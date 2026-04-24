import React, { useState, useEffect } from 'react';
import { StructureType, InternalStructure } from '../../types/InternalStructure';
import { X, Save, Building2, Landmark, ShieldCheck } from 'lucide-react';
import FormAlert from '../../components/FormAlert'; // ← Importer FormAlert

const MINISTRIES = [
  { fr: "Ministère du Commerce et du Développement des Exportations", ar: "وزارة التجارة وتنمية الصادرات" },
  { fr: "Ministère de l'Industrie, des Mines et de l'Énergie", ar: "وزارة الصناعة والمناجم والطاقة" },
  { fr: "Ministère de l'Agriculture, des Ressources Hydrauliques et de la Pêche", ar: "وزارة الفلاحة والموارد المائية والصيد البحري" },
  { fr: "Ministère de la Santé", ar: "وزارة الصحة" },
  { fr: "Ministère de l'Environnement", ar: "وزارة البيئة" },
  { fr: "Ministère des Technologies de la Communication", ar: "وزارة تكنولوجيات الاتصال" },
  { fr: "Ministère du Transport", ar: "وزارة النقل" },
  { fr: "Ministère de l'Équipement et de l'Habitat", ar: "وزارة التجهيز والإسكان" },
  { fr: "Ministère de l'Éducation", ar: "وزارة التربية" },
  { fr: "Ministère de l'Enseignement Supérieur et de la Recherche Scientifique", ar: "وزارة التعليم العالي والبحث العلمي" },
  { fr: "Ministère des Affaires Sociales", ar: "وزارة الشؤون الاجتماعية" },
  { fr: "Ministère du Tourisme", ar: "وزارة السياحة" },
  { fr: "Ministère de la Famille, de la Femme, de l'Enfance et des Personnes Âgées", ar: "وزارة الأسرة والمرأة والطفولة وكبار السن" },
  { fr: "Ministère des Affaires Culturelles", ar: "وزارة الشؤون الثقافية" },
  { fr: "Ministère de la Jeunesse et des Sports", ar: "وزارة الشباب والرياضة" },
  { fr: "Ministère de l'Intérieur", ar: "وزارة الداخلية" },
  { fr: "Ministère des Affaires Étrangères, de la Migration et des Tunisiens à l'Étranger", ar: "وزارة الشؤون الخارجية والهجرة والتونسيين بالخارج" },
  { fr: "Ministère de la Justice", ar: "وزارة العدل" },
  { fr: "Ministère de la Défense Nationale", ar: "وزارة الدفاع الوطني" },
  { fr: "Ministère des Finances", ar: "وزارة المالية" },
  { fr: "Ministère de l'Économie et de la Planification", ar: "وزارة الاقتصاد والتخطيط" },
  { fr: "Ministère des Affaires Religieuses", ar: "وزارة الشؤون الدينية" },
  { fr: "Autre Ministère (Saisie manuelle)", ar: "" }
];

interface InternalStructureFormProps {
  onSuccess: (data: { type: StructureType; officialName: string; officialNameAr: string }) => void;
  onCancel: () => void;
  initialData?: InternalStructure;
}

const InternalStructureForm: React.FC<InternalStructureFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const isEditMode = !!initialData;
  
  // États pour les messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    type: initialData?.type || StructureType.MINISTRY,
    officialNameFr: initialData?.officialName || '',
    officialNameAr: initialData?.officialNameAr || '',
    code: initialData?.code || ''
  });

  const [selectedMinistry, setSelectedMinistry] = useState('');

  // Initialiser la sélection du ministère si on est en mode création avec un ministère pré-sélectionné
  useEffect(() => {
    if (!isEditMode && formData.type === StructureType.MINISTRY && formData.officialNameFr) {
      const found = MINISTRIES.find(m => m.fr === formData.officialNameFr);
      if (found) {
        setSelectedMinistry(formData.officialNameFr);
      }
    }
  }, [isEditMode, formData.type, formData.officialNameFr]);

  // Gérer la sélection du ministère (uniquement en mode création)
  const handleMinistrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedMinistry(value);
    
    const ministry = MINISTRIES.find(m => m.fr === value);
    if (ministry && value !== 'Autre Ministère (Saisie manuelle)') {
      setFormData(prev => ({ 
        ...prev, 
        officialNameFr: ministry.fr,
        officialNameAr: ministry.ar 
      }));
    } else if (value === 'Autre Ministère (Saisie manuelle)') {
      // Vider les champs pour permettre la saisie manuelle
      setFormData(prev => ({ 
        ...prev, 
        officialNameFr: '',
        officialNameAr: ''
      }));
    }
  };

  // Gérer le changement du nom français
  const handleOfficialNameFrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, officialNameFr: e.target.value });
    // Effacer les messages d'erreur quand l'utilisateur commence à taper
    if (error) setError(null);
  };

  // Gérer le changement du nom arabe
  const handleOfficialNameArChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, officialNameAr: e.target.value });
    // Effacer les messages d'erreur quand l'utilisateur commence à taper
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs requis
    if (!formData.officialNameFr.trim()) {
      setError("Le nom officiel (français) est requis");
      return;
    }
    
    if (!formData.officialNameAr.trim()) {
      setError("Le nom officiel (arabe) est requis");
      return;
    }
    
    // Effacer les messages précédents
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      // Appeler la fonction onSuccess (qui fait l'appel API)
      await onSuccess({
        type: formData.type,
        officialName: formData.officialNameFr.trim(),
        officialNameAr: formData.officialNameAr.trim()
      });
      
      // Succès
      setSuccess(isEditMode 
        ? "Structure modifiée avec succès !" 
        : "Structure créée avec succès !"
      );
      
      // Fermer le formulaire après 2 secondes en cas de succès
      setTimeout(() => {
        onCancel();
      }, 2000);
      
    } catch (err: any) {
      // Gestion des erreurs
      console.error("Erreur lors de l'envoi:", err);
      
      // Extraire le message d'erreur de la réponse
      let errorMessage = "Une erreur est survenue lors de l'enregistrement";
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Messages d'erreur spécifiques pour les doublons
      if (errorMessage.includes("existe déjà") || errorMessage.includes("unique")) {
        errorMessage = "❌ " + errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: StructureType) => {
    switch (type) {
      case StructureType.MINISTRY: return <Building2 size={18} />;
      case StructureType.BANK: return <Landmark size={18} />;
      case StructureType.CUSTOMS: return <ShieldCheck size={18} />;
    }
  };

  const getTypeName = (type: StructureType) => {
    switch (type) {
      case StructureType.MINISTRY: return 'Ministère';
      case StructureType.BANK: return 'Banque';
      case StructureType.CUSTOMS: return 'Douane';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-lg w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
            {initialData ? 'Modifier la structure' : 'Créer une structure'}
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {initialData ? 'Modifiez les informations officielles' : 'Saisie des informations officielles'}
          </p>
        </div>
        <button onClick={onCancel} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Affichage des alertes */}
        {error && (
          <FormAlert 
            message={error} 
            type="error" 
            onClose={() => setError(null)}
          />
        )}
        
        {success && (
          <FormAlert 
            message={success} 
            type="success" 
            onClose={() => setSuccess(null)}
          />
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de structure</label>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(StructureType).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type })}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  formData.type === type 
                    ? 'border-tunisia-red bg-tunisia-red/5 text-tunisia-red' 
                    : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100'
                }`}
              >
                {getTypeIcon(type)}
                <span className="text-[9px] font-black uppercase tracking-widest">{getTypeName(type)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nom officiel en français - Conditionnel selon le mode */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Nom Officiel (Français)
            {isEditMode && <span className="text-xs text-slate-300 ml-2">(Modifiable librement)</span>}
          </label>
          
          {!isEditMode && formData.type === StructureType.MINISTRY ? (
            // Mode CRÉATION avec MINISTRY : Liste déroulante
            <>
              <select
                value={selectedMinistry}
                onChange={handleMinistrySelect}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm appearance-none"
              >
                <option value="">-- Choisir un ministère --</option>
                {MINISTRIES.map(m => (
                  <option key={m.fr} value={m.fr}>{m.fr}</option>
                ))}
              </select>
              {selectedMinistry === 'Autre Ministère (Saisie manuelle)' && (
                <input 
                  type="text"
                  value={formData.officialNameFr}
                  onChange={handleOfficialNameFrChange}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm mt-2"
                  placeholder="Saisissez le nom du ministère..."
                />
              )}
            </>
          ) : (
            // Mode CRÉATION avec BANK/CUSTOMS OU Mode MODIFICATION : Champ texte libre
            <input 
              type="text"
              value={formData.officialNameFr}
              onChange={handleOfficialNameFrChange}
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm"
              placeholder={
                formData.type === StructureType.BANK 
                  ? "Ex: Banque Centrale de Tunisie" 
                  : formData.type === StructureType.CUSTOMS
                  ? "Ex: Direction Générale des Douanes"
                  : "Ex: Nom de la structure..."
              }
            />
          )}
        </div>

        {/* Nom officiel en arabe - Toujours un champ texte */}
        <div className="space-y-1.5 text-right">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">الاسم الرسمي (بالعربية)</label>
          <input 
            type="text"
            dir="rtl"
            value={formData.officialNameAr}
            onChange={handleOfficialNameArChange}
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm text-right"
            placeholder={
              formData.type === StructureType.MINISTRY 
                ? "اسم الوزارة..." 
                : formData.type === StructureType.BANK
                ? "مثال: البنك المركزي التونسي"
                : "مثال: الديوانة التونسية"
            }
          />
        </div>

        {/* Code interne (automatique) */}
        <div className="space-y-1.5 opacity-80">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            Code Interne 
            <span className="text-[8px] border border-slate-200 px-1.5 rounded text-slate-300">
              GÉNÉRÉ AUTOMATIQUEMENT
            </span>
          </label>
          <div className="px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-400 text-sm font-mono">
            {initialData ? initialData.code : "Sera généré à l'enregistrement"}
          </div>
        </div>

        {/* Message d'aide sur l'unicité */}
        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-3">
          <p className="text-[10px] text-blue-700 font-medium">
            💡 <strong>Note :</strong> Les noms (français et arabe) doivent être uniques. 
            Un message d'erreur s'affichera si un nom est déjà utilisé.
          </p>
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{initialData ? 'Mise à jour...' : 'Enregistrement...'}</span>
              </>
            ) : (
              <>
                <Save size={18} className="group-hover:rotate-12 transition-transform" />
                <span>{initialData ? 'Mettre à jour' : 'Enregistrer la structure'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InternalStructureForm;