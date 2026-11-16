"use client"
import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import type { UseQueryResult } from "@tanstack/react-query"
import useDetailDataStore from "@/stores/detailDataStore"
import useCurrentDataStore from "@/stores/currentDataStore"
import useLocaleStore from "@/stores/localeStore"
import {
  useFetchASGroupData,
  useFetchAvatarDetail,
  useFetchChangelog,
  useFetchLightconeData,
  useFetchMOCGroupData,
  useFetchMonsterData,
  useFetchPeakGroupData,
  useFetchPFGroupData,
  useFetchRelicSetData,
  useFetchStageData,
} from "@/lib/hooks"
import ModalLoading from "@/components/modalLoading"
import PageSkeleton from "@/components/pageSkeleton"

// Gates for data that loads after the first screen: start the download, show a placeholder, offer a retry.
// variant: "modal" (default) spinner, "page" page skeleton.
type Variant = "modal" | "page"
type GateProps = { children: ReactNode; variant?: Variant }

function hasEntries(record: object) {
  for (const _ in record) return true
  return false
}

function Gate({ query, ready, variant = "modal", children }: GateProps & { query: UseQueryResult; ready: boolean }) {
  const transI18n = useTranslations("DataPage")
  if (ready) return <div className="h-full animate-in fade-in duration-200">{children}</div>
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center">
        <div>{transI18n("failedToLoadDataRetry")}</div>
        <button className="btn btn-primary btn-sm" onClick={() => void query.refetch()}>
          {transI18n("retryLoadingData")}
        </button>
      </div>
    )
  }
  return variant === "page" ? <PageSkeleton /> : <ModalLoading />
}

type DetailState = ReturnType<typeof useDetailDataStore.getState>
function makeGate(useFetch: () => UseQueryResult, select: (state: DetailState) => object) {
  return function Need({ children, variant }: GateProps) {
    const query = useFetch()
    const ready = useDetailDataStore(state => hasEntries(select(state)))
    return <Gate query={query} ready={ready} variant={variant}>{children}</Gate>
  }
}

export const NeedLightcone = makeGate(useFetchLightconeData, state => state.mapLightCone)
export const NeedRelic = makeGate(useFetchRelicSetData, state => state.mapRelicSet)
export const NeedMonster = makeGate(useFetchMonsterData, state => state.mapMonster)
export const NeedMoc = makeGate(useFetchMOCGroupData, state => state.mapMoc)
export const NeedPf = makeGate(useFetchPFGroupData, state => state.mapPF)
export const NeedAs = makeGate(useFetchASGroupData, state => state.mapAS)
export const NeedPeak = makeGate(useFetchPeakGroupData, state => state.mapPeak)
export const NeedStage = makeGate(useFetchStageData, state => state.stage)

export function NeedChangelog({ children, variant }: GateProps) {
  const query = useFetchChangelog()
  const ready = useLocaleStore(state => state.changelog.length > 0)
  return <Gate query={query} ready={ready} variant={variant}>{children}</Gate>
}

export function NeedAvatarDetail({ children, variant }: GateProps) {
  const query = useFetchAvatarDetail()
  const id = useCurrentDataStore(state => state.avatarSelected?.ID)
  const ready = useDetailDataStore(state => id === undefined || !!state.avatarDetailLoaded[String(id)])
  return <Gate query={query} ready={ready} variant={variant}>{children}</Gate>
}

export function NeedLightconeAndRelic({ children, variant }: GateProps) {
  return <NeedLightcone variant={variant}><NeedRelic variant={variant}>{children}</NeedRelic></NeedLightcone>
}

export function NeedBattleData({ mode, children, variant }: GateProps & { mode: string }) {
  switch (mode.toUpperCase()) {
    case "MOC": return <NeedMonster variant={variant}><NeedMoc variant={variant}>{children}</NeedMoc></NeedMonster>
    case "PF": return <NeedMonster variant={variant}><NeedPf variant={variant}>{children}</NeedPf></NeedMonster>
    case "AS": return <NeedMonster variant={variant}><NeedAs variant={variant}>{children}</NeedAs></NeedMonster>
    case "PEAK": return <NeedMonster variant={variant}><NeedPeak variant={variant}>{children}</NeedPeak></NeedMonster>
    case "CE": return <NeedMonster variant={variant}><NeedStage variant={variant}>{children}</NeedStage></NeedMonster>
    default: return <>{children}</>
  }
}
