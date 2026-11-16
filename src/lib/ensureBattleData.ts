import useDetailDataStore from "@/stores/detailDataStore"
import { getASEventListApi, getMOCEventListApi, getPeakEventListApi, getPFEventListApi } from "@/lib/api"
import { getQueryClient } from "@/lib/queryClient"

// Export and sync await this so a config saved before the event data arrived is reconciled first.
// It shares the cache of the useFetch* hooks.
const STALE_MS = 1000 * 60 * 5

export async function ensureBattleData(mode: string): Promise<void> {
  const client = getQueryClient()
  const store = useDetailDataStore.getState()
  switch (mode.toUpperCase()) {
    case "MOC":
      store.setMapMoc(await client.fetchQuery({ queryKey: ["MOCGroupData"], queryFn: getMOCEventListApi, staleTime: STALE_MS }))
      break
    case "PF":
      store.setMapPF(await client.fetchQuery({ queryKey: ["PFGroupData"], queryFn: getPFEventListApi, staleTime: STALE_MS }))
      break
    case "AS":
      store.setMapAS(await client.fetchQuery({ queryKey: ["ASGroupData"], queryFn: getASEventListApi, staleTime: STALE_MS }))
      break
    case "PEAK":
      store.setMapPeak(await client.fetchQuery({ queryKey: ["PeakGroupData"], queryFn: getPeakEventListApi, staleTime: STALE_MS }))
      break
  }
}
