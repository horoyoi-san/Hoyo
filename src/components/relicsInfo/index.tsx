"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import useUserDataStore from "@/stores/userDataStore";
import { useTranslations } from "next-intl";
import { slotIconMap } from "../card/relicCard";
import useModelStore from '@/stores/modelStore';
import { replaceByParam } from '@/helper';
import useRelicMakerStore from '@/stores/relicMakerStore';
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import { getLocaleName } from '@/helper';
import useLocaleStore from "@/stores/localeStore";
import { useShallow } from 'zustand/react/shallow';
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { calcCharacterTotalStats } from "@/helper/calcCharacterStats";

export default function RelicsInfo() {
  const router = useRouter();

  const { setSelectedRelicSlot, selectedRelicSlot } = useRelicMakerStore(
    useShallow((state) => ({
      setSelectedRelicSlot: state.setSelectedRelicSlot,
      selectedRelicSlot: state.selectedRelicSlot,
    }))
  )

  const {
    setIsOpenQuickView,
    setIsOpenManageProfiles,
  } = useModelStore(
    useShallow((state) => ({
      setIsOpenQuickView: state.setIsOpenQuickView,
      setIsOpenManageProfiles: state.setIsOpenManageProfiles,
    }))
  )
  const transI18n = useTranslations("DataPage")

  const getSlotName = (slot: string) => {
    const slotKey = slotIconMap[slot]?.key;
    return slotKey && transI18n.has(slotKey) ? transI18n(slotKey) : slot;
  };
  const { avatarSelected } = useCurrentDataStore(
    useShallow((state) => ({
      avatarSelected: state.avatarSelected,
    }))
  )
  const { mapRelicSet, subAffix, mainAffix, mapAvatar, mapLightCone } = useDetailDataStore(
    useShallow((state) => ({
      mapRelicSet: state.mapRelicSet,
      subAffix: state.subAffix,
      mainAffix: state.mainAffix,
      mapAvatar: state.mapAvatar,
      mapLightCone: state.mapLightCone,
    }))
  )
  const { locale } = useLocaleStore(
    useShallow((state) => ({
      locale: state.locale,
    }))
  )

  const userAvatar = useUserDataStore(state => state.avatars[avatarSelected?.ID ?? ""])
  const setAvatar = useUserDataStore(state => state.setAvatar)
  const currentProfile = userAvatar?.profileList?.[userAvatar.profileSelect] ?? userAvatar?.profileList?.[0]

  const relicStats = useMemo(() => calcCharacterTotalStats({
    avatarSelected,
    avatarData: userAvatar,
    avatarProfile: currentProfile,
    mapAvatar,
    mapLightCone,
    mainAffix,
    subAffix,
    mapRelicSet,
    transI18n,
  }), [avatarSelected, userAvatar, currentProfile, mapAvatar, mapLightCone, mainAffix, subAffix, mapRelicSet, transI18n])

  const [relicSlotToDelete, setRelicSlotToDelete] = useState<string | null>(null);

  const handleShow = (modalId: string) => {
    const modal = document.getElementById(modalId) as HTMLDialogElement | null;
    if (modal) {
      modal.classList.add("modal-open");
      modal.setAttribute("open", "true");
    }
  };

  const handleCloseModal = (modalId: string) => {
    const modal = document.getElementById(modalId) as HTMLDialogElement | null;
    if (modal) {
      modal.classList.remove("modal-open");
      modal.removeAttribute("open");
    }
  };


  const getRelic = useCallback((slot: string) => {
    const avatar = userAvatar;
    if (avatar) {
      const profile = avatar.profileList?.[avatar.profileSelect] ?? avatar.profileList?.[0];
      return profile?.relics?.[slot] || null;
    }
    return null;
  }, [userAvatar]);

  const handlerDeleteRelic = (slot: string) => {
    const avatar = userAvatar;
    if (avatar) {
      const profileIndex = avatar.profileSelect;
      const currentProfile = avatar.profileList?.[profileIndex];
      if (currentProfile) {
        const newRelics = { ...currentProfile.relics };
        delete newRelics[slot];
        const newProfileList = [...avatar.profileList];
        newProfileList[profileIndex] = {
          ...currentProfile,
          relics: newRelics,
        };
        setAvatar({
          ...avatar,
          profileList: newProfileList,
        });
      }
    }
  };

  const requestDeleteRelic = (slot: string) => {
    setRelicSlotToDelete(slot);
    handleShow("delete_relic_confirm_modal");
  };

  const handleConfirmDelete = () => {
    if (relicSlotToDelete) {
      handlerDeleteRelic(relicSlotToDelete);
      toast.success(transI18n("relicDeletedSuccessfully"));
      handleCloseModal("delete_relic_confirm_modal");
      setRelicSlotToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    handleCloseModal("delete_relic_confirm_modal");
    setRelicSlotToDelete(null);
  };

  const handlerChangeRelic = (slot: string) => {
    setSelectedRelicSlot(slot)
    router.push(`/relic-picker?slot=${slot}`, { scroll: false })
  }

  const relicEffects = useMemo(() => {
    const avatar = userAvatar;
    const relicCount: { [key: string]: number } = {};
    const currentProfile = avatar?.profileList?.[avatar?.profileSelect] ?? avatar?.profileList?.[0];
    if (currentProfile?.relics) {
      for (const relic of Object.values(currentProfile.relics)) {
        if (relic) {
          relicCount[relic.relic_set_id] = (relicCount[relic.relic_set_id] || 0) + 1;
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
  }, [userAvatar]);
  const hasEquippedRelics = Object.values(currentProfile?.relics ?? {}).some(Boolean);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (relicSlotToDelete) setRelicSlotToDelete(null);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [relicSlotToDelete]);

  useEffect(() => {
    if (!selectedRelicSlot) {
      setSelectedRelicSlot("1");
    }
  }, [selectedRelicSlot, setSelectedRelicSlot]);

  const relicSlots = [
    { slot: "1", left: "26%", top: "18%" },
    { slot: "2", left: "44%", top: "39%" },
    { slot: "3", left: "83%", top: "27%" },
    { slot: "4", left: "78%", top: "80%" },
    { slot: "5", left: "19%", top: "72%" },
    { slot: "6", left: "58%", top: "65%" },
  ];

  return (
    <div className="relative h-[calc(100dvh-10rem)] min-h-[520px] w-full">
      <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_13rem] xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative flex min-h-0 items-center justify-center">
          <div className="relative aspect-square w-full max-w-[500px] select-none">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[7%] rounded-full border-2 border-blue-100/90 shadow-[0_0_22px_rgba(147,197,253,0.8),inset_0_0_24px_rgba(96,165,250,0.3)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[11%] rounded-full border border-white/20"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[17%] rounded-full bg-[radial-gradient(circle,rgba(49,87,159,0.18),rgba(17,24,39,0.04)_72%,transparent)]"
            />
            {relicSlots.map(({ slot, left, top }) => {
              const equipped = getRelic(slot);
              const slotInfo = slotIconMap[slot];
              return (
                <div
                  key={slot}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left, top }}
                >
                  <button
                    type="button"
                    title={transI18n(slotInfo.key)}
                    aria-label={`${transI18n(slotInfo.key)}${equipped ? ` +${equipped.level}` : ""}`}
                    onClick={() => handlerChangeRelic(slot)}
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition hover:scale-105 sm:h-[88px] sm:w-[88px] ${
                      equipped
                        ? "border-amber-200 bg-slate-950/65 shadow-[0_0_18px_rgba(253,230,138,0.55)]"
                        : "border-amber-200/80 bg-slate-950/45 shadow-[0_0_14px_rgba(253,230,138,0.22)]"
                    }`}
                  >
                    {equipped ? (
                      <Image
                        src={`${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${equipped.relic_set_id}_${slot}.webp`}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        className="h-14 w-14 object-contain"
                      />
                    ) : (
                      <span className="text-3xl font-light text-white">+</span>
                    )}
                    <span className="absolute -bottom-3 flex items-center gap-1 rounded-full bg-black/90 px-2 py-0.5 text-xs font-bold text-white shadow">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-300" />
                      +{equipped?.level ?? 0}
                    </span>
                  </button>
                  {equipped && (
                    <button
                      type="button"
                      aria-label={transI18n("deleteRelic")}
                      title={transI18n("deleteRelic")}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestDeleteRelic(slot);
                      }}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="hidden overflow-y-auto pt-6 text-right text-sm text-white lg:block">
          {(["HP", "ATK", "DEF"] as const).map((key) => {
            const stat = relicStats?.[key];
            return stat ? (
              <div key={key} className="flex h-7 items-center justify-between border-b border-white/15">
                <span className="flex items-center gap-1.5">
                  <Image src={`${process.env.CDN_URL}/${stat.icon}`} alt="" width={16} height={16} unoptimized className="h-4 w-4 object-contain" />
                  {stat.name}
                </span>
                <span className="font-mono">{Math.round(stat.value)}</span>
              </div>
            ) : null;
          })}
          <p className="mt-3 border-b border-white/20 pb-1 text-left font-semibold">{transI18n("setEffects")}</p>
          <div className="max-h-[55vh] overflow-y-auto text-left">
            {relicEffects.map((setEffect) => {
              const relicInfo = mapRelicSet[setEffect.key];
              if (!relicInfo) return null;
              return (
                <div key={setEffect.key} className="py-2">
                  <p className="font-bold leading-snug text-amber-300">
                    {getLocaleName(locale, relicInfo.Name)} ({setEffect.count})
                  </p>
                  {Object.entries(relicInfo.Skills).map(([requireNum, value]) => {
                    if (Number(requireNum) > setEffect.count) return null;
                    return (
                      <p key={requireNum} className="mt-1 leading-relaxed text-emerald-400">
                        {replaceByParam(getLocaleName(locale, value.Desc), value.Param || [])}
                      </p>
                    );
                  })}
                </div>
              );
            })}
            {!hasEquippedRelics && <p className="pt-2 text-white/60">{transI18n("noRelicEquipped")}</p>}
          </div>
        </aside>
      </div>

      <div className="absolute bottom-4 left-[28%] z-10 flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpenManageProfiles(true)}
          className="rounded-full border border-white/80 bg-white/90 px-5 py-1 text-xs font-semibold text-black shadow-sm hover:bg-white"
        >
          {transI18n("loadout")}
        </button>
        <button
          type="button"
          onClick={() => setIsOpenQuickView(true)}
          className="hidden rounded-full border border-white/80 bg-white/90 px-4 py-1 text-xs font-semibold text-black shadow-sm hover:bg-white sm:inline-flex"
        >
          {transI18n("quickView")}
        </button>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/relic-picker?slot=${selectedRelicSlot || "1"}`, { scroll: false })}
        className="absolute bottom-4 right-0 z-10 min-w-36 rounded-full border border-white/80 bg-white/90 px-5 py-1 text-xs font-semibold text-black shadow-sm hover:bg-white"
      >
        {transI18n("switch")}
      </button>

      <dialog id="delete_relic_confirm_modal" className={`modal modal-bottom sm:modal-middle ${relicSlotToDelete ? "modal-open" : ""}`} open={Boolean(relicSlotToDelete)}>
        <div className="modal-box max-w-md bg-base-100/95 border border-white/10 shadow-2xl rounded-2xl p-6 overflow-hidden relative">
          <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-500/15 rounded-full" />

          <div className="relative z-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <Trash2 className="w-6 h-6 stroke-[1.75]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-base-content tracking-tight">
                {transI18n("deleteRelic")}
              </h3>
              <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                {transI18n("deleteRelicConfirm")}{" "}
                <span className="font-bold text-amber-400 capitalize font-mono">
                  {relicSlotToDelete ? getSlotName(relicSlotToDelete) : ""}
                </span>
                ?
              </p>
            </div>

            {relicSlotToDelete && getRelic(relicSlotToDelete) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-base-200/70 border border-white/10 text-left">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-base-300/60 border border-amber-500/30 shrink-0">
                  <Image
                    src={`${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${getRelic(relicSlotToDelete)?.relic_set_id}_${relicSlotToDelete}.webp`}
                    alt={transI18n("relic")}
                    unoptimized
                    width={36}
                    height={36}
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-base-content truncate">
                    {getLocaleName(locale, mapRelicSet[getRelic(relicSlotToDelete)?.relic_set_id || ""]?.Name)}
                  </p>
                  <p className="text-[11px] text-base-content/60 font-mono">
                    +{getRelic(relicSlotToDelete)?.level} &bull; <span>{relicSlotToDelete ? getSlotName(relicSlotToDelete) : ""}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="flex-1 h-10 px-4 rounded-xl font-bold text-xs sm:text-sm bg-base-200 hover:bg-base-300 text-base-content/80 hover:text-base-content border border-white/10 transition-all cursor-pointer"
              >
                {transI18n("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 h-10 px-4 rounded-xl font-bold text-xs sm:text-sm bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/25 hover:shadow-rose-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{transI18n("confirmDelete")}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="modal-backdrop bg-black/60 cursor-pointer" onClick={handleCancelDelete} />
      </dialog>
    </div>
  );
}
