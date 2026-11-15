package com.nyxplayer.nativebridge

import android.content.Context

/**
 * Vídeo leve na TV (versão própria): o chip da TV decodifica e desenha o vídeo direto na tela
 * (`vo=mediacodec_embed`, `hwdec=mediacodec`), sem a etapa de desenho pela GPU do mpv. Em chips de
 * TV essa etapa fazia um canal H.264 1080p engasgar ("fonte pesada demais").
 *
 * Ligado por padrão na TV. Para voltar ao modo normal (se algum canal ficar sem imagem):
 *   adb shell am start -a android.intent.action.VIEW -d "tvaovivo://ajuste?video=normal"
 * e para religar: ...?video=leve
 */
internal object VideoMode {
    private const val PREFS = "tvaovivo_video"
    private const val KEY_LIGHT = "light"

    fun isLight(context: Context, television: Boolean): Boolean =
        television && prefs(context).getBoolean(KEY_LIGHT, true)

    fun setLight(context: Context, light: Boolean) {
        prefs(context).edit().putBoolean(KEY_LIGHT, light).apply()
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
