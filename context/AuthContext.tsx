
import React, { createContext, useContext, useState } from 'react';
import { User, UserPreferences } from '../types';
import { STORAGE_KEYS } from '../constants';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  updateProfile: (username: string, password?: string) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  updateScraperSettings: (settings: Partial<UserPreferences['scraper']>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Failed to parse user from storage", e);
      return null;
    }
  });

  const login = (username: string, pass: string) => {
    const storedCreds = localStorage.getItem('6uos_creds');
    let validUser = 'admin';
    let validPass = '6uos666';
    
    if (storedCreds) {
        const c = JSON.parse(storedCreds);
        validUser = c.username;
        validPass = c.password;
    }

    if (username === validUser && pass === validPass) {
      const newUser: User = {
        username,
        isAuthenticated: true,
        preferences: {
          darkMode: false,
          oledMode: false,
          dailyGoalMinutes: 30,
          keepPitch: true,
          
          seekInterval: 15,
          autoRewind: true,
          confirmDelete: true,
          skipSilence: false, 
          uiScale: 'normal',
          reduceMotion: false,
          showProgressInLibrary: true,
          equalizerPreset: 'flat',
          smartVolume: false,
          autoSleepDefault: 30,
          saveHistoryLocally: true,

          keepScreenOn: false,
          coverRotation: true,
          highContrast: false,
          startupPage: 'library',
          hideCompleted: false,
          enableGestures: true,
          hapticFeedback: true,
          autoBookmark: false,
          showRemainingTime: false,
          lockScreenControls: true,
          shakeToPlay: false,
          wifiOnlyDownload: true,

          scraper: {
            useItunes: true,
            useGoogleBooks: true,
            useOpenLibrary: true,
            customSourceUrl: '',
            
            priorityNfo: true,
            extractEmbeddedCover: true,
            folderAsSeries: false,
            flattenMultiDisc: true,
            ignorePatterns: 'extras, sample, artwork',
            
            enableRenaming: false,
            renameTemplate: '{Author}/{Year} - {Title}',
            cleanFilename: true,
          }
        },
        todayListened: 0
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      setUser(newUser);
      return true;
    }
    return false;
  };

  const updateProfile = (newUsername: string, newPassword?: string) => {
      const currentCreds = localStorage.getItem('6uos_creds');
      const creds = currentCreds ? JSON.parse(currentCreds) : { username: 'admin', password: '6uos666' };
      creds.username = newUsername;
      if (newPassword) creds.password = newPassword;
      localStorage.setItem('6uos_creds', JSON.stringify(creds));
      
      if (user) {
          const updatedUser = { ...user, username: newUsername };
          setUser(updatedUser);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      }
  };

  const updatePreferences = (prefs: Partial<UserPreferences>) => {
      if (!user) return;
      const updatedUser = { 
          ...user, 
          preferences: { ...user.preferences, ...prefs } 
      };
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
  };

  const updateScraperSettings = (settings: Partial<UserPreferences['scraper']>) => {
      if (!user) return;
      const updatedUser = {
          ...user,
          preferences: {
              ...user.preferences,
              scraper: { ...user.preferences.scraper, ...settings }
          }
      };
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateProfile, updatePreferences, updateScraperSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
