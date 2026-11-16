"use client"
import { useQuery } from '@tanstack/react-query'
import { getRelicSetListApi } from '@/lib/api'
import { useEffect } from 'react'
import useDetailDataStore from '@/stores/detailDataStore'
import { toast } from 'react-toastify'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchRelicSetData = () => {
    const transI18n = useTranslations("DataPage")
    const { setMapRelicSet } = useDetailDataStore(
        useShallow((state) => ({ setMapRelicSet: state.setMapRelicSet }))
    )
    const query = useQuery({
        queryKey: ['RelicSetData'],
        queryFn: getRelicSetListApi,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data && !query.error) {
            setMapRelicSet(query.data)
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "RelicSet" }))
        }
    }, [query.data, query.error, setMapRelicSet, transI18n])
    
    return query
}
