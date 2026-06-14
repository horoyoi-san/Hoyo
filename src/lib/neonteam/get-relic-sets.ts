import { env } from "@/src/env";
import { getMetadata } from "./get-metadata";
import { getTextmaps } from "./get-textmaps";

export const getRelicSets = async () => {
  const [metadata, textmaps] = await Promise.all([
    getMetadata(),
    getTextmaps(),
  ]);

  const res = await fetch(
    `${env.NEONTEAM_BASE_URL}/${metadata.CurrentVersion}/relic-sets.json`,
    {
      next: {
        revalidate: 60 * 60,
      },
    },
  );

  const data: Record<string, any> = await res.json();

  const sets = Object.entries(data).map(([id, set]) => {
    const setBonus = Object.entries(set.set_bonus).map(
      ([id, bonus]: [string, any]) => {
        const parsedBonus = {
          ...bonus,
          desc: textmaps?.[bonus.desc],
        };

        return [id, parsedBonus];
      },
    );

    const parsedSet = {
      ...set,
      name: textmaps?.[set.name],
      set_bonus: setBonus,
    };

    return [id, parsedSet];
  });

  const parsedData = Object.fromEntries(sets);

  return parsedData;
};
