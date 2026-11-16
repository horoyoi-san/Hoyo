"use client"

import { useEffect, useState } from "react"
import BrandLogo from "@/components/brandLogo"
import useCurrentDataStore from "@/stores/currentDataStore"
import useDetailDataStore from "@/stores/detailDataStore"
import useUserDataStore from "@/stores/userDataStore"
import { startBattleConfigSync } from "@/lib/battleConfigSync"
import { isInitialDataReady } from "@/lib/initialDataReady"
import BattleDataFetcher from "@/components/battleDataFetcher"
import { startPreloadModals } from "@/lib/preloadModals"

import {
  useFetchAvatarData,
  useFetchAvatarDetail,
  useFetchChangelog,
  useFetchConfigData,
  useFetchLightconeData,
  useFetchRelicSetData
} from "@/lib/hooks"
import { useTranslations } from "next-intl"

// True once the page has loaded and the browser is idle, so background downloads do not compete with the first screen.
function useAfterPageLoad() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    let idle: number | undefined
    const start = () => {
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(() => setDone(true), { timeout: 2000 })
      else setDone(true)
    }
    // If a slow image keeps "load" from firing, do not wait forever.
    const fallback = setTimeout(start, 8000)
    if (document.readyState === "complete") start()
    else window.addEventListener("load", start, { once: true })
    return () => {
      clearTimeout(fallback)
      window.removeEventListener("load", start)
      if (idle !== undefined) window.cancelIdleCallback(idle)
    }
  }, [])
  return done
}

function BackgroundDataFetcher() {
  const afterLoad = useAfterPageLoad()
  return afterLoad ? <BackgroundFetchers /> : null
}

function BackgroundFetchers() {
  const battleType = useUserDataStore(state => state.battle_type)
  useFetchLightconeData()
  useFetchRelicSetData()
  useFetchAvatarDetail()
  useFetchChangelog()
  return <BattleDataFetcher mode={battleType} />
}

function LoadingScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex h-dvh min-h-screen w-full items-center justify-center overflow-hidden bg-[#050b18] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 scale-105 bg-cover bg-center"
        style={{ backgroundImage: "url('/loading/hsr-loading-bg.png')" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#040817]/45 via-[#071329]/40 to-[#030713]/85"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,rgba(68,151,213,0.2),transparent_58%)]"
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 text-center">
        <div className="flex flex-col items-center drop-shadow-[0_8px_28px_rgba(2,8,24,0.8)]">
          <BrandLogo size="large" />
          <span className="mt-3 text-[10px] font-semibold tracking-[0.3em] text-white/65 sm:text-xs">
            HONKAI: STAR RAIL TOOLKIT
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ClientDataFetcher({
  children
}: {
  children: React.ReactNode
}) {
  const transI18n = useTranslations("DataPage")
  useEffect(() => startBattleConfigSync(), [])

  const q1 = useFetchConfigData()
  const q2 = useFetchAvatarData()

  const queries = [q1, q2]
  // Do not mount consumers until the requests and the store writes they trigger have finished.
  const detail = useDetailDataStore()
  const avatarSelected = useCurrentDataStore(state => state.avatarSelected)
  const avatarsReady = useUserDataStore(state => !!q2.data &&
    Object.keys(q2.data).every(id => !!state.avatars[id]))
  const ready = queries.every(q => q.isSuccess) && avatarsReady &&
    isInitialDataReady({
      metadata: q1.data?.metaData,
      avatars: q2.data,
    }, detail, { avatarSelected })
  const failed = queries.filter(q => q.isError)
  const [initialized, setInitialized] = useState(false)
  if (ready && !initialized) setInitialized(true)

  useEffect(() => {
    if (initialized || ready) {
      startPreloadModals()
    }
  }, [initialized, ready])

  // After the first pass, background refreshes must not tear down editors or modal drafts.
  if (initialized || ready) return <>{children}<BackgroundDataFetcher /></>

  const progress =
    (queries.filter(q => q.isSuccess).length / queries.length) * 100

  if (failed.length > 0) {
    return (
      <LoadingScene>
        <div role="alert" className="mt-5 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#071329]/70 px-6 py-5 shadow-2xl backdrop-blur-md">
          <div className="text-sm font-medium text-white/90">{transI18n("failedToLoadDataRetry")}</div>
          <button
            className="btn min-h-10 rounded-full border border-cyan-100/40 bg-gradient-to-r from-cyan-200 to-amber-100 px-7 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(104,205,255,0.25)] hover:brightness-105"
            onClick={() => {
              for (const query of failed) void query.refetch()
            }}
          >
            {transI18n("retryLoadingData")}
          </button>
        </div>
      </LoadingScene>
    )
  }

  if (!ready) {
    return (
      <LoadingScene>
        <div className="mt-3 flex w-full max-w-sm flex-col items-stretch gap-3">
          <div role="status" aria-live="polite" className="text-sm font-semibold tracking-[0.16em] text-white/90">
            {transI18n("loadingData")}
          </div>
          <div
            role="progressbar"
            aria-label={transI18n("loadingData")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(progress)}
            className="relative h-2 rounded-full border border-white/15 bg-[#09172b]/90 p-[1px] shadow-[0_0_24px_rgba(53,155,220,0.18)]"
          >
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-sky-300 via-cyan-100 to-amber-200 transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            >
              {progress > 0 && (
                <span className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/80 bg-amber-100 shadow-[0_0_12px_rgba(255,230,159,0.9)]" />
              )}
            </div>
          </div>
          <div className="text-xs font-semibold tracking-[0.2em] text-cyan-50/85">
            {Math.floor(progress)}%
          </div>
        </div>
      </LoadingScene>
    )
  }

  return <>{children}<BackgroundDataFetcher /></>
}