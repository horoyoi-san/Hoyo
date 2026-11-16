"use client"
import { useQuery } from '@tanstack/react-query'
import { getAvatarListApi } from '@/lib/api'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import useDetailDataStore from '@/stores/detailDataStore'
import useCurrentDataStore from '@/stores/currentDataStore'
import useUserDataStore from '@/stores/userDataStore'
import { converterToAvatarStore } from '@/helper'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchAvatarData = () => {
  const transI18n = useTranslations("DataPage")
  const { setMapAvatar, mapAvatar } = useDetailDataStore(
    useShallow((state) => ({
      setMapAvatar: state.setMapAvatar,
      mapAvatar: state.mapAvatar,
    }))
  )
  const setAvatars = useUserDataStore(state => state.setAvatars)
  // Observe missing IDs rather than every avatar edit. Imports can replace the
  // collection with an older/partial database and still need default entries.
  const missingAvatarIds = useUserDataStore(useShallow(state =>
    Object.keys(mapAvatar).filter(id => !state.avatars[id])
  ))
  const setAvatarSelected = useCurrentDataStore(state => state.setAvatarSelected)

  const query = useQuery({
    queryKey: ['AvatarData'],
    queryFn: getAvatarListApi,
    staleTime: 1000 * 60 * 5,
  })
  useEffect(() => {
    if (missingAvatarIds.length === 0) return
    const currentAvatars = useUserDataStore.getState().avatars
    const missingAvatars = Object.fromEntries(missingAvatarIds
      .filter(id => !currentAvatars[id])
      .map(id => [id, mapAvatar[id]]))
    if (Object.keys(missingAvatars).length === 0) return
    const avatarStore = converterToAvatarStore(missingAvatars)
    setAvatars({ ...currentAvatars, ...avatarStore })
  }, [mapAvatar, missingAvatarIds, setAvatars])

  useEffect(() => {
    if (query.data) {
        setMapAvatar(query.data)
        if (!useCurrentDataStore.getState().avatarSelected) {
            setAvatarSelected(Object.values(query.data)[0] ?? null)
        }
    }
    if (query.error) toast.error(transI18n("failedToLoadData", { type: "Avatar" }))
  }, [query.data, query.error, setMapAvatar, setAvatarSelected, transI18n])

  return query
}