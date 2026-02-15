
import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{t('app_title')}</h3>
            <p className="text-gray-400 text-sm">
              Portail unifié pour la gouvernance du commerce extérieur tunisien.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>Ministère du Commerce</li>
              <li>Avenue Kheireddine Pacha, Tunis</li>
              <li>Tél: +216 71 000 000</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Liens Utiles</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>Douane Tunisienne</li>
              <li>Portail de l'Investissement</li>
              <li>Actualités Économiques</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-xs">
          {t('footer_text')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
