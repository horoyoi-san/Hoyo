"use client"
import EidolonsInfo from "@/components/eidolonsInfo";
import { NeedAvatarDetail } from "@/components/requireData";
export default function EidolonsInfoPage() {
  return (
    <div className="w-full">
      <NeedAvatarDetail variant="page">
        <EidolonsInfo/>
      </NeedAvatarDetail>
    </div>
  );
}
