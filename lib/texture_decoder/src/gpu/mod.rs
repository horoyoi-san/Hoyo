#![allow(dead_code)]
use std::cell::RefCell;

use ocl::{flags::MemFlags, Buffer, Context, Device, Kernel, Platform, Program, Queue};

thread_local! {
    static GPU_STATE: RefCell<Option<GpuState>> = const { RefCell::new(None) };
}

#[derive(Debug)]
#[expect(unused)]
pub enum GpuError {
    Init(String),
    Build(String),
    Exec(String),
}

struct GpuState {
    queue: Queue,
    r8_kernel: Kernel,
    dxt5_kernel: Kernel,
    r8_input: Buffer<u8>,
    r8_output: Buffer<u8>,
    r8_input_len: usize,
    r8_output_len: usize,
    dxt5_input: Buffer<u8>,
    dxt5_output: Buffer<u8>,
    dxt5_input_len: usize,
    dxt5_output_len: usize,
}

pub fn decode_r8_gpu(
    data: &[u8],
    width: usize,
    height: usize,
    output: &mut [u8],
) -> Result<(), GpuError> {
    let total_pixels = width * height;
    let output_len = total_pixels * 4;
    if output.len() < output_len {
        return Err(GpuError::Exec("output buffer too small".to_string()));
    }
    if data.len() < total_pixels {
        return Err(GpuError::Exec("not enough data".to_string()));
    }

    GPU_STATE.with(|state_cell| {
        let mut state_opt = state_cell.borrow_mut();
        if state_opt.is_none() {
            *state_opt = Some(init_gpu()?);
        }

        let state = state_opt
            .as_mut()
            .ok_or_else(|| GpuError::Init("gpu state unavailable".to_string()))?;

        if data.len() > state.r8_input_len {
            state.r8_input = Buffer::<u8>::builder()
                .queue(state.queue.clone())
                .flags(MemFlags::READ_ONLY)
                .len(data.len())
                .build()
                .map_err(|e| GpuError::Exec(format!("r8 input buffer alloc: {e}")))?;
            state.r8_input_len = data.len();
        }

        if output_len > state.r8_output_len {
            state.r8_output = Buffer::<u8>::builder()
                .queue(state.queue.clone())
                .flags(MemFlags::WRITE_ONLY)
                .len(output_len)
                .build()
                .map_err(|e| GpuError::Exec(format!("r8 output buffer alloc: {e}")))?;
            state.r8_output_len = output_len;
        }

        state
            .r8_input
            .write(data)
            .enq()
            .map_err(|e| GpuError::Exec(format!("r8 input write: {e}")))?;

        let width_u = width as u32;
        let height_u = height as u32;

        unsafe {
            state
                .r8_kernel
                .set_arg(0, &state.r8_input)
                .map_err(|e| GpuError::Exec(format!("r8 set arg0: {e}")))?;
            state
                .r8_kernel
                .set_arg(1, &state.r8_output)
                .map_err(|e| GpuError::Exec(format!("r8 set arg1: {e}")))?;
            state
                .r8_kernel
                .set_arg(2, width_u)
                .map_err(|e| GpuError::Exec(format!("r8 set arg2: {e}")))?;
            state
                .r8_kernel
                .set_arg(3, height_u)
                .map_err(|e| GpuError::Exec(format!("r8 set arg3: {e}")))?;

            state
                .r8_kernel
                .set_default_global_work_size(ocl::SpatialDims::One(total_pixels));
            state
                .r8_kernel
                .enq()
                .map_err(|e| GpuError::Exec(format!("r8 enqueue kernel: {e}")))?;
        }

        state
            .r8_output
            .read(&mut output[..output_len])
            .enq()
            .map_err(|e| GpuError::Exec(format!("r8 output read: {e}")))?;
        state
            .queue
            .finish()
            .map_err(|e| GpuError::Exec(format!("r8 queue finish: {e}")))?;

        Ok(())
    })
}

