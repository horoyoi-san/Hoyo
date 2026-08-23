use crate::lua::ast::*;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn try_logical(&mut self, i: usize, hi: usize) -> Option<usize> {
        let start = self.insns[i];
        if !ops::is_cond_jump(start.op) { return None; }
        let mut m = self.idx_of_pc(start.jump_target_d());
        if m == usize::MAX || m <= i || m > hi { return None; }
        loop {
            let mut changed = false;
            let mut k = i;
            while k < m {
                let ins = self.insns[k];
                if !ops::is_pure_value_op(ins.op) { return None; }
                if ops::is_cond_jump(ins.op) || ins.op == Op::Jump {
                    let t = self.idx_of_pc(ins.jump_target_d());
                    if t == usize::MAX || t <= i { return None; }
                    if t > m {
                        if t > hi { return None; }
                        m = t;
                        changed = true;
                        break;
                    }
                }
                k += 1;
            }
            if !changed { break; }
        }
        let mut d = None;
        for k in (i..m).rev() {
            if let Some(r) = ops::reg_writes(&self.insns[k]).first().copied() {
                d = Some(r as usize);
                break;
            }
        }
        let d = d?;
        for k in i..m {
            for w in ops::reg_writes(&self.insns[k]) {
                if w as usize != d && (self.reads_of(w, m) >= 1 || self.promote.contains(&w)) {
                    return None;
                }
            }
        }
        let saved_regs = self.regs.clone();
        let d_entry = self.get(d);
        let saved_promote = std::mem::take(&mut self.promote);
        let val = self.rebuild(i, m, d, 0);
        self.promote = saved_promote;
        self.regs = saved_regs;
        let val = val?;
        if ops::expr_has_call(&d_entry) && ops::expr_contains(&val, &d_entry) { return None; }
        if ops::expr_has_call(&val) && self.reads_of(d as u8, m) > 1 { return None; }
        self.set_e(d, val);
        Some(m)
    }

    pub(crate) fn rebuild(&mut self, lo: usize, hi: usize, d: usize, depth: u32) -> Option<Expr> {
        if depth > 96 || lo > hi { return None; }
        let mut j = lo;
        while j < hi {
            let op = self.insns[j].op;
            if ops::is_cond_jump(op) || op == Op::Jump || (op == Op::LoadB && self.insns[j].c() != 0) {
                break;
            }
            j += 1;
        }
        if j >= hi {
            self.exec_pure_range(lo, hi);
            return Some(self.get(d));
        }
        self.exec_pure_range(lo, j);
        let ins = self.insns[j];
        if ins.op == Op::Jump {
            let t = self.idx_of_pc(ins.jump_target_d());
            if t == usize::MAX || t <= j || t > hi { return None; }
            return self.rebuild(t, hi, d, depth + 1);
        }
        if ins.op == Op::LoadB {
            let mut scratch = Block::default();
            self.exec(&ins, &mut scratch);
            let t = self.idx_of_pc(ins.pc + 1 + ins.c() as usize);
            if t == usize::MAX || t <= j || t > hi { return None; }
            return self.rebuild(t, hi, d, depth + 1);
        }
        let t = self.idx_of_pc(ins.jump_target_d());
        if t == usize::MAX || t <= j || t > hi { return None; }
        let taken_pred = ops::negate(self.cond_enter(&ins));
        let saved = self.regs.clone();
        let taken_val = self.rebuild(t, hi, d, depth + 1)?;
        self.regs = saved.clone();
        let fall_val = self.rebuild(j + 1, hi, d, depth + 1)?;
        self.regs = saved;
        Some(ops::ite_value(taken_pred, taken_val, fall_val))
    }

    pub(crate) fn exec_pure_range(&mut self, lo: usize, hi: usize) {
        let mut scratch = Block::default();
        let mut k = lo;
        while k < hi {
            let ins = self.insns[k];
            if !(ops::is_cond_jump(ins.op) || ins.op == Op::Jump) {
                self.exec(&ins, &mut scratch);
            }
            k += 1;
        }
    }
}
