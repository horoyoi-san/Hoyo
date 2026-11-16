"use client";

import RelicMakerPage from "@/components/relicMakerPage";
import { NeedRelic } from "@/components/requireData";

export default function RelicMakerRoute() {
    return (
        <NeedRelic variant="page">
            <RelicMakerPage />
        </NeedRelic>
    );
}
