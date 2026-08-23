use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use reflection::field_info::FieldInfo;
use std::collections::{HashMap, HashSet};
use utils::game_assembly_slice;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
enum TrackedValue {
    OutPtr,
    ObjectPtr { offset: i64 },
}

pub fn reorder(rva: usize, targets: Vec<FieldInfo>) -> Vec<FieldInfo> {
    let mut ordered = Vec::new();
    let mut unvisited = targets;
    let mut visited = HashSet::new();
    collect_offsets(
        rva,
        HashMap::from([(Register::RDX, TrackedValue::OutPtr)]),
        &mut ordered,
        &mut unvisited,
        &mut visited,
    );
    ordered
}

fn collect_offsets(
    rva: usize,
    mut tracked: HashMap<Register, TrackedValue>,
    ordered: &mut Vec<FieldInfo>,
    unvisited: &mut Vec<FieldInfo>,
    visited: &mut HashSet<(usize, Vec<(Register, TrackedValue)>)>,
) {
    let state_key = tracked_key(&tracked);
    if !visited.insert((rva, state_key)) {
        return;
    }

    let bytes = game_assembly_slice();
    let decoder = Decoder::with_ip(64, &bytes[rva..], rva as u64, DecoderOptions::NONE);
    let mut in_body = false;

    for instruction in decoder {
        if unvisited.is_empty() {
            break;
        }

        let is_push = instruction.mnemonic() == Mnemonic::Push;

        if !in_body && !is_push {
            in_body = true;
        } else if in_body && is_push {
            break;
        }

        record_write(&instruction, &tracked, ordered, unvisited);
        record_call_args(&instruction, &tracked, ordered, unvisited);

        if let Some((target_rva, next_tracked)) = get_delegated_transfer(&instruction, &tracked) {
            collect_offsets(target_rva, next_tracked, ordered, unvisited, visited);
        }

        apply_memory_tracking(&instruction, &mut tracked);
        apply_tracking(&instruction, &mut tracked);
    }
}

fn record_write(
    instruction: &Instruction,
    tracked: &HashMap<Register, TrackedValue>,
    ordered: &mut Vec<FieldInfo>,
    unvisited: &mut Vec<FieldInfo>,
) {
    if instruction.op0_kind() != OpKind::Memory {
        return;
    }

    if is_immediate(instruction.op1_kind()) {
        return;
    }

    let Some(base) = normalize_register(instruction.memory_base()) else {
        return;
    };

    let Some(TrackedValue::ObjectPtr {
        offset: base_offset,
    }) = tracked.get(&base)
    else {
        return;
    };

    if let Some(offset) = resolve_offset(*base_offset, instruction.memory_displacement64()) {
        record_offset(offset, ordered, unvisited);
    }
}

fn record_call_args(
    instruction: &Instruction,
    tracked: &HashMap<Register, TrackedValue>,
    ordered: &mut Vec<FieldInfo>,
    unvisited: &mut Vec<FieldInfo>,
) {
    if instruction.mnemonic() != Mnemonic::Call {
        return;
    }

    for reg in [Register::RCX, Register::RDX, Register::R8, Register::R9] {
        let Some(TrackedValue::ObjectPtr { offset }) = tracked.get(&reg) else {
            continue;
        };

        if *offset >= 0 {
            record_offset(*offset as usize, ordered, unvisited);
        }
    }
}

fn get_delegated_transfer(
    instruction: &Instruction,
    tracked: &HashMap<Register, TrackedValue>,
) -> Option<(usize, HashMap<Register, TrackedValue>)> {
    if !matches!(instruction.mnemonic(), Mnemonic::Call | Mnemonic::Jmp)
        || instruction.op0_kind() != OpKind::NearBranch64
    {
        return None;
    }

    let mut next_tracked = HashMap::new();

    for reg in [Register::RCX, Register::RDX, Register::R8, Register::R9] {
        if let Some(value) = tracked.get(&reg).copied() {
            next_tracked.insert(reg, value);
        }
    }

    if !matches!(
        next_tracked.get(&Register::RDX),
        Some(TrackedValue::ObjectPtr { offset: 0 })
    ) {
        return None;
    }

    let target = usize::try_from(instruction.near_branch64()).ok()?;
    Some((target, next_tracked))
}

fn apply_memory_tracking(instruction: &Instruction, tracked: &mut HashMap<Register, TrackedValue>) {
    if instruction.mnemonic() != Mnemonic::Mov || instruction.op0_kind() != OpKind::Memory {
        return;
    }

    let Some(base) = normalize_register(instruction.memory_base()) else {
        return;
    };

    if !matches!(tracked.get(&base), Some(TrackedValue::OutPtr))
        || instruction.memory_displacement64() != 0
        || instruction.op1_kind() != OpKind::Register
    {
        return;
    }

    let Some(src) = normalize_register(instruction.op1_register()) else {
        return;
    };

    tracked.insert(src, TrackedValue::ObjectPtr { offset: 0 });
}

