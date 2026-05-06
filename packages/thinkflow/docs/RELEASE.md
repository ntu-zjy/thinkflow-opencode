# ThinkFlow 版本发布手册

本文档记录 ThinkFlow 桌面版的完整发布流程，每次需要发布新版本时，将此文档交给 Claude 即可全自动完成。

---

## 发布前检查清单

在执行发布流程前，确认以下各项均已完成：

- [ ] 所有功能代码已提交并推送到 `thinkflow-mvp1` 分支
- [ ] `bun run typecheck` 零错误
- [ ] `bunx vitest run` 全部通过
- [ ] `tauri.conf.json` 中的 `version` 已更新为新版本号
- [ ] DMG 文件已在本地成功构建

---

## 版本号规范

采用语义化版本 `vMAJOR.MINOR.PATCH`：

| 场景 | 示例 | 说明 |
|------|------|------|
| 重大重构 / 不兼容变更 | `v1.0.0` | MAJOR +1 |
| 新增功能 | `v0.2.0` | MINOR +1 |
| Bug 修复 / 小改动 | `v0.1.1` | PATCH +1 |

---

## 完整发布流程（交给 Claude 执行）

### 第一步：更新版本号

修改 `packages/thinkflow/desktop/src-tauri/tauri.conf.json`：

```json
{
  "version": "0.2.0"
}
```

### 第二步：构建前端

```bash
cd packages/thinkflow/app
bun run build
```

### 第三步：构建桌面版 .app

```bash
cd packages/thinkflow/desktop
bun tauri build --no-bundle
```

> `--no-bundle` 只编译 .app，跳过 DMG 打包脚本（避免 Tauri 自带脚本因残留文件失败）

### 第四步：手动打包 DMG

```bash
APP_PATH="packages/thinkflow/desktop/src-tauri/target/release/bundle/macos/ThinkFlow.app"
DMG_OUT="packages/thinkflow/desktop/src-tauri/target/release/bundle/dmg/ThinkFlow_<VERSION>_aarch64.dmg"
TEMP_DIR=$(mktemp -d)
cp -R "$APP_PATH" "$TEMP_DIR/"
hdiutil create -volname "ThinkFlow" -srcfolder "$TEMP_DIR" -ov -format UDZO "$DMG_OUT"
rm -rf "$TEMP_DIR"
hdiutil verify "$DMG_OUT"
```

### 第五步：提交版本号变更

```bash
git add packages/thinkflow/desktop/src-tauri/tauri.conf.json
git commit -m "chore: bump version to <VERSION>"
git push origin thinkflow-mvp1
```

### 第六步：创建 GitHub Release 并上传 DMG

```bash
gh release create v<VERSION> \
  --title "ThinkFlow v<VERSION>" \
  --notes "$(cat <<'EOF'
## 更新内容

- 功能1 说明
- 功能2 说明
- Bug 修复

## 下载

- **macOS（Apple Silicon）**：下载 `ThinkFlow_<VERSION>_aarch64.dmg`
- **网页版**：https://thinkflow-opencode-app.vercel.app
EOF
)" \
  --target thinkflow-mvp1 \
  "packages/thinkflow/desktop/src-tauri/target/release/bundle/dmg/ThinkFlow_<VERSION>_aarch64.dmg"
```

---

## 快速参考：当前已发布版本

| 版本 | 日期 | 主要内容 |
|------|------|---------|
| v0.1.0 | 2026-05-06 | 首个内测版：画布、记忆库、矩阵模式、定时任务、视频生成 |

---

## 网页版发布

网页版由 Vercel 监听 `thinkflow-mvp1` 分支自动部署，**push 代码即自动更新**，无需手动操作。

- 生产地址：`https://thinkflow-opencode-app.vercel.app`
- 后端（Railway）：`https://thinkflow-opencode-production.up.railway.app`（push 后约 5-10 分钟重建）

---

## 常见问题

**Q: `bun tauri build` 在 DMG 步骤报错 `bundle_dmg.sh` 失败**

原因：上次构建留下了临时 `rw.*.dmg` 文件。  
解决：使用 `--no-bundle` 跳过 Tauri 自带打包，改用第四步的 `hdiutil` 手动打包。

**Q: DMG 安装后提示"已损坏，无法打开"**

原因：macOS Gatekeeper 拦截了未经签名的应用。  
解决：在终端运行 `xattr -cr /Applications/ThinkFlow.app`，或在"系统设置 → 隐私与安全性"中点击"仍要打开"。

**Q: 如何验证 DMG 文件完整性**

```bash
hdiutil verify ThinkFlow_<VERSION>_aarch64.dmg
```

输出 `checksum ... is VALID` 即为正常。
