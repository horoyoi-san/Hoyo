import Image from "next/image";
import { Check } from "lucide-react";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { Separator } from "@/src/components/ui/separator";
import { useTranslation } from "@/src/hooks/use-translation.hook";

export interface PreviewRelic {
  id: string | number;
  setId: string | number;
  name: string;
  icon: string;
  mainStat: { name: string; value: string | number };
  subStats: Array<{ name: string; value: string | number }>;
}

export interface PreviewLightcone {
  id: string | number;
  name: string;
  level: number;
  rank: number;
  icon: string;
}

export interface PreviewCharacter {
  id: string | number;
  name: string;
  level: number;
  rank: number;
  icon: string;
  lightcone?: PreviewLightcone;
  relics: PreviewRelic[];
}

interface PreviewCardProps {
  character: PreviewCharacter;
  isSelected: boolean;
  onToggle: (id: string | number) => void;
}

const PreviewCard = ({ character, isSelected, onToggle }: PreviewCardProps) => {
  const { t } = useTranslation();
  return (
    <div
      className={`relative group overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer flex flex-col bg-background/50 backdrop-blur-sm
        ${
          isSelected
            ? "border-[#00c3ff]/50 shadow-[0_0_15px_rgba(0,195,255,0.15)] bg-white/[0.05]"
            : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
        }
      `}
      onClick={() => onToggle(character.id)}
    >
      {/* SELECTION CHECKMARK */}
      <div
        className={`absolute top-3 right-3 z-20 size-5 rounded-full border flex items-center justify-center transition-all duration-300
          ${
            isSelected
              ? "bg-[#00c3ff] border-[#00c3ff]"
              : "border-white/20 group-hover:border-white/40"
          }
        `}
      >
        {isSelected && <Check size={12} className="text-black font-bold" />}
      </div>

      {/* HEADER: AVATAR & INFO */}
      <div className="flex gap-3 p-4 items-center bg-white/[0.02] border-b border-white/[0.04] relative">
        {/* Subtle glow behind avatar if selected */}
        {isSelected && (
          <div className="absolute top-1/2 left-8 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#00c3ff]/20 rounded-full blur-xl pointer-events-none" />
        )}
        <div className="relative size-14 shrink-0 rounded-full border-2 border-white/10 overflow-hidden bg-black/40">
          <Image
            unoptimized
            src={character.icon}
            alt={character.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-bold text-base truncate text-white/90"
            dangerouslySetInnerHTML={{ __html: character.name }}
          />
          <div className="flex gap-2 items-center text-xs font-semibold mt-1">
            <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-md">
              Lv.{character.level}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md ${
                character.rank > 0
                  ? "bg-[#00c3ff]/20 text-[#00c3ff]"
                  : "bg-white/5 text-white/40"
              }`}
            >
              E{character.rank}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
        {/* LIGHTCONE */}
        <div className="flex gap-3 items-center">
          {character.lightcone ? (
            <>
              <div className="relative w-10 h-14 shrink-0 rounded-md overflow-hidden bg-white/5 border border-white/10">
                <Image
                  unoptimized
                  src={character.lightcone.icon}
                  alt={character.lightcone.name}
                  fill
                  className="object-cover scale-110"
                />
              </div>
              <div className="flex-1 min-w-0 text-xs text-muted-foreground space-y-1">
                <p className="text-white/90 font-medium truncate">
                  {character.lightcone.name}
                </p>
                <div className="flex gap-2">
                  <span>Lv. {character.lightcone.level}</span>
                  <span>S{character.lightcone.rank}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full opacity-50 grayscale">
              <div className="w-10 h-14 shrink-0 rounded-md border border-dashed border-white/20 bg-white/5" />
              <p className="text-xs italic">{t("noLightconeEquipped")}</p>
            </div>
          )}
        </div>

        {/* RELICS */}
        <div className="space-y-2">
          <p className="text-xs uppercase font-bold text-white/40 tracking-wider">
            {t("relics")} ({character.relics.length})
          </p>
          {character.relics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {character.relics.map((relic, idx) => (
                <Tooltip
                  key={`${relic.id}-${idx}`}
                  contentClassName="min-w-40 max-w-72"
                  content={
                    <div className="space-y-2">
                      <p className="text-[#00c3ff] font-medium leading-tight">
                        {relic.name}
                      </p>
                      <div className="text-xs flex justify-between font-bold bg-white/5 p-1.5 rounded-sm">
                        <p className="text-white/80">{relic.mainStat.name}</p>
                        <p className="text-[#00c3ff]">{relic.mainStat.value}</p>
                      </div>
                      <Separator className="bg-white/10" />
                      <div className="space-y-1">
                        {relic.subStats.map((sub, i) => (
                          <div
                            key={i}
                            className="text-xs flex justify-between gap-4 text-white/70"
                          >
                            <p>{sub.name}</p>
                            <p>{sub.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                >
                  <div className="size-8 relative rounded-full border border-white/[0.08] bg-black/40 p-0.5 hover:border-white/30 transition-colors">
                    <Image
                      width={32}
                      height={32}
                      src={relic.icon}
                      alt={relic.name}
                      className="object-contain size-full"
                    />
                  </div>
                </Tooltip>
              ))}
            </div>
          ) : (
            <div className="h-8 flex items-center">
              <p className="text-xs italic text-white/30">{t("noRelicsFound")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewCard;
