export interface LightConeBasicRaw  {
    rank: string;
    baseType: string;
    en: string;
    desc: string;
    kr: string;
    cn: string;
    jp: string;
    th: string;
}

export interface LightConeBasic {
    id: string;
    rank: string;
    baseType: string;
    desc: string;
    lang: Map<string, string>;  
}
