use crate::vm::domain::Il2CppDomain;

pub use super::vm::{
    array::*, assembly::*, class::*, field::*, image::*, method::*, object::*, thread::*, r#type::*,
};

macro_rules! il2cpp_api {
    ($index:expr, $name:ident($($arg_name:ident: $arg_type:ty),*) -> $ret_type:ty) => {
        #[allow(warnings)]
        #[allow(clippy::not_unsafe_ptr_arg_deref)]
        #[inline(always)]
        pub fn $name($($arg_name: $arg_type,)*) -> $ret_type {
            use std::sync::Once;
            static ONCE: Once = Once::new();

            unsafe {
                let rva = (*super::API_BASE_PTR) + 8 * $index;
                ONCE.call_once(|| {
                    log::debug!("{} @ RVA {:#x}", stringify!($name), rva);
                });

                type FuncType = unsafe extern "C" fn($($arg_type,)*) -> $ret_type;
                ::std::mem::transmute::<usize, FuncType>(
                    *((*super::UP_BASE + rva) as *const usize)
                )($($arg_name,)*)
            }
        }
    };

    (
        $index:expr,
        $func_name:ident < $($generic:ident : $bound:tt),+ > ($($arg_name:ident: $arg_type:ty),*) -> $ret_type:ty
    ) => {
        #[inline(always)]
        pub fn $func_name < $($generic : $bound),+ > ($($arg_name: $arg_type),*) -> $ret_type {
            use std::sync::Once;
            static ONCE: Once = Once::new();

            unsafe {
                let rva = (*super::API_BASE_PTR) + 8 * $index;
                ONCE.call_once(|| {
                    log::debug!("{} @ RVA {:#x}", stringify!($func_name), rva);
                });

                ::std::mem::transmute::<usize, extern "C" fn($($arg_type),*) -> $ret_type>(
                    *((*super::UP_BASE + rva) as *const usize)
                )($($arg_name,)*)
            }
        }
    };
}

