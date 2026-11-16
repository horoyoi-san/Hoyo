"use client"
import { useQuery } from '@tanstack/react-query'
import { getStageApi } from '@/lib/api'
import { useEffect } from 'react'
import useDetailDataStore from '@/stores/detailDataStore'
import { toast } from 'react-toastify'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchStageData = () => {
    const transI18n = useTranslations("DataPage")
    const { setStage } = useDetailDataStore(
        useShallow((state) => ({ setStage: state.setStage }))
    )
    const query = useQuery({
        queryKey: ['StageData'],
        queryFn: getStageApi,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data && !query.error) {
            setStage(query.data)
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "Stage" }))
        }
    }, [query.data, query.error, setStage, transI18n])

    return query
}
