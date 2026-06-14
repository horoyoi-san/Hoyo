import { env } from "@/src/env";
import { getMetadata } from "./get-metadata";
import { getTextmaps } from "./get-textmaps";

export const getStatProperties = async () => {
  const [metadata, textmaps] = await Promise.all([
    getMetadata(),
    getTextmaps(),
  ]);

  const res = await fetch(
    `${env.NEONTEAM_BASE_URL}/${metadata.CurrentVersion}/stat-properties.json`,
    {
      next: {
        revalidate: 60 * 60,
      },
    },
  );

  const data: Record<string, any> = await res.json();

  const statProperties = Object.entries(data).map(([id, stat]) => {
    const parsedStat = {
      ...stat,
      name: textmaps?.[stat.name],
      name_skill_tree: textmaps?.[stat.name_skill_tree],
    };

    return [id, parsedStat];
  });

  const parsedData = Object.fromEntries(statProperties);

  return parsedData;
};
