interface StatValue {
  base: number;
  step: number;
}

interface PromotionStats {
  hp: StatValue;
  atk: StatValue;
  def: StatValue;
}

interface RankData {
  id: number;
  skill: number;
  desc: number;
  params: Array<number[]>;
  properties: any[][];
}

export interface LightconeRawDetails {
  id: number;
  rarity: number;
  path: string;
  preview: string;
  portrait: string;
  rank: RankData;
  promotion: {
    id: number;
    values: PromotionStats[];
  };
  icon: string;
  desc: number;
  name: number;
}

export type LightconeRawDataList = {
  [key: string]: LightconeRawDetails;
};
