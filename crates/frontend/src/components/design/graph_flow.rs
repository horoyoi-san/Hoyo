use std::collections::{HashMap, HashSet};

use gpui::point;
use serde_json::Value;

use super::graph_types::*;
use super::graph_utils::{last_seg, preview_of, ptr_seg, short_type, truncate};

pub(crate) struct FlowBuilder<'a> {
    pub(crate) nodes: &'a mut Vec<GraphNode>,
    pub(crate) edges: &'a mut Vec<Edge>,
    pub(crate) budget: usize,
    pub(crate) truncated: bool,
}

impl FlowBuilder<'_> {
    pub(crate) fn add_container(&mut self, path: &str, label: &str) -> usize {
        let id = self.nodes.len();
        self.nodes.push(GraphNode {
            title: label.to_string(),
            subtitle: String::new(),
            cat: NodeCat::Container,
            fields: Vec::new(),
            path: path.to_string(),
            owner: id,
            world: point(0.0, 0.0),
            h: HEADER_H + 6.0,
        });
        id
    }

    fn make_node(&mut self, path: &str, value: &Value) -> usize {
        let type_name = value.get("$type").and_then(Value::as_str);
        let label = last_seg(path);
        let title = if let Some(t) = type_name {
            short_type(t)
        } else if let Some(n) = value.get("Name").and_then(Value::as_str) {
            n.to_string()
        } else if let Some(e) = value.get("Event").and_then(Value::as_str) {
            e.to_string()
        } else if let Some(k) = value.get("Key") {
            match k {
                Value::String(s) => s.clone(),
                Value::Object(o) => o
                    .get("Hash").map_or_else(|| "Key".to_string(), |h| format!("Key {h}")),
                _ => "Key".to_string(),
            }
        } else if !label.is_empty() {
            label.clone()
        } else {
            "node".to_string()
        };
        let cat = if type_name.is_none() {
            NodeCat::Container
        } else if title.starts_with("By")
            || title.contains("Predicate")
            || title.contains("Compare")
        {
            NodeCat::Predicate
        } else {
            NodeCat::Action
        };
        let fields = scalar_fields(value);
        let body_h = if fields.is_empty() {
            6.0
        } else {
            fields.len() as f32 * FIELD_H + BODY_PAD
        };
        let id = self.nodes.len();
        self.nodes.push(GraphNode {
            title,
            subtitle: String::new(),
            cat,
            fields,
            path: path.to_string(),
            owner: id,
            world: point(0.0, 0.0),
            h: HEADER_H + body_h,
        });
        id
    }

    pub(crate) fn build_node(
        &mut self,
        path: String,
        value: &Value,
        rest: &[(String, &Value)],
        depth: usize,
        top_y: f32,
        parent_owner: Option<usize>,
    ) -> (usize, f32) {
        let id = self.make_node(&path, value);
        let owner = parent_owner.unwrap_or(id);
        self.nodes[id].owner = owner;
        self.nodes[id].world.x = depth as f32 * (NODE_W + COL_GAP);
        self.nodes[id].world.y = top_y;
        let node_h = self.nodes[id].h;

        let mut cursor_y = top_y;
        let mut any_child = false;

        if let Some((np, nv)) = rest.first() {
            if self.nodes.len() < self.budget {
                let (cid, ch) =
                    self.build_node(np.clone(), nv, &rest[1..], depth + 1, top_y, Some(owner));
                self.edges.push(Edge {
                    from: id,
                    to: cid,
                    cat: WireCat::Sequence,
                });
                cursor_y = top_y + ch + ROW_GAP;
                any_child = true;
            } else {
                self.truncated = true;
            }
        }

        for (wcat, key) in collect_branches(value) {
            if self.nodes.len() >= self.budget {
                self.truncated = true;
                break;
            }
            let Some(items) = value.get(key.as_str()).and_then(Value::as_array) else {
                continue;
            };
            if items.is_empty() {
                continue;
            }
            let item_refs: Vec<(String, &Value)> = items
                .iter()
                .enumerate()
                .map(|(i, it)| (format!("{path}/{}/{i}", ptr_seg(&key)), it))
                .collect();
            let head_path = item_refs[0].0.clone();
            let head_val = item_refs[0].1;
            let (cid, ch) = self.build_node(
                head_path,
                head_val,
                &item_refs[1..],
                depth + 1,
                cursor_y,
                Some(owner),
            );
            self.edges.push(Edge {
                from: id,
                to: cid,
                cat: wcat,
            });
            cursor_y += ch + ROW_GAP;
            any_child = true;
        }

        let height = if any_child {
            (cursor_y - top_y - ROW_GAP).max(node_h)
        } else {
            node_h
        };
        (id, height)
    }

    pub(crate) fn resolve_refs(&mut self, doc: &Value, names: &HashMap<String, usize>) {
        if names.is_empty() {
            return;
        }
        let mut seen: HashSet<(usize, usize)> = HashSet::new();
        for ni in 0..self.nodes.len() {
            let owner = self.nodes[ni].owner;
            let refs = match doc.pointer(&self.nodes[ni].path) {
                Some(v) => find_refs(v),
                None => continue,
            };
            for rname in refs {
                if let Some(&target) = names.get(&rname)
                    && target != owner
                    && seen.insert((owner, target))
                {
                    self.edges.push(Edge {
                        from: owner,
                        to: target,
                        cat: WireCat::Reference,
                    });
                }
            }
        }
    }
}

