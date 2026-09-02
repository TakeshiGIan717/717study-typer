# Chrome Web Store 审核员说明

## 单一用途

本扩展帮助用户把本地文本或 DOCX 内容，按可配置节奏输入到用户有权编辑的当前网页编辑区域。

## 测试步骤

1. 安装扩展并固定到工具栏。
2. 使用开发者在 Chrome Web Store 审核后台单独提供的测试账号登录 `https://www.717study.com/#/SignIn`。
3. 打开任意普通文本测试页面。
4. 点击扩展，粘贴短文本并点击“加载到当前页面”。
5. 使用“点选普通输入框”选择 textarea，点击“开始”。
6. 验证暂停、继续和紧急停止。
7. 可在 Google Docs 测试“当前页面光标”模式。启动任务时 Chrome 会显示调试连接提示；任务结束后自动断开。

## 审核测试账号

不要把真实测试密码提交到 Git 仓库。请在 Chrome Web Store Developer Dashboard 的审核说明/测试凭据字段中填写：

- 测试邮箱：`发布前填写`
- 测试密码：`发布前填写`
- 测试账号要求：保持有效、无需 OTP、无需付费、审核期间不得过期。

## debugger 权限说明

该权限只服务于扩展单一用途。Google Docs、Canvas 和部分自定义编辑器没有标准 DOM 输入框，扩展使用 Chrome DevTools Protocol `Input.insertText` 和退格键事件向当前焦点输入。扩展不会使用 Network、Page、Runtime、DOM 或其他调试域收集数据；连接仅在用户主动开始输入后建立，并在完成、停止或关闭面板后断开。

## 登录验证说明

扩展在 717study.com 页面上下文中读取 `client_auth_token`，仅向同站 `/api/user/account` 发出验证请求。返回给扩展后台的数据只有布尔登录状态，不包含令牌或用户资料。
