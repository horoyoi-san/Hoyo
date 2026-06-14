export type BaseAffix = {
  AffixID: number;
  BaseValue: {
    Value: number;
  };
  GroupID: number;
  Property: string;
};

export type MainAffix = Record<
  number,
  {
    LevelAdd: {
      Value: number;
    };
  } & BaseAffix
>;

export type SubAffixItem = {
  StepNum: number;
  StepValue: {
    Value: number;
  };
} & BaseAffix;

export type SubAffix = Record<number, SubAffixItem>;

export type MainAffixData = Record<number, MainAffix>;
export type SubAffixData = Record<number, SubAffix>;
