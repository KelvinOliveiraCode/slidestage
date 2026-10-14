//! Codificacao base64 e resolucao de assets para o arquivo HTML único.
//!
//! O frontend descobre quais `src`/`href` apontam para arquivos locais;
//! o Rust le esses arquivos, detecta o tipo e devolve data URLs prontas
//! para embutir no documento.

const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// Codifica bytes em base64 padrão (RFC 4648).
pub fn encode_base64(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let n = (chunk[0] as u32) << 16
            | (chunk.get(1).copied().unwrap_or(0) as u32) << 8
            | chunk.get(2).copied().unwrap_or(0) as u32;
        out.push(TABLE[(n >> 18) as usize & 63] as char);
        out.push(TABLE[(n >> 12) as usize & 63] as char);
        match chunk.len() {
            1 => {
                out.push('=');
                out.push('=');
            }
            2 => {
                out.push(TABLE[(n >> 6) as usize & 63] as char);
                out.push('=');
            }
            _ => {
                out.push(TABLE[(n >> 6) as usize & 63] as char);
                out.push(TABLE[n as usize & 63] as char);
            }
        }
    }
    out
}

/// Adivinha o MIME pela extensao; desconhecido vira octet-stream.
pub fn guess_mime(path: &str) -> &'static str {
    let ext = path
        .rsplit('/')
        .next()
        .unwrap_or(path)
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" | "mjs" => "text/javascript",
        "json" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "mp4" => "vídeo/mp4",
        "webm" => "vídeo/webm",
        "mp3" => "áudio/mpeg",
        "wav" => "áudio/wav",
        "ogg" => "áudio/ogg",
        "pdf" => "application/pdf",
        "txt" => "text/plain",
        _ => "application/octet-stream",
    }
}

