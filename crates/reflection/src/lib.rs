use std::{
    collections::HashSet,
    panic::catch_unwind,
    sync::{Mutex, OnceLock, atomic::Ordering},
};

use il2cpp::vm::metadata_cache;
use indexmap::IndexMap;

use crate::{method_info::MethodInfo, runtime_type::RuntimeType};
pub mod array;
pub mod assembly;
pub mod attributes;
pub mod r#enum;
pub mod event_info;
pub mod field_info;
pub mod member_info;
pub mod method_info;
pub mod parameter_info;
pub mod property_info;
pub mod runtime_type;
pub mod self_test;

pub mod custom_attribute;

pub mod serializer;

static PASSED_TESTS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

pub fn init_reflection_methods() {
    il2cpp::api_table::assert_no_collisions();
    test_reflection_apis();
    let mut out = IndexMap::new();
    for i in 0..il2cpp::MAX_TYPEDEFINDEX.load(Ordering::Relaxed) {
        let class = metadata_cache::get_typeinfo_from_typedefindex(i);
        let rt = RuntimeType::from_class(class).unwrap();
        for method in class.get_methods() {
            let method_info = MethodInfo::from_handle(method).unwrap();
            out.insert(
                format!("{}::{}", rt.il_name(), method_info.signature()),
                method,
            );
        }
    }
    log::debug!("[Reflection] Initialized {} methods", out.len());
    il2cpp::FUNCTIONS_TABLE_REFLECTION.set(out).unwrap();
    dump_methods_reflection_json();
}

#[inline]
pub fn test_reflection_apis() -> bool {
    const MAX_OFFSET: i32 = 100;

    let passed = PASSED_TESTS.get_or_init(|| Mutex::new(HashSet::new()));
    passed.lock().unwrap().clear();

    let tests = self_test::all_tests();
    for case in &tests {
        if passed.lock().unwrap().contains(case.display_id().as_ref()) {
            continue;
        }

        let err_msg = run_single_test(case);

        if err_msg.is_none() {
            passed
                .lock()
                .unwrap()
                .insert(case.display_id().into_owned());
            continue;
        }

        let err_msg = err_msg.unwrap();
        log::debug!(
            "[Reflection] test {} failed: {}",
            case.display_id(),
            err_msg
        );

        let mut test_passed_after_fix = false;
        for blamed_sig in case.resolved_signatures() {
            let start = il2cpp::current_fix_offset(&blamed_sig);
            for offset in -MAX_OFFSET..=MAX_OFFSET {
                if offset == start {
                    continue;
                }

                let Some(new_sig) = il2cpp::try_adjust_signature(&blamed_sig, offset) else {
                    continue;
                };

                let exists = il2cpp::FUNCTIONS_TABLE
                    .get()
                    .is_some_and(|m| m.contains_key(&new_sig))
                    || il2cpp::FUNCTIONS_TABLE_REFLECTION
                        .get()
                        .is_some_and(|m| m.contains_key(&new_sig));

                if exists {
                    log::debug!(
                        "=============================================================================================="
                    );
                    log::debug!("[Reflection] index corrected: {blamed_sig} -> {new_sig}");
                    log::debug!(
                        "=============================================================================================="
                    );
                    il2cpp::insert_fix(&blamed_sig, new_sig.clone());

                    il2cpp::clear_native_sigs();
                    if run_single_test(case).is_none() {
                        test_passed_after_fix = true;
                        break;
                    }
                }
            }

            if test_passed_after_fix {
                passed
                    .lock()
                    .unwrap()
                    .insert(case.display_id().into_owned());
                break;
            }
        }
    }

    let total = self_test::all_tests().len();

    let passed_set = passed.lock().unwrap();
    let failed_count = total - passed_set.len();
    if failed_count > 0 {
        log::warn!(
            "[Reflection] {failed_count}/{total} tests failed after self-heal. Passed: {}/{}",
            passed_set.len(),
            total
        );
        il2cpp::clear_fix_map();
        return false;
    }

    true
}

fn run_single_test(case: &self_test::TestCase) -> Option<String> {
    il2cpp::clear_native_sigs();

    let result = microseh::try_seh(|| catch_unwind(std::panic::AssertUnwindSafe(case.run)));

    match result {
        Err(seh_err) => Some(format!(
            "SEH exception in {}: {seh_err:?}",
            case.display_id()
        )),
        Ok(Err(panic)) => Some(format!("panic in {}: {panic:?}", case.display_id())),
        Ok(Ok(Err(err))) => Some(format!("{err:?}")),
        Ok(Ok(Ok(()))) => None,
    }
}

pub fn dump_methods_reflection_json() {
    let hm = il2cpp::FUNCTIONS_TABLE_REFLECTION
        .get()
        .unwrap()
        .iter()
        .map(|(k, v)| (k, format!("0x{:X}", v.rva())))
        .collect::<IndexMap<_, _>>();
    let _ = std::fs::write(
        "./DUMP/methods2.json",
        serde_json::to_string_pretty(&hm).unwrap(),
    );
}
