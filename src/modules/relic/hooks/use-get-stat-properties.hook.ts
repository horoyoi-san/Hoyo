import { BASE_URL } from "@/src/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { StatPropertyData } from "../types/stat-propery.type";

export const useGetStatProperties = () => {
  return useQuery({
    queryKey: ["stat-properties"],
    queryFn: async (): Promise<StatPropertyData> => {
      const response = await fetch(`${BASE_URL.neonteam}/stat-properties`);
      const data = await response.json();

      return data;
    },
  });
};
