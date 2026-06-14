import { BASE_URL } from "@/src/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { SubAffixData } from "../types/affixes.type";

export const useGetSubAffixes = () => {
  return useQuery({
    queryKey: ["sub-affixes"],
    queryFn: async (): Promise<SubAffixData> => {
      const response = await fetch(`${BASE_URL.internal}/sub-affixes`);
      const data = await response.json();

      return data;
    },
  });
};
