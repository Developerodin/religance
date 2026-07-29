"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeState = {
  class: "dark" | "light";
  dir: "ltr" | "rtl";
  dataNavLayout: "vertical" | "horizontal";
  dataVerticalStyle: string;
  dataToggled: string;
  dataNavStyle: string;
  iconOverlay: string;
  dataHeaderStyles: string;
  dataMenuStyles: string;
  dataPageStyle: string;
  dataWidth: string;
  dataMenuPosition: string;
  dataHeaderPosition: string;
  horStyle: string;
  bgImg: string;
  iconText: string;
  body: string;
  colorPrimaryRgb: string;
  colorPrimary: string;
  bodyBg: string;
  darkBg: string;
  inputBorder: string;
  Light: string;
};

export const DEFAULT_THEME: ThemeState = {
  class: "dark",
  dir: "ltr",
  dataNavLayout: "vertical",
  dataVerticalStyle: "overlay",
  dataToggled: "",
  dataNavStyle: "",
  iconOverlay: "",
  dataHeaderStyles: "dark",
  dataMenuStyles: "dark",
  dataPageStyle: "regular",
  dataWidth: "fullwidth",
  dataMenuPosition: "fixed",
  dataHeaderPosition: "fixed",
  horStyle: "",
  bgImg: "",
  iconText: "",
  body: "",
  colorPrimaryRgb: "232, 118, 108",
  colorPrimary: "232 118 108",
  bodyBg: "",
  darkBg: "",
  inputBorder: "",
  Light: "",
};

const LIGHT_PATCH: Partial<ThemeState> = {
  class: "light",
  dataHeaderStyles: "light",
  colorPrimary: "156 48 52",
  colorPrimaryRgb: "156, 48, 52",
  bodyBg: "245 239 228",
  darkBg: "",
  inputBorder: "",
  Light: "",
  dataMenuStyles: "dark",
};

const DARK_PATCH: Partial<ThemeState> = {
  class: "dark",
  dataHeaderStyles: "dark",
  dataMenuStyles: "dark",
  colorPrimary: "232 118 108",
  colorPrimaryRgb: "232, 118, 108",
  bodyBg: "",
  darkBg: "",
  inputBorder: "",
  Light: "",
};

type ThemeContextValue = {
  theme: ThemeState;
  setTheme: (patch: Partial<ThemeState>) => void;
  applyDark: () => void;
  applyLight: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("ynexlighttheme") === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  const setTheme = useCallback((patch: Partial<ThemeState>) => {
    setThemeState((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyDark = useCallback(() => {
    setThemeState((prev) => ({ ...prev, ...DARK_PATCH }));
    localStorage.setItem("ynexdarktheme", "dark");
    localStorage.removeItem("ynexlighttheme");
  }, []);

  const applyLight = useCallback(() => {
    setThemeState((prev) => ({ ...prev, ...LIGHT_PATCH }));
    localStorage.setItem("ynexlighttheme", "light");
    localStorage.removeItem("ynexdarktheme");
  }, []);

  useEffect(() => {
    if (readStoredMode() === "light") {
      setThemeState((prev) => ({ ...prev, ...LIGHT_PATCH }));
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, applyDark, applyLight }),
    [theme, setTheme, applyDark, applyLight]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
