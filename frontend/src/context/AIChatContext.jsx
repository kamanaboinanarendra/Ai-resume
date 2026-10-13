import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const AIChatContext = createContext(null);

export const AIChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your AI Resume Assistant. I can help you craft ATS-friendly summaries, elevate project bullet points, suggest keywords, or critique your resume. How can I help you today?",
      created_at: new Date().toISOString()
    }
  ]);
  const [conversationId, setConversationId] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);

  // Context awareness properties
  const [activeSection, setActiveSection] = useState(null); // e.g. "summary", "experience", "skills", "projects"
  const [currentSectionText, setCurrentSectionText] = useState("");
  const [resumeContext, setResumeContext] = useState(null);
  
  // Callback registered by ResumeBuilder to accept AI suggestions directly into fields
  const [applySuggestionCallback, setApplySuggestionCallback] = useState(null);

  // Load user conversation from server on login
  useEffect(() => {
    if (!user) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I am your AI Resume Assistant. I can help you craft ATS-friendly summaries, elevate project bullet points, suggest keywords, or critique your resume. How can I help you today?",
          created_at: new Date().toISOString()
        }
      ]);
      setConversationId(null);
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await api.get('/ai/conversations/active');
        if (res.data && res.data.messages && res.data.messages.length > 0) {
          setConversationId(res.data.conversation_id);
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.warn('Could not restore chat history:', err);
      }
    };
    fetchHistory();
  }, [user]);

  const sendMessage = async (userText) => {
    if (!userText || !userText.trim()) return;
    setError(null);

    const tempUserMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: userText.trim(),
      section_context: activeSection,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsThinking(true);

    try {
      const res = await api.post('/ai/chat', {
        message: userText.trim(),
        conversation_id: conversationId,
        section_context: activeSection,
        current_text: currentSectionText,
        resume_context: resumeContext
      });

      const { reply, conversation_id: newConvId, suggestion } = res.data;
      if (newConvId) setConversationId(newConvId);

      const assistantMsg = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: reply,
        suggestion: suggestion,
        section_context: activeSection,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Network connection to AI service failed. Please try again.";
      setError(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          isError: true,
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const clearChat = async () => {
    try {
      await api.delete('/ai/conversations/clear');
    } catch (e) {
      console.warn('Failed clearing backend chat:', e);
    }
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: "Conversation history cleared. What would you like to work on next?",
        created_at: new Date().toISOString()
      }
    ]);
    setConversationId(null);
    setError(null);
  };

  const registerApplyCallback = useCallback((callback) => {
    setApplySuggestionCallback(() => callback);
  }, []);

  const applySuggestion = (suggestionText, targetSection) => {
    if (applySuggestionCallback) {
      applySuggestionCallback(suggestionText, targetSection || activeSection);
    }
  };

  return (
    <AIChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isMinimized,
        setIsMinimized,
        messages,
        isThinking,
        error,
        sendMessage,
        clearChat,
        activeSection,
        setActiveSection,
        currentSectionText,
        setCurrentSectionText,
        resumeContext,
        setResumeContext,
        registerApplyCallback,
        applySuggestion
      }}
    >
      {children}
    </AIChatContext.Provider>
  );
};

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
};
