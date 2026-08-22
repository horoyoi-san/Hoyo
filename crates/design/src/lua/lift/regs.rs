use crate::lua::ast::Expr;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn reads_of(&self, r: u8, from: usize) -> usize {
        let mut count = 0;
        for ins in &self.insns[from..] {
            for rr in ops::reg_reads(ins) {
                if rr == r {
                    count += 1;
                }
            }
            if ops::reg_writes(ins).contains(&r) {
                break;
            }
        }
        count
    }

    pub(crate) fn safe_to_inline(&self, r: u8, from: usize) -> bool {
        for ins in &self.insns[from.min(self.insns.len())..] {
            if ops::reg_reads(ins).contains(&r) {
                return true;
            }
            let effectful = matches!(
                ins.op,
                Op::Call
                    | Op::NameCall
                    | Op::SetGlobal
                    | Op::SetUpval
                    | Op::SetTable
                    | Op::SetTableN
                    | Op::SetTableKS
                    | Op::SetList
                    | Op::Return
                    | Op::Jump
                    | Op::JumpBack
                    | Op::JumpX
                    | Op::JumpIf
                    | Op::JumpIfNot
                    | Op::JumpIfEq
                    | Op::JumpIfLe
                    | Op::JumpIfLt
                    | Op::JumpIfNotEq
                    | Op::JumpIfNotLe
                    | Op::JumpIfNotLt
                    | Op::JumpXEqKNil
                    | Op::JumpXEqKB
                    | Op::JumpXEqKN
                    | Op::JumpXEqKS
                    | Op::ForNPrep
                    | Op::ForNLoop
                    | Op::ForGPrep
                    | Op::ForGPrepInext
                    | Op::ForGPrepNext
                    | Op::ForGLoop
            );
            if effectful {
                return false;
            }
            if ops::reg_writes(ins).contains(&r) {
                return false;
            }
        }
        false
    }

    pub(crate) fn collect_from(&mut self, start: u8, raw_count: u8) -> Vec<Expr> {
        let s = start as usize;
        if raw_count == 0 {
            let mp = self.multret_start.take().unwrap_or(s);
            let mut vals: Vec<Expr> = (s..mp).map(|r| self.get(r)).collect();
            vals.push(self.get(mp));
            vals
        } else {
            let n = (raw_count - 1) as usize;
            (0..n).map(|k| self.get(s + k)).collect()
        }
    }

    pub(crate) fn collect(&mut self, start: u8, raw_count: u8) -> Vec<Expr> {
        self.collect_from(start, raw_count)
    }

    pub(crate) fn collect_args_method(&mut self, a: usize, raw_b: u8) -> Vec<Expr> {
        if raw_b == 0 {
            let mp = self.multret_start.take().unwrap_or(a + 2);
            let mut vals: Vec<Expr> = ((a + 2)..mp).map(|r| self.get(r)).collect();
            vals.push(self.get(mp));
            vals
        } else {
            let n = (raw_b as usize).saturating_sub(2);
            (0..n).map(|k| self.get(a + 2 + k)).collect()
        }
    }
}
