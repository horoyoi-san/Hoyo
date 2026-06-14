import { env } from "@/src/env";
import { getMetadata } from "./get-metadata";
import { getTextmaps } from "./get-textmaps";

export const getRelics = async () => {
  const [metadata, textmaps] = await Promise.all([
    getMetadata(),
    getTextmaps(),
  ]);

  const res = await fetch(
    `${env.NEONTEAM_BASE_URL}/${metadata.CurrentVersion}/relics.json`,
    {
      next: {
        revalidate: 60 * 60,
      },
    },
  );

  const data: Record<string, any> = await res.json();

  const allRelics = Object.entries(data).map(([id, lightcone]) => {
    const parsedRelic = {
      ...lightcone,
      name: textmaps?.[lightcone.name],
    };

    return [id, parsedRelic];
  });

  const parsedData = Object.fromEntries(allRelics);

  return parsedData;
};
