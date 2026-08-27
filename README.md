# GaugeStudio

Gauge 测试管理桌面端（Electron + Vue 3 + Element Plus + Pinia + Vue Router + JavaScript），对接 [studio-reporter](../studio-reporter/API.md) WebSocket 协议。

`ui-mock/` 为已验证的 HTML 交互原型，行为以本应用实现为准。

## 目录结构

```
GaugeStudio/
├── ui-mock/                 # HTML 原型（保留，勿删）
├── electron/
│   ├── main.js              # Main 进程入口 + IPC
│   ├── preload.js           # contextBridge 白名单
│   └── services/
│       ├── ws-server.js     # 接收 studio-reporter 事件
│       ├── run-manager.js   # spawn gauge + GAUGE_STUDIO_WS / 重试队列
│       ├── project-service.js
│       ├── settings-store.js  # userData/settings.json
│       ├── spec-fs.js
│       └── lsp-service.js   # CPT 补全 + gauge --lsp 进程
├── src/                     # Vue Renderer
│   ├── views/               # vue-router 页面
│   ├── components/
│   ├── stores/              # Pinia
│   ├── router/
│   └── styles/
├── shared/constants.js
├── index.html
├── electron.vite.config.mjs
└── package.json
```

## 安装与开发

在 `GaugeStudio/` 目录：

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

产物在 `out/`（main / preload / renderer）。

Windows 免安装包（ZIP，默认）：

```bash
npm run dist
# 或
npm run dist:zip
```

产物：`release/GaugeStudio-0.1.0-win-x64.zip`。解压后运行其中的 `GaugeStudio.exe`。

Windows 安装包（可选）：

```bash
npm run dist:setup
```

产物：`release/GaugeStudio-0.1.0-Setup.exe`。仅生成未打包目录可用 `npm run dist:dir`。

若下载 electron-builder 二进制失败（常见于国内网络），可先设置镜像再打包：

```powershell
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
npm run dist
```

## 联调 gauge-js-demo（smoke）

### 前置条件

1. **Gauge CLI** 已安装且在 PATH 中（或在设置里填写绝对路径）
   ```bash
   gauge version
   ```
2. **studio-reporter** 插件已安装（demo 的 `manifest.json` 已声明）
   ```bash
   gauge install studio-reporter
   # 或从本地包：gauge install studio-reporter --file <path-to-zip>
   ```
3. **gauge-js-demo** 依赖已安装
   ```bash
   cd ../gauge-js-demo
   npm install
   ```

### 操作步骤

1. `npm run dev` 启动 GaugeStudio
2. 左侧点「打开」，选择仓库中的 `gauge-js-demo` 目录
3. 确认 `specs/smoke.spec` 已勾选（默认勾选含 smoke 的 spec）
4. Tags 可留空或填写表达式（非空时会传 `--tags`）
5. 点 **Run**
   - **控制台**：gauge stdout/stderr
   - **实时运行**：仅当前 Scenario（含 Concept 嵌套与数据驱动参数）
   - **运行结果**：标准/极简卡片 + 右侧详情；失败可「重试失败 / 重试本行」
6. 双击 `.spec` 进入编辑页，可保存写盘；步骤行 `*` 后输入可触发 CPT Concept 补全

### 命令行对照（不经 UI）

```bash
cd ../gauge-js-demo
set GAUGE_STUDIO_WS=ws://127.0.0.1:8080
gauge run specs/smoke.spec
```

（PowerShell：`$env:GAUGE_STUDIO_WS="ws://127.0.0.1:8080"`）

## 实现状态

| 能力 | 状态 |
|------|------|
| 布局对齐 mock（chrome / 树 / 四页 / 设置） | ✅ |
| 打开项目、Spec 树、勾选、设置持久化 userData | ✅ |
| WsServer + RunManager + GAUGE_STUDIO_WS | ✅ |
| 控制台 = stdout/stderr；实时 = 当前 Scenario | ✅ |
| 结果卡片 + 详情；重试失败 / 重试一行（`--table-rows`） | ✅ |
| Spec 读/写磁盘 | ✅ |
| CPT Concept 补全（扫描 `.cpt`） | ✅ |
| `gauge --lsp` 进程启停 / 重启 IPC | ✅ 薄封装（JSON-RPC completion 未接） |
| 并行 Stream UI / 历史 / 健康检查 | ❌ Phase 2 |

## IPC 白名单（preload）

- `project:open|get|pick`
- `run:start|stop|retryFailed|retryOne|isRunning`
- `execution:event` / `console:data` / `run:status` / `run:finished`（事件）
- `spec:read|write`
- `lsp:complete|restart|status`
- `settings:get|save`
