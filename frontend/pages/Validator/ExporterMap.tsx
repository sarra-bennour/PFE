import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import axios from 'axios';

interface CountryData {
  name: string;
  count: number;
  latitude: number;
  longitude: number;
  density: 'elevée' | 'moyenne' | 'faible';
  flagCode: string;
}

interface GlobalStats {
  totalExportateurs: number;
  totalPays: number;
  croissanceMensuelle: number;
  tendance: string;
}

const getDensityColor = (density: string) => {
  switch (density) {
    case 'elevée': return '#ef4444';
    case 'moyenne': return '#f59e0b';
    case 'faible': return '#10b981';
    default: return '#64748b';
  }
};

const getDensityLabel = (density: string) => {
  switch (density) {
    case 'elevée': return 'Élevée';
    case 'moyenne': return 'Moyenne';
    case 'faible': return 'Faible';
    default: return 'Inconnu';
  }
};

const ExporterMap: React.FC<{ height?: string }> = ({ height = "h-[600px]" }) => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Veuillez vous connecter pour voir les statistiques');
        setLoading(false);
        return;
      }
      const response = await axios.get('/api/statistics/exporters/map', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        setCountries(data.countries);
        setGlobalStats(data.globalStats);
      } else {
        setError('Erreur de chargement');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`relative ${height} w-full rounded-[3rem] overflow-hidden bg-slate-100 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tunisia-red mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${height} w-full rounded-[3rem] overflow-hidden bg-red-50 flex items-center justify-center`}>
        <div className="text-center p-6">
          <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={fetchStatistics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const totalExportateurs = globalStats?.totalExportateurs || 0;
  const croissance = globalStats?.croissanceMensuelle || 0;

  return (
    <div className={`relative ${height} w-full rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl group`}>
      {/* Overlay Card inside Map */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl border border-white/50 w-56 pointer-events-auto transform transition-transform group-hover:scale-105">
          <h4 className="text-base font-black italic text-slate-900 uppercase tracking-tighter mb-3">Vue d'ensemble</h4>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total Pays</p>
              <p className="text-lg font-black italic tracking-tighter text-slate-900">{countries.length}</p>
            </div>
            <div className="p-3 bg-tunisia-red/5 rounded-xl border border-tunisia-red/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-tunisia-red/60 mb-0.5">Total Exportateurs</p>
              <p className="text-lg font-black italic tracking-tighter text-tunisia-red">{totalExportateurs.toLocaleString()}</p>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-xl border ${croissance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <i className={`fas ${croissance >= 0 ? 'fa-arrow-trend-up text-emerald-500' : 'fa-arrow-trend-down text-red-500'} text-[10px]`}></i>
              <p className={`text-[9px] font-bold uppercase tracking-tight ${croissance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {croissance >= 0 ? '+' : ''}{croissance}% ce mois-ci
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-4 rounded-[1.5rem] shadow-2xl border border-white/10 pointer-events-auto">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Densité</p>
        <div className="space-y-2">
          {[
            { color: 'bg-red-500', label: 'Élevée', id: 'elevée' },
            { color: 'bg-amber-500', label: 'Moyenne', id: 'moyenne' },
            { color: 'bg-emerald-500', label: 'Faible', id: 'faible' },
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.color} shadow-sm`}></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <MapContainer 
        center={[34.0, 9.0] as any} 
        zoom={4} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {countries.map((country, idx) => (
          <CircleMarker
            key={idx}
            center={[country.latitude, country.longitude]}
            pathOptions={{
              fillColor: getDensityColor(country.density),
              color: getDensityColor(country.density),
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.4
            }}
            radius={Math.min(10 + (country.count / 15), 40)}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="p-2 font-sans min-w-[140px]">
                <div className="flex items-center gap-2 mb-2">
                  {country.flagCode && (
                    <img 
                      src={`https://flagcdn.com/w20/${country.flagCode}.png`}
                      alt={country.name}
                      className="w-5 h-3 object-cover rounded-sm"
                    />
                  )}
                  <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-base mb-1">{country.name}</h4>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    Exportateurs: <span className="text-slate-900">{country.count.toLocaleString()}</span>
                  </p>
                  <p className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md inline-block ${
                    country.density === 'elevée' ? 'bg-red-50 text-red-600' :
                    country.density === 'moyenne' ? 'bg-amber-50 text-amber-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {getDensityLabel(country.density)}
                  </p>
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ExporterMap;