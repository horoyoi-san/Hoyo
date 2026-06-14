import { useMemo } from "react";
import { useCharacterStore } from "../../store/use-character.store";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { Lock } from "lucide-react";
import Image from "next/image";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { motion } from "motion/react";
import { imgUrl } from "@/src/utils/helpers";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
} as const;

const EidolonShowcase = () => {
  const charId = useCharacterStore((state) => state.id);
  const charData = useCharacterStore((state) => state.charData);
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

  return (
    <motion.div
      className="flex flex-col absolute top-2 left-56 gap-2 items-center z-30"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {ranks &&
        ranks.map((rank, index) => {
          const currentRank = charConfig.rank;
          const val = index + 1;
          const isLocked = currentRank < val;

          return (
            <motion.div key={rank.id} variants={itemVariants}>
              <Tooltip
                containerClassName="bg-background/50 p-px rounded-full relative"
                content={
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold">{rank.name}</p>
                      <p className="text-xs font-light text-muted-foreground mb-1">
                        Eidolon: {index + 1}
                      </p>
                    </div>
                    <p
                      dangerouslySetInnerHTML={{
                        __html: parseDesc(rank.desc, rank.params),
                      }}
                    />
                  </div>
                }
              >
                {isLocked && (
                  <div className="absolute bg-black/65 rounded-full size-full flex justify-center items-center z-10">
                    <Lock size={16} strokeWidth={3} />
                  </div>
                )}
                <Image
                  unoptimized
                  height={52}
                  width={52}
                  src={imgUrl(rank.icon, "skillicons")}
                  alt={`Eidolon ${rank.rank}`}
                  className={`w-10 ${isLocked ? "grayscale opacity-50" : ""}`}
                />
              </Tooltip>
            </motion.div>
          );
        })}
    </motion.div>
  );
};

export default EidolonShowcase;
