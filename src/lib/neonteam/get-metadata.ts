import { env } from "@/src/env";
import { NeonteamMetadata } from "@/src/utils/types";

let metadataPromise: Promise<NeonteamMetadata> | null = null;

export const getMetadata = async () => {
  if (!metadataPromise) {
    console.log("Hit metadata neonteam");

    metadataPromise = fetch(`${env.NEONTEAM_BASE_URL}/Metadata.json`, {
      next: {
        revalidate: 60 * 60,
      },
    })
      .then((res) => res.json())
      .catch((err) => {
        metadataPromise = null;
        throw err;
      });
  }
  console.log(
    `current version metadata:`,
    (await metadataPromise).CurrentVersion,
  );
  return metadataPromise;
};
