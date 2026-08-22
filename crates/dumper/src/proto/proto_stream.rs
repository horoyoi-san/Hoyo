use super::CODED_INPUT_STREAM;
use crate::proto::{BYTE_STRING, CODED_OUTPUT_STREAM};
use dahlah_derive::Il2CppValue;
use il2cpp::{
    get_cached_class, get_native_method,
    vm::{
        array::Il2CppArray,
        class::Il2CppClass,
        method::Il2CppMethod,
        object::Il2CppObject,
        r#type::Il2CppType,
        value::{Il2CppValue, Void},
    },
};
use reflection::runtime_type::RuntimeType;

static mut CODED_INPUT_STREAM_CLASS: Il2CppClass = Il2CppClass(0);
static mut CODED_INPUT_STREAM_CTOR: Il2CppMethod = Il2CppMethod(0);

pub static mut SYSTEM_BYTE_ARRAY_CLASS: Il2CppClass = Il2CppClass(0);

static mut CODED_OUTPUT_STREAM_CLASS: Il2CppClass = Il2CppClass(0);
static mut CODED_OUTPUT_STREAM_RUNTIME_TYPE: RuntimeType = RuntimeType(0);
static mut CODED_OUTPUT_STREAM_CTOR: Il2CppMethod = Il2CppMethod(0);

static mut BYTE_STRING_CLASS: Il2CppClass = Il2CppClass(0);
static mut BYTE_STRING_CTOR: Il2CppMethod = Il2CppMethod(0);

#[allow(static_mut_refs)]
pub fn init() {
    unsafe {
        CODED_INPUT_STREAM_CLASS = get_cached_class(CODED_INPUT_STREAM).unwrap();

        CODED_INPUT_STREAM_CTOR = get_native_method(&format!(
            "{CODED_INPUT_STREAM}::.ctor(System.Byte[],System.Boolean)"
        ))
        .unwrap();

        SYSTEM_BYTE_ARRAY_CLASS = get_cached_class("System.Byte").unwrap().get_array_class(1);

        CODED_OUTPUT_STREAM_CLASS = get_cached_class(CODED_OUTPUT_STREAM).unwrap();
        CODED_OUTPUT_STREAM_CTOR = get_native_method(&format!(
            "{CODED_OUTPUT_STREAM}::.ctor(System.Byte[],System.Int32,System.Int32,System.Boolean)"
        ))
        .unwrap();
        CODED_OUTPUT_STREAM_RUNTIME_TYPE =
            RuntimeType::from_class(CODED_OUTPUT_STREAM_CLASS).unwrap();

        BYTE_STRING_CLASS = get_cached_class(BYTE_STRING).unwrap();
        BYTE_STRING_CTOR =
            get_native_method(&format!("{BYTE_STRING}::.ctor(System.Byte[],System.Int32)"))
                .unwrap();
    }
}

#[repr(transparent)]
pub struct CodedInputStream(pub usize);

impl CodedInputStream {
    pub fn new_object(buf: &[u8]) -> Il2CppObject {
        unsafe {
            let mut byte_array = Il2CppArray::new(SYSTEM_BYTE_ARRAY_CLASS, buf.len());
            byte_array.as_mut_slice().copy_from_slice(buf);

            #[allow(static_mut_refs)]
            let obj = CODED_INPUT_STREAM_CLASS.create_instance();

            #[allow(static_mut_refs)]
            CODED_INPUT_STREAM_CTOR
                .invoke::<Void>(obj, &[&Il2CppObject(byte_array.0), &false])
                .unwrap();

            Il2CppObject(obj.0)
        }
    }
}

pub struct CodedOutputStream {
    pub object: Il2CppObject,
    buffer: Il2CppArray,
}

#[allow(unused)]
impl CodedOutputStream {
    pub fn new() -> Self {
        unsafe {
            #[allow(static_mut_refs)]
            let object = CODED_OUTPUT_STREAM_CLASS.create_instance();

            let buffer = Il2CppArray::new(SYSTEM_BYTE_ARRAY_CLASS, 4096);

            #[allow(static_mut_refs)]
            CODED_OUTPUT_STREAM_CTOR.invoke::<Void>(object, &[&buffer, &0i32, &4096i32, &false]);

            Self { object, buffer }
        }
    }

    pub fn buffer(&self) -> Vec<u8> {
        self.buffer
            .to_vec::<u8>()
            .into_iter()
            .take_while(|value| *value != 0)
            .collect::<Vec<_>>()
    }
}

#[derive(Clone, Copy, Il2CppValue)]
#[repr(transparent)]
pub struct ByteString(pub usize);

impl ByteString {
    pub fn new() -> Self {
        unsafe {
            #[allow(static_mut_refs)]
            let instance = BYTE_STRING_CLASS.create_instance();

            #[allow(static_mut_refs)]
            BYTE_STRING_CTOR
                .invoke::<Void>(
                    instance,
                    &[&Il2CppArray::new(SYSTEM_BYTE_ARRAY_CLASS, 1), &1],
                )
                .unwrap();

            Self(instance.0)
        }
    }
}
