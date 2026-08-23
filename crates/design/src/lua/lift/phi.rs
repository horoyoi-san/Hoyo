use crate::lua::ast::*;
use crate::lua::decode::Insn;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn phi_regs(&self, ranges: &[(usize, usize)], read_from: &[usize]) -> Vec<u8> {
        let mut written = std::collections::HashSet::new();
        for &(lo, hi) in ranges {
            for k in lo..hi.min(self.insns.len()) {
                for w in ops::reg_writes(&self.insns[k]) { written.insert(w); }
            }
        }
        let mut out: Vec<u8> = written.into_iter()
            .filter(|&r| r >= self.p.num_params)
            .filter(|&r| read_from.iter().any(|&p| self.has_live_read_from(r, p)))
            .collect();
        out.sort_unstable();
        out
    }

    fn has_live_read_from(&self, r: u8, from: usize) -> bool {
        for k in from..self.insns.len() {
            let ins = self.insns[k];
            if ops::reg_reads(&ins).contains(&r) { return true; }
            if ops::reg_writes(&ins).contains(&r) || self.loop_binds_reg(&ins, r) { return false; }
        }
        false
    }

    fn loop_binds_reg(&self, ins: &Insn, r: u8) -> bool {
        let a = ins.a();
        match ins.op {
            Op::ForNPrep => r >= a && r <= a + 2,
            Op::ForGPrep | Op::ForGPrepNext | Op::ForGPrepInext => {
                let tgt = self.idx_of_pc(ins.jump_target_d());
                let nvars = self.insns.get(tgt)
                    .map_or(1, |f| (f.aux & 0xff).max(1)) as u8;
                r >= a && r <= a.saturating_add(2 + nvars)
            }
            _ => false,
        }
    }

    pub(crate) fn begin_phi(
        &mut self, ranges: &[(usize, usize)], read_from: &[usize],
        exclude: &[u8], loop_header: bool, out: &mut Block,
    ) -> (Vec<u8>, Vec<u8>) {
        let mut phis = self.phi_regs(ranges, read_from);
        phis.retain(|r| !exclude.contains(r));
        let mut newly = Vec::new();
        for &r in &phis {
            if !self.promote.insert(r) { continue; }
            newly.push(r);
            let preval = self.get(r as usize);
            let stale = loop_header && crate::lua::lift::ops::mentions_loopvar(&preval);
            let init = match &preval {
                Expr::Name(s) if *s == format!("r{r}") => vec![],
                _ if stale => vec![],
                _ => vec![preval],
            };
            out.0.push(Stat::Local(vec![format!("L{r}")], init));
            self.set_e(r as usize, Expr::Name(format!("L{r}")));
        }
        (phis, newly)
    }

    pub(crate) fn end_phi(&mut self, phis: &[u8], newly: Vec<u8>) {
        for &r in phis { self.set_e(r as usize, Expr::Name(format!("L{r}"))); }
        for r in newly { self.promote.remove(&r); }
    }

    pub(crate) fn capture_phis(&mut self, phis: &[u8], block: &mut Block) {
        if matches!(block.0.last(), Some(Stat::Return(_)) | Some(Stat::Break) | Some(Stat::Continue)) {
            return;
        }
        for &r in phis {
            let lname = format!("L{r}");
            let cur = self.get(r as usize);
            if !matches!(&cur, Expr::Name(n) if *n == lname) {
                block.0.push(Stat::Assign(vec![Expr::Name(lname.clone())], vec![cur]));
                self.set_e(r as usize, Expr::Name(lname));
            }
        }
    }
}
