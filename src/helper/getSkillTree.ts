import { AvatarDetail } from "@/types";

export function getSkillTree(avatarSelected: AvatarDetail | null, enhanced: string) {
    if (!avatarSelected) return null;
    if (enhanced != "" && !!avatarSelected?.Enhanced?.[enhanced]?.SkillTrees) {
        return Object.values(avatarSelected?.Enhanced?.[enhanced]?.SkillTrees).reduce((acc, dataPointEntry) => {
            const firstEntry = Object.values(dataPointEntry)[0];
            if (firstEntry) {
                acc[firstEntry.PointID] = firstEntry.MaxLevel;
            }
            return acc;
        }, {} as Record<string, number>)
    }

    return Object.values(avatarSelected?.SkillTrees ?? {}).reduce((acc, dataPointEntry) => {
        const firstEntry = Object.values(dataPointEntry)[0];
        if (firstEntry) {
            acc[firstEntry.PointID] = firstEntry.MaxLevel;
        }
        return acc;
    }, {} as Record<string, number>);
}

