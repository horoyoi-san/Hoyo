import { useQuery } from "@tanstack/react-query";

export interface MonsterData {
  ID: number;
  Name: Record<string, string>;
  Image: {
    IconPath: string;
    RoundIconPath: string;
    ImagePath: string;
    ManikinImagePath: string;
  };
  Base: {
    HPBase: number;
    SpeedBase: number;
    DefenceBase: number;
    AttackBase: number;
    StanceBase: number;
  };
  StanceWeakList: string[];
}

export type MonsterMap = Record<string, MonsterData>;

export interface BattleEventLevel {
  Floor?: number;
  Name: Record<string, string>;
  EventList1?: { MonsterList: number[][] }[];
  EventList2?: { MonsterList: number[][] }[];
}

export interface BattleEvent {
  ID: number;
  Name: Record<string, string>;
  Level: Record<string, BattleEventLevel>;
}

export type BattleEventMap = Record<string, BattleEvent>;

export const useGetMonsterDict = () => {
  return useQuery({
    queryKey: ["monster-dict"],
    queryFn: async (): Promise<MonsterMap> => {
      const res = await fetch("/data/monster.json");
      return res.json();
    },
    staleTime: Infinity,
  });
};

export const useGetBattleEvents = (mode: string) => {
  return useQuery({
    queryKey: ["battle-events", mode],
    queryFn: async (): Promise<BattleEventMap | null> => {
      if (!["moc", "pf", "as", "peak"].includes(mode)) return null;
      const res = await fetch(`/data/${mode}.json`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: ["moc", "pf", "as", "peak"].includes(mode),
    staleTime: Infinity,
  });
};
