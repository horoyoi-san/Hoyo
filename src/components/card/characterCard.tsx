"use client";
import { getDamageTypeIconPath, getNameChar } from '@/helper';
import useLocaleStore from '@/stores/localeStore';
import { AvatarDetail } from '@/types';
import ParseText from '../parseText';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import useDetailDataStore from '@/stores/detailDataStore';
import { useShallow } from 'zustand/react/shallow';

import useUserDataStore from '@/stores/userDataStore';

import { memo } from 'react';

interface CharacterCardProps {
  data: AvatarDetail
  priority?: boolean
  compact?: boolean
}

function CharacterCard({ data, priority = false, compact = false }: CharacterCardProps) {
  const { locale } = useLocaleStore(useShallow((state) => ({ locale: state.locale })));
  const transI18n = useTranslations("DataPage");
  const { baseType, damageType } = useDetailDataStore(
    useShallow((state) => ({
      baseType: state.baseType,
      damageType: state.damageType,
    }))
  )
  const userAvatar = useUserDataStore((state) => state.avatars[data.ID.toString()]);

  const level = userAvatar?.level
  const rank = userAvatar?.data?.rank ?? 0
  const exRankCount = userAvatar?.data?.ex_rank_id_list?.length ?? 0

  const is5Star = data.Rarity === "CombatPowerAvatarRarityType5";
  const is4Star = data.Rarity === "CombatPowerAvatarRarityType4";

  return (
    <div
      className={`group relative flex flex-col items-center ${
        compact ? "rounded-lg" : "rounded-xl"
      } overflow-hidden ${
        compact ? "border-0 bg-transparent" : "border border-base-content/10 bg-base-100"
      } shadow-sm hover:shadow-md cursor-pointer select-none h-full`}
    >
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden ${
          compact
            ? "aspect-[5/6] bg-transparent"
            : `aspect-3/4 bg-linear-to-b ${
                is5Star
                  ? "from-yellow-400 via-amber-500/85 to-amber-700/70"
                  : is4Star
                    ? "from-purple-400 via-purple-600/80 to-purple-800/60"
                    : "from-sky-400 via-blue-600/80 to-blue-800/60"
              }`
        }`}
      >
        {compact && (
          <Image
            src={`/theme/icon/frame/FrameIconRarity${is5Star ? "05" : "04"}.webp`}
            alt=""
            aria-hidden="true"
            width={376}
            height={512}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-fill"
          />
        )}

        {compact ? (
          <div className="absolute inset-x-[3px] top-[3px] bottom-[10px] z-10 overflow-hidden">
            <Image
              width={376}
              height={512}
              unoptimized
              src={`${process.env.CDN_URL}/${data.Image.AvatarIconPath}`}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              alt={data.ID.toString()}
            />
          </div>
        ) : (
          <Image
            width={376}
            height={512}
            unoptimized
            src={`${process.env.CDN_URL}/${data.Image.AvatarIconPath}`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
            alt={data.ID.toString()}
          />
        )}

        {level && (
          <div className={`absolute z-10 flex items-center gap-1 ${
            compact ? "inset-x-0 bottom-0 justify-center" : "bottom-1 left-1"
          }`}>
            <span className={`rounded bg-black/0 font-bold text-white shadow-xs ${
              compact ? "px-1 py-1.5 text-[9px] font-mono" : "px-2.5 py-0.2 text-[10px] font-mono"
            }`}>
              {compact ? `Lv. ${level}` : level}
            </span>
            {!compact && rank > 0 && (
              <span className="bg-amber-500/80 text-black text-[10px] font-black font-mono px-1 py-0.2 rounded shadow-xs">
                E{rank}
              </span>
            )}
            {!compact && exRankCount > 0 && (
              <span className="bg-purple-600/90 text-white text-[10px] font-black font-mono px-1 py-0.2 rounded shadow-xs">
                +EX{exRankCount > 1 ? exRankCount : ""}
              </span>
            )}
          </div>
        )}

        {damageType?.[data.DamageType]?.Icon && (
          <Image
            width={28}
            height={28}
            unoptimized
            src={getDamageTypeIconPath(data.DamageType)}
            className={`absolute top-1 left-1 z-10 ${compact ? "w-4 h-4" : "w-6 h-6"} object-contain drop-shadow-sm`}
            alt={data.DamageType.toLowerCase()}
          />
        )}

        {!compact && baseType?.[data.BaseType]?.Icon && (
          <Image
            width={28}
            height={28}
            unoptimized
            src={`${process.env.CDN_URL}/${baseType[data.BaseType].Icon}`}
            className={`absolute top-1 right-1 z-10 ${compact ? "w-4 h-4" : "w-6 h-6"} object-contain rounded-full drop-shadow-sm`}
            alt={data.BaseType.toLowerCase()}
            style={{
              boxShadow: "inset 0 0 6px 3px rgba(255, 255, 255, 0.4)"
            }}
          />
        )}
      </div>

      {!compact && (
        <div className="w-full py-1.5 px-1 text-center flex items-center justify-center bg-base-100 min-h-11">
          <ParseText
            locale={locale}
            text={getNameChar(locale, transI18n, data)}
            className="font-bold text-xs sm:text-[11.5px] lg:text-xs leading-tight px-0.5 text-base-content group-hover:text-primary transition-colors text-center w-full"
          />
        </div>
      )}
    </div>
  );
}

export default memo(CharacterCard);
