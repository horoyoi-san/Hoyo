import MocBar from "./moc";
import useUserDataStore from "@/stores/userDataStore";
import PfBar from "./pf";
import Image from "next/image";
import AsBar from "./as";
import { useTranslations } from "next-intl";
import CeBar from "./ce";
import PeakBar from "./peak";
import { useShallow } from "zustand/react/shallow";
import { NeedBattleData } from "@/components/requireData";
import { Swords } from "lucide-react";

export default function MonsterBar() {
    const { battle_type, setBattleType } = useUserDataStore(
        useShallow((state) => ({
            battle_type: state.battle_type,
            setBattleType: state.setBattleType,
        }))
    )
    const transI18n = useTranslations("DataPage")

    const navItems = [
        { name: transI18n("memoryOfChaos"), icon: 'AbyssIcon01', value: 'MOC' },
        { name: transI18n("pureFiction"), icon: 'ChallengeStory', value: 'PF' },
        { name: transI18n("apocalypticShadow"), icon: 'ChallengeBoss', value: 'AS' },
        { name: transI18n("anomalyArbitration"), icon: 'ChallengePeakIcon', value: 'PEAK' },
        { name: transI18n("customEnemy"), icon: 'MonsterIcon', value: 'CE' },
        { name: transI18n("simulatedUniverse"), icon: 'SimulatedUniverse', value: 'SU' },

    ];


    return (
        <div className="w-full space-y-5">
            <nav
                aria-label={transI18n("monsterSetting")}
                className="sticky top-0 z-30 -mx-4 border-b border-base-content/10 bg-base-100/80 px-4 pb-3 pt-1 backdrop-blur-xl sm:-mx-6 sm:px-6"
            >
                <div className="flex items-center justify-center">
                    <div className="block md:hidden w-full">
                        <select
                            className="select select-bordered w-full border-base-content/15 bg-base-100/70"
                            value={battle_type.toUpperCase()}
                            onChange={(e) => setBattleType(e.target.value.toUpperCase())}
                        >
                            {navItems.map((item) => (
                                <option key={item.name} value={item.value.toUpperCase()}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-2.5 w-full">
                        {navItems.map((item) => {
                            const isSelected = battle_type.toUpperCase() === item.value.toUpperCase()
                            return (
                                <button
                                    key={item.name}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => setBattleType(item.value.toUpperCase())}
                                    className={`group flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all duration-200 lg:text-sm ${
                                        isSelected
                                            ? 'border-warning/45 bg-linear-to-r from-warning/15 via-base-100/50 to-primary/10 text-base-content shadow-md shadow-warning/10'
                                            : 'border-base-content/10 bg-base-100/20 text-base-content/75 hover:border-base-content/20 hover:bg-base-100/45'
                                    }`}
                                >
                                    <span
                                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
                                            isSelected ? "bg-warning/15" : "bg-base-100/30 group-hover:bg-base-100/60"
                                        }`}
                                    >
                                        <Image
                                            unoptimized
                                            src={`/icon/${item.icon}.webp`}
                                            alt={item.name}
                                            width={24}
                                            height={24}
                                            className={`h-5 w-5 object-contain ${isSelected ? "" : "theme-path-icon"}`}
                                            style={
                                                isSelected
                                                    ? {
                                                        filter:
                                                            'brightness(0) saturate(100%) invert(63%) sepia(78%) saturate(643%) hue-rotate(1deg) brightness(93%) contrast(89%)',
                                                    }
                                                    : undefined
                                            }
                                        />
                                    </span>
                                    <span className="min-w-0 truncate text-left">{item.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </nav>

            {(battle_type.toUpperCase() === "DEFAULT" || battle_type.toUpperCase() === "") && (
                <div className="mx-auto flex min-h-64 max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-warning/30 bg-base-100/25 px-6 py-10 text-center shadow-inner">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-warning/20 bg-warning/10 text-warning">
                        <Swords className="h-7 w-7" />
                    </span>
                    <p className="text-lg font-semibold text-base-content/80">{transI18n("noEventSelected")}</p>
                </div>
            )}
            <NeedBattleData mode={battle_type}>
                {battle_type.toUpperCase() === 'MOC' && <MocBar />}
                {battle_type.toUpperCase() === 'PF' && <PfBar />}
                {battle_type.toUpperCase() === 'AS' && <AsBar />}
                {battle_type.toUpperCase() === 'CE' && <CeBar />}
                {battle_type.toUpperCase() === 'PEAK' && <PeakBar />}
            </NeedBattleData>
            {battle_type.toUpperCase() === 'SU' && (
                <div className="mx-auto flex min-h-64 max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-primary/30 bg-base-100/25 px-6 py-10 text-center shadow-inner">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Swords className="h-7 w-7" />
                    </span>
                    <p className="text-lg font-semibold text-base-content/80">{transI18n("comingSoon")}</p>
                </div>
            )}

        </div>
    )
}