use super::net_packet::NetPacket;
use il2cpp::api::Il2CppArray;
use std::collections::VecDeque;
use std::sync::{LazyLock, Mutex};

type PendingRecv = (u16, Vec<u8>);
static PENDING_RECV: LazyLock<Mutex<VecDeque<PendingRecv>>> =
    LazyLock::new(|| Mutex::new(VecDeque::new()));

const PENDING_RECV_CAP: usize = 256;
type Injecting = (Vec<u8>, usize);
static INJECTING: LazyLock<Mutex<Option<Injecting>>> = LazyLock::new(|| Mutex::new(None));

pub fn injection_in_progress() -> bool {
    INJECTING.lock().unwrap().is_some()
}

fn serve_injection(dest: &mut [u8], max: usize, start: bool) -> usize {
    let mut guard = INJECTING.lock().unwrap();
    if guard.is_none() {
        if !start {
            return 0;
        }
        let Some((cmd_id, body)) = PENDING_RECV.lock().unwrap().pop_front() else {
            return 0;
        };
        let header: Vec<u8> = vec![];
        let packet = NetPacket {
            head_magic: 0x9D74C714,
            cmd_id,
            head_len: 0,
            body_len: body.len() as u32,
            header: &header,
            body: &body,
            tail_magic: 0xD7A152C8,
        };
        *guard = Some((packet.serialize(), 0));
    }

    let (buf, cursor) = guard.as_mut().unwrap();
    let n = max.min(dest.len()).min(buf.len() - *cursor);
    dest[..n].copy_from_slice(&buf[*cursor..*cursor + n]);
    *cursor += n;
    if *cursor >= buf.len() {
        *guard = None;
    }
    n
}

pub fn serve_custom_recv(array_ptr: u64, offset: i32, count: i32, start: bool) -> Option<usize> {
    if array_ptr == 0 || count <= 0 {
        return None;
    }
    let mut dest = Il2CppArray(array_ptr as usize);
    let o = offset as usize;
    let len = dest.len();
    if o >= len {
        return None;
    }
    let end = (o + count as usize).min(len);
    let slice = &mut dest.as_mut_slice::<u8>()[o..end];
    let n = serve_injection(slice, count as usize, start);
    (n > 0).then_some(n)
}

pub fn recv_custom_packet(cmd_id: u16, body: &[u8]) -> anyhow::Result<()> {
    let mut queue = PENDING_RECV.lock().unwrap();
    if queue.len() >= PENDING_RECV_CAP {
        queue.pop_front();
    }
    queue.push_back((cmd_id, body.to_vec()));
    Ok(())
}
