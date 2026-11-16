"use client"
import { useQuery } from '@tanstack/react-query'
import { getPFEventListApi } from '@/lib/api'
import { useEffect } from 'react'
import useDetailDataStore from '@/stores/detailDataStore'
import { toast } from 'react-toastify'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchPFGroupData = () => {
    const transI18n = useTranslations("DataPage")
    const { setMapPF } = useDetailDataStore(
        useShallow((state) => ({ setMapPF: state.setMapPF }))
    )
    const query = useQuery({
        queryKey: ['PFGroupData'],
        queryFn: getPFEventListApi,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data && !query.error) {
            setMapPF(query.data)
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "PFGroup" }))
        }
    }, [query.data, query.error, setMapPF, transI18n])
    
    return query
}