/// Decodifica %XX; outros caracteres passam intactos.
pub fn percent_decode(raw: &str) -> String {
    let bytes = raw.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
            if let Some(hex) = hex {
                if let Ok(v) = u8::from_str_radix(hex, 16) {
                    out.push(v);
                    i += 3;
                    continue;
                }
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8(out).unwrap_or_else(|_| raw.to_string())
}

/// Remove query string e fragmento de um caminho relativo.
fn strip_query(path: &str) -> &str {
    path.split(['?', '#']).next().unwrap_or(path)
}

/// true quando o valor não pode ser lido do disco (URL absoluta, data:, ancora).
pub fn is_remote(original: &str) -> bool {
    let v = original.trim();
    v.is_empty()
        || v.starts_with("data:")
        || v.starts_with("http://")
        || v.starts_with("https://")
        || v.starts_with("//")
        || v.starts_with('#')
        || v.contains("://")
}

/// Resolve um caminho relativo do documento contra o diretório do arquivo.
/// Canonicaliza o caminho e garante que está dentro do diretório base permitido
/// ou no diretório home do usuário.
pub fn resolve_asset(base_dir: &str, original: &str) -> Option<String> {
    if is_remote(original) {
        return None;
    }
    let clean = percent_decode(strip_query(original.trim()));
    if clean.is_empty() {
        return None;
    }
    let base_path = std::path::Path::new(base_dir);
    let joined = if clean.starts_with('/') || clean.starts_with('\\') {
        std::path::PathBuf::from(&clean)
    } else {
        base_path.join(&clean)
    };

    // Try to canonicalize to resolve symlinks and normalize.
    // If the file doesn't exist yet, fall back to lexical normalization
    // but still check for path traversal attempts.
    let canonical_base = std::fs::canonicalize(base_path).ok();
    let canonical_joined = std::fs::canonicalize(&joined).ok();

    let (base_for_check, joined_for_check) = match (canonical_base, canonical_joined) {
        (Some(cb), Some(cj)) => (cb, cj),
        _ => {
            // Fallback: use lexical normalization (no symlink resolution)
            // but still validate the path doesn't escape the base directory
            let lex_base = std::path::Path::new(base_dir).join(".").components().collect::<std::path::PathBuf>();
            let lex_joined = joined.components().collect::<std::path::PathBuf>();
            (lex_base, lex_joined)
        }
    };

    // Ensure the resolved path is under the base directory
    let under_base = joined_for_check.starts_with(&base_for_check);

    // Also allow paths under user home directory (for shared assets)
    let under_home = dirs::home_dir()
        .and_then(|home| std::fs::canonicalize(&home).ok())
        .map(|canonical_home| joined_for_check.starts_with(&canonical_home))
        .unwrap_or(false);

    if !under_base && !under_home {
        return None;
    }

    Some(joined.to_string_lossy().replace('\\', "/"))
}

/// Maximum asset size for embedding (10 MB default).
/// Can be overridden by setting the SLIDESTAGE_MAX_ASSET_SIZE_MB environment variable.
pub fn max_asset_size() -> u64 {
    std::env::var("SLIDESTAGE_MAX_ASSET_SIZE_MB")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .map(|mb| mb * 1024 * 1024)
        .unwrap_or(10 * 1024 * 1024) // 10 MB default
}

/// Monta a data URL completa de um arquivo, com limite de tamanho.
pub fn data_url_for(path: &str) -> Result<String, String> {
    data_url_for_with_limit(path, max_asset_size())
}

/// Monta a data URL completa de um arquivo com limite de tamanho customizado.
pub fn data_url_for_with_limit(path: &str, max_size: u64) -> Result<String, String> {
    let metadata = std::fs::metadata(path).map_err(|e| format!("não foi possível ler metadados de {path}: {e}"))?;
    let file_size = metadata.len();
    if file_size > max_size {
        return Err(format!(
            "arquivo {path} excede o limite de {} bytes ({} MB)",
            max_size,
            max_size / (1024 * 1024)
        ));
    }
    let bytes = std::fs::read(path).map_err(|e| format!("não foi possível ler {path}: {e}"))?;
    Ok(format!(
        "data:{};base64,{}",
        guess_mime(path),
        encode_base64(&bytes)
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codifica_base64_padrao() {
        assert_eq!(encode_base64(b""), "");
        assert_eq!(encode_base64(b"f"), "Zg==");
        assert_eq!(encode_base64(b"fo"), "Zm8=");
        assert_eq!(encode_base64(b"foo"), "Zm9v");
        assert_eq!(encode_base64(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn identifica_mime_por_extensao() {
        assert_eq!(guess_mime("foto.PNG"), "image/png");
        assert_eq!(guess_mime("pasta/a.svg"), "image/svg+xml");
        assert_eq!(guess_mime("semextensao"), "application/octet-stream");
    }

    #[test]
    fn decodifica_percent() {
        assert_eq!(percent_decode("minha%20foto.png"), "minha foto.png");
        assert_eq!(percent_decode("sem-acento"), "sem-acento");
    }

    #[test]
    fn ignora_urls_remotas() {
        assert!(is_remote("https://exemplo.com/a.png"));
        assert!(is_remote("data:image/png;base64,AAA"));
        assert!(is_remote("#slide-2"));
        assert!(!is_remote("img/foto.png"));
        assert_eq!(
            resolve_asset("C:/deck", "img/foto.png"),
            Some("C:/deck/img/foto.png".into())
        );
        assert_eq!(
            resolve_asset("C:/deck", "img/foto.png?v=2"),
            Some("C:/deck/img/foto.png".into())
        );
        assert_eq!(resolve_asset("C:/deck", "https://x.com/a.png"), None);
    }

    #[test]
    fn data_url_rejeita_arquivo_grande() {
        use std::fs;
        use std::io::Write;
        let dir = tempfile::tempdir().unwrap();
        let large_file = dir.path().join("large.bin");
        let mut f = fs::File::create(&large_file).unwrap();
        // Write 11 MB (over the 10 MB default limit)
        f.write_all(&vec![0u8; 11 * 1024 * 1024]).unwrap();
        let result = data_url_for(&large_file.to_string_lossy());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("excede o limite"));
    }

    #[test]
    fn data_url_aceita_arquivo_pequeno_com_limite_custom() {
        use std::fs;
        let dir = tempfile::tempdir().unwrap();
        let small_file = dir.path().join("small.txt");
        fs::write(&small_file, b"hello").unwrap();
        // Use a 1-byte limit - should fail
        let result = data_url_for_with_limit(&small_file.to_string_lossy(), 1);
        assert!(result.is_err());
        // Use a 100-byte limit - should succeed
        let result = data_url_for_with_limit(&small_file.to_string_lossy(), 100);
        assert!(result.is_ok());
        assert!(result.unwrap().starts_with("data:text/plain;base64,"));
    }
}
