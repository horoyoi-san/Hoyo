use proc_macro2::TokenStream as TokenStream2;
use quote::quote;
use syn::{
    Attribute, FnArg, GenericArgument, Ident, LitInt, LitStr, Pat, PathArguments, ReturnType,
    Signature, Token, Type, Visibility,
    parse::{Parse, ParseStream},
};

pub struct BodilessMethod {
    attrs: Vec<Attribute>,
    vis: Visibility,
    sig: Signature,
}

impl Parse for BodilessMethod {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let attrs = Attribute::parse_outer(input)?;
        let vis: Visibility = input.parse()?;
        let sig: Signature = input.parse()?;
        input.parse::<Token![;]>()?;
        Ok(BodilessMethod { attrs, vis, sig })
    }
}

pub enum ApiItem {
    Impl {
        self_ty: Type,
        methods: Vec<BodilessMethod>,
    },
    Fn(BodilessMethod),
}

impl Parse for ApiItem {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        if input.peek(Token![impl]) {
            input.parse::<Token![impl]>()?;
            let self_ty: Type = input.parse()?;
            let content;
            syn::braced!(content in input);
            let mut methods = Vec::new();
            while !content.is_empty() {
                methods.push(content.parse::<BodilessMethod>()?);
            }
            Ok(ApiItem::Impl { self_ty, methods })
        } else {
            Ok(ApiItem::Fn(input.parse::<BodilessMethod>()?))
        }
    }
}

struct MethodArgs {
    member: LitStr,
    index: LitInt,
    native: bool,
}

impl Parse for MethodArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let member: LitStr = input.parse()?;
        input.parse::<Token![,]>()?;
        let index: LitInt = input.parse()?;
        let native = if input.peek(Token![,]) {
            input.parse::<Token![,]>()?;
            let ident: Ident = input.parse()?;
            if ident != "native" {
                return Err(syn::Error::new_spanned(
                    ident,
                    "expected `native` (the only supported kind marker)",
                ));
            }
            true
        } else {
            false
        };
        Ok(MethodArgs {
            member,
            index,
            native,
        })
    }
}

fn extract_result_ok_type(output: &ReturnType) -> syn::Result<Type> {
    let ReturnType::Type(_, ty) = output else {
        return Err(syn::Error::new_spanned(
            output,
            "il2cpp_api methods must return Result<T> (anyhow::Result<T>)",
        ));
    };
    if let Type::Path(type_path) = ty.as_ref()
        && let Some(last) = type_path.path.segments.last()
        && last.ident == "Result"
        && let PathArguments::AngleBracketed(args) = &last.arguments
        && let Some(GenericArgument::Type(ok_ty)) = args.args.first()
    {
        return Ok(ok_ty.clone());
    }
    Err(syn::Error::new_spanned(
        ty,
        "il2cpp_api methods must return Result<T> (anyhow::Result<T>)",
    ))
}

fn arg_ident(pat: &Pat) -> syn::Result<&Ident> {
    match pat {
        Pat::Ident(pi) => Ok(&pi.ident),
        other => Err(syn::Error::new_spanned(
            other,
            "il2cpp_api method arguments must be simple identifiers",
        )),
    }
}

