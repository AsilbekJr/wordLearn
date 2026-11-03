export interface TTSProvider {
  speak(text: string, audioPath?: string | null): Promise<void>;
}

export class DefaultTTSProvider implements TTSProvider {
  async speak(text: string, audioPath?: string | null): Promise<void> {
    // 1. Play pre-generated audio if present
    if (audioPath) {
      try {
        const audio = new Audio(audioPath);
        await audio.play();
        return;
      } catch (err) {
        console.warn('Pre-generated audio playback failed, falling back to speech synthesis:', err);
      }
    }

    // 2. Web Speech API Synthesis fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // cancel pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95; // slightly slower for language learners

      // Pick an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => (v.lang === 'en-US' || v.lang.startsWith('en')) && (v.name.includes('Natural') || v.name.includes('Google'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferred) {
        utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
    }
  }
}

export const ttsService = new DefaultTTSProvider();

export function playTtsAudio(text: string, audioPath?: string | null) {
  ttsService.speak(text, audioPath);
}
