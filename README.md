# Bring Back Jensen 官网

持币用户连接钱包 → 一键打开预填好的发推框 → 贴回推文链接并签名 → 后台核验后登记分红资格。每期分红前，用快照脚本按持币量算出每个地址该分多少。

## 用户流程

1. **连接钱包**：支持浏览器插件钱包和钱包 App 内置浏览器（MetaMask、OKX、币安钱包、TokenPocket 等）。只读地址和持币量。
2. **一键发推**：点按钮打开 X 的发推框，文案已经填好：话题、代币符号和这个钱包的 6 位验证码。验证码由钱包地址和服务器密钥算出来，别人从推文里看不出钱包地址。
3. **贴链接登记**：用户贴回推文链接，钱包签一段文字（不花 gas、不授权、不转账）。后台核验：
   - 签名确实来自这个钱包（普通钱包本地验签，合约钱包走链上 ERC-1271）；
   - 推文公开存在（通过 X 官方的公开 oEmbed 接口 `publish.x.com` 读取，不需要 API key）；
   - 推文里有话题和这个钱包的验证码；
   - 一个 X 账号只能绑一个钱包，一条推文只能登记一次。同一个钱包可以换推文重新登记。

登记时不要求已经持币；有没有资格，看每期快照时的持币量是否达到门槛。

## 目录

```
server.mjs            网站和接口（node:http，无框架）
lib/config.mjs        读配置和服务器密钥
lib/store.mjs         登记记录（SQLite，Node 自带的 node:sqlite）
lib/x.mjs             解析推文链接、读取推文
lib/code.mjs          钱包验证码
lib/chain.mjs         链上读取（持币、分红钱包余额、合约钱包验签）
public/               页面：index.html、style.css、app.js（中英文）
scripts/snapshot.mjs  分红快照
scripts/admin.mjs     查看 / 解绑登记
data/                 运行时生成：registrations.db、secrets.json、snapshots/（不要提交、不要外发）
```

## 本地运行

需要 Node.js 22.13 或更高（用到内置的 `node:sqlite`）。

```bash
npm install
cp config.example.json config.json   # 然后按下面的说明填写
npm start
```

打开 http://127.0.0.1:3260 。

服务器要能访问 `publish.x.com` 和 BSC 的 RPC。在国内机器上本地测试时，要让 Node 走代理：

```bash
NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:7897 npm start
```

## 配置（config.json）

| 字段 | 说明 |
|---|---|
| `siteName` | 网站名，也会写进签名文本 |
| `port` / `host` | 监听端口和地址。默认只听 127.0.0.1，前面放 nginx；直接对外要设成 `0.0.0.0` |
| `trustProxy` | 放在 nginx / Cloudflare 后面时设为 `true`，限流才能拿到真实 IP |
| `chain.id` | 56（BSC 主网）或 97（测试网） |
| `chain.rpcUrls` | RPC 列表，按顺序回退 |
| `token.name` / `token.symbol` | 代币名称和符号，页面和推文里会用 |
| `token.address` | 代币合约地址。没上线就留 `null`，页面会隐藏持币量和 CA |
| `eligibility.minBalance` | 持币门槛（整数个代币，例如 `"100000"`）。留 `null` 时页面显示「待定」 |
| `eligibility.hashtag` | 推文必须带的话题 |
| `eligibility.tweetTemplate.zh` / `.en` | 推文文案，必须包含 `{code}`；`{symbol}` 会换成代币符号 |
| `dividend.taxSharePct` | 页面上显示的「分红占税」百分比，`null` 不显示 |
| `dividend.wallet` | 分红钱包地址，页面会显示它的 BNB 余额；`null` 不显示 |
| `links.x` / `links.telegram` / `links.flap` | 顶栏链接，必须是 https，`null` 不显示 |
| `exclude` | 快照时排除的地址（团队钱包、金库、池子等） |
| `i18nOverrides` | 按语言覆盖页面文案，键名见 `public/app.js` 里的 `I18N` |

改配置后要重启服务。

**持币门槛**：门槛决定有多少人能分到。门槛越高，分红越集中在大户；门槛越低，小号越容易凑进来，但因为按持币比例分，小号分到的也很少。上线前定好，中途改会让已经发推的人不满。

## 部署（VPS）

1. 装 Node 22.13+，把整个目录传上去（不要带 `data/`，服务器会自己生成），`npm install --omit=dev`。
2. 用 systemd 或 pm2 常驻：`npm start`。
3. nginx 反代到 127.0.0.1:3260，配 HTTPS（钱包和剪贴板都要求 HTTPS）。`trustProxy` 设为 `true`。
4. **备份 `data/`**：`registrations.db` 是全部登记记录；`secrets.json` 是验证码密钥，换了它所有验证码都会变，已经发出去的推文就对不上了。

Vercel 这类无服务器平台没有持久磁盘，要把 `lib/store.mjs` 换成托管数据库才能用。

## 每期分红

```bash
npm run snapshot -- --pool 1.5                 # 用最新区块
npm run snapshot -- --pool 1.5 --block 70000000
```

`--pool` 是这一期要分的 BNB 数量。脚本读出每个已登记地址在该区块的持币量，排除 `exclude` 里的地址和不到门槛的地址，按持币比例分配（向下取整，零头留在池里）。输出在 `data/snapshots/`：

- `block-N-all.csv`：所有登记地址、持币、是否有资格、原因、应分金额；
- `block-N-payouts.csv`：只有应分金额大于 0 的地址，可以直接导入批量转账工具；
- `block-N.json`：完整数据，方便公开给社区复算。

公共 RPC 一般只保留最近一段时间的状态，指定很早的区块可能会失败，快照最好在当期结束时马上跑。

## 管理

```bash
npm run admin -- count
npm run admin -- list
npm run admin -- unbind 0x钱包地址   # 解绑：钱包、X 账号和推文都可以重新登记
```

没有管理后台页面和管理接口，管理都在服务器上用命令做。

## 安全说明

- 页面只请求「签一段文字」（personal_sign），不请求授权、不发交易。
- 签名文本由服务器根据钱包、推文 ID 和时间生成，10 分钟内有效。
- 页面开了严格的 CSP，只加载本站资源。
- `data/secrets.json` 和 `config.json` 已写进 `.gitignore`。

## 已知限制

- 推文核验依赖 X 的公开 oEmbed 接口。它不需要 key，但 X 随时可能改。接口不可用时，用户会看到「暂时连不上 X」，可以稍后重试。
- 推文必须公开；受保护账号的推文读不到。
- 页面只支持浏览器注入的钱包。电脑上没装钱包插件、只有手机钱包的用户，要在手机钱包的内置浏览器里打开。要支持扫码连接（WalletConnect），需要再接入。
- 登记后删推不会自动取消资格。如果要求快照时推文仍然存在，需要在快照前加一次复查。
