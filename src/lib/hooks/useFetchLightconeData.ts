"use client"
import { useQuery } from '@tanstack/react-query'
import { getLightconeListApi } from '@/lib/api';
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import useDetailDataStore from '@/stores/detailDataStore';
import { useShallow } from 'zustand/react/shallow';
import { useTranslations } from 'next-intl';

export const useFetchLightconeData = () => {
    const transI18n = useTranslations("DataPage")
    const { setMapLightCone } = useDetailDataStore(
        useShallow((state) => ({ setMapLightCone: state.setMapLightCone }))
    )
    const query = useQuery({
        queryKey: ['lightconeData'],
        queryFn: getLightconeListApi,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data && !query.error) {
            setMapLightCone(query.data)
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "lightcone" }))
        }
    }, [query.data, query.error, setMapLightCone, transI18n])

    return query
}
