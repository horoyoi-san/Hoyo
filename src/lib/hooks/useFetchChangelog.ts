"use client"
import { useQuery } from '@tanstack/react-query'
import { getChangelog } from '@/lib/api'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import useModelStore from '@/stores/modelStore'
import useLocaleStore from '@/stores/localeStore'
import { useShallow } from 'zustand/react/shallow'
import { useTranslations } from 'next-intl'

export const useFetchChangelog = () => {
    const transI18n = useTranslations("DataPage")
    const { currentVersion, setChangelog, setCurrentVersion } = useLocaleStore(
        useShallow((state) => ({
            currentVersion: state.currentVersion,
            setChangelog: state.setChangelog,
            setCurrentVersion: state.setCurrentVersion,
        }))
    )
    const { setIsChangelog } = useModelStore(
        useShallow((state) => ({ setIsChangelog: state.setIsChangelog }))
    )
    const query = useQuery({
        queryKey: ['changelog'],
        queryFn: getChangelog,
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        if (query.data && !query.error) {
            setChangelog(query.data)
            if (query.data?.[0] && query.data[0].version != currentVersion) {
                setIsChangelog(true)
                setCurrentVersion(query.data[0].version)
            }
        } else if (query.error) {
            toast.error(transI18n("failedToLoadData", { type: "changelog" }))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.data, query.error, setChangelog, setCurrentVersion, setIsChangelog, transI18n])

    return query
}