pub fn decode_dxt5_gpu(
    data: &[u8],
    width: usize,
    height: usize,
    output: &mut [u8],
) -> Result<(), GpuError> {
    let total_pixels = width * height;
    let output_len = total_pixels * 4;
    if output.len() < output_len {
        return Err(GpuError::Exec("output buffer too small".to_string()));
    }

    let total_blocks = width.div_ceil(4) * height.div_ceil(4);
    if data.len() < total_blocks * 16 {
        return Err(GpuError::Exec("not enough data".to_string()));
    }

    GPU_STATE.with(|state_cell| {
        let mut state_opt = state_cell.borrow_mut();
        if state_opt.is_none() {
            *state_opt = Some(init_gpu()?);
        }

        let state = state_opt
            .as_mut()
            .ok_or_else(|| GpuError::Init("gpu state unavailable".to_string()))?;

        if data.len() > state.dxt5_input_len {
            state.dxt5_input = Buffer::<u8>::builder()
                .queue(state.queue.clone())
                .flags(MemFlags::READ_ONLY)
                .len(data.len())
                .build()
                .map_err(|e| GpuError::Exec(format!("dxt5 input buffer alloc: {e}")))?;
            state.dxt5_input_len = data.len();
        }

        if output_len > state.dxt5_output_len {
            state.dxt5_output = Buffer::<u8>::builder()
                .queue(state.queue.clone())
                .flags(MemFlags::WRITE_ONLY)
                .len(output_len)
                .build()
                .map_err(|e| GpuError::Exec(format!("dxt5 output buffer alloc: {e}")))?;
            state.dxt5_output_len = output_len;
        }

        state
            .dxt5_input
            .write(data)
            .enq()
            .map_err(|e| GpuError::Exec(format!("dxt5 input write: {e}")))?;

        let blocks_x = width.div_ceil(4) as u32;
        let width_u = width as u32;
        let height_u = height as u32;

        unsafe {
            state
                .dxt5_kernel
                .set_arg(0, &state.dxt5_input)
                .map_err(|e| GpuError::Exec(format!("dxt5 set arg0: {e}")))?;
            state
                .dxt5_kernel
                .set_arg(1, &state.dxt5_output)
                .map_err(|e| GpuError::Exec(format!("dxt5 set arg1: {e}")))?;
            state
                .dxt5_kernel
                .set_arg(2, width_u)
                .map_err(|e| GpuError::Exec(format!("dxt5 set arg2: {e}")))?;
            state
                .dxt5_kernel
                .set_arg(3, height_u)
                .map_err(|e| GpuError::Exec(format!("dxt5 set arg3: {e}")))?;
            state
                .dxt5_kernel
                .set_arg(4, blocks_x)
                .map_err(|e| GpuError::Exec(format!("dxt5 set arg4: {e}")))?;

            state
                .dxt5_kernel
                .set_default_global_work_size(ocl::SpatialDims::One(total_blocks));
            state
                .dxt5_kernel
                .enq()
                .map_err(|e| GpuError::Exec(format!("dxt5 enqueue kernel: {e}")))?;
        }

        state
            .dxt5_output
            .read(&mut output[..output_len])
            .enq()
            .map_err(|e| GpuError::Exec(format!("dxt5 output read: {e}")))?;
        state
            .queue
            .finish()
            .map_err(|e| GpuError::Exec(format!("dxt5 queue finish: {e}")))?;

        Ok(())
    })
}

fn init_gpu() -> Result<GpuState, GpuError> {
    let platform = Platform::default();
    let device = Device::first(platform).map_err(|e| GpuError::Init(format!("device: {e}")))?;

    let context = Context::builder()
        .platform(platform)
        .devices(device)
        .build()
        .map_err(|e| GpuError::Init(format!("context: {e}")))?;

    let queue =
        Queue::new(&context, device, None).map_err(|e| GpuError::Init(format!("queue: {e}")))?;

    let program = Program::builder()
        .src(KERNELS)
        .devices(device)
        .build(&context)
        .map_err(|e| GpuError::Build(format!("program build: {e}")))?;

    let r8_input = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(1usize)
        .build()
        .map_err(|e| GpuError::Init(format!("r8 input buffer: {e}")))?;

    let r8_output = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::WRITE_ONLY)
        .len(1usize)
        .build()
        .map_err(|e| GpuError::Init(format!("r8 output buffer: {e}")))?;

    let dxt5_input = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(1usize)
        .build()
        .map_err(|e| GpuError::Init(format!("dxt5 input buffer: {e}")))?;

    let dxt5_output = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::WRITE_ONLY)
        .len(1usize)
        .build()
        .map_err(|e| GpuError::Init(format!("dxt5 output buffer: {e}")))?;

    let r8_kernel = Kernel::builder()
        .program(&program)
        .name("decode_r8")
        .queue(queue.clone())
        .global_work_size(1usize)
        .arg(&r8_input)
        .arg(&r8_output)
        .arg(0u32)
        .arg(0u32)
        .build()
        .map_err(|e| GpuError::Build(format!("r8 kernel: {e}")))?;

    let dxt5_kernel = Kernel::builder()
        .program(&program)
        .name("decode_dxt5")
        .queue(queue.clone())
        .global_work_size(1usize)
        .arg(&dxt5_input)
        .arg(&dxt5_output)
        .arg(0u32)
        .arg(0u32)
        .arg(0u32)
        .build()
        .map_err(|e| GpuError::Build(format!("dxt5 kernel: {e}")))?;

    Ok(GpuState {
        queue,
        r8_kernel,
        dxt5_kernel,
        r8_input,
        r8_output,
        r8_input_len: 1,
        r8_output_len: 1,
        dxt5_input,
        dxt5_output,
        dxt5_input_len: 1,
        dxt5_output_len: 1,
    })
}

