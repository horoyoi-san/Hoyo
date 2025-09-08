"use client"
import { useQuery } from '@tanstack/react-query'
import { fetchPeakByIdsNative, getPEAKEventListApi } from '@/lib/api'
import { useEffect } from 'react'
import { listCurrentLanguageApi } from '@/constant/constant'
import useLocaleStore from '@/stores/localeStore'
import { toast } from 'react-toastify'
import useEventStore from '@/stores/eventStore'
import { EventStageDetail, PeakDetail } from '@/types'

export const useFetchPEAKData = () => {
    const { setPEAKEvent, setMapPEAKInfo } = useEventStore()
    const { locale } = useLocaleStore()
    const { data: dataPEAK, error: errorPEAK } = useQuery({
        queryKey: ['peakData'],
        queryFn: getPEAKEventListApi,
        select: (data) => data.sort((a, b) => Number(b.id) - Number(a.id)),
        staleTime: 1000 * 60 * 5,
    })

    const { data: dataPEAKInfo, error: errorPEAKInfo } = useQuery({
        queryKey: ['peakInfoData', locale],
        queryFn: () =>
            fetchPeakByIdsNative(
                dataPEAK!.map((item) => item.id),
                listCurrentLanguageApi[locale.toLowerCase()]
            ),
        staleTime: 1000 * 60 * 5,
        select: (data) => {
            const newData = { ...data }
            for (const key in newData) {
                for (const item of newData[key].PreLevel) {
                    item.EventIDList = item.EventIDList.map((event: EventStageDetail) => ({
                        ...event,
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        MonsterList: event.MonsterList.map(({ $type, ...rest }) => rest)
                    }))
                }
                newData[key].BossLevel.EventIDList = newData[key].BossLevel.EventIDList.map((event: EventStageDetail) => ({
                    ...event,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    MonsterList: event.MonsterList.map(({ $type, ...rest }) => rest)
                }))
                newData[key].BossConfig.EventIDList = newData[key].BossConfig.EventIDList.map((event: EventStageDetail) => ({
                    ...event,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    MonsterList: event.MonsterList.map(({ $type, ...rest }) => rest)
                }))
            }
            return newData
        },
        enabled: !!dataPEAK,
    });

    useEffect(() => {
        if (dataPEAK && !errorPEAK) {
            setPEAKEvent(dataPEAK)
        } else if (errorPEAK) {
            toast.error("Failed to load PEAK data")
        }
    }, [dataPEAK, errorPEAK, setPEAKEvent])

    useEffect(() => {
        if (dataPEAKInfo && !errorPEAKInfo) {
            setMapPEAKInfo(dataPEAKInfo as Record<string, PeakDetail>)
        } else if (errorPEAKInfo) {
            toast.error("Failed to load PEAK info data")
        }

    }, [dataPEAKInfo, errorPEAKInfo, setMapPEAKInfo])
}
