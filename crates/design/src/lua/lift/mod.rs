mod lifter;
mod block;
mod regs;
mod exec;
mod tables;
mod phi;
mod loops;
mod jump;
mod value;
mod cond;
mod recover;
mod ops;

use crate::lua::ast::DecFunc;
use crate::lua::bytecode::Module;
pub use lifter::Lifter;

pub fn decompile_module(m: &Module) -> Vec<DecFunc> {
    (0..m.protos.len()).map(|i| Lifter::new(m, i).run()).collect()
}
