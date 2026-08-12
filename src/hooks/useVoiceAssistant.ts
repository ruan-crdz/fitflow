import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed'
  | string;

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: SpeechRecognitionErrorCode;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }
}

interface UseVoiceAssistantOptions {
  lang?: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  cloudTts?: {
    enabled?: boolean;
    apiKey?: string | null;
    model?: string;
    voice?: string;
  };
}

function toFriendlyErrorMessage(code: SpeechRecognitionErrorCode): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Permissão do microfone negada.';
  if (code === 'audio-capture') return 'Nenhum microfone disponível.';
  if (code === 'no-speech') return 'Não consegui detectar fala. Tente novamente.';
  if (code === 'network') return 'Falha de rede no reconhecimento de voz.';
  if (code === 'language-not-supported') return 'Idioma de reconhecimento de voz não suportado.';
  return 'Falha ao transcrever áudio.';
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[#>*_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions) {
  const { lang = 'pt-BR', onTranscript, onError, cloudTts } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const isStoppingRef = useRef(false);
  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const cloudAudioUrlRef = useRef<string | null>(null);
  const cloudAbortRef = useRef<AbortController | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const sttSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const localTtsSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== 'undefined');
  }, []);

  const cloudTtsSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(cloudTts?.enabled && cloudTts?.apiKey && typeof Audio !== 'undefined');
  }, [cloudTts?.apiKey, cloudTts?.enabled]);

  const ttsSupported = localTtsSupported || cloudTtsSupported;

  const stopCloudAudio = useCallback(() => {
    cloudAbortRef.current?.abort();
    cloudAbortRef.current = null;

    if (cloudAudioRef.current) {
      cloudAudioRef.current.pause();
      cloudAudioRef.current.src = '';
      cloudAudioRef.current = null;
    }

    if (cloudAudioUrlRef.current) {
      URL.revokeObjectURL(cloudAudioUrlRef.current);
      cloudAudioUrlRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopCloudAudio();
    setIsSpeaking(false);
  }, [stopCloudAudio]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    isStoppingRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (!sttSupported) {
      onErrorRef.current?.('Reconhecimento de voz não suportado neste dispositivo/navegador.');
      return;
    }
    if (isListening) return;

    shouldKeepListeningRef.current = true;
    isStoppingRef.current = false;

    // If assistant is speaking, stop it immediately so user can talk.
    stopSpeaking();

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript?.trim() || '';
        if (!chunk) continue;
        if (event.results[i].isFinal) finalText += `${chunk} `;
        else interim += `${chunk} `;
      }

      if (interim.trim()) {
        onTranscriptRef.current(interim.trim(), false);
      }
      if (finalText.trim()) {
        onTranscriptRef.current(finalText.trim(), true);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;

      if (event.error === 'no-speech') {
        // Keep session alive; we will auto-restart in onend if needed.
        return;
      }

      shouldKeepListeningRef.current = false;
      setIsListening(false);
      onErrorRef.current?.(toFriendlyErrorMessage(event.error));
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;

      if (isStoppingRef.current) {
        isStoppingRef.current = false;
        return;
      }

      if (shouldKeepListeningRef.current) {
        // Some engines auto-end after pauses; restart to keep listening until user stops.
        startListening();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, lang, sttSupported, stopSpeaking]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const pickNaturalVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!localTtsSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const scored = voices
      .map((voice) => {
        const langLower = (voice.lang || '').toLowerCase();
        const nameLower = (voice.name || '').toLowerCase();
        let score = 0;
        if (langLower === 'pt-br') score += 10;
        if (langLower.startsWith('pt')) score += 6;
        if (nameLower.includes('natural')) score += 8;
        if (nameLower.includes('neural')) score += 7;
        if (nameLower.includes('google')) score += 5;
        if (nameLower.includes('microsoft')) score += 4;
        if (!voice.localService) score += 2;
        return { voice, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored[0]?.voice || null;
  }, [localTtsSupported]);

  const speakWithCloud = useCallback(async (text: string) => {
    if (!cloudTtsSupported || !cloudTts?.apiKey) {
      throw new Error('Cloud TTS indisponível');
    }

    stopCloudAudio();

    const controller = new AbortController();
    cloudAbortRef.current = controller;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cloudTts.apiKey}`,
      },
      body: JSON.stringify({
        model: cloudTts.model || 'gpt-4o-mini-tts',
        voice: cloudTts.voice || 'nova',
        input: text,
        response_format: 'mp3',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${response.status}`);
    }

    const blob = await response.blob();
    if (controller.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const url = URL.createObjectURL(blob);
    cloudAudioUrlRef.current = url;
    const audio = new Audio(url);
    cloudAudioRef.current = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        stopCloudAudio();
        resolve();
      };
      audio.onerror = () => {
        stopCloudAudio();
        reject(new Error('Falha ao tocar áudio neural.'));
      };

      void audio.play().catch((error) => {
        stopCloudAudio();
        reject(error);
      });
    });
  }, [cloudTts?.apiKey, cloudTts?.model, cloudTts?.voice, cloudTtsSupported, stopCloudAudio]);

  const speakWithBrowser = useCallback((text: string) => {
    if (!localTtsSupported) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    const naturalVoice = pickNaturalVoice();
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [lang, localTtsSupported, pickNaturalVoice]);

  const speak = useCallback((text: string) => {
    if (!ttsSupported || !text.trim()) return;
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    stopSpeaking();
    setIsSpeaking(true);

    void (async () => {
      try {
        if (cloudTtsSupported) {
          await speakWithCloud(cleanText);
          setIsSpeaking(false);
          return;
        }

        if (localTtsSupported) {
          speakWithBrowser(cleanText);
          return;
        }

        setIsSpeaking(false);
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === 'AbortError';
        if (isAbort) {
          setIsSpeaking(false);
          return;
        }

        if (localTtsSupported) {
          speakWithBrowser(cleanText);
          return;
        }

        setIsSpeaking(false);
        onErrorRef.current?.('Não consegui reproduzir a voz neural agora.');
      }
    })();
  }, [cloudTtsSupported, localTtsSupported, speakWithBrowser, speakWithCloud, stopSpeaking, ttsSupported]);

  useEffect(() => () => {
    shouldKeepListeningRef.current = false;
    isStoppingRef.current = true;
    recognitionRef.current?.abort();
    stopSpeaking();
  }, [stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    sttSupported,
    ttsSupported,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  };
}
