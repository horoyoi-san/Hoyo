import { BASE_URL } from "@/src/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { MainAffixData } from "../types/affixes.type";

export const useGetMainAffixes = () => {
  return useQuery({
    queryKey: ["main-affixes"],
    queryFn: async (): Promise<MainAffixData> => {
      const response = await fetch(`${BASE_URL.internal}/main-affixes`);
      const data = await response.json();

      return data;
    },
  });
};
