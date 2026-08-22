pub mod decode_gateway;
pub mod decoder;
pub mod dispatch;
pub mod parse_gate_server;
pub mod region;
pub mod stop_info;

use std::collections::HashMap;

use iced_x86::Register;

use crate::proto::output::TypeToItemMap;

pub fn process_all(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    let mut map = parse_gate_server::process(type_to_item);
    map.extend(stop_info::process_stop_info(type_to_item));
    let decode_nt = decode_gateway::run();
    for k in decode_nt.keys() {
        map.remove(k);
    }
    map.extend(decode_nt);
    map
}

pub fn full_reg(r: Register) -> Register {
    match r {
        Register::EAX | Register::AX | Register::AL | Register::AH => Register::RAX,
        Register::EBX | Register::BX | Register::BL | Register::BH => Register::RBX,
        Register::ECX | Register::CX | Register::CL | Register::CH => Register::RCX,
        Register::EDX | Register::DX | Register::DL | Register::DH => Register::RDX,
        Register::ESI | Register::SI => Register::RSI,
        Register::EDI | Register::DI => Register::RDI,
        Register::EBP | Register::BP => Register::RBP,
        Register::R8D | Register::R8W | Register::R8L => Register::R8,
        Register::R9D | Register::R9W | Register::R9L => Register::R9,
        Register::R10D | Register::R10W | Register::R10L => Register::R10,
        Register::R11D | Register::R11W | Register::R11L => Register::R11,
        Register::R12D | Register::R12W | Register::R12L => Register::R12,
        Register::R13D | Register::R13W | Register::R13L => Register::R13,
        Register::R14D | Register::R14W | Register::R14L => Register::R14,
        Register::R15D | Register::R15W | Register::R15L => Register::R15,
        _ => r,
    }
}

pub const VOLATILE_REGS: [Register; 7] = [
    Register::RAX,
    Register::RCX,
    Register::RDX,
    Register::R8,
    Register::R9,
    Register::R10,
    Register::R11,
];
