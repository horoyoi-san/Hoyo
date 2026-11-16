'use client'
import { EyeOff, Eye, Hammer, RefreshCw, ShieldBan, User, Swords, SkipForward, BowArrow, Info, RouteIcon, Search, CupSoda, UsersIcon, X, Check, Code, Plus, Sparkles } from "lucide-react"
import useGlobalStore from '@/stores/globalStore'
import { useTranslations } from "next-intl"
import { getLocaleName, getNameChar } from "@/helper"
import useLocaleStore from "@/stores/localeStore"
import SelectCustomImage from "../select/customSelectImage"
import { useMemo, useState } from "react"
import useDetailDataStore from "@/stores/detailDataStore"
import Editor from "react-simple-code-editor"
import BattleDataFetcher from "@/components/battleDataFetcher"
import Prism from "prismjs"
import "prismjs/components/prism-lua"
import "prismjs/themes/prism-tomorrow.css"
import { SimpleAvatarCard } from "../card/simpleCharacterCard"
import { useShallow } from "zustand/react/shallow"

export default function ExtraSettingBar() {
  const { extraData, setExtraData, isEnableChangePath, setIsEnableChangePath, isEnableLua, setIsEnableLua } = useGlobalStore(
    useShallow((state) => ({
      extraData: state.extraData,
      setExtraData: state.setExtraData,
      isEnableChangePath: state.isEnableChangePath,
      setIsEnableChangePath: state.setIsEnableChangePath,
      isEnableLua: state.isEnableLua,
      setIsEnableLua: state.setIsEnableLua,
    }))
  )
  const transI18n = useTranslations("DataPage")
  const { mapAvatar, mapPeak, stage, baseType } = useDetailDataStore(
    useShallow((state) => ({
      mapAvatar: state.mapAvatar,
      mapPeak: state.mapPeak,
      stage: state.stage,
      baseType: state.baseType,
    }))
  )
  const { locale } = useLocaleStore(
    useShallow((state) => ({ locale: state.locale }))
  )
  const [showSearchStage, setShowSearchStage] = useState(false)
  const [showSearchLineup, setShowSearchLineup] = useState(false)
  const [stageSearchTerm, setStageSearchTerm] = useState("")
  const [lineupSearchTerm, setLineupSearchTerm] = useState("")
  const [stagePage, setStagePage] = useState(1)

  const pageSize = 30
  const stageList = useMemo(() => Object.values(stage), [stage])
  const stageLoading = stageList.length === 0
  const selectedStage = stageList.find((s) => s.ID.toString() === extraData?.theory_craft?.stage_id?.toString())
  const selectedStageLabel = selectedStage ? `${getLocaleName(locale, selectedStage.Name)} #${selectedStage.ID}` : ""
  const peakLoading = Object.keys(mapPeak).length === 0

  const stageTerm = stageSearchTerm.toLowerCase()

  const filteredStages = useMemo(() => stageList.filter((s) =>
    getLocaleName(locale, s.Name).toLowerCase().includes(stageTerm) ||
    String(s.ID).toLowerCase().includes(stageTerm)
  ), [stageList, stageTerm, locale])

  const paginatedStages = useMemo(() => filteredStages.slice(
    (stagePage - 1) * pageSize,
    stagePage * pageSize
  ), [filteredStages, stagePage, pageSize])

  const hasMorePages = useMemo(() => stagePage * pageSize < filteredStages.length, [stagePage, filteredStages])

  const onChangeStageSearch = (v: string) => {
    setStageSearchTerm(v)
    setStagePage(1)
  }

  const avatarList = useMemo(() => Object.values(mapAvatar), [mapAvatar])
  const filteredAvatars = useMemo(() => {
    if (!lineupSearchTerm.trim()) return avatarList
    const term = lineupSearchTerm.toLowerCase()
    return avatarList.filter(a => {
      const charName = getNameChar(locale, transI18n, a).toLowerCase()
      return charName.includes(term) || a.ID.toString().includes(term)
    })
  }, [avatarList, lineupSearchTerm, locale, transI18n])

  const currentLineup = extraData?.theory_craft?.custom_lineup || []

  return (
    <div className="w-full space-y-4 pb-2">
      <BattleDataFetcher mode="EXTRA" />
      {extraData?.theory_craft && (
        <section className="relative z-30 rounded-2xl bg-base-200/40 border border-white/10 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-base-content">
                    {transI18n("theoryCraft")}
                  </h3>
                  <div className="tooltip tooltip-bottom tooltip-info" data-tip={transI18n("detailTheoryCraft")}>
                    <Info className="text-primary/70 hover:text-primary w-3.5 h-3.5 cursor-pointer transition-colors" />
                  </div>
                </div>
                <p className="text-xs text-base-content/60 line-clamp-1 mt-0.5">
                  {transI18n("detailTheoryCraft")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:inline ${extraData?.theory_craft?.mode ? 'text-primary' : 'text-base-content/40'}`}>
                {extraData?.theory_craft?.mode ? 'Active' : 'Off'}
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={extraData?.theory_craft?.mode || false}
                onChange={(e) => {
                  setExtraData({
                    ...extraData,
                    theory_craft: {
                      hp: extraData?.theory_craft?.hp || {},
                      cycle_count: extraData?.theory_craft?.cycle_count || 1,
                      mode: e.target.checked,
                      stage_id: extraData?.theory_craft?.stage_id || 0,
                      custom_lineup: extraData?.theory_craft?.custom_lineup || []
                    }
                  })
                }}
              />
            </div>
          </div>

          {extraData?.theory_craft?.mode && (
            <div className="border-t border-white/5 bg-base-300/20 p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-base-content/80">
                    <RefreshCw className="text-info w-3.5 h-3.5" />
                    <span>{transI18n("cycleCount")}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="input input-sm input-bordered w-full rounded-xl bg-base-100 text-base-content border-white/15 focus:border-primary text-xs sm:text-sm font-mono font-bold"
                      value={extraData?.theory_craft?.cycle_count || 1}
                      onChange={(e) =>
                        setExtraData({
                          ...extraData,
                          theory_craft: {
                            hp: extraData?.theory_craft?.hp || {},
                            cycle_count: Number(e.target.value) || 1,
                            mode: extraData?.theory_craft?.mode || false,
                            stage_id: extraData?.theory_craft?.stage_id || 0,
                            custom_lineup: extraData?.theory_craft?.custom_lineup || []
                          }
                        })
                      }
                      min="1"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="flex items-center gap-2 text-xs font-semibold text-base-content/80">
                    <RouteIcon className="text-info w-3.5 h-3.5" />
                    <span>{transI18n("stage")}</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline w-full rounded-xl bg-base-100 text-base-content border-white/15 hover:border-primary flex items-center justify-between text-xs font-normal transition-all"
                    onClick={() => setShowSearchStage(pre => !pre)}
                    disabled={stageLoading}
                  >
                    <span className={`truncate ${stageLoading ? "animate-pulse" : ""}`}>
                      {stageLoading ? transI18n("loadingData") : selectedStageLabel || transI18n("selectStage")}
                    </span>
                    <Search className="w-3.5 h-3.5 shrink-0 text-base-content/50 ml-2" />
                  </button>

                  {showSearchStage && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full mt-2 left-0 right-0 z-50 bg-base-100 border border-white/15 rounded-2xl p-3 shadow-2xl space-y-2.5"
                    >
                      <div className="relative">
                        <input
                          type="search"
                          className="input input-sm input-bordered w-full rounded-xl bg-base-200/50 border-white/10 text-xs pr-7 focus:border-primary"
                          placeholder={transI18n("searchStage")}
                          value={stageSearchTerm}
                          onChange={(e) => onChangeStageSearch(e.target.value)}
                          autoFocus
                        />
                        {stageSearchTerm && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                            onClick={() => onChangeStageSearch("")}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1 text-xs divide-y divide-white/5">
                        {paginatedStages.length > 0 ? (
                          paginatedStages.map((stg) => {
                            const isSelected = extraData?.theory_craft?.stage_id === Number(stg.ID)
                            return (
                              <div
                                key={stg.ID}
                                className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                  isSelected ? "bg-primary/20 text-primary font-bold" : "hover:bg-base-200/80 text-base-content/80 hover:text-base-content"
                                }`}
                                onClick={() => {
                                  if (extraData?.theory_craft?.stage_id !== Number(stg.ID)) {
                                    setExtraData({
                                      ...extraData,
                                      theory_craft: {
                                        stage_id: Number(stg.ID),
                                        cycle_count: extraData?.theory_craft?.cycle_count ?? 1,
                                        mode: extraData?.theory_craft?.mode ?? false,
                                        hp: extraData?.theory_craft?.hp ?? {},
                                        custom_lineup: extraData?.theory_craft?.custom_lineup ?? []
                                      }
                                    })
                                  }
                                  setShowSearchStage(false)
                                  onChangeStageSearch("")
                                }}
                              >
                                <span className="truncate">{getLocaleName(locale, stg.Name)}</span>
                                <span className="ml-auto shrink-0 pl-2 font-mono text-[10px] text-base-content/40">#{stg.ID}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-xs text-center py-4 text-base-content/40">{transI18n("noStageFound")}</div>
                        )}
                      </div>

                      {paginatedStages.length > 0 && (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                          <button
                            disabled={stagePage === 1}
                            className="btn btn-xs btn-outline rounded-lg"
                            onClick={() => setStagePage(stagePage - 1)}
                          >
                            {transI18n("previous")}
                          </button>
                          <span className="font-mono text-base-content/50">
                            {transI18n("pageWithParam", { page: stagePage })}
                          </span>
                          <button
                            disabled={!hasMorePages}
                            className="btn btn-xs btn-outline rounded-lg"
                            onClick={() => setStagePage(stagePage + 1)}
                          >
                            {transI18n("next")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-base-content/80">
                    <UsersIcon className="text-info w-3.5 h-3.5" />
                    <span>{transI18n("customLineup")}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                      {currentLineup.length}
                    </span>
                  </label>

                  <button
                    type="button"
                    className="btn btn-xs btn-ghost text-primary hover:bg-primary/10 gap-1 rounded-lg"
                    onClick={() => setShowSearchLineup(pre => !pre)}
                  >
                    {showSearchLineup ? (
                      <>
                        <X className="w-3 h-3" />
                        <span>{transI18n("closeList")}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>{transI18n("selectCharacters")}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {currentLineup.map((avatarId) => {
                    const avatarData = mapAvatar[avatarId]
                    if (!avatarData) return null
                    return (
                      <SimpleAvatarCard
                        key={`selected-${avatarId}`}
                        data={avatarData}
                        showRemoveHover={true}
                        onClick={() => {
                          const newLineup = currentLineup.filter(id => id !== avatarId)
                          setExtraData({
                            ...extraData,
                            theory_craft: {
                              stage_id: extraData?.theory_craft?.stage_id ?? 30118121,
                              cycle_count: extraData?.theory_craft?.cycle_count ?? 1,
                              mode: extraData?.theory_craft?.mode ?? false,
                              hp: extraData?.theory_craft?.hp ?? {},
                              custom_lineup: newLineup
                            }
                          })
                        }}
                      />
                    )
                  })}

                  {!showSearchLineup && (
                    <button
                      type="button"
                      className="btn btn-outline btn-square border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/10 w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center gap-1 text-base-content/50 hover:text-primary transition-all"
                      onClick={() => setShowSearchLineup(true)}
                      title={transI18n("addCharacter")}
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[9px] uppercase font-bold tracking-wider">{transI18n("add")}</span>
                    </button>
                  )}
                </div>

                {showSearchLineup && (
                  <div className="space-y-2.5 pt-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                      <input
                        type="search"
                        className="input input-sm input-bordered w-full rounded-xl bg-base-100 text-base-content border-white/10 pl-8 text-xs focus:border-primary"
                        placeholder={transI18n("searchCharacter")}
                        value={lineupSearchTerm}
                        onChange={(e) => setLineupSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                      {filteredAvatars.map((avatar) => {
                        const isSelected = currentLineup.includes(avatar.ID.toString())
                        return (
                          <SimpleAvatarCard
                            key={avatar.ID}
                            data={avatar}
                            isSelected={isSelected}
                            onClick={() => {
                              const idStr = avatar.ID.toString()
                              let newLineup = [...currentLineup]

                              if (isSelected) {
                                newLineup = newLineup.filter(id => id !== idStr)
                              } else {
                                newLineup.push(idStr)
                              }

                              setExtraData({
                                ...extraData,
                                theory_craft: {
                                  stage_id: extraData?.theory_craft?.stage_id ?? 30118121,
                                  cycle_count: extraData?.theory_craft?.cycle_count ?? 1,
                                  mode: extraData?.theory_craft?.mode ?? false,
                                  hp: extraData?.theory_craft?.hp ?? {},
                                  custom_lineup: newLineup
                                }
                              })
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="relative z-20 rounded-2xl bg-base-200/40 border border-white/10 shadow-xs transition-all duration-200">
        <div className="flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center shrink-0 shadow-inner">
              <RouteIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-base-content">
                  {transI18n("multipathCharacter")}
                </h3>
                <div className="tooltip tooltip-bottom tooltip-info" data-tip={transI18n("detailMultipathCharacter")}>
                  <Info className="text-primary/70 hover:text-primary w-3.5 h-3.5 cursor-pointer transition-colors" />
                </div>
              </div>
              <p className="text-xs text-base-content/60 line-clamp-1 mt-0.5">
                {transI18n("detailMultipathCharacter")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:inline ${isEnableChangePath ? 'text-secondary' : 'text-base-content/40'}`}>
              {isEnableChangePath ? 'Active' : 'Off'}
            </span>
            <input
              type="checkbox"
              className="toggle toggle-secondary"
              checked={isEnableChangePath}
              onChange={(e) => setIsEnableChangePath(e.target.checked)}
            />
          </div>
        </div>

        {isEnableChangePath && (
          <div className="border-t border-white/5 bg-base-300/20 p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-base-content/80">
                  <User className="text-warning w-3.5 h-3.5" />
                  <span>{transI18n("mainPath")}</span>
                </label>
                <SelectCustomImage
                  customSet={Object.values(mapAvatar).filter((it) => extraData?.multi_path?.multi_path_main?.includes(Number(it.ID))).map((it) => ({
                    value: it.ID.toString(),
                    label: getNameChar(locale, transI18n, it),
                    imageUrl: `${process.env.CDN_URL}/${baseType?.[it.BaseType]?.Icon}`
                  }))}
                  excludeSet={[]}
                  selectedCustomSet={extraData?.multi_path?.main?.toString() || ""}
                  placeholder={transI18n("selectAMainStat")}
                  setSelectedCustomSet={(it) => {
                    if (!it) return
                    setExtraData({
                      ...extraData,
                      multi_path: {
                        march_7: extraData?.multi_path?.march_7 || 1001,
                        main: Number(it) || 8001,
                        multi_path_main: extraData?.multi_path?.multi_path_main || [],
                        multi_path_march_7: extraData?.multi_path?.multi_path_march_7 || []
                      },
                      lua: extraData?.lua || null
                    })
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-base-content/80">
                  <BowArrow className="text-info w-3.5 h-3.5" />
                  <span>{transI18n("march7Path")}</span>
                </label>
                <SelectCustomImage
                  customSet={Object.values(mapAvatar).filter((it) => extraData?.multi_path?.multi_path_march_7?.includes(Number(it.ID))).map((it) => ({
                    value: it.ID.toString(),
                    label: getNameChar(locale, transI18n, it),
                    imageUrl: `${process.env.CDN_URL}/${baseType?.[it.BaseType]?.Icon}`
                  }))}
                  excludeSet={[]}
                  selectedCustomSet={extraData?.multi_path?.march_7?.toString() || ""}
                  placeholder={transI18n("selectAMainStat")}
                  setSelectedCustomSet={(it) => {
                    if (!it) return
                    setExtraData({
                      ...extraData,
                      multi_path: {
                        march_7: Number(it) || 1001,
                        main: extraData?.multi_path?.main || 8001,
                        multi_path_main: extraData?.multi_path?.multi_path_main || [],
                        multi_path_march_7: extraData?.multi_path?.multi_path_march_7 || []
                      },
                      lua: extraData?.lua || null
                    })
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="relative z-10 rounded-2xl bg-base-200/40 border border-white/10 shadow-xs">
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 text-error flex items-center justify-center shrink-0 shadow-inner">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-base-content">
              {transI18n("challenge")}
            </h3>
            <p className="text-xs text-base-content/60 line-clamp-1 mt-0.5">
              {transI18n("challengeSettingsDesc")}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-base-content/80">
                  <Swords className="text-error w-3.5 h-3.5" />
                  <span>{transI18n("anomalyArbitration")}</span>
                </label>
                <div className="tooltip tooltip-bottom tooltip-info" data-tip={transI18n("detailChallengePeak")}>
                  <Info className="text-primary/70 hover:text-primary w-3.5 h-3.5 cursor-pointer transition-colors" />
                </div>
              </div>
              <select
                value={extraData?.challenge?.challenge_peak_group_id || ""}
                className="select select-sm select-bordered w-full rounded-xl bg-base-100 text-base-content border-white/15 focus:border-primary text-xs font-medium"
                onChange={(e) =>
                  setExtraData({
                    ...extraData,
                    challenge: {
                      skip_node: extraData?.challenge?.skip_node || 0,
                      challenge_peak_group_id: parseInt(e.target.value) || 0,
                      challenge_peak_group_id_list: extraData?.challenge?.challenge_peak_group_id_list || []
                    },
                    lua: extraData?.lua || null
                  })
                }
              >
                {peakLoading && <option value="" disabled>{transI18n("loadingData")}</option>}
                {Object.values(mapPeak).filter(event => extraData?.challenge?.challenge_peak_group_id_list?.includes(Number(event.ID))).map(event => (
                  <option key={event.ID} value={event.ID} className="bg-base-100 text-base-content py-2">
                    {getLocaleName(locale, event.Name)} ({event.ID})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-base-content/80">
                  <SkipForward className="text-warning w-3.5 h-3.5" />
                  <span>{transI18n("skipNode")}</span>
                </label>
                <div className="tooltip tooltip-bottom tooltip-info" data-tip={transI18n("detailSkipNode")}>
                  <Info className="text-primary/70 hover:text-primary w-3.5 h-3.5 cursor-pointer transition-colors" />
                </div>
              </div>
              <select
                value={extraData?.challenge?.skip_node || "0"}
                className="select select-sm select-bordered w-full rounded-xl bg-base-100 text-base-content border-white/15 focus:border-primary text-xs font-medium"
                onChange={(e) =>
                  setExtraData({
                    ...extraData,
                    challenge: {
                      challenge_peak_group_id: extraData?.challenge?.challenge_peak_group_id || 0,
                      challenge_peak_group_id_list: extraData?.challenge?.challenge_peak_group_id_list || [],
                      skip_node: parseInt(e.target.value) || 0
                    },
                    lua: extraData?.lua || null
                  })
                }
              >
                <option value="0" className="bg-base-100 text-base-content py-2">{transI18n("disableSkip")}</option>
                <option value="1" className="bg-base-100 text-base-content py-2">{transI18n("skipNode1")}</option>
                <option value="2" className="bg-base-100 text-base-content py-2">{transI18n("skipNode2")}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-0 rounded-2xl bg-base-200/40 border border-white/10 shadow-xs">
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0 shadow-inner">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-base-content">
              {transI18n("extraFeatures")}
            </h3>
            <p className="text-xs text-base-content/60 line-clamp-1 mt-0.5">
              {transI18n("extraFeaturesDesc")}
            </p>
          </div>
        </div>

        <div className="p-2 sm:p-3 divide-y divide-white/5">
          {extraData?.setting?.hide_ui !== undefined && (
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-base-100/80 border border-white/10 flex items-center justify-center">
                  {extraData?.setting?.hide_ui
                    ? <EyeOff className="text-warning w-4 h-4" />
                    : <Eye className="text-success w-4 h-4" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-base-content">{transI18n("hideUI")}</span>
                    <div className="tooltip tooltip-right tooltip-info" data-tip={transI18n("detailHiddenUi")}>
                      <Info className="text-primary/70 hover:text-primary w-3 h-3 cursor-pointer" />
                    </div>
                  </div>
                  <p className="text-[11px] text-base-content/50 hidden sm:block">
                    {transI18n("detailHiddenUi")}
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={extraData?.setting?.hide_ui}
                onChange={(e) =>
                  setExtraData({
                    ...extraData,
                    setting: {
                      hide_ui: e.target.checked,
                      censorship: extraData?.setting?.censorship || false,
                      cm: extraData?.setting?.cm || false,
                      first_person: extraData?.setting?.first_person || false,
                      invasion_percent: extraData?.setting?.invasion_percent ?? 0.4
                    }
                  })
                }
              />
            </div>
          )}

          {extraData?.setting?.censorship !== undefined && (
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-base-100/80 border border-white/10 flex items-center justify-center">
                  <ShieldBan className="text-error w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-base-content">{transI18n("disableCensorship")}</span>
                    <div className="tooltip tooltip-right tooltip-info" data-tip={transI18n("detailDisableCensorship")}>
                      <Info className="text-primary/70 hover:text-primary w-3 h-3 cursor-pointer" />
                    </div>
                  </div>
                  <p className="text-[11px] text-base-content/50 hidden sm:block">
                    {transI18n("detailDisableCensorship")}
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                className="toggle toggle-accent toggle-sm"
                checked={extraData?.setting?.censorship}
                onChange={(e) =>
                  setExtraData({
                    ...extraData,
                    setting: {
                      censorship: e.target.checked,
                      hide_ui: extraData?.setting?.hide_ui || false,
                      cm: extraData?.setting?.cm || false,
                      first_person: extraData?.setting?.first_person || false,
                      invasion_percent: extraData?.setting?.invasion_percent ?? 0.4
                    }
                  })
                }
              />
            </div>
          )}

          {extraData?.setting !== undefined && (
            <div className="p-3 rounded-xl hover:bg-white/[0.03] transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-base-100/80 border border-white/10 flex items-center justify-center">
                    <Sparkles className="text-warning w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-semibold text-base-content">
                        {transI18n("invasionPercent")}
                      </span>
                      <div className="tooltip tooltip-right tooltip-info" data-tip={transI18n("detailInvasionPercent")}>
                        <Info className="text-primary/70 hover:text-primary w-3 h-3 cursor-pointer" />
                      </div>
                    </div>
                    <p className="text-[11px] text-base-content/50 hidden sm:block">
                      {transI18n("detailInvasionPercent")}
                    </p>
                  </div>
                </div>

                <div className="badge badge-warning badge-sm font-mono font-bold px-2 py-0.5">
                  {(() => {
                    const cur = extraData?.setting?.invasion_percent;
                    return cur !== undefined ? (cur <= 1 ? Math.round(cur * 100) : Math.round(cur)) : 40;
                  })()}%
                </div>
              </div>

              <div className="space-y-1.5 px-0.5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={(() => {
                    const cur = extraData?.setting?.invasion_percent;
                    return cur !== undefined ? (cur <= 1 ? Math.round(cur * 100) : Math.round(cur)) : 40;
                  })()}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setExtraData({
                      ...extraData,
                      setting: {
                        censorship: extraData?.setting?.censorship || false,
                        hide_ui: extraData?.setting?.hide_ui || false,
                        cm: extraData?.setting?.cm || false,
                        first_person: extraData?.setting?.first_person || false,
                        invasion_percent: Number((val / 100).toFixed(2))
                      }
                    });
                  }}
                  className="range range-warning range-sm w-full"
                />
                <div className="flex justify-between text-[10px] text-base-content/40 font-mono px-0.5">
                  {[0, 40, 70, 100].map((preset) => {
                    const cur = extraData?.setting?.invasion_percent;
                    const curPercent = cur !== undefined ? (cur <= 1 ? Math.round(cur * 100) : Math.round(cur)) : 40;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setExtraData({
                            ...extraData,
                            setting: {
                              censorship: extraData?.setting?.censorship || false,
                              hide_ui: extraData?.setting?.hide_ui || false,
                              cm: extraData?.setting?.cm || false,
                              first_person: extraData?.setting?.first_person || false,
                              invasion_percent: Number((preset / 100).toFixed(2))
                            }
                          });
                        }}
                        className={`hover:text-warning transition-colors cursor-pointer ${curPercent === preset ? 'text-warning font-bold' : ''}`}
                      >
                        {preset}%
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="relative rounded-2xl bg-base-200/40 border border-white/10 shadow-xs transition-all duration-200">
        <div className="flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <CupSoda className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-base-content">
                {transI18n("luaScripting")}
              </h3>
              <p className="text-xs text-base-content/60 line-clamp-1 mt-0.5">
                {transI18n("luaScriptingDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:inline ${isEnableLua ? 'text-amber-400' : 'text-base-content/40'}`}>
              {isEnableLua ? transI18n("active") : transI18n("off")}
            </span>
            <input
              type="checkbox"
              className="toggle toggle-warning"
              checked={isEnableLua}
              onChange={(e) => setIsEnableLua(e.target.checked)}
            />
          </div>
        </div>

        {isEnableLua && (
          <div className="border-t border-white/5 bg-[#0d0e15] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#141622] border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"></div>
                </div>
                <div className="h-3.5 w-px bg-white/10 mx-1.5"></div>
                <div className="flex items-center gap-1.5 text-xs text-base-content/70 font-mono">
                  <Code className="w-3.5 h-3.5 text-amber-400" />
                  <span>script.lua</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/5 text-base-content/50 border border-white/5">
                LUA 5.4
              </span>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <Editor
                value={extraData?.lua || ""}
                onValueChange={(code) =>
                  setExtraData({
                    ...extraData,
                    lua: code
                  })
                }
                highlight={(code) => {
                  if (!code) return "";
                  const LIMIT = 30000;
                  if (code.length <= LIMIT) {
                    return Prism.highlight(code, Prism.languages.lua, "lua");
                  }
                  const cut = code.indexOf("\n", LIMIT);
                  const splitAt = (cut !== -1 && cut <= LIMIT + 2000) ? cut : LIMIT;
                  const head = code.slice(0, splitAt);
                  const tail = code.slice(splitAt);
                  return Prism.highlight(head, Prism.languages.lua, "lua") + tail.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                }}
                padding={16}
                textareaClassName="outline-none font-mono text-xs selection:bg-amber-500/30"
                preClassName="font-mono text-xs"
                className="text-xs font-mono min-h-60 text-slate-100 bg-[#0d0e15]"
                style={{
                  background: "#0d0e15",
                  color: "#e2e8f0",
                }}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
