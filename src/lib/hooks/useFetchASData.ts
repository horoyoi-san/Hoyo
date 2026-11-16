"use client"
import { useQuery } from '@tanstack/react-query'
import { getASEventListApi } from '@/lib/api'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import useDetailDataStore from '@/stores/detailDataStore'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchASGroupData = () => {
    const transI18n = useTranslations("DataPage")
    const { setMapAS } = useDetailDataStore(
        useShallow((state) => ({ setMapAS: state.setMapAS }))
    )
    
    const query = useQuery({
        queryKey: ['ASGroupData'],
        queryFn: getASEventListApi,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data) {
            setMapAS(query.data)
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "ASGroup" }))
        }
    }, [query.data, query.error, setMapAS, transI18n])
    
    return query
}
