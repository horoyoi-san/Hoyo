import { BASE_URL } from "@/src/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { CharacterDataList } from "../utils/character-detail.type";

export const useCharacters = () => {
  return useQuery({
    queryKey: ["character-list"],
    queryFn: async (): Promise<CharacterDataList> => {
      const response = await fetch(`${BASE_URL.neonteam}/characters`);
      const data = await response.json();

      return data;
    },
  });
};
