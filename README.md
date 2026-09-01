# 717 拟人打字机

Windows 本地 GUI 工具：直接向当前获得焦点的输入框发送 Windows 原生 Unicode 键盘输入。因此可以使用你平时已经登录的 Chrome，不会启动自动化 Chrome、创建 Profile 或接触浏览器账号数据。仅用于你有权操作的网页、无障碍辅助与合法自动化测试；不包含规避检测、考试监控或平台保护的功能。

## 快速启动

安装 Python 3.10+ 后双击 `start.bat`。首次运行只会创建本地 `.venv`，没有第三方运行依赖，也不会安装浏览器。

如果希望直接在已经登录的 Chrome 标签页内运行，请使用 [Chrome 扩展版](chrome-extension/README.md)。

手动安装：

```powershell
py -m venv .venv
.venv\Scripts\python app.py
```

## 使用

1. 正常启动你平时使用的 Chrome，保持原有 Google 登录状态。程序中的“打开网页”也会用 Windows 默认浏览器打开网址。
2. 粘贴文本，或导入 DOCX、UTF-8/GB18030 的 TXT/Markdown 文件，并配置节奏。DOCX 会保留段落、空行、手动换行、制表符及表格的行列文本结构。
3. 点“开始”，在 5 秒倒计时内切到 Chrome 并点击目标输入框；倒计时结束后从当前光标位置输入。
4. 按全局快捷键 `F9` 暂停或继续，按 `F12` 紧急停止。GUI 按钮也可操作，但会把焦点切回程序，因此在输入期间优先使用快捷键。
5. “英文整词输入概率”控制英文单词整体出现的比例，默认 70%；其余单词仍逐字母输入。整词输入也会按字母数计算 WPM 时间。误触仅用于逐字母输入的英文，并会立刻退格纠正；中文通过 Windows Unicode 输入发送，不会制造乱码误触。

程序会向当前获得焦点的 Windows 控件输入，因此也能用于其他有权操作的桌面文本框。输入期间不要切换窗口，否则字符会进入新的焦点位置。某些游戏、管理员权限窗口或拒绝软件输入的安全控件可能无法接收；程序不会规避这些限制。

DOCX 导入是结构化纯文本转换。通用键盘输入无法跨不同网站可靠复刻 Word 的字体、字号、颜色、加粗、页边距、图片或分页效果；这些视觉样式由目标网页编辑器决定。

## 测试与打包

```powershell
.venv\Scripts\python -m unittest discover -s tests -v
.venv\Scripts\python -m pip install pyinstaller
.venv\Scripts\pyinstaller --noconfirm --windowed --name 717Typer app.py
```

生成的 EXE 不需要捆绑 Chrome；“打开网页”使用目标电脑的 Windows 默认浏览器。

## 为什么不再使用 Playwright 或 Lax3n/HumanTyping

Chrome 会限制自动化启动配置登录 Google 账号，而直接使用日常 Profile 又容易发生目录锁冲突或配置风险。因此当前版本完全不接管浏览器，改用 Windows `SendInput` 向你亲自选中的输入框发送字符。内置节奏器继续提供 WPM、随机波动、标点停顿、随机停顿、英文误触与纠错。
