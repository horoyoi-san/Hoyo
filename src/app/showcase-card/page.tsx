"use client"

import ShowCaseInfo from "@/components/showcaseCard"
import { NeedAvatarDetail, NeedLightconeAndRelic } from "@/components/requireData"

export default function ShowcaseCard() {
    return (
        <div>
            <NeedLightconeAndRelic variant="page">
                <NeedAvatarDetail variant="page">
                    <ShowCaseInfo />
                </NeedAvatarDetail>
            </NeedLightconeAndRelic>
        </div>
    )
}
