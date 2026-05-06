// SupportChatbot.tsx - Version mise à jour
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, CircleCheck, Info, ArrowUpRight } from 'lucide-react';
import { chatbotService, ChatbotResponse } from '../services/chatbotService';
import { useAuth } from '../hooks/useAuth';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
  references?: ChatbotResponse['references'];
}

interface SupportChatbotProps {
  context: 'importer' | 'exporter';
}

const SupportChatbot: React.FC<SupportChatbotProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Bonjour ! Comment puis-je vous aider aujourd'hui avec vos procédures d'import/export en Tunisie ?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Récupérer l'utilisateur authentifié depuis useAuth
  const { user, isAuthenticated } = useAuth();

  // Suggestions par défaut basées sur le contexte
  const defaultSuggestions = context === 'exporter' 
    ? ["Statut agrément", "Dossier KYC", "Déclaration produit"]
    : ["Calcul taxes", "Procédures import", "Ports"];

  const suggestions = dynamicSuggestions.length > 0 ? dynamicSuggestions : defaultSuggestions;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Charger les suggestions personnalisées du backend
      loadSuggestions();
    }
  }, [messages, isOpen, isLoading]);

  const loadSuggestions = async () => {
    try {
      const backendSuggestions = await chatbotService.getSuggestions(context);
      if (backendSuggestions && backendSuggestions.length > 0) {
        setDynamicSuggestions(backendSuggestions.slice(0, 4)); // Garder seulement 4 suggestions
      }
    } catch (error) {
      console.error('Erreur chargement suggestions:', error);
      // Garder les suggestions par défaut
    }
  };

  const handleSend = async (text: string = input) => {
    const messageText = text.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Utiliser le service chatbot avec l'utilisateur authentifié
      const response = await chatbotService.sendMessage(
        messageText, 
        context,
        user?.id // Passer l'ID utilisateur si connecté
      );
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply || "Désolé, je n'ai pas pu générer de réponse.",
        sender: 'ai',
        timestamp: new Date(),
        references: response.references
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Mettre à jour les suggestions si fournies par le backend
      if (response.suggestions && response.suggestions.length > 0) {
        setDynamicSuggestions(response.suggestions);
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, une erreur technique s'est produite. Veuillez réessayer plus tard.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTextWithReferences = (text: string, references?: ChatbotResponse['references']) => {
    // Format simple, peut être enrichi
    return { __html: text.replace(/\n/g, '<br/>') };
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, originX: 1, originY: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[380px] max-w-[calc(100vw-3rem)] h-[550px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header avec information utilisateur */}
            <div className="p-5 bg-slate-900 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-24 h-24 bg-tunisia-red opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                      <Bot size={20} className="text-tunisia-red" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-widest italic">Assistant IA</h4>
                      <CircleCheck size={10} className="text-blue-400" />
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                      République Tunisienne
                    </p>
                    {user && (
                      <p className="text-[7px] text-slate-500 mt-0.5">
                        {user.nom} {user.prenom}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide bg-slate-50/20">
              {messages.map((m) => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={m.id} 
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%]`}>
                    <div className={`p-3.5 rounded-[1.25rem] text-[11px] font-normal leading-relaxed shadow-sm ${
                      m.sender === 'user' 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      <div dangerouslySetInnerHTML={formatTextWithReferences(m.text, m.references)} />
                      
                      {/* Afficher les références si disponibles */}
                      {m.references && m.references.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-[9px]">
                          <p className="font-semibold text-gray-500 mb-1">📎 Références:</p>
                          {m.references.map((ref, idx) => (
                            <a
                              key={idx}
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:underline"
                            >
                              • {ref.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-[1.25rem] rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions rapides */}
            {!isLoading && suggestions.length > 0 && (
              <div className="px-5 py-2 overflow-x-auto scrollbar-hide flex gap-1.5 whitespace-nowrap bg-slate-50/20 border-t border-slate-100">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-medium text-slate-600 hover:border-tunisia-red hover:text-tunisia-red transition-all shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-5 bg-white border-t border-slate-100 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Posez votre question sur l'import/export tunisien..."
                  className="w-full pl-5 pr-12 py-3 bg-slate-50 rounded-xl border-none outline-none text-[11px] text-slate-700 placeholder:text-slate-300 focus:bg-white transition-all shadow-inner"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    input.trim() && !isLoading ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="text-[8px] text-slate-400 mt-2 text-center">
                Assistant spécialisé en réglementation tunisienne 🇹🇳
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton flottant */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center group relative overflow-hidden ring-4 ring-white shrink-0"
      >
        <div className="absolute inset-0 bg-tunisia-red translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={20} className="relative z-10" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="flex items-center justify-center"
            >
              <MessageSquare size={20} className="relative z-10" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-tunisia-red border-2 border-slate-900 rounded-full"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default SupportChatbot;