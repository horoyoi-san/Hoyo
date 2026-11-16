"use client"
import { useQuery } from '@tanstack/react-query'
import { getAvatarDetailApi } from '@/lib/api'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import useDetailDataStore from '@/stores/detailDataStore'
import useCurrentDataStore from '@/stores/currentDataStore'
import { useTranslations } from 'next-intl'

export const useFetchAvatarDetail = () => {
  const transI18n = useTranslations("DataPage")
  const id = useCurrentDataStore(state => state.avatarSelected?.ID)
  const loaded = useDetailDataStore(state => id !== undefined && !!state.avatarDetailLoaded[String(id)])

  const query = useQuery({
    queryKey: ['AvatarDetail', id],
    queryFn: () => getAvatarDetailApi(id!),
    enabled: id !== undefined,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!query.data || id === undefined || loaded) return
    const merged = useDetailDataStore.getState().mergeAvatarDetail(String(id), query.data)
    const { avatarSelected, setAvatarSelected } = useCurrentDataStore.getState()
    if (merged && avatarSelected?.ID === id) setAvatarSelected(merged)
  }, [query.data, id, loaded])

  useEffect(() => {
    if (query.error) toast.error(transI18n("failedToLoadData", { type: "AvatarDetail" }))
  }, [query.error, transI18n])

  return query
}
