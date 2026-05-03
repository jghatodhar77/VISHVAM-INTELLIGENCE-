/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Send, 
  Settings, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  User,
  Bot,
  MoreVertical,
  Cpu,
  Github,
  Lock,
  Shield,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ChatSession } from './types';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('vishwam_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('vishwam_current_session');
    return saved || null;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (lockoutTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockoutTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          setLockoutTime(null);
          setAttempts(0);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTime]);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === '0405') {
        setTimeout(() => {
          setIsLocked(false);
          setAttempts(0);
          setPin('');
        }, 300);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setIsShaking(true);
        setPin('');
        
        setTimeout(() => setIsShaking(false), 500);

        if (newAttempts >= 5) {
          const tenMinutes = 10 * 60 * 1000;
          setLockoutTime(Date.now() + tenMinutes);
        }
      }
    }
  }, [pin, attempts]);

  const handlePinSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('vishwam_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('vishwam_current_session', currentSessionId);
    } else {
      localStorage.removeItem('vishwam_current_session');
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const createNewSession = () => {
    const agentId = "69f5ee3b492d085f87b994e4";
    const randomStr = Math.random().toString(36).substring(7);
    const newId = `${agentId}-${randomStr}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: []
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    if (currentSessionId === id) {
      setCurrentSessionId(updatedSessions[0]?.id || null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    let targetSessionId = currentSessionId;
    let currentSessions = [...sessions];

    if (!targetSessionId) {
      const agentId = "69f5ee3b492d085f87b994e4";
      const randomStr = Math.random().toString(36).substring(7);
      const newId = `${agentId}-${randomStr}`;
      const newSession: ChatSession = {
        id: newId,
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: []
      };
      currentSessions = [newSession, ...currentSessions];
      setSessions(currentSessions);
      setCurrentSessionId(newId);
      targetSessionId = newId;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      id: `msg-${Date.now()}`,
      timestamp: Date.now()
    };

    const updatedSessions = currentSessions.map(s => {
      if (s.id === targetSessionId) {
        return {
          ...s,
          title: s.messages.length === 0 ? input.slice(0, 30) + (input.length > 30 ? '...' : '') : s.title,
          messages: [...s.messages, userMessage]
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInput('');
    setIsLoading(true);
    setPin(''); // Just to be safe

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          session_id: targetSessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to get response');
      }

      const data = await response.json();
      
      // Lyzr API usually returns the response in a 'response' or 'message' field
      const assistantContent = data.response || data.message || (typeof data === 'string' ? data : JSON.stringify(data));

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        id: `msg-${Date.now()}-ai`,
        timestamp: Date.now()
      };

      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return { ...s, messages: [...s.messages, assistantMessage] };
        }
        return s;
      }));
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : "Could not connect to Vishwam AI service."}`,
        id: `msg-${Date.now()}-err`,
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return { ...s, messages: [...s.messages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#050505] text-gray-200 selection:bg-red-900/30 overflow-hidden font-sans">
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-48 h-48 md:w-64 md:h-64 mb-8 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 rounded-full blur-3xl bg-red-600"
                />
                
                {/* Logo Container */}
                <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 flex items-center justify-center border-2 border-red-600/30 rounded-2xl bg-black/40 backdrop-blur-sm shadow-[0_0_50px_rgba(225,29,72,0.1)] overflow-hidden">
                   <img 
                      src="/image.png" 
                      alt="Vishwam Logo" 
                      className={`absolute inset-0 w-full h-full object-contain brightness-125 z-20 transition-opacity duration-500 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setLogoLoaded(true)}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        setLogoLoaded(false);
                      }}
                   />
                   {!logoLoaded && (
                     <div className="flex flex-col items-center">
                        <div className="w-24 h-24 border-4 border-red-600 rounded-lg rotate-45 flex items-center justify-center mb-4">
                           <span className="text-4xl font-display font-medium -rotate-45 text-red-600">VS</span>
                        </div>
                        <span className="text-3xl font-display font-black italic tracking-tighter text-white">VISHWAM</span>
                     </div>
                   )}
                </div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="text-center"
              >
                <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto mb-4" />
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white mb-2">VISHWAM</h1>
                <p className="text-[14px] tracking-[1em] uppercase text-red-500 font-black mb-8">
                  PRESENTS
                </p>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8, duration: 0.8 }}
                  className="text-[9px] tracking-[0.3em] uppercase text-gray-600 font-bold"
                >
                  Created by Ghatodhar
                </motion.p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* Lock Screen */}
        {!showSplash && isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[90] bg-[#050505] flex flex-col items-center justify-start md:justify-center p-4 md:p-6 overflow-y-auto"
          >
            {/* Background Branding */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.03] z-0">
              <div className="absolute top-0 right-0 p-20 text-[20vw] font-black italic tracking-tighter rotate-12 select-none">
                VISHWAM
              </div>
              <div className="absolute bottom-0 left-0 p-20 text-[20vw] font-black italic tracking-tighter -rotate-12 select-none">
                VISHWAM
              </div>
            </div>

            <motion.div
              animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md relative z-10 py-8"
            >
              <div className="text-center mb-8 md:mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-red-600/10 border border-red-600/30 mb-4 md:mb-6 group transition-all duration-500 hover:border-red-600">
                  {lockoutTime ? (
                    <ShieldAlert className="w-8 h-8 md:w-10 md:h-10 text-red-600 animate-pulse" />
                  ) : (
                    <Lock className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 tracking-tight italic">SECURITY PROTOCOL</h2>
                <p className="text-gray-500 text-[10px] md:text-sm uppercase tracking-[0.2em] font-semibold">Authorized Personnel Only</p>
              </div>

              <div 
                className="bg-[#0a0a0a] border border-red-900/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl"
                onClick={() => document.getElementById('pin-input')?.focus()}
              >
                {lockoutTime ? (
                  <div className="text-center space-y-6 py-4">
                    <div className="flex items-center justify-center gap-3 text-red-500 animate-bounce">
                      <AlertCircle className="w-6 h-6" />
                      <span className="font-bold tracking-widest uppercase">System Locked Out</span>
                    </div>
                    <div className="text-5xl font-mono font-black text-red-600">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed uppercase tracking-wider">
                      Multiple failed attempts detected.<br/>Wait for cooldown period to expire.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handlePinSubmit} className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-center gap-4">
                        {[0, 1, 2, 3].map((i) => (
                          <div 
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                              pin.length > i 
                                ? 'bg-red-600 border-red-600 scale-125 shadow-[0_0_10px_rgba(220,38,38,0.5)]' 
                                : 'border-red-900/40 bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <input
                        id="pin-input"
                        type="password"
                        maxLength={4}
                        autoFocus
                        value={pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setPin(val);
                        }}
                        className="opacity-0 absolute -top-10 left-0 w-1 h-1 pointer-events-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '←'].map((key, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (key === '←') setPin(prev => prev.slice(0, -1));
                            else if (key !== '') setPin(prev => (prev.length < 4 ? prev + key : prev));
                          }}
                          className={`h-12 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl transition-all duration-200 ${
                            key === '' ? 'pointer-events-none opacity-0' : 'bg-gray-900/40 text-gray-400 hover:bg-red-600 hover:text-black hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] touch-none'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>

                    {attempts > 0 && (
                      <div className="text-center">
                        <p className="text-red-500/70 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                          Access Denied ({attempts}/5 Attempts)
                        </p>
                      </div>
                    )}
                  </form>
                )}
              </div>

              <div className="mt-12 text-center">
                <p className="text-[10px] text-gray-700 tracking-[0.4em] uppercase font-bold">
                  Encryption Layer Active • Vishwam v3.2
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? '100%' : 260) : 0, 
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : (isMobile ? -100 : 0)
        }}
        className={`bg-[#000000] border-r border-red-900/30 flex flex-col h-full overflow-hidden z-50 ${isMobile ? 'fixed inset-0' : 'relative'}`}
      >
        <div className="p-4 flex items-center justify-between">
          <button 
            id="new-chat-btn"
            onClick={() => {
              createNewSession();
              if (isMobile) setIsSidebarOpen(false);
            }}
            className="flex-1 flex items-center justify-center gap-2 border border-red-600/50 hover:bg-red-600/10 rounded-lg transition-all duration-300 py-3 px-4 text-red-500 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          
          {isMobile && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="ml-2 p-2 text-gray-500 hover:text-red-500"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <div className="text-[10px] uppercase tracking-wider text-gray-600 px-3 py-4 font-bold">Recent Sessions</div>
          <div className="space-y-1">
            {sessions.map(session => (
              <button
                id={`session-${session.id}`}
                key={session.id}
                onClick={() => {
                  setCurrentSessionId(session.id);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full group flex items-center justify-between p-2.5 px-3 rounded-md text-left text-sm transition-all duration-200 ${
                  currentSessionId === session.id 
                    ? 'bg-red-950/20 text-red-400 border-l-2 border-red-600 shadow-[inset_0_0_10px_rgba(153,27,27,0.1)]' 
                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate">{session.title}</span>
                </div>
                <div 
                  id={`delete-${session.id}`}
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-red-900/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-600 flex items-center justify-center text-[10px] font-bold text-red-500 shadow-[0_0_10px_rgba(220,38,38,0.2)]">
              VS
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold truncate text-white">Vishwam Intelligence</span>
              <span className="text-[10px] text-gray-500 font-medium">made by Ghatodhar</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-[#050505]">
        {/* Toggle Sidebar Button */}
        {!isLocked && (
          <button 
            id="toggle-sidebar"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 p-1 bg-red-600 text-black hover:bg-red-500 transition-all duration-300 rounded-r-md shadow-lg ${
              isSidebarOpen && !isMobile ? 'translate-x-[260px]' : 'translate-x-0'
            } ${isMobile && isSidebarOpen ? 'hidden' : 'block'}`}
          >
            {isSidebarOpen ? <ChevronLeft className="w-3 h-6" /> : <ChevronRight className="w-3 h-6" />}
          </button>
        )}

        {/* Chat Header */}
        <header className="h-16 border-b border-red-900/20 flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg border border-red-600/30 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.1)] overflow-hidden relative">
               <img 
                  src="/image.png" 
                  alt="Logo" 
                  className={`w-full h-full object-contain brightness-125 relative z-10 transition-opacity duration-300 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
               />
               {!logoLoaded && <span className="text-xs font-black text-red-600">VS</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-black text-2xl tracking-tighter italic">VISHWAM</span>
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-bold text-black uppercase">AI AGENT</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span className="hover:text-red-400 cursor-pointer transition-colors hidden md:inline">Documentation</span>
            <div className="h-4 w-[1px] bg-red-900/50 hidden md:block"></div>
            <span className="text-red-500/70 italic text-[11px] font-medium tracking-tight">powered by Lyzr v3</span>
          </div>
        </header>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0 custom-scrollbar relative">
          {/* Subtle Background Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none z-0">
            <span className="text-[150px] md:text-[200px] font-black italic tracking-tighter">VISHWAM</span>
          </div>

          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center relative z-10">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 rounded-xl bg-red-600 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
              >
                <Cpu className="w-8 h-8 text-black" />
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white">
                Vishwam Intelligence
              </h2>
              <p className="text-gray-500 max-w-sm mb-12 text-sm leading-relaxed uppercase tracking-widest font-semibold">
                Proprietary AI Agent Interface
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                {['Quarterly forecast', 'Market integration', 'User audit', 'Revenue insights'].map((suggestion, i) => (
                  <button 
                    id={`suggestion-${i}`}
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="p-4 rounded-xl bg-gray-900/20 border border-red-900/10 text-left hover:border-red-600/50 hover:bg-red-950/10 transition-all duration-300 group"
                  >
                    <span className="text-sm font-medium text-gray-400 group-hover:text-red-400 transition-colors uppercase tracking-wider">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-12 space-y-8 relative z-10">
              {currentSession.messages.map((message) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={message.id} 
                  className={`flex gap-4 ${message.role === 'user' ? 'bg-gray-900/30 p-5 rounded-xl border border-gray-800' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-gray-700 text-gray-300' 
                      : 'bg-red-600 text-black'
                  }`}>
                    {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {message.role === 'assistant' && (
                      <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">Vishwam Intelligence</h3>
                    )}
                    <div className="text-gray-300 text-[15px] leading-relaxed whitespace-pre-wrap">
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-700 font-mono tracking-widest uppercase mt-2">
                       {message.role === 'assistant' ? `Ghatodhar Engine • ` : ''}
                       {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-600 text-black animate-pulse">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2 text-red-600/50 py-2">
                    <div className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 rounded-full bg-current animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-8 bg-gradient-to-t from-[#000000] to-transparent">
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-900 to-red-600 rounded-xl blur opacity-10 group-focus-within:opacity-30 transition duration-500" />
            <div className="relative bg-[#0a0a0a] border border-red-900/40 rounded-xl flex items-center shadow-2xl focus-within:border-red-600/50 transition-all duration-300">
              <input
                id="message-input"
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask Vishwam anything..."
                className="w-full bg-transparent p-4 outline-none text-gray-200 placeholder:text-gray-700 text-sm"
              />
              <button
                id="send-button"
                disabled={!input.trim() || isLoading}
                onClick={handleSendMessage}
                className={`mr-4 p-2.5 rounded-lg transition-all duration-300 ${
                  input.trim() && !isLoading 
                    ? 'bg-red-600 text-black shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:bg-red-500' 
                    : 'bg-gray-900 text-gray-700 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center mt-3 text-[9px] text-gray-700 tracking-[0.3em] uppercase font-bold">
              Vishwam Proprietary Intelligence • Made by Ghatodhar
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

