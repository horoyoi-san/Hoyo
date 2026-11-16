"use client"
import { useQuery } from '@tanstack/react-query'
import { getMonsterListApi } from '@/lib/api'
import { useEffect } from 'react'
import useDetailDataStore from '@/stores/detailDataStore'
import { toast } from 'react-toastify'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchMonsterData = () => {
    const transI18n = useTranslations("DataPage")
    const { setMapMonster } = useDetailDataStore(
        useShallow((state) => ({ setMapMonster: state.setMapMonster }))
    )
    const query = useQuery({
        queryKey: ['MonsterData', 'v2'],
        queryFn: getMonsterListApi,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data && !query.error) {
            setMapMonster(query.data)
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "Monster" }))
        }
    }, [query.data, query.error, setMapMonster, transI18n])

    return query
}
