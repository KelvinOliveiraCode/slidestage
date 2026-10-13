//! Lista de arquivos recentes, persistida em JSON no diretório de config.

use std::path::PathBuf;

pub const MAX_RECENTES: usize = 12;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct RecentFile {
    pub path: String,
    #[serde(rename = "openedAt")]
    pub opened_at: u64,
}

pub struct Recents {
    items: Vec<RecentFile>,
    max: usize,
}

impl Recents {
    pub fn new(max: usize) -> Self {
        Self {
            items: Vec::new(),
            max,
        }
    }

    pub fn from_json(raw: &str) -> Self {
        let items = serde_json::from_str::<Vec<RecentFile>>(raw).unwrap_or_default();
        let mut r = Self::new(MAX_RECENTES);
        r.items = items.into_iter().take(MAX_RECENTES).collect();
        r
    }

    pub fn list(&self) -> &[RecentFile] {
        &self.items
    }

    /// Registra no topo, sem duplicar e respeitando o teto.
    pub fn record(&mut self, path: &str, opened_at: u64) {
        self.items.retain(|r| r.path != path);
        self.items.insert(
            0,
            RecentFile {
                path: path.to_string(),
                opened_at,
            },
        );
        self.items.truncate(self.max);
    }

    pub fn remove(&mut self, path: &str) {
        self.items.retain(|r| r.path != path);
    }

    /// Caminho do arquivo de recentes dentro do diretório de config do app.
    pub fn file_path(config_dir: PathBuf) -> PathBuf {
        config_dir.join("recentes.json")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registra_no_topo_e_deduplica() {
        let mut r = Recents::new(3);
        r.record("a.html", 1);
        r.record("b.html", 2);
        r.record("a.html", 3);
        assert_eq!(r.list().len(), 2);
        assert_eq!(r.list()[0].path, "a.html");
        assert_eq!(r.list()[1].path, "b.html");
    }

    #[test]
    fn respeita_o_teto() {
        let mut r = Recents::new(2);
        r.record("a.html", 1);
        r.record("b.html", 2);
        r.record("c.html", 3);
        assert_eq!(r.list().len(), 2);
        assert_eq!(r.list()[0].path, "c.html");
        assert_eq!(r.list()[1].path, "b.html");
    }

    #[test]
    fn json_invalido_vira_lista_vazia() {
        let r = Recents::from_json("{ não é lista }");
        assert!(r.list().is_empty());
    }

    #[test]
    fn remove_por_caminho() {
        let mut r = Recents::new(5);
        r.record("a.html", 1);
        r.remove("a.html");
        assert!(r.list().is_empty());
    }
}
