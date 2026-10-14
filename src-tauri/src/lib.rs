//! SlideStage: nucleo Rust do app. Dono do disco: le/escreve o deck,
//! embute assets locais no arquivo único, observa mudanca externa e
//! guarda os arquivos recentes. Toda lógica testavel fica nos módulos.

mod assets;
mod recents;
mod watcher;

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use recents::RecentFile;

pub struct AppState {
    watchers: Mutex<HashMap<String, watcher::WatchHandle>>,
    recents: Mutex<recents::Recents>,
}

#[derive(serde::Serialize)]
pub struct DeckFile {
    pub path: String,
    pub html: String,
}

#[derive(serde::Serialize)]
pub struct AssetRef {
    pub original: String,
    #[serde(rename = "dataUrl")]
    pub data_url: String,
}

fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("diretório de config indisponível: {e}"))
}

/// Le o arquivo do disco. Comando fino: a logica vive aqui, testavel.
pub fn disk_read(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("não foi possível abrir {path}: {e}"))
}

pub fn disk_write(path: &str, contents: &str) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| format!("não foi possível salvar {path}: {e}"))
}

#[tauri::command]
fn read_deck(path: String) -> Result<String, String> {
    disk_read(&path)
}

#[tauri::command]
fn write_deck(path: String, contents: String) -> Result<(), String> {
    disk_write(&path, &contents)
}

#[tauri::command]
fn open_deck_dialog(app: AppHandle) -> Result<Option<DeckFile>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .set_title("Abrir HTML no SlideStage")
        .add_filter("Página HTML", &["html", "htm", "txt"])
        .pick_file(move |picked| {
            let _ = tx.send(picked);
        });
    let Some(picked) = rx.recv().map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    let html = fs::read_to_string(&path)
        .map_err(|e| format!("não foi possível abrir {}: {e}", path.display()))?;
    Ok(Some(DeckFile {
        path: path.to_string_lossy().into_owned(),
        html,
    }))
}

#[tauri::command]
fn export_deck_dialog(
    app: AppHandle,
    default_name: String,
    contents: String,
) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .set_title("Salvar página HTML única")
        .set_file_name(&default_name)
        .add_filter("Página HTML", &["html", "htm"])
        .save_file(move |picked| {
            let _ = tx.send(picked);
        });
    let Some(picked) = rx.recv().map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    fs::write(&path, &contents)
        .map_err(|e| format!("não foi possível salvar {}: {e}", path.display()))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Mesmo dialogo do export, pensado para publicar: sugere index.html,
/// o nome que o GitHub Pages serve sozinho.
#[tauri::command]
fn publish_deck_dialog(app: AppHandle, contents: String) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .set_title("Publicar: salvar index.html do deck")
        .set_file_name("index.html")
        .add_filter("Página HTML", &["html", "htm"])
        .save_file(move |picked| {
            let _ = tx.send(picked);
        });
    let Some(picked) = rx.recv().map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    fs::write(&path, &contents)
        .map_err(|e| format!("não foi possível publicar {}: {e}", path.display()))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Le os arquivos locais referenciados pelo documento e devolve data URLs,
/// para o export carregar tudo em um arquivo só.
/// Le os arquivos locais referenciados pelo documento e devolve data URLs.
pub fn assets_inline(base_dir: &str, originals: &[String]) -> Result<Vec<AssetRef>, String> {
    let mut out = Vec::with_capacity(originals.len());
    for original in originals {
        let Some(resolved) = assets::resolve_asset(base_dir, original) else {
            continue;
        };
        let Ok(data_url) = assets::data_url_for(&resolved) else {
            continue;
        };
        out.push(AssetRef {
            original: original.clone(),
            data_url,
        });
    }
    Ok(out)
}

#[tauri::command]
fn inline_assets(base_dir: String, originals: Vec<String>) -> Result<Vec<AssetRef>, String> {
    assets_inline(&base_dir, &originals)
}

/// Escolhe uma imagem do disco e devolve como data URL, para o slide
/// continuar funcionando em um arquivo HTML único.
#[tauri::command]
fn pick_image_dialog(app: AppHandle) -> Result<Option<AssetRef>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .set_title("Escolher imagem")
        .add_filter(
            "Imagem",
            &["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "bmp"],
        )
        .pick_file(move |picked| {
            let _ = tx.send(picked);
        });
    let Some(picked) = rx.recv().map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    let data_url = assets::data_url_for(&path.to_string_lossy())?;
    Ok(Some(AssetRef {
        original: path.to_string_lossy().into_owned(),
        data_url,
    }))
}

