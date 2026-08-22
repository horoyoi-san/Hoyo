use full_moon::ast::{self, Ast};
use full_moon::visitors::Visitor;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LuaSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone)]
pub struct LuaDiagnostic {
    pub line: u32,
    pub start_col: u32,
    pub end_col: u32,
    pub severity: LuaSeverity,
    pub message: String,
}

pub fn check(source: &str) -> Vec<LuaDiagnostic> {
    match full_moon::parse(source) {
        Ok(ast) => lint(&ast, source),
        Err(errors) => errors
            .into_iter()
            .flat_map(|err| error_to_diagnostic(&err, source))
            .collect(),
    }
}

fn error_to_diagnostic(err: &full_moon::Error, source: &str) -> Vec<LuaDiagnostic> {
    let (start, end) = err.range();
    let message = err.error_message().into_owned();

    let line = start.line().saturating_sub(1) as u32;
    let line_text = source.lines().nth(line as usize).unwrap_or("");
    let line_len = line_text.chars().count() as u32;

    let start_col = (start.character().saturating_sub(1) as u32).min(line_len);
    let end_col = if end.line() == start.line() {
        (end.character().saturating_sub(1) as u32).max(start_col + 1)
    } else {
        line_len
    }
    .max(start_col + 1);

    vec![LuaDiagnostic {
        line,
        start_col,
        end_col,
        severity: LuaSeverity::Error,
        message,
    }]
}

fn lint(ast: &Ast, _source: &str) -> Vec<LuaDiagnostic> {
    let mut visitor = ShadowDetector {
        diagnostics: Vec::new(),
    };
    visitor.visit_ast(ast);
    visitor.diagnostics
}

struct ShadowDetector {
    diagnostics: Vec<LuaDiagnostic>,
}

impl Visitor for ShadowDetector {
    fn visit_block(&mut self, block: &ast::Block) {
        let mut seen: Vec<String> = Vec::new();
        for (stmt, _) in block.stmts_with_semicolon() {
            if let ast::Stmt::LocalAssignment(local) = stmt {
                for name in local.names() {
                    let ident = name.token().to_string();
                    if seen.contains(&ident) {
                        let pos = name.token().start_position();
                        self.diagnostics.push(LuaDiagnostic {
                            line: pos.line().saturating_sub(1) as u32,
                            start_col: pos.character().saturating_sub(1) as u32,
                            end_col: pos.character().saturating_sub(1) as u32
                                + ident.chars().count() as u32,
                            severity: LuaSeverity::Warning,
                            message: format!(
                                "local `{ident}` shadows a previous `local` in the same scope"
                            ),
                        });
                    } else {
                        seen.push(ident);
                    }
                }
            }
        }
    }
}
