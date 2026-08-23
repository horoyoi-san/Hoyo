#![allow(dead_code)]
use std::cell::RefCell;

use ocl::{flags::MemFlags, Buffer, Context, Device, Kernel, Platform, Program, Queue};

use crate::bcn::bc7::bc7_index_tables_flat;

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

#[expect(unused)]
struct GpuState {
    context: Context,
    queue: Queue,
    program: Program,
    kernel: Kernel,
    input: Buffer<u8>,
    output: Buffer<u32>,
    bc7_subset: Buffer<u8>,
    bc7_idx_pos0: Buffer<u8>,
    bc7_idx_bits0: Buffer<u8>,
    bc7_idx_pos1: Buffer<u8>,
    bc7_idx_bits1: Buffer<u8>,
    input_len: usize,
    output_len: usize,
}

pub fn decode_bc7_gpu(
    data: &[u8],
    width: usize,
    height: usize,
    output: &mut [u32],
) -> Result<(), GpuError> {
    let total_pixels = width * height;
    if output.len() < total_pixels {
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

        if data.len() > state.input_len {
            state.input = Buffer::<u8>::builder()
                .queue(state.queue.clone())
                .flags(MemFlags::READ_ONLY)
                .len(data.len())
                .build()
                .map_err(|e| GpuError::Exec(format!("input buffer alloc: {e}")))?;
            state.input_len = data.len();
        }

        if total_pixels > state.output_len {
            state.output = Buffer::<u32>::builder()
                .queue(state.queue.clone())
                .flags(MemFlags::WRITE_ONLY)
                .len(total_pixels)
                .build()
                .map_err(|e| GpuError::Exec(format!("output buffer alloc: {e}")))?;
            state.output_len = total_pixels;
        }

        state
            .input
            .write(data)
            .enq()
            .map_err(|e| GpuError::Exec(format!("input write: {e}")))?;

        let blocks_x = width.div_ceil(4) as u32;
        let width_u = width as u32;
        let height_u = height as u32;

        unsafe {
            state
                .kernel
                .set_arg(0, &state.input)
                .map_err(|e| GpuError::Exec(format!("set arg0: {e}")))?;
            state
                .kernel
                .set_arg(1, &state.output)
                .map_err(|e| GpuError::Exec(format!("set arg1: {e}")))?;
            state
                .kernel
                .set_arg(2, width_u)
                .map_err(|e| GpuError::Exec(format!("set arg2: {e}")))?;
            state
                .kernel
                .set_arg(3, height_u)
                .map_err(|e| GpuError::Exec(format!("set arg3: {e}")))?;
            state
                .kernel
                .set_arg(4, blocks_x)
                .map_err(|e| GpuError::Exec(format!("set arg4: {e}")))?;
            state
                .kernel
                .set_arg(5, &state.bc7_subset)
                .map_err(|e| GpuError::Exec(format!("set arg5: {e}")))?;
            state
                .kernel
                .set_arg(6, &state.bc7_idx_pos0)
                .map_err(|e| GpuError::Exec(format!("set arg6: {e}")))?;
            state
                .kernel
                .set_arg(7, &state.bc7_idx_bits0)
                .map_err(|e| GpuError::Exec(format!("set arg7: {e}")))?;
            state
                .kernel
                .set_arg(8, &state.bc7_idx_pos1)
                .map_err(|e| GpuError::Exec(format!("set arg8: {e}")))?;
            state
                .kernel
                .set_arg(9, &state.bc7_idx_bits1)
                .map_err(|e| GpuError::Exec(format!("set arg9: {e}")))?;

            state
                .kernel
                .set_default_global_work_size(ocl::SpatialDims::One(total_blocks));
            state
                .kernel
                .enq()
                .map_err(|e| GpuError::Exec(format!("enqueue kernel: {e}")))?;
        }

        state
            .output
            .read(&mut output[..total_pixels])
            .enq()
            .map_err(|e| GpuError::Exec(format!("output read: {e}")))?;
        state
            .queue
            .finish()
            .map_err(|e| GpuError::Exec(format!("queue finish: {e}")))?;

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
        .src(BC7_KERNEL)
        .devices(device)
        .build(&context)
        .map_err(|e| GpuError::Build(format!("program build: {e}")))?;

    let input = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(1usize)
        .build()
        .map_err(|e| GpuError::Init(format!("input buffer: {e}")))?;

    let output = Buffer::<u32>::builder()
        .queue(queue.clone())
        .flags(MemFlags::WRITE_ONLY)
        .len(1usize)
        .build()
        .map_err(|e| GpuError::Init(format!("output buffer: {e}")))?;

    let tables = bc7_index_tables_flat();
    let bc7_subset = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(tables.subset.len())
        .copy_host_slice(&tables.subset)
        .build()
        .map_err(|e| GpuError::Init(format!("bc7 subset buffer: {e}")))?;
    let bc7_idx_pos0 = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(tables.idx_pos0.len())
        .copy_host_slice(&tables.idx_pos0)
        .build()
        .map_err(|e| GpuError::Init(format!("bc7 idx_pos0 buffer: {e}")))?;
    let bc7_idx_bits0 = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(tables.idx_bits0.len())
        .copy_host_slice(&tables.idx_bits0)
        .build()
        .map_err(|e| GpuError::Init(format!("bc7 idx_bits0 buffer: {e}")))?;
    let bc7_idx_pos1 = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(tables.idx_pos1.len())
        .copy_host_slice(&tables.idx_pos1)
        .build()
        .map_err(|e| GpuError::Init(format!("bc7 idx_pos1 buffer: {e}")))?;
    let bc7_idx_bits1 = Buffer::<u8>::builder()
        .queue(queue.clone())
        .flags(MemFlags::READ_ONLY)
        .len(tables.idx_bits1.len())
        .copy_host_slice(&tables.idx_bits1)
        .build()
        .map_err(|e| GpuError::Init(format!("bc7 idx_bits1 buffer: {e}")))?;

    let kernel = Kernel::builder()
        .program(&program)
        .name("decode_bc7")
        .queue(queue.clone())
        .global_work_size(1usize)
        .arg(&input)
        .arg(&output)
        .arg(0u32)
        .arg(0u32)
        .arg(0u32)
        .arg(&bc7_subset)
        .arg(&bc7_idx_pos0)
        .arg(&bc7_idx_bits0)
        .arg(&bc7_idx_pos1)
        .arg(&bc7_idx_bits1)
        .build()
        .map_err(|e| GpuError::Build(format!("kernel: {e}")))?;

    Ok(GpuState {
        context,
        queue,
        program,
        kernel,
        input,
        output,
        bc7_subset,
        bc7_idx_pos0,
        bc7_idx_bits0,
        bc7_idx_pos1,
        bc7_idx_bits1,
        input_len: 1,
        output_len: 1,
    })
}

const BC7_KERNEL: &str = r#"
__constant ushort S_BPTC_FACTORS[3][16] = {
    { 0, 21, 43, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
    { 0, 9, 18, 27, 37, 46, 55, 64, 0, 0, 0, 0, 0, 0, 0, 0 },
    { 0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64 }
};

__constant ushort S_BPTC_A2[64] = {
    15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 8, 2, 2, 8, 8, 15, 2, 8,
    2, 2, 8, 8, 2, 2, 15, 15, 6, 8, 2, 8, 15, 15, 2, 8, 2, 2, 2, 15, 15, 6, 6, 2, 6, 8, 15, 15, 2,
    2, 15, 15, 15, 15, 15, 2, 2, 15
};

__constant ushort S_BPTC_A3[2][64] = {
    {
        3, 3, 15, 15, 8, 3, 15, 15, 8, 8, 6, 6, 6, 5, 3, 3, 3, 3, 8, 15, 3, 3, 6, 10, 5, 8, 8, 6,
        8, 5, 15, 15, 8, 15, 3, 5, 6, 10, 8, 15, 15, 3, 15, 5, 15, 15, 15, 15, 3, 15, 5, 5, 5, 8,
        5, 10, 5, 10, 8, 13, 15, 12, 3, 3
    },
    {
        15, 8, 8, 3, 15, 15, 3, 8, 15, 15, 15, 15, 15, 15, 15, 8, 15, 8, 15, 3, 15, 8, 15, 8, 3,
        15, 6, 10, 15, 15, 10, 8, 15, 3, 15, 10, 10, 8, 9, 10, 6, 15, 8, 15, 3, 6, 6, 8, 15, 3, 15,
        15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 15, 15, 8
    }
};

__constant uint S_BPTC_P2[64] = {
    0x0000CCCC, 0x00008888, 0x0000EEEE, 0x0000ECC8, 0x0000C880, 0x0000FEEC, 0x0000FEC8, 0x0000EC80,
    0x0000C800, 0x0000FFEC, 0x0000FE80, 0x0000E800, 0x0000FFE8, 0x0000FF00, 0x0000FFF0, 0x0000F000,
    0x0000F710, 0x0000008E, 0x00007100, 0x000008CE, 0x0000008C, 0x00007310, 0x00003100, 0x00008CCE,
    0x0000088C, 0x00003110, 0x00006666, 0x0000366C, 0x000017E8, 0x00000FF0, 0x0000718E, 0x0000399C,
    0x0000AAAA, 0x0000F0F0, 0x00005A5A, 0x000033CC, 0x00003C3C, 0x000055AA, 0x00009696, 0x0000A55A,
    0x000073CE, 0x000013C8, 0x0000324C, 0x00003BDC, 0x00006996, 0x0000C33C, 0x00009966, 0x00000660,
    0x00000272, 0x000004E4, 0x00004E40, 0x00002720, 0x0000C936, 0x0000936C, 0x000039C6, 0x0000639C,
    0x00009336, 0x00009CC6, 0x0000817E, 0x0000E718, 0x0000CCF0, 0x00000FCC, 0x00007744, 0x0000EE22
};

__constant uint S_BPTC_P3[64] = {
    0xAA685050, 0x6A5A5040, 0x5A5A4200, 0x5450A0A8, 0xA5A50000, 0xA0A05050, 0x5555A0A0, 0x5A5A5050,
    0xAA550000, 0xAA555500, 0xAAAA5500, 0x90909090, 0x94949494, 0xA4A4A4A4, 0xA9A59450, 0x2A0A4250,
    0xA5945040, 0x0A425054, 0xA5A5A500, 0x55A0A0A0, 0xA8A85454, 0x6A6A4040, 0xA4A45000, 0x1A1A0500,
    0x0050A4A4, 0xAAA59090, 0x14696914, 0x69691400, 0xA08585A0, 0xAA821414, 0x50A4A450, 0x6A5A0200,
    0xA9A58000, 0x5090A0A8, 0xA8A09050, 0x24242424, 0x00AA5500, 0x24924924, 0x24499224, 0x50A50A50,
    0x500AA550, 0xAAAA4444, 0x66660000, 0xA5A0A5A0, 0x50A050A0, 0x69286928, 0x44AAAA44, 0x66666600,
    0xAA444444, 0x54A854A8, 0x95809580, 0x96969600, 0xA85454A8, 0x80959580, 0xAA141414, 0x96960000,
    0xAAAA1414, 0xA05050A0, 0xA0A5A5A0, 0x96000000, 0x40804080, 0xA9A8A9A8, 0xAAAAAA44, 0x2A4A5254
};

inline uint read_bits(ulong lo, ulong hi, uint bit, uint len) {
    if (len == 0) return 0;
    if (bit < 64) {
        if (bit + len <= 64) {
            return (uint)((lo >> bit) & (((ulong)1 << len) - 1));
        } else {
            ulong v = (lo >> bit) | (hi << (64 - bit));
            return (uint)(v & (((ulong)1 << len) - 1));
        }
    } else {
        uint shift = bit - 64;
        return (uint)((hi >> shift) & (((ulong)1 << len) - 1));
    }
}

inline uchar expand_quantized(uchar v, uint bits) {
    uchar s = (uchar)(v << (8 - bits));
    return (uchar)(s | (s >> bits));
}

__kernel void decode_bc7(
    __global const uchar* data,
    __global uint* out,
    uint width,
    uint height,
    uint blocks_x,
    __global const uchar* subset_table,
    __global const uchar* idx_pos0_table,
    __global const uchar* idx_bits0_table,
    __global const uchar* idx_pos1_table,
    __global const uchar* idx_bits1_table
) {
    uint block_idx = get_global_id(0);
    uint block_x = block_idx % blocks_x;
    uint block_y = block_idx / blocks_x;

    uint data_offset = block_idx * 16;
    uchar8 lo_bytes = vload8(0, (__global const uchar*)(data + data_offset));
    uchar8 hi_bytes = vload8(0, (__global const uchar*)(data + data_offset + 8));
    ulong lo = as_ulong(lo_bytes);
    ulong hi = as_ulong(hi_bytes);

    uint bit_pos = 0;
    uint mode = 0;
    while (mode < 8 && read_bits(lo, hi, bit_pos, 1) == 0) {
        bit_pos += 1;
        mode += 1;
    }
    bit_pos += 1;

    if (mode == 8) {
        return;
    }

    uint num_subsets;
    uint partition_bits;
    uint rotation_bits;
    uint index_selection_bits;
    uint color_bits;
    uint alpha_bits;
    uint endpoint_pbits;
    uint shared_pbits;
    uint index_bits0;
    uint index_bits1;

    switch (mode) {
        case 0: num_subsets=3; partition_bits=4; rotation_bits=0; index_selection_bits=0; color_bits=4; alpha_bits=0; endpoint_pbits=1; shared_pbits=0; index_bits0=3; index_bits1=0; break;
        case 1: num_subsets=2; partition_bits=6; rotation_bits=0; index_selection_bits=0; color_bits=6; alpha_bits=0; endpoint_pbits=0; shared_pbits=1; index_bits0=3; index_bits1=0; break;
        case 2: num_subsets=3; partition_bits=6; rotation_bits=0; index_selection_bits=0; color_bits=5; alpha_bits=0; endpoint_pbits=0; shared_pbits=0; index_bits0=2; index_bits1=0; break;
        case 3: num_subsets=2; partition_bits=6; rotation_bits=0; index_selection_bits=0; color_bits=7; alpha_bits=0; endpoint_pbits=1; shared_pbits=0; index_bits0=2; index_bits1=0; break;
        case 4: num_subsets=1; partition_bits=0; rotation_bits=2; index_selection_bits=1; color_bits=5; alpha_bits=6; endpoint_pbits=0; shared_pbits=0; index_bits0=2; index_bits1=3; break;
        case 5: num_subsets=1; partition_bits=0; rotation_bits=2; index_selection_bits=0; color_bits=7; alpha_bits=8; endpoint_pbits=0; shared_pbits=0; index_bits0=2; index_bits1=2; break;
        case 6: num_subsets=1; partition_bits=0; rotation_bits=0; index_selection_bits=0; color_bits=7; alpha_bits=7; endpoint_pbits=1; shared_pbits=0; index_bits0=4; index_bits1=0; break;
        case 7: num_subsets=2; partition_bits=6; rotation_bits=0; index_selection_bits=0; color_bits=5; alpha_bits=5; endpoint_pbits=1; shared_pbits=0; index_bits0=2; index_bits1=0; break;
    }

    uint partition_set = partition_bits ? read_bits(lo, hi, bit_pos, partition_bits) : 0;
    bit_pos += partition_bits;
    uint rotation_mode = rotation_bits ? read_bits(lo, hi, bit_pos, rotation_bits) : 0;
    bit_pos += rotation_bits;
    uint index_sel = index_selection_bits ? read_bits(lo, hi, bit_pos, index_selection_bits) : 0;
    bit_pos += index_selection_bits;

    uint mode_pbits = (endpoint_pbits != 0) ? endpoint_pbits : shared_pbits;

    uchar ep_r[6] = {0};
    uchar ep_g[6] = {0};
    uchar ep_b[6] = {0};
    uchar ep_a[6] = {0};

    for (uint s = 0; s < num_subsets; ++s) {
        ep_r[s*2] = (uchar)(read_bits(lo, hi, bit_pos, color_bits) << mode_pbits);
        bit_pos += color_bits;
        ep_r[s*2+1] = (uchar)(read_bits(lo, hi, bit_pos, color_bits) << mode_pbits);
        bit_pos += color_bits;
    }
    for (uint s = 0; s < num_subsets; ++s) {
        ep_g[s*2] = (uchar)(read_bits(lo, hi, bit_pos, color_bits) << mode_pbits);
        bit_pos += color_bits;
        ep_g[s*2+1] = (uchar)(read_bits(lo, hi, bit_pos, color_bits) << mode_pbits);
        bit_pos += color_bits;
    }
    for (uint s = 0; s < num_subsets; ++s) {
        ep_b[s*2] = (uchar)(read_bits(lo, hi, bit_pos, color_bits) << mode_pbits);
        bit_pos += color_bits;
        ep_b[s*2+1] = (uchar)(read_bits(lo, hi, bit_pos, color_bits) << mode_pbits);
        bit_pos += color_bits;
    }

    if (alpha_bits > 0) {
        for (uint s = 0; s < num_subsets; ++s) {
            ep_a[s*2] = (uchar)(read_bits(lo, hi, bit_pos, alpha_bits) << mode_pbits);
            bit_pos += alpha_bits;
            ep_a[s*2+1] = (uchar)(read_bits(lo, hi, bit_pos, alpha_bits) << mode_pbits);
            bit_pos += alpha_bits;
        }
    } else {
        for (uint i = 0; i < 6; ++i) ep_a[i] = 255;
    }

    if (mode_pbits != 0) {
        for (uint s = 0; s < num_subsets; ++s) {
            uchar pda = (uchar)read_bits(lo, hi, bit_pos, mode_pbits);
            bit_pos += mode_pbits;
            uchar pdb = (shared_pbits == 0) ? (uchar)read_bits(lo, hi, bit_pos, mode_pbits) : pda;
            if (shared_pbits == 0) bit_pos += mode_pbits;

            ep_r[s*2] |= pda; ep_r[s*2+1] |= pdb;
            ep_g[s*2] |= pda; ep_g[s*2+1] |= pdb;
            ep_b[s*2] |= pda; ep_b[s*2+1] |= pdb;
            ep_a[s*2] |= pda; ep_a[s*2+1] |= pdb;
        }
    }

    uint color_expand_bits = color_bits + mode_pbits;
    for (uint s = 0; s < num_subsets; ++s) {
        ep_r[s*2] = expand_quantized(ep_r[s*2], color_expand_bits);
        ep_r[s*2+1] = expand_quantized(ep_r[s*2+1], color_expand_bits);
        ep_g[s*2] = expand_quantized(ep_g[s*2], color_expand_bits);
        ep_g[s*2+1] = expand_quantized(ep_g[s*2+1], color_expand_bits);
        ep_b[s*2] = expand_quantized(ep_b[s*2], color_expand_bits);
        ep_b[s*2+1] = expand_quantized(ep_b[s*2+1], color_expand_bits);
    }
    if (alpha_bits > 0) {
        uint alpha_expand_bits = alpha_bits + mode_pbits;
        for (uint s = 0; s < num_subsets; ++s) {
            ep_a[s*2] = expand_quantized(ep_a[s*2], alpha_expand_bits);
            ep_a[s*2+1] = expand_quantized(ep_a[s*2+1], alpha_expand_bits);
        }
    }

    uint pos_base = bit_pos;
    uint has_index_bits1 = (index_bits1 != 0);

    for (uint py = 0; py < 4; ++py) {
        for (uint px = 0; px < 4; ++px) {
            uint idx = py * 4 + px;
            uint table_base = (mode * 64 + partition_set) * 16;
            uint table_idx = table_base + idx;
            uint subset = (uint)subset_table[table_idx];
            uint bits0 = (uint)idx_bits0_table[table_idx];
            uint bits1 = (uint)idx_bits1_table[table_idx];
            uint pos0 = (uint)idx_pos0_table[table_idx];
            uint pos1 = (uint)idx_pos1_table[table_idx];

            uint index0 = read_bits(lo, hi, pos_base + pos0, bits0);
            uint index1 = has_index_bits1 ? read_bits(lo, hi, pos_base + pos1, bits1) : index0;

            uint fc;
            uint fa;
            if (index_sel == 0) {
                fc = S_BPTC_FACTORS[index_bits0 - 2][index0];
                fa = S_BPTC_FACTORS[index_bits1 != 0 ? (index_bits1 - 2) : (index_bits0 - 2)][index1];
            } else {
                fc = S_BPTC_FACTORS[index_bits1 != 0 ? (index_bits1 - 2) : (index_bits0 - 2)][index1];
                fa = S_BPTC_FACTORS[index_bits0 - 2][index0];
            }

            uint fca = 64 - fc;
            uint fcb = fc;
            uint faa = 64 - fa;
            uint fab = fa;

            uint si = subset * 2;
            uchar r = (uchar)(((ep_r[si] * fca + ep_r[si+1] * fcb + 32) >> 6) & 0xFF);
            uchar g = (uchar)(((ep_g[si] * fca + ep_g[si+1] * fcb + 32) >> 6) & 0xFF);
            uchar b = (uchar)(((ep_b[si] * fca + ep_b[si+1] * fcb + 32) >> 6) & 0xFF);
            uchar a = (uchar)(((ep_a[si] * faa + ep_a[si+1] * fab + 32) >> 6) & 0xFF);

            if (rotation_mode == 1) { uchar t = a; a = r; r = t; }
            else if (rotation_mode == 2) { uchar t = a; a = g; g = t; }
            else if (rotation_mode == 3) { uchar t = a; a = b; b = t; }

            uint x = block_x * 4 + px;
            uint y = block_y * 4 + py;
            if (x < width && y < height) {
                uint flipped_y = height - 1 - y;
                out[flipped_y * width + x] = ((uint)a << 24) | ((uint)b << 16) | ((uint)g << 8) | (uint)r;
            }
        }
    }
}
"#;
