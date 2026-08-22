#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    FloorDiv,
    Mod,
    Pow,
    Concat,
    Eq,
    Ne,
    Lt,
    Le,
    Gt,
    Ge,
    And,
    Or,
    Band,
    Bor,
}

impl BinOp {
    pub fn symbol(self) -> &'static str {
        match self {
            BinOp::Add => "+",
            BinOp::Sub => "-",
            BinOp::Mul => "*",
            BinOp::Div => "/",
            BinOp::FloorDiv => "//",
            BinOp::Mod => "%",
            BinOp::Pow => "^",
            BinOp::Concat => "..",
            BinOp::Eq => "==",
            BinOp::Ne => "~=",
            BinOp::Lt => "<",
            BinOp::Le => "<=",
            BinOp::Gt => ">",
            BinOp::Ge => ">=",
            BinOp::And => "and",
            BinOp::Or => "or",
            BinOp::Band => "&",
            BinOp::Bor => "|",
        }
    }

    pub fn prio(self) -> (u8, u8) {
        match self {
            BinOp::Or => (1, 1),
            BinOp::And => (2, 2),
            BinOp::Eq | BinOp::Ne | BinOp::Lt | BinOp::Le | BinOp::Gt | BinOp::Ge => (3, 3),
            BinOp::Bor => (4, 4),
            BinOp::Band => (5, 5),
            BinOp::Concat => (9, 8),
            BinOp::Add | BinOp::Sub => (10, 10),
            BinOp::Mul | BinOp::Div | BinOp::FloorDiv | BinOp::Mod => (11, 11),
            BinOp::Pow => (14, 13),
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum UnOp {
    Neg,
    Not,
    Len,
}

impl UnOp {
    pub fn symbol(self) -> &'static str {
        match self {
            UnOp::Neg => "-",
            UnOp::Not => "not ",
            UnOp::Len => "#",
        }
    }
}

pub const UNARY_PRIO: u8 = 12;

#[derive(Clone, Debug, PartialEq)]
pub enum Expr {
    Nil,
    Bool(bool),
    Num(f64),
    Str(Vec<u8>),
    Vararg,
    Name(String),
    Upval(usize),
    Index(Box<Expr>, Box<Expr>),
    Field(Box<Expr>, String),
    Call(Box<Expr>, Vec<Expr>),
    MethodCall(Box<Expr>, String, Vec<Expr>),
    Table(Vec<Item>),
    Bin(BinOp, Box<Expr>, Box<Expr>),
    Un(UnOp, Box<Expr>),
    Closure(usize),
    IfElse(Box<Expr>, Box<Expr>, Box<Expr>),
    #[allow(dead_code)]
    Paren(Box<Expr>),
    Raw(String),
}

#[derive(Clone, Debug, PartialEq)]
pub enum Item {
    Pos(Expr),
    Keyed(Expr, Expr),
    Named(String, Expr),
}

#[derive(Clone, Debug, Default)]
pub struct Block(pub Vec<Stat>);
#[derive(Clone, Debug)]
pub struct DecFunc {
    pub proto: usize,
    #[allow(dead_code)]
    pub name: Option<String>,
    pub params: Vec<String>,
    pub is_vararg: bool,
    #[allow(dead_code)]
    pub upval_names: Vec<String>,
    pub body: Block,
    pub partial: bool,
}

#[derive(Clone, Debug)]
pub enum Stat {
    Local(Vec<String>, Vec<Expr>),
    Assign(Vec<Expr>, Vec<Expr>),
    ExprCall(Expr),
    #[allow(dead_code)]
    Do(Block),
    While(Expr, Block),
    Repeat(Block, Expr),
    NumFor {
        var: String,
        start: Expr,
        stop: Expr,
        step: Option<Expr>,
        body: Block,
    },
    GenFor {
        vars: Vec<String>,
        iters: Vec<Expr>,
        body: Block,
    },
    If(Vec<(Expr, Block)>, Option<Block>),
    Return(Vec<Expr>),
    Break,
    Continue,
    Comment(String),
}
