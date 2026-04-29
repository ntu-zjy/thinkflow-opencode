图标文件需要单独生成。

请使用以下命令生成图标（需要准备一张 1024x1024 的 PNG 源图）：
  bun tauri icon path/to/icon.png

生成后将产生以下文件：
  32x32.png
  128x128.png
  128x128@2x.png
  icon.icns  (macOS)
  icon.ico   (Windows)
