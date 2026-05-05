import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

// Interface pour les événements d'arrivée
interface ArrivalEvent {
  id: string;
  product: string;
  exporter: string;
  date: Date;
  status: 'TRANSIT' | 'ARRIVED' | 'DELAYED';
}

// Interface pour la demande (à adapter selon votre API)
interface Declaration {
  id: string;
  demandeId: number;
  product: string;
  exporter: string;
  arrivalDate: string;
  status: string;
}

const ArrivalCalendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [arrivalEvents, setArrivalEvents] = useState<ArrivalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les demandes de l'importateur connecté
  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/importateur/mes-demandes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const demandes = response.data.demandes;
        
        // Transformer les demandes en événements d'arrivée
        const events: ArrivalEvent[] = demandes
          .filter((demande: any) => demande.arrivalDate) // Garder seulement celles avec date d'arrivée
          .map((demande: any) => {
            // Déterminer le statut en fonction du statut de la demande
            let eventStatus: 'TRANSIT' | 'ARRIVED' | 'DELAYED' = 'TRANSIT';
            
            switch (demande.status) {
              case 'VALIDEE':
                eventStatus = 'ARRIVED';
                break;
              case 'SUSPENDUE':
              case 'REJETEE':
                eventStatus = 'DELAYED';
                break;
              default:
                eventStatus = 'TRANSIT';
            }
            
            return {
              id: demande.reference || demande.id.toString(),
              product: demande.productName || 'Produit inconnu',
              exporter: demande.exportateurName || 'Exportateur inconnu',
              date: new Date(demande.arrivalDate),
              status: eventStatus
            };
          });
        
        setArrivalEvents(events);
        setError(null);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des arrivages:', err);
      setError('Impossible de charger les calendriers d\'arrivage');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les événements pour le mois actuel
  const getEventsForMonth = () => {
    return arrivalEvents.filter(event => isSameMonth(event.date, currentMonth));
  };

  const renderHeader = (isSmall: boolean) => {
    return (
      <div className={`flex items-center justify-between transition-all duration-500 ${isSmall ? 'px-4 py-2 rounded-t-[1.25rem]' : 'px-6 py-4 rounded-t-[2.5rem]'} bg-slate-900`}>
        <div className="flex flex-col">
          <span className={`${isSmall ? 'text-[7px]' : 'text-[9px]'} font-black uppercase tracking-widest text-slate-400`}>
            Arrivages ({getEventsForMonth().length})
          </span>
          <h2 className={`${isSmall ? 'text-base' : 'text-xl'} font-black italic text-white uppercase tracking-tighter`}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className={`${isSmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all`}
          >
            <i className="fas fa-chevron-left text-[10px]"></i>
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={`${isSmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all`}
          >
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>
    );
  };

  const renderDays = (isSmall: boolean) => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return (
      <div className="grid grid-cols-7 bg-slate-50 border-x border-slate-100">
        {days.map((day, i) => (
          <div key={i} className={`${isSmall ? 'py-1 text-[7px]' : 'py-2.5 text-[8px]'} text-center font-black uppercase tracking-widest text-slate-400`}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = (isSmall: boolean) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    return (
      <div className={`grid grid-cols-7 border-l border-slate-100 ${isSmall ? 'rounded-b-[1.25rem]' : 'rounded-b-[2.5rem]'} overflow-hidden bg-white shadow-sm`}>
        {calendarDays.map((day, i) => {
          const dayEvents = arrivalEvents.filter(event => isSameDay(event.date, day));
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <div
              key={i}
              className={`${isSmall ? 'min-h-[50px] p-1.5' : 'min-h-[100px] p-2.5'} border-r border-b border-slate-100 transition-all hover:bg-slate-50 relative cursor-pointer ${
                !isCurrentMonth ? 'bg-slate-50/50' : ''
              } ${isSelected ? 'bg-tunisia-red/5' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className={`${isSmall ? 'text-[8px]' : 'text-[10px]'} font-black italic tracking-tighter ${
                  isSameDay(day, new Date()) 
                    ? 'w-5 h-5 flex items-center justify-center bg-tunisia-red text-white rounded-full' 
                    : isCurrentMonth ? 'text-slate-900' : 'text-slate-300'
                }`}>
                  {format(day, 'd')}
                </span>
                {isSmall && dayEvents.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-tunisia-red"></div>
                )}
              </div>
              
              {!isSmall && (
                <div className="space-y-0.5 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map(event => (
                    <div 
                      key={event.id}
                      className={`px-1.5 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-tight truncate border ${
                        event.status === 'ARRIVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        event.status === 'DELAYED' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                      title={`${event.product} - ${event.exporter}`}
                    >
                      {event.product}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[6px] font-black text-slate-400 pl-1">+{dayEvents.length - 2} plus</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-tunisia-red mb-3"></i>
          <p className="text-slate-400 text-xs">Chargement du calendrier...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-100">
        <i className="fas fa-calendar-xmark text-3xl text-red-400 mb-3"></i>
        <p className="text-red-600 text-sm font-medium">{error}</p>
        <button 
          onClick={fetchDemandes}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in group w-full max-w-6xl mx-auto px-2">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Calendar Side */}
        <motion.div 
          layout
          initial={false}
          animate={{ 
            width: selectedDate ? "35%" : "100%",
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="shrink-0"
        >
          <div className={`border border-slate-100 overflow-hidden shadow-xl transition-all duration-500 ${selectedDate ? 'rounded-[1.25rem]' : 'rounded-[2.5rem]'}`}>
            {renderHeader(!!selectedDate)}
            {renderDays(!!selectedDate)}
            {renderCells(!!selectedDate)}
          </div>
          {selectedDate && (
             <button 
               onClick={() => setSelectedDate(null)}
               className="mt-3 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
             >
               <i className="fas fa-expand-alt text-[8px]"></i> calendrier complet
             </button>
          )}
        </motion.div>

        {/* Details Side */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex-1 w-full"
            >
              <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 min-h-[400px]">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date sélectionnée</span>
                    <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">
                      {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>

                <div className="space-y-3">
                  {arrivalEvents.filter(e => isSameDay(e.date, selectedDate)).length > 0 ? (
                    arrivalEvents.filter(e => isSameDay(e.date, selectedDate)).map(event => (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={event.id} 
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:border-slate-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shadow-md ${
                            event.status === 'ARRIVED' ? 'bg-emerald-500 text-white' :
                            event.status === 'DELAYED' ? 'bg-red-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            <i className={`fas ${event.status === 'ARRIVED' ? 'fa-check-circle' : event.status === 'DELAYED' ? 'fa-clock' : 'fa-truck'}`}></i>
                          </div>
                          <div>
                            <h4 className="font-black uppercase italic tracking-tighter text-base text-slate-900">{event.product}</h4>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{event.exporter}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            event.status === 'ARRIVED' ? 'bg-emerald-50 text-emerald-600' :
                            event.status === 'DELAYED' ? 'bg-red-50 text-red-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {event.status === 'ARRIVED' ? 'Arrivé' : event.status === 'DELAYED' ? 'Retard' : 'En transit'}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-16 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                      <i className="fas fa-calendar-xmark text-slate-200 text-3xl mb-4"></i>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Aucun produit attendu ce jour</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative">
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Information</p>
                    <p className="text-[11px] font-medium text-slate-300 leading-snug">
                      Actualisation temps réel. Contactez le service logistique pour toute modification de planning.
                    </p>
                  </div>
                  <i className="fas fa-anchor absolute -bottom-3 -right-3 text-5xl text-white/5 -rotate-12"></i>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArrivalCalendar;