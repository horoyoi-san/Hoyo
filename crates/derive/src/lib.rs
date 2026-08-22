use proc_macro::TokenStream;
use quote::quote;
use syn::DeriveInput;

mod il2cpp_api;

#[proc_macro_attribute]
pub fn il2cpp_api(attr: TokenStream, item: TokenStream) -> TokenStream {
    TokenStream::from(il2cpp_api::expand(attr.into(), item.into()))
}

#[proc_macro_derive(Il2CppValue)]
pub fn derive_il2cpp_value(input: TokenStream) -> TokenStream {
    let input = syn::parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let (impl_generics, ty_generics, where_clause) = input.generics.split_for_impl();

    let fields = match &input.data {
        syn::Data::Struct(syn::DataStruct {
            fields: syn::Fields::Unnamed(fields),
            ..
        }) => &fields.unnamed,
        _ => {
            return syn::Error::new_spanned(
                &input,
                "Il2CppValue can only be derived for tuple structs",
            )
            .to_compile_error()
            .into();
        }
    };

    let field_count = fields.len();
    if field_count == 0 {
        return syn::Error::new_spanned(&input, "Struct must have at least one field")
            .to_compile_error()
            .into();
    }

    let first_field_access = quote! { self.0 };

    // From<usize> non generic
    let from_initializer = if field_count == 1 {
        quote! { Self(ptr) }
    // From<usize> generic
    } else if field_count == 2 {
        quote! { Self(ptr, std::marker::PhantomData) }
    } else {
        return syn::Error::new_spanned(
            &input,
            "Struct has too many fields to derive Il2CppValue automatically",
        )
        .to_compile_error()
        .into();
    };

    let expanded = quote! {
        impl #impl_generics Il2CppValue for #name #ty_generics #where_clause {
            fn get_type(&self) -> anyhow::Result<Il2CppType> {
                if self.is_null() {
                    return Err(anyhow::anyhow!("object reference not set to an instance of an object"));
                }
                Ok(self.as_il2cpp_object().get_class().byval_arg())
            }

            fn is_null(&self) -> bool {
                #first_field_access == 0
            }

            fn as_il2cpp_object(&self) -> Il2CppObject {
                Il2CppObject(#first_field_access)
            }

            fn as_raw(&self) -> usize {
                #first_field_access
            }
        }

        impl #impl_generics From<usize> for #name #ty_generics #where_clause {
            fn from(ptr: usize) -> Self {
                #from_initializer
            }
        }
    };

    TokenStream::from(expanded)
}
