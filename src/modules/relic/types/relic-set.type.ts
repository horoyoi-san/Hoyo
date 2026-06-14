export interface RelicProperty {
  type: string;
  value: number;
}

export interface SetBonusDetail {
  desc: string;
  properties: RelicProperty[];
}

export type SetBonusEntry = [string, SetBonusDetail];

export interface RelicSet {
  id: number;
  name: string;
  desc: number | string;
  icon: string;
  set_bonus: SetBonusEntry[];
}

export type RelicSetData = Record<string, RelicSet>;
