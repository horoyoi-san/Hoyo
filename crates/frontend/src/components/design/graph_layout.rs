use std::collections::HashMap;

use serde_json::Value;

use super::graph_types::*;
use super::graph_flow::FlowBuilder;
use super::graph_utils::{ptr_seg, truncate};

#[derive(Clone, Copy, PartialEq, Eq)]
enum ConfigKind {
    Ability,
    Character,
    AdventureModifier,
    Generic,
}

fn detect_kind(rel: &str) -> ConfigKind {
    let p = rel.replace('\\', "/");
    if p.contains("ConfigAbility") {
        ConfigKind::Ability
    } else if p.contains("ConfigAdventureModifier") {
        ConfigKind::AdventureModifier
    } else if p.contains("ConfigCharacter") {
        ConfigKind::Character
    } else {
        ConfigKind::Generic
    }
}

impl GraphState {
    pub(crate) fn clear(&mut self) {
        self.source = None;
        self.nodes.clear();
        self.edges.clear();
        self.doc = None;
        self.flow = false;
        self.truncated = false;
        self.error = None;
    }

    pub(crate) fn build(&mut self, idx: usize, rel: &str, text: &str) {
        self.clear();
        self.source = Some(idx);

        let value: Value = match serde_json::from_str(text) {
            Ok(v) => v,
            Err(err) => {
                self.error = Some(truncate(&err.to_string(), 160));
                return;
            }
        };

        let kind = detect_kind(rel);
        self.flow = kind != ConfigKind::Generic;
        let budget = if self.flow {
            MAX_FLOW_NODES
        } else {
            MAX_GENERIC_NODES
        };

        let truncated = {
            let mut b = FlowBuilder {
                nodes: &mut self.nodes,
                edges: &mut self.edges,
                budget,
                truncated: false,
            };
            let mut names: HashMap<String, usize> = HashMap::new();

            match kind {
                ConfigKind::Character | ConfigKind::Generic => {
                    b.build_node(String::new(), &value, &[], 0, 0.0, None);
                }
                _ => {
                    let file_id = b.add_container("", &file_stem(rel));

                    let mut groups: GroupList<'_> = Vec::new();
                    if matches!(kind, ConfigKind::Ability) {
                        if let Some(arr) = value.get("AbilityList").and_then(Value::as_array) {
                            let items = arr
                                .iter()
                                .enumerate()
                                .map(|(i, a)| {
                                    let name = a
                                        .get("Name")
                                        .and_then(Value::as_str)
                                        .unwrap_or("Ability")
                                        .to_string();
                                    (format!("/AbilityList/{i}"), a, name)
                                })
                                .collect();
                            groups.push(("AbilityList".into(), items));
                        }
                        if let Some(map) = value.get("GlobalModifiers").and_then(Value::as_object) {
                            let items = map
                                .iter()
                                .map(|(k, m)| {
                                    (format!("/GlobalModifiers/{}", ptr_seg(k)), m, k.clone())
                                })
                                .collect();
                            groups.push(("GlobalModifiers".into(), items));
                        }
                    } else if let Some(map) = value.get("ModifierMap").and_then(Value::as_object) {
                        let items = map
                            .iter()
                            .map(|(k, m)| {
                                (format!("/ModifierMap/{}", ptr_seg(k)), m, k.clone())
                            })
                            .collect();
                        groups.push(("ModifierMap".into(), items));
                    }

                    let mut gy = 0.0f32;
                    for (glabel, items) in groups {
                        let gpath = format!("/{glabel}");
                        let gid = b.add_container(&gpath, &glabel);
                        b.nodes[gid].world.x = NODE_W + COL_GAP;
                        b.edges.push(Edge {
                            from: file_id,
                            to: gid,
                            cat: WireCat::Branch,
                        });
                        let group_top = gy;
                        for (apath, aval, aname) in items {
                            if b.nodes.len() >= b.budget {
                                b.truncated = true;
                                break;
                            }
                            let (aid, h) = b.build_node(apath, aval, &[], 2, gy, None);
                            b.edges.push(Edge {
                                from: gid,
                                to: aid,
                                cat: WireCat::Branch,
                            });
                            if !aname.is_empty() {
                                names.insert(aname, aid);
                            }
                            gy += h + ROW_GAP;
                        }
                        let group_h = (gy - group_top - ROW_GAP).max(0.0);
                        let gh = b.nodes[gid].h;
                        b.nodes[gid].world.y = group_top + ((group_h - gh) / 2.0).max(0.0);
                        gy += ROW_GAP * 1.5;
                    }
                    let total_h = (gy - ROW_GAP * 1.5).max(0.0);
                    let fh = b.nodes[file_id].h;
                    b.nodes[file_id].world.y = ((total_h - fh) / 2.0).max(0.0);
                }
            }

            b.resolve_refs(&value, &names);
            b.truncated
        };

        self.truncated = truncated;
        self.doc = Some(value);
    }
}

fn file_stem(rel: &str) -> String {
    let name = rel
        .replace('\\', "/")
        .rsplit('/')
        .next()
        .unwrap_or(rel)
        .to_string();
    name.strip_suffix(".json").unwrap_or(&name).to_string()
}