const KERNELS: &str = r#"
__kernel void decode_r8(
    __global const uchar* src,
    __global uchar* dst,
    uint width,
    uint height
) {
    uint idx = get_global_id(0);
    uint total = width * height;
    if (idx >= total) return;

    uchar r = src[idx];
    uint offset = idx * 4;
    dst[offset] = r;
    dst[offset + 1] = 0;
    dst[offset + 2] = 0;
    dst[offset + 3] = 255;
}

inline void rgb565_to_rgb888(uint c, __private uchar* r, __private uchar* g, __private uchar* b) {
    uchar rr = (uchar)((c >> 11) & 0x1F);
    uchar gg = (uchar)((c >> 5) & 0x3F);
    uchar bb = (uchar)(c & 0x1F);
    *r = (uchar)((rr << 3) | (rr >> 2));
    *g = (uchar)((gg << 2) | (gg >> 4));
    *b = (uchar)((bb << 3) | (bb >> 2));
}

__kernel void decode_dxt5(
    __global const uchar* src,
    __global uchar* dst,
    uint width,
    uint height,
    uint blocks_x
) {
    uint block_idx = get_global_id(0);
    uint block_x = block_idx % blocks_x;
    uint block_y = block_idx / blocks_x;
    uint data_offset = block_idx * 16;

    uchar alpha0 = src[data_offset + 0];
    uchar alpha1 = src[data_offset + 1];

    ulong alpha_idx = 0;
    alpha_idx |= (ulong)src[data_offset + 2];
    alpha_idx |= (ulong)src[data_offset + 3] << 8;
    alpha_idx |= (ulong)src[data_offset + 4] << 16;
    alpha_idx |= (ulong)src[data_offset + 5] << 24;
    alpha_idx |= (ulong)src[data_offset + 6] << 32;
    alpha_idx |= (ulong)src[data_offset + 7] << 40;

    uchar alphas[8];
    alphas[0] = alpha0;
    alphas[1] = alpha1;
    if (alpha0 > alpha1) {
        for (uint i = 2; i < 8; ++i) {
            alphas[i] = (uchar)(((8 - i) * (uint)alpha0 + (i - 1) * (uint)alpha1) / 7);
        }
    } else {
        for (uint i = 2; i < 6; ++i) {
            alphas[i] = (uchar)(((6 - i) * (uint)alpha0 + (i - 1) * (uint)alpha1) / 5);
        }
        alphas[6] = 0;
        alphas[7] = 255;
    }

    uint c0 = (uint)src[data_offset + 8] | ((uint)src[data_offset + 9] << 8);
    uint c1 = (uint)src[data_offset + 10] | ((uint)src[data_offset + 11] << 8);
    uint color_idx = (uint)src[data_offset + 12]
        | ((uint)src[data_offset + 13] << 8)
        | ((uint)src[data_offset + 14] << 16)
        | ((uint)src[data_offset + 15] << 24);

    uchar r0, g0, b0;
    uchar r1, g1, b1;
    rgb565_to_rgb888(c0, &r0, &g0, &b0);
    rgb565_to_rgb888(c1, &r1, &g1, &b1);

    uchar colors[4][3];
    colors[0][0] = r0; colors[0][1] = g0; colors[0][2] = b0;
    colors[1][0] = r1; colors[1][1] = g1; colors[1][2] = b1;
    colors[2][0] = (uchar)(((2 * (uint)r0 + (uint)r1) / 3));
    colors[2][1] = (uchar)(((2 * (uint)g0 + (uint)g1) / 3));
    colors[2][2] = (uchar)(((2 * (uint)b0 + (uint)b1) / 3));
    colors[3][0] = (uchar)((( (uint)r0 + 2 * (uint)r1) / 3));
    colors[3][1] = (uchar)((( (uint)g0 + 2 * (uint)g1) / 3));
    colors[3][2] = (uchar)((( (uint)b0 + 2 * (uint)b1) / 3));

    for (uint py = 0; py < 4; ++py) {
        for (uint px = 0; px < 4; ++px) {
            uint idx = py * 4 + px;
            uint ai = (uint)((alpha_idx >> (3 * idx)) & 0x7);
            uint ci = (uint)((color_idx >> (2 * idx)) & 0x3);

            uint x = block_x * 4 + px;
            uint y = block_y * 4 + py;
            if (x < width && y < height) {
                uint flipped_y = height - 1 - y;
                uint out_idx = (flipped_y * width + x) * 4;
                dst[out_idx] = colors[ci][0];
                dst[out_idx + 1] = colors[ci][1];
                dst[out_idx + 2] = colors[ci][2];
                dst[out_idx + 3] = alphas[ai];
            }
        }
    }
}
"#;
