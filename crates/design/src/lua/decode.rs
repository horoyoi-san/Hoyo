use crate::lua::opcodes::{self, Op};

#[derive(Clone, Copy)]
pub struct Insn {
    pub pc: usize,
    pub op: Op,
    pub raw: u32,
    pub aux: u32,
    #[allow(dead_code)]
    pub len: usize,
}

impl Insn {
    pub fn a(&self) -> u8 {
        opcodes::a(self.raw)
    }
    pub fn b(&self) -> u8 {
        opcodes::b(self.raw)
    }
    pub fn c(&self) -> u8 {
        opcodes::c(self.raw)
    }
    pub fn d(&self) -> i32 {
        opcodes::d(self.raw)
    }
    pub fn e(&self) -> i32 {
        opcodes::e(self.raw)
    }
    pub fn jump_target_d(&self) -> usize {
        (self.pc as i64 + 1 + self.d() as i64) as usize
    }
    pub fn jump_target_e(&self) -> usize {
        (self.pc as i64 + 1 + self.e() as i64) as usize
    }
}

pub fn decode(code: &[u32]) -> (Vec<Insn>, Vec<usize>) {
    let mut insns = Vec::new();
    let mut pc_to_idx = vec![usize::MAX; code.len() + 1];
    let mut pc = 0usize;
    while pc < code.len() {
        let raw = code[pc];
        let op = Op::decode(opcodes::op_byte(raw));
        let len = op.length();
        let aux = if len == 2 && pc + 1 < code.len() {
            code[pc + 1]
        } else {
            0
        };
        pc_to_idx[pc] = insns.len();
        insns.push(Insn { pc, op, raw, aux, len });
        pc += len.max(1);
    }
    (insns, pc_to_idx)
}
