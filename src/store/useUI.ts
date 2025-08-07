import { create } from 'zustand';

type UIState = {
  darkMode: boolean;
  animationSpeed: number; // 0.5x .. 2x
  prefersReducedMotion: boolean;

  // Inflation balloon defaults
  balloon: {
    particles: number;
    mass: number;      // kg (relative)
    temperature: number; // K (relative)
    radius: number;    // meters (relative volume)
    gravity: boolean;
    paused: boolean;
  };

  setDarkMode(v: boolean): void;
  setAnimationSpeed(v: number): void;
  setPrefersReducedMotion(v: boolean): void;

  setBalloon<K extends keyof UIState['balloon']>(k: K, v: UIState['balloon'][K]): void;
};

export const useUI = create<UIState>((set) => ({
  darkMode: true,
  animationSpeed: 1,
  prefersReducedMotion: false,

  balloon: {
    particles: 400,
    mass: 1,
    temperature: 300,
    radius: 1.4,
    gravity: false,
    paused: false
  },

  setDarkMode: (v) => set({ darkMode: v }),
  setAnimationSpeed: (v) => set({ animationSpeed: v }),
  setPrefersReducedMotion: (v) => set({ prefersReducedMotion: v }),

  setBalloon: (k, v) => set((s) => ({ balloon: { ...s.balloon, [k]: v } }))
}));