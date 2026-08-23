use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind};
use il2cpp::get_native_method;
use std::sync::LazyLock;
use utils::game_assembly_slice;

use super::{FieldMinimalInfo, NumberType};

static WRITE_RAW_BYTE_RVA: LazyLock<Option<usize>> = LazyLock::new(|| {
    get_native_method("Google.Protobuf.CodedOutputStream::WriteRawByte(System.Byte)")
        .map(|m| m.rva())
});

// repeated/map didnt handle
pub fn dump_from_write_to_asm(
    proto_name: &str,
    message_info: &mut super::MessageMinimalInfo,
) -> bool {
    let Some(write_raw_byte_rva) = *WRITE_RAW_BYTE_RVA else {
        return false;
    };

    let Some(write_to_method) = get_native_method(&format!(
        "{proto_name}::{}({})",
        super::WRITE_TO,
        super::CODED_OUTPUT_STREAM
    )) else {
        return false;
    };

    let write_to_rva = write_to_method.rva();

    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(
        64,
        &slice[write_to_rva..],
        (*il2cpp::GA_BASE + write_to_rva) as u64,
        DecoderOptions::NONE,
    );

    let mut instruction = Instruction::default();
    let mut cur_movs: Vec<u8> = Vec::new();

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        if instruction.mnemonic() == Mnemonic::Ret {
            break;
        }

        if instruction.mnemonic() == Mnemonic::Xor {
            cur_movs.clear();
        }

        if instruction.mnemonic() == Mnemonic::Mov && instruction.op0_kind() == OpKind::Register {
            let imm = instruction.immediate32();
            if imm != 0 {
                cur_movs.push(imm as u8);
            }
        }

        if instruction.mnemonic() == Mnemonic::Call {
            let call_target_rva = instruction.near_branch_target() as usize - *il2cpp::GA_BASE;
            if call_target_rva == write_raw_byte_rva {
                cur_movs.reverse();

                let mut next_inst = Instruction::default();
                decoder.decode_out(&mut next_inst);
                let offset = next_inst.memory_displacement32();

                if offset < 1000
                    && offset > 0
                    && let Some(field_number) = decode_varint(&cur_movs)
                {
                    message_info.fields.push(FieldMinimalInfo {
                        number_type: NumberType::None,
                        offset,
                        oneof_extra_data: None,
                        tag: field_number,
                        xor: 0,
                        property: None,
                    });
                }
                cur_movs.clear();
            }
        }
    }

    true
}

fn decode_varint(src: &[u8]) -> Option<u32> {
    let mut result: u32 = 0;
    let mut shift = 0;

    for &byte in src {
        let value = (byte & 0x7F) as u32;
        result |= value << shift;

        if (byte & 0x80) == 0 {
            return Some(result);
        }

        shift += 7;

        if shift >= 32 {
            return None;
        }
    }

    None
}
