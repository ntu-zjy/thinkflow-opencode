# ZPAY 支付接入文档

> 服务商：z-pay.cn（与易支付接口兼容）
> 文档来源：https://member.z-pay.cn/member/doc.html

> ⚠️ **安全声明**：本仓库历史上曾把真实 PID/KEY 写在此文档里并推送到公开仓库。
> 该 KEY 已视为泄漏并 **必须在 ZPAY 后台重置**（旧 KEY 任何人都能用来伪造支付回调）。
> 旧 git 历史已用 `git filter-repo` 清理并 force-push 重写。
> 此后任何真实凭证 **只放 Sealos 环境变量**，不再写入仓库内任何文件。

---

## 商户信息（ThinkFlow）

| 字段 | 说明 |
|------|-----|
| 商户 PID（API安全页） | 占位 · 真实值仅存于 Sealos 环境变量 `ZPAY_PID` |
| 渠道商户号（支付宝侧） | 占位 · 不写入仓库 |
| 商户密钥 KEY | 占位 · 真实值仅存于 Sealos 环境变量 `ZPAY_KEY`（旧 KEY 已撤销，请在后台重新生成） |

---

## 环境变量配置（Sealos thinkflow-server）

```env
ZPAY_PID=<填入 ZPAY 后台显示的商户 PID>
ZPAY_KEY=<填入 ZPAY 后台显示的商户密钥；旧 KEY 已泄漏，请先重置>
ZPAY_API=https://zpayz.cn/submit.php
SITE_URL=https://<前端公网域名>
ZPAY_MOCK=                        # 留空 = 真实支付；设为 1 = Mock 模式（仅本地调试）
```

> ⚠️ **生产环境必须 `ZPAY_MOCK` 留空或未设置**。设为 `1` 会让 `/pay/mock-callback`
> 直接发放积分跳过支付，等同于免费白嫖。

---

## 接口一览

### 1. 页面跳转支付（ThinkFlow 使用此方式）

**URL**：`https://zpayz.cn/submit.php`
**方法**：POST 或 GET（推荐 POST）

| 参数 | 名称 | 必填 | 说明 |
|------|------|------|------|
| `pid` | 商户 ID | 是 | |
| `type` | 支付方式 | 是 | `wxpay` / `alipay` |
| `out_trade_no` | 商户订单号 | 是 | 唯一，最多 32 位 |
| `notify_url` | 异步回调地址 | 是 | 不支持带参数的 URL |
| `return_url` | 支付完成跳转页 | 是 | 不支持带参数的 URL |
| `name` | 商品名称 | 是 | 需体现具体商品，避免被封 |
| `money` | 金额 | 是 | 最多 2 位小数，单位元 |
| `param` | 附加内容 | 否 | 会原样随 notify_url 返回 |
| `sign` | MD5 签名 | 是 | 见签名算法 |
| `sign_type` | 签名方式 | 是 | 固定 `MD5` |
| `cid` | 渠道 ID | 否 | 多个用逗号隔开，不填随机调用 |

**成功**：直接跳转到收银台付款页
**失败**：`{"code":"error","msg":"具体错误信息"}`

### 2. 支付结果通知（回调）

**触发方式**：支付成功后，ZPAY 服务器主动 GET 请求 `notify_url`
**必须返回**：纯字符串 `success`，否则会按频率重试（0/15/15/30/180/1800s...）

回调参数：`pid` / `out_trade_no` / `trade_no` / `trade_status`（**只有 `TRADE_SUCCESS` 表示成功**）/ `money` / `name` / `param` / `type` / `sign` / `sign_type`。

**验证要点**：
1. 验证 `sign` 签名是否与自己计算的一致
2. 校验 `money` 是否与订单金额吻合（防止假通知）
3. 检查订单是否已处理过（幂等）

### 3. 查询单个订单

`GET https://zpayz.cn/api.php?act=order&pid={PID}&key={KEY}&out_trade_no={订单号}`

返回字段包含 `status`（1=已支付，0=未支付）。

---

## MD5 签名算法

```
1. 取所有参数（排除 sign、sign_type、空值）
2. 按参数名 ASCII 升序排列
3. 拼接为 key=value&key=value 格式（值不做 URL 编码）
4. 末尾拼接商户密钥 KEY
5. 对整体字符串做 MD5，结果小写
```

实现见 `server/src/routes/pay.ts` 的 `zpaySign` 函数。

---

## ThinkFlow 支付流程

```
前端 POST /api/thinkflow/pay/create { planId, payType }
  ↓
后端生成 out_trade_no，拼接 ZPAY 参数 + 签名
  ↓
返回 { payUrl }，前端 window.open(payUrl)
  ↓
用户在 ZPAY 收银台完成支付
  ↓
ZPAY GET /api/thinkflow/pay/notify（异步回调）
  ↓
后端验签 → 更新 users.plan/credits_permanent → INSERT credit_transactions
  ↓
用户浏览器跳回 SITE_URL/app?payment=success
```

**ThinkFlow 的 notify_url**：`{SITE_URL}/api/thinkflow/pay/notify`
**ThinkFlow 的 return_url**：`{SITE_URL}/app?payment=success`

---

## 注意事项

- `notify_url` 和 `return_url` **不能带查询参数**（ZPAY 限制）
- 订单号 `out_trade_no` 生成规则：`tf_{timestamp}_{userId前8位}`
- 真实支付时 `ZPAY_MOCK` 必须为空或不设置
- Mock 模式（`ZPAY_MOCK=1`）下 `notify_url` 不会被调用，走 `/pay/mock-callback` 本地路由
