use std::sync::LazyLock;

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic};
use il2cpp::vm::object::Il2CppObject;
use reflection::{
    assembly::get_assemblies, field_info::FieldInfo, method_info::MethodInfo,
    runtime_type::RuntimeType,
};
use utils::game_assembly_slice;

const NETWORK_ASSEMBLY: &str = "RPG.Network.MiNet";
const PACKET_MARKER_FIELD_VALUE: i32 = 120000;
const XOR_MARKER_FIELD_VALUE: i32 = 340870469;

pub static PACKET_METHODS: LazyLock<(usize, usize)> = LazyLock::new(|| {
    let Some(class) = find_class_by_const(PACKET_MARKER_FIELD_VALUE) else {
        log::debug!("[Sniffer] failed to find network packet class");
        return (0, 0);
    };

    let methods = class
        .get_methods_il2cpp()
        .into_iter()
        .filter(is_packet_xor_signature)
        .take(2)
        .collect::<Vec<_>>();

    let Some(recv) = methods.first() else {
        log::debug!("[Sniffer] failed to find packet recv method");
        return (0, 0);
    };

    let Some(send) = methods.get(1) else {
        log::debug!("[Sniffer] failed to find packet send method");
        return (0, 0);
    };

    let recv_va = recv.get_il2cpp_method().va();
    let send_va = send.get_il2cpp_method().va();
    let recv_name = recv.get_name().unwrap().as_str();
    let send_name = send.get_name().unwrap().as_str();

    log::debug!(
        "[Sniffer] packet recv => {recv_name} RVA=0x{:X} VA=0x{recv_va:X}",
        recv.get_il2cpp_method().rva()
    );
    log::debug!(
        "[Sniffer] packet send => {send_name} RVA=0x{:X} VA=0x{send_va:X}",
        send.get_il2cpp_method().rva()
    );

    (send_va, recv_va)
});

static XOR_CLASS: LazyLock<Option<RuntimeType>> = LazyLock::new(|| {
    let class = find_class_by_const(XOR_MARKER_FIELD_VALUE);
    if class.is_none() {
        log::debug!("[Sniffer] failed to find xor class");
    }

    class
});

pub static PACKET_XOR_METHOD: LazyLock<usize> = LazyLock::new(|| {
    let Some(class) = XOR_CLASS.as_ref() else {
        return 0;
    };

    let Some(method) = class
        .get_methods_il2cpp()
        .into_iter()
        .find(is_packet_xor_signature)
    else {
        log::debug!("[Sniffer] failed to find packet xor method");
        return 0;
    };

    let va = method.get_il2cpp_method().va();
    let method_name = method.get_name().unwrap().as_str();
    log::debug!(
        "[Sniffer] packet xor => {method_name} RVA=0x{:X} VA=0x{va:X}",
        method.get_il2cpp_method().rva()
    );

    va
});

pub static EC2B_XOR_KEY_FIELD: LazyLock<Option<FieldInfo>> = LazyLock::new(|| {
    let class = XOR_CLASS.as_ref()?;

    let Some((field, property)) = class.get_properties(62).into_iter().find_map(|property| {
        let property_type = property.get_property_type().ok()?;
        is_obf(&property_type.il_name()).then_some(())?;

        let getter = property.get_get_method(true).ok()?;
        let getter_rva = getter.get_il2cpp_method().rva();

        class
            .get_fields_il2cpp()
            .into_iter()
            .find(|field| is_correct_getter(field.get_offset(), getter_rva))
            .map(|field| (field, property))
    }) else {
        log::debug!("[Sniffer] failed to find ec2b_xorkey field");
        return None;
    };

    let offset = field.get_offset();
    let field_name = field.get_name().unwrap().as_str();
    let property_name = property.get_name().unwrap().as_str();
    log::debug!(
        "[Sniffer] ec2b_xorkey => field={field_name} property={property_name} offset=0x{offset:X}"
    );

    Some(field)
});

fn find_class_by_const(value: i32) -> Option<RuntimeType> {
    get_assemblies()
        .into_iter()
        .find(|assembly| assembly.get_name().contains(NETWORK_ASSEMBLY))
        .into_iter()
        .flat_map(|assembly| assembly.get_types())
        .find(|ty| {
            ty.get_fields_il2cpp().into_iter().any(|field| {
                field.get_isliteral().is_ok_and(|v| v.unbox())
                    && field
                        .get_value(Il2CppObject::NULL)
                        .is_ok_and(|value_obj| value_obj.unbox::<i32>() == value)
            })
        })
}

fn is_packet_xor_signature(method: &MethodInfo) -> bool {
    let params = method.get_parameters();
    params.len() == 3
        && method
            .get_return_type()
            .is_ok_and(|ty| ty.il_name() == "System.Int32")
        && params[0]
            .get_parameter_type()
            .is_ok_and(|ty| ty.il_name() == "System.Byte[]")
        && params[1]
            .get_parameter_type()
            .is_ok_and(|ty| ty.il_name() == "System.Int32")
        && params[2]
            .get_parameter_type()
            .is_ok_and(|ty| ty.il_name() == "System.Int32")
}

pub fn is_correct_getter(field_offset: usize, getter_rva: usize) -> bool {
    let slice = game_assembly_slice();
    let mut decoder = Decoder::new(64, &slice[getter_rva..], DecoderOptions::NONE);

    let mut instruction = Instruction::default();
    let mut output = String::new();

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);
        output.clear();

        match instruction.mnemonic() {
            Mnemonic::Ret => break,
            Mnemonic::Mov | Mnemonic::Movzx | Mnemonic::Movss | Mnemonic::Movsd => {
                let displacement_64 = instruction.memory_displacement64();
                let displacement = if displacement_64 == 0 {
                    instruction.memory_displacement32() as usize
                } else {
                    displacement_64 as usize
                };

                return displacement == field_offset;
            }
            _ => {}
        }
    }

    false
}

fn is_obf(s: &str) -> bool {
    s.len() == 11 && s.chars().all(char::is_uppercase)
}
