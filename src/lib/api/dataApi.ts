import type { ASGroupDetail, AvatarDetail, AvatarHeavyDetail, ChangelogItemType, LightConeDetail, Metadata, MetadataCore, MOCGroupDetail, MonsterDetail, PeakGroupDetail, PFGroupDetail, RelicSetDetail } from "@/types";

async function getData<T>(name: string, label: string, priority?: RequestPriority): Promise<T> {
    try {
        const res = await fetch(`/api/data/${name}`, { priority });
        if (!res.ok) throw new Error(`/api/data/${name} responded ${res.status}`);
        return await res.json() as T;
    } catch (error) {
        console.error(`Failed to fetch ${label}:`, error);
        throw error;
    }
}

export const getMetadataApi = () => getData<MetadataCore>("metadata_core", "metadata");
export const getStageApi = () => getData<Metadata["Stage"]>("metadata_stage", "stage", "low");
export const getAvatarListApi = () => getData<Record<string, AvatarDetail>>("avatar_index", "Avatars");
export const getAvatarDetailApi = (id: number | string) => getData<AvatarHeavyDetail>(`avatar_detail_${id}`, "avatar detail", "low");
export const getLightconeListApi = () => getData<Record<string, LightConeDetail>>("lightcone", "lightcones", "low");
export const getRelicSetListApi = () => getData<Record<string, RelicSetDetail>>("relic", "relics", "low");
export const getMonsterListApi = () => getData<Record<string, MonsterDetail>>("monster", "monster", "low");
export const getASEventListApi = () => getData<Record<string, ASGroupDetail>>("as", "AS", "low");
export const getPFEventListApi = () => getData<Record<string, PFGroupDetail>>("pf", "PF", "low");
export const getMOCEventListApi = () => getData<Record<string, MOCGroupDetail>>("moc", "MOC", "low");
export const getPeakEventListApi = () => getData<Record<string, PeakGroupDetail>>("peak", "peak", "low");
export const getChangelog = () => getData<ChangelogItemType[]>("changelog", "changelog", "low");
