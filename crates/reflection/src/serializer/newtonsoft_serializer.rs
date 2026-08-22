use std::path::Path;

use il2cpp::{
    get_cached_class, get_native_method,
    vm::{
        exception::Il2CppException,
        object::Il2CppObject,
        string::Il2CppString,
        value::{Il2CppValue, Void},
    },
};
use serde_json::Value;

use crate::runtime_type::RuntimeType;

#[derive(Clone, Copy)]
#[repr(transparent)]
struct JsonSerializer(pub usize);

impl JsonSerializer {
    pub fn new() -> Self {
        let class = get_cached_class("Newtonsoft.Json.JsonSerializer").unwrap();

        let object = class.create_instance();
        get_native_method("Newtonsoft.Json.JsonSerializer::.ctor()")
            .unwrap()
            .invoke::<Void>(object, &[])
            .unwrap();

        let serializer = Self(object.0);

        serializer.init_options();

        serializer
    }

    fn init_options(&self) {
        // Formatting
        unsafe {
            std::mem::transmute::<usize, extern "C" fn(JsonSerializer, i32)>(
                get_native_method(
                    "Newtonsoft.Json.JsonSerializer::set_Formatting(Newtonsoft.Json.Formatting)",
                )
                .unwrap()
                .va(),
            )(*self, 1);
        };

        // ReferenceLoopHandling
        unsafe {
            std::mem::transmute::<usize, extern "C" fn(JsonSerializer, i32)>(
                get_native_method(
                    "Newtonsoft.Json.JsonSerializer::set_ReferenceLoopHandling(Newtonsoft.Json.ReferenceLoopHandling)",
                )
                .unwrap()
                .va(),
            )(*self, 0);
        };

        // DefaultValueHandling
        unsafe {
            std::mem::transmute::<usize, extern "C" fn(JsonSerializer, i32)>(
                get_native_method(
                    "Newtonsoft.Json.JsonSerializer::set_DefaultValueHandling(Newtonsoft.Json.DefaultValueHandling)",
                )
                .unwrap()
                .va()
            )(*self, 1);
        };

        // add StringEnumConverters to Converters
        let converters = get_native_method("Newtonsoft.Json.JsonSerializer::get_Converters()")
            .unwrap()
            .invoke::<Il2CppObject>(Il2CppObject(self.0), &[])
            .unwrap();

        let add_method_info = RuntimeType::from_object(converters)
            .unwrap()
            .get_method("Add".into(), 60)
            .unwrap();

        if add_method_info.0 == 0 {
            panic!("[Newtonsoft Serializer] Converters didn't have Add method!");
        }

        let class = get_cached_class("Newtonsoft.Json.Converters.StringEnumConverter").unwrap();
        let obj = class.create_instance();
        add_method_info
            .get_il2cpp_method()
            .invoke::<Void>(converters, &[&obj])
            .unwrap();
    }

    fn serialize(
        &self,
        text_writer: JsonTextWriter,
        object: Il2CppObject,
    ) -> Result<Void, Il2CppException> {
        let method = get_native_method(
            "Newtonsoft.Json.JsonSerializer::Serialize(Newtonsoft.Json.JsonWriter,System.Object)",
        )
        .unwrap();
        method.invoke::<Void>(
            Il2CppObject(self.0),
            &[&Il2CppObject(text_writer.0), &object],
        )
    }
}

#[repr(transparent)]
#[derive(Clone, Copy)]
struct JsonTextWriter(pub usize);

impl JsonTextWriter {
    pub fn new(stream_writer: StreamWriter) -> Self {
        let class = get_cached_class("Newtonsoft.Json.JsonTextWriter").unwrap();
        let runtime_type = RuntimeType::from_class(class).unwrap();

        let object = class.create_instance();

        runtime_type
            .find_method_il2cpp(".ctor")
            .unwrap()
            .get_il2cpp_method()
            .invoke::<Void>(object, &[&Il2CppObject(stream_writer.0)])
            .unwrap();

        Self(object.0)
    }

    pub fn close(&self) -> Result<Void, Il2CppException> {
        get_native_method("Newtonsoft.Json.JsonTextWriter::Close()")
            .unwrap()
            .invoke::<Void>(Il2CppObject(self.0), &[])
    }
}

#[repr(transparent)]
#[derive(Clone, Copy)]
struct StreamWriter(pub usize);

impl StreamWriter {
    pub fn new(path: &str) -> Self {
        let sw = get_cached_class("System.IO.StreamWriter").unwrap();

        let object = sw.create_instance();

        get_native_method("System.IO.StreamWriter::.ctor(System.String)")
            .unwrap()
            .invoke::<Void>(object, &[&Il2CppObject(Il2CppString::from(path).0)])
            .unwrap();

        Self(object.0)
    }

    pub fn close(&self) -> Result<Void, Il2CppException> {
        get_native_method("System.IO.StreamWriter::Close()")
            .unwrap()
            .invoke::<Void>(Il2CppObject(self.0), &[])
    }

    pub fn flush(&self) -> Result<Void, Il2CppException> {
        get_native_method("System.IO.StreamWriter::Flush()")
            .unwrap()
            .invoke::<Void>(Il2CppObject(self.0), &[])
    }
}

pub struct NewtonsoftSerializer;

#[allow(unused)]
impl NewtonsoftSerializer {
    pub fn serialize_to_file(object: Il2CppObject, path: &str) -> Result<(), Il2CppException> {
        if let Some(parent) = Path::new(path).parent()
            && !parent.exists()
        {
            std::fs::create_dir_all(parent).unwrap();
        }

        let sw = StreamWriter::new(path);
        let jtw = JsonTextWriter::new(sw);
        let js = JsonSerializer::new();

        js.serialize(jtw, object)?;
        sw.flush()?;
        sw.close()?;
        jtw.close()?;

        Ok(())
    }

    pub fn serialize(object: Il2CppObject) -> Result<Value, Il2CppException> {
        let string =
            get_native_method("Newtonsoft.Json.JsonConvert::SerializeObject(System.Object)")
                .unwrap()
                .invoke::<Il2CppString>(Il2CppObject::NULL, &[&object])?;

        if string.is_null() {
            return Ok(Value::Null);
        }

        Ok(serde_json::from_str(&string.as_str()).unwrap())
    }
}