fn generate_method(
    owner: Option<&Type>,
    class: &str,
    method: &BodilessMethod,
) -> syn::Result<(TokenStream2, TokenStream2)> {
    let mut method_args = None;
    let mut forwarded_attrs = Vec::new();
    for attr in &method.attrs {
        if attr.path().is_ident("method") {
            if method_args.is_some() {
                return Err(syn::Error::new_spanned(
                    attr,
                    "duplicate #[method(...)] attribute",
                ));
            }
            method_args = Some(attr.parse_args::<MethodArgs>()?);
        } else {
            forwarded_attrs.push(attr.clone());
        }
    }

    let Some(margs) = method_args else {
        return Err(syn::Error::new_spanned(
            &method.sig,
            "missing #[method(\"MemberName\", index)] attribute",
        ));
    };

    let member = margs.member.value();
    let index: u32 = margs.index.base10_parse()?;
    let is_native = margs.native;
    let signature = format!("{class}::{member}{index}");

    let vis = &method.vis;
    let fn_name = &method.sig.ident;
    let has_self = matches!(method.sig.inputs.first(), Some(FnArg::Receiver(_)));

    let mut arg_names = Vec::new();
    let mut arg_types = Vec::new();
    for input in &method.sig.inputs {
        if let FnArg::Typed(pat_ty) = input {
            arg_names.push(arg_ident(&pat_ty.pat)?.clone());
            arg_types.push((*pat_ty.ty).clone());
        }
    }

    let ret_ty = extract_result_ok_type(&method.sig.output)?;

    let kind_variant = if is_native {
        quote!(::il2cpp::api_table::ApiKind::Native)
    } else {
        quote!(::il2cpp::api_table::ApiKind::Runtime)
    };
    let owner_lit = owner.map_or_else(|| "<free>".to_string(), |t| quote!(#t).to_string());
    let rust_fn_lit = fn_name.to_string();

    let submit = quote! {
        ::inventory::submit! {
            ::il2cpp::api_table::ApiEntry {
                class: #class,
                member: #member,
                index: #index,
                kind: #kind_variant,
                owner: #owner_lit,
                rust_fn: #rust_fn_lit,
            }
        }
    };

    let body = if is_native {
        if has_self {
            quote! {
                unsafe {
                    let Some(method) = ::il2cpp::get_native_method(#signature) else {
                        return Err(::anyhow::anyhow!("no such method {}", #signature));
                    };
                    let func: extern "C" fn(usize, #(#arg_types),*) -> #ret_ty =
                        ::std::mem::transmute(method.va());
                    let result = ::microseh::try_seh(|| func(self.0, #(#arg_names),*));
                    result.map_err(|e| ::anyhow::anyhow!("failed to invoke {}. {:?}", stringify!(#fn_name), e))
                }
            }
        } else {
            quote! {
                unsafe {
                    let Some(method) = ::il2cpp::get_native_method(#signature) else {
                        return Err(::anyhow::anyhow!("no such method {}", #signature));
                    };
                    let func: extern "C" fn(#(#arg_types),*) -> #ret_ty =
                        ::std::mem::transmute(method.va());
                    let result = ::microseh::try_seh(|| func(#(#arg_names),*));
                    result.map_err(|e| ::anyhow::anyhow!("failed to invoke {}. {:?}", stringify!(#fn_name), e))
                }
            }
        }
    } else {
        let instance = if has_self {
            quote!(self.as_il2cpp_object())
        } else {
            quote!(::il2cpp::vm::object::Il2CppObject::NULL)
        };
        quote! {
            unsafe {
                let Some(method) = ::il2cpp::get_native_method(#signature) else {
                    return Err(::anyhow::anyhow!("no such method {}", #signature));
                };
                let result = method.invoke::<#ret_ty>(
                    #instance,
                    &[#(&#arg_names),*],
                );
                result.map_err(|e| ::anyhow::anyhow!("failed to invoke {}. {:?}", stringify!(#fn_name), e))
            }
        }
    };

    let self_param = if has_self { quote!(&self,) } else { quote!() };

    let func = quote! {
        #(#forwarded_attrs)*
        #[allow(unused)]
        #[allow(clippy::wrong_self_convention)]
        #[inline]
        #vis fn #fn_name(#self_param #(#arg_names: #arg_types),*) -> ::anyhow::Result<#ret_ty> {
            #body
        }
    };

    Ok((func, submit))
}

pub fn expand(attr: TokenStream2, item: TokenStream2) -> TokenStream2 {
    let class = match syn::parse2::<LitStr>(attr) {
        Ok(lit) => lit.value(),
        Err(e) => return e.to_compile_error(),
    };

    let api_item = match syn::parse2::<ApiItem>(item) {
        Ok(item) => item,
        Err(e) => return e.to_compile_error(),
    };

    let mut funcs = Vec::new();
    let mut submits = Vec::new();

    match api_item {
        ApiItem::Impl { self_ty, methods } => {
            for method in &methods {
                match generate_method(Some(&self_ty), &class, method) {
                    Ok((func, submit)) => {
                        funcs.push(func);
                        submits.push(submit);
                    }
                    Err(e) => funcs.push(e.to_compile_error()),
                }
            }
            quote! {
                impl #self_ty {
                    #(#funcs)*
                }
                #(#submits)*
            }
        }
        ApiItem::Fn(method) => match generate_method(None, &class, &method) {
            Ok((func, submit)) => quote! {
                #func
                #submit
            },
            Err(e) => e.to_compile_error(),
        },
    }
}
