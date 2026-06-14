export interface Properties {
  add: string;
  base: string;
  final: string;
  property_type: number;
}

export interface PropertyRelicType {
  is_preview: boolean;
  property_type: number;
  times: number;
  value: string;
}

export interface RelicType {
  desc: string;
  icon: string;
  id: number;
  level: number;
  main_property: PropertyRelicType;
  name: string;
  pos: number;
  properties: PropertyRelicType[];
  rarity: number;
}

export interface LightconeEquip {
  desc: string;
  icon: string;
  id: number;
  name: string;
  rank: number;
  rarity: number;
  level: number;
}

export interface Avatar {
  name: string;
  avatar_ld_type: string;
  base_type: number;
  cur_enhanced_id: number;
  element: string;
  element_id: number;
  equip: LightconeEquip;
  figure_path: string;
  icon: string;
  id: number;
  image: string;
  level: number;
  ornaments: RelicType[];
  properties: Properties[];
  rank: number;
  rarity: number;
  relics: RelicType[];
}

export interface PropertyInfo {
  icon: string;
  name: string;
  property_name_filter: string;
  property_name_relic: string;
  property_type: string;
}

export interface RelicProperties {
  modify_property_type: number;
  property_type: number;
}

export interface Data {
  avatar_list: Avatar[];
  property_info: Record<string, PropertyInfo>;
  relic_properties: RelicProperties[];
}

export interface ResponseHoyolab {
  data: Data;
  message: string;
  retcode: number;
}
