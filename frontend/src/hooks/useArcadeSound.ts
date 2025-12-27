import { useCallback, useEffect, useRef, useState } from 'react';

export type SoundEvent =
  | 'click'
  | 'select'
  | 'submit'
  | 'created'
  | 'join'
  | 'start'
  | 'winner'
  | 'error';

const SOUND_FILES: Record<SoundEvent, string> = {
  click: '/sounds/click.mp3',
  select: '/sounds/select.mp3',
  submit: '/sounds/submit.mp3',
  created: '/sounds/game-created.mp3',
  join: '/sounds/player-join.mp3',
  start: '/sounds/game-start.mp3',
  winner: '/sounds/winner.mp3',
  error: '/sounds/error.mp3',
};

const MUTE_STORAGE_KEY = 'arcade-sound-muted';

export function useArcadeSound() {
  const audioCache = useRef<Map<SoundEvent, HTMLAudioElement>>(new Map());
  const [isMuted, setIsMuted] = useState(() => {
    // Load mute state from localStorage
    const stored = localStorage.getItem(MUTE_STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    // Preload all sounds
    Object.entries(SOUND_FILES).forEach(([event, path]) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 0.5; // Default volume at 50%

      // Set source and handle load errors gracefully
      audio.src = path;
      audio.addEventListener('error', () => {
        console.warn(`Failed to load sound: ${path}`);
      });

      audioCache.current.set(event as SoundEvent, audio);
    });

    return () => {
      // Cleanup on unmount
      audioCache.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioCache.current.clear();
    };
  }, []);

  const play = useCallback(
    (event: SoundEvent) => {
      if (isMuted) return;

      const audio = audioCache.current.get(event);
      if (!audio) {
        console.warn(`Sound not found: ${event}`);
        return;
      }

      // Reset to start and play
      audio.currentTime = 0;
      audio.play().catch((err) => {
        // Browsers may block autoplay - this is expected behavior
        console.debug('Sound play blocked:', err);
      });
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      localStorage.setItem(MUTE_STORAGE_KEY, String(newMuted));
      return newMuted;
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioCache.current.forEach((audio) => {
      audio.volume = clampedVolume;
    });
  }, []);

  return {
    play,
    toggleMute,
    setVolume,
    isMuted,
  };
}
