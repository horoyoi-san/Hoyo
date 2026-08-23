use std::sync::{
    LazyLock, Mutex,
    atomic::{AtomicBool, AtomicU64, Ordering},
};

use il2cpp::{get_cached_class, vm::array::Il2CppArray};

use super::{encrypt, handlers::PACKET_ORDER, net_packet::NetPacket};

type SendFunc = extern "win64" fn(u64, u64, i32, i32);

static ORIGINAL_SEND_FUNC: LazyLock<Mutex<Option<SendFunc>>> = LazyLock::new(|| Mutex::new(None));
static SEND_CONTEXT: AtomicU64 = AtomicU64::new(0);
static SENDING_CUSTOM_PACKET: AtomicBool = AtomicBool::new(false);

pub fn init_send_func(send_addr: usize) {
    // SAFETY: send_addr is the resolved address of the game's send method,
    // whose calling convention and parameters match `SendFunc`.
    let func: SendFunc = unsafe { std::mem::transmute(send_addr) };
    *ORIGINAL_SEND_FUNC.lock().unwrap_or_else(|e| e.into_inner()) = Some(func);
}

pub fn is_sending_custom_packet() -> bool {
    SENDING_CUSTOM_PACKET.load(Ordering::SeqCst)
}

pub fn update_send_context(ctx: u64) {
    SEND_CONTEXT.store(ctx, Ordering::SeqCst);
}

pub fn send_custom_packet(cmd_id: u16, body: &[u8]) -> anyhow::Result<()> {
    let result = microseh::try_seh(|| send_custom_packet_inner(cmd_id, body));
    SENDING_CUSTOM_PACKET.store(false, Ordering::SeqCst);

    result.map_err(|error| {
        anyhow::anyhow!(
            "SEH exception while sending custom packet cmd_id={cmd_id}: code={:?}",
            error.code()
        )
    })?
}

fn send_custom_packet_inner(cmd_id: u16, body: &[u8]) -> anyhow::Result<()> {
    let send_func = ORIGINAL_SEND_FUNC
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .ok_or_else(|| anyhow::anyhow!("Send function not initialized"))?;

    let header: Vec<u8> = vec![];

    let packet = NetPacket {
        head_magic: 0x9D74C714,
        cmd_id,
        head_len: 0,
        body_len: body.len() as u32,
        header: &header,
        body,
        tail_magic: 0xD7A152C8,
    };

    let mut serialized = packet.serialize();

    encrypt::dump_current_key();
    let seq_id = PACKET_ORDER.fetch_add(1, Ordering::SeqCst);
    encrypt::xor_packet(serialized.as_mut_slice(), seq_id);

    let Some(byte_class) = get_cached_class("System.Byte") else {
        anyhow::bail!("System.Byte class not cached");
    };
    let mut array = Il2CppArray::new(byte_class.get_array_class(1), serialized.len());
    array.as_mut_slice().copy_from_slice(&serialized);

    SENDING_CUSTOM_PACKET.store(true, Ordering::SeqCst);
    send_func(
        SEND_CONTEXT.load(Ordering::SeqCst),
        array.0 as u64,
        0,
        serialized.len() as i32,
    );

    Ok(())
}
