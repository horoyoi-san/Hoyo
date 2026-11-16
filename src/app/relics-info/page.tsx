"use client";

import RelicsInfo from "@/components/relicsInfo";
import { NeedLightconeAndRelic } from "@/components/requireData";

export default function RelicsInfoPage() {
  return (
    <div className="w-full">
      <NeedLightconeAndRelic variant="page">
        <RelicsInfo></RelicsInfo>
      </NeedLightconeAndRelic>
    </div>
  );
}
