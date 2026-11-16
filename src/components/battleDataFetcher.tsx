"use client"
import {
  useFetchASGroupData,
  useFetchMOCGroupData,
  useFetchMonsterData,
  useFetchPeakGroupData,
  useFetchPFGroupData,
  useFetchStageData,
} from "@/lib/hooks"

function Monsters() { useFetchMonsterData(); return null }
function Moc() { useFetchMOCGroupData(); return null }
function Pf() { useFetchPFGroupData(); return null }
function As() { useFetchASGroupData(); return null }
function Peak() { useFetchPeakGroupData(); return null }
function Stage() { useFetchStageData(); return null }

// Each mode loads only its own datasets; queries are deduplicated.
export default function BattleDataFetcher({ mode }: { mode: string }) {
  switch (mode.toUpperCase()) {
    case "MOC": return <><Monsters /><Moc /></>
    case "PF": return <><Monsters /><Pf /></>
    case "AS": return <><Monsters /><As /></>
    case "PEAK": return <><Monsters /><Peak /></>
    case "CE": return <><Monsters /><Stage /></>
    case "EXTRA": return <><Stage /><Peak /></>
    default: return null
  }
}
