import { BASE_URL } from "@/src/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { LightconeDataList } from "../utils/lightcone-detail.type";

export const useLightcones = () => {
  return useQuery({
    queryKey: ["lightcone-list"],
    queryFn: async (): Promise<LightconeDataList> => {
      const response = await fetch(`${BASE_URL.neonteam}/lightcones`);
      const data = await response.json();

      return data;
    },
  });
};
