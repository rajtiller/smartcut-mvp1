export interface AppSettings {
  silenceThreshold: number; // 0.1 - 1.0
  minSilenceDuration: number; // 0.5 - 5.0 seconds
}

const STORAGE_KEY = "smartcut_settings";
const DEFAULT_SETTINGS: AppSettings = {
  silenceThreshold: 0.4,
  minSilenceDuration: 1.0,
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      // Validate and merge with defaults
      return {
        silenceThreshold: typeof parsed.silenceThreshold === 'number' 
          ? Math.max(0.1, Math.min(1.0, parsed.silenceThreshold))
          : DEFAULT_SETTINGS.silenceThreshold,
        minSilenceDuration: typeof parsed.minSilenceDuration === 'number'
          ? Math.max(0.5, Math.min(5.0, parsed.minSilenceDuration))
          : DEFAULT_SETTINGS.minSilenceDuration,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: Partial<AppSettings>): void => {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const resetSettings = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

