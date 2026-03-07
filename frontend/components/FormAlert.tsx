import React from 'react';

interface FormAlertProps {
  message: string;
  type: 'success' | 'error';
  onClose?: () => void;
}

const FormAlert: React.FC<FormAlertProps> = ({ message, type, onClose }) => {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div className={`w-full px-5 py-4 rounded-2xl border-2 animate-fade-in-scale mb-6 relative group ${
      isError 
        ? 'bg-red-50/50 border-tunisia-red/20 text-tunisia-red' 
        : 'bg-emerald-50/50 border-emerald-500/20 text-emerald-600'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-bold leading-relaxed">
          {message}
        </p>

        {onClose && (
          <button 
            onClick={onClose}
            className="shrink-0 w-6 h-6 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all opacity-40 hover:opacity-100"
          >
            <i className="fas fa-times text-[10px]"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default FormAlert;