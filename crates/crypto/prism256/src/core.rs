use crate::sbox::{
    INV_MIX_MATRIX, KEY_SCHEDULE_VECTOR_A, KEY_SCHEDULE_VECTOR_B, MIX_MATRIX, SBOX_1, SBOX_2,
    SBOX_3,
};
use crate::{Error, Key, Nonce, Result, BLOCK_SIZE};

const ROUND_COUNT: usize = 16;
const ROUND_KEY_COUNT: usize = ROUND_COUNT * 2 + 2;

pub(crate) type Block = [u8; BLOCK_SIZE];
pub(crate) type RoundKeys = [Block; ROUND_KEY_COUNT];

pub(crate) fn encrypt_block(state: &mut Block, round_keys: &RoundKeys) {
    xor_block(state, &round_keys[0]);

    for round in 0..ROUND_COUNT {
        let (k1, k2) = round_subkeys(round_keys, round);
        keyed_sub_bytes_encrypt(state, k1, k2);
        shift_rows(state);
        mix_columns(state);
    }

    xor_block(state, &round_keys[ROUND_KEY_COUNT - 1]);
}

pub(crate) fn decrypt_block(state: &mut Block, round_keys: &RoundKeys) {
    xor_block(state, &round_keys[ROUND_KEY_COUNT - 1]);

    for round in (0..ROUND_COUNT).rev() {
        inv_mix_columns(state);
        inv_shift_rows(state);

        let (k1, k2) = round_subkeys(round_keys, round);
        keyed_sub_bytes_decrypt(state, k1, k2);
    }

    xor_block(state, &round_keys[0]);
}

pub(crate) fn expand_round_keys(key: &Key, nonce: &Nonce) -> RoundKeys {
    let mut left = [0_u8; BLOCK_SIZE];
    let mut right = [0_u8; BLOCK_SIZE];

    for index in 0..BLOCK_SIZE {
        let key_a = key[index];
        let key_b = key[(index * 5 + 7) & 0x0F];
        let nonce_b = nonce[(index + 5) & 0x0F];
        let rotation = (index & 7) as u32;

        left[index] = key_a ^ nonce[index] ^ KEY_SCHEDULE_VECTOR_A[index];
        right[index] = SBOX_1[(key_b ^ nonce_b ^ KEY_SCHEDULE_VECTOR_B[index]) as usize]
            ^ key_a.rotate_left(rotation);
    }

    let mut round_keys = [[0_u8; BLOCK_SIZE]; ROUND_KEY_COUNT];

    for round in 0..ROUND_KEY_COUNT {
        schedule_step(&mut left, &right, round as u8);
        schedule_step(&mut right, &left, (round as u8).wrapping_add(0xA5));

        for index in 0..BLOCK_SIZE {
            round_keys[round][index] = left[index]
                ^ right[(index * 5 + round) & 0x0F]
                ^ round_constant(round as u8, index as u8);
        }
    }

    round_keys
}

fn schedule_step(state: &mut Block, material: &Block, round: u8) {
    for index in 0..BLOCK_SIZE {
        state[index] ^=
            material[(index + round as usize) & 0x0F] ^ round_constant(round, index as u8);
    }

    for pass in 0..4_u8 {
        schedule_sub_bytes(state);
        shift_rows(state);
        mix_columns(state);

        for index in 0..BLOCK_SIZE {
            let source = material[(index + (pass as usize * 3) + 1) & 0x0F];
            let rotation = ((round ^ pass).wrapping_add(index as u8) & 7) as u32;
            state[index] ^= source.rotate_left(rotation);
        }
    }
}

fn round_constant(round: u8, index: u8) -> u8 {
    let mixed = round
        .wrapping_mul(0x3D)
        .wrapping_add(index.wrapping_mul(0xA7))
        .wrapping_add(0x5B)
        ^ round.rotate_left(3)
        ^ index.rotate_left(5);

    SBOX_3[mixed as usize]
}

fn round_subkeys(round_keys: &RoundKeys, round: usize) -> (&Block, &Block) {
    let base = 1 + round * 2;
    (&round_keys[base], &round_keys[base + 1])
}

