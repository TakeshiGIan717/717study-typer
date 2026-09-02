# Chrome Web Store 隐私实践填写建议

## 单一用途

帮助用户把本地提供的文本或 DOCX 内容，按可配置节奏输入到用户有权编辑的当前网页输入区域。

## 权限理由

- `activeTab`：仅在用户点击扩展后，临时访问当前活动标签页以选择编辑区域和加载页面控制面板。
- `scripting`：将输入框选择器和控制面板脚本注入用户当前选择的标签页。
- `storage`：只在本地保存 WPM、速度波动、停顿和误触等非敏感偏好；不保存导入正文。
- `debugger`：Canvas、Google Docs 和部分自定义编辑器没有可直接写入的标准 DOM 输入框。本权限仅在用户启动“当前页面光标”任务时连接当前标签页，使用 Input 域输入文本，并在完成、停止或关闭面板后立即断开。
- 主机权限 `https://www.717study.com/*`：读取 717study.com 页面已有的登录状态，并调用同站 `/api/user/account` 验证会话有效性。令牌不离开网站页面上下文。

## 数据类型披露（建议保守填写）

- Authentication information：是。扩展在网站页面上下文中临时处理现有登录令牌，仅用于同站会话验证；不保存令牌。
- Website content：是。扩展在本地处理用户主动提供的正文，并把内容输入用户指定的编辑区域；正文不上传开发者服务器。
- Personally identifiable information：否（扩展后台不接收账号资料）。
- Web history：否。
- User activity：否。
- Location、financial、health、personal communications：否。

## Limited Use 认证

应勾选所有适用的 Limited Use 合规声明。确保后台选项、扩展行为和公开隐私政策三者完全一致。
