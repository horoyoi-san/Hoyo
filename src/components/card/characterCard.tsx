"use client";

import { getNameChar } from '@/helper';
import useLocaleStore from '@/stores/localeStore';
import { CharacterBasic } from '@/types';
import ParseText from '../parseText';
import Image from 'next/image';

interface CharacterCardProps {
  data: CharacterBasic
}

export default function CharacterCard({ data }: CharacterCardProps) {
  const { locale } = useLocaleStore();
  const text = getNameChar(locale, data)
  return (
<li 
  className="z-10 flex flex-col items-center rounded-lg shadow-md
             bg-gradient-to-br from-base-300 via-base-100 to-warning/70
             transform transition-transform duration-300 ease-in-out 
             hover:scale-105 cursor-pointer min-h-[90px] sm:min-h-[100px] md:min-h-[120px] lg:min-h-[130px] xl:min-h-[140px] 2xl:min-h-[180px] w-full"
>
  <div
    className={`w-full rounded-md bg-gradient-to-br ${data.rank === "CombatPowerAvatarRarityType5"
      ? "from-yellow-400 via-yellow-600/60 to-yellow-800/40"
      : "from-purple-400 via-purple-600/60 to-purple-800/40"
      }`}
  >
    <div className="relative w-full h-32 sm:h-36 md:h-40 lg:h-44 xl:h-48 2xl:h-56">
      <Image
        width={150}
        height={200}
        src={`https://api.hakush.in/hsr/UI/avatarshopicon/${data.id}.webp`}
        priority={true}
        className="w-full h-full rounded-md object-cover"
        alt="ALT"
      />
      <Image
        width={24}
        height={24}
        src={`/icon/${data.damageType.toLowerCase()}.webp`}
        className="absolute top-1 left-1 w-6 h-6 rounded-full"
        alt={data.damageType.toLowerCase()}
      />
      <Image
        width={24}
        height={24}
        src={`/icon/${data.baseType.toLowerCase()}.webp`}
        className="absolute top-1 right-1 w-6 h-6 rounded-full"
        style={{ boxShadow: "inset 0 0 6px 3px #9CA3AF" }}
        alt={data.baseType.toLowerCase()}
      />
    </div>
  </div>

</li>


  );
}
