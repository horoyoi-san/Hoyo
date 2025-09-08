"use client";

import {
  useFetchASData,
  useFetchAvatarData,
  useFetchConfigData,
  useFetchLightconeData,
  useFetchMOCData,
  useFetchMonsterData,
  useFetchPEAKData,
  useFetchPFData,
  useFetchRelicData
} from "@/hooks";

export default function ClientDataFetcher() {
  useFetchConfigData();
  useFetchAvatarData();
  useFetchLightconeData();
  useFetchRelicData();
  useFetchMonsterData();
  useFetchPFData();
  useFetchMOCData();
  useFetchASData();
  useFetchPEAKData();

  return null;
}
