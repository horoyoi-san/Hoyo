#![allow(dead_code)]

mod error;
mod kcp;

pub use error::Error;
pub use kcp::Kcp;

/// KCP result
pub type KcpResult<T> = Result<T, Error>;
