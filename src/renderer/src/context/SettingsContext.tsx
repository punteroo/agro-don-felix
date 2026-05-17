import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type FontSize  = 'small' | 'normal' | 'large' | 'xlarge'
export type ColorMode = 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'high-contrast'

interface SettingsContextValue {
  fontSize:     FontSize
  colorMode:    ColorMode
  setFontSize:  (size: FontSize)  => void
  setColorMode: (mode: ColorMode) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  fontSize:     'normal',
  colorMode:    'normal',
  setFontSize:  () => {},
  setColorMode: () => {}
})

// SVG color-matrix filters for color vision deficiency simulation.
// Matrices sourced from well-established CVD simulation models.
const CVD_FILTERS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>
    <filter id="cvd-deuteranopia">
      <feColorMatrix type="matrix" values="
        0.625  0.375  0      0  0
        0.700  0.300  0      0  0
        0      0.300  0.700  0  0
        0      0      0      1  0"/>
    </filter>
    <filter id="cvd-protanopia">
      <feColorMatrix type="matrix" values="
        0.567  0.433  0      0  0
        0.558  0.442  0      0  0
        0      0.242  0.758  0  0
        0      0      0      1  0"/>
    </filter>
    <filter id="cvd-tritanopia">
      <feColorMatrix type="matrix" values="
        0.950  0.050  0      0  0
        0      0.433  0.567  0  0
        0      0.475  0.525  0  0
        0      0      0      1  0"/>
    </filter>
  </defs>
</svg>`

const FILTER_MAP: Record<ColorMode, string> = {
  'normal':        '',
  'deuteranopia':  'url(#cvd-deuteranopia)',
  'protanopia':    'url(#cvd-protanopia)',
  'tritanopia':    'url(#cvd-tritanopia)',
  'high-contrast': 'contrast(1.5) saturate(1.2)'
}

function resolveInitialFontSize(): FontSize {
  const stored = localStorage.getItem('ui-font-size')
  if (stored === 'small' || stored === 'normal' || stored === 'large' || stored === 'xlarge')
    return stored
  return 'normal'
}

function resolveInitialColorMode(): ColorMode {
  const stored = localStorage.getItem('ui-color-mode')
  if (
    stored === 'normal'       || stored === 'deuteranopia' ||
    stored === 'protanopia'   || stored === 'tritanopia'   ||
    stored === 'high-contrast'
  )
    return stored
  return 'normal'
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize,  setFontSizeState]  = useState<FontSize>(resolveInitialFontSize)
  const [colorMode, setColorModeState] = useState<ColorMode>(resolveInitialColorMode)

  // Tracks the injected SVG container so it can be cleaned up on unmount.
  const svgContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = document.createElement('div')
    container.id    = 'cvd-filter-defs'
    container.innerHTML = CVD_FILTERS_SVG
    document.body.insertBefore(container, document.body.firstChild)
    svgContainerRef.current = container
    return () => container.remove()
  }, [])

  // Apply font-size scale via data attribute on the root html element.
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    localStorage.setItem('ui-font-size', fontSize)
  }, [fontSize])

  // Apply color filter to the html element so it covers every rendered pixel.
  useEffect(() => {
    document.documentElement.style.filter = FILTER_MAP[colorMode]
    localStorage.setItem('ui-color-mode', colorMode)
  }, [colorMode])

  function setFontSize(size: FontSize) {
    setFontSizeState(size)
  }

  function setColorMode(mode: ColorMode) {
    setColorModeState(mode)
  }

  return (
    <SettingsContext.Provider value={{ fontSize, colorMode, setFontSize, setColorMode }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
