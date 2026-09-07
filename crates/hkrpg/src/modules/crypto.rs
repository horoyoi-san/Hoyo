use crate::{addr::rva_config, il2cpp_string::Il2cppString};

use super::{HkrpgModule, HkrpgModuleContext};

pub struct Crypto;

const ACCOUNT_RSA_KEY_REPLACEMENT: &str = "<RSAKeyValue><Exponent>AQAB</Exponent><Modulus>hEegnKISgDas5VTuRBUlixB+bvmPvXKa3kVO22UEZjPGMUFLmIl3DhH+dsZo7qJn/GfJCUkP1FA0MJ5Bj8PX8IatLJKIJ9dMCNdnAlkXTlMg86QQAhHZN83vP4swj5ILcrGNKl3YAZ49fvzo7nheuTt0/40f0HkHdNa1dUHECBs=</Modulus></RSAKeyValue>";

impl HkrpgModule for HkrpgModuleContext<Crypto> {
    unsafe fn init(&mut self) -> Result<(), ilhook::HookError> {
        let config = rva_config();
        if config.sdk_public_key != 0 {
            unsafe {
                *(config.sdk_public_key as *mut Il2cppString) =
                    Il2cppString::new(ACCOUNT_RSA_KEY_REPLACEMENT)
            }
            crate::hkrpg_log("CRYPTO", "AccountRSAKey replaced (RobinSR Mode)");
        } else {
            crate::hkrpg_log("CRYPTO", "Pattern outdated, skipping AccountRSAKey replacement");
        }
        Ok(())
    }
}
