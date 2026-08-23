use crate::api::Il2CppClass;

pub fn get_typeinfo_from_typedefindex(index: u32) -> Il2CppClass {
    *crate::CLASS_TABLE_VEC
        .get()
        .unwrap()
        .get(index as usize)
        .unwrap()
}
