
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Book, PlayerState, Chapter, Series, Bookmark, HistoryEntry, Track, MetadataProvider, ToastMessage } from '../types';
import { STORAGE_KEYS, DEFAULT_BOOKS, MOCK_SERIES } from '../constants';
import { useAuth } from './AuthContext';

interface PlayerContextType extends PlayerState {
  playBook: (bookId: string) => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  setSpeed: (speed: number) => void;
  seek: (time: number, isAuto?: boolean) => void; 
  undoSeek: () => void;
  toggleFullScreen: () => void;
  openFullScreen: () => void;
  closeFullScreen: () => void;
  setSleepTimer: (minutes: number | null, endOfChapter?: boolean) => void;
  toggleZenMode: () => void;
  
  setAmbience: (type: 'none' | 'rain' | 'fire' | 'forest') => void;
  setAmbienceVolume: (vol: number) => void;

  setABLoop: (start: number | null, end: number | null) => void;
  clearABLoop: () => void;
  toggleVocalBoost: () => void;
  skipChapter: (direction: 'prev' | 'next') => void;

  books: Book[];
  series: Series[];
  history: HistoryEntry[];
  authorImages: Record<string, string>;
  dailyProgress: number; 
  dailyGoal: number; 
  
  getBook: (id: string | null) => Book | undefined;
  
  playChapter: (chapter: Chapter) => void;
  updateBook: (updatedBook: Book) => void;
  deleteBook: (bookId: string) => void;
  toggleLike: (bookId: string) => void;
  
  addBookmark: (bookId: string, time: number, note: string) => void;
  deleteBookmark: (bookId: string, bookmarkId: string) => void;
  playRandom: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  
  importLocalFiles: (files: FileList) => void;
  metadataProviders: MetadataProvider[];
  addMetadataProvider: (p: MetadataProvider) => void;
  removeMetadataProvider: (id: string) => void;

  addSeries: (series: Series) => void;
  updateSeries: (series: Series) => void;
  deleteSeries: (seriesId: string) => void;
  
  updateAuthorImage: (authorName: string, imageUrl: string) => void;

  refreshLibrary: () => void; 
  simulateScan: (onLog: (msg: string) => void) => Promise<void>;
  
