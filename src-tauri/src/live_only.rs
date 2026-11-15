//! Modo Só TV (versão própria) : apenas a TV ao vivo é baixada e gravada no catálogo.
//! Filmes e séries ficam com outro app (Nuvio). Mesmo valor que `LIVE_ONLY` em
//! `src/config/liveOnly.ts`.

/// Ligado : filmes e séries não são pedidos ao servidor (Xtream) nem gravados (M3U).
pub const LIVE_ONLY: bool = true;

/// Lista do catálogo que o modo Só TV não baixa
pub fn skips_list(list: &str) -> bool {
    LIVE_ONLY && (list == "movies" || list == "series")
}
