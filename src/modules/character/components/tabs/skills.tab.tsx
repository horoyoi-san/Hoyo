
import { useTranslation } from "@/src/hooks/use-translation.hook";
import { useMemo, useState } from "react";
import { useCharacterStore } from "../../store/use-character.store";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import Image from "next/image";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { rawCdnUrl } from "@/src/utils/helpers";
import { traceButtonsInfo, traceLink } from "../../utils/trace-constants";
import { Button } from "@/src/components/ui/button";
import { Slider } from "@/src/components/ui/slider";
import { Checkbox } from "@/src/components/ui/checkbox";

const SkillsTab = () => {
  const { t } = useTranslation();
  const charId = useCharacterStore((state) => state.id);
  const charData = useCharacterStore((state) => state.charData);
  const parseDesc = useParsedDesc();
  const [selectedAnchor, setSelectedAnchor] = useState<string | null>(null);

  const charConfig = useUserStore(
    (state) => state.characters[charId as string] ?? DEFAULT_CHAR_CONFIG,
  );
  const updateChar = useUserStore((state) => state.updateCharacter);

  const traceButtons = useMemo(() => {
    if (!charData?.path) return [];
    return traceButtonsInfo[charData.path] || [];
  }, [charData?.path]);

  const avatarSkillTree = useMemo(() => {
    if (!charData) return {};
    if (
      charConfig.enhanced &&
      Object.keys(charData.skill_trees_enhanced || {}).length > 0
    ) {
      return charData.skill_trees_enhanced;
    }
    return charData.skill_trees || {};
  }, [charData, charConfig.enhanced]);

  const getSkillInfo = (anchor: string) => {
    const trees = Object.values(avatarSkillTree);
    return trees.find((t) => t.anchor === anchor);
  };

  const selectedSkillInfo = selectedAnchor
    ? getSkillInfo(selectedAnchor)
    : null;

  const handlerMaxAll = () => {
    if (!charData) return;
    const newSkills: Record<string, number> = {};
    Object.values(avatarSkillTree).forEach((node) => {
      newSkills[node.id.toString()] = node.max_level;
    });
    updateChar(Number(charId), { skills: newSkills });
  };

  const handlerChangeStatusTrace = (status: boolean) => {
    if (!selectedSkillInfo) return;
    const newSkills = { ...(charConfig.skills || {}) };
    newSkills[selectedSkillInfo.id.toString()] = status ? 1 : 0;

    if (!status && traceLink[charData?.path || ""]?.[selectedAnchor || ""]) {
      traceLink[charData?.path || ""][selectedAnchor || ""].forEach(
        (pointId) => {
          const linkedNode = getSkillInfo(pointId);
          if (linkedNode) {
            newSkills[linkedNode.id.toString()] = 0;
          }
        },
      );
    }
    updateChar(Number(charId), { skills: newSkills });
  };

  if (!charData) return null;

  return (
    <div className="flex-1 flex gap-4 h-full">
      {/* LEFT: TRACE MAP */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <p className="text-2xl font-bold">{t("skillsMap")}</p>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white"
            onClick={handlerMaxAll}
          >
            {t("maxAll")}
          </Button>
        </div>

        <div className="relative flex-1 bg-white/[0.02] rounded-2xl border border-white/[0.04] overflow-hidden">
          <div className="absolute inset-0 bg-[url(/space.webp)] bg-cover bg-center opacity-20" />
          {traceButtons.map((btn, index) => {
            const skillNode = getSkillInfo(btn.id);
            if (!skillNode) return null;

            const isSelected = selectedAnchor === btn.id;
            const currentLevel =
              charConfig?.skills?.[skillNode.id.toString()] || 0;
            const isActive = currentLevel > 0;
            const isMax = currentLevel === skillNode.max_level;

            let sizeClasses = "";
            let bgClasses = isActive ? "bg-white" : "bg-black";
            let imgFilter = "brightness(0) invert(1)"; // Default inverted

            if (btn.size === "small") {
              sizeClasses = "w-8 h-8";
              if (isActive) imgFilter = "brightness(0)"; // Dark icon on white bg
            } else if (btn.size === "medium") {
              sizeClasses = "w-10 h-10";
              if (isActive) imgFilter = "brightness(0)";
            } else if (btn.size === "big") {
              sizeClasses = "w-12 h-12";
              bgClasses = "bg-black/80";
              imgFilter = "none";
            } else {
              sizeClasses = "w-10 h-10";
            }

            return (
              <div
                key={`${btn.id}-${index}`}
                onClick={() =>
                  setSelectedAnchor(isSelected ? null : btn.id)
                }
                className={`
                  absolute rounded-full border border-white/20 
                  cursor-pointer transition-all duration-200 ease-out 
                  flex justify-center items-center backdrop-blur-md shadow-lg
                  hover:scale-110 z-10
                  ${sizeClasses}
                  ${bgClasses}
                  ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black/50" : ""}
                  ${!isActive ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100" : ""}
                `}
                style={{
                  left: btn.left,
                  top: btn.top,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Image
                  src={rawCdnUrl(skillNode.icon)}
                  alt={btn.id}
                  unoptimized
                  width={48}
                  height={48}
                  className="p-1.5 object-contain size-full"
                  style={{ filter: imgFilter }}
                />

                {(btn.size === "big" ||
                  btn.size === "memory" ||
                  btn.size === "elation") && (
                  <div className="absolute -bottom-5 bg-black/80 text-[10px] font-bold px-1.5 rounded-full border border-white/10 whitespace-nowrap">
                    <span className={isMax ? "text-green-400" : "text-white"}>
                      {currentLevel}
                    </span>
                    <span className="text-white/40">/{skillNode.max_level}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: SKILL DETAILS */}
      <div className="w-72 bg-white/[0.02] rounded-2xl border border-white/[0.04] p-4 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
        <p className="text-xl font-bold mb-4">{t("details")}</p>

        {selectedSkillInfo ? (
          <div className="space-y-6">
            <div>
              <p className="text-lg font-bold text-white/90">
                {selectedSkillInfo.name}
              </p>
              {selectedSkillInfo.status_add_list?.map((status, i) => (
                <p key={i} className="text-sm font-semibold text-green-400">
                  {status.type} +{status.value}
                </p>
              ))}
            </div>

            {selectedSkillInfo.max_level > 1 ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-white/60">{t("level")}</span>
                  <span className="text-white">
                    {charConfig?.skills?.[selectedSkillInfo.id.toString()] || 1} /{" "}
                    {selectedSkillInfo.max_level}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={selectedSkillInfo.max_level}
                  step={1}
                  value={[
                    charConfig?.skills?.[selectedSkillInfo.id.toString()] || 1,
                  ]}
                  onValueChange={([val]) => {
                    const newSkills = { ...(charConfig.skills || {}) };
                    newSkills[selectedSkillInfo.id.toString()] = val;
                    updateChar(Number(charId), { skills: newSkills });
                  }}
                />
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={
                    charConfig?.skills?.[selectedSkillInfo.id.toString()] === 1
                  }
                  onCheckedChange={(checked) =>
                    handlerChangeStatusTrace(!!checked)
                  }
                />
                <span className="text-sm font-bold">
                  {charConfig?.skills?.[selectedSkillInfo.id.toString()] === 1
                    ? "Active"
                    : "Inactive"}
                </span>
              </label>
            )}

            <div
              className="text-xs text-white/60 leading-relaxed space-y-2"
              dangerouslySetInnerHTML={{
                __html: parseDesc(
                  selectedSkillInfo.desc,
                  selectedSkillInfo.params[
                    Math.max(
                      0,
                      (charConfig?.skills?.[selectedSkillInfo.id.toString()] || 1) - 1,
                    )
                  ] || [],
                ),
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm italic text-center">
            {t("selectNodeOnMap")}
            <br />
            {t("toViewAndEditDetails")}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillsTab;
