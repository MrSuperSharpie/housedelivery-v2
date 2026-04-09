'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type AppTheme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'siteline-theme'
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

    const rootTheme = document.documentElement.dataset.theme
    return rootTheme === 'light' || rootTheme === 'dark'
      ? rootTheme
      : DEFAULT_THEME
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
