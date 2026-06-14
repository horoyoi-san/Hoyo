
import { useTranslation } from "@/src/hooks/use-translation.hook";
import React from "react";
import { Zap, Shield, Heart } from "lucide-react";

export interface EnemyData {
  id: string;
  name: string;
  level: number;
  hp: number;
  speed: number;
  toughness: number;
  weaknesses: string[]; // Array of element names or paths to icons
  imageUrl: string;
}

const EnemyCard = ({ enemy }: { enemy: EnemyData }) => {
  const { t } = useTranslation();
  return (
    <div className="relative group overflow-hidden rounded-xl bg-black/40 border border-white/[0.05] hover:border-white/[0.15] transition-all duration-300">
      
      {/* Background Graphic / Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
      
      {/* Level Badge */}
      <div className="absolute top-2 right-2 z-20 bg-amber-500/90 text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-lg">
        Lv. {enemy.level}
      </div>

      {/* Image */}
      <div className="relative h-32 w-full flex items-center justify-center p-4">
        {/* We use a placeholder div or an image tag if the URL is valid */}
        <div className="absolute inset-0 bg-white/[0.02]" />
        {enemy.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={enemy.imageUrl} alt={enemy.name} className="relative z-0 h-full object-contain filter drop-shadow-md" />
        ) : (
          <div className="size-20 bg-white/10 rounded-full border border-white/20" />
        )}
      </div>

      {/* Stats Section */}
      <div className="relative z-20 p-3 pt-0">
        
        {/* HP */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold text-rose-400 tracking-wider">{t("hp")}</span>
          <span className="text-sm font-mono font-semibold text-white">
            {enemy.hp.toLocaleString()}
          </span>
        </div>

        {/* Speed & Toughness */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Zap size={10} className="text-amber-400" /> {t("speed")}
            </div>
            <div className="text-xs font-mono font-medium text-white">{enemy.speed}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Shield size={10} className="text-blue-400" /> {t("toughness")}
            </div>
            <div className="text-xs font-mono font-medium text-white">{enemy.toughness}</div>
          </div>
        </div>

        {/* Weaknesses */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-white/50 text-center uppercase tracking-widest">
            {t("weakness")}
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {enemy.weaknesses.map((weakness, i) => (
              <div 
                key={i} 
                className="size-5 rounded-full bg-black/60 border border-white/10 flex items-center justify-center shadow-inner"
              >
                {/* Fallback to initials if no icon URL is provided. Ideally render the elemental icon here */}
                <span className="text-[8px] font-bold text-white">{weakness.substring(0, 2).toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EnemyCard;