il2cpp_api!(14, il2cpp_array_class_get(element_class: Il2CppClass, rank: u32) -> Il2CppClass);
il2cpp_api!(18, il2cpp_array_new_specific(arrayTypeInfo: Il2CppClass, length: usize) -> Il2CppArray);
il2cpp_api!(22, il2cpp_assembly_get_image(assembly: Il2CppAssembly) -> Il2CppImage);
il2cpp_api!(31, il2cpp_class_get_fields(klass: Il2CppClass, iter: *const *const usize) -> Il2CppField);
il2cpp_api!(32, il2cpp_class_get_nested_types(klass: Il2CppClass, iter: *const *const usize) -> Il2CppClass);
il2cpp_api!(33, il2cpp_class_get_interfaces(klass: Il2CppClass, iter: *const *const usize) -> Il2CppClass);
il2cpp_api!(34, il2cpp_class_get_field_from_name(klass: Il2CppClass, name: *const i8) -> Il2CppField);
il2cpp_api!(35, il2cpp_class_get_methods(klass: Il2CppClass, iter: *const *const usize) -> Il2CppMethod);
il2cpp_api!(36, il2cpp_class_get_method_from_name(klass: Il2CppClass, name: *const i8, argsCount: i32) -> Il2CppMethod);
il2cpp_api!(37, il2cpp_class_get_name(klass: Il2CppClass) -> *const i8);
il2cpp_api!(39, il2cpp_class_get_namespace(klass: Il2CppClass) -> *const i8);
il2cpp_api!(40, il2cpp_class_get_parent(klass: Il2CppClass) -> Il2CppClass);
il2cpp_api!(41, il2cpp_class_get_declaring_type(klass: Il2CppClass) -> Il2CppClass);
il2cpp_api!(42, il2cpp_class_instance_size(klass: Il2CppClass) -> i32);
il2cpp_api!(43, il2cpp_class_is_valuetype(klass: Il2CppClass) -> bool);
il2cpp_api!(45, il2cpp_class_get_flags(klass: Il2CppClass) -> i32);
il2cpp_api!(46, il2cpp_class_is_abstract(klass: Il2CppClass) -> bool);
il2cpp_api!(47, il2cpp_class_is_interface(klass: Il2CppClass) -> bool);
il2cpp_api!(48, il2cpp_class_array_element_size(klass: Il2CppClass) -> i32);
il2cpp_api!(49, il2cpp_class_from_type(r#type: Il2CppType) -> Il2CppClass);
il2cpp_api!(51, il2cpp_class_get_type(klass: Il2CppClass) -> Il2CppType);
il2cpp_api!(53, il2cpp_class_is_enum(klass: Il2CppClass) -> bool);
il2cpp_api!(54, il2cpp_class_get_image(klass: Il2CppClass) -> Il2CppImage);
il2cpp_api!(55, il2cpp_class_get_assemblyname(klass: Il2CppClass) -> *const i8);
il2cpp_api!(56, il2cpp_class_get_rank(klass: Il2CppClass) -> i32);
il2cpp_api!(57, il2cpp_class_get_data_size(klass: Il2CppClass) -> u32);
il2cpp_api!(63, il2cpp_domain_get() -> Il2CppDomain);
il2cpp_api!(64, il2cpp_domain_assembly_open(domain: Il2CppDomain, name: *const i8) -> Il2CppAssembly);
il2cpp_api!(65, il2cpp_domain_get_assemblies(domain: Il2CppDomain, size: *mut usize) -> *mut Il2CppAssembly);
il2cpp_api!(73, il2cpp_field_get_name(field: Il2CppField) -> *const i8);
il2cpp_api!(75, il2cpp_field_get_offset(field: Il2CppField) -> usize);
il2cpp_api!(76, il2cpp_field_get_type(field: Il2CppField) -> Il2CppType);
il2cpp_api!(77, il2cpp_field_get_value_object(field: Il2CppField, obj: Il2CppObject) -> Il2CppObject);
il2cpp_api!(116, il2cpp_method_get_return_type(method: Il2CppMethod) -> Il2CppType);
il2cpp_api!(117, il2cpp_method_get_name(method: Il2CppMethod) -> *const i8);
il2cpp_api!(122, il2cpp_method_is_instance(method: Il2CppMethod) -> bool);
il2cpp_api!(123, il2cpp_method_get_param_count(method: Il2CppMethod) -> u32);
il2cpp_api!(124, il2cpp_method_get_param(method: Il2CppMethod, index: u32) -> Il2CppType);
il2cpp_api!(125, il2cpp_method_get_class(method: Il2CppMethod) -> Il2CppClass);
il2cpp_api!(128, il2cpp_object_get_size(obj: Il2CppObject) -> u32);
il2cpp_api!(129, il2cpp_object_get_virtual_method(obj: Il2CppObject, method: Il2CppMethod) -> Il2CppMethod);
il2cpp_api!(130, il2cpp_object_new(klass: Il2CppClass) -> Il2CppObject);
il2cpp_api!(131, il2cpp_object_unbox(obj: Il2CppObject) -> *mut ::std::os::raw::c_void);
il2cpp_api!(132, il2cpp_value_box<T: Copy>(klass: Il2CppClass, data: *const T) -> Il2CppObject);
il2cpp_api!(140, il2cpp_runtime_invoke(
    method: Il2CppMethod,
    obj: Il2CppObject, 
    params: *const usize, 
    exception: &mut usize
) -> usize);
il2cpp_api!(154, il2cpp_thread_attach(domain: Il2CppDomain) -> Il2CppThread);
il2cpp_api!(161, il2cpp_type_get_name(r#type: Il2CppType) -> *const i8);
il2cpp_api!(162, il2cpp_type_is_byref(r#type: Il2CppType) -> bool);
il2cpp_api!(163, il2cpp_type_get_attrs(r#type: Il2CppType) -> u32);
il2cpp_api!(164, il2cpp_type_equals(r#type: Il2CppType, othertype: Il2CppType) -> bool);
il2cpp_api!(165, il2cpp_type_get_assembly_qualified_name(r#type: Il2CppType) -> *const i8);
il2cpp_api!(168, il2cpp_image_get_name(image: Il2CppImage) -> *const i8);
il2cpp_api!(169, il2cpp_image_get_class_count(image: Il2CppImage) -> usize);
il2cpp_api!(170, il2cpp_image_get_class(image: Il2CppImage, index: usize) -> Il2CppClass);
