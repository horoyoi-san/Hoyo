use std::ffi::CString;

use yuzuha_codegen::use_offsets;

use crate::{BASE, PtrToStringAnsi, interceptor::Interceptor};

#[use_offsets(PTR_TO_STRING_ANSI, CRYPTO_STR_1, CRYPTO_STR_2, NETWORK_STATE_CHANGE)]
pub fn patch_encryption(interceptor: &mut Interceptor) {
    const SDK_PUBLIC_KEY: &str = include_str!("../sdk_public_key.xml");

    initialize_rsa_key();

    let ptr_to_string_ansi = unsafe {
        std::mem::transmute::<usize, PtrToStringAnsi>(BASE.get().unwrap() + PTR_TO_STRING_ANSI)
    };

    unsafe {
        *(BASE.get().unwrap().wrapping_add(CRYPTO_STR_1) as *mut usize) = ptr_to_string_ansi(
            CString::new(SDK_PUBLIC_KEY)
                .unwrap()
                .to_bytes_with_nul()
                .as_ptr(),
        ) as usize;

        *(BASE.get().unwrap().wrapping_add(CRYPTO_STR_2) as *mut usize) = ptr_to_string_ansi(
            [
                27818, 40348, 47410, 27936, 51394, 33172, 51987, 8709, 44748, 23705, 45753, 21092,
                57054, 52661, 369, 62630, 11725, 7496, 36921, 28271, 34880, 52645, 31515, 18214,
                3108, 2077, 13490, 25459, 58590, 47504, 15163, 8951, 44748, 23705, 45753, 29284,
                57054, 52661,
            ]
            .into_iter()
            .enumerate()
            .flat_map(|(i, v)| {
                let b = (((i + ((i >> 31) >> 29)) & 0xF8).wrapping_sub(i)) as i16;
                (((v << ((b + 11) & 0xF)) | (v >> ((-11 - b) & 0xF))) & 0xFFFF_u16)
                    .to_be_bytes()
                    .into_iter()
            })
            .chain([0])
            .collect::<Vec<_>>()
            .as_ptr(),
        ) as usize;
    }

    interceptor.attach(NETWORK_STATE_CHANGE, |ctx| {
        let net_state = NetworkState::from(ctx.registers().rcx);
        println!("network state change: {net_state:?}");

        if net_state == NetworkState::PlayerLoginCsReq {
            // public key rsa gets reset to null after successful PlayerGetTokenScRsp
            initialize_rsa_key();
        }
    });
}

#[use_offsets(
    PTR_TO_STRING_ANSI,
    RSA_CREATE,
    RSA_FROM_XML_STRING,
    RSA_STATICS,
    RSA_STATIC_ID
)]
fn initialize_rsa_key() {
    const SERVER_PUBLIC_KEY: &str = include_str!("../server_public_key.xml");

    let ptr_to_string_ansi = unsafe {
        std::mem::transmute::<usize, PtrToStringAnsi>(BASE.get().unwrap() + PTR_TO_STRING_ANSI)
    };

    let key = ptr_to_string_ansi(
        CString::new(SERVER_PUBLIC_KEY)
            .unwrap()
            .to_bytes_with_nul()
            .as_ptr(),
    );

    let rsa_create = unsafe {
        std::mem::transmute::<usize, extern "C" fn() -> usize>(BASE.get().unwrap() + RSA_CREATE)
    };

    let rsa_from_xml_string = unsafe {
        std::mem::transmute::<usize, extern "C" fn(usize, usize) -> usize>(
            BASE.get().unwrap() + RSA_FROM_XML_STRING,
        )
    };

    let rsa = rsa_create();
    rsa_from_xml_string(rsa, key as usize);

    unsafe {
        *((*((BASE.get().unwrap() + RSA_STATICS) as *const usize) + RSA_STATIC_ID) as *mut usize) =
            rsa;
    }
}

#[repr(u64)]
#[derive(num_enum::FromPrimitive, Debug, Default, PartialEq)]
pub enum NetworkState {
    CloudCmdLine = 1021,
    CloudDispatch = 1020,
    StartBasicsReq = 17,
    LoadShaderEnd = 9,
    PlayerLoginCsReq = 15,
    EndBasicsReq = 18,
    LoadResourcesEnd = 10,
    GlobalDispatch = 1,
    ConnectGameServer = 12,
    ChooseServer = 2,
    DoFileVerifyEnd = 7,
    PlayerLoginScRsp = 16,
    DispatchResult = 4,
    PlayerGetTokenScRsp = 14,
    DownloadResourcesEnd = 6,
    AccountLogin = 3,
    LoadAssetEnd = 8,
    StartEnterGameWorld = 11,
    #[default]
    None = 0,
    EnterWorldScRsp = 19,
    PlayerGetTokenCsReq = 13,
    StartDownLoad = 5,
    DoFileVerifyFailed = 1022,
    CleanExpireEnd = 1023,
}
