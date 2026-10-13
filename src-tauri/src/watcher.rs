//! Watch de arquivo: avisa o frontend quando o HTML muda no disco
//! (por exemplo, editado no VS Code enquanto o SlideStage está aberto).

use std::path::Path;
use std::sync::mpsc::{channel, Sender};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};

pub struct WatchHandle {
    stop: Sender<()>,
}

impl Drop for WatchHandle {
    fn drop(&mut self) {
        let _ = self.stop.send(());
    }
}

/// Janela mínima entre avisos para o mesmo arquivo.
const DEBOUNCE: Duration = Duration::from_millis(400);

pub fn spawn_watch(app: tauri::AppHandle, file_path: &Path) -> Result<WatchHandle, String> {
    let watched = file_path.to_path_buf();
    let watched_for_event = watched.clone();
    let last_emit = Mutex::new(Instant::now() - DEBOUNCE);

    let mut watcher: RecommendedWatcher =
        notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
            let Ok(event) = res else { return };
            let relevante = matches!(
                event.kind,
                EventKind::Modify(_) | EventKind::Create(_) | EventKind::Any
            );
            if !relevante {
                return;
            }
            let toca_no_arquivo = event.paths.iter().any(|p| p == &watched_for_event);
            if !toca_no_arquivo {
                return;
            }
            let agora = Instant::now();
            {
                let mut last = last_emit.lock().unwrap_or_else(|e| e.into_inner());
                if agora.duration_since(*last) < DEBOUNCE {
                    return;
                }
                *last = agora;
            }
            let _ = tauri::Emitter::emit(
                &app,
                "deck-file-changed",
                watched_for_event.to_string_lossy().into_owned(),
            );
        })
        .map_err(|e| format!("falha ao criar o observador de arquivo: {e}"))?;

    watcher
        .watch(&watched, RecursiveMode::NonRecursive)
        .map_err(|e| format!("falha ao observar {}: {e}", watched.display()))?;

    let (stop_tx, stop_rx) = channel::<()>();
    std::thread::spawn(move || {
        let _ = stop_rx.recv();
        drop(watcher);
    });

    Ok(WatchHandle { stop: stop_tx })
}
