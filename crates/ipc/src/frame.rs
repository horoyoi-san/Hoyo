use std::io::{Read, Write};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

pub fn write_json_frame<W, T>(writer: &mut W, value: &T) -> Result<()>
where
    W: Write,
    T: Serialize,
{
    let payload = serde_json::to_vec(value)?;
    write_frame(writer, &payload)
}

pub fn read_json_frame<R, T>(reader: &mut R) -> Result<T>
where
    R: Read,
    T: for<'de> Deserialize<'de>,
{
    let payload = read_frame(reader)?;
    Ok(serde_json::from_slice(&payload)?)
}

pub fn write_frame<W>(writer: &mut W, payload: &[u8]) -> Result<()>
where
    W: Write,
{
    let len = u32::try_from(payload.len()).context("ipc frame too large")?;
    writer.write_all(&len.to_le_bytes())?;
    writer.write_all(payload)?;
    writer.flush()?;
    Ok(())
}

pub fn read_frame<R>(reader: &mut R) -> Result<Vec<u8>>
where
    R: Read,
{
    let mut len = [0; 4];
    reader.read_exact(&mut len)?;

    let mut payload = vec![0; u32::from_le_bytes(len) as usize];
    reader.read_exact(&mut payload)?;
    Ok(payload)
}
