use crate::lua::ast::*;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn try_loop(&mut self, i: usize, hi: usize, out: &mut Block) -> Option<usize> {
        let j = *self.loop_headers.get(&i)?;
        if j >= hi {
            return None;
        }
        let back = self.insns[j];
        let after_idx = j + 1;
        let after_pc = self
            .insns
            .get(after_idx)
            .map_or(usize::MAX, |x| x.pc);

        if ops::is_cond_jump(back.op) {
            self.materialize_tables_in(i, j, out);
            let (phis, newly) = self.begin_phi(&[(i, j)], &[i, after_idx], &[], true, out);
            self.loop_exit.push(after_pc);
            self.loop_continue
                .push(self.insns.get(i).map_or(0, |x| x.pc));
            self.merge_stack.push(usize::MAX);
            let mut body = self.block(i, j);
            let until = ops::negate(self.cond_enter(&back));
            self.merge_stack.pop();
            self.loop_continue.pop();
            self.loop_exit.pop();
            self.capture_phis(&phis, &mut body);
            self.end_phi(&phis, newly);
            out.0.push(Stat::Repeat(body, until));
            return Some(after_idx);
        }

        let mut body_lo = i;
        let mut cond_idxs = Vec::new();
        loop {
            let h = self.insns[body_lo];
            if ops::is_cond_jump(h.op) && self.idx_of_pc(h.jump_target_d()) >= after_idx {
                cond_idxs.push(body_lo);
                body_lo += 1;
            } else {
                break;
            }
        }
        self.materialize_tables_in(body_lo, j, out);
        let (phis, newly) = self.begin_phi(&[(body_lo, j)], &[i, after_idx], &[], true, out);
        let mut cond = None;
        for &ci in &cond_idxs {
            let c = self.cond_enter(&self.insns[ci]);
            cond = Some(match cond {
                None => c,
                Some(prev) => Expr::Bin(BinOp::And, Box::new(prev), Box::new(c)),
            });
        }
        let cond = cond.unwrap_or(Expr::Bool(true));
        self.loop_exit.push(after_pc);
        self.loop_continue
            .push(self.insns.get(i).map_or(0, |x| x.pc));
        self.merge_stack.push(usize::MAX);
        let mut body = self.block(body_lo, j);
        self.merge_stack.pop();
        self.loop_continue.pop();
        self.loop_exit.pop();
        self.capture_phis(&phis, &mut body);
        self.end_phi(&phis, newly);
        out.0.push(Stat::While(cond, body));
        Some(after_idx)
    }

    pub(crate) fn num_for(&mut self, i: usize, _hi: usize, out: &mut Block) -> usize {
        let ins = self.insns[i];
        let a = ins.a() as usize;
        let limit = self.get(a);
        let step = self.get(a + 1);
        let start = self.get(a + 2);
        let body_start_pc = if let Some(x) = self.insns.get(i + 1) { x.pc } else {
            self.partial = true;
            out.0.push(Stat::Comment("[for-num: unstructured]".into()));
            return i + 1;
        };
        let hint = self.idx_of_pc(ins.jump_target_d());
        let scan_hi = if hint != usize::MAX && hint > i {
            hint
        } else {
            self.insns.len()
        };
        let Some(fornloop_idx) = (i + 1..scan_hi).find(|&k| {
            self.insns[k].op == Op::ForNLoop && self.insns[k].jump_target_d() == body_start_pc
        }) else {
            self.partial = true;
            out.0.push(Stat::Comment("[for-num: unstructured]".into()));
            return i + 1;
        };
        let target_pc = ins.jump_target_d();
        let var = format!("i{}", a + 2);
        self.set_e(a + 2, Expr::Name(var.clone()));
        let body_lo = i + 1;
        let body_hi = fornloop_idx;
        let loop_end_idx = fornloop_idx + 1;
        let excl = [a as u8, (a + 1) as u8, (a + 2) as u8];
        self.materialize_tables_in(body_lo, body_hi, out);
        let (phis, newly) = self.begin_phi(
            &[(body_lo, body_hi)],
            &[body_lo, loop_end_idx],
            &excl,
            true,
            out,
        );
        self.loop_exit.push(target_pc);
        self.loop_continue.push(
            self.insns
                .get(fornloop_idx)
                .map_or(target_pc, |x| x.pc),
        );
        self.merge_stack.push(usize::MAX);
        let saved = self.regs.clone();
        let mut body = self.block(body_lo, body_hi);
        self.merge_stack.pop();
        self.loop_continue.pop();
        self.loop_exit.pop();
        self.capture_phis(&phis, &mut body);
        self.regs = saved;
        self.end_phi(&phis, newly);
        let step_opt = match &step {
            Expr::Num(n) if *n == 1.0 => None,
            _ => Some(step),
        };
        out.0.push(Stat::NumFor {
            var,
            start,
            stop: limit,
            step: step_opt,
            body,
        });
        loop_end_idx
    }

    pub(crate) fn gen_for(&mut self, i: usize, _hi: usize, out: &mut Block) -> usize {
        let ins = self.insns[i];
        let a = ins.a() as usize;
        let r#gen = self.get(a);
        let state = self.get(a + 1);
        let ctrl = self.get(a + 2);
        let target_pc = ins.jump_target_d();
        let loop_end_idx = self.idx_of_pc(target_pc);
        if loop_end_idx == usize::MAX || loop_end_idx <= i {
            self.partial = true;
            out.0.push(Stat::Comment("[for-in: unstructured]".into()));
            return i + 1;
        }
        let forgloop = self.insns[loop_end_idx];
        let nvars = (forgloop.aux & 0xff).max(1) as usize;
        let vars: Vec<String> = (0..nvars).map(|k| format!("k{}", a + 3 + k)).collect();
        for (k, v) in vars.iter().enumerate() {
            self.set_e(a + 3 + k, Expr::Name(v.clone()));
        }
        let iters = crate::lua::lift::ops::build_iter_list(r#gen, state, ctrl);
        let after_idx = loop_end_idx + 1;
        let excl: Vec<u8> = (a..=a + 2 + nvars).map(|r| r as u8).collect();
        self.materialize_tables_in(i + 1, loop_end_idx, out);
        let (phis, newly) = self.begin_phi(
            &[(i + 1, loop_end_idx)],
            &[i + 1, after_idx],
            &excl,
            true,
            out,
        );
        self.loop_exit
            .push(self.insns.get(after_idx).map_or(target_pc, |x| x.pc));
        self.loop_continue.push(target_pc);
        self.merge_stack.push(usize::MAX);
        let saved = self.regs.clone();
        let mut body = self.block(i + 1, loop_end_idx);
        self.merge_stack.pop();
        self.loop_continue.pop();
        self.loop_exit.pop();
        self.capture_phis(&phis, &mut body);
        self.regs = saved;
        self.end_phi(&phis, newly);
        out.0.push(Stat::GenFor { vars, iters, body });
        after_idx
    }
}
