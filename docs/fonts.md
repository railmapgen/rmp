# Shared fonts

Noto Sans CJK SC, Arimo and Taipei Sans TC Beta use the toolkit host's
`/fonts/config.json`, alongside the existing MTR fonts. Sources, licenses and
subset generation belong to `railmapgen/railmapgen.github.io`.

Runtime owns registration, failed-face recovery through `loadFont()`, and valid
CSS serialization and resource embedding through `getFontCSS()`. RMP owns font
selection, mounted text, layout measurement and export timing.

RMP shares pending registration requests and lets later calls reach runtime.
Remote faces remain browser-loaded on demand; no code eagerly loads every
subset. Export embeds the runtime CSS unchanged and refreshes it after video
text changes. Unchanged-subset Base64 caching is deferred to a runtime follow-up.

`document.fonts.ready` waits for the current browser font/layout cycle, including
failed downloads. It does not guarantee that every subset required by the
current text loaded successfully.

Publish the shared font resources and runtime fixes before releasing this RMP
change, then update RMP's runtime dependency and lockfile to the fixed release.
