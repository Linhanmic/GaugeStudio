# GaugeStudio

Gauge 测试管理桌面端。当前仓库为 **界面整体框架**（Vue 3 + Element Plus + Pinia + Vue Router + electron-vite + Electron），业务功能尚未接入。

## 界面骨架

- 左侧活动栏：控制台 / 实时 / 结果 / 编辑 + 脚本树开关 + 设置
- 顶部命令坞：Run / Stop / 重试 / Tags / 状态（仅展示）
- 中左脚本树占位、中右四个路由工作区占位
- 底栏状态占位、设置对话框占位

## 目录

```
GaugeStudio/
├── electron/
│   ├── main.js              # 仅创建窗口
│   └── preload.js
├── src/
│   ├── views/               # 四个占位页
│   ├── components/          # 壳层
│   ├── stores/ui.js         # 仅界面状态
│   ├── router/
│   └── styles/
├── index.html
├── electron.vite.config.mjs
└── package.json
```

## 开发

```bash
npm install
npm run dev
```
