import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export type RatingLimit = 'TV-Y' | 'TV-Y7' | 'TV-G' | 'TV-PG' | 'PG' | 'TV-14' | 'PG-13' | 'TV-MA' | 'R' | 'ALL';

export interface UserProfile {
  id: string;
  name: string;
  avatarType: 'avatar_man' | 'avatar_boy' | 'avatar_girl' | 'avatar_woman' | 'avatar_robot' | 'avatar_cat' | 'avatar_star';
  avatarBg: string;
  isKids: boolean;
  ratingLimit: RatingLimit;
  pin?: string; // Optional 4-digit PIN to exit kids mode or protect adult profile
  createdAt: number;
}

interface ProfileContextType {
  profiles: UserProfile[];
  currentProfile: UserProfile;
  isKidsMode: boolean;
  autoContinue: boolean;
  isWhoIsWatchingOpen: boolean;
  isManagingProfiles: boolean;
  selectProfile: (profileId: string, pinInput?: string) => { success: boolean; requiresPin?: boolean; error?: string };
  createProfile: (data: { name: string; avatarType: UserProfile['avatarType']; avatarBg: string; isKids: boolean; pin?: string }) => UserProfile;
  updateProfile: (profileId: string, updates: Partial<UserProfile>) => void;
  deleteProfile: (profileId: string) => boolean;
  toggleAutoContinue: () => void;
  openWhoIsWatching: () => void;
  closeWhoIsWatching: () => void;
  setIsManagingProfiles: (val: boolean) => void;
  filterChannelsForProfile: <T extends { name: string; category?: string; rating?: string }>(channels: T[]) => T[];
}

const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'prof-mr',
    name: 'mr',
    avatarType: 'avatar_man',
    avatarBg: '#2563eb', // Blue matching screenshot
    isKids: false,
    ratingLimit: 'ALL',
    createdAt: 1700000000000,
  },
  {
    id: 'prof-kids',
    name: 'Kids',
    avatarType: 'avatar_boy',
    avatarBg: '#059669', // Emerald green
    isKids: true,
    ratingLimit: 'TV-PG',
    pin: '0000', // Default parental pin
    createdAt: 1700000001000,
  },
];

