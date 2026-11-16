import useUserDataStore from "@/stores/userDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useGlobalStore from "@/stores/globalStore";
import {
  deriveAsConfig, deriveMocConfig, derivePfConfig, derivePeakConfig, fillTheoryCraftHP,
} from "@/helper/battleConfig";

function readSnapshot() {
  return {
    user: useUserDataStore.getState(),
    details: useDetailDataStore.getState(),
    extraData: useGlobalStore.getState().extraData,
  };
}

type Snapshot = ReturnType<typeof readSnapshot>;

// Only store wiring lives here. Battle rules belong in the named pure functions
// in helper/battleConfig.ts; no UI component needs to mount for them to run.
export function startBattleConfigSync() {
  let previous: Snapshot | undefined;
  let syncing = false;

  const sync = () => {
    if (syncing) return;
    const { user, details, extraData } = readSnapshot();
    const mode = user.battle_type.toUpperCase();
    const modeChanged = mode !== previous?.user.battle_type.toUpperCase();

    // Updates below notify these same subscriptions synchronously. Ignore that
    // re-entry and remember the resulting snapshot, rather than recalculating.
    syncing = true;
    try {
      switch (mode) {
        case "MOC": {
          if (!modeChanged && user.moc_config === previous?.user.moc_config &&
              details.mapMoc === previous?.details.mapMoc) break;
          const current = user.moc_config;
          const next = deriveMocConfig(current, details.mapMoc[current.event_id]);
          if (next !== current) user.setMocConfig(next);
          break;
        }
        case "PF": {
          if (!modeChanged && user.pf_config === previous?.user.pf_config &&
              details.mapPF === previous?.details.mapPF) break;
          const current = user.pf_config;
          const next = derivePfConfig(current, details.mapPF[current.event_id]);
          if (next !== current) user.setPfConfig(next);
          break;
        }
        case "AS": {
          if (!modeChanged && user.as_config === previous?.user.as_config &&
              details.mapAS === previous?.details.mapAS) break;
          const current = user.as_config;
          const next = deriveAsConfig(current, details.mapAS[current.event_id]);
          if (next !== current) user.setAsConfig(next);
          break;
        }
        case "PEAK": {
          if (!modeChanged && user.peak_config === previous?.user.peak_config &&
              details.mapPeak === previous?.details.mapPeak) break;
          const current = user.peak_config;
          const next = derivePeakConfig(current, details.mapPeak[current.event_id]);
          if (next !== current) user.setPeakConfig(next);
          break;
        }
        case "CE": {
          if (!modeChanged && user.ce_config === previous?.user.ce_config &&
              extraData === previous?.extraData) break;
          const next = fillTheoryCraftHP(user.ce_config, extraData);
          if (next !== extraData) useGlobalStore.getState().setExtraData(next);
          break;
        }
      }
    } finally {
      previous = readSnapshot();
      syncing = false;
    }
  };

  const unsubscribers = [
    useUserDataStore.subscribe(sync),
    useDetailDataStore.subscribe(sync),
    useGlobalStore.subscribe(sync),
  ];
  sync();
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
