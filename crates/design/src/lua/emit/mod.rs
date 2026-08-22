mod stmt;
mod expr;

use crate::lua::ast::*;

pub use expr::field_or_index;

const LUA_KEYWORDS: &[&str] = &[
    "and", "break", "do", "else", "elseif", "end", "false", "for", "function", "if", "in",
    "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while", "continue",
];

fn is_ident(s: &str) -> bool {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) if c == '_' || c.is_ascii_alphabetic() => {}
        _ => return false,
    }
    if !chars.all(|c| c == '_' || c.is_ascii_alphanumeric()) {
        return false;
    }
    !LUA_KEYWORDS.contains(&s)
}

pub struct Printer<'a> {
    pub(crate) funcs: &'a [DecFunc],
    pub(crate) out: String,
    pub(crate) indent: usize,
}

impl<'a> Printer<'a> {
    pub fn new(funcs: &'a [DecFunc]) -> Self {
        Printer { funcs, out: String::new(), indent: 0 }
    }

    pub fn print_chunk(mut self, main_proto: usize) -> String {
        if let Some(f) = self.funcs.iter().find(|f| f.proto == main_proto) {
            self.block(&f.body);
        }
        self.out
    }

    pub(crate) fn pad(&mut self) {
        for _ in 0..self.indent {
            self.out.push('\t');
        }
    }

    pub(crate) fn block(&mut self, b: &Block) {
        for s in &b.0 {
            self.stat(s);
        }
    }

    pub(crate) fn func_by_proto(&self, proto: usize) -> Option<&'a DecFunc> {
        self.funcs.iter().find(|f| f.proto == proto)
    }
}
