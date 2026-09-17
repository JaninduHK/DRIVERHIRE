import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

// Reuses SecureStore (already a native dependency here for auth tokens) rather than
// pulling in AsyncStorage just for one preference — avoids a new native module + rebuild.
const STORAGE_KEY = 'carwithdriver_font_scale';

export type FontScaleOption = 'small' | 'default' | 'large';

export const FONT_SCALE_VALUES: Record<FontScaleOption, number> = {
  small: 0.9,
  default: 1,
  large: 1.15,
};

export const FONT_SCALE_OPTIONS: { key: FontScaleOption; label: string; sample: string }[] = [
  { key: 'small', label: 'Small', sample: 'Aa' },
  { key: 'default', label: 'Default', sample: 'Aa' },
  { key: 'large', label: 'Large', sample: 'Aa' },
];

interface FontScaleContextValue {
  option: FontScaleOption;
  scale: number;
  setOption: (option: FontScaleOption) => void;
}

const FontScaleContext = createContext<FontScaleContextValue>({
  option: 'default',
  scale: 1,
  setOption: () => {},
});

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [option, setOptionState] = useState<FontScaleOption>('default');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'small' || saved === 'default' || saved === 'large') setOptionState(saved);
      })
      .catch(() => {});
  }, []);

  const setOption = (next: FontScaleOption) => {
    setOptionState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  };

  return (
    <FontScaleContext.Provider value={{ option, scale: FONT_SCALE_VALUES[option], setOption }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export const useFontScale = () => useContext(FontScaleContext);
