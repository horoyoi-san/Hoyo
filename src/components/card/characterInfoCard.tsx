"use client";

import { memo } from 'react';
import { CharacterInfoCardType } from '@/types';
import useLocaleStore from '@/stores/localeStore';
import Image from 'next/image';
import ParseText from '../parseText';
import useDetailDataStore from '@/stores/detailDataStore';
import { getLocaleName } from '@/helper/getName';
import { getDamageTypeIconPath } from '@/helper';
import { useShallow } from 'zustand/react/shallow';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

function CharacterInfoCard({
    character, 
    selectedCharacters, 
    onCharacterToggle 
}: { 
    character: CharacterInfoCardType, 
    selectedCharacters: CharacterInfoCardType[], 
    onCharacterToggle: (characterId: CharacterInfoCardType) => void 
}) {
    const transI18n = useTranslations("DataPage");
    const isSelected = selectedCharacters.some((selectedCharacter) => selectedCharacter.avatar_id === character.avatar_id);
    const { mapAvatar, mapLightCone, baseType, damageType } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            mapLightCone: state.mapLightCone,
            baseType: state.baseType,
            damageType: state.damageType,
        }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    );

    const avatar = mapAvatar?.[character.avatar_id.toString()];

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 border transition-all duration-300 ease-out cursor-pointer select-none ${
                isSelected
                    ? 'bg-primary/10 border-primary/80 shadow-[0_0_24px_rgba(var(--color-primary-rgb,6,182,212),0.25)] ring-1 ring-primary/60 scale-[1.01]'
                    : 'bg-base-200/50 hover:bg-base-200/90 border-white/10 hover:border-white/25 hover:shadow-lg hover:-translate-y-1'
            }`}
            onClick={() => onCharacterToggle(character)}
        >
            <div className={`absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                isSelected 
                    ? 'bg-primary text-primary-content shadow-md scale-100 ring-2 ring-primary/40' 
                    : 'bg-black/40 border border-white/20 text-transparent scale-90 group-hover:scale-100 group-hover:border-white/40'
            }`}>
                <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            <div className="relative mb-3 aspect-4/5 rounded-xl overflow-hidden bg-radial from-base-300/60 to-base-300/20 flex items-center justify-center">
                {avatar && (
                    <>
                        <Image
                            src={`${process.env.CDN_URL}/${avatar.Image?.AvatarIconPath}`}
                            alt={getLocaleName(locale, avatar.Name)}
                            width={376}
                            height={512}
                            unoptimized
                            loading="lazy"
                            className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-108"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                            {damageType?.[avatar.DamageType]?.Icon && (
                                <div className="p-1 rounded-lg bg-black/65 border border-white/15 shadow-sm" title={avatar.DamageType}>
                                    <Image
                                        width={20}
                                        height={20}
                                        unoptimized
                                        src={getDamageTypeIconPath(avatar.DamageType)}
                                        className="w-4 h-4 object-contain"
                                        alt={avatar.DamageType.toLowerCase()}
                                    />
                                </div>
                            )}
                            {baseType?.[avatar.BaseType]?.Icon && (
                                <div className="p-1 rounded-lg bg-black/65 border border-white/15 shadow-sm" title={avatar.BaseType}>
                                    <Image
                                        width={20}
                                        height={20}
                                        unoptimized
                                        src={`${process.env.CDN_URL}/${baseType[avatar.BaseType].Icon}`}
                                        className="w-4 h-4 object-contain"
                                        alt={avatar.BaseType.toLowerCase()}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="text-center mb-2.5">
                <ParseText 
                    className="text-sm sm:text-base font-bold line-clamp-1 tracking-tight"
                    text={avatar ? getLocaleName(locale, avatar.Name) : character.avatar_id.toString()}
                    locale={locale}
                />
                <div className="flex items-center justify-center gap-2 mt-1.5">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-base-300/80 text-base-content/90 border border-white/5">
                        Lv.{character.level}
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        E{character.rank}
                    </span>
                    {character.ex_rank_count !== undefined && character.ex_rank_count > 0 && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30">
                            +EX{character.ex_rank_count > 1 ? character.ex_rank_count : ""}
                        </span>
                    )}
                </div>
            </div>

            {character.relics.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 justify-items-center py-1.5 px-2.5 rounded-xl bg-base-300/30 w-fit mx-auto mb-2.5">
                    {character.relics.map((relic, index) => (
                        <div key={index} className="relative group/relic">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-base-100/90 border border-amber-500/30 hover:border-amber-400 transition-colors shadow-xs">
                                <Image
                                    src={`${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${relic.relic_set_id}_${relic.relic_id.toString()[relic.relic_id.toString().length - 1]}.webp`}
                                    alt={transI18n("relic")}
                                    unoptimized
                                    width={32}
                                    height={32}
                                    className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                                />
                            </div>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/90 text-[8px] font-mono font-bold text-amber-300 px-1 rounded-full border border-white/10 leading-tight">
                                +{relic.level}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {character.lightcone && character.lightcone.item_id !== 0 && (
                <div className="pt-2 border-t border-white/10 flex items-center gap-2.5">
                    <div className="h-12 w-9 shrink-0 flex items-center justify-center rounded bg-base-300/40 overflow-hidden">
                        <Image
                            unoptimized
                            src={`${process.env.CDN_URL}/${mapLightCone?.[character.lightcone.item_id.toString()]?.Image?.ImagePath}`}
                            alt={transI18n("lightcone")}
                            width={72}
                            height={96}
                            className="h-full w-auto object-contain"
                        />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-semibold truncate leading-tight">
                            <ParseText
                                text={getLocaleName(locale, mapLightCone?.[character.lightcone.item_id.toString()]?.Name)}
                                locale={locale}
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-base-content/70">Lv.{character.lightcone.level}</span>
                            <span className="text-[10px] font-mono font-bold text-primary">S{character.lightcone.rank}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(CharacterInfoCard);