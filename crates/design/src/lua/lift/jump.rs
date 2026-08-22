use crate::lua::ast::*;
use crate::lua::decode::Insn;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn handle_jump(&mut self, i: usize, hi: usize, out: &mut Block) -> usize {
        let ins = self.insns[i];
        let target_pc = if ins.op == Op::JumpX {
            ins.jump_target_e()
        } else {
            ins.jump_target_d()
        };
        if self.loop_exit.last() == Some(&target_pc) {
            out.0.push(Stat::Break);
            return i + 1;
        }
        if self.loop_continue.last() == Some(&target_pc) {
            out.0.push(Stat::Continue);
            return i + 1;
        }
        let tgt_idx = self.idx_of_pc(target_pc);
        if tgt_idx != usize::MAX && tgt_idx > i + 1 {
            let skip_to = tgt_idx.min(hi);
            if !self.any_inbound_jump(i, i + 1, skip_to) {
                return skip_to;
            }
        }
        if tgt_idx >= hi || tgt_idx == i + 1 {
            return i + 1;
        }
        if tgt_idx <= i {
            self.partial = true;
            out.0.push(Stat::Comment(format!("[goto ->{target_pc}]")));
            return i + 1;
        }
        self.partial = true;
        out.0.push(Stat::Comment(format!("[jump ->{target_pc}]")));
        i + 1
    }

    pub(crate) fn jump_dest_idx(&self, ins: &Insn) -> Option<usize> {
        use Op::*;
        let pc = match ins.op {
            Jump | JumpBack | ForNPrep | ForNLoop | ForGPrep | ForGLoop | ForGPrepInext
            | ForGPrepNext | DepJumpIfEqK | DepJumpIfNotEqK => ins.jump_target_d(),
            JumpX => ins.jump_target_e(),
            FastCall | FastCall1 | FastCall2 | FastCall2K => ins.pc + 1 + ins.c() as usize,
            LoadB if ins.c() != 0 => ins.pc + 1 + ins.c() as usize,
            _ if ops::is_cond_jump(ins.op) => ins.jump_target_d(),
            _ => return None,
        };
        Some(self.idx_of_pc(pc))
    }

    pub(crate) fn next_reachable(&self, from: usize, hi: usize) -> usize {
        let mut k = from;
        while k < hi {
            if self.any_inbound_jump(usize::MAX, k, k + 1) {
                return k;
            }
            k += 1;
        }
        hi
    }

    pub(crate) fn any_inbound_jump(&self, exclude_idx: usize, lo: usize, hi: usize) -> bool {
        for (k, ins) in self.insns.iter().enumerate() {
            if k == exclude_idx || self.consumed_guard_jumps.contains(&k) {
                continue;
            }
            if let Some(t) = self.jump_dest_idx(ins)
                && t >= lo
                && t < hi
            {
                return true;
            }
        }
        false
    }

    pub(crate) fn handle_jumpback(&mut self, i: usize, _hi: usize, out: &mut Block) -> usize {
        let ins = self.insns[i];
        let target_pc = ins.jump_target_d();
        if self.loop_exit.last() == Some(&target_pc) {
            out.0.push(Stat::Continue);
        }
        i + 1
    }

    pub(crate) fn try_sandwich(&mut self, i: usize) -> Option<usize> {
        let cj = self.insns[i];
        if !ops::is_cond_jump(cj.op) {
            return None;
        }
        let lb1 = *self.insns.get(i + 1)?;
        if lb1.op != Op::LoadB || lb1.c() == 0 {
            return None;
        }
        let t = self.idx_of_pc(cj.jump_target_d());
        if t != i + 2 {
            return None;
        }
        let lb2 = *self.insns.get(t)?;
        if lb2.op != Op::LoadB || lb1.a() != lb2.a() {
            return None;
        }
        let d = lb1.a() as usize;
        let enter = self.cond_enter(&cj);
        let taken = ops::negate(enter.clone());
        let val = if lb2.b() != 0 { taken } else { enter };
        self.set_e(d, val);
        Some(t + 1)
    }
}
