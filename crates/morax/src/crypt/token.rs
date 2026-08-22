// PATTERN = E8 ? ? ? ? 48 8B 15 ? ? ? ? 48 8B 3E 48 39 D7
// MemberInfo::get_MetadataToken

// 0x02 = TypeDef
// 0x04 = Field
// 0x06 = Method / MethodBase
// 0x14 = Event
// 0x17 = Property
// token = (table_id << 24) | global_member_index

pub fn field_token(global_field_index: usize) -> u32 {
    0x0400_0000 | global_field_index as u32
}

pub fn property_token(global_property_index: usize) -> u32 {
    0x1700_0000 | global_property_index as u32
}

pub fn event_token(global_event_index: usize) -> u32 {
    0x1400_0000 | global_event_index as u32
}
