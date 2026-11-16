export type RelicShowcaseType = {
    img: string;
    mainAffix: {
      property: string;
      level: number;
      valueAffix: string;
      detail: {
        name: string;
        icon: string;
        unit: string;
        baseStat: string;
      };
    };
    subAffix: {
      property: string;
      valueAffix: string;
      detail: {
        name: string;
        icon: string;
        unit: string;
        baseStat: string;
      };
      step: number;
      count: number;
    }[]
}