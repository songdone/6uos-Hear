import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface SmartRewindConfig {
  pauseDurationMs: number
  rewindSeconds: number
}

const SMART_REWIND_RULES: SmartRewindConfig[] = [
  { pauseDurationMs: 24 * 60 * 60 * 1000, rewindSeconds: 60 },
  { pauseDurationMs: 60 * 60 * 1000, rewindSeconds: 30 },
  { pauseDurationMs: 5 * 60 * 1000, rewindSeconds: 10 },
]

export const usePlayerStore = defineStore('player', () => {
  const isPlaying = ref(false)
  const currentBookId = ref<number | null>(null)
  const currentTimeMs = ref(0)
  const lastPausedAt = ref<number | null>(null)
  const playbackRate = ref(1)
  const volumeBoostDb = ref(0)
  const skipSilenceEnabled = ref(true)
  const drivingMode = ref(false)
  const sleepMode = ref(false)
  const sleepTimerMs = ref<number | null>(null)
  const network = ref<'wifi' | 'cellular' | 'offline'>('wifi')

  const smartRewindSeconds = computed(() => {
    if (!lastPausedAt.value) return 0
    const delta = Date.now() - lastPausedAt.value
    const match = SMART_REWIND_RULES.find((rule) => delta >= rule.pauseDurationMs)
    return match ? match.rewindSeconds : 0
  })

  const mediaSessionMetadata = computed(() => ({
    title: '留你听书',
    artist: '6uos Hear',
  }))

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

  function setPlaybackRate(rate: number) {
    playbackRate.value = rate
  }

  function toggleSkipSilence(enabled: boolean) {
    skipSilenceEnabled.value = enabled
  }

  function enableDrivingMode(on: boolean) {
    drivingMode.value = on
    if (on) navigator.vibrate?.(50)
  }

  function enableSleepMode(on: boolean, timerMs?: number) {
    sleepMode.value = on
    sleepTimerMs.value = on ? timerMs ?? null : null
  }

  function setNetworkState(state: 'wifi' | 'cellular' | 'offline') {
    network.value = state
  }

  return {
    // state
    isPlaying,
    currentBookId,
    currentTimeMs,
    lastPausedAt,
    playbackRate,
    volumeBoostDb,
    skipSilenceEnabled,
    drivingMode,
    sleepMode,
    sleepTimerMs,
    network,
    // getters
    smartRewindSeconds,
    mediaSessionMetadata,
    // actions
    togglePlayPause,
    applySmartRewind,
    updateProgress,
    setPlaybackRate,
    toggleSkipSilence,
    enableDrivingMode,
    enableSleepMode,
    setNetworkState,
  }
})
