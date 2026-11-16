"use client"

import { useState } from "react"
import { replaceByParam, getLocaleName } from "@/helper"
import { ExtraEffect } from "@/types"
import { useTranslations } from "next-intl"

type Props = {
    extras: Record<string, ExtraEffect> | undefined
    locale: string
}

export default function ExtraEffectList({ extras, locale }: Props) {
    const [openList, setOpenList] = useState(false)
    const [openId, setOpenId] = useState<number | null>(null)
    const transI18n = useTranslations("DataPage")
    if (!extras || Object.keys(extras).length === 0) return null

    return (
        <div className="mt-3">
            <div
                className="flex items-center justify-between cursor-pointer bg-primary/10 px-3 py-2 rounded-md"
                onClick={() => setOpenList(!openList)}
            >
                <span className="text-sm font-semibold text-primary">
                    {transI18n("listExtraEffect")} ({Object.keys(extras).length})
                </span>

                <span
                    className={`transition-transform ${
                        openList ? "rotate-90" : ""
                    }`}
                >
                    ▶
                </span>
            </div>

            <div
                className={`overflow-hidden transition-all duration-300 ${
                    openList ? "max-h-125 mt-2" : "max-h-0"
                }`}
            >
                <div className="flex flex-col gap-2">
                    {Object.values(extras).map((extra) => {
                        const isOpen = openId === extra.ID

                        return (
                            <div
                                key={extra.ID}
                                className="bg-primary/5 rounded-md"
                            >
                                <div
                                    className="flex items-center justify-between px-3 py-2 cursor-pointer"
                                    onClick={() =>
                                        setOpenId(isOpen ? null : extra.ID)
                                    }
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold bg-primary/50 px-1.5 py-0.5 rounded">
                                            {transI18n("extra")}
                                        </span>

                                        <span className="text-sm font-medium text-primary/80">
                                            {getLocaleName(locale, extra.Name)}
                                        </span>
                                    </div>

                                    <span
                                        className={`transition-transform ${
                                            isOpen ? "rotate-90" : ""
                                        }`}
                                    >
                                        ▶
                                    </span>
                                </div>

                                <div
                                    className={`overflow-hidden transition-all duration-300 ${
                                        isOpen ? "max-h-40 px-3 pb-2" : "max-h-0"
                                    }`}
                                >
                                    <div
                                        className="text-sm opacity-90"
                                        dangerouslySetInnerHTML={{
                                            __html: replaceByParam(
                                                getLocaleName(locale, extra.Desc),
                                                extra.Param
                                            )
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}