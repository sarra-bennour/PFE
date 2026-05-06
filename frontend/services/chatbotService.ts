export interface ChatbotMessage {
  message: string;
  context: 'importer' | 'exporter';
  userId?: number | string;
  sessionId?: string;
  userEmail?: string;
  userRole?: string;
}

export interface ChatbotResponse {
  reply: string;
  suggestions: string[];
  references: ChatbotReference[];
  sessionId?: string;
}

export interface ChatbotReference {
  title: string;
  url: string;
  type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const chatbotService = {
  sendMessage: async (
    message: string, 
    context: 'importer' | 'exporter',
    userId?: number | string
  ): Promise<ChatbotResponse> => {
    // Récupérer le token d'authentification depuis localStorage
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        message,
        context,
        userId: userId,
        sessionId: localStorage.getItem('chatSessionId') || generateSessionId()
      }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Non authentifié pour le chatbot');
      }
      throw new Error(`Failed to send message: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Stocker le sessionId
    if (data.sessionId) {
      localStorage.setItem('chatSessionId', data.sessionId);
    }
    
    return data;
  },
  
  getSuggestions: async (context: 'importer' | 'exporter'): Promise<string[]> => {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/chatbot/suggestions/${context}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      console.warn('Erreur chargement suggestions, utilisation des valeurs par défaut');
      return [];
    }
    
    return response.json();
  }
};

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}