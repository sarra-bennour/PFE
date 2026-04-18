import React, { useState } from 'react';
import axios from 'axios';
import FormAlert from '../../components/FormAlert';
import { CreateUserFormProps } from '../../types/CreateUserFormProps';

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ministry: '',
    nomOfficiel: '',
    codeMinistere: '',
    typeAutorite: 'MINISTERE',
    slaTraitementJours: 5
  });

  const authorityTypes = [
    { value: 'MINISTERE', label: 'Ministère' },
    { value: 'AGENCE_NATIONALE', label: 'Agence Nationale' },
    { value: 'DIRECTION_GENERALE', label: 'Direction Générale' },
    { value: 'AUTRE_ORGANISME_PUBLIC', label: 'Autre Organisme Public' }
  ];

  const ministries = [
    "Ministère du Commerce",
    "Ministère de l'Industrie",
    "Ministère de l'Agriculture",
    "Ministère de la Santé",
    "Ministère des Finances",
    "Douanes Tunisiennes"
  ];

  // Récupérer le token d'authentification
  const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
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

      // Construction de la requête selon le format attendu par le backend
      const requestData = {
        nom: formData.lastName,
        prenom: formData.firstName,
        email: formData.email,
        telephone: formData.phone,
        nomOfficiel: formData.nomOfficiel,
        codeMinistere: formData.codeMinistere.toUpperCase(),
        typeAutorite: formData.typeAutorite,
        slaTraitementJours: formData.slaTraitementJours
      };

      const response = await axios.post(
        'http://localhost:8080/api/admin/instance-validation/create',
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess("Instance de validation créée avec succès ! Un email avec les identifiants a été envoyé.");
        
        // Réinitialiser le formulaire
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          ministry: '',
          nomOfficiel: '',
          codeMinistere: '',
          typeAutorite: 'MINISTERE',
          slaTraitementJours: 5
        });
        
        // Appeler le callback onSuccess après 2 secondes
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
      
      // Gestion des erreurs
      if (err.response) {
        // Erreur retournée par le serveur
        const errorMessage = err.response.data?.error || err.response.data?.message || "Erreur serveur";
        const errorCode = err.response.data?.errorCode;
        
        if (errorCode === 'INSTANCE_VALIDATION.EMAIL_EXISTS') {
          setError("Cet email est déjà utilisé par un autre utilisateur.");
        } else if (errorCode === 'INSTANCE_VALIDATION.CODE_MINISTERE_EXISTS') {
          setError("Ce code ministère est déjà utilisé.");
        } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_EMAIL') {
          setError("Format d'email invalide.");
        } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_PHONE') {
          setError("Format de téléphone invalide. Utilisez le format international (+216XXXXXXXX).");
        } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_CODE_MINISTERE') {
          setError("Format de code ministère invalide. Utilisez 3-20 caractères, majuscules et underscores.");
        } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_SLA') {
          setError("Le SLA doit être compris entre 1 et 60 jours.");
        } else if (errorCode === 'INSTANCE_VALIDATION.INVALID_TYPE') {
          setError("Type d'autorité invalide.");
        } else if (errorCode === 'INSTANCE_VALIDATION.MISSING_FIELD') {
          setError("Tous les champs obligatoires doivent être remplis.");
        } else {
          setError(errorMessage);
        }
      } else if (err.request) {
        // Pas de réponse du serveur
        setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
      } else {
        // Autre erreur
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Validation du code ministère en temps réel (majuscules et underscores)
  const handleCodeMinistereChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    // Supprimer les caractères non autorisés
    value = value.replace(/[^A-Z_]/g, '');
    setFormData({...formData, codeMinistere: value});
  };

  // Validation du téléphone en temps réel
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Permettre seulement + et les chiffres
    if (value === '' || /^\+?[0-9]*$/.test(value)) {
      setFormData({...formData, phone: value});
    }
  };

  // Fermer les alertes
  const closeError = () => setError(null);
  const closeSuccess = () => setSuccess(null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-scale">
      {/* Affichage des erreurs avec FormAlert */}
      {error && (
        <FormAlert 
          message={error} 
          type="error" 
          onClose={closeError}
        />
      )}

      {/* Affichage des succès avec FormAlert */}
      {success && (
        <FormAlert 
          message={success} 
          type="success" 
          onClose={closeSuccess}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
          <input 
            required
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
            placeholder="Ex: Ahmed"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
          <input 
            required
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
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
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
        <input 
          required
          type="tel"
          value={formData.phone}
          onChange={handlePhoneChange}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          placeholder="+216 12 345 678"
        />
        <p className="text-[9px] text-slate-400 ml-1">Format: +216XXXXXXXX</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ministère / Institution</label>
        <select 
          required
          value={formData.ministry}
          onChange={(e) => setFormData({...formData, ministry: e.target.value})}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm appearance-none"
        >
          <option value="">Sélectionnez un ministère</option>
          {ministries.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Officiel</label>
          <input 
            required
            type="text"
            value={formData.nomOfficiel}
            onChange={(e) => setFormData({...formData, nomOfficiel: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
            placeholder="Ex: Direction Générale des Douanes"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code Ministère</label>
          <input 
            required
            type="text"
            value={formData.codeMinistere}
            onChange={handleCodeMinistereChange}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm uppercase"
            placeholder="Ex: MIN_FIN_01"
          />
          <p className="text-[9px] text-slate-400 ml-1">Majuscules et underscores uniquement (3-20 caractères)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'Autorité</label>
          <select 
            required
            value={formData.typeAutorite}
            onChange={(e) => setFormData({...formData, typeAutorite: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm appearance-none"
          >
            {authorityTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SLA Traitement (Jours)</label>
          <input 
            required
            type="number"
            min="1"
            max="60"
            value={formData.slaTraitementJours}
            onChange={(e) => setFormData({...formData, slaTraitementJours: parseInt(e.target.value) || 0})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          />
          <p className="text-[9px] text-slate-400 ml-1">Nombre maximum de jours pour traiter un dossier</p>
        </div>
      </div>

      {/* Message d'information */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs text-blue-800 font-medium">
          💡 <strong>Information :</strong> Un email avec les identifiants de connexion (email et mot de passe généré) 
          sera envoyé automatiquement à l'adresse indiquée.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <i className="fas fa-circle-notch animate-spin mr-2"></i>
              Création en cours...
            </>
          ) : (
            "Créer l'utilisateur"
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