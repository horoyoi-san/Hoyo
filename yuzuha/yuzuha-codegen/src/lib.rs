use std::{collections::HashMap, sync::LazyLock};

use proc_macro::TokenStream;
use quote::quote;
use syn::{Ident, ItemFn, Token, parse::Parse, parse_macro_input, punctuated::Punctuated};

struct AttrArgs {
    offset_names: Punctuated<Ident, Token![,]>,
}

impl Parse for AttrArgs {
    fn parse(input: syn::parse::ParseStream) -> syn::Result<Self> {
        Ok(Self {
            offset_names: input.parse_terminated(Ident::parse, Token![,])?,
        })
    }
}

#[proc_macro_attribute]
pub fn use_offsets(attr: TokenStream, input: TokenStream) -> TokenStream {
    static OFFSETS: LazyLock<HashMap<String, usize>> = LazyLock::new(read_offsets_file);

    let attr = parse_macro_input!(attr as AttrArgs);
    let func = parse_macro_input!(input as ItemFn);

    let vis = &func.vis;
    let sig = &func.sig;
    let block = &func.block;
    let func_ident = &sig.ident;

    let const_offsets = attr
        .offset_names
        .iter()
        .filter_map(|name| {
            if let Some(offset) = OFFSETS.get(&name.to_string()) {
                Some(quote! { const #name: usize = #offset; })
            } else {
                // apparently this is only usable in build.rs
                // and there's no way to produce warnings from proc macro
                // thanks, rust, very cool
                // println!("cargo:warning=missing offset {name} used by {func_ident}");
                println!("Missing offset {name} used by function {func_ident}"); // this will look like shit
                None
            }
        })
        .collect::<Vec<_>>();

    if const_offsets.len() != attr.offset_names.len() {
        return quote! {
            #[allow(unused)]
            #vis #sig {}
        }
        .into();
    }

    quote! {
        #vis #sig {
            #(#const_offsets)*
            #block
        }
    }
    .into()
}

// Compile-time asset
fn read_offsets_file() -> HashMap<String, usize> {
    let file = std::fs::read_to_string("./yuzuha/offsets").expect("failed to read 'offsets' file");

    file.lines()
        .filter(|line| !line.starts_with('#') && !line.trim().is_empty())
        .map(|line| {
            let mut split = line.split_whitespace();
            if let (Some((name, offset)), None) = (split.next().zip(split.next()), split.next()) {
                let offset = usize::from_str_radix(
                    offset.strip_prefix("0x").expect("invalid offset format"),
                    16,
                )
                .expect("invalid offset format");

                (name.to_string(), offset)
            } else {
                panic!("invalid line format: {line}");
            }
        })
        .collect()
}
