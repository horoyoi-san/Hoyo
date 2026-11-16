"use client";

import RelicPickerPage from "@/components/relicPicker";
import { NeedRelic } from "@/components/requireData";

export default function RelicPickerRoute() {
    return (
        <NeedRelic variant="page">
            <RelicPickerPage />
        </NeedRelic>
    );
}
