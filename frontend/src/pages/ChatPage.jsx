import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  Layers,
  XCircle,
  RefreshCw,
  Globe,
  Radio,
  ShieldCheck,
  BookOpen,
  Star,
} from 'lucide-react';
import { ContinuousVoiceSession } from '../lib/continuousVoice';
import { openWebsite } from '../lib/browserAutomation';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Namaste! 🙏 Main aapka personal AI assistant hoon. Click "Start Continuous Listening" and speak naturally in Hindi, English, ya Hinglish. Main aapke browser search, tasks, aur memory ko autonomously manage kar sakta hoon!',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, speaking, reconnecting
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [conversationId, setConversationId] = useState(null);
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
      // Send to backend with active conversationId and activeTaskId for continuous context!
      // Send to backend with active conversationId and activeTaskId for continuous context!
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
      toast.success('Continuous Voice Mode Active! 🎙️ Speak your instructions.');
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
    toast('Continuous voice mode stopped.');
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
    <div className="flex-1 flex flex-col h-screen overflow-hidden animate-fade-in" style={{ background: 'var(--bg-primary)' }}>
      {/* Top Header & Continuous Voice Control Bar */}
      <div
        className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 transition-colors"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              voiceActive ? 'animate-pulse-glow' : ''
            }`}
            style={{
              background: voiceActive
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            }}
          >
            {voiceActive ? <Radio className="w-5 h-5 text-white animate-pulse" /> : <Bot className="w-5 h-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                JARVIS Continuous Voice & Task Mode
              </h1>
              <span
                className={`badge ${
                  voiceStatus === 'listening'
                    ? 'badge-green'
                    : voiceStatus === 'speaking'
                    ? 'badge-purple'
                    : voiceStatus === 'reconnecting'
                    ? 'badge-yellow'
                    : 'badge-gray'
                }`}
              >
                {voiceStatus === 'listening' && '● Listening (Live)'}
                {voiceStatus === 'speaking' && '🔊 Speaking (TTS)'}
                {voiceStatus === 'reconnecting' && '🔄 Reconnecting'}
                {voiceStatus === 'idle' && '○ Voice Standby'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Continuous conversational mode in Hindi, English, and Hinglish with autonomous task execution
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Language selector */}
          <select
            className="input py-1.5 px-3 text-xs w-36"
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
            className="btn-icon"
            title={ttsEnabled ? 'Mute Voice Readout' : 'Enable Voice Readout'}
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Interrupt Button */}
          {(voiceActive || loading) && (
            <button
              type="button"
              onClick={handleInterrupt}
              className="btn-danger text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
              title="Interrupt speech or running task"
            >
              <Square size={13} className="fill-white" />
              <span>Interrupt / Stop Task</span>
            </button>
          )}

          {/* One-Time Start / Stop Listening Button */}
          {!voiceActive ? (
            <button
              type="button"
              onClick={startContinuousListening}
              className="btn-primary py-2.5 px-4 font-bold text-xs shadow-lg animate-pulse-glow flex items-center gap-2 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
              }}
            >
              <Mic size={16} />
              <span>Start Continuous Listening</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopContinuousListening}
              className="btn-danger py-2.5 px-4 font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <MicOff size={16} />
              <span>Stop Listening</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Audio Visualizer Banner (When Voice Session Active) */}
      {voiceActive && (
        <div
          className="px-6 py-2.5 border-b flex items-center justify-between text-xs transition-all"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 h-4">
              {[40, 80, 60, 100, 50, 90, 70].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-emerald-500 rounded-full transition-all duration-150"
                  style={{
                    height: voiceStatus === 'listening' ? `${(h * (interimText ? 1 : 0.4))}%` : '4px',
                    animation: voiceStatus === 'listening' ? `pulse-glow ${0.4 + i * 0.1}s infinite alternate` : 'none',
                  }}
                />
              ))}
            </div>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {interimText ? (
                <span>
                  Recognized: <strong className="text-emerald-500">"{interimText}"</strong>
                </span>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>
                  Listening continuously... Speak your request (e.g. "mere browser mein internship opportunities search karo").
                </span>
              )}
            </span>
          </div>

          <span className="badge badge-green text-[10px] shrink-0">
            Pause speech anytime to submit
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white ${
                msg.role === 'user' ? 'ml-2' : 'mr-2'
              }`}
              style={{
                background:
                  msg.role === 'user'
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                    : 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} style={{ color: '#a78bfa' }} />}
            </div>

            {/* Bubble & Task Card Container */}
            <div
              className={`max-w-[78%] flex flex-col gap-3 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-5 py-3.5 shadow-sm ${
                  msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                }`}
                style={{
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                      : 'var(--bg-card)',
                  border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div
                  className={`text-[11px] mt-1.5 flex items-center gap-2 ${
                    msg.role === 'user' ? 'text-white/70' : ''
                  }`}
                  style={msg.role !== 'user' ? { color: 'var(--text-muted)' } : {}}
                >
                  <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                  {msg.role === 'assistant' && ttsEnabled && (
                    <button
                      type="button"
                      onClick={() => speakText(msg.content)}
                      className="hover:underline opacity-75 flex items-center gap-1 cursor-pointer"
                      title="Replay TTS"
                    >
                      <Volume2 size={11} /> Read
                    </button>
                  )}
                </div>
              </div>

              {/* Autonomous Task Plan Card (if this message triggered/updated an execution) */}
              {msg.taskExecution && (
                <div className="card w-full border-purple-500/30 p-4 shadow-md animate-fade-in"
                  style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between pb-3 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {msg.taskExecution.title}
                      </span>
                    </div>
                    <span
                      className={`badge ${
                        msg.taskExecution.status === 'completed'
                          ? 'badge-green'
                          : msg.taskExecution.status === 'running'
                          ? 'badge-yellow'
                          : msg.taskExecution.status === 'cancelled'
                          ? 'badge-gray'
                          : 'badge-purple'
                      }`}
                    >
                      {msg.taskExecution.status}
                    </span>
                  </div>

                  {/* Planned Steps Timeline */}
                  {msg.steps && msg.steps.length > 0 && (
                    <div className="py-3 flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Autonomous Execution Steps:
                      </span>
                      {msg.steps.map((st, sidx) => (
                        <div
                          key={sidx}
                          className="p-2 rounded-lg border flex items-center justify-between text-xs"
                          style={{
                            background: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {st.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : st.status === 'running' ? (
                              <Loader className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[9px] shrink-0">
                                {sidx + 1}
                              </span>
                            )}
                            <span style={{ color: 'var(--text-primary)' }}>{st.title}</span>
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {st.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Target Website Navigation Card (when direct site or official URL is identified) */}
                  {msg.taskExecution.result?.targetUrl && (
                    <div
                      className="mt-3 p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all shadow-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: msg.taskExecution.result?.isOfficial ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="font-semibold text-xs text-purple-300">
                            {msg.taskExecution.result?.targetTitle || 'Target Website'}
                          </span>
                          {msg.taskExecution.result?.isOfficial && (
                            <span className="badge badge-purple text-[10px] flex items-center gap-1">
                              <Star size={10} className="fill-purple-400 text-purple-400" /> Official Website
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <ShieldCheck size={12} /> Safe Protocol Verified
                        </span>
                      </div>

                      <div className="text-[11px] font-mono break-all opacity-85" style={{ color: 'var(--text-secondary)' }}>
                        {msg.taskExecution.result.targetUrl}
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleLaunchWebsite(msg.taskExecution.result.targetUrl, msg.taskExecution.result?.targetTitle)}
                          className="btn-primary py-1.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer"
                          style={{
                            background: openedUrls[msg.taskExecution.result.targetUrl]
                              ? 'linear-gradient(135deg, #10b981, #059669)'
                              : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                          }}
                        >
                          <ExternalLink size={13} />
                          <span>
                            {openedUrls[msg.taskExecution.result.targetUrl]
                              ? 'Re-Open Website'
                              : `Open ${msg.taskExecution.result?.targetTitle || 'Website'} in Browser`}
                          </span>
                        </button>

                        {openedUrls[msg.taskExecution.result.targetUrl] && (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 size={12} /> Opened in browser tab
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => processMessage(`Summarize ${msg.taskExecution.result.targetUrl} and extract useful information`)}
                          className="px-2.5 py-1.5 rounded-lg border border-purple-500/40 text-purple-300 text-xs hover:border-purple-300 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <BookOpen size={12} /> Summarize with JARVIS
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Research & Synthesis Summary Card */}
                  {msg.taskExecution.result?.summary && (
                    <div
                      className="mt-3 p-3.5 rounded-xl border flex flex-col gap-2 transition-all shadow-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-400" />
                          <span className="font-semibold text-xs text-emerald-400">
                            Website Research & Synthesis
                          </span>
                        </div>
                        <span className="badge badge-green text-[10px]">
                          📚 Saved to Research Library
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap pt-1" style={{ color: 'var(--text-primary)' }}>
                        {msg.taskExecution.result.summary}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Candidate Websites List / Search Findings */}
                  {msg.taskExecution.result?.items?.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="text-[11px] font-semibold mb-2.5 flex items-center justify-between"
                        style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center gap-1.5">
                          <Globe size={13} className="text-purple-400" />
                          <span>
                            {msg.taskExecution.result?.multipleMatches
                              ? `Matching Websites (${msg.taskExecution.result.items.length}) — Click to Open:`
                              : `Verified Web Results (${msg.taskExecution.result.items.length}):`}
                          </span>
                        </div>
                        {msg.taskExecution.result.filteredBy && (
                          <span className="badge badge-purple text-[10px]">
                            {msg.taskExecution.result.filteredBy}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {msg.taskExecution.result.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="p-3 rounded-xl border flex flex-col gap-1.5 transition-all hover:border-purple-400/50"
                            style={{
                              background: 'var(--bg-primary)',
                              borderColor: item.isOfficial ? 'rgba(168, 85, 247, 0.3)' : 'var(--border-subtle)',
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                                  {item.title}
                                </span>
                                {item.isOfficial && (
                                  <span className="badge badge-purple text-[9px] flex items-center gap-0.5">
                                    <Star size={9} className="fill-purple-400 text-purple-400" /> Official
                                  </span>
                                )}
                              </div>
                              {item.stipend && (
                                <span className="badge badge-green text-[10px]">
                                  {item.stipend}
                                </span>
                              )}
                            </div>

                            {item.company && (
                              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                🏢 {item.company} {item.location ? `· 📍 ${item.location}` : ''}
                              </span>
                            )}

                            {item.details && (
                              <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                {item.details}
                              </p>
                            )}

                            {item.url && (
                              <div className="flex items-center gap-3 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleLaunchWebsite(item.url, item.title)}
                                  className="text-[11px] font-medium flex items-center gap-1 text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                                >
                                  Open Website <ExternalLink size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => processMessage(`Summarize ${item.url} and explain its content`)}
                                  className="text-[11px] font-medium flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
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
          <div className="flex gap-3 animate-fade-in flex-row-reverse">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white ml-2 bg-emerald-600 animate-pulse"
            >
              <Mic size={16} />
            </div>
            <div
              className="max-w-[78%] rounded-2xl rounded-tr-sm px-5 py-3 border border-emerald-500/40 shadow-sm"
              style={{ background: 'var(--bg-card)' }}
            >
              <p className="text-sm italic text-emerald-500 flex items-center gap-2">
                <span>"{interimText}"</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </p>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Detecting pause to submit...
              </span>
            </div>
          </div>
        )}

        {/* Thinking / Execution Loading State */}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center mr-2 text-white"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              }}
            >
              <Bot size={16} />
            </div>
            <div
              className="rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <Loader size={16} className="animate-spin text-purple-400" />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                JARVIS is executing and verifying task...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Continuous Suggested Next Commands Pills */}
      {activeTask && (
        <div
          className="px-6 py-2 border-t flex items-center gap-2 overflow-x-auto text-xs"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
            Contextual follow-ups:
          </span>
          {activeTask.result?.targetUrl ? (
            <>
              <button
                type="button"
                onClick={() => handleLaunchWebsite(activeTask.result.targetUrl, activeTask.result.targetTitle)}
                className="px-2.5 py-1 rounded-full border border-purple-500/30 hover:border-purple-400 text-purple-400 text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
              >
                🌐 Open {activeTask.result.targetTitle || 'Website'}
              </button>
              <button
                type="button"
                onClick={() => processMessage(`Summarize ${activeTask.result.targetUrl} and save useful information`)}
                className="px-2.5 py-1 rounded-full border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
              >
                📑 Summarize this website
              </button>
              <button
                type="button"
                onClick={() => processMessage('Inki details save kar do aur daily task memory update karo')}
                className="px-2.5 py-1 rounded-full border border-blue-500/30 hover:border-blue-400 text-blue-400 text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
              >
                💾 Save to Research Library
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => processMessage('Ab stipend wali opportunities filter karo')}
                className="px-2.5 py-1 rounded-full border border-purple-500/30 hover:border-purple-400 text-purple-400 text-[11px] shrink-0 cursor-pointer"
              >
                🔍 "Ab stipend wali opportunities filter karo"
              </button>
              <button
                type="button"
                onClick={() => processMessage('Inki details save kar do aur daily task memory update karo')}
                className="px-2.5 py-1 rounded-full border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 text-[11px] shrink-0 cursor-pointer"
              >
                💾 "Inki details save kar do aur daily task memory update karo"
              </button>
            </>
          )}
        </div>
      )}

      {/* Input Bar */}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
      >
        <form onSubmit={(e) => { e.preventDefault(); processMessage(); }} className="flex items-center gap-3">
          <input
            className="input flex-1"
            placeholder={
              voiceActive
                ? '🎤 Continuous voice is active — speak freely or type here...'
                : 'Speak with "Start Continuous Listening" or type your command...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary px-5 py-2.5 disabled:opacity-40"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
