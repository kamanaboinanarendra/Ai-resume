import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, X, Minus, Send, Sparkles, Copy, Check, Trash2, 
  RotateCcw, ArrowRight, CornerDownLeft, Maximize2 
} from 'lucide-react';
import { useAIChat } from '../context/AIChatContext';

export default function FloatingAIChat() {
  const {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    messages,
    isThinking,
    sendMessage,
    clearChat,
    activeSection,
    currentSectionText,
    applySuggestion
  } = useAIChat();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [appliedId, setAppliedId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isThinking]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || isThinking) return;
    const text = input;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApply = (text, id) => {
    applySuggestion(text);
    setAppliedId(id);
    setTimeout(() => setAppliedId(null), 2500);
  };

  const quickPrompts = [
    { label: "Improve Summary", prompt: "Can you improve my professional summary to make it more impactful and ATS-friendly?" },
    { label: "Action Verbs", prompt: "Suggest strong action verbs and metrics for my work experience bullet points." },
    { label: "ATS Optimization", prompt: "What are best practices to make my resume ATS-friendly?" },
    { label: "Suggest Skills", prompt: "What in-demand technical skills should I include for my role?" }
  ];

  // If floating chat is closed, display floating trigger button
  if (!isOpen) {
    return (
      <aside aria-label="Floating AI Assistant" className="fixed bottom-6 right-6 z-50 no-print">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="group flex items-center gap-2.5 bg-[#D62828] hover:bg-[#A61B1B] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D62828]"
          title="Open AI Resume Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="font-medium text-sm tracking-wide">AI Assistant</span>
          {activeSection && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </aside>
    );
  }

  // If minimized, display compact bottom bar
  if (isMinimized) {
    return (
      <aside aria-label="Floating AI Assistant" className="fixed bottom-6 right-6 z-50 no-print">
        <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-lg shadow-lg px-4 py-2.5 w-72">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#D62828] animate-pulse"></div>
            <span className="text-xs font-semibold text-[#222222]">AI Assistant</span>
            {activeSection && (
              <span className="text-[10px] bg-[#FFF7F7] text-[#D62828] px-1.5 py-0.5 rounded border border-[#E5E7EB] font-medium uppercase">
                {activeSection}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 text-[#6B7280] hover:text-[#222222] hover:bg-[#FFF7F7] rounded"
              title="Expand"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FFF7F7] rounded"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Floating AI Assistant" className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] max-w-[440px] h-[580px] max-h-[85vh] bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl flex flex-col overflow-hidden no-print transition-all duration-200">
      {/* Header */}
      <div className="bg-[#D62828] text-white px-4 py-3 flex items-center justify-between shadow-sm select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">AI Resume Assistant</h3>
            <p className="text-[11px] text-white/80 leading-none mt-0.5">Powered by Google Gemini</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Section Context Banner */}
      {activeSection && (
        <div className="bg-[#FFF7F7] border-b border-[#E5E7EB] px-3.5 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#6B7280]">
            <Sparkles className="w-3.5 h-3.5 text-[#D62828]" />
            <span>Target Section: <strong className="text-[#D62828] capitalize">{activeSection}</strong></span>
          </div>
          {currentSectionText && (
            <span className="text-[10px] text-[#6B7280] italic truncate max-w-[150px]">
              {currentSectionText.slice(0, 30)}...
            </span>
          )}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF7F7] border border-[#DC2626]/20 flex items-center justify-center mb-3">
            <Trash2 className="w-6 h-6 text-[#DC2626]" />
          </div>
          <h4 className="font-semibold text-[#222222] mb-1">Clear Conversation?</h4>
          <p className="text-xs text-[#6B7280] mb-5">
            This will reset your conversation history. Active resume changes in your editor will remain safe.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-4 py-2 border border-[#E5E7EB] text-xs font-medium text-[#222222] rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                clearChat();
                setShowClearConfirm(false);
              }}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#A61B1B] text-white text-xs font-medium rounded-lg"
            >
              Yes, Clear
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Message Bubble */}
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#D62828] text-white rounded-br-sm shadow-sm'
                  : msg.isError
                  ? 'bg-red-50 text-[#DC2626] border border-red-200 rounded-bl-sm'
                  : 'bg-white text-[#222222] border border-[#E5E7EB] rounded-bl-sm shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Action Buttons for AI responses */}
              {msg.role === 'assistant' && !msg.isError && (
                <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#222222] transition-colors"
                    title="Copy text"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {/* Insert button if there is an active editor callback */}
                  <button
                    onClick={() => handleApply(msg.suggestion || msg.content, msg.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#D62828] hover:text-[#A61B1B] font-medium transition-colors ml-auto"
                    title="Insert suggestion into current resume field"
                  >
                    {appliedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Applied</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        <span>Insert into field</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <span className="text-[10px] text-[#6B7280] mt-1 px-1">
              {msg.role === 'user' ? 'You' : 'Gemini'}
            </span>
          </div>
        ))}

        {/* Loading Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-[#6B7280] max-w-[75%] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#D62828] animate-spin" />
            <span>Thinking and optimizing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 bg-white border-t border-[#E5E7EB] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(qp.prompt)}
            disabled={isThinking}
            className="whitespace-nowrap text-[11px] bg-[#FFF7F7] text-[#222222] hover:text-[#D62828] hover:border-[#D62828] border border-[#E5E7EB] rounded-full px-2.5 py-1 transition-colors flex-shrink-0"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#E5E7EB] flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for resume advice or improvements..."
          rows={1}
          className="flex-1 resize-none max-h-24 min-h-[38px] p-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828] text-[#222222]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="h-[38px] w-[38px] bg-[#D62828] hover:bg-[#A61B1B] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0 shadow-sm"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
