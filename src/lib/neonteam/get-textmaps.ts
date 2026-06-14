import { env } from "../../env";
import { getMetadata } from "./get-metadata";

let textmapsCache: Record<number, string> | null = null;
let textmapsVersion: string | null = null;

export const getTextmaps = async () => {
  const metadata = await getMetadata();

  // kalau version sama → reuse
  if (textmapsCache && textmapsVersion === metadata.CurrentVersion) {
    return textmapsCache;
  }

  console.log("Hit textmaps neonteam");

  const res = await fetch(
    `${env.NEONTEAM_BASE_URL}/${metadata.CurrentVersion}/textmaps.json`,
    {
      next: {
        revalidate: 60 * 60,
      },
    },
  );

  const data = await res.json();

  textmapsCache = data.EN;
  textmapsVersion = metadata.CurrentVersion;

  return textmapsCache;
};
