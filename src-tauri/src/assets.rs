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
pub fn resolve_asset(base_dir: &str, original: &str) -> Option<String> {
    if is_remote(original) {
        return None;
    }
    let clean = percent_decode(strip_query(original.trim()));
    if clean.is_empty() {
        return None;
    }
    let joined = if clean.starts_with('/') || clean.starts_with('\\') {
        std::path::PathBuf::from(&clean)
    } else {
        std::path::Path::new(base_dir).join(&clean)
    };
    // Barra para frente sempre: o frontend guarda o caminho como texto e o
    // Windows aceita '/' tanto para ler quanto para exibir.
    Some(joined.to_string_lossy().replace('\\', "/"))
}

/// Monta a data URL completa de um arquivo.
pub fn data_url_for(path: &str) -> Result<String, String> {
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
}
