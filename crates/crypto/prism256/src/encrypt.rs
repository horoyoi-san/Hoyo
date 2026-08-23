use rand_core::{OsRng, TryRngCore};

use crate::core::{encrypt_block, expand_round_keys, pkcs7_pad, to_block, xor_block};
use crate::{Key, Nonce, Prism128, Result, BLOCK_SIZE, NONCE_SIZE};

impl Prism128 {
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>> {
        let mut nonce = [0_u8; NONCE_SIZE];
        OsRng
            .try_fill_bytes(&mut nonce)
            .expect("OsRng should always succeed");
        self.encrypt_with_nonce(nonce, plaintext)
    }

    pub fn encrypt_with_nonce(&self, nonce: Nonce, plaintext: &[u8]) -> Result<Vec<u8>> {
        let round_keys = expand_round_keys(&self.key, &nonce);
        let padded = pkcs7_pad(plaintext);

        let mut output = Vec::with_capacity(NONCE_SIZE + padded.len());
        output.extend_from_slice(&nonce);

        let mut chain = nonce;
        for chunk in padded.as_chunks::<BLOCK_SIZE>().0 {
            let mut block = to_block(chunk);
            xor_block(&mut block, &chain);
            encrypt_block(&mut block, &round_keys);

            output.extend_from_slice(&block);
            chain = block;
        }

        Ok(output)
    }
}

pub fn encrypt(key: Key, plaintext: impl AsRef<[u8]>) -> Result<Vec<u8>> {
    Prism128::new(key).encrypt(plaintext.as_ref())
}

pub fn encrypt_with_nonce(key: Key, nonce: Nonce, plaintext: impl AsRef<[u8]>) -> Result<Vec<u8>> {
    Prism128::new(key).encrypt_with_nonce(nonce, plaintext.as_ref())
}
