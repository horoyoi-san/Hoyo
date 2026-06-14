import React, { useMemo } from "react";
import { useCharacterStore } from "../../store/use-character.store";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import Image from "next/image";
import { cn } from "@/src/lib/utils";
import { SkillTreePoint } from "../../utils/character-detail.type";
import { imgUrl, isPercent } from "@/src/utils/helpers";

const SkillsShowcase = () => {
  const charData = useCharacterStore((state) => state.charData);
  const charId = useCharacterStore((state) => state.id);
  const parseDesc = useParsedDesc();

  const charConfig = useUserStore(
    (state) => state.characters[charId as string] ?? DEFAULT_CHAR_CONFIG,
  );

  const ranks = useMemo(() => {
    if (!charData) return;
    const ranks = Object.values(charData.ranks);
    const ranksEnhanced = Object.values(charData.ranks_enhanced);

    return ranksEnhanced.length === 0 ? ranks : ranksEnhanced;
  }, [charData]);

  const groupedSkills = useMemo(() => {
    if (!charData) return;

    let skills = [];
    const skillsNormal = Object.values(charData.skills);
    const skillsEnhanced = Object.values(charData.skills_enhanced);

    skills = skillsEnhanced.length === 0 ? skillsNormal : skillsEnhanced;

    const groups: Record<string, any[]> = {
      "Basic ATK": [],
      Skill: [],
      Ultimate: [],
      Talent: [],
      Technique: [],
      Assist: [],
      Elation: [],
    };

    skills.forEach((skill) => {
      if (skill.type === "MazeNormal") return;
      if (!skill.desc) return;

      const type = skill.type;
      if (type.includes("Normal")) groups["Basic ATK"].push(skill);
      else if (type.includes("Assist")) groups["Assist"].push(skill);
      else if (type.includes("BPSkill")) groups["Skill"].push(skill);
      else if (type.includes("Ultra")) groups["Ultimate"].push(skill);
      else if (type.includes("Unknown")) groups["Talent"].push(skill);
      else if (type.includes("Maze") && !type.includes("MazeNormal"))
        groups["Technique"].push(skill);
      else if (type.includes("ElationDamage")) groups["Elation"].push(skill);
    });

    // Filter empty group
    return Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(groups).filter(([_, v]) => v.length > 0),
    );
  }, [charData]);

  const tracePathways = useMemo(() => {
    const skillTreeNormal = Object.values(charData?.skill_trees ?? {});
    const skillTreeEnhanced = Object.values(
      charData?.skill_trees_enhanced ?? {},
    );
    const allNodes =
      skillTreeEnhanced.length === 0 ? skillTreeNormal : skillTreeEnhanced;

    const relevantNodes = allNodes.filter(
      (node) =>
        !["Point01", "Point02", "Point03", "Point04", "Point05"].includes(
          node.anchor,
        ),
    );

    const roots = relevantNodes.filter((node) => {
      if (node.pre_points.length === 0) return true;

      // Cek apakah parent-nya adalah main skill (yang kita filter tadi)
      const hasMainSkillParent = node.pre_points.some((id) => {
        const parentNode = allNodes.find((n) => n.id === id);
        return (
          parentNode &&
          ["Point01", "Point02", "Point03", "Point04", "Point05"].includes(
            parentNode.anchor,
          )
        );
      });

      return hasMainSkillParent;
    });

    // 3. RECURSIVE FOR PATH
    const buildChain = (parentNodeId: number): any[] => {
      const children = relevantNodes.filter((node) =>
        node.pre_points.includes(parentNodeId),
      );
      if (children.length === 0) return [];

      return children.map((child) => ({
        ...child,
        children: buildChain(child.id),
      }));
    };

    return roots.map((root) => ({
      root,
      children: buildChain(root.id),
    }));
  }, [charData]);

  const renderNodeChildren = (children: any[]) => {
    return children.map((child) => (
      <React.Fragment key={child.id}>
        <div className="w-3 h-px bg-white/10 shrink-0" />
        <NodeIcon node={child} />
        {child.children &&
          child.children.length > 0 &&
          renderNodeChildren(child.children)}
      </React.Fragment>
    ));
  };

  return (
    <div className="flex gap-4">
      {/* SKILLS */}
      <div className="flex flex-col gap-2 items-center">
        {groupedSkills &&
          ranks &&
          Object.entries(groupedSkills).map(([groupName, skillList]) => {
            // 1. SKILL BONUS FROM EIDOLON (+12)
            const skillBonusMap: Record<string, number> = {};
            ranks
              .filter((r) => r.rank <= charConfig.rank)
              .forEach((rank) => {
                if (rank.skill_add_level_map) {
                  Object.entries(rank.skill_add_level_map).forEach(
                    ([skillId, bonus]) => {
                      skillBonusMap[skillId] =
                        (skillBonusMap[skillId] || 0) + (bonus as number);
                    },
                  );
                }
              });

            const mainSkill = skillList[0];

            // CHECK IF SKILL GOT BONUS FROM EIDOLON
            const groupHasBonus = skillList.some((s) => !!skillBonusMap[s.id]);

            return (
              <Tooltip
                key={groupName}
                content={
                  <div className="space-y-4 py-1">
                    {skillList.map((skill) => {
                      const bonusFromEidolon = skillBonusMap[skill.id] || 0;

                      const normalMaxLevel = skill.max_level;
                      const finalMaxLevel = normalMaxLevel + bonusFromEidolon;
                      const safeIndex = Math.min(
                        finalMaxLevel - 1,
                        skill.params.length - 1,
                      );

                      const currentParams = skill.params[safeIndex] ?? [];
                      const displayLevel = safeIndex + 1;

                      return (
                        <div
                          key={skill.id}
                          className="space-y-1.5 border-b border-white/5 last:border-0 pb-3 last:pb-0"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-0.5">
                              <p
                                className="font-bold text-primary leading-tight"
                                dangerouslySetInnerHTML={{
                                  __html: parseDesc(skill.name, []),
                                }}
                              />
                              <p className="text-[9px] uppercase tracking-tighter opacity-50 font-semibold">
                                {groupName}
                              </p>
                            </div>
                            <p
                              className={cn(
                                "text-[10px] bg-white/10 px-1.5 py-0.5 rounded shrink-0",
                              )}
                            >
                              Lv. {displayLevel}
                            </p>
                          </div>
                          <div
                            className="text-[11px] leading-relaxed opacity-90"
                            dangerouslySetInnerHTML={{
                              __html: parseDesc(
                                skill.desc,
                                currentParams as number[],
                              ),
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                }
              >
                <div className="flex flex-col items-center gap-1 group">
                  <div
                    className={cn(
                      "size-9 rounded-full border flex items-center justify-center transition-all relative",
                      groupHasBonus
                        ? "bg-white/[0.08] border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                        : "bg-white/[0.04] border-white/[0.08]",
                    )}
                  >
                    <Image
                      unoptimized
                      src={imgUrl(mainSkill.icon, "skillicons")}
                      alt={groupName}
                      width={24}
                      height={24}
                    />
                  </div>
                </div>
              </Tooltip>
            );
          })}
      </div>

      {/* TRACE PATHWAYS */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          {tracePathways.map((path, idx) => {
            return (
              <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                <NodeIcon node={path.root} />

                {/* Render Children Recursively */}
                {renderNodeChildren(path.children)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SkillsShowcase;

const NodeIcon = ({ node }: { node: SkillTreePoint }) => {
  const parseDesc = useParsedDesc();

  const getTooltipContent = () => {
    if (node.desc && node.desc !== "") {
      return parseDesc(node.desc, node.params[0] || []);
    }

    if (node.servants) {
      // get servant for remem unit
      const firstServant = Object.values(node.servants)[0];
      if (firstServant) {
        const params =
          firstServant.params[firstServant.params.length - 1] || [];
        return `[Servant Skill] ${parseDesc(firstServant.desc, params)}`;
      }
    }

    // fallback
    if (node.status_add_list?.[0]) {
      const stat = node.status_add_list[0];
      return `${node.name}: +${isPercent(stat.type) ? `${(stat.value * 100).toFixed(1)}%` : `${stat.value.toFixed(1)}`}`;
    }

    return node.name || "Trace Node";
  };

  return (
    <Tooltip
      content={
        <div className="space-y-2">
          <p className="font-semibold text-primary">{node.name}</p>
          <p
            className="text-[11px]"
            dangerouslySetInnerHTML={{ __html: getTooltipContent() }}
          />
        </div>
      }
    >
      <div
        className={cn(
          "shrink-0 rounded-full border",
          node.anchor.startsWith("Point0") && node.anchor !== "Point05"
            ? "size-8 bg-white/[0.06] border-white/[0.12] p-1" // Bonus Ability
            : "size-6 bg-white/5 border-white/10 p-1", // Stat Boost
        )}
      >
        <Image
          unoptimized
          src={imgUrl(node.icon, "skillicons")}
          alt="trace"
          width={24}
          height={24}
          className="object-contain"
        />
      </div>
    </Tooltip>
  );
};
