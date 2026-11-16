/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import MountOnOpen from "../mountOnOpen";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { usePathname, useRouter } from 'next/navigation'
import ParseText from "../parseText";
import useLocaleStore from "@/stores/localeStore";
import { getNameChar } from "@/helper/getName";
import { useEffect, useMemo, useState, useRef } from "react";
import useModelStore from "@/stores/modelStore";
import useUserDataStore from "@/stores/userDataStore";
import { ModalConfig, RelicStore, AvatarProfileStore, ActionResult, ConnectErrorCode } from "@/types";
import { toast } from "react-toastify";
import useGlobalStore from "@/stores/globalStore";
import { connectToPS, syncDataToPS } from "@/helper";
import dynamic from "next/dynamic";
import useCopyProfileStore from "@/stores/copyProfile";
import AvatarBar from "../avatarBar";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import { NeedLightcone } from "../requireData";
import { useShallow } from 'zustand/react/shallow';
import { RefreshCw, Plus, Copy, Edit2, Trash2, SlidersHorizontal, Lock } from "lucide-react";
import { pageNavigation } from "@/constant/pageNavigation";

import ModalLoading from "../modalLoading";

const CopyImport = dynamic(() => import("../importBar/copy"), {
  ssr: false,
  loading: () => <ModalLoading message="Loading Profile Cloner..." />
});
const ProfileManagerModal = dynamic(() => import("../profileManager"), {
  ssr: false,
  loading: () => <ModalLoading message="Loading Profile Manager..." />
});

const PAGE_PATHS = ["", "relics-info", "relic-picker", "relic-maker", "eidolons-info", "skills-info", "showcase-card", "lightcone", "lightcone-picker"]

