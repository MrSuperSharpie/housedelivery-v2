'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type AppTheme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'vero-theme'
const DEFAULT_THEME: AppTheme = 'light'

interface ThemeContextValue {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
})

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof document === 'undefined') return DEFAULT_THEME

    // 1. Prefer data-theme already on <html> (set by a prior applyTheme call
    //    in the same page session — e.g. from an inline script or hydration).
    const rootTheme = document.documentElement.dataset.theme
    if (rootTheme === 'light' || rootTheme === 'dark') return rootTheme

    // 2. Fall back to the value persisted in localStorage so the user's choice
    //    survives full page reloads. Without this, theme resets to DEFAULT_THEME
    //    on every refresh and the ThemeProvider/Tailwind dark: classes diverge.
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch { /* localStorage blocked (private browsing, etc.) */ }

    return DEFAULT_THEME
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme)
    applyTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
