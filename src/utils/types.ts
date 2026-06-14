export type NeonteamMetadata = {
  CurrentTimestamp: number;
  CurrentVersion: string;
  Versions: Record<
    string,
    {
      Timestamp: number;
    }
  >;
};
