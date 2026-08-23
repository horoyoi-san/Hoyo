#[inline]
pub fn op_byte(insn: u32) -> u8 { (insn & 0xff) as u8 }

#[inline]
pub fn a(insn: u32) -> u8 { ((insn >> 8) & 0xff) as u8 }

#[inline]
pub fn b(insn: u32) -> u8 { ((insn >> 16) & 0xff) as u8 }

#[inline]
pub fn c(insn: u32) -> u8 { ((insn >> 24) & 0xff) as u8 }

#[inline]
pub fn d(insn: u32) -> i32 { (insn as i32) >> 16 }

#[inline]
pub fn e(insn: u32) -> i32 { (insn as i32) >> 8 }