fn apply_tracking(instruction: &Instruction, tracked: &mut HashMap<Register, TrackedValue>) {
    if instruction.mnemonic() == Mnemonic::Call {
        for reg in [
            Register::RAX,
            Register::RCX,
            Register::RDX,
            Register::R8,
            Register::R9,
            Register::R10,
            Register::R11,
        ] {
            tracked.remove(&reg);
        }
        return;
    }

    let next = match instruction.mnemonic() {
        Mnemonic::Mov => track_mov(instruction, tracked),
        Mnemonic::Lea => track_lea(instruction, tracked),
        Mnemonic::Add => track_add_sub(instruction, tracked, true),
        Mnemonic::Sub => track_add_sub(instruction, tracked, false),
        Mnemonic::Xor => track_xor(instruction),
        _ => return,
    };

    let Some(dest) = normalize_register(instruction.op0_register()) else {
        return;
    };

    match next {
        Some(value) => {
            tracked.insert(dest, value);
        }
        None => {
            tracked.remove(&dest);
        }
    }
}

fn track_mov(
    instruction: &Instruction,
    tracked: &HashMap<Register, TrackedValue>,
) -> Option<TrackedValue> {
    match instruction.op1_kind() {
        OpKind::Register => {
            let src = normalize_register(instruction.op1_register())?;
            tracked.get(&src).copied()
        }
        OpKind::Memory => {
            let base = normalize_register(instruction.memory_base())?;
            let value = tracked.get(&base)?;

            match value {
                TrackedValue::OutPtr => Some(TrackedValue::ObjectPtr {
                    offset: instruction.memory_displacement64() as i64,
                }),
                TrackedValue::ObjectPtr { .. } => None,
            }
        }
        _ => None,
    }
}

fn track_lea(
    instruction: &Instruction,
    tracked: &HashMap<Register, TrackedValue>,
) -> Option<TrackedValue> {
    if instruction.op1_kind() != OpKind::Memory || instruction.memory_index() != Register::None {
        return None;
    }

    let base = normalize_register(instruction.memory_base())?;
    let displacement = instruction.memory_displacement64() as i64;

    match tracked.get(&base)? {
        TrackedValue::ObjectPtr { offset } => Some(TrackedValue::ObjectPtr {
            offset: offset.checked_add(displacement)?,
        }),
        TrackedValue::OutPtr if displacement == 0 => Some(TrackedValue::OutPtr),
        TrackedValue::OutPtr => None,
    }
}

fn track_add_sub(
    instruction: &Instruction,
    tracked: &HashMap<Register, TrackedValue>,
    is_add: bool,
) -> Option<TrackedValue> {
    let immediate = immediate_value(instruction)? as i64;

    match tracked.get(&normalize_register(instruction.op0_register())?)? {
        TrackedValue::ObjectPtr { offset } => {
            let next = if is_add {
                offset.checked_add(immediate)?
            } else {
                offset.checked_sub(immediate)?
            };
            Some(TrackedValue::ObjectPtr { offset: next })
        }
        TrackedValue::OutPtr => None,
    }
}

fn track_xor(instruction: &Instruction) -> Option<TrackedValue> {
    if instruction.op1_kind() != OpKind::Register {
        return None;
    }

    let lhs = normalize_register(instruction.op0_register())?;
    let rhs = normalize_register(instruction.op1_register())?;

    if lhs == rhs {
        return None;
    }

    None
}

fn record_offset(offset: usize, ordered: &mut Vec<FieldInfo>, unvisited: &mut Vec<FieldInfo>) {
    if let Some(pos) = unvisited
        .iter()
        .position(|field| field.get_offset() == offset)
    {
        ordered.push(unvisited.remove(pos));
    }
}

fn resolve_offset(base_offset: i64, displacement: u64) -> Option<usize> {
    let displacement = displacement as i64;
    let total = base_offset.checked_add(displacement)?;
    usize::try_from(total).ok()
}

fn normalize_register(register: Register) -> Option<Register> {
    if register.is_gpr() {
        Some(register.full_register())
    } else {
        None
    }
}

fn immediate_value(instruction: &Instruction) -> Option<u64> {
    Some(match instruction.op1_kind() {
        OpKind::Immediate8 | OpKind::Immediate8to16 | OpKind::Immediate8to32 => {
            instruction.immediate8to32() as u64
        }
        OpKind::Immediate8to64 => instruction.immediate8to64() as u64,
        OpKind::Immediate16 => instruction.immediate16() as u64,
        OpKind::Immediate32 => instruction.immediate32() as u64,
        OpKind::Immediate32to64 => instruction.immediate32to64() as u64,
        OpKind::Immediate64 => instruction.immediate64(),
        _ => return None,
    })
}

fn is_immediate(kind: OpKind) -> bool {
    matches!(
        kind,
        OpKind::Immediate8
            | OpKind::Immediate8to16
            | OpKind::Immediate8to32
            | OpKind::Immediate8to64
            | OpKind::Immediate16
            | OpKind::Immediate32
            | OpKind::Immediate32to64
            | OpKind::Immediate64
    )
}

fn tracked_key(tracked: &HashMap<Register, TrackedValue>) -> Vec<(Register, TrackedValue)> {
    let mut items = tracked
        .iter()
        .map(|(reg, value)| (*reg, *value))
        .collect::<Vec<_>>();
    items.sort_by_key(|(reg, _)| *reg as usize);
    items
}
