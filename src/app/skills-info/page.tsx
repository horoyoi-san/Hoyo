"use client";

import SkillsInfo from "@/components/skillsInfo";
import { NeedAvatarDetail } from "@/components/requireData";

export default function SkillsInfoPage() {
  return (
    <div className="w-full">
      <NeedAvatarDetail variant="page">
        <SkillsInfo></SkillsInfo>
      </NeedAvatarDetail>
    </div>
  );
}
