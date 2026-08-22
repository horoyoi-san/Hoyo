use std::collections::{BTreeMap, HashSet};

use gpui::Context;
use unpacker::AssetEntry;

use super::UnpackerPage;

#[derive(Default)]
pub(super) struct TreeNode {
    children: BTreeMap<String, TreeNode>,
    files: Vec<usize>,
}

pub(super) enum Row {
    Folder {
        path: String,
        label: String,
        depth: usize,
        expanded: bool,
    },
    File {
        asset_idx: usize,
        label: String,
        depth: usize,
    },
}

impl UnpackerPage {
    pub(super) fn rebuild_tree(&mut self, cx: &mut Context<Self>) {
        let q = self.search_input.read(cx).value().trim().to_lowercase();
        self.search_active = !q.is_empty();

        let indices: Vec<usize> = if q.is_empty() {
            (0..self.assets.len()).collect()
        } else {
            self.assets
                .iter()
                .enumerate()
                .filter(|(_, e)| {
                    e.container.to_lowercase().contains(&q) || e.name.to_lowercase().contains(&q)
                })
                .map(|(i, _)| i)
                .collect()
        };

        self.tree = build_tree(&self.assets, &indices);
        self.rebuild_visible();
    }

    pub(super) fn rebuild_visible(&mut self) {
        let mut out = Vec::new();
        walk_tree(
            &self.tree,
            "",
            0,
            &self.expanded,
            self.search_active,
            &self.assets,
            &mut out,
        );
        self.visible = out;
    }

    pub(super) fn toggle_folder(&mut self, path: &str, cx: &mut Context<Self>) {
        if !self.expanded.remove(path) {
            self.expanded.insert(path.to_string());
        }
        self.rebuild_visible();
        cx.notify();
    }
}

fn build_tree(assets: &[AssetEntry], indices: &[usize]) -> TreeNode {
    let mut root = TreeNode::default();
    for &idx in indices {
        let parts: Vec<&str> = assets[idx]
            .container
            .split('/')
            .filter(|s| !s.is_empty())
            .collect();
        if parts.len() <= 1 {
            root.files.push(idx);
            continue;
        }
        let mut node = &mut root;
        for p in &parts[..parts.len() - 1] {
            node = node.children.entry((*p).to_string()).or_default();
        }
        node.files.push(idx);
    }
    root
}

fn join(prefix: &str, name: &str) -> String {
    if prefix.is_empty() {
        name.to_string()
    } else {
        format!("{prefix}/{name}")
    }
}

pub(super) fn file_label(entry: &AssetEntry) -> String {
    entry
        .container
        .rsplit('/')
        .find(|s| !s.is_empty())
        .map(str::to_string)
        .or_else(|| (!entry.name.is_empty()).then(|| entry.name.clone()))
        .unwrap_or_else(|| format!("#{}", entry.path_id))
}

fn walk_tree(
    node: &TreeNode,
    prefix: &str,
    depth: usize,
    expanded: &HashSet<String>,
    force_open: bool,
    assets: &[AssetEntry],
    out: &mut Vec<Row>,
) {
    for (name, child) in &node.children {
        let mut label = name.clone();
        let mut full = join(prefix, name);
        let mut cur = child;
        while cur.files.is_empty()
            && cur.children.len() == 1
            && let Some((cn, cc)) = cur.children.iter().next()
        {
            label = format!("{label}/{cn}");
            full = join(&full, cn);
            cur = cc;
        }
        let open = force_open || expanded.contains(&full);
        out.push(Row::Folder {
            path: full.clone(),
            label,
            depth,
            expanded: open,
        });
        if open {
            walk_tree(cur, &full, depth + 1, expanded, force_open, assets, out);
        }
    }

    let mut file_rows: Vec<(String, usize)> = node
        .files
        .iter()
        .map(|&i| (file_label(&assets[i]), i))
        .collect();
    file_rows.sort();
    for (label, idx) in file_rows {
        out.push(Row::File {
            asset_idx: idx,
            label,
            depth,
        });
    }
}
