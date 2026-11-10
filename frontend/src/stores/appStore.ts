import { NODE_IDS, type LanguageCode, type QrCheckpoint, type UserProfile } from '@medipath/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type BuildingStyleMode = 'cutaway' | 'realistic';

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0A1519' : '#102C35');
  }
}

export interface AppState {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  toggleLanguage: () => void;

  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  buildingStyle: BuildingStyleMode;
  setBuildingStyle: (style: BuildingStyleMode) => void;
  toggleBuildingStyle: () => void;

  token: string | null;
  user: UserProfile | null;
  setSession: (user: UserProfile, token: string) => void;
  clearSession: () => void;
  updateUserProfileLocal: (user: UserProfile) => void;

  // Shared 3D / 2D navigation workspace state
  startNodeId: string;
  endNodeId: string;
  accessibleOnly: boolean;
  viewMode: '3d' | '2d';
  exploded: boolean;
  selectedFloorId: string | 'all';
  activeStepIndex: number;
  activeQrCheckpoint: QrCheckpoint | null;

  setStartNodeId: (id: string) => void;
  setEndNodeId: (id: string) => void;
  setAccessibleOnly: (val: boolean) => void;
  setViewMode: (mode: '3d' | '2d') => void;
  setExploded: (val: boolean) => void;
  setSelectedFloorId: (id: string | 'all') => void;
  setActiveStepIndex: (idx: number) => void;
  setActiveQrCheckpoint: (cp: QrCheckpoint | null) => void;
  resetNavigationSelection: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
      toggleLanguage: () =>
        set((state) => ({ language: state.language === 'en' ? 'ta' : 'en' })),

      theme: 'light',
      setTheme: (theme) => {
        applyThemeToDocument(theme);
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const next: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
          applyThemeToDocument(next);
          return { theme: next };
        }),

      buildingStyle: 'cutaway',
      setBuildingStyle: (buildingStyle) => set({ buildingStyle }),
      toggleBuildingStyle: () =>
        set((state) => ({
          buildingStyle: state.buildingStyle === 'cutaway' ? 'realistic' : 'cutaway',
        })),

      token: null,
      user: null,
      setSession: (user, token) =>
        set({
          user,
          token,
          language: user.preferredLanguage ?? 'en',
          accessibleOnly: user.accessibilityRequired ?? false,
        }),
      clearSession: () => set({ user: null, token: null }),
      updateUserProfileLocal: (user) =>
        set({ user, language: user.preferredLanguage ?? 'en' }),

      startNodeId: NODE_IDS.L0_ENTRANCE,
      endNodeId: NODE_IDS.L2_CARDIOLOGY,
      accessibleOnly: false,
      viewMode: '3d',
      exploded: true,
      selectedFloorId: 'all',
      activeStepIndex: 0,
      activeQrCheckpoint: null,

      setStartNodeId: (startNodeId) =>
        set({ startNodeId, activeQrCheckpoint: null, activeStepIndex: 0 }),
      setEndNodeId: (endNodeId) => set({ endNodeId, activeStepIndex: 0 }),
      setAccessibleOnly: (accessibleOnly) => set({ accessibleOnly, activeStepIndex: 0 }),
      setViewMode: (viewMode) => set({ viewMode }),
      setExploded: (exploded) => set({ exploded }),
      setSelectedFloorId: (selectedFloorId) => set({ selectedFloorId }),
      setActiveStepIndex: (activeStepIndex) => set({ activeStepIndex }),
      setActiveQrCheckpoint: (activeQrCheckpoint) =>
        set({
          activeQrCheckpoint,
          startNodeId: activeQrCheckpoint ? activeQrCheckpoint.nodeId : NODE_IDS.L0_ENTRANCE,
          activeStepIndex: 0,
        }),
      resetNavigationSelection: () =>
        set({
          startNodeId: NODE_IDS.L0_ENTRANCE,
          endNodeId: NODE_IDS.L2_CARDIOLOGY,
          selectedFloorId: 'all',
          exploded: true,
          buildingStyle: 'cutaway',
          activeStepIndex: 0,
          activeQrCheckpoint: null,
        }),
    }),
    {
      name: 'medipath-app-store-v1',
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        buildingStyle: state.buildingStyle,
        token: state.token,
        user: state.user,
        accessibleOnly: state.accessibleOnly,
        viewMode: state.viewMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeToDocument(state.theme);
        }
      },
    },
  ),
);
