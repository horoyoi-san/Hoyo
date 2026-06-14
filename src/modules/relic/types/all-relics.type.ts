export type RelicData = {
  id: number;
  set_id: number;
  rarity: number;
  type: string;
  max_level: number;
  main_affix_id: number;
  sub_affix_id: number;
  icon: string;
  name: string;
};

export type AllRelicsData = Record<string, RelicData>;
