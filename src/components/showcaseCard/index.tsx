"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import useListAvatarStore from "@/stores/avatarStore";
import { FastAverageColor, FastAverageColorResult } from 'fast-average-color';
import NextImage from 'next/image';
import ParseText from '../parseText';
import useLocaleStore from '@/stores/localeStore';
import { calcAffixBonus, calcBaseStat, calcBaseStatRaw, calcBonusStatRaw, calcMainAffixBonus, calcMainAffixBonusRaw, calcPromotion, calcSubAffixBonusRaw, convertToRoman, getNameChar, replaceByParam } from '@/helper';
import useUserDataStore from '@/stores/userDataStore';
import { traceShowCaseMap } from '@/constant/traceConstant';
import { StatusAddType } from '@/types';
import { mappingStats } from '@/constant/constant';
import useLightconeStore from '@/stores/lightconeStore';
import { useTranslations } from 'next-intl';
import useAffixStore from '@/stores/affixStore';
import useRelicStore from '@/stores/relicStore';
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas-pro';

export default function ShowCaseInfo() {
  const { avatarSelected, mapAvatarInfo } = useListAvatarStore()
  const { mapLightconeInfo } = useLightconeStore()
  const { mapMainAffix, mapSubAffix } = useAffixStore()
  const { avatars } = useUserDataStore()
  const [avgColor, setAvgColor] = useState('#222');
  const imgRef = useRef(null);
  const cardRef = useRef(null)
  const { locale } = useLocaleStore()
  const transI18n = useTranslations("DataPage")
  const { mapRelicInfo } = useRelicStore()

  const handleSaveImage = useCallback(() => {
    if (cardRef.current === null || !avatarSelected) {
      toast.error("Avatar showcase not found!");
      return;
    }

    html2canvas(cardRef.current, {scale: 2, backgroundColor: '#000000'})
      .then(function (canvas: HTMLCanvasElement) {
        const link = document.createElement('a');
        link.download = `${getNameChar(locale, avatarSelected)}_showcase.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      })
      .catch(() => {
        toast.error("Error generating showcase card!");
      });
  }, [cardRef, avatarSelected, locale])

  useEffect(() => {
    if (!avatarSelected?.id) return;
    const fac = new FastAverageColor();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://api.hakush.in/hsr/UI/avatardrawcard/${avatarSelected.id}.webp`;

    img.onload = () => {
      fac.getColorAsync(img).then((color: FastAverageColorResult) => {
        setAvgColor(color.hex); // #RRGGBB
      });
    };
  }, [avatarSelected]);

  const avatarInfo = useMemo(() => {
    if (!avatarSelected) return
    return mapAvatarInfo[avatarSelected.id]
  }, [avatarSelected, mapAvatarInfo])

  const avatarSkillTree = useMemo(() => {
    if (!avatarSelected || !avatars[avatarSelected.id]) return {}
    if (avatars[avatarSelected.id].enhanced) {
      return avatarInfo?.Enhanced[avatars[avatarSelected.id].enhanced.toString()].SkillTrees || {}
    }
    return avatarInfo?.SkillTrees || {}
  }, [avatarSelected, avatarInfo, avatars])

  const avatarData = useMemo(() => {
    if (!avatarSelected) return
    return avatars[avatarSelected.id]
  }, [avatarSelected, avatars])

  const avatarProfile = useMemo(() => {
    if (!avatarSelected || !avatarData) return
    return avatarData?.profileList?.[avatarData?.profileSelect]
  }, [avatarSelected, avatarData])

  const lightconeStats = useMemo(() => {
    if (!avatarSelected || !avatarProfile?.lightcone || !mapLightconeInfo[avatarProfile?.lightcone?.item_id]) return
    const promotion = calcPromotion(avatarProfile?.lightcone?.level)
    const atkStat = calcBaseStat(
      mapLightconeInfo[avatarProfile?.lightcone?.item_id].Stats[promotion].BaseAttack,
      mapLightconeInfo[avatarProfile?.lightcone?.item_id].Stats[promotion].BaseAttackAdd,
      0,
      avatarProfile?.lightcone?.level
    )
    const hpStat = calcBaseStat(
      mapLightconeInfo[avatarProfile?.lightcone?.item_id].Stats[promotion].BaseHP,
      mapLightconeInfo[avatarProfile?.lightcone?.item_id].Stats[promotion].BaseHPAdd,
      0,
      avatarProfile?.lightcone?.level
    )
    const defStat = calcBaseStat(
      mapLightconeInfo[avatarProfile?.lightcone?.item_id].Stats[promotion].BaseDefence,
      mapLightconeInfo[avatarProfile?.lightcone?.item_id].Stats[promotion].BaseDefenceAdd,
      0,
      avatarProfile?.lightcone?.level
    )
    return {
      attack: atkStat,
      hp: hpStat,
      def: defStat,
    }
  }, [avatarSelected, mapLightconeInfo, avatarProfile])

  const relicEffects = useMemo(() => {
    const avatar = avatars[avatarSelected?.id || ""];
    const relicCount: { [key: string]: number } = {};
    if (avatar) {
      for (const relic of Object.values(avatar.profileList[avatar.profileSelect].relics)) {
        if (relicCount[relic.relic_set_id]) {
          relicCount[relic.relic_set_id]++;
        } else {
          relicCount[relic.relic_set_id] = 1;
        }
      }
    }
    const listEffects: { key: string, count: number }[] = [];
    Object.entries(relicCount).forEach(([key, value]) => {
      if (value >= 2) {
        listEffects.push({ key: key, count: value });
      }
    });
    return listEffects;
  }, [avatars, avatarSelected]);

  const relicStats = useMemo(() => {
    if (!avatarSelected || !avatarProfile?.relics || !mapMainAffix || !mapSubAffix) return

    return Object.entries(avatarProfile?.relics).map(([key, value]) => {
      const mainAffixMap = mapMainAffix["5" + key]
      const subAffixMap = mapSubAffix["5"]
      if (!mainAffixMap || !subAffixMap) return
      return {
        img: `https://api.hakush.in/hsr/UI/relicfigures/IconRelic_${value.relic_set_id}_${key}.webp`,
        mainAffix: {
          property: mainAffixMap?.[value?.main_affix_id]?.property,
          level: value?.level,
          valueAffix: calcMainAffixBonus(mainAffixMap?.[value?.main_affix_id], value?.level),
          detail: mappingStats?.[mainAffixMap?.[value?.main_affix_id]?.property]
        },
        subAffix: value?.sub_affixes?.map((subValue) => {
          return {
            property: subAffixMap?.[subValue?.sub_affix_id]?.property,
            valueAffix: calcAffixBonus(subAffixMap?.[subValue?.sub_affix_id], subValue?.step, subValue?.count),
            detail: mappingStats?.[subAffixMap?.[subValue?.sub_affix_id]?.property]
          }
        })
      }
    })
  }, [avatarSelected, avatarProfile, mapMainAffix, mapSubAffix])

  const characterStats = useMemo(() => {
    if (!avatarSelected || !avatarData) return
    const charPromotion = calcPromotion(avatarData.level)

    const statsData: Record<string, {
      value: number,
      base: number,
      name: string,
      icon: string,
      unit: string,
      round: number
    }> = {
      HP: {
        value: calcBaseStatRaw(
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.HPBase,
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.HPAdd,
          avatarData.level
        ),
        base: calcBaseStatRaw(
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.HPBase,
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.HPAdd,
          avatarData.level
        ),
        name: "HP",
        icon: "/icon/hp.webp",
        unit: "",
        round: 0
      },
      ATK: {
        value: calcBaseStatRaw(
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.AttackBase,
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.AttackAdd,
          avatarData.level
        ),
        base: calcBaseStatRaw(
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.AttackBase,
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.AttackAdd,
          avatarData.level
        ),
        name: "ATK",
        icon: "/icon/attack.webp",
        unit: "",
        round: 0
      },
      DEF: {
        value: calcBaseStatRaw(
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.DefenceBase,
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.DefenceAdd,
          avatarData.level
        ),
        base: calcBaseStatRaw(
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.DefenceBase,
          mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.DefenceAdd,
          avatarData.level
        ),
        name: "DEF",
        icon: "/icon/defence.webp",
        unit: "",
        round: 0
      },
      SPD: {
        value: mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.SpeedBase || 0,
        base: mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.SpeedBase || 0,
        name: "SPD",
        icon: "/icon/speed.webp",
        unit: "",
        round: 1
      },
      CRITRate: {
        value: mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.CriticalChance || 0,
        base: mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.CriticalChance || 0,
        name: "CRIT Rate",
        icon: "/icon/crit-rate.webp",
        unit: "%",
        round: 1
      },
      CRITDmg: {
        value: mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.CriticalDamage || 0,
        base: mapAvatarInfo?.[avatarSelected.id]?.Stats[charPromotion]?.CriticalDamage || 0,
        name: "CRIT DMG",
        icon: "/icon/crit-damage.webp",
        unit: "%",
        round: 1
      },
      BreakEffect: {
        value: 0,
        base: 0,
        name: "Break Effect",
        icon: "/icon/break-effect.webp",
        unit: "%",
        round: 1
      },
      EffectRES: {
        value: 0,
        base: 0,
        name: "Effect RES",
        icon: "/icon/effect-res.webp",
        unit: "%",
        round: 1
      },
      EnergyRate: {
        value: 0,
        base: 0,
        name: "Energy Rate",
        icon: "/icon/energy-rate.webp",
        unit: "%",
        round: 1
      },
      EffectHitRate: {
        value: 0,
        base: 0,
        name: "Effect Hit Rate",
        icon: "/icon/effect-hit-rate.webp",
        unit: "%",
        round: 1
      },
      HealBoost: {
        value: 0,
        base: 0,
        name: "Healing Boost",
        icon: "/icon/healing-boost.webp",
        unit: "%",
        round: 1
      },
      PhysicalAdd: {
        value: 0,
        base: 0,
        name: "Physical Boost",
        icon: "/icon/physical-add.webp",
        unit: "%",
        round: 1
      },
      FireAdd: {
        value: 0,
        base: 0,
        name: "Fire Boost",
        icon: "/icon/fire-add.webp",
        unit: "%",
        round: 1
      },
      IceAdd: {
        value: 0,
        base: 0,
        name: "Ice Boost",
        icon: "/icon/ice-add.webp",
        unit: "%",
        round: 1
      },
      ThunderAdd: {
        value: 0,
        base: 0,
        name: "Thunder Boost",
        icon: "/icon/thunder-add.webp",
        unit: "%",
        round: 1
      },
      WindAdd: {
        value: 0,
        base: 0,
        name: "Wind Boost",
        icon: "/icon/wind-add.webp",
        unit: "%",
        round: 1
      },
      QuantumAdd: {
        value: 0,
        base: 0,
        name: "Quantum Boost",
        icon: "/icon/quantum-add.webp",
        unit: "%",
        round: 1
      },
      ImaginaryAdd: {
        value: 0,
        base: 0,
        name: "Imaginary Boost",
        icon: "/icon/imaginary-add.webp",
        unit: "%",
        round: 1
      },
    }

    if (avatarProfile?.lightcone && mapLightconeInfo[avatarProfile?.lightcone?.item_id]) {
      const lightconePromotion = calcPromotion(avatarProfile?.lightcone?.level)
      statsData.HP.value += calcBaseStatRaw(
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseHP,
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseHPAdd,
        avatarProfile?.lightcone?.level
      )
      statsData.HP.base += calcBaseStatRaw(
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseHP,
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseHPAdd,
        avatarProfile?.lightcone?.level
      )
      statsData.ATK.value += calcBaseStatRaw(
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseAttack,
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseAttackAdd,
        avatarProfile?.lightcone?.level
      )
      statsData.ATK.base += calcBaseStatRaw(
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseAttack,
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseAttackAdd,
        avatarProfile?.lightcone?.level
      )
      statsData.DEF.value += calcBaseStatRaw(
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseDefence,
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseDefenceAdd,
        avatarProfile?.lightcone?.level
      )
      statsData.DEF.base += calcBaseStatRaw(
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseDefence,
        mapLightconeInfo?.[avatarProfile?.lightcone?.item_id]?.Stats[lightconePromotion]?.BaseDefenceAdd,
        avatarProfile?.lightcone?.level
      )

      const bonusData = mapLightconeInfo[avatarProfile?.lightcone?.item_id].Bonus?.[avatarProfile?.lightcone.rank - 1]
      if (bonusData && bonusData.length > 0) {
        const bonusSpd = bonusData.filter((bonus) => bonus.type === "BaseSpeed")
        const bonusOther = bonusData.filter((bonus) => bonus.type !== "BaseSpeed")
        bonusSpd.forEach((bonus) => {
          statsData.SPD.value += bonus.value
          statsData.SPD.base += bonus.value
        })
        bonusOther.forEach((bonus) => {
          const statsBase = mappingStats?.[bonus.type]?.baseStat
          if (statsBase && statsData[statsBase]) {
            statsData[statsBase].value += calcBonusStatRaw(bonus.type, statsData[statsBase].base, bonus.value)
          }
        })
      }
    }
    if (avatarSkillTree) {
      Object.values(avatarSkillTree).forEach((value) => {
        if (value?.["1"]
          && value?.["1"]?.PointID
          && typeof avatarData?.data?.skills?.[value?.["1"]?.PointID] === "number"
          && avatarData?.data?.skills?.[value?.["1"]?.PointID] !== 0
          && value?.["1"]?.StatusAddList
          && value?.["1"].StatusAddList.length > 0) {
          value?.["1"]?.StatusAddList.forEach((status) => {
            const statsBase = mappingStats?.[status?.PropertyType]?.baseStat
            if (statsBase && statsData[statsBase]) {
              statsData[statsBase].value += calcBonusStatRaw(status?.PropertyType, statsData[statsBase].base, status.Value)
            }
          })
        }
      })
    }



    if (avatarProfile?.relics && mapMainAffix && mapSubAffix) {
      Object.entries(avatarProfile?.relics).forEach(([key, value]) => {
        const mainAffixMap = mapMainAffix["5" + key]
        const subAffixMap = mapSubAffix["5"]
        if (!mainAffixMap || !subAffixMap) return
        const mainStats = mappingStats?.[mainAffixMap?.[value.main_affix_id]?.property]?.baseStat
        if (mainStats && statsData[mainStats]) {
          statsData[mainStats].value += calcMainAffixBonusRaw(mainAffixMap?.[value.main_affix_id], value.level, statsData[mainStats].base)
        }
        value?.sub_affixes.forEach((subValue) => {
          const subStats = mappingStats?.[subAffixMap?.[subValue.sub_affix_id]?.property]?.baseStat
          if (subStats && statsData[subStats]) {
            statsData[subStats].value += calcSubAffixBonusRaw(subAffixMap?.[subValue.sub_affix_id], subValue.step, subValue.count, statsData[subStats].base)
          }
        })
      })
    }

    if (relicEffects && relicEffects.length > 0) {
      relicEffects.forEach((relic) => {
        const dataBonus = mapRelicInfo?.[relic.key]?.Bonus
        if (!dataBonus || Object.keys(dataBonus).length === 0) return
        Object.entries(dataBonus || {}).forEach(([key, value]) => {
          if (relic.count < Number(key)) return
          value.forEach((bonus) => {
            const statsBase = mappingStats?.[bonus.type]?.baseStat
            if (statsBase && statsData[statsBase]) {
              statsData[statsBase].value += calcBonusStatRaw(bonus.type, statsData[statsBase].base, bonus.value)
            }
          })
        })
      })
    }


    return statsData
  }, [
    avatarSelected,
    avatarData,
    mapAvatarInfo,
    avatarProfile?.lightcone,
    avatarProfile?.relics,
    mapLightconeInfo,
    mapMainAffix,
    mapSubAffix,
    relicEffects,
    mapRelicInfo,
    avatarSkillTree
  ])
  const applyBrightness = useCallback((hex: string, brightness: number): string => {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * brightness);
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * brightness);
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * brightness);
  
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }, [])
  
  const getImageSkill = useCallback((icon: string | undefined, status: StatusAddType | undefined) => {
    if (!icon) return
    if (icon.startsWith("SkillIcon")) {
      if (Number(avatarSelected?.id) > 8000 && Number(avatarSelected?.id) % 2 === 0) {
        return `https://homdgcat.wiki/images/skillicons/avatar/${Number(avatarSelected?.id) - 1}/${icon.replaceAll(avatarSelected?.id || "", (Number(avatarSelected?.id) - 1).toString())}`
      }
      return `https://homdgcat.wiki/images/skillicons/avatar/${avatarSelected?.id}/${icon}`
    } else if (status && mappingStats[status.PropertyType]) {
      return mappingStats[status.PropertyType].icon
    }
    else if (icon.startsWith("Icon")) {
      return `https://api.hakush.in/hsr/UI/trace/${icon.replace(".png", ".webp")}`
    }
    return ""
  }, [avatarSelected])

  return (
    <div className="flex flex-col justify-start m-2 text-white">
      <div className="flex items-center justify-start mt-4 mb-4">
        <button className="btn btn-success w-24 text-sm" onClick={handleSaveImage}>Save Img</button>
      </div>

      <div  className="overflow-auto">
        <div 
        ref={cardRef} 
        className=" relative min-h-[650px] w-[1400px] rounded-3xl transition-all duration-500"
        style={{
          backgroundColor: `${applyBrightness(avgColor, 0.3)}`,
          backdropFilter: "blur(50px)",
          WebkitBackdropFilter: "blur(50px)",
        }}
        >
          <div className="absolute bottom-2 left-4 z-10">
            <span className="shadow-black [text-shadow:1px_1px_2px_var(--tw-shadow-color)]"></span>
          </div>
          <div className="flex flex-row items-center">
            <div
              className="relative min-h-[650px] w-[24%]"
            >
              <div className="flex justify-center items-center w-full h-full overflow-hidden">
                {avatarSelected && (
                  <NextImage
                    ref={imgRef}
                    src={`https://api.hakush.in/hsr/UI/avatardrawcard/${avatarSelected?.id}.webp`}
                    className="object-cover scale-[2]"
                    alt="Character Preview"
                    width={1024}
                    height={1024}
                    priority={true}
                    style={{
                      position: 'absolute',
                      top: `130px`,
                      left: `0px`,
                    }}
                  />
                )}
              </div>
            </div>

            <div
              className="relative flex min-h-[650px] w-[76%] flex-row items-center gap-3.5 rounded-3xl pl-10 z-10 transition-all duration-500"
              style={{
                backgroundColor: `${applyBrightness(avgColor, 0.5)}`,
                backdropFilter: "blur(50px)",
                WebkitBackdropFilter: "blur(50px)",
              }}
            >

              <div className="absolute top-4 left-4">
                {avatarSelected && avatarInfo && avatarData?.data && typeof avatarData?.data?.rank === "number" && (
                  <div className="flex flex-col">
                    {avatarInfo?.RankIcon.map((src, index) => {
                      const isActive = avatarData?.data?.rank > index;

                      return (
                        <div key={index} className="relative my-1 flex rounded-full">
                          <NextImage
                            src={src}
                            alt="Rank Icon"
                            width={50}
                            height={50}
                            className="h-auto w-12 transition-all duration-300 ease-in-out p-[1px] rounded-full"
                            style={{
                              opacity: isActive ? 1 : 0.6,
                              filter: isActive
                                ? 'grayscale(0) drop-shadow(0 0 8px rgba(255,215,0,0.5))'
                                : 'grayscale(1)',
                              border: '2px solid',
                              borderColor: isActive ? '#facc15' : '#ffffff', // tailwind yellow-400 = #facc15
                              boxShadow: isActive ? '0 0 10px rgba(250,204,21,0.5)' : undefined, // mimic shadow-yellow-400/50
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

              <div className="flex h-[650px] w-1/3 flex-col justify-between py-3 pl-8">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex flex-row items-center justify-between">
                      <ParseText className="text-3xl" text={getNameChar(locale, avatarSelected || undefined)} locale={locale} />
                    </div>
                    <div className="flex flex-row items-center gap-6">
                      <div className="text-2xl text-[#d8b46e]">Lv. <span className="text-white">{avatarData?.level}</span>/<span className="text-neutral-400">80</span></div>
                      {avatarSelected && (
                        <div className="flex gap-1">
                          <NextImage src={`/icon/${avatarSelected?.baseType.toLowerCase()}.webp`} alt="Path Icon" width={32} height={32} className="h-auto w-8" />
                          <NextImage src={`/icon/${avatarSelected?.damageType.toLowerCase()}.webp`} alt="Element Icon" width={32} height={32} className="h-auto w-8" />
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="relative flex h-[225px] w-auto flex-row items-center">
                    {avatarSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <NextImage src={`/icon/${avatarSelected?.baseType.toLowerCase()}.webp`} alt="Path Icon" width={160} height={160} className="h-40 w-40 opacity-20" />
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      {avatarData && avatarInfo && avatarSkillTree && traceShowCaseMap[avatarSelected?.baseType || ""]
                        && Object.values(traceShowCaseMap[avatarSelected?.baseType || ""] || []).map((item, index) => {
                          return (
                            <div key={`row-${index}`} className="flex flex-row items-center">
                              {item.map((btn, idx) => {
                                const size = btn.size || "small";
                                const isBig = size === "big";
                                const isMedium = size === "medium";
                                const isBigMemory = size === "big-memory";

                                const sizeClass = isBigMemory ? "w-12 h-12 mx-1" : isBig ? "w-12 h-12 mx-1" : isMedium ? "w-10 h-10" : "w-8 h-8";

                                const imageSize = isBigMemory ? "w-10" : isBig ? "w-10" : isMedium ? "w-8" : "w-6";

                                const bgColor = isBigMemory
                                  ? "bg-[#2a1a39]/80"
                                  : isBig
                                    ? "bg-[#2b1d00]/80"
                                    : isMedium
                                      ? "bg-[#2b1d00]/50"
                                      : "bg-[#000000]/50";

                                const filterClass = isBigMemory
                                  ? "filter sepia brightness-80 hue-rotate-[280deg] saturate-400 contrast-130"
                                  : isBig
                                    ? "filter sepia brightness-150 hue-rotate-15 saturate-200"
                                    : "";

                                return (
                                  <div key={`item-${idx}`} className="relative flex flex-row items-center">
                                    <div
                                      className={
                                        `relative flex items-center justify-center ${sizeClass} 
                                        rounded-full ${bgColor} border-2 border-gray-500
                                        ${avatarData.data.skills[avatarSkillTree?.[btn.id]?.["1"]?.PointID] ? "" : "opacity-50"}
                                      `}
                                    >
                                      <NextImage
                                        src={
                                          getImageSkill(
                                            avatarInfo.SkillTrees?.[btn.id]?.["1"]?.Icon,
                                            avatarSkillTree?.[btn.id]?.["1"]?.StatusAddList[0]
                                          ) || ""
                                        }
                                        alt={btn.id}
                                        width={32}
                                        height={32}
                                        className={`h-auto ${imageSize} ${filterClass}`}
                                      />
                                      {(isBig || isBigMemory) && (
                                        <span className="absolute bottom-0 left-0 text-[12px] text-white bg-black/70 px-1 rounded-sm">
                                          {avatarData?.data?.skills?.[avatarSkillTree?.[btn.id]?.["1"]?.PointID] ? avatarData?.data?.skills?.[avatarSkillTree?.[btn.id]?.["1"]?.PointID] : 1}
                                        </span>
                                      )}
                                    </div>

                                    {btn.isLink && idx < item.length - 1 && (
                                      <div className="w-3 h-[3px] bg-white opacity-80 mx-1" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                          )
                        })}
                    </div>

                  </div>
                  {avatarProfile && avatarProfile?.lightcone && lightconeStats ? (
                    <div className="flex flex-row items-center justify-center mb-2">

                      <div className="relative w-36 h-48">
                        {/* Background SVG Border (offset top-left) */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="absolute w-full h-full z-10"
                          style={{
                            color: '#f59e0b',
                            opacity: 0.7,
                            top: '0px',
                            left: '-1px'
                          }}
                          viewBox="0 0 5 7"
                        >
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.9"
                            strokeWidth="0.065"
                            d="m.301.032-.269.25v6.436l.303.25h4.364l.269-.25V.282l-.269-.25z"
                          />
                        </svg>

                        {/* Card Image */}
                        <NextImage
                          className="absolute object-cover rounded-xl z-9 w-[95%]"
                          src={`https://api.hakush.in/hsr/UI/lightconemaxfigures/${avatarProfile?.lightcone.item_id}.webp`}
                          alt="Lightcone Image"
                          width={904}
                          height={1206}
                          style={{
                            top: '0px',
                            left: '6px',
                          }}
                        />

                        {/* Top SVG Border (offset bottom-right) */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="absolute w-full h-full z-8"
                          style={{
                            color: '#f59e0b',
                            opacity: 0.8,
                            bottom: '0px',
                            right: '-4px'
                          }}
                          viewBox="0 0 5 7"
                        >
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.9"
                            strokeWidth="0.065"
                            d="m.301.032-.269.25v6.436l.303.25h4.364l.269-.25V.282l-.269-.25z"
                          />
                          <path
                            d="M.34.004 0 .268v6.464l.33.233L4.71 7 5 6.732V.268L4.71 0Zm.01.06L4.693.03l.22.268.023 6.406-.25.233-4.34.02-.25-.253L.018.297z"
                            style={{
                              fill: 'currentColor',
                              opacity: 0.3
                            }}
                          />
                        </svg>

                        {/* Stars */}
                        <div
                          className="absolute text-yellow-500 font-bold z-10"
                          style={{
                            writingMode: 'vertical-rl',
                            left: '-0.5rem',
                            top: '0.5rem',
                            fontSize: '1.1rem',
                            letterSpacing: '-0.1em',
                            textShadow: `
                            0 0 0.2em #f59e0b,
                            0 0 0.4em #f59e0b,
                            0 0 0.8em #f59e0b,
                            -0.05em -0.05em 0.05em rgba(0,0,0,0.7),
                            0.05em 0.05em 0.05em rgba(0,0,0,0.7)
                          `
                          }}
                        >
                          {[...Array(
                            Number(
                              mapLightconeInfo[avatarProfile?.lightcone?.item_id]?.Rarity?.[
                              mapLightconeInfo[avatarProfile?.lightcone?.item_id]?.Rarity.length - 1
                              ] || 0
                            )
                          )].map((_, i) => (
                            <span key={i}>✦</span>
                          ))}
                        </div>
                      </div>


                      <div className="flex w-2/5 flex-col gap-2 text-white ml-2 h-full">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center h-full">
                            <div className="w-1 h-[70%] bg-yellow-400 mr-2 rounded" />
                            <ParseText
                              className="text-lg font-semibold"
                              locale={locale}
                              text={mapLightconeInfo[avatarProfile?.lightcone?.item_id].Name}
                            />

                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-[#d8b46e]">
                            <div className="h-6 w-6 flex items-center justify-center rounded-full bg-[#5c4022] border border-[#d8b46e] text-[#d8b46e] text-xs font-medium">
                              {convertToRoman(avatarProfile?.lightcone?.rank)}
                            </div>
                            <span>
                              Lv. <span className="text-white">{avatarProfile.lightcone.level}</span>/<span className="text-neutral-400">80</span>
                            </span>
                          </div>
                        </div>

                        {/* Chỉ số */}
                        <div className="flex justify-center items-center flex-col gap-1 mt-1 ">
                          <div className="flex gap-1 text-sm ">
                            <div className="flex items-center gap-1 rounded bg-black/30 px-1 w-fit py-1">
                              <NextImage src="/icon/hp.webp" alt="HP" width={16} height={16} className="w-4 h-4" />
                              <span>{
                                lightconeStats?.hp
                              }</span>
                            </div>
                            <div className="flex items-center gap-1 rounded bg-black/30 px-1 w-fit py-1">
                              <NextImage src="/icon/attack.webp" alt="ATK" width={16} height={16} className="w-4 h-4" />
                              <span>{lightconeStats?.attack}</span>
                            </div>

                          </div>
                          <div className="flex items-center gap-1 rounded bg-black/30 px-1 w-fit py-1">
                            <NextImage src="/icon/defence.webp" alt="DEF" width={16} height={16} className="w-4 h-4" />
                            <span>{lightconeStats?.def}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (<div className="flex h-1/4 items-center text-lg">
                    {transI18n("noLightconeEquipped")}
                  </div>)}
                </div>

              </div>

              <div className="flex h-[650px] w-1/3 flex-col justify-between py-3 z-10">
                <div className="flex w-full flex-col justify-between gap-y-0.5 text-base h-[500px]">
                  {Object.entries(characterStats || {})?.map(([key, stat], index) => {
                    if (!stat || (key.includes("Add") && stat.value === 0)) return null
                    return (
                      <div key={index} className="flex flex-row items-center justify-between">
                        <div className="flex flex-row items-center">
                          <NextImage src={stat?.icon || ""} alt="Stat Icon" width={40} height={40} className="h-auto w-10 p-2" />
                          <span className="font-bold">{stat.name}</span>
                        </div>
                        <div className="ml-3 mr-3 flex-grow border rounded opacity-50" />
                        <div className="flex cursor-default flex-col text-right font-bold">{
                          stat.value ? stat.unit === "%" ? (stat.value * 100).toFixed(stat.round) : stat.value.toFixed(stat.round) : 0
                        }{stat.unit}</div>
                      </div>
                    )
                  })}
                  <hr />
                </div>

                <div className="flex flex-col items-center gap-1 w-full my-2">
                  {relicEffects.map((setEffect, index) => {
                    const relicInfo = mapRelicInfo[setEffect.key];
                    if (!relicInfo) return null;
                    return (
                      <div key={index} className="flex w-full flex-row justify-between text-left">
                        <div
                          className="font-bold truncate max-w-full mr-1"
                          style={{
                            fontSize: 'clamp(0.5rem, 2vw, 1rem)'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: replaceByParam(
                              relicInfo.Name,
                              []
                            )
                          }}
                        />
                        <div>
                          <span className="black-blur bg-black/50 flex w-5 justify-center rounded px-1.5 py-0.5">{setEffect.count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="w-1/3 z-10">
                <div className="flex h-[650px] flex-col justify-between py-3 text-lg">

                  {relicStats?.map((relic, index) => {
                    if (!relic) return null
                    return (
                      <div key={index} className="black-blur relative flex flex-row items-center rounded-s-lg border-l-2 p-1 border-yellow-600">
                        <div className="flex">
                          <NextImage src={relic?.img || ""} width={80} height={80} alt="Relic Icon" className="h-auto w-20" />
                          {/* <img src="https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/deco/Star5.png" alt="Relic Rarity Icon" className="absolute bottom-1 h-auto w-20" /> */}
                          <div
                            className="absolute text-yellow-500 font-bold z-10"
                            style={{
                              left: '0.7rem',
                              bottom: '-0.5rem',
                              fontSize: '1.1rem',
                              letterSpacing: '-0.1em',
                              textShadow: `
                            0 0 0.2em #f59e0b,
                            0 0 0.4em #f59e0b,
                            0 0 0.8em #f59e0b,
                            -0.05em -0.05em 0.05em rgba(0,0,0,0.7),
                            0.05em 0.05em 0.05em rgba(0,0,0,0.7)
                          `
                            }}
                          >
                            ✦✦✦✦✦
                          </div>
                        </div>
                        <div className="mx-1 flex w-1/6 flex-col items-center justify-center">
                          <NextImage src={relic?.mainAffix?.detail?.icon || ""} width={36} height={36} alt="Main Affix Icon" className="h-auto w-9" />
                          <span className="text-base text-[#f1a23c]">{relic?.mainAffix?.valueAffix + relic?.mainAffix?.detail?.unit}</span>
                          <span className="black-blur rounded px-1 text-xs">+{relic?.mainAffix?.level}</span>
                        </div>
                        <div style={{ opacity: 0.5, height: '80px', borderLeftWidth: '1px' }}></div>
                        <div className="m-auto grid w-1/2 grid-cols-2 gap-2">
                          {relic?.subAffix?.map((subAffix, index) => {
                            if (!subAffix) return null
                            return (
                              <div key={index} className="flex flex-col">
                                <div className="flex flex-row items-center">
                                  {subAffix?.detail?.icon ? (
                                    <NextImage src={subAffix?.detail?.icon || ""} width={36} height={36} alt="Sub Affix Icon" className="h-auto w-9" />
                                  ) : (
                                    <div className="h-9 w-9 bg-black/50 rounded flex items-center justify-center">
                                      <span className="text-xs text-white">?</span>
                                    </div>
                                  )}
                                  <span className="text-sm">+{subAffix?.valueAffix + subAffix?.detail?.unit}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  {(!relicStats || !relicStats?.length) && <div className="flex flex-col items-center justify-center ">
                    <span className="text-lg">{transI18n("noRelicEquipped")}</span>
                  </div>}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
