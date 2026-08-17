# 悠然 · 装修工作台（本地部署版）

把工作台跑在你自己的 Mac 上，家人 / 工长连同一个地址就能**共用同一份数据**，不依赖 WorkBuddy 云端。

## 1. 启动服务
```bash
cd 本地部署
node server.js
```
默认端口 8080，看到 `悠然装修工作台 本地服务已启动（数据存储：CSV 文件）` 即成功。
改端口：`PORT=9000 node server.js`

## 2. 怎么访问
- **你自己（本机）**：浏览器打开 `http://localhost:8080`
- **同一 WiFi 下的家人 / 工长**：打开 `http://<你的内网IP>:8080`
  - 查自己 Mac 的内网 IP：`ipconfig getifaddr en0`
- ⚠️ **不要直接双击 `装修工作台.html` 打开**——那样连不上数据服务，必须用上面的 http 地址。直接双击会弹横幅提示。

## 3. 让任何地方的人都能访问（公网）
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:8080
```
运行后会输出一个 `https://xxxx.trycloudflare.com` 的临时公网地址，把它发给别人即可。
（每次重启隧道地址会变；要固定地址需注册 cloudflared 账号并配置命名隧道。）

## 4. 停止
在运行 `server.js` / `cloudflared` 的终端按 `Ctrl+C`。

## 5. 数据与备份
- 所有数据以 **CSV 文件** 存在同目录，可直接用 Excel / Numbers 打开查看或编辑：
  - `profile.csv`（装修档案）
  - `tasks.csv`（施工任务 / 待办）
  - `budget.csv`（预算明细）
  - `inspiration.csv`（灵感库；图片、风格标签等数组字段存成单元格内的 JSON 文本，不影响使用）
- 每次增删改会实时写回对应 CSV（原子写入，避免损坏）。
- 工作台内「数据管理」仍可导出 JSON / CSV 备份。
- 清空或重来：删掉这几个 `.csv` 文件再重启 `server.js`，会自动重新注入示例数据。
- 旧版 `data.json` 会在首次启动时自动迁移成 CSV，可放心删除。

## 6. 安全提醒
- **公网链接 = 任何拿到链接的人都能查看并修改数据**，请只发给信任的人。
- 建议仅在需要时开启隧道，用完即关（`Ctrl+C`）。
- 本机防火墙若拦截，需在「系统设置 → 网络 → 防火墙」放行，或用上面的隧道方式绕过。
