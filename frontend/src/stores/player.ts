import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type NetworkState = 'wifi' | 'cellular' | 'offline'

type TranscodePreference = 'auto' | 'wifi_only' | 'hls_preferred'

interface SmartRewindConfig {
  pauseDurationMs: number
  rewindSeconds: number
}

interface ChapterItem {
  id: number
  title: string
  orderIndex?: number
  naturalSortKey?: string
}

const SMART_REWIND_RULES: SmartRewindConfig[] = [
  { pauseDurationMs: 24 * 60 * 60 * 1000, rewindSeconds: 60 },
  { pauseDurationMs: 60 * 60 * 1000, rewindSeconds: 30 },
  { pauseDurationMs: 5 * 60 * 1000, rewindSeconds: 10 },
]

/**
 * 播放器状态：响应断点失忆症、声音洁癖、驾驶/睡眠模式等高级需求。
 * 默认由全局 Pinia 持久化插件写入 IndexedDB，刷新也不会丢失。
 */
export const usePlayerStore = defineStore('player', () => {
  const isPlaying = ref(false)
  const currentBookId = ref<number | null>(null)
  const currentTimeMs = ref(0)
  const lastPausedAt = ref<number | null>(null)
  const mediaEntryTitle = ref<string | null>(null)

  const playbackRate = ref(1)
  const volumeBoostDb = ref(0)
  const loudnessTargetLufs = ref(-16)

  const skipSilenceEnabled = ref(true)
  const skipSilenceThresholdDb = ref(-40)
  const skipSilenceMinDurationMs = ref(2000)

  const drivingMode = ref(false)
  const drivingHaptics = ref(true)
  const sleepMode = ref(false)
  const sleepTimerMs = ref<number | null>(null)
  const oledPureBlack = ref(false)

  const network = ref<NetworkState>('wifi')
  const preferTranscode = ref<TranscodePreference>('auto')
  const offlineCacheEnabled = ref(false)
  const offlineCacheChapters = ref<number[]>([])

  const mediaSessionChapter = ref<string | null>(null)
  const chapters = ref<ChapterItem[]>([])

  const smartRewindSeconds = computed(() => {
    if (!lastPausedAt.value) return 0
    const delta = Date.now() - lastPausedAt.value
    const match = SMART_REWIND_RULES.find((rule) => delta >= rule.pauseDurationMs)
    return match ? match.rewindSeconds : 0
  })

  const mediaSessionMetadata = computed(() => ({
    title: mediaSessionChapter.value ?? '留你听书',
    artist: '6uos Hear',
  }))

  const sortedChapters = computed(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    return [...chapters.value].sort((a, b) => {
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex
      }
      const keyA = a.naturalSortKey ?? a.title
      const keyB = b.naturalSortKey ?? b.title
      return collator.compare(keyA, keyB)
    })
  })

  function togglePlayPause() {
    isPlaying.value = !isPlaying.value
    if (!isPlaying.value) {
      lastPausedAt.value = Date.now()
    } else {
      navigator.vibrate?.(50)
    }
  }

  function applySmartRewind() {
    currentTimeMs.value = Math.max(0, currentTimeMs.value - smartRewindSeconds.value * 1000)
  }

  function updateProgress(ms: number) {
    currentTimeMs.value = ms
  }

  function setMediaEntryName(name: string | null) {
    mediaEntryTitle.value = name
  }

  function setPlaybackRate(rate: number) {
    playbackRate.value = rate
  }

  function toggleSkipSilence(enabled: boolean) {
    skipSilenceEnabled.value = enabled
    if (enabled) navigator.vibrate?.(30)
  }

  function setSkipSilenceProfile(thresholdDb: number, minDurationMs: number) {
    skipSilenceThresholdDb.value = thresholdDb
    skipSilenceMinDurationMs.value = minDurationMs
  }

  function enableDrivingMode(on: boolean) {
    drivingMode.value = on
    if (on && drivingHaptics.value) navigator.vibrate?.(50)
  }

  function enableSleepMode(on: boolean, timerMs?: number) {
    sleepMode.value = on
    sleepTimerMs.value = on ? timerMs ?? null : null
  }

  function toggleOledBlack(forceBlack: boolean) {
    oledPureBlack.value = forceBlack
  }

  function setNetworkState(state: NetworkState) {
    network.value = state
  }

  function setTranscodePreference(strategy: TranscodePreference) {
    preferTranscode.value = strategy
  }

  function setLoudnessTarget(value: number) {
    loudnessTargetLufs.value = value
  }

  function toggleOfflineCache(enable: boolean, chapterIds: number[] = []) {
    offlineCacheEnabled.value = enable
    offlineCacheChapters.value = enable ? chapterIds : []
  }

  function updateMediaSession(title: string | null) {
    mediaSessionChapter.value = title
  }

  function setChapters(list: ChapterItem[]) {
    chapters.value = list
  }

  function updateChapterOrder(orderMap: Record<number, number>) {
    chapters.value = sortedChapters.value.map((chapter) => ({
      ...chapter,
      orderIndex: orderMap[chapter.id] ?? chapter.orderIndex ?? 0,
    }))
  }

  return {
    // state
    isPlaying,
    currentBookId,
    currentTimeMs,
    lastPausedAt,
    mediaEntryTitle,
    playbackRate,
    volumeBoostDb,
    loudnessTargetLufs,
    skipSilenceEnabled,
    skipSilenceThresholdDb,
    skipSilenceMinDurationMs,
    drivingMode,
    drivingHaptics,
    sleepMode,
    sleepTimerMs,
    oledPureBlack,
    network,
    preferTranscode,
    offlineCacheEnabled,
    offlineCacheChapters,
    mediaSessionChapter,
    chapters,
    // getters
    smartRewindSeconds,
    mediaSessionMetadata,
    sortedChapters,
    // actions
    togglePlayPause,
    applySmartRewind,
    updateProgress,
    setMediaEntryName,
    setPlaybackRate,
    toggleSkipSilence,
    setSkipSilenceProfile,
    enableDrivingMode,
    enableSleepMode,
    toggleOledBlack,
    setNetworkState,
    setTranscodePreference,
    setLoudnessTarget,
    toggleOfflineCache,
    updateMediaSession,
    setChapters,
    updateChapterOrder,
  }
})
