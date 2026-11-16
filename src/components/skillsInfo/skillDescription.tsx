import { getLocaleName, replaceByParam } from "@/helper";
import { AvatarStore, SkillDetail, SkillTreePoint } from "@/types";
import ExtraEffectList from "../extraInfo";

export const SkillDescription = ({ skill, locale, avatarData, skillInfo, attackTypeLabel, skillEffectLabel, isTalent }: {
    skill: SkillDetail,
    locale: string,
    avatarData: AvatarStore,
    skillInfo: SkillTreePoint,
    attackTypeLabel?: string,
    skillEffectLabel?: string,
    isTalent?: boolean
}) => {
    const levelKey = avatarData?.data.skills?.[skillInfo?.PointID]?.toString() || "";
    const currentLevel = avatarData?.data.skills?.[skillInfo?.PointID] || 1;
    const params = skill.Level[levelKey]?.Param || [];
    const descHtml = getLocaleName(locale, skill.Desc) || getLocaleName(locale, skill.SimpleDesc);

    const extraList = Object.values(skill.Extra || {}).length > 0
        ? skill.Extra
        : skill?.SimpleExtra || {};

    const skillName = getLocaleName(locale, skill.Name);

    return (
        <div className="space-y-2.5">
            {isTalent ? (
                <>
                    {attackTypeLabel && (
                        <span className="inline-flex rounded-full bg-base-content px-3 py-0.5 text-xs font-bold text-base-100">
                            {attackTypeLabel}
                        </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold tracking-tight text-base-content">
                            {skillName}
                        </h3>
                        <span className="shrink-0 pt-1 text-xs font-semibold text-base-content/70">
                            Lv. {currentLevel}
                        </span>
                    </div>
                    {skillEffectLabel && (
                        <div className="text-sm font-medium text-primary">[{skillEffectLabel}]</div>
                    )}
                </>
            ) : (
                <>
                    <h3 className="text-xl font-bold tracking-tight text-base-content">
                        {skillName}
                    </h3>
                    {(attackTypeLabel || skillEffectLabel) && (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                            <span>{attackTypeLabel}</span>
                            {skillEffectLabel && (
                                <span className="font-medium text-primary/70">({skillEffectLabel})</span>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                        <span className="h-3.5 w-1 rounded-xs bg-primary"></span>
                        <span>{skillName}</span>
                    </div>
                </>
            )}

            <div
                className="text-xs leading-relaxed text-base-content/85 sm:text-sm"
                dangerouslySetInnerHTML={{ __html: replaceByParam(descHtml, params) }}
            />

            {Object.keys(extraList).length > 0 && (
                <ExtraEffectList extras={extraList} locale={locale} />
            )}
        </div>
    );
};