export default function ActionBar() {
  const router = useRouter()
  const pathname = usePathname()

  // Prefetch the other pages once this one has settled.
  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
    let idle: number | undefined
    const run = () => {
      const prefetch = () => PAGE_PATHS.forEach(path => router.prefetch(`/${path}`))
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(prefetch, { timeout: 5000 })
      else prefetch()
    }
    if (document.readyState === "complete") run()
    else window.addEventListener("load", run, { once: true })
    return () => {
      window.removeEventListener("load", run)
      if (idle !== undefined) window.cancelIdleCallback(idle)
    }
  }, [router])
  const { avatarSelected } = useCurrentDataStore(
    useShallow((state) => ({ avatarSelected: state.avatarSelected }))
  )
  const { damageType, baseType } = useDetailDataStore(
    useShallow((state) => ({
      damageType: state.damageType,
      baseType: state.baseType,
    }))
  )
  const { setResetData } = useCopyProfileStore(
    useShallow((state) => ({ setResetData: state.setResetData }))
  )
  const transI18n = useTranslations("DataPage")
  const { locale } = useLocaleStore(
    useShallow((state) => ({ locale: state.locale }))
  )
  const {
    isOpenCreateProfile,
    setIsOpenCreateProfile,
    isOpenCopy,
    setIsOpenCopy,
    isOpenAvatars,
    setIsOpenAvatars,
    isOpenManageProfiles,
    setIsOpenManageProfiles,
  } = useModelStore(
    useShallow((state) => ({
      isOpenCreateProfile: state.isOpenCreateProfile,
      setIsOpenCreateProfile: state.setIsOpenCreateProfile,
      isOpenCopy: state.isOpenCopy,
      setIsOpenCopy: state.setIsOpenCopy,
      isOpenAvatars: state.isOpenAvatars,
      setIsOpenAvatars: state.setIsOpenAvatars,
      isOpenManageProfiles: state.isOpenManageProfiles,
      setIsOpenManageProfiles: state.setIsOpenManageProfiles,
    }))
  )

  const [profileName, setProfileName] = useState("");
  const [formState, setFormState] = useState("EDIT");
  const [profileEdit, setProfileEdit] = useState(-1);
  const { isConnectPS } = useGlobalStore(
    useShallow((state) => ({ isConnectPS: state.isConnectPS }))
  )

  const userAvatar = useUserDataStore(state => state.avatars[avatarSelected?.ID ?? ""])
  const setAvatar = useUserDataStore(state => state.setAvatar)

  const profileCurrent = useMemo(() => {
    if (!avatarSelected) return null;
    const avatar = userAvatar;
    return avatar?.profileList?.[avatar?.profileSelect] ?? avatar?.profileList?.[0] ?? null;
  }, [avatarSelected, userAvatar]);

  const [profileToDelete, setProfileToDelete] = useState<{ id: number; name: string } | null>(null);
  const [dropdownSelectedIndices, setDropdownSelectedIndices] = useState<Set<number>>(new Set());
  const [confirmDropdownBatchOpen, setConfirmDropdownBatchOpen] = useState(false);

  // Controlled dropdown states to prevent ghost overlaying
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  const listProfile = useMemo(() => {
    if (!avatarSelected) return [];
    const avatar = userAvatar;
    return avatar?.profileList || [];
  }, [avatarSelected, userAvatar]);

  const handleUpdateProfile = () => {
    if (!profileName.trim()) return;
    if (formState === "CREATE" && avatarSelected && userAvatar) {
      const newProfile: AvatarProfileStore = {
        profile_name: profileName,
        lightcone: null,
        relics: {} as Record<string, RelicStore>
      };
      const newListProfile = [...listProfile, newProfile];
      setAvatar({ ...userAvatar, profileList: newListProfile, profileSelect: newListProfile.length - 1 })
      toast.success(transI18n("profileCreatedSuccessfully"))
    } else if (formState === "EDIT" && profileCurrent && avatarSelected && profileEdit !== -1) {
      const newListProfile = listProfile.map((p, idx) =>
        idx === profileEdit ? { ...p, profile_name: profileName } : p
      );
      setAvatar({ ...userAvatar, profileList: newListProfile })
      toast.success(transI18n("profileUpdatedSuccessfully"))
    }
    setIsOpenCreateProfile(false);
    handleCloseModal("update_profile_modal");
  };

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
      if (typeof modal.close === "function" && modal.open) {
        try { modal.close(); } catch {}
      }
    }
  };

  const actionMove = (path: string) => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      const scrollContainer = document.querySelector('[data-page-scroll]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
    router.push(`/${path}`, { scroll: false });
  };

  const handleProfileSelect = (profileId: number) => {
    setIsProfileDropdownOpen(false);
    if (!avatarSelected || !userAvatar) return;
    if (userAvatar.profileSelect === profileId) return;
    setAvatar({ ...userAvatar, profileSelect: profileId })
    const selectedProfile = userAvatar.profileList?.[profileId];
    if (selectedProfile) {
      toast.success(`${transI18n("profileSwitched")}: ${selectedProfile.profile_name}`)
    }
  }

  const requestDeleteProfile = (profileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProfileDropdownOpen(false);
    if (!avatarSelected || profileId === 0 || !userAvatar) return;
    const targetProfile = userAvatar.profileList?.[profileId];
    if (!targetProfile) return;
    setProfileToDelete({ id: profileId, name: targetProfile.profile_name });
    handleShow("delete_profile_confirm_modal");
  }

  const handleConfirmDeleteProfile = () => {
    if (!avatarSelected || !profileToDelete || !userAvatar) return;
    const currentSelect = userAvatar.profileSelect;
    const newListProfile = listProfile.filter((_, idx) => idx !== profileToDelete.id);
    const nextSelect = currentSelect >= profileToDelete.id ? Math.max(0, currentSelect - 1) : currentSelect;
    setAvatar({ ...userAvatar, profileList: newListProfile, profileSelect: nextSelect })
    toast.success(transI18n("profileDeletedSuccessfully"))
    handleCloseModal("delete_profile_confirm_modal");
    setProfileToDelete(null);
  }

  const handleCancelDeleteProfile = () => {
    handleCloseModal("delete_profile_confirm_modal");
    setProfileToDelete(null);
  }

  const toggleDropdownSelect = (idx: number, e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (idx === 0) return;
    setDropdownSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleDropdownSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const customCount = Math.max(0, listProfile.length - 1);
    if (dropdownSelectedIndices.size === customCount) {
      setDropdownSelectedIndices(new Set());
    } else {
      const next = new Set<number>();
      for (let i = 1; i < listProfile.length; i++) next.add(i);
      setDropdownSelectedIndices(next);
    }
  };

  const handleConfirmDropdownBatchDelete = () => {
    if (dropdownSelectedIndices.size < 2 || !avatarSelected || !userAvatar) return;
    const validIndices = new Set(Array.from(dropdownSelectedIndices).filter((i) => i > 0));
    if (validIndices.size < 2) return;
    const currentSelectedObj = listProfile[userAvatar.profileSelect];
    const newListProfile = listProfile.filter((_, idx) => !validIndices.has(idx));
    let nextSelect = newListProfile.indexOf(currentSelectedObj);
    if (nextSelect === -1) nextSelect = 0;
    setAvatar({ ...userAvatar, profileList: newListProfile, profileSelect: nextSelect });
    toast.success(transI18n("batchDeleteProfilesSuccess", { count: validIndices.size }));
    setDropdownSelectedIndices(new Set());
    setConfirmDropdownBatchOpen(false);
  };

  const handleConnectOrSyncPS = async () => {
    // A LAN address cannot go through the proxy; show the hint instead.
    const describe = (res: ActionResult): string =>
      res.code === ConnectErrorCode.PrivateHostUseLocal ? transI18n("useLocalModeHint") : res.message

    if (isConnectPS) {
      const res = await syncDataToPS()
      if (res.success) {
        toast.success(transI18n("syncSuccess"))
      } else {
        toast.error(`${transI18n("syncFailed")}: ${describe(res)}`)
      }
    } else {
      const res = await connectToPS()
      if (res.success) {
        toast.success(transI18n("connectedSuccess"))
      } else {
        toast.error(`${transI18n("connectedFailed")}: ${describe(res)}`)
      }
    }
  }

  const modalConfigs: ModalConfig[] = [
    {
      id: "update_profile_modal",
      title: formState === "CREATE" ? transI18n("createNewProfile") : transI18n("editProfile"),
      isOpen: isOpenCreateProfile,
      onClose: () => {
        setIsOpenCreateProfile(false)
        handleCloseModal("update_profile_modal")
      },
      content: (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold text-base-content/80">
                {transI18n("profileName")}
              </span>
            </label>
            <input
              type="text"
              placeholder={transI18n("placeholderProfileName")}
              className="input input-bordered input-primary w-full"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-ghost" onClick={() => setIsOpenCreateProfile(false)}>
              {transI18n("cancel")}
            </button>
            <button className="btn btn-primary" onClick={handleUpdateProfile}>
              {formState === "CREATE" ? transI18n("create") : transI18n("update")}
            </button>
          </div>
        </div>
      )
    },
    {
      id: "copy_profile_modal",
      title: transI18n("copyProfiles"),
      isOpen: isOpenCopy,
      onClose: () => {
        setIsOpenCopy(false)
        handleCloseModal("copy_profile_modal")
      },
      content: <NeedLightcone><CopyImport /></NeedLightcone>
    },
    {
      id: "avatars_modal",
      title: transI18n("avatars"),
      isOpen: isOpenAvatars,
      onClose: () => {
        setIsOpenAvatars(false)
        handleCloseModal("avatars_modal")
      },
      content: <AvatarBar onClose={() => { setIsOpenAvatars(false); handleCloseModal("avatars_modal") }} />
    },
    {
      id: "manage_profiles_modal",
      title: transI18n("manageProfiles"),
      isOpen: isOpenManageProfiles,
      onClose: () => {
        setIsOpenManageProfiles(false)
        handleCloseModal("manage_profiles_modal")
      },
      content: <NeedLightcone><ProfileManagerModal /></NeedLightcone>
    }
  ]

  useEffect(() => {
    for (const item of modalConfigs) {
      if (!item?.isOpen) {
        handleCloseModal(item?.id || "")
      }
    }
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        for (const item of modalConfigs) {
          item.onClose()
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isOpenCopy, isOpenCreateProfile, isOpenAvatars, isOpenManageProfiles]);

  useEffect(() => {
    if (!isProfileDropdownOpen && !isActionsDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (isProfileDropdownOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setIsProfileDropdownOpen(false);
      }
      if (isActionsDropdownOpen && actionsDropdownRef.current && !actionsDropdownRef.current.contains(target)) {
        setIsActionsDropdownOpen(false);
      }
    };

    const handleDropdownEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileDropdownOpen(false);
        setIsActionsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleDropdownEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleDropdownEsc);
    };
  }, [isProfileDropdownOpen, isActionsDropdownOpen]);

  const [prevRouteKey, setPrevRouteKey] = useState(() => `${pathname}_${avatarSelected?.ID}`);
  const currentRouteKey = `${pathname}_${avatarSelected?.ID}`;
  if (prevRouteKey !== currentRouteKey) {
    setPrevRouteKey(currentRouteKey);
    setIsProfileDropdownOpen(false);
    setIsActionsDropdownOpen(false);
  }

  const navTabs = pageNavigation.map((item) => ({ ...item, label: transI18n(item.label) }));

  return (
    <div className="hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {avatarSelected && (
          <div className="flex items-center gap-2 h-8.5 px-2.5 sm:px-3 rounded-xl bg-base-200/80 border border-base-content/10 text-xs sm:text-sm font-semibold shadow-xs">
            {(avatarSelected?.Image?.AvatarSideIconPath || avatarSelected?.Image?.DefaultAvatarHeadIconPath) && (
              <div className="w-5.5 h-5.5 rounded-full overflow-hidden border border-primary/40 bg-base-300 shrink-0 relative shadow-xs">
                <Image
                  src={`${process.env.CDN_URL}/${avatarSelected?.Image?.AvatarSideIconPath || avatarSelected?.Image?.DefaultAvatarHeadIconPath}`}
                  alt=""
                  unoptimized
                  width={22}
                  height={22}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <Image
              src={`${process.env.CDN_URL}/${damageType?.[avatarSelected?.DamageType]?.Icon}`}
              alt="damage type"
              unoptimized
              className="h-5 w-5 object-contain"
              width={20}
              height={20}
            />
            <span className="text-base-content/85 font-medium">{transI18n(avatarSelected.BaseType.toLowerCase())}</span>
            <span className="text-base-content/30">/</span>
            <ParseText
              locale={locale}
              text={getNameChar(locale, transI18n, avatarSelected).toWellFormed()}
              className="font-bold text-primary"
            />
            <span className="text-[11px] font-mono text-base-content/60 font-semibold">#{avatarSelected.ID}</span>
          </div>
        )}

        <div className="hidden">
          <div ref={profileDropdownRef} className="relative h-full flex items-center">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
              className="btn btn-sm btn-ghost gap-1.5 h-7 min-h-7 font-bold rounded-lg hover:bg-base-300/80 px-2 cursor-pointer"
            >
              <span className="text-[11px] uppercase tracking-wider text-base-content/60 font-semibold">{transI18n("profile")}:</span>
              <span className="truncate max-w-28 sm:max-w-40 text-xs text-base-content font-bold">
                {profileCurrent?.profile_name || transI18n("defaultProfile")}
              </span>
              <svg className={`w-3.5 h-3.5 opacity-60 ml-0.5 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isProfileDropdownOpen && (
              <div
                className="absolute top-full left-0 z-50 p-2.5 shadow-2xl bg-base-100 rounded-2xl w-72 sm:w-80 mt-2 border border-base-300 max-h-96 overflow-y-auto overflow-x-hidden flex flex-col flex-nowrap space-y-2 animate-in fade-in zoom-in-95 duration-100"
              >
                {listProfile.length > 2 && (
                  <div className="flex items-center justify-between px-2 pt-0.5 pb-1 text-[11px] text-base-content/60 border-b border-base-300/60 shrink-0">
                    <span className="font-semibold text-base-content/75">
                      {dropdownSelectedIndices.size > 0
                        ? transI18n("selectedCount", { count: dropdownSelectedIndices.size })
                        : transI18n("profiles")}
                    </span>
                    <button
                      type="button"
                      onClick={handleDropdownSelectAll}
                      className="text-primary hover:underline font-semibold cursor-pointer"
                    >
                      {dropdownSelectedIndices.size === listProfile.length - 1
                        ? transI18n("clearAll")
                        : transI18n("selectAll")}
                    </button>
                  </div>
                )}

                <div className="flex flex-col flex-nowrap space-y-1 overflow-y-auto max-h-56 pr-0.5">
                  {listProfile.map((profile, index) => {
                    const isDefault = index === 0;
                    const isActive = index === userAvatar?.profileSelect;
                    const isSelected = dropdownSelectedIndices.has(index);

                    return (
                      <div
                        key={index}
                        className={`group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors shrink-0 ${
                          isActive
                            ? "bg-primary/10 border border-primary/25"
                            : "hover:bg-base-200 border border-transparent"
                        }`}
                      >
                        {isDefault ? (
                          <div
                            className="w-4 h-4 flex items-center justify-center shrink-0 text-base-content/30"
                            title={transI18n("defaultProfileCannotBeDeleted")}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <label
                            className="cursor-pointer flex items-center justify-center shrink-0 p-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleDropdownSelect(index, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="checkbox checkbox-xs checkbox-error rounded cursor-pointer"
                            />
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => handleProfileSelect(index)}
                          className="flex-1 text-left min-w-0 flex items-center gap-1.5 cursor-pointer py-0.5"
                          title={transI18n("switchToProfile")}
                        >
                          <span
                            className={`truncate text-xs ${
                              isActive ? "font-bold text-primary" : "font-medium text-base-content"
                            }`}
                          >
                            {profile.profile_name}
                          </span>
                          {isDefault && (
                            <span className="text-[10px] text-base-content/50 font-mono shrink-0">
                              ({transI18n("default")})
                            </span>
                          )}
                        </button>

                        {!isDefault && (
                          <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-circle text-warning hover:bg-warning/20 h-6 w-6 min-h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsProfileDropdownOpen(false);
                                setFormState("EDIT");
                                setProfileName(profile.profile_name);
                                setProfileEdit(index);
                                setIsOpenCreateProfile(true);
                                handleShow("update_profile_modal");
                              }}
                              title={transI18n("editProfile")}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/20 h-6 w-6 min-h-6"
                              onClick={(e) => {
                                setIsProfileDropdownOpen(false);
                                requestDeleteProfile(index, e);
                              }}
                              title={transI18n("deleteProfile")}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {listProfile.length > 2 && (
                  <div className="pt-1 border-t border-base-300 shrink-0">
                    <button
                      type="button"
                      disabled={dropdownSelectedIndices.size < 2}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dropdownSelectedIndices.size >= 2) {
                          setIsProfileDropdownOpen(false);
                          setConfirmDropdownBatchOpen(true);
                        }
                      }}
                      className={`w-full flex items-center justify-between py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                        dropdownSelectedIndices.size >= 2
                          ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 cursor-pointer shadow-xs"
                          : "opacity-40 text-base-content/40 cursor-not-allowed border border-transparent pointer-events-none"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{transI18n("batchDeleteProfiles")}</span>
                      </div>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md bg-base-300/40">
                        {dropdownSelectedIndices.size >= 2
                          ? `(${dropdownSelectedIndices.size})`
                          : `${dropdownSelectedIndices.size}/2+`}
                      </span>
                    </button>
                  </div>
                )}

                <div className="pt-1 border-t border-base-300 space-y-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setIsOpenManageProfiles(true);
                      handleShow("manage_profiles_modal");
                    }}
                    className="w-full flex items-center gap-2 py-1.5 px-3 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 rounded-xl cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{transI18n("manageProfiles")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setIsOpenCopy(true);
                      setResetData(baseType, damageType);
                      handleShow("copy_profile_modal");
                    }}
                    className="w-full flex items-center gap-2 py-1.5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{transI18n("copyProfiles")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setIsOpenCreateProfile(true);
                      setFormState("CREATE");
                      setProfileName("");
                      handleShow("update_profile_modal");
                    }}
                    className="w-full flex items-center gap-2 py-1.5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{transI18n("addNewProfile")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center border-l border-base-content/10 pl-1 pr-0.5 gap-0.5 h-5">
            <button
              onClick={() => {
                setIsOpenManageProfiles(true);
                handleShow("manage_profiles_modal");
              }}
              className="btn btn-ghost btn-xs btn-circle h-6 w-6 min-h-6 text-base-content/60 hover:text-indigo-400 hover:bg-indigo-500/10"
              title={transI18n("manageProfiles")}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsOpenCopy(true)
                setResetData(baseType, damageType)
                handleShow("copy_profile_modal")
              }}
              className="btn btn-ghost btn-xs btn-circle h-6 w-6 min-h-6 text-base-content/60 hover:text-primary hover:bg-primary/10"
              title={transI18n("copyProfiles")}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsOpenCreateProfile(true)
                setFormState("CREATE");
                setProfileName("")
                handleShow("update_profile_modal")
              }}
              className="btn btn-ghost btn-xs btn-circle h-6 w-6 min-h-6 text-base-content/60 hover:text-primary hover:bg-primary/10"
              title={transI18n("addNewProfile")}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 ml-auto tooltip tooltip-bottom" data-tip={isConnectPS ? transI18n("sync") : transI18n("connectPs")}>
          <button
            onClick={handleConnectOrSyncPS}
            className={`btn btn-sm h-8.5 min-h-8.5 rounded-xl px-3.5 gap-1.5 font-bold shadow-xs whitespace-nowrap active-press ${
              isConnectPS
                ? "btn-outline btn-accent"
                : "btn-primary shadow-sm"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isConnectPS ? "text-accent" : ""}`} />
            <span className="text-xs">{isConnectPS ? transI18n("sync") : transI18n("connectPs")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:hidden gap-2 w-full pt-1">
        <button
          onClick={() => {
            setIsOpenAvatars(true);
            handleShow("avatars_modal");
          }}
          className="btn btn-warning btn-sm w-full font-bold shadow-xs"
        >
          {transI18n("avatars")}
        </button>

        <div ref={actionsDropdownRef} className="relative w-full">
          <button
            type="button"
            onClick={() => setIsActionsDropdownOpen((prev) => !prev)}
            className="btn btn-info btn-sm w-full font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{transI18n("actions")}</span>
            <svg className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${isActionsDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isActionsDropdownOpen && (
            <ul
              className="absolute top-full right-0 z-50 menu p-2 shadow-2xl bg-base-100 rounded-2xl w-56 mt-2 border border-base-300 space-y-1 animate-in fade-in zoom-in-95 duration-100"
            >
              {navTabs.map((tab) => {
                return (
                  <li key={tab.path}>
                    <button
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        actionMove(tab.path);
                      }}
                      className="flex items-center gap-2 py-2 px-3 text-xs font-semibold cursor-pointer"
                    >
                      <Image src={tab.icon} alt="" width={16} height={16} className="w-4 h-4 object-contain" />
                      <span>{tab.label}</span>
                    </button>
                  </li>
                );
              })}
              <li className="border-t border-base-300 pt-1 mt-1">
                <button
                  onClick={() => {
                    setIsActionsDropdownOpen(false);
                    handleConnectOrSyncPS();
                  }}
                  className="btn btn-primary btn-sm w-full font-bold mt-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isConnectPS ? transI18n("sync") : transI18n("connectPs")}</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

        {modalConfigs.map(({ id, title, isOpen, onClose, content }) => {
          const isManageProfiles = id === "manage_profiles_modal";
          return (
            <dialog key={id} id={id} className={`modal ${isOpen ? "modal-open" : ""}`}>
              <div
                className={`modal-box flex flex-col bg-base-100 text-base-content border border-base-300 shadow-2xl p-0 overflow-hidden ${
                  isManageProfiles
                    ? "w-[96vw] sm:w-11/12 max-w-6xl h-[85vh] max-h-[85vh] sm:h-[88vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl"
                    : "w-[96vw] sm:w-11/12 max-w-[96vw] sm:max-w-[88vw] max-h-[85vh] sm:max-h-[90vh] rounded-2xl"
                }`}
              >
                <div className="sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-base-300 bg-base-100 shrink-0">
                  <h3 className="font-bold text-lg sm:text-xl tracking-tight text-primary">
                    {title}
                  </h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                    onClick={onClose}
                  >
                    ✕
                  </button>
                </div>
                <div className={`flex-1 min-h-0 ${isManageProfiles ? "p-0 overflow-hidden flex flex-col" : "px-3 py-3.5 sm:p-6 overflow-y-auto"}`}>
                  <MountOnOpen open={isOpen}>{content}</MountOnOpen>
                </div>
              </div>
              <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
              </form>
            </dialog>
          );
        })}

        <dialog id="delete_profile_confirm_modal" className="modal modal-bottom sm:modal-middle">
          <div className="modal-box max-w-md bg-base-100 border border-white/10 shadow-2xl rounded-2xl p-6 overflow-hidden relative">
            <div className="relative z-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <Trash2 className="w-6 h-6 stroke-[1.75]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-lg text-base-content tracking-tight">
                  {transI18n("deleteProfile")}
                </h3>
                <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                  {transI18n("deleteProfileConfirm")}{" "}
                  <span className="font-bold text-amber-400 font-mono">
                    &quot;{profileToDelete?.name}&quot;
                  </span>
                  ?
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelDeleteProfile}
                  className="flex-1 h-10 px-4 rounded-xl font-bold text-xs sm:text-sm bg-base-200 hover:bg-base-300 text-base-content/80 hover:text-base-content border border-white/10 transition-all cursor-pointer"
                >
                  {transI18n("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProfile}
                  className="flex-1 h-10 px-4 rounded-xl font-bold text-xs sm:text-sm bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/25 hover:shadow-rose-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{transI18n("confirmDelete")}</span>
                </button>
              </div>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCancelDeleteProfile}>close</button>
          </form>
        </dialog>

        {confirmDropdownBatchOpen && (
          <dialog open className="modal modal-open modal-bottom sm:modal-middle">
            <div className="modal-box max-w-md bg-base-100 border border-white/10 shadow-2xl rounded-2xl p-6 overflow-hidden relative">
              <div className="relative z-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <Trash2 className="w-6 h-6 stroke-[1.75]" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-black text-lg text-base-content tracking-tight">
                    {transI18n("batchDeleteProfiles")}
                  </h3>
                  <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                    {transI18n("batchDeleteConfirm", { count: dropdownSelectedIndices.size })}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDropdownBatchOpen(false)}
                    className="flex-1 h-10 px-4 rounded-xl font-bold text-xs sm:text-sm bg-base-200 hover:bg-base-300 text-base-content/80 hover:text-base-content border border-white/10 transition-all cursor-pointer"
                  >
                    {transI18n("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDropdownBatchDelete}
                    className="flex-1 h-10 px-4 rounded-xl font-bold text-xs sm:text-sm bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/25 hover:shadow-rose-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{transI18n("confirmDelete")}</span>
                  </button>
                </div>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button onClick={() => setConfirmDropdownBatchOpen(false)}>close</button>
            </form>
          </dialog>
        )}
      </div>
  );
}