  toasts: ToastMessage[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const API_BASE = '/api'; // Relative path for proxy

// Real Ambience Sources (Google Sounds)
const AMBIENCE_URLS = {
    rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    fire: 'https://actions.google.com/sounds/v1/ambiences/fire.ogg',
    forest: 'https://actions.google.com/sounds/v1/relaxing/forest.ogg',
    none: ''
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); 
  
  const [state, setState] = useState<PlayerState>({
    currentBookId: null,
    currentTrackIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    speed: 1.0,
    isFullScreen: false,
    sleepTimer: null,
    sleepEndOfChapter: false,
    zenMode: false,
    lastSeekPosition: null,
    lastPausedAt: null,
    ambience: 'none',
    ambienceVolume: 0.2, // Default lower for background
    abLoop: { start: null, end: null, active: false },
    vocalBoost: false
  });

  const [books, setBooks] = useState<Book[]>([]);
  const booksRef = useRef<Book[]>([]);
  
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [authorImages, setAuthorImages] = useState<Record<string, string>>({});
  const [metadataProviders, setMetadataProviders] = useState<MetadataProvider[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [dailyProgress, setDailyProgress] = useState(0); 
  const dailyGoal = user?.preferences.dailyGoalMinutes || 30; 

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambienceAudioRef = useRef<HTMLAudioElement | null>(null); // Dedicated Ambience Player
  const lastProgressTickRef = useRef<number>(Date.now());
  const sleepTriggeredRef = useRef(false);
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // --- Helper: Convert Backend Book to Frontend Book ---
  const mapBackendBook = (b: any): Book => {
      const tracks: Track[] = (b.AudioFiles || []).map((f: any) => ({
          id: f.id,
          filename: f.filename,
          duration: f.duration || 0,
          url: `${API_BASE}/stream/${f.id}`,
          format: f.format
      }));

      // Calculate Chapters based on tracks (Auto-generate chapters if tracks > 1)
      let accumulatedTime = 0;
      const chapters: Chapter[] = tracks.map(t => {
          const c = {
              title: t.filename.replace(/\.[^/.]+$/, "").replace(/^\d+[\s.-]+/, ""),
              startTime: accumulatedTime,
              duration: t.duration
          };
          accumulatedTime += t.duration;
          return c;
      });

      return {
          id: b.id.toString(),
          title: b.title,
          author: b.author || 'Unknown',
          coverUrl: b.coverUrl || 'https://placehold.co/400x400',
          duration: b.duration || accumulatedTime,
          progress: 0, // Will be merged from local history
          addedAt: new Date(b.createdAt).getTime(),
          description: b.description,
          tracks: tracks,
          chapters: chapters,
          isLiked: false,
          folderPath: b.folderPath,
          scrapeConfidence: b.scrapeConfidence,
          metadataSource: b.metadataSource,
          reviewNeeded: b.reviewNeeded,
          tags: b.tags
      };
  };

  const loadData = useCallback(async () => {
      try {
          // 1. Fetch from API
          const res = await fetch(`${API_BASE}/books`);
          if (res.ok) {
              const data = await res.json();
              const remoteBooks = data.map(mapBackendBook);

              // 2. Merge with Local Progress/Preferences
              const localLibStr = localStorage.getItem(STORAGE_KEYS.LIBRARY);
              const localLib: Book[] = localLibStr ? JSON.parse(localLibStr) : [];
              const localMap = new Map(localLib.map((b) => [b.id, b]));

              const mergedBooks = remoteBooks.map((rb: Book) => {
                  if (localMap.has(rb.id)) {
                      const lb = localMap.get(rb.id)!;
                      return {
                          ...rb,
                          progress: lb.progress,
                          isLiked: lb.isLiked,
                          bookmarks: lb.bookmarks
                      };
                  }
                  return rb;
              });

              if (mergedBooks.length === 0 && !localLibStr) {
                  setBooks(DEFAULT_BOOKS);
                  booksRef.current = DEFAULT_BOOKS;
              } else {
                  setBooks(mergedBooks);
                  booksRef.current = mergedBooks;
              }
          }
      } catch (e) {
          console.error("Failed to load books from API, falling back to local.", e);
          const localLibStr = localStorage.getItem(STORAGE_KEYS.LIBRARY);
          if (localLibStr) {
             const bs = JSON.parse(localLibStr);
             setBooks(bs);
             booksRef.current = bs;
          } else {
             setBooks(DEFAULT_BOOKS);
             booksRef.current = DEFAULT_BOOKS;
          }
      }

      // Load other local data
      const localSeries = localStorage.getItem('6uos_series');
      if (localSeries) setSeriesList(JSON.parse(localSeries));
      else setSeriesList(MOCK_SERIES);
      
      const localAuthors = localStorage.getItem('6uos_authors');
      if (localAuthors) setAuthorImages(JSON.parse(localAuthors));
      
      const localHistory = localStorage.getItem('6uos_history');
      if (localHistory) setHistory(JSON.parse(localHistory));
  }, []);

  useEffect(() => {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
  }, [loadData]);

  // --- Ambience Audio Logic ---
  useEffect(() => {
      if (!ambienceAudioRef.current) {
          ambienceAudioRef.current = new Audio();
          ambienceAudioRef.current.loop = true;
      }
      
      const amb = ambienceAudioRef.current;
      amb.volume = state.ambienceVolume;

      const targetSrc = AMBIENCE_URLS[state.ambience];
      const currentSrc = amb.src;
      
      if (state.ambience !== 'none' && targetSrc) {
          if (currentSrc !== targetSrc) {
              amb.src = targetSrc;
              amb.play().catch(e => console.warn("Ambience autoplay blocked", e));
          } else if (amb.paused && state.isPlaying) {
              amb.play();
          }
      } else {
          amb.pause();
          if (state.ambience === 'none') {
              amb.removeAttribute('src'); 
          }
      }
      
      if (!state.isPlaying && !amb.paused) {
          amb.pause();
      } else if (state.isPlaying && state.ambience !== 'none' && amb.paused) {
          amb.play().catch(() => {});
      }

  }, [state.ambience, state.ambienceVolume, state.isPlaying]);


  // --- Helper to Find Track ---
  // Memoized strictly to avoid recreating
  const findTrackByTime = useCallback((book: Book, time: number) => {
      if (!book.tracks) return { index: 0, offset: 0 };
      let accum = 0;
      for (let i = 0; i < book.tracks.length; i++) {
          const dur = book.tracks[i].duration;
          if (time >= accum && time < accum + dur + 0.1) {
              return { index: i, offset: Math.max(0, time - accum) };
          }
          accum += dur;
      }
      return { index: book.tracks.length - 1, offset: 0 };
  }, []);

  const getBook = useCallback((id: string | null) => {
      return booksRef.current.find(b => b.id === id);
  }, []);

  // --- Actions (Stable References via useCallback) ---

  const computeSmartRewind = (pausedAt: number | null) => {
      if (!pausedAt) return 0;
      const diffMs = Date.now() - pausedAt;
      if (diffMs > 24 * 60 * 60 * 1000) return 60;
      if (diffMs > 60 * 60 * 1000) return 30;
      if (diffMs > 5 * 60 * 1000) return 10;
      return 0;
  };

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message: msg, type }]);
      setTimeout(() => removeToast(id), 3000);
  }, []);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // --- Sleep Timer / End-of-chapter watchdog ---
  useEffect(() => {
      if (!state.sleepTimer && !state.sleepEndOfChapter) {
          sleepTriggeredRef.current = false;
          return;
      }

      const interval = setInterval(() => {
          const book = getBook(state.currentBookId);
          const now = Date.now();

          if (state.sleepTimer && now >= state.sleepTimer && !sleepTriggeredRef.current) {
              audioRef.current?.pause();
              setState(prev => ({ ...prev, isPlaying: false, sleepTimer: null, sleepEndOfChapter: false }));
              sleepTriggeredRef.current = true;
              showToast('已按定时休眠暂停播放', 'info');
              return;
          }

          if (state.sleepEndOfChapter && book?.chapters?.length && state.currentBookId) {
              const active = book.chapters.find(c => state.currentTime >= c.startTime && state.currentTime < c.startTime + c.duration);
              if (!active && !sleepTriggeredRef.current) {
                  audioRef.current?.pause();
                  setState(prev => ({ ...prev, isPlaying: false, sleepTimer: null, sleepEndOfChapter: false }));
                  sleepTriggeredRef.current = true;
                  showToast('本章播放完毕，已为你暂停', 'info');
              }
          }
      }, 700);

      return () => clearInterval(interval);
  }, [getBook, showToast, state.currentBookId, state.currentTime, state.sleepEndOfChapter, state.sleepTimer]);

  const playBook = useCallback((bookId: string) => {
      const book = booksRef.current.find(b => b.id === bookId);
      if (!book) return;

      // Access state from ref or functional update to ensure we don't depend on unstable `state`
      // But we need to check current ID. We will use the functional form check or trust audioRef for current source.
      
      setState(prev => {
          if (prev.currentBookId === bookId) {
              // Toggle logic for same book
              if (prev.isPlaying) {
                  audioRef.current?.pause();
                  return { ...prev, isPlaying: false };
              } else {
                  audioRef.current?.play();
                  return { ...prev, isPlaying: true };
              }
          }

          // Switching Book
          const resumeTime = book.progress || 0;
          
          if (book.tracks && book.tracks.length > 0) {
              const { index, offset } = findTrackByTime(book, resumeTime);
              
              if(audioRef.current) {
                  audioRef.current.src = book.tracks[index].url;
                  audioRef.current.currentTime = offset;
                  audioRef.current.play();
              }

              sessionStartRef.current = Date.now();
              return {
                  ...prev,
                  currentBookId: bookId,
                  currentTrackIndex: index,
                  currentTime: resumeTime,
                  duration: book.duration,
                  isPlaying: true,
                  lastPausedAt: null,
                  abLoop: { start: null, end: null, active: false }
              };
          } else if (book.audioUrl) {
              if(audioRef.current) {
                  audioRef.current.src = book.audioUrl;
                  audioRef.current.currentTime = resumeTime;
                  audioRef.current.play();
              }
              
              sessionStartRef.current = Date.now();
              return {
                  ...prev,
                  currentBookId: bookId,
                  currentTrackIndex: 0,
                  currentTime: resumeTime,
                  duration: book.duration,
                  isPlaying: true,
                  lastPausedAt: null,
                  abLoop: { start: null, end: null, active: false }
              };
          } else {
              // Can't show toast here easily without circular deps if we use showToast inside setState
              // We'll perform side effect outside
              setTimeout(() => showToast("该书籍没有可播放的音频文件", "error"), 0);
              return prev;
          }
      });
  }, [findTrackByTime, showToast]); // Stable deps

  const seek = useCallback((time: number, isAuto: boolean = false) => {
      setState(prev => {
          const book = booksRef.current.find(b => b.id === prev.currentBookId);
          if (!book) return prev;

          const safeTime = Math.max(0, Math.min(time, book.duration));
          
          if (book.tracks && book.tracks.length > 0) {
              const { index, offset } = findTrackByTime(book, safeTime);

              if (audioRef.current) {
                  if (index !== prev.currentTrackIndex) {
                      audioRef.current.src = book.tracks[index].url;
                      audioRef.current.currentTime = offset;
                      if (prev.isPlaying) audioRef.current.play();
                  } else {
                      if (Math.abs(audioRef.current.currentTime - offset) > 0.5) {
                          audioRef.current.currentTime = offset;
                      }
                  }
              }
              
              return {
                  ...prev,
                  currentTime: safeTime,
                  currentTrackIndex: index,
                  lastSeekPosition: isAuto ? null : prev.currentTime
              };
          } else if (book.audioUrl && audioRef.current) {
              audioRef.current.currentTime = safeTime;
              return {
                  ...prev,
                  currentTime: safeTime,
                  lastSeekPosition: isAuto ? null : prev.currentTime
              };
          }
          return prev;
      });
  }, [findTrackByTime]);

  const togglePlay = useCallback(() => setState(prev => {
      if (prev.currentBookId) {
          if (prev.isPlaying) {
              audioRef.current?.pause();
              return { ...prev, isPlaying: false, lastPausedAt: Date.now() };
          }

          const rewind = computeSmartRewind(prev.lastPausedAt ?? null);
          if (rewind > 0) {
              setTimeout(() => seek(Math.max(0, prev.currentTime - rewind), true), 0);
          }

          audioRef.current?.play();
          return { ...prev, isPlaying: true, lastPausedAt: null };
      }
      return prev;
  }), [computeSmartRewind, seek]);

  const setVolume = useCallback((v: number) => setState(prev => ({...prev, volume: v})), []);
  const setSpeed = useCallback((s: number) => setState(prev => ({...prev, speed: s})), []);
  const undoSeek = useCallback(() => setState(prev => {
      if (prev.lastSeekPosition !== null) {
          const t = prev.lastSeekPosition;
          setTimeout(() => seek(t, true), 0);
          return { ...prev, lastSeekPosition: null };
      }
      return prev;
  }), [seek]);
  
  const updateBook = useCallback((b: Book) => {
      setBooks(prev => {
          const newBooks = prev.map(old => old.id === b.id ? b : old);
          booksRef.current = newBooks;
          localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(newBooks));
          return newBooks;
      });
  }, []);
  
  const deleteBook = useCallback((id: string) => {
      setBooks(prev => {
          const newBooks = prev.filter(b => b.id !== id);
          booksRef.current = newBooks;
          localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(newBooks));
          return newBooks;
      });
  }, []);

  const toggleLike = useCallback((id: string) => {
      const b = booksRef.current.find(bk => bk.id === id);
      if(b) updateBook({...b, isLiked: !b.isLiked});
  }, [updateBook]);

  const playChapter = useCallback((c: Chapter) => seek(c.startTime), [seek]);
  
  const skipChapter = useCallback((dir: 'prev' | 'next') => {
      setState(prev => {
          const b = booksRef.current.find(bk => bk.id === prev.currentBookId);
          if (!b || !b.chapters) return prev;
          
          let idx = b.chapters.findIndex(c => prev.currentTime >= c.startTime && prev.currentTime < c.startTime + c.duration);
          if (idx === -1) idx = 0;

          let targetTime = 0;
          if (dir === 'prev') {
              if (prev.currentTime - b.chapters[idx].startTime < 3 && idx > 0) {
                  targetTime = b.chapters[idx - 1].startTime;
              } else {
                  targetTime = b.chapters[idx].startTime;
              }
          } else {
              if (idx < b.chapters.length - 1) {
                  targetTime = b.chapters[idx + 1].startTime;
              } else {
                  targetTime = b.duration;
              }
          }
          
          // Side effect seek
          setTimeout(() => seek(targetTime), 0);
          return prev;
      });
  }, [seek]);
  
  const setAmbience = useCallback((t: any) => setState(prev => ({...prev, ambience: t})), []);
  const setAmbienceVolume = useCallback((v: number) => setState(prev => ({...prev, ambienceVolume: v})), []);
  const setABLoop = useCallback((s: number|null, e: number|null) => setState(prev => ({...prev, abLoop: {start: s, end: e, active: true}})), []);
  const clearABLoop = useCallback(() => setState(prev => ({...prev, abLoop: {start: null, end: null, active: false}})), []);
  const toggleVocalBoost = useCallback(() => setState(prev => ({...prev, vocalBoost: !prev.vocalBoost})), []);
  const toggleFullScreen = useCallback(() => setState(prev => ({...prev, isFullScreen: !prev.isFullScreen})), []);
  const openFullScreen = useCallback(() => setState(prev => ({...prev, isFullScreen: true})), []);
  const closeFullScreen = useCallback(() => setState(prev => ({...prev, isFullScreen: false})), []);
  
  const setSleepTimer = useCallback((m: number|null, e: boolean = false) => {
     const t = m ? Date.now() + m * 60000 : null;
     sleepTriggeredRef.current = false;
     setState(prev => ({...prev, sleepTimer: t, sleepEndOfChapter: e}));
  }, []);
  
  const toggleZenMode = useCallback(() => setState(prev => ({...prev, zenMode: !prev.zenMode})), []);
  
  const addBookmark = useCallback((bid: string, t: number, n: string) => {
     const b = booksRef.current.find(bk => bk.id === bid);
     if(b) updateBook({...b, bookmarks: [...(b.bookmarks||[]), {id: Date.now().toString(), bookId: bid, time: t, note: n, createdAt: Date.now()}]});
  }, [updateBook]);

  const deleteBookmark = useCallback((bid: string, bmid: string) => {
     const b = booksRef.current.find(bk => bk.id === bid);
     if(b) updateBook({...b, bookmarks: b.bookmarks?.filter(bm => bm.id !== bmid)});
  }, [updateBook]);

  const playRandom = useCallback(() => {
     if(booksRef.current.length) playBook(booksRef.current[Math.floor(Math.random()*booksRef.current.length)].id);
  }, [playBook]);
  
  const importLocalFiles = useCallback(() => {}, []);
  const exportData = useCallback(() => JSON.stringify(booksRef.current), []);
  const importData = useCallback((json: string) => { try { const bs = JSON.parse(json); setBooks(bs); return true; } catch (e) { return false; } }, []);
  const addSeries = useCallback((s: Series) => { setSeriesList(prev => [...prev, s]); localStorage.setItem('6uos_series', JSON.stringify([...seriesList, s])); }, [seriesList]);
  
  const updateSeries = useCallback((s: Series) => { 
      setSeriesList(prev => {
          const newList = prev.map(old => old.id === s.id ? s : old);
          localStorage.setItem('6uos_series', JSON.stringify(newList));
          return newList;
      }); 
  }, []);

  const deleteSeries = useCallback((id: string) => {
      setSeriesList(prev => {
          const newList = prev.filter(s => s.id !== id);
          localStorage.setItem('6uos_series', JSON.stringify(newList));
          return newList;
      }); 
  }, []);

  const updateAuthorImage = useCallback((name: string, url: string) => {
      setAuthorImages(prev => {
          const newMap = { ...prev, [name]: url };
          localStorage.setItem('6uos_authors', JSON.stringify(newMap));
          return newMap;
      });
  }, []);

  const addMetadataProvider = useCallback(() => {}, []);
  const removeMetadataProvider = useCallback(() => {}, []);
  const refreshLibrary = loadData;
  const simulateScan = useCallback(async () => {}, []);

  // --- Main Audio Logic (useEffect) ---
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    // Restore State
    const savedState = localStorage.getItem(STORAGE_KEYS.PLAYER);
    if (savedState) {
        const p = JSON.parse(savedState);
        setState(prev => ({ ...prev, ...p, isPlaying: false, sleepTimer: null, isFullScreen: false }));
    }

    const handleTimeUpdate = () => {
        // Use refs inside effect loop to allow closure-free access to current data
        // BUT we need `state` to know current track index.
        // We use functional updates for state, so we are good on `currentTime`.
        // However, calculating GlobalTime requires access to `booksRef` and `state.currentTrackIndex`.
        
        setState(prev => {
            const book = booksRef.current.find(b => b.id === prev.currentBookId);
            if (!book) return prev;

            let globalTime = audio.currentTime;
            if (book.tracks && book.tracks.length > 0) {
               const currentTrackStart = book.chapters?.[prev.currentTrackIndex]?.startTime || 0;
               globalTime = currentTrackStart + audio.currentTime;
            }

            // Side Effect: Save Progress (Throttled)
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                // Update book in memory/ref without triggering full re-render of books if possible
                // Actually we need to sync `progress` back to booksRef for persistence
                const bIdx = booksRef.current.findIndex(b => b.id === prev.currentBookId);
                if (bIdx !== -1) {
                    booksRef.current[bIdx].progress = globalTime;
                    localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(booksRef.current));
                }
                
                localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify({
                    currentBookId: prev.currentBookId,
                    currentTrackIndex: prev.currentTrackIndex,
                    currentTime: globalTime,
                    volume: prev.volume,
                    speed: prev.speed
                }));
            }, 1000);

            return { ...prev, currentTime: globalTime };
        });

        const now = Date.now();
        const deltaSec = Math.max(0, (now - lastProgressTickRef.current) / 1000);
        lastProgressTickRef.current = now;
        setDailyProgress(prev => prev + deltaSec);
    };

    const handleEnded = () => {
        setState(prev => {
            const book = booksRef.current.find(b => b.id === prev.currentBookId);
            if (!book) return prev;

            if (book.tracks && prev.currentTrackIndex < book.tracks.length - 1) {
                const nextIdx = prev.currentTrackIndex + 1;
                const nextTrack = book.tracks[nextIdx];
                
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.src = nextTrack.url;
                        audioRef.current.load();
                        audioRef.current.play().catch(console.error);
                    }
                }, 0);
                
                return { ...prev, currentTrackIndex: nextIdx };
            } else {
                showToast("全书播放结束", "success");
                // History Update side effect
                const entry: HistoryEntry = { 
                     id: `h_${Date.now()}`, 
                     bookId: prev.currentBookId || '', 
                     timestamp: Date.now(), 
                     durationListened: (Date.now() - sessionStartRef.current) / 1000 
                };
                setHistory(h => { 
                     const u = [entry, ...h].slice(0, 1000);
                     localStorage.setItem('6uos_history', JSON.stringify(u)); 
                     return u; 
                });
                return { ...prev, isPlaying: false, currentTime: book.duration };
            }
        });
    };

    const handleError = (e: any) => {
        console.error("Audio Error", e);
        showToast("音频加载失败，请检查网络", "error");
        setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
    };
  }, []); // Run ONCE. Depend on refs/functional updates for everything else.

  // Sync Volume/Speed Side Effect
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = state.volume;
        audioRef.current.playbackRate = state.speed;
    }
  }, [state.volume, state.speed]);

  return (
    <PlayerContext.Provider value={{ 
        ...state, 
        books, series: seriesList, authorImages, history, dailyProgress, dailyGoal, toasts,
        playBook, togglePlay, setVolume, setSpeed, seek, undoSeek, toggleFullScreen, openFullScreen, closeFullScreen, setSleepTimer, toggleZenMode,
        getBook, playChapter, updateBook, deleteBook, toggleLike, refreshLibrary, simulateScan, showToast, removeToast,
        addSeries, updateSeries, deleteSeries, updateAuthorImage, addBookmark, deleteBookmark, playRandom,
        exportData, importData, setAmbience, setAmbienceVolume, importLocalFiles,
        metadataProviders, addMetadataProvider, removeMetadataProvider,
        setABLoop, clearABLoop, toggleVocalBoost, skipChapter
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
};
