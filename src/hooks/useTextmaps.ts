import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../utils/constants";

export const useTextmaps = () => {
  return useQuery({
    queryKey: ["textmaps"],
    queryFn: async (): Promise<Record<number, string>> => {
      const res = await fetch(`${BASE_URL.neonteam}/textmaps`);
      const data = await res.json();

      return data.EN;
    },
  });
};
