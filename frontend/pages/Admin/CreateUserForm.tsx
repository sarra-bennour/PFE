import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FormAlert from '../../components/FormAlert';
import { InternalStructure } from '../../types/InternalStructure';

interface CreateUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  structures?: InternalStructure[];
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSuccess, onCancel, structures = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableStructures, setAvailableStructures] = useState<InternalStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    poste: '',
    structureId: '',
    slaTraitementJours: 30
  });

  useEffect(() => {
    if (structures.length > 0) {
      setAvailableStructures(structures);
    } else {
      fetchStructures();
    }
  }, [structures]);

  const fetchStructures = async () => {
    try {
      setLoadingStructures(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/admin/structures', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAvailableStructures(response.data.structures);
      }
    } catch (err) {
      console.error('Erreur chargement structures:', err);
      setError('Impossible de charger la liste des structures');
    } finally {
      setLoadingStructures(false);
    }
  };

  const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
  };

  // 🔥 Nouvelle fonction pour déterminer l'endpoint selon le type de structure
  const getEndpointByStructureType = (type: string): string => {
    switch (type) {
      case 'MINISTRY':
        return 'http://localhost:8080/api/admin/instance-validation/create';
      case 'BANK':
        return 'http://localhost:8080/api/admin/banque/create';
      case 'CUSTOMS':
        return 'http://localhost:8080/api/admin/douane/create';
      default:
        throw new Error(`Type de structure non supporté: ${type}`);
    }
  };

  // 🔥 Nouvelle fonction pour obtenir le message de succès selon le type
  const getSuccessMessage = (type: string): string => {
    switch (type) {
      case 'MINISTRY':
        return 'Instance de validation créée avec succès ! Un email avec les identifiants a été envoyé.';
      case 'BANK':
        return 'Utilisateur banque créé avec succès ! Un email avec les identifiants a été envoyé.';
      case 'CUSTOMS':
        return 'Utilisateur douane créé avec succès ! Un email avec les identifiants a été envoyé.';
      default:
        return 'Utilisateur créé avec succès ! Un email avec les identifiants a été envoyé.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = getAuthToken();
      
      if (!token) {
        setError("Vous n'êtes pas authentifié. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      const selectedStructure = availableStructures.find(s => s.id === Number(formData.structureId));
      
      if (!selectedStructure) {
        setError("Veuillez sélectionner une structure valide");
        setLoading(false);
        return;
      }

      // 🔥 Construction de la requête de base (commune à tous)
      const baseRequestData = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        poste: formData.poste,
        structure: {
          id: selectedStructure.id,
          type: selectedStructure.type,
          officialName: selectedStructure.officialName,
          officialNameAr: selectedStructure.officialNameAr,
          code: selectedStructure.code
        }
      };

      // 🔥 Construction des données spécifiques selon le type
      let requestData: any;
      let endpoint: string;

      switch (selectedStructure.type) {
        case 'MINISTRY':
          endpoint = getEndpointByStructureType('MINISTRY');
          requestData = {
            ...baseRequestData,
            slaTraitementJours: formData.slaTraitementJours
          };
          break;
        
        case 'BANK':
          endpoint = getEndpointByStructureType('BANK');
          requestData = baseRequestData;
          break;
        
        case 'CUSTOMS':
          endpoint = getEndpointByStructureType('CUSTOMS');
          requestData = baseRequestData;
          break;
        
        default:
          setError(`Type de structure non supporté: ${selectedStructure.type}`);
          setLoading(false);
          return;
      }

      console.log(`📡 Envoi vers: ${endpoint}`);
      console.log('📦 Données:', requestData);

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSuccess(getSuccessMessage(selectedStructure.type));
        
        // Réinitialiser le formulaire
        setFormData({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          poste: '',
          structureId: '',
          slaTraitementJours: 30
        });
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
      } else {
        setError(response.data.error || "Erreur lors de la création de l'utilisateur");
      }
    } catch (err: any) {
      console.error('Erreur API:', err);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Fonction centralisée pour la gestion des erreurs
  const handleApiError = (err: any) => {
    if (err.response) {
      const errorMessage = err.response.data?.error || err.response.data?.message || "Erreur serveur";
      const errorCode = err.response.data?.errorCode;
      
      // Messages d'erreur communs
      if (errorCode === 'INSTANCE_VALIDATION.EMAIL_EXISTS' || errorMessage.includes('existe déjà')) {
        setError("Cet email est déjà utilisé par un autre utilisateur.");
      } else if (errorCode === 'INSTANCE_VALIDATION.MISSING_FIELD') {
        setError("Tous les champs obligatoires doivent être remplis.");
      } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_EMAIL') {
        setError("Format d'email invalide.");
      } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_PHONE') {
        setError("Format de téléphone invalide. Utilisez le format international (+216XXXXXXXX).");
      } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_SLA') {
        setError("Le SLA doit être compris entre 1 et 60 jours.");
      } else {
        setError(errorMessage);
      }
    } else if (err.request) {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } else {
      setError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '' || /^\+?[0-9\s]*$/.test(value)) {
      setFormData({...formData, telephone: value});
    }
  };

  const closeError = () => setError(null);
  const closeSuccess = () => setSuccess(null);

  const getStructureTypeName = (type: string): string => {
    switch (type) {
      case 'MINISTRY': return 'Ministère';
      case 'BANK': return 'Banque';
      case 'CUSTOMS': return 'Douane';
      default: return type;
    }
  };

  // 🔥 Vérifier si le SLA doit être affiché (uniquement pour MINISTRY)
  const selectedStructureType = availableStructures.find(s => s.id === Number(formData.structureId))?.type;
  const showSlaField = selectedStructureType === 'MINISTRY';

  // 🔥 Obtenir le type de compte qui va être créé
  const getAccountTypeLabel = (): string => {
    switch (selectedStructureType) {
      case 'MINISTRY': return 'Instance de validation';
      case 'BANK': return 'Compte Banque';
      case 'CUSTOMS': return 'Compte Douane';
      default: return 'compte';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-scale">
      {error && <FormAlert message={error} type="error" onClose={closeError} />}
      {success && <FormAlert message={success} type="success" onClose={closeSuccess} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
          <input 
            required
            type="text"
            value={formData.prenom}
            onChange={(e) => setFormData({...formData, prenom: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
            placeholder="Ex: Ahmed"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
          <input 
            required
            type="text"
            value={formData.nom}
            onChange={(e) => setFormData({...formData, nom: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
            placeholder="Ex: Ben Ali"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Professionnel</label>
        <input 
          required
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          placeholder="ahmed.benali@ministere.tn"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Poste / Fonction</label>
        <input 
          required
          type="text"
          value={formData.poste}
          onChange={(e) => setFormData({...formData, poste: e.target.value})}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          placeholder="Ex: Chef de service"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
        <input 
          required
          type="tel"
          value={formData.telephone}
          onChange={handlePhoneChange}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          placeholder="+216 12 345 678"
        />
        <p className="text-[9px] text-slate-400 ml-1">Format: +216XXXXXXXX</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Structure d'affectation <span className="text-red-500">*</span>
        </label>
        {loadingStructures ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tunisia-red"></div>
            <span className="ml-2 text-xs text-slate-400">Chargement des structures...</span>
          </div>
        ) : (
          <select 
            required
            value={formData.structureId}
            onChange={(e) => setFormData({...formData, structureId: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm appearance-none"
          >
            <option value="">Sélectionnez une structure</option>
            {availableStructures.map(structure => (
              <option key={structure.id} value={structure.id}>
                {getStructureTypeName(structure.type)} - {structure.officialName} ({structure.code})
              </option>
            ))}
          </select>
        )}
        <p className="text-[9px] text-slate-400 ml-1">
          La structure détermine le type de compte : {selectedStructureType === 'MINISTRY' ? 'Instance de validation' : selectedStructureType === 'BANK' ? 'Compte Banque' : selectedStructureType === 'CUSTOMS' ? 'Compte Douane' : 'Sélectionnez une structure'}
        </p>
      </div>

      {/* 🔥 SLA - Affiché uniquement pour les MINISTRY */}
      {showSlaField && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SLA Traitement (Jours)</label>
          <input 
            required
            type="number"
            min="1"
            max="60"
            value={formData.slaTraitementJours}
            onChange={(e) => setFormData({...formData, slaTraitementJours: parseInt(e.target.value) || 30})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          />
          <p className="text-[9px] text-slate-400 ml-1">Nombre maximum de jours pour traiter un dossier</p>
        </div>
      )}

      {/* Aperçu des informations */}
      {formData.structureId && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Aperçu des informations</p>
          <div className="space-y-1 text-sm">
            {(() => {
              const selected = availableStructures.find(s => s.id === Number(formData.structureId));
              if (selected) {
                return (
                  <>
                    <p><span className="font-bold text-slate-600">Compte à créer:</span> <span className="text-slate-500">{getAccountTypeLabel()}</span></p>
                    <p><span className="font-bold text-slate-600">Nom Officiel (FR):</span> <span className="text-slate-500">{selected.officialName}</span></p>
                    <p><span className="font-bold text-slate-600">Code:</span> <span className="text-slate-500 font-mono">{selected.code}</span></p>
                    <p><span className="font-bold text-slate-600">Type:</span> <span className="text-slate-500">{getStructureTypeName(selected.type)}</span></p>
                  </>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {/* Message d'information dynamique */}
      <div className={`rounded-2xl p-4 border ${selectedStructureType === 'MINISTRY' ? 'bg-blue-50 border-blue-200' : selectedStructureType === 'BANK' ? 'bg-green-50 border-green-200' : selectedStructureType === 'CUSTOMS' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
        <p className="text-xs font-medium" style={{
          color: selectedStructureType === 'MINISTRY' ? '#1e40af' : selectedStructureType === 'BANK' ? '#166534' : selectedStructureType === 'CUSTOMS' ? '#6b21a5' : '#4b5563'
        }}>
          💡 <strong>Information :</strong> Un email avec les identifiants de connexion (email et mot de passe généré) 
          sera envoyé automatiquement à l'adresse indiquée. Le compte créé sera de type <strong>{getAccountTypeLabel()}</strong>.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          type="submit"
          disabled={loading || loadingStructures}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <i className="fas fa-circle-notch animate-spin mr-2"></i>
              Création en cours...
            </>
          ) : (
            `Créer ${getAccountTypeLabel()}`
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
  );
};

export default CreateUserForm;