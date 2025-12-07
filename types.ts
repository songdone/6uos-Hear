
export interface Chapter {
  title: string;
  startTime: number; // seconds (global)
  duration: number;
}

export interface Track {
  id: string;
  url: string;
  duration: number;
  filename: string;
  format: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  time: number;
  note: string;
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  avatarUrl?: string;
}

export interface HistoryEntry {
  id: string;
  bookId: string;
  timestamp: number;
  durationListened: number; // seconds
}

export interface Book {
  id: string;
  title: string;
  author: string;
  narrator?: string;
  publisher?: string;
  coverUrl: string;
  duration: number; // in seconds (Total)
  progress: number; // in seconds (Global)
  description?: string;
  addedAt: number;
  seriesId?: string;
  series?: string;
  seriesIndex?: number;
  folderPath?: string;
  scrapeConfidence?: number;
  metadataSource?: string;
  reviewNeeded?: boolean;
  ingestNotes?: string;

  // Frontend Structure
  chapters?: Chapter[];
  tracks?: Track[]; // Backend AudioFiles mapped to Tracks
  audioUrl?: string; // Fallback or direct URL
  
  isLiked?: boolean;
  bookmarks?: Bookmark[];
  characters?: Character[];
  tags?: string[];
  trackNumber?: number; 
  fileType?: string; 
}

export interface Series {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  books: string[];
}

export interface MetadataProvider {
  id: string;
  name: string;
  mediaType: string;
  url: string;
  token: string;
  isEnabled: boolean;
}

export interface UserPreferences {
  // Appearance
  darkMode: boolean;
  oledMode: boolean; 
  uiScale: 'normal' | 'large';
  reduceMotion: boolean; // General animations
  highContrast: boolean; // New: Accessibility
  coverRotation: boolean; // New: Vinyl spin toggle
  
  // Playback
  dailyGoalMinutes: number;
  keepPitch: boolean;
  seekInterval: number;
  autoRewind: boolean;
  smartVolume: boolean;
  skipSilence: boolean; 
  equalizerPreset: 'flat' | 'vocal' | 'bass';
  autoSleepDefault: number;
  keepScreenOn: boolean; // New: Wake Lock
  
  // Interaction & System
  ambience?: string; 
  ambienceVolume?: number;
  confirmDelete: boolean;
  showProgressInLibrary: boolean;
  saveHistoryLocally: boolean;
  
  // New Human-Centric Settings
  startupPage: 'library' | 'stats' | 'last-played'; // New
  hideCompleted: boolean; // New: Library filter
  enableGestures: boolean; // New: Double tap
  hapticFeedback: boolean; // New: Vibration
  autoBookmark: boolean; // New: Pause triggers bookmark
  showRemainingTime: boolean; // New: Player time format
  lockScreenControls: boolean; // New: MediaSession API toggle
  shakeToPlay: boolean; // New: Mobile gesture
  wifiOnlyDownload: boolean; // New: Mock logic for data saving

  // Real Scraper & Ingestion Settings
  scraper: {
    // Sources
    useItunes: boolean;
    useGoogleBooks: boolean;
    useOpenLibrary: boolean;
    customSourceUrl: string; // User defined JSON API
    
    // Ingestion Logic
    priorityNfo: boolean; // Read .nfo/.json sidecar files first
    extractEmbeddedCover: boolean; // Extract cover from MP3 tags
    folderAsSeries: boolean; // Treat parent folder as Series
    flattenMultiDisc: boolean; // Merge "CD1/CD2" folders
    ignorePatterns: string; // e.g. "sample,extras"
    
    // Renaming (The "Real" stuff)
    enableRenaming: boolean; // Dangerous switch
    renameTemplate: string; // e.g. "{Author}/{Series}/{Year} - {Title}"
    cleanFilename: boolean; // Remove special chars
  };
}

export interface User {
  username: string;
  isAuthenticated: boolean;
  preferences: UserPreferences;
  todayListened: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface PlayerState {
  currentBookId: string | null;
  isPlaying: boolean;
  currentTime: number; // Global Time
  duration: number; // Global Duration
  volume: number;
  speed: number;
  isFullScreen: boolean;
  sleepTimer: number | null;
  sleepEndOfChapter: boolean;
  zenMode: boolean;
  lastSeekPosition: number | null;
  lastPausedAt?: number | null;
  ambience: 'none' | 'rain' | 'fire' | 'forest';
  ambienceVolume: number;
  abLoop: { start: number | null; end: number | null; active: boolean };
  vocalBoost: boolean;
  
  // Internal for Multi-track
  currentTrackIndex: number;
}
