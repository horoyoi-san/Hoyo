"use client"
import { useQuery } from '@tanstack/react-query'
import { getPeakEventListApi } from '@/lib/api'
import { useEffect } from 'react'
import useDetailDataStore from '@/stores/detailDataStore'
import { toast } from 'react-toastify'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchPeakGroupData = () => {
    const transI18n = useTranslations("DataPage")
    const { setMapPeak } = useDetailDataStore(
        useShallow((state) => ({ setMapPeak: state.setMapPeak }))
    )
    const query = useQuery({
        queryKey: ['PeakGroupData'],
        queryFn: getPeakEventListApi,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data && !query.error) {
            setMapPeak(query.data)
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "PeakGroup" }))
        }
    }, [query.data, query.error, setMapPeak, transI18n])
    
    return query
}
