//! Testes de integracao dos comandos Rust do SlideStage.
//!
//! Cobrem o caminho de disco: ler, escrever e embutir assets no arquivo
//! unico. Os comandos que abrem dialogo nativo (`open_deck_dialog`,
//! `export_deck_dialog`, `publish_deck_dialog`, `pick_image_dialog`) nao
//! sao testados aqui porque dependem de uma janela do app: seguem o mesmo
//! padrao (dialogo + IO + Result<String>) e usam estas mesmas funcoes.

use std::fs;
use std::path::PathBuf;

use slidestage_lib::{assets_inline, disk_read, disk_write};

fn temp_dir(name: &str) -> PathBuf {
    let mut dir = std::env::temp_dir();
    dir.push(format!("slidestage-it-{name}-{}", std::process::id()));
    fs::create_dir_all(&dir).expect("criar diretorio temporario");
    dir
}

#[test]
fn escreve_e_le_o_deck() {
    let dir = temp_dir("roundtrip");
    let path = dir.join("deck.html");
    let caminho = path.to_string_lossy();
    let html = "<!doctype html><html><body><h1>Oi</h1></body></html>";
    disk_write(&caminho, html).expect("escrever");
    let back = disk_read(&caminho).expect("ler");
    assert_eq!(back, html);
    fs::remove_dir_all(&dir).ok();
}

#[test]
fn erro_de_leitura_vem_com_caminho() {
    let err = disk_read("C:/caminho/que/nao/existe.html").expect_err("deveria falhar");
    assert!(
        err.contains("C:/caminho/que/nao/existe.html"),
        "erro: {err}"
    );
    assert!(err.contains("não foi possível"), "erro: {err}");
}

#[test]
fn embute_imagem_local_como_data_url() {
    let dir = temp_dir("inline");
    let png = dir.join("foto.png");
    // PNG valido minimo: assinatura + IHDR + IDAT + IEND.
    let bytes: [u8; 67] = [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F,
        0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];
    fs::write(&png, bytes).expect("escrever png");

    let originais = vec![
        "foto.png".to_string(),
        "https://exemplo.com/x.png".to_string(),
        "nao-existe.png".to_string(),
    ];
    let refs = assets_inline(&dir.to_string_lossy(), &originais).expect("inline");

    assert_eq!(refs.len(), 1, "so o arquivo local existente entra");
    assert_eq!(refs[0].original, "foto.png");
    assert!(
        refs[0].data_url.starts_with("data:image/png;base64,"),
        "url: {}",
        refs[0].data_url
    );
    // base64 de 67 bytes: 23 grupos de 4 = 92 caracteres.
    assert_eq!(refs[0].data_url.len(), "data:image/png;base64,".len() + 92);

    fs::remove_dir_all(&dir).ok();
}
