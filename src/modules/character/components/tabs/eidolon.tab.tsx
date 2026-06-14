import { useMemo } from "react";
import { useCharacterStore } from "../../store/use-character.store";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import Image from "next/image";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { rawCdnUrl } from "@/src/utils/helpers";
import { motion } from "motion/react";

const EidolonTab = () => {
  const charId = useCharacterStore((state) => state.id);
  const charData = useCharacterStore((state) => state.charData);
  const parseDesc = useParsedDesc();

  const charConfig = useUserStore(
    (state) => state.characters[charId as string] ?? DEFAULT_CHAR_CONFIG,
  );
  const updateChar = useUserStore((state) => state.updateCharacter);

  const ranks = useMemo(() => {
    if (!charData) return;
    const ranks = Object.values(charData.ranks);
    const ranksEnhanced = Object.values(charData.ranks_enhanced);

    // Some characters (Trailblazer) might have enhanced ranks
    const activeRanks =
      charConfig.enhanced && ranksEnhanced.length > 0 ? ranksEnhanced : ranks;

    return activeRanks;
  }, [charData, charConfig.enhanced]);

  if (!ranks) return null;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar h-full min-h-0 w-full">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {ranks.map((rank, index) => {
          const val = index + 1;
          const currentRank = charConfig.rank;
          const isLocked = currentRank < val;

          return (
            <motion.div
              key={rank.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center group cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] p-4 rounded-2xl border border-white/[0.04] transition-colors"
              onClick={() => {
                const setToZero = currentRank === val ? val - 1 : val;
                updateChar(Number(charId), {
                  rank: setToZero,
                });
              }}
            >
              <div className="relative w-48 h-48 mb-4 transition-transform duration-300 group-hover:scale-105">
                <Image
                  unoptimized
                  src={rawCdnUrl(rank.picture)}
                  alt={`Eidolon ${rank.rank}`}
                  fill
                  className={`object-contain transition-all duration-300 ${isLocked ? "grayscale opacity-50 blur-[1px]" : "drop-shadow-lg"}`}
                />
              </div>

              <div className="text-center w-full">
                <h4 className="font-bold text-lg mb-3 text-white/90">
                  <span className="text-white/40 mr-2">{val}.</span>
                  {rank.name}
                </h4>
                <div
                  className="text-xs text-white/60 leading-relaxed font-light text-left"
                  dangerouslySetInnerHTML={{
                    __html: parseDesc(rank.desc, rank.params),
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default EidolonTab;
