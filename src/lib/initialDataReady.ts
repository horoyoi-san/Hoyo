import type useCurrentDataStore from "@/stores/currentDataStore";
import type useDetailDataStore from "@/stores/detailDataStore";

type DetailState = ReturnType<typeof useDetailDataStore.getState>;
type SettingsState = ReturnType<typeof useCurrentDataStore.getState>;
type InitialData = {
  metadata?: import("@/types").MetadataCore;
  avatars?: DetailState["mapAvatar"];
};

// Only what the first screen renders blocks it; the rest loads afterwards and battleConfigSync re-derives configs as it arrives.
export function isInitialDataReady(
  data: InitialData,
  detail: DetailState,
  settings: Pick<SettingsState, "avatarSelected">,
): boolean {
  const metadata = data.metadata;
  return !!metadata && !!settings.avatarSelected &&
    detail.baseType === metadata.BaseType &&
    detail.damageType === metadata.DamageType &&
    detail.mainAffix === metadata.MainAffix &&
    detail.subAffix === metadata.SubAffix &&
    detail.skillConfig === metadata.SkillConfig &&
    detail.hardLevelConfig === metadata.HardLevelConfig &&
    detail.eliteConfig === metadata.EliteConfig &&
    detail.mapAvatar === data.avatars;
}
