/**
 * JARVIS Continuous Voice Session Engine
 * Handles long-running multi-turn conversational voice mode, speech boundary detection,
 * automatic silence pauses, echo-free TTS muting, and error recovery.
 */

export class ContinuousVoiceSession {
  constructor({
    onTranscript,
    onInterim,
    onStatusChange,
    onError,
    onBoundaryDetected,
    language = 'hi-IN',
  }) {
    this.onTranscript = onTranscript;
    this.onInterim = onInterim;
    this.onStatusChange = onStatusChange;
    this.onError = onError;
    this.onBoundaryDetected = onBoundaryDetected;
    this.language = language;

    this.isActive = false;
    this.isSpeakingTts = false;
    this.recognition = null;
    this.silenceTimer = null;
    this.currentInterim = '';
    this.SILENCE_DELAY = 1600; // ms to consider speech boundary after pause
    this.restartAttempts = 0;
  }

  isSupported() {
    return typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  start() {
    if (!this.isSupported()) {
      this.onError?.('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return false;
    }

    this.isActive = true;
    this.restartAttempts = 0;
    this.initRecognition();
    this.onStatusChange?.('listening');
    return true;
  }

  initRecognition() {
    if (!this.isActive) return;

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {
          // ignore abort error
        }
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.restartAttempts = 0;
        this.onStatusChange?.(this.isSpeakingTts ? 'speaking' : 'listening');
      };

      this.recognition.onresult = (event) => {
        // If JARVIS is currently speaking out loud via TTS, drop speech to prevent echo
        if (this.isSpeakingTts) {
          return;
        }

        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            finalChunk += ' ' + text;
          } else {
            interim += ' ' + text;
          }
        }

        const cleanInterim = interim.trim();
        this.currentInterim = cleanInterim;
        this.onInterim?.(cleanInterim);

        // Reset silence detection timer whenever voice activity is detected
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        // When user produces a final chunk or pauses after interim speech
        if (finalChunk.trim()) {
          this.handleSpeechBoundary(finalChunk.trim());
        } else if (cleanInterim) {
          // Set boundary timer: if user pauses for SILENCE_DELAY ms, submit the interim text
          this.silenceTimer = setTimeout(() => {
            if (this.currentInterim.trim() && !this.isSpeakingTts) {
              const fullSpeech = this.currentInterim.trim();
              this.currentInterim = '';
              this.handleSpeechBoundary(fullSpeech);
            }
          }, this.SILENCE_DELAY);
        }
      };

      this.recognition.onerror = (event) => {
        // 'no-speech' or 'aborted' are expected during continuous sessions
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        // Network or microphone hiccup: attempt auto-recovery
        if (event.error === 'network') {
          this.onStatusChange?.('reconnecting');
          setTimeout(() => {
            if (this.isActive) this.initRecognition();
          }, 1000);
          return;
        }

        this.onError?.(`Voice recognition notice: ${event.error}`);
      };

      this.recognition.onend = () => {
        // If session is still active and not stopped by user, automatically restart loop!
        if (this.isActive) {
          setTimeout(() => {
            if (this.isActive && !this.isSpeakingTts) {
              try {
                this.recognition?.start();
              } catch (e) {
                // If start fails, re-init instance
                this.initRecognition();
              }
            }
          }, 250);
        } else {
          this.onStatusChange?.('idle');
        }
      };

      this.recognition.start();
    } catch (err) {
      if (this.isActive && this.restartAttempts < 5) {
        this.restartAttempts++;
        setTimeout(() => this.initRecognition(), 800);
      } else {
        this.onError?.('Could not activate continuous microphone. Please check permissions.');
        this.stop();
      }
    }
  }

  handleSpeechBoundary(transcript) {
    if (!transcript || !transcript.trim()) return;
    this.currentInterim = '';
    this.onInterim?.('');
    this.onBoundaryDetected?.(transcript);
    this.onTranscript?.(transcript);
  }

  pauseForTts() {
    this.isSpeakingTts = true;
    this.onStatusChange?.('speaking');
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  resumeAfterTts() {
    this.isSpeakingTts = false;
    this.currentInterim = '';
    this.onInterim?.('');
    if (this.isActive) {
      this.onStatusChange?.('listening');
      try {
        this.recognition?.start();
      } catch (e) {
        // instance already running or needs re-init
      }
    }
  }

  setLanguage(lang) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  stop() {
    this.isActive = false;
    this.isSpeakingTts = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.onStatusChange?.('idle');
    this.onInterim?.('');
  }
}
