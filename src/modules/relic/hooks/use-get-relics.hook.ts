import { BASE_URL } from "@/src/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { AllRelicsData } from "../types/all-relics.type";

export const useGetRelics = () => {
  return useQuery({
    queryKey: ["relic-list"],
    queryFn: async (): Promise<AllRelicsData> => {
      const response = await fetch(`${BASE_URL.neonteam}/relics`);
      const data = await response.json();

      return data;
    },
  });
};
