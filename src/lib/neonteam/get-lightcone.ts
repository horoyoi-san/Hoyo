import { env } from "@/src/env";
import { getMetadata } from "./get-metadata";
import { getTextmaps } from "./get-textmaps";
import { LightconeRawDataList } from "@/src/types/neonteam/lightcone";

export const getLightcones = async () => {
  const [metadata, textmaps] = await Promise.all([
    getMetadata(),
    getTextmaps(),
  ]);

  const res = await fetch(
    `${env.NEONTEAM_BASE_URL}/${metadata.CurrentVersion}/lightcones.json`,
    {
      next: {
        revalidate: 60 * 60,
      },
    },
  );

  const data: LightconeRawDataList = await res.json();

  const allLightcones = Object.entries(data).map(([id, lightcone]) => {
    const parsedLightcone = {
      ...lightcone,
      name: textmaps?.[lightcone.name],
      rank: {
        ...lightcone.rank,
        desc: textmaps?.[lightcone.rank.desc],
        skill: textmaps?.[lightcone.rank.skill],
      },
    };

    return [id, parsedLightcone];
  });

  const parsedData = Object.fromEntries(allLightcones);

  return parsedData;
};