#[tauri::command]
fn open_in_browser(app: AppHandle, path: String) -> Result<(), String> {
    // http, https, mailto and tel pass as-is: the system resolves them.
    if path.starts_with("http://")
        || path.starts_with("https://")
        || path.starts_with("mailto:")
        || path.starts_with("tel:")
    {
        app.opener()
            .open_path(path, None::<&str>)
            .map_err(|e| format!("não foi possível abrir no navegador: {e}"))?;
        return Ok(());
    }

    // For file paths, validate they are under allowed directories
    let path_buf = std::path::PathBuf::from(&path);
    let canonical_path = std::fs::canonicalize(&path_buf)
        .map_err(|e| format!("não foi possível resolver caminho {path}: {e}"))?;

    // Check if path is under user home directory
    let home_dir = dirs::home_dir().ok_or("não foi possível obter diretório home")?;
    let canonical_home = std::fs::canonicalize(&home_dir)
        .map_err(|e| format!("não foi possível resolver home: {e}"))?;

    // Also allow paths under common project directories (current working dir, etc.)
    let cwd = std::env::current_dir()
        .map_err(|e| format!("não foi possível obter diretório atual: {e}"))?;
    let canonical_cwd = std::fs::canonicalize(&cwd)
        .map_err(|e| format!("não foi possível resolver diretório atual: {e}"))?;

    let under_home = canonical_path.starts_with(&canonical_home);
    let under_cwd = canonical_path.starts_with(&canonical_cwd);

    if !under_home && !under_cwd {
        return Err(format!(
            "caminho não permitido: {path} (fora de diretórios permitidos)"
        ));
    }

    let url = format!("file:///{}", canonical_path.to_string_lossy().replace('\\', "/"));
    app.opener()
        .open_path(url, None::<&str>)
        .map_err(|e| format!("não foi possível abrir no navegador: {e}"))
}

/// Abre a pasta do arquivo no explorador de arquivos.
#[tauri::command]
fn reveal_deck_dir(app: AppHandle, path: String) -> Result<(), String> {
    let dir = std::path::Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or(path);
    app.opener()
        .open_path(dir, None::<&str>)
        .map_err(|e| format!("não foi possível abrir a pasta: {e}"))
}

#[tauri::command]
fn watch_deck(app: AppHandle, state: State<'_, AppState>, path: String) -> Result<(), String> {
    let handle = watcher::spawn_watch(app, std::path::Path::new(&path))?;
    let mut watchers = state.watchers.lock().unwrap_or_else(|e| e.into_inner());
    watchers.insert(path, handle);
    Ok(())
}

#[tauri::command]
fn unwatch_deck(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let mut watchers = state.watchers.lock().unwrap_or_else(|e| e.into_inner());
    watchers.remove(&path);
    Ok(())
}

#[tauri::command]
fn recents_list(state: State<'_, AppState>) -> Vec<RecentFile> {
    let recents = state.recents.lock().unwrap_or_else(|e| e.into_inner());
    recents.list().to_vec()
}

#[tauri::command]
fn recents_record(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<RecentFile>, String> {
    let agora = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let snapshot = {
        let mut recents = state.recents.lock().unwrap_or_else(|e| e.into_inner());
        recents.record(&path, agora);
        recents.list().to_vec()
    };
    persistir_recents(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn recents_remove(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<RecentFile>, String> {
    let snapshot = {
        let mut recents = state.recents.lock().unwrap_or_else(|e| e.into_inner());
        recents.remove(&path);
        recents.list().to_vec()
    };
    persistir_recents(&app, &snapshot)?;
    Ok(snapshot)
}

/// Abre a janela do apresentador (se não estiver aberta).
#[tauri::command]
fn open_presenter_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("presenter") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Fecha a janela do apresentador (se estiver aberta).
#[tauri::command]
fn close_presenter_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("presenter") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Verifica se a janela do apresentador está aberta.
#[tauri::command]
fn is_presenter_window_open(app: AppHandle) -> Result<bool, String> {
    Ok(app.get_webview_window("presenter").map(|w| w.is_visible().unwrap_or(false)).unwrap_or(false))
}

fn persistir_recents(app: &AppHandle, items: &[RecentFile]) -> Result<(), String> {
    let dir = config_dir(app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string(items).unwrap_or_else(|_| "[]".into());
    fs::write(recents::Recents::file_path(dir), json).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            watchers: Mutex::new(HashMap::new()),
            recents: Mutex::new(recents::Recents::new(recents::MAX_RECENTES)),
        })
        .setup(|app| {
            let handle = app.handle().clone();
            if let Ok(dir) = config_dir(&handle) {
                let file = recents::Recents::file_path(dir);
                if let Ok(raw) = fs::read_to_string(&file) {
                    let loaded = recents::Recents::from_json(&raw);
                    if let Some(state) = handle.try_state::<AppState>() {
                        let mut recents = state.recents.lock().unwrap_or_else(|e| e.into_inner());
                        *recents = loaded;
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_deck,
            write_deck,
            open_deck_dialog,
            export_deck_dialog,
            publish_deck_dialog,
            inline_assets,
            pick_image_dialog,
            open_in_browser,
            reveal_deck_dir,
            watch_deck,
            unwatch_deck,
            recents_list,
            recents_record,
            recents_remove,
            open_presenter_window,
            close_presenter_window,
            is_presenter_window_open,
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o SlideStage");
}
