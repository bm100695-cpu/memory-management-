import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Loader,
  Square,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Globe,
  Radio,
  ShieldCheck,
  BookOpen,
  Star,
  Brain,
  History,
  PlusCircle,
  X,
  Search,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import { ContinuousVoiceSession } from '../lib/continuousVoice';
import { openWebsite } from '../lib/browserAutomation';

const SUGGESTED_PROMPTS = [
  {
    icon: Search,
    title: 'Search Opportunities',
    text: 'Search web for AI & Python internships with stipend',
  },
  {
    icon: Brain,
    title: 'Review Memory',
    text: 'What personal goals and tech preferences do you have saved for me?',
  },
  {
    icon: CheckSquare,
    title: 'Daily Tasks',
    text: 'What are my top priorities and pending tasks for today?',
  },
  {
    icon: BookOpen,
    title: 'Research & Summarize',
    text: 'Summarize the latest trends in autonomous AI agents',
  },
];

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, speaking, reconnecting
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [activeSteps, setActiveSteps] = useState([]);
  const [openedUrls, setOpenedUrls] = useState({});

  const bottomRef = useRef(null);
  const voiceSessionRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Safely open website in browser tab and coordinate with extension
  const handleLaunchWebsite = async (url, title = '') => {
    if (!url) return;
    const res = await openWebsite(url, title);
    if (res.success) {
      setOpenedUrls((prev) => ({ ...prev, [url]: true }));
      toast.success(`Opening ${title || url} in browser!`);
    } else {
      toast.error(res.error || 'Failed to open website');
    }
  };

  const loadConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data?.data?.conversations || []);
    } catch (e) {
      // ignore
    }
  };

  const switchConversation = async (convId) => {
    try {
      setLoading(true);
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      const msgs = res.data?.data?.messages || [];
      setMessages(msgs);
      setConversationId(convId);
      setSearchParams({ conversationId: convId });
      setShowHistoryModal(false);
    } catch (err) {
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setSearchParams({});
    setActiveTask(null);
    setActiveSteps([]);
    setMessages([]);
    setInput('');
    setInterimText('');
  };

  // Listen to new chat dispatched from Sidebar
  useEffect(() => {
    const handleNewChatEvent = () => {
      startNewChat();
    };
    window.addEventListener('jarvis-new-chat', handleNewChatEvent);
    return () => window.removeEventListener('jarvis-new-chat', handleNewChatEvent);
  }, []);

  useEffect(() => {
    loadConversations();
    const queryConvId = searchParams.get('conversationId');
    if (queryConvId && queryConvId !== conversationId) {
      switchConversation(queryConvId);
    }
  }, [searchParams]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText, activeTask, activeSteps]);

  // Text-To-Speech with echo-free coordination
  const speakText = useCallback(
    (text, targetLang = 'hi-IN') => {
      if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

      try {
        window.speechSynthesis.cancel(); // Stop any pending utterances
        voiceSessionRef.current?.pauseForTts();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang.includes('hi') ? 'hi-IN' : 'en-IN';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          voiceSessionRef.current?.resumeAfterTts();
        };

        utterance.onerror = () => {
          voiceSessionRef.current?.resumeAfterTts();
        };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        voiceSessionRef.current?.resumeAfterTts();
      }
    },
    [ttsEnabled]
  );

  // Stop TTS speech immediately
  const stopTts = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      voiceSessionRef.current?.resumeAfterTts();
    }
  };

  // Main message processor (handles both text input and continuous voice speech boundaries)
  const processMessage = async (contentToSend) => {
    const content = (contentToSend || input).trim();
    if (!content || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setLoading(true);
    setInput('');
    setInterimText('');

    // Append user message
    const userMsg = {
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Send to backend with active conversationId and activeTaskId for continuous context
      const payload = { content };
      if (conversationId) payload.conversationId = conversationId;
      if (activeTask?._id) payload.activeTaskId = activeTask._id;

      const res = await api.post('/chat/message', payload);

      const data = res.data.data;
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // If a task execution was triggered or amended
      if (data.taskExecution) {
        setActiveTask(data.taskExecution);
        setActiveSteps(data.steps || []);
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.message,
        createdAt: data.createdAt || new Date().toISOString(),
        taskExecution: data.taskExecution || null,
        steps: data.steps || null,
        memoriesUsed: data.memoriesUsed || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak assistant response in natural voice
      const replyLang = data.language === 'hi' ? 'hi-IN' : 'en-IN';
      speakText(assistantMsg.content, replyLang);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || 'Could not process instruction.';
      const fallbackMsg = {
        role: 'assistant',
        content: `Error: ${errMsg}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speakText(errMsg, 'en-IN');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  // Start continuous listening session
  const startContinuousListening = () => {
    stopTts();
    if (voiceSessionRef.current) {
      voiceSessionRef.current.stop();
    }

    const session = new ContinuousVoiceSession({
      language: selectedLang,
      onTranscript: (transcript) => {
        // Automatically process recognized speech boundary
        processMessage(transcript);
      },
      onInterim: (interim) => {
        setInterimText(interim);
      },
      onStatusChange: (status) => {
        setVoiceStatus(status);
      },
      onError: (err) => {
        toast.error(err);
      },
    });

    const ok = session.start();
    if (ok) {
      voiceSessionRef.current = session;
      setVoiceActive(true);
      toast.success('Continuous Voice Active! 🎙️ Speak freely.');
    }
  };

  // Stop continuous listening session
  const stopContinuousListening = () => {
    stopTts();
    if (voiceSessionRef.current) {
      voiceSessionRef.current.stop();
      voiceSessionRef.current = null;
    }
    setVoiceActive(false);
    setVoiceStatus('idle');
    setInterimText('');
    toast('Voice listening stopped.');
  };

  // Interrupt active speech or task
  const handleInterrupt = async () => {
    stopTts();
    if (activeTask && activeTask.status === 'running') {
      try {
        await api.post(`/automations/${activeTask._id}/cancel`, {
          reason: 'Voice interrupt requested by user',
        });
        toast('Running task cancelled.');
        setActiveTask((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      } catch (e) {
        // ignore
      }
    }
  };

  // Change voice recognition language
  const handleLanguageChange = (lang) => {
    setSelectedLang(lang);
    if (voiceSessionRef.current) {
      voiceSessionRef.current.setLanguage(lang);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTts();
      voiceSessionRef.current?.stop();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white text-[#202123]">
      {/* Top Minimal Header */}
      <header className="px-6 py-3 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm text-[#202123]">
              Memory Management
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                voiceStatus === 'listening'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : voiceStatus === 'speaking'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : voiceStatus === 'reconnecting'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-[#F0F1F3] text-[#6B7280]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  voiceStatus === 'listening'
                    ? 'bg-emerald-500 animate-pulse'
                    : voiceStatus === 'speaking'
                    ? 'bg-blue-600 animate-pulse'
                    : voiceStatus === 'reconnecting'
                    ? 'bg-amber-500'
                    : 'bg-[#9CA3AF]'
                }`}
              />
              {voiceStatus === 'listening' && 'Listening'}
              {voiceStatus === 'speaking' && 'Speaking'}
              {voiceStatus === 'reconnecting' && 'Reconnecting'}
              {voiceStatus === 'idle' && 'Ready'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* History Button */}
          <button
            type="button"
            onClick={() => {
              loadConversations();
              setShowHistoryModal(true);
            }}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202123] hover:bg-[#F0F1F3] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            title="Browse previous conversation history"
          >
            <History size={14} className="text-[#6B7280]" />
            <span>History ({conversations.length})</span>
          </button>

          {/* Language selector */}
          <select
            className="text-xs py-1.5 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202123] hover:bg-[#F0F1F3] transition-colors cursor-pointer outline-none focus:border-[#2563EB]"
            value={selectedLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="hi-IN">Hindi (हिंदी / Hinglish)</option>
            <option value="en-IN">Indian English</option>
            <option value="en-US">US English</option>
          </select>

          {/* TTS mute toggle */}
          <button
            type="button"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#202123] hover:bg-[#F0F1F3] transition-colors cursor-pointer"
            title={ttsEnabled ? 'Mute Voice Readout' : 'Enable Voice Readout'}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Interrupt Button (When active) */}
          {(voiceActive || loading) && (
            <button
              type="button"
              onClick={handleInterrupt}
              className="text-xs py-1.5 px-3 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              title="Interrupt speech or running task"
            >
              <Square size={12} className="fill-red-600 text-red-600" />
              <span>Stop</span>
            </button>
          )}

          {/* Voice Mode Toggle Button */}
          {!voiceActive ? (
            <button
              type="button"
              onClick={startContinuousListening}
              className="text-xs py-1.5 px-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Mic size={14} />
              <span>Voice Mode</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopContinuousListening}
              className="text-xs py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <MicOff size={14} />
              <span>Stop Voice</span>
            </button>
          )}
        </div>
      </header>

      {/* Voice Visualizer Indicator (when listening) */}
      {voiceActive && (
        <div className="px-6 py-2 border-b border-[#E5E7EB] bg-[#F7F7F8] flex items-center justify-between text-xs transition-all">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 h-3.5">
              {[30, 70, 50, 100, 40, 80, 60].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-[#2563EB] rounded-full transition-all duration-150"
                  style={{
                    height: voiceStatus === 'listening' ? `${h * (interimText ? 1 : 0.4)}%` : '3px',
                  }}
                />
              ))}
            </div>
            <span className="text-[#202123]">
              {interimText ? (
                <span>
                  Listening: <strong className="text-[#2563EB]">"{interimText}"</strong>
                </span>
              ) : (
                <span className="text-[#6B7280]">
                  Voice listening active... Speak naturally, pause to send.
                </span>
              )}
            </span>
          </div>

          <span className="text-[11px] text-[#6B7280]">
            Automatic voice boundary detection
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
          {/* Empty State / Welcome Screen Inspired by ChatGPT */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center my-auto px-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-[#F0F1F3] flex items-center justify-center mb-4 text-[#202123] shadow-xs">
                <Sparkles size={24} className="text-[#2563EB]" />
              </div>
              <h2 className="text-2xl font-semibold text-[#202123] mb-2 tracking-tight">
                What's on your mind today?
              </h2>
              <p className="text-sm text-[#6B7280] max-w-md mb-8 leading-relaxed">
                Ask questions, browse and research websites, execute autonomous multi-step tasks, or recall personal memories.
              </p>

              {/* Prompt Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                {SUGGESTED_PROMPTS.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => processMessage(p.text)}
                      className="p-3.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F7F7F8] hover:border-[#D1D5DB] transition-all text-left flex flex-col gap-1 cursor-pointer group shadow-xs"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#202123] group-hover:text-[#2563EB] transition-colors">
                        <Icon size={14} className="text-[#6B7280] group-hover:text-[#2563EB]" />
                        <span>{p.title}</span>
                      </div>
                      <p className="text-xs text-[#6B7280] line-clamp-2">
                        {p.text}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
            >
              {/* Profile Avatar */}
              {msg.role === 'user' ? (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold tracking-wider shadow-xs select-none"
                  style={{
                    background: '#0F766E',
                    color: '#FFFFFF',
                  }}
                  title="User Profile"
                >
                  BM
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs select-none"
                  style={{
                    background: '#2563EB',
                  }}
                  title="Memory Management"
                >
                  <Bot size={17} />
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={`max-w-[85%] flex flex-col gap-2 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#F0F1F3] text-[#202123] rounded-tr-xs'
                      : 'bg-white text-[#202123] border border-[#E5E7EB] shadow-xs rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  <div
                    className="text-[11px] mt-2 flex items-center gap-3 text-[#6B7280]"
                  >
                    <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                    {msg.role === 'assistant' && msg.memoriesUsed?.length > 0 && (
                      <span className="text-[#2563EB] flex items-center gap-1 font-medium">
                        <Brain size={12} /> Grounded with Memory
                      </span>
                    )}
                    {msg.role === 'assistant' && ttsEnabled && (
                      <button
                        type="button"
                        onClick={() => speakText(msg.content)}
                        className="hover:text-[#202123] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                        title="Replay TTS audio"
                      >
                        <Volume2 size={12} /> Read aloud
                      </button>
                    )}
                  </div>
                </div>

                {/* Autonomous Task Plan Card (if this message triggered/updated an execution) */}
                {msg.taskExecution && (
                  <div className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 shadow-xs mt-1 animate-fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#2563EB]" />
                        <span className="font-semibold text-xs text-[#202123]">
                          {msg.taskExecution.title}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          msg.taskExecution.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : msg.taskExecution.status === 'running'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : msg.taskExecution.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-700 border border-gray-300'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {msg.taskExecution.status}
                      </span>
                    </div>

                    {/* Planned Steps Timeline */}
                    {msg.steps && msg.steps.length > 0 && (
                      <div className="py-3 flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                          Autonomous Execution Steps:
                        </span>
                        {msg.steps.map((st, sidx) => (
                          <div
                            key={sidx}
                            className="p-2 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {st.status === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : st.status === 'running' ? (
                                <Loader className="w-4 h-4 text-[#2563EB] animate-spin shrink-0" />
                              ) : (
                                <span className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center text-[9px] shrink-0 text-gray-600">
                                  {sidx + 1}
                                </span>
                              )}
                              <span className="text-[#202123]">{st.title}</span>
                            </div>
                            <span className="text-[10px] text-[#6B7280]">
                              {st.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Target Website Navigation Card */}
                    {msg.taskExecution.result?.targetUrl && (
                      <div className="mt-2.5 p-3.5 rounded-xl border border-[#E5E7EB] bg-white flex flex-col gap-2.5 shadow-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-[#2563EB] shrink-0" />
                            <span className="font-semibold text-xs text-[#202123]">
                              {msg.taskExecution.result?.targetTitle || 'Target Website'}
                            </span>
                            {msg.taskExecution.result?.isOfficial && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-medium">
                                <Star size={10} className="fill-[#2563EB] text-[#2563EB]" /> Official Site
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                            <ShieldCheck size={12} /> Safe Protocol Verified
                          </span>
                        </div>

                        <div className="text-[11px] font-mono break-all text-[#6B7280]">
                          {msg.taskExecution.result.targetUrl}
                        </div>

                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              handleLaunchWebsite(
                                msg.taskExecution.result.targetUrl,
                                msg.taskExecution.result?.targetTitle
                              )
                            }
                            className="py-1.5 px-3 rounded-lg text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <ExternalLink size={13} />
                            <span>
                              {openedUrls[msg.taskExecution.result.targetUrl]
                                ? 'Re-Open Website'
                                : `Open ${msg.taskExecution.result?.targetTitle || 'Website'} in Browser`}
                            </span>
                          </button>

                          {openedUrls[msg.taskExecution.result.targetUrl] && (
                            <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                              <CheckCircle2 size={12} /> Opened in browser tab
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              processMessage(
                                `Summarize ${msg.taskExecution.result.targetUrl} and extract useful information`
                              )
                            }
                            className="py-1.5 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202123] hover:bg-[#F0F1F3] text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <BookOpen size={12} /> Summarize
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Research & Synthesis Summary Card */}
                    {msg.taskExecution.result?.summary && (
                      <div className="mt-2.5 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col gap-2 shadow-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-700" />
                            <span className="font-semibold text-xs text-emerald-800">
                              Website Research & Synthesis
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            Saved to Research Library
                          </span>
                        </div>
                        <div className="text-xs leading-relaxed whitespace-pre-wrap pt-1 text-[#202123]">
                          {msg.taskExecution.result.summary}
                        </div>
                      </div>
                    )}

                    {/* Web Results List */}
                    {msg.taskExecution.result?.items?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#E5E7EB]">
                        <div className="text-[11px] font-semibold mb-2.5 flex items-center justify-between text-[#6B7280]">
                          <div className="flex items-center gap-1.5">
                            <Globe size={13} className="text-[#2563EB]" />
                            <span>
                              {msg.taskExecution.result?.multipleMatches
                                ? `Matching Websites (${msg.taskExecution.result.items.length}):`
                                : `Verified Web Results (${msg.taskExecution.result.items.length}):`}
                            </span>
                          </div>
                          {msg.taskExecution.result.filteredBy && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {msg.taskExecution.result.filteredBy}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {msg.taskExecution.result.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="p-3 rounded-xl border border-[#E5E7EB] bg-white flex flex-col gap-1.5 transition-all hover:border-[#D1D5DB]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-xs text-[#202123]">
                                    {item.title}
                                  </span>
                                  {item.isOfficial && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                                      <Star size={9} className="fill-[#2563EB] text-[#2563EB]" /> Official
                                    </span>
                                  )}
                                </div>
                                {item.stipend && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                    {item.stipend}
                                  </span>
                                )}
                              </div>

                              {item.company && (
                                <span className="text-[11px] text-[#6B7280]">
                                  🏢 {item.company} {item.location ? `· 📍 ${item.location}` : ''}
                                </span>
                              )}

                              {item.details && (
                                <p className="text-[11px] mt-0.5 line-clamp-2 text-[#6B7280]">
                                  {item.details}
                                </p>
                              )}

                              {item.url && (
                                <div className="flex items-center gap-3 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleLaunchWebsite(item.url, item.title)}
                                    className="text-[11px] font-medium flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer"
                                  >
                                    Open Website <ExternalLink size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => processMessage(`Summarize ${item.url} and explain its content`)}
                                    className="text-[11px] font-medium flex items-center gap-1 text-emerald-700 hover:underline cursor-pointer"
                                  >
                                    Summarize <BookOpen size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Live Interim Speech Bubble */}
          {interimText && (
            <div className="flex gap-3.5 flex-row-reverse animate-fade-in">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white bg-[#2563EB] animate-pulse">
                <Mic size={16} />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-3 border border-blue-200 bg-blue-50/50 shadow-xs">
                <p className="text-sm italic text-[#2563EB] flex items-center gap-2">
                  <span>"{interimText}"</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                </p>
                <span className="text-[10px] text-[#6B7280]">
                  Detecting pause to submit...
                </span>
              </div>
            </div>
          )}

          {/* Thinking / Execution Loading State */}
          {loading && (
            <div className="flex gap-3.5 animate-fade-in">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#2563EB] text-white shadow-xs">
                <Bot size={17} />
              </div>
              <div className="rounded-2xl rounded-tl-xs px-4 py-3 bg-white border border-[#E5E7EB] flex items-center gap-2 shadow-xs">
                <Loader size={16} className="animate-spin text-[#2563EB]" />
                <span className="text-xs text-[#6B7280]">
                  Thinking & retrieving context...
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggested Follow-ups Bar (When Task Active) */}
      {activeTask && (
        <div className="px-6 py-2 border-t border-[#E5E7EB] bg-[#F7F7F8] flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-semibold text-[#6B7280] shrink-0">
            Suggested:
          </span>
          {activeTask.result?.targetUrl ? (
            <>
              <button
                type="button"
                onClick={() => handleLaunchWebsite(activeTask.result.targetUrl, activeTask.result.targetTitle)}
                className="px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F0F1F3] text-[#202123] text-[11px] shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Globe size={11} className="text-[#2563EB]" /> Open {activeTask.result.targetTitle || 'Website'}
              </button>
              <button
                type="button"
                onClick={() => processMessage(`Summarize ${activeTask.result.targetUrl} and save useful information`)}
                className="px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F0F1F3] text-[#202123] text-[11px] shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <BookOpen size={11} className="text-emerald-600" /> Summarize website
              </button>
              <button
                type="button"
                onClick={() => processMessage('Inki details save kar do aur daily task memory update karo')}
                className="px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F0F1F3] text-[#202123] text-[11px] shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Brain size={11} className="text-[#2563EB]" /> Save to memory
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => processMessage('Ab stipend wali opportunities filter karo')}
                className="px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F0F1F3] text-[#202123] text-[11px] shrink-0 cursor-pointer transition-colors"
              >
                Filter by stipend
              </button>
              <button
                type="button"
                onClick={() => processMessage('Inki details save kar do aur daily task memory update karo')}
                className="px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F0F1F3] text-[#202123] text-[11px] shrink-0 cursor-pointer transition-colors"
              >
                Save details to memory
              </button>
            </>
          )}
        </div>
      )}

      {/* ChatGPT-Inspired Light Chat Input Bar */}
      <div className="p-4 bg-white shrink-0">
        <div className="max-w-3xl mx-auto w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processMessage();
            }}
            className="relative flex items-center bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:border-[#D1D5DB] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/15 transition-all p-1.5 pl-4"
          >
            <input
              type="text"
              className="flex-1 bg-transparent py-2.5 text-sm text-[#202123] placeholder-[#6B7280] outline-none"
              placeholder={
                voiceActive
                  ? 'Continuous voice is active — speak freely or type...'
                  : 'Message Memory Management or start speaking...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            {/* Right Buttons Container: Voice + Send */}
            <div className="flex items-center gap-1.5 pr-1">
              {/* Voice / Mic Button */}
              <button
                type="button"
                onClick={voiceActive ? stopContinuousListening : startContinuousListening}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                  voiceActive
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                }`}
                title={voiceActive ? 'Stop voice listening' : 'Start voice listening'}
              >
                {voiceActive ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#202123] hover:bg-black text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                title="Send message"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </form>

          <p className="text-[11px] text-[#9CA3AF] text-center mt-2">
            Memory Management can make mistakes. Verify important facts, tasks, and web results.
          </p>
        </div>
      </div>

      {/* Conversation History Modal */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(32, 33, 35, 0.45)', backdropFilter: 'blur(3px)' }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl border border-[#E5E7EB]">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-semibold text-base text-[#202123]">
                  Past Conversations ({conversations.length})
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#202123] hover:bg-[#F0F1F3] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#6B7280]">
                  No previous conversations found.
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv._id}
                    onClick={() => switchConversation(conv._id)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      conversationId === conv._id
                        ? 'border-[#2563EB] bg-[#2563EB]/5'
                        : 'border-[#E5E7EB] bg-white hover:bg-[#F7F7F8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs truncate max-w-[70%] text-[#202123]">
                        {conv.title || 'Conversation'}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        {format(new Date(conv.lastMessageAt || conv.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    {conv.summary && (
                      <p className="text-[11px] line-clamp-2 text-[#6B7280]">
                        {conv.summary}
                      </p>
                    )}
                    {conv.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conv.topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F0F1F3] text-[#4B5563]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="p-3 border-t border-[#E5E7EB] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  startNewChat();
                  setShowHistoryModal(false);
                }}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <PlusCircle size={14} /> Start Fresh Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