const STORAGE_PROFILES_KEY = 'tvlok_user_profiles_v1';
const STORAGE_CURRENT_PROFILE_KEY = 'tvlok_current_profile_id_v1';
const STORAGE_AUTOCONTINUE_KEY = 'tvlok_auto_continue_v1';

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Ratings hierarchy for Kids PG enforcement
const SAFE_PG_RATINGS = new Set(['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'G', 'PG', 'APPROVED', 'ALL']);
const EXPLICIT_ADULT_KEYWORDS = [
  'XXX', 'ADULT', '18+', 'PLAYBOY', 'EROTIC', 'HUSTLER', 'MIDNIGHT', 'HORROR',
  'CRIME & INVESTIGATION', 'CSI', 'BLOOD', 'VIOLENCE'
];
const KIDS_FAMILY_KEYWORDS = [
  'KIDS', 'ANIMATION', 'CARTOON', 'DISNEY', 'NICKELODEON', 'NICK', 'CBBC',
  'CBEEBIES', 'BABY', 'POP MAX', 'CARTOON NETWORK', 'BOOMERANG', 'TOON',
  'FAMILY', 'EDUCATION', 'JUNIOR', 'YOUTH', 'ANIME PG'
];

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Profiles storage
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PROFILES;
  });

  // 2. Auto-continue state (persisted)
  const [autoContinue, setAutoContinue] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTOCONTINUE_KEY);
      return saved === 'true'; // Default is false as seen in the reference screenshot ("Auto-continue: Off")
    } catch {
      return false;
    }
  });

  // 3. Current active profile
  const [currentProfileId, setCurrentProfileId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_CURRENT_PROFILE_KEY);
      if (savedId && profiles.some((p) => p.id === savedId)) {
        return savedId;
      }
    } catch {
      // Fallback
    }
    return profiles[0]?.id || 'prof-mr';
  });

  // 4. Modal visibility (Default to false so the main app always loads directly without blocking gates)
  const [isWhoIsWatchingOpen, setIsWhoIsWatchingOpen] = useState<boolean>(false);
  const [isManagingProfiles, setIsManagingProfiles] = useState<boolean>(false);

  // Sync profiles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn('Failed to save profiles to localStorage', e);
    }
  }, [profiles]);

  // Sync current profile id
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CURRENT_PROFILE_KEY, currentProfileId);
    } catch (e) {
      console.warn('Failed to save current profile to localStorage', e);
    }
  }, [currentProfileId]);

  // Sync autoContinue
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_AUTOCONTINUE_KEY, autoContinue.toString());
    } catch (e) {
      console.warn('Failed to save auto-continue to localStorage', e);
    }
  }, [autoContinue]);

  const currentProfile = useMemo(() => {
    return profiles.find((p) => p.id === currentProfileId) || profiles[0] || DEFAULT_PROFILES[0];
  }, [profiles, currentProfileId]);

  const isKidsMode = Boolean(currentProfile?.isKids);

  const selectProfile = (profileId: string, pinInput?: string): { success: boolean; requiresPin?: boolean; error?: string } => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return { success: false, error: 'Profile not found' };

    // If currently in Kids profile and switching to an adult profile with PIN protection
    if (currentProfile.isKids && !target.isKids) {
      const requiredPin = currentProfile.pin || '0000';
      if (!pinInput) {
        return { success: false, requiresPin: true };
      }
      if (pinInput !== requiredPin) {
        return { success: false, requiresPin: true, error: 'Incorrect Parental PIN (Default is 0000)' };
      }
    }

    // If target adult profile has a private PIN
    if (target.pin && !currentProfile.isKids && target.id !== currentProfile.id) {
      if (!pinInput) {
        return { success: false, requiresPin: true };
      }
      if (pinInput !== target.pin) {
        return { success: false, requiresPin: true, error: 'Incorrect Profile PIN' };
      }
    }

    setCurrentProfileId(target.id);
    setIsWhoIsWatchingOpen(false);
    setIsManagingProfiles(false);
    return { success: true };
  };

  const createProfile = (data: {
    name: string;
    avatarType: UserProfile['avatarType'];
    avatarBg: string;
    isKids: boolean;
    pin?: string;
  }): UserProfile => {
    const newProfile: UserProfile = {
      id: `prof-${Date.now()}`,
      name: data.name.trim() || 'New User',
      avatarType: data.avatarType,
      avatarBg: data.avatarBg,
      isKids: data.isKids,
      ratingLimit: data.isKids ? 'TV-PG' : 'ALL',
      pin: data.pin,
      createdAt: Date.now(),
    };

    setProfiles((prev) => [...prev, newProfile]);
    return newProfile;
  };

  const updateProfile = (profileId: string, updates: Partial<UserProfile>) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, ...updates } : p))
    );
  };

  const deleteProfile = (profileId: string): boolean => {
    if (profiles.length <= 1) return false; // Prevent deleting last remaining profile
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    if (currentProfileId === profileId) {
      const nextAvailable = profiles.find((p) => p.id !== profileId);
      if (nextAvailable) setCurrentProfileId(nextAvailable.id);
    }
    return true;
  };

  const toggleAutoContinue = () => {
    setAutoContinue((prev) => !prev);
  };

  const openWhoIsWatching = () => {
    setIsWhoIsWatchingOpen(true);
    setIsManagingProfiles(false);
  };

  const closeWhoIsWatching = () => {
    setIsWhoIsWatchingOpen(false);
    setIsManagingProfiles(false);
  };

  /**
   * Safe content filtering engine for Kids Profiles:
   * Pulls only PG / G / TV-Y / TV-Y7 / TV-G / TV-PG rated content or Kids/Family categories
   */
  const filterChannelsForProfile = <T extends { name: string; category?: string; rating?: string }>(
    channels: T[]
  ): T[] => {
    if (!isKidsMode) return channels;

    return channels.filter((item) => {
      const name = (item.name || '').toUpperCase();
      const cat = (item.category || '').toUpperCase();
      const rating = (item.rating || '').toUpperCase();

      // 1. Strict rejection of explicit adult or mature keywords
      for (const kw of EXPLICIT_ADULT_KEYWORDS) {
        if (name.includes(kw) || cat.includes(kw)) {
          return false;
        }
      }

      // 2. Reject mature broadcast ratings
      if (rating === 'TV-MA' || rating === 'R' || rating === 'NC-17' || rating === '18+') {
        return false;
      }

      // 3. Positive match for family/kids categories or names
      for (const kw of KIDS_FAMILY_KEYWORDS) {
        if (name.includes(kw) || cat.includes(kw)) {
          return true;
        }
      }

      // 4. Safe rating whitelist (TV-Y, TV-Y7, TV-G, TV-PG, G, PG)
      if (rating && SAFE_PG_RATINGS.has(rating)) {
        return true;
      }

      // 5. If rating is TV-14 or unknown, allow only general entertainment/documentary/nature/science
      if (
        cat.includes('DOCUMENTARY') ||
        cat.includes('NATURE') ||
        cat.includes('SCIENCE') ||
        cat.includes('ANIMATION') ||
        cat.includes('GENERAL') ||
        cat.includes('KIDS')
      ) {
        return true;
      }

      return false;
    });
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        currentProfile,
        isKidsMode,
        autoContinue,
        isWhoIsWatchingOpen,
        isManagingProfiles,
        selectProfile,
        createProfile,
        updateProfile,
        deleteProfile,
        toggleAutoContinue,
        openWhoIsWatching,
        closeWhoIsWatching,
        setIsManagingProfiles,
        filterChannelsForProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

const DEFAULT_FALLBACK_PROFILE: UserProfile = {
  id: 'prof-mr',
  name: 'mr',
  avatarType: 'avatar_man',
  avatarBg: '#2563eb',
  isKids: false,
  ratingLimit: 'ALL',
  createdAt: 1700000000000,
};

const DEFAULT_FALLBACK_CONTEXT: ProfileContextType = {
  profiles: DEFAULT_PROFILES,
  currentProfile: DEFAULT_FALLBACK_PROFILE,
  isKidsMode: false,
  autoContinue: false,
  isWhoIsWatchingOpen: false,
  isManagingProfiles: false,
  selectProfile: () => ({ success: true }),
  createProfile: () => DEFAULT_FALLBACK_PROFILE,
  updateProfile: () => {},
  deleteProfile: () => false,
  toggleAutoContinue: () => {},
  openWhoIsWatching: () => {},
  closeWhoIsWatching: () => {},
  setIsManagingProfiles: () => {},
  filterChannelsForProfile: (channels) => channels,
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    console.warn('useProfile accessed outside ProfileProvider. Providing fallback context.');
    return DEFAULT_FALLBACK_CONTEXT;
  }
  return context;
};
