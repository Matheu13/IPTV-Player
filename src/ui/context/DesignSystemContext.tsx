import React, { createContext, useContext, useState, useEffect } from 'react';
import { UI_THEME } from '../theme';
import { globalCapabilityDetector, DevicePlatformProfile } from '../../lib/deviceCapabilityDetector';

export type PlatformTarget = 'windows' | 'android_tv' | 'fire_tv' | 'android_mobile' | 'macos' | 'linux';
export type DensityMode = 'compact' | 'comfortable' | 'spacious';
export type ThemeVariant = 'cinematic_dark' | 'midnight_glass' | 'high_contrast';

export interface DeviceCapabilitiesSummary {
  isTouch: boolean;
  hasHardwareAcceleration: boolean;
  maxTestedResolution: string;
  hdrSupported: boolean;
  allowBackdropBlur: boolean;
  isLowPowerDevice: boolean;
}

interface DesignSystemContextValue {
  theme: typeof UI_THEME;
  platform: PlatformTarget;
  setPlatform: (platform: PlatformTarget) => void;
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => void;
  capabilities: DeviceCapabilitiesSummary;
  isTV: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  focusSoundEnabled: boolean;
  setFocusSoundEnabled: (enabled: boolean) => void;
}

const DesignSystemContext = createContext<DesignSystemContextValue | undefined>(undefined);

export const DesignSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platform, setPlatform] = useState<PlatformTarget>(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('googletv') || ua.includes('android tv') || ua.includes('smart-tv') || ua.includes('crkey')) {
        return 'android_tv';
      }
      if (ua.includes('aft') || ua.includes('firetv') || ua.includes('silk')) {
        return 'fire_tv';
      }
      if (/android|iphone|ipad|ipod/.test(ua)) {
        return 'android_mobile';
      }
      if (ua.includes('mac')) return 'macos';
      if (ua.includes('linux')) return 'linux';
      return 'windows';
    }
    return 'windows';
  });

  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>('cinematic_dark');
  const [focusSoundEnabled, setFocusSoundEnabled] = useState(false);

  const [capabilities, setCapabilities] = useState<DeviceCapabilitiesSummary>({
    isTouch: false,
    hasHardwareAcceleration: true,
    maxTestedResolution: '4K',
    hdrSupported: false,
    allowBackdropBlur: true,
    isLowPowerDevice: false,
  });

  useEffect(() => {
    try {
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const isLowPower = platform === 'fire_tv' || platform === 'android_tv';
      
      const profile = globalCapabilityDetector.getProfile();
      setCapabilities({
        isTouch,
        hasHardwareAcceleration: profile?.hardwareAccelerationActive ?? true,
        maxTestedResolution: profile?.maximumTestedResolution ?? '4K',
        hdrSupported: profile?.display?.hdr?.highDynamicRange ?? false,
        allowBackdropBlur: !isLowPower,
        isLowPowerDevice: isLowPower,
      });
    } catch {
      // Fallback
    }
  }, [platform]);

  const isTV = platform === 'android_tv' || platform === 'fire_tv';
  const isMobile = platform === 'android_mobile';
  const isDesktop = platform === 'windows' || platform === 'macos' || platform === 'linux';

  return (
    <DesignSystemContext.Provider
      value={{
        theme: UI_THEME,
        platform,
        setPlatform,
        density,
        setDensity,
        themeVariant,
        setThemeVariant,
        capabilities,
        isTV,
        isMobile,
        isDesktop,
        focusSoundEnabled,
        setFocusSoundEnabled,
      }}
    >
      {children}
    </DesignSystemContext.Provider>
  );
};

export const useDesignSystem = (): DesignSystemContextValue => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};