fn find_refs(v: &Value) -> Vec<String> {
    let Some(obj) = v.as_object() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for key in ["AbilityName", "ModifierName"] {
        match obj.get(key) {
            Some(Value::String(s)) => out.push(s.clone()),
            Some(Value::Object(o)) => {
                if let Some(s) = o.get("Value").and_then(Value::as_str) {
                    out.push(s.to_string());
                }
            }
            _ => {}
        }
    }
    out
}

pub(crate) fn is_flow_array(v: &Value) -> bool {
    is_flow_array_depth(v, 6)
}

fn is_flow_array_depth(v: &Value, depth: u32) -> bool {
    v.as_array()
        .and_then(|a| a.first())
        .is_some_and(|first| is_flow_node(first, depth))
}

fn is_flow_node(v: &Value, depth: u32) -> bool {
    let Some(obj) = v.as_object() else {
        return false;
    };
    if obj.contains_key("$type") {
        return true;
    }
    depth > 0 && obj.values().any(|x| is_flow_array_depth(x, depth - 1))
}

fn scalar_fields(value: &Value) -> Vec<(String, String)> {
    let Some(obj) = value.as_object() else {
        return vec![("value".to_string(), preview_of(value))];
    };
    let mut out = Vec::new();
    for (k, v) in obj {
        if k == "$type" || k == "Name" {
            continue;
        }
        if is_flow_array(v) {
            continue;
        }
        let val = match v {
            Value::String(s) => truncate(&s.replace('\n', " "), 30),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Null => "null".to_string(),
            Value::Array(a) => format!("[{}]", a.len()),
            Value::Object(o) => o
                .get("$type")
                .and_then(Value::as_str).map_or_else(|| format!("{{{}}}", o.len()), short_type),
        };
        out.push((k.clone(), val));
    }
    if out.len() > MAX_FIELDS {
        let extra = out.len() - (MAX_FIELDS - 1);
        out.truncate(MAX_FIELDS - 1);
        out.push(("…".to_string(), format!("+{extra} fields")));
    }
    out
}

pub(crate) fn collect_branches(value: &Value) -> Vec<(WireCat, String)> {
    let Some(obj) = value.as_object() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for (k, v) in obj {
        if is_flow_array(v) {
            let cat = match k.as_str() {
                "SuccessTaskList" => WireCat::Success,
                "FailedTaskList" => WireCat::Failed,
                _ => WireCat::Branch,
            };
            out.push((cat, k.clone()));
        }
    }
    out
}