fn keyed_sub_bytes_encrypt(state: &mut Block, k1: &Block, k2: &Block) {
    for (index, byte) in state.iter_mut().enumerate() {
        let mixed = SBOX_2[*byte as usize];
        let mixed = SBOX_1[mixed as usize] ^ k2[(index + 8) & 0x0F];
        let mixed = SBOX_2[mixed as usize];
        let mixed = SBOX_3[mixed as usize];
        *byte = mixed ^ k1[index];
    }
}

fn keyed_sub_bytes_decrypt(state: &mut Block, k1: &Block, k2: &Block) {
    for (index, byte) in state.iter_mut().enumerate() {
        let mixed = SBOX_1[(*byte ^ k1[index]) as usize];
        let mixed = SBOX_2[mixed as usize] ^ k2[(index + 8) & 0x0F];
        let mixed = SBOX_3[mixed as usize];
        *byte = SBOX_2[mixed as usize];
    }
}

fn schedule_sub_bytes(state: &mut Block) {
    for byte in state {
        let mixed = SBOX_3[*byte as usize];
        let mixed = SBOX_2[mixed as usize];
        *byte = SBOX_1[mixed as usize];
    }
}

pub(crate) fn shift_rows(state: &mut Block) {
    let old = *state;

    for row in 0..4 {
        for column in 0..4 {
            state[row + column * 4] = old[row + ((column + row) & 3) * 4];
        }
    }
}

pub(crate) fn inv_shift_rows(state: &mut Block) {
    let old = *state;

    for row in 0..4 {
        for column in 0..4 {
            state[row + column * 4] = old[row + ((column + 4 - row) & 3) * 4];
        }
    }
}

pub(crate) fn mix_columns(state: &mut Block) {
    mix_columns_with(state, &MIX_MATRIX);
}

pub(crate) fn inv_mix_columns(state: &mut Block) {
    mix_columns_with(state, &INV_MIX_MATRIX);
}

fn mix_columns_with(state: &mut Block, matrix: &[[u8; 4]; 4]) {
    for column in 0..4 {
        let offset = column * 4;
        let input = [
            state[offset],
            state[offset + 1],
            state[offset + 2],
            state[offset + 3],
        ];

        for row in 0..4 {
            state[offset + row] = gf_mul(matrix[row][0], input[0])
                ^ gf_mul(matrix[row][1], input[1])
                ^ gf_mul(matrix[row][2], input[2])
                ^ gf_mul(matrix[row][3], input[3]);
        }
    }
}

fn gf_mul(mut left: u8, mut right: u8) -> u8 {
    let mut result = 0_u8;

    for _ in 0..8 {
        result ^= left & 0_u8.wrapping_sub(right & 1);

        let carry = 0_u8.wrapping_sub(left >> 7);
        left = (left << 1) ^ (0x1D & carry);
        right >>= 1;
    }

    result
}

pub(crate) fn pkcs7_pad(input: &[u8]) -> Vec<u8> {
    let padding = BLOCK_SIZE - (input.len() % BLOCK_SIZE);
    let mut output = Vec::with_capacity(input.len() + padding);

    output.extend_from_slice(input);
    output.resize(output.len() + padding, padding as u8);

    output
}

pub(crate) fn pkcs7_unpad(input: &mut Vec<u8>) -> Result<()> {
    let Some(&padding) = input.last() else {
        return Err(Error::InvalidPadding);
    };

    let padding = padding as usize;
    if padding == 0 || padding > BLOCK_SIZE || padding > input.len() {
        return Err(Error::InvalidPadding);
    }

    let payload_len = input.len() - padding;
    if input[payload_len..]
        .iter()
        .any(|&byte| byte as usize != padding)
    {
        return Err(Error::InvalidPadding);
    }

    input.truncate(payload_len);
    Ok(())
}

pub(crate) fn xor_block(block: &mut Block, mask: &Block) {
    for (byte, mask_byte) in block.iter_mut().zip(mask) {
        *byte ^= mask_byte;
    }
}

pub(crate) fn to_block(input: &[u8]) -> Block {
    let mut block = [0_u8; BLOCK_SIZE];
    block.copy_from_slice(input);
    block
}
