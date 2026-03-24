# 邀请码与积分体系设计

平台的用户增长和商业化基础设施。

---

## 设计原则

1. **邀请码驱动增长**——早期不开放注册，用邀请码控制节奏，形成稀缺感
2. **积分统一计量**——所有 AI 消耗（LLM token、生图）换算为统一积分，用户无需理解 token
3. **消耗透明**——每次操作前预估积分，操作后按实际扣费，用户有预期
4. **充值简单**——最少的步骤完成充值，支持微信/支付宝

---

## 一、邀请码系统

### 1.1 邀请码类型

| 类型         | 谁生成               | 用途                         | 使用限制                  |
| ------------ | -------------------- | ---------------------------- | ------------------------- |
| **系统码**   | 管理员               | 运营活动、KOL 合作、媒体推广 | 可设定总使用次数          |
| **用户码**   | 每个注册用户自动拥有 | 邀请好友                     | 默认 5 次，可通过活动增加 |
| **一次性码** | 管理员批量生成       | 定向发放（如社群活动）       | 仅 1 次                   |

### 1.2 邀请码格式

```
系统码：  RED-XXXXXX        （6位大写字母+数字，如 RED-A3BK9F）
用户码：  用户名前缀自动生成   （如 MOZE-7K2F）
一次性码：RD-XXXXXXXXXXXX   （12位，批量生成）
```

生成逻辑：

```ts
function generateCode(prefix: string, length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // 去掉易混淆的 0OI1
  const random = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `${prefix}-${random}`
}
```

### 1.3 邀请码使用流程

```
新用户打开注册页
    |
    ├── 输入邀请码
    |     |
    |     ├── 校验：码是否存在 → 是否过期 → 是否达到使用上限
    |     |
    |     ├── 通过 → 继续注册
    |     │     |
    |     │     ├── 新用户获得注册赠送积分（如 50 积分）
    |     │     ├── 邀请码使用次数 +1
    |     │     └── 如果是用户码 → 邀请人获得奖励积分（如 20 积分）
    |     │
    |     └── 失败 → 提示错误原因
    |
    └── 没有邀请码 → 提示获取途径 / 加入等待列表
```

### 1.4 邀请奖励机制

| 事件             | 被邀请人获得 | 邀请人获得                 |
| ---------------- | ------------ | -------------------------- |
| 注册成功         | 50 积分      | 20 积分                    |
| 被邀请人首次充值 | —            | 充值金额的 10%（积分形式） |

邀请人的奖励有上限，防止刷单：

- 每人每月最多通过邀请获得 500 积分
- 首充返利每人每月最多 3 次

### 1.5 邀请码状态

```
active      → 可使用
exhausted   → 已达使用上限
expired     → 已过期
disabled    → 管理员禁用
```

---

## 二、积分体系

### 2.1 积分的本质

积分是平台的**内部货币**，1 积分约等于 ¥0.01（1 元 = 100 积分），但不直接对外宣传汇率，保留调价空间。

用户不需要理解 token、API 调用次数、模型差价。他们只看到："这次创作花了 15 积分"。

### 2.2 积分来源

| 来源             | 数量       | 条件                 |
| ---------------- | ---------- | -------------------- |
| 注册赠送         | 50 积分    | 使用邀请码注册       |
| 邀请奖励         | 20 积分/人 | 每成功邀请一个用户   |
| 被邀请人首充返利 | 充值的 10% | 上限 3 次/月         |
| 充值             | 按套餐     | 微信/支付宝          |
| 运营活动         | 不定       | 促销、节日、任务奖励 |

### 2.3 积分消耗

每次 AI 操作按实际消耗扣费。不同模型、不同操作的成本不同。

#### 扣费公式

```
积分消耗 = Σ(每个 LLM 调用的 token 费) + Σ(每次生图的费用)
```

#### LLM Token 费率表

按模型定价，对齐实际 API 成本（加合理毛利）。

| 模型              | 输入 token 单价（积分/千token） | 输出 token 单价（积分/千token） |
| ----------------- | ------------------------------- | ------------------------------- |
| Claude Sonnet 4.5 | 0.3                             | 1.5                             |
| Claude Haiku 4.5  | 0.08                            | 0.4                             |
| GPT-4o            | 0.25                            | 1.0                             |
| GPT-4o-mini       | 0.015                           | 0.06                            |
| Gemini 2.5 Flash  | 0.015                           | 0.06                            |

#### 生图费率表

| 模型                     | 单张单价（积分） |
| ------------------------ | ---------------- |
| Nano Banana flux-schnell | 2                |
| Nano Banana flux-pro     | 5                |

#### 典型操作的积分消耗预估

用户在意的是"做一件事花多少钱"，不是 token 价格。

| 操作                              | 预估积分 | 约等于     |
| --------------------------------- | -------- | ---------- |
| 小红书一篇图文（标题+文案+3张图） | 15-25    | ¥0.15-0.25 |
| 网文一章（3000字）                | 5-10     | ¥0.05-0.10 |
| 视频分镜（5个镜头+草图）          | 20-30    | ¥0.20-0.30 |

### 2.4 扣费时机

**预扣 + 结算** 模式：

```
1. 用户发起操作
     |
2. 预估积分消耗 → 检查余额
     |
     ├── 余额不足 → 提示充值，阻断操作
     |
     ├── 余额充足 → 冻结预估积分（余额不减少，但冻结部分不可用）
     |
3. 操作执行（LLM 调用 + 生图）
     |
4. 操作完成 → 计算实际消耗
     |
5. 结算：
     ├── 实际 ≤ 预估 → 扣实际，释放差额
     └── 实际 > 预估 → 扣实际（允许小幅超支，不中断操作）
```

为什么用冻结而不是直接预扣？

- 防止并发操作时重复扣费
- 操作失败可以全额释放
- 用户看到的余额始终准确

### 2.5 余额展示

```
┌─────────────────────────┐
│  💰 积分余额: 128       │
│  🧊 冻结中:   15        │
│  📊 本月已用: 342       │
│  [充值]                 │
└─────────────────────────┘
```

---

## 三、充值系统

### 3.1 充值套餐

| 套餐   | 价格 | 积分   | 单价         | 备注       |
| ------ | ---- | ------ | ------------ | ---------- |
| 体验包 | ¥5   | 600    | ¥0.0083/积分 | 新用户首选 |
| 基础包 | ¥20  | 2,500  | ¥0.008/积分  | 轻度用户   |
| 标准包 | ¥50  | 6,500  | ¥0.0077/积分 | 常规用户   |
| 专业包 | ¥100 | 14,000 | ¥0.0071/积分 | 高频用户   |

买得越多单价越低，但梯度不要太大（防止用户只买最大包）。

### 3.2 充值流程

```
用户点击「充值」
    |
    ├── 选择套餐
    |
    ├── 选择支付方式（微信 / 支付宝）
    |
    ├── 生成支付订单（状态: pending）
    |
    ├── 调用支付 API → 返回支付链接/二维码
    |
    ├── 用户扫码支付
    |
    ├── 支付回调：
    |     |
    |     ├── 校验签名
    |     ├── 检查订单状态（防重复处理）
    |     ├── 更新订单状态 → paid
    |     ├── 增加用户积分
    |     ├── 记录积分流水
    |     └── 检查邀请返利（被邀请人首充 → 邀请人获 10%）
    |
    └── 前端轮询订单状态 → 支付成功 → 刷新余额
```

### 3.3 支付集成

建议用聚合支付服务（如虎皮椒、YunGouOS、Payjs），而不是直接对接微信/支付宝官方（需要企业资质，接入周期长）。

```ts
// 聚合支付 API 调用示例
async function createPayment(input: { userId: string; packageId: string; method: "wechat" | "alipay" }) {
  const pkg = await db.package.findById(input.packageId)

  // 1. 创建订单
  const order = await db.order.create({
    userId: input.userId,
    packageId: input.packageId,
    amount: pkg.price, // 分为单位
    credits: pkg.credits,
    status: "pending",
    method: input.method,
  })

  // 2. 调用聚合支付
  const payment = await paymentProvider.create({
    orderId: order.id,
    amount: pkg.price,
    method: input.method,
    notifyUrl: `${BASE_URL}/api/payment/callback`,
    returnUrl: `${FRONTEND_URL}/credits?order=${order.id}`,
  })

  return { orderId: order.id, payUrl: payment.url }
}
```

### 3.4 支付安全

| 措施         | 说明                                            |
| ------------ | ----------------------------------------------- |
| 回调签名验证 | 用支付商的密钥验证回调真实性                    |
| 幂等处理     | 同一订单回调多次只处理一次（检查 order.status） |
| 金额核对     | 回调中的金额必须与订单金额一致                  |
| 订单超时     | 30 分钟未支付自动关闭                           |
| 流水记录     | 每笔积分变动都有明细记录，可审计                |

---

## 四、数据模型

### 4.1 Prisma Schema

```prisma
// ==================== 用户 ====================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String                           // bcrypt hash
  avatar        String?
  credits       Int       @default(0)            // 可用积分
  frozen        Int       @default(0)            // 冻结积分
  role          Role      @default(USER)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关联
  inviteCode    InviteCode?                      // 用户自动拥有的邀请码
  invitedById   String?                          // 谁邀请的
  invitedBy     User?     @relation("Invites", fields: [invitedById], references: [id])
  invitees      User[]    @relation("Invites")   // 邀请了谁
  orders        Order[]
  creditLogs    CreditLog[]
  sessions      Session[]
  workspaces    WorkspaceMember[]
}

enum Role {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  BANNED
  SUSPENDED
}

// ==================== 邀请码 ====================

model InviteCode {
  id            String    @id @default(cuid())
  code          String    @unique                // "MOZE-7K2F"
  type          CodeType                         // system / user / onetime
  ownerId       String?   @unique                // 用户码的所有者（一对一）
  owner         User?     @relation(fields: [ownerId], references: [id])
  maxUses       Int       @default(5)            // 最大使用次数
  usedCount     Int       @default(0)            // 已使用次数
  credits       Int       @default(50)           // 被邀请人获得的积分
  rewardCredits Int       @default(20)           // 邀请人获得的积分
  expiresAt     DateTime?                        // 过期时间（null=永不过期）
  status        CodeStatus @default(ACTIVE)
  createdAt     DateTime  @default(now())

  // 关联
  usages        InviteUsage[]
}

enum CodeType {
  SYSTEM
  USER
  ONETIME
}

enum CodeStatus {
  ACTIVE
  EXHAUSTED
  EXPIRED
  DISABLED
}

model InviteUsage {
  id            String    @id @default(cuid())
  codeId        String
  code          InviteCode @relation(fields: [codeId], references: [id])
  userId        String                           // 使用邀请码的新用户
  createdAt     DateTime  @default(now())

  @@unique([codeId, userId])                     // 一个用户只能用一次同一个码
}

// ==================== 充值订单 ====================

model Order {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  packageId     String                           // 套餐标识
  amount        Int                              // 金额（分）
  credits       Int                              // 对应积分
  method        PayMethod                        // 支付方式
  status        OrderStatus @default(PENDING)
  tradeNo       String?   @unique                // 第三方支付单号
  paidAt        DateTime?
  expiredAt     DateTime                         // 超时时间
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum PayMethod {
  WECHAT
  ALIPAY
}

enum OrderStatus {
  PENDING
  PAID
  EXPIRED
  REFUNDED
}

// ==================== 积分流水 ====================

model CreditLog {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  type          CreditType
  amount        Int                              // 正数=收入，负数=支出
  balance       Int                              // 变动后余额
  description   String                           // 人类可读描述
  refId         String?                          // 关联 ID（orderId / sessionId / inviteCodeId）
  refType       String?                          // 关联类型（order / session / invite / reward）
  metadata      Json?                            // 扩展信息（token 明细等）
  createdAt     DateTime  @default(now())

  @@index([userId, createdAt])
}

enum CreditType {
  RECHARGE                                       // 充值
  REGISTER_BONUS                                 // 注册赠送
  INVITE_REWARD                                  // 邀请奖励
  REFERRAL_BONUS                                 // 被邀请人首充返利
  CONSUMPTION                                    // AI 消耗
  FREEZE                                         // 冻结
  UNFREEZE                                       // 解冻
  REFUND                                         // 退款/补偿
  ACTIVITY                                       // 运营活动
}

// ==================== 消耗明细 ====================

model UsageRecord {
  id            String    @id @default(cuid())
  userId        String
  sessionId     String                           // 关联会话
  agentId       String                           // 哪个 agent 消耗的
  type          UsageType                        // llm / image_gen
  model         String                           // "anthropic/claude-sonnet-4-5"
  inputTokens   Int       @default(0)
  outputTokens  Int       @default(0)
  images        Int       @default(0)            // 生图张数
  credits       Int                              // 本次消耗积分
  createdAt     DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([sessionId])
}

enum UsageType {
  LLM
  IMAGE_GEN
}
```

### 4.2 模型关系图

```
User
  ├── 1:1  InviteCode（用户的个人邀请码）
  ├── 1:N  User（invitees，邀请的人）
  ├── N:1  User（invitedBy，被谁邀请）
  ├── 1:N  Order（充值订单）
  ├── 1:N  CreditLog（积分流水）
  ├── 1:N  UsageRecord（消耗明细）
  └── M:N  Workspace（通过 WorkspaceMember）

InviteCode
  └── 1:N  InviteUsage（使用记录）

Order
  └── 支付成功 → 触发 CreditLog（type: RECHARGE）

UsageRecord
  └── 创建时 → 触发 CreditLog（type: CONSUMPTION）
```

---

## 五、API 接口设计

### 5.1 邀请码

```
POST   /api/invite/validate
       请求: { code: string }
       响应: { valid: boolean, error?: string, credits?: number }
       说明: 注册前校验邀请码是否可用

GET    /api/invite/my-code
       响应: { code: string, usedCount: number, maxUses: number, invitees: [...] }
       说明: 获取当前用户的邀请码和邀请记录

POST   /api/admin/invite/generate             [ADMIN]
       请求: { type: "system" | "onetime", count?: number, maxUses?: number, credits?: number }
       响应: { codes: string[] }
       说明: 管理员批量生成邀请码
```

### 5.2 认证

```
POST   /api/auth/register
       请求: { email, password, name, inviteCode }
       响应: { user, token }
       说明: 邀请码注册。内部执行：
             1. 校验邀请码
             2. 创建用户
             3. 赠送注册积分
             4. 给邀请人发奖励
             5. 为新用户生成个人邀请码
             6. 签发 JWT

POST   /api/auth/login
       请求: { email, password }
       响应: { user, token }

GET    /api/auth/me
       响应: { user: { id, email, name, credits, frozen } }
```

### 5.3 积分与充值

```
GET    /api/credits/balance
       响应: { credits: number, frozen: number, monthUsed: number }

GET    /api/credits/logs
       请求: ?page=1&limit=20&type=CONSUMPTION
       响应: { logs: CreditLog[], total: number }
       说明: 积分流水，支持按类型筛选

GET    /api/credits/packages
       响应: { packages: [{ id, name, price, credits }] }
       说明: 可用充值套餐列表

POST   /api/credits/recharge
       请求: { packageId: string, method: "wechat" | "alipay" }
       响应: { orderId: string, payUrl: string }
       说明: 创建充值订单，返回支付链接

GET    /api/credits/order/:id
       响应: { order: { status, amount, credits } }
       说明: 查询订单状态（前端轮询）

POST   /api/payment/callback                  [支付回调，不鉴权，验签]
       请求: 支付服务商回调数据
       说明: 处理支付成功，积分到账
```

### 5.4 消耗预估

```
POST   /api/credits/estimate
       请求: { agentId: string, inputLength: number, hasImageGen: boolean, imageCount?: number }
       响应: { estimated: number, breakdown: { llm: number, image: number } }
       说明: 发起操作前预估积分消耗，前端展示给用户确认
```

### 5.5 使用统计

```
GET    /api/usage/stats
       请求: ?period=month
       响应: {
         totalCredits: number,
         byAgent: [{ agentId, agentName, credits, count }],
         byType: { llm: number, imageGen: number },
         daily: [{ date, credits }]
       }
       说明: 用户的消耗统计（图表数据源）
```

---

## 六、核心后端逻辑

### 6.1 注册流程（含邀请码）

```ts
async function register(input: { email: string; password: string; name: string; inviteCode: string }) {
  // 1. 校验邀请码
  const code = await db.inviteCode.findUnique({ where: { code: input.inviteCode } })
  if (!code) throw new Error("邀请码不存在")
  if (code.status !== "ACTIVE") throw new Error("邀请码已失效")
  if (code.usedCount >= code.maxUses) throw new Error("邀请码已达使用上限")
  if (code.expiresAt && code.expiresAt < new Date()) throw new Error("邀请码已过期")

  // 2. 事务：创建用户 + 处理邀请
  return await db.$transaction(async (tx) => {
    // 创建用户
    const user = await tx.user.create({
      data: {
        email: input.email,
        password: await bcrypt.hash(input.password, 12),
        name: input.name,
        credits: code.credits, // 注册赠送
        invitedById: code.ownerId, // 记录谁邀请的
      },
    })

    // 记录注册赠送流水
    await tx.creditLog.create({
      data: {
        userId: user.id,
        type: "REGISTER_BONUS",
        amount: code.credits,
        balance: code.credits,
        description: `注册赠送 ${code.credits} 积分`,
        refId: code.id,
        refType: "invite",
      },
    })

    // 更新邀请码使用次数
    await tx.inviteCode.update({
      where: { id: code.id },
      data: {
        usedCount: { increment: 1 },
        status: code.usedCount + 1 >= code.maxUses ? "EXHAUSTED" : "ACTIVE",
      },
    })

    // 记录使用
    await tx.inviteUsage.create({
      data: { codeId: code.id, userId: user.id },
    })

    // 给邀请人发奖励（如果是用户码）
    if (code.ownerId && code.rewardCredits > 0) {
      await tx.user.update({
        where: { id: code.ownerId },
        data: { credits: { increment: code.rewardCredits } },
      })
      const inviter = await tx.user.findUnique({ where: { id: code.ownerId } })
      await tx.creditLog.create({
        data: {
          userId: code.ownerId,
          type: "INVITE_REWARD",
          amount: code.rewardCredits,
          balance: inviter!.credits,
          description: `邀请 ${user.name} 注册，奖励 ${code.rewardCredits} 积分`,
          refId: user.id,
          refType: "invite",
        },
      })
    }

    // 为新用户生成个人邀请码
    await tx.inviteCode.create({
      data: {
        code: generateCode(user.name?.slice(0, 4).toUpperCase() ?? "USER", 4),
        type: "USER",
        ownerId: user.id,
        maxUses: 5,
        credits: 50,
        rewardCredits: 20,
      },
    })

    return user
  })
}
```

### 6.2 积分消耗（预扣+结算）

```ts
async function freezeCredits(userId: string, estimated: number): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId } })
  const available = user!.credits - user!.frozen
  if (available < estimated) throw new Error("积分不足")

  // 冻结
  await db.user.update({
    where: { id: userId },
    data: { frozen: { increment: estimated } },
  })

  // 记录冻结流水
  const log = await db.creditLog.create({
    data: {
      userId,
      type: "FREEZE",
      amount: -estimated,
      balance: user!.credits,
      description: `冻结 ${estimated} 积分`,
    },
  })

  return log.id // 返回冻结记录 ID，结算时用
}

async function settleCredits(input: {
  userId: string
  freezeLogId: string
  actual: number
  sessionId: string
  details: UsageRecord[]
}) {
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } })
    const freezeLog = await tx.creditLog.findUnique({ where: { id: input.freezeLogId } })
    const frozen = Math.abs(freezeLog!.amount)

    // 解冻
    await tx.user.update({
      where: { id: input.userId },
      data: {
        frozen: { decrement: frozen },
        credits: { decrement: input.actual },
      },
    })

    // 解冻流水
    await tx.creditLog.create({
      data: {
        userId: input.userId,
        type: "UNFREEZE",
        amount: frozen,
        balance: user!.credits,
        description: `解冻 ${frozen} 积分`,
      },
    })

    // 消耗流水
    await tx.creditLog.create({
      data: {
        userId: input.userId,
        type: "CONSUMPTION",
        amount: -input.actual,
        balance: user!.credits - input.actual,
        description: `AI 创作消耗 ${input.actual} 积分`,
        refId: input.sessionId,
        refType: "session",
        metadata: input.details,
      },
    })

    // 写入消耗明细
    for (const detail of input.details) {
      await tx.usageRecord.create({ data: detail })
    }
  })
}
```

### 6.3 支付回调处理

```ts
async function handlePaymentCallback(data: PaymentCallbackData) {
  // 1. 验签
  if (!paymentProvider.verify(data)) throw new Error("签名验证失败")

  // 2. 查订单
  const order = await db.order.findUnique({ where: { id: data.orderId } })
  if (!order) throw new Error("订单不存在")
  if (order.status !== "PENDING") return // 幂等：已处理过

  // 3. 金额核对
  if (data.amount !== order.amount) throw new Error("金额不一致")

  // 4. 事务处理
  await db.$transaction(async (tx) => {
    // 更新订单
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", tradeNo: data.tradeNo, paidAt: new Date() },
    })

    // 增加积分
    await tx.user.update({
      where: { id: order.userId },
      data: { credits: { increment: order.credits } },
    })

    // 记录流水
    const user = await tx.user.findUnique({ where: { id: order.userId } })
    await tx.creditLog.create({
      data: {
        userId: order.userId,
        type: "RECHARGE",
        amount: order.credits,
        balance: user!.credits,
        description: `充值 ¥${(order.amount / 100).toFixed(2)}，获得 ${order.credits} 积分`,
        refId: order.id,
        refType: "order",
      },
    })

    // 检查邀请返利（被邀请人首充）
    await checkReferralBonus(tx, order.userId, order.credits)
  })
}

async function checkReferralBonus(tx: PrismaTransaction, userId: string, credits: number) {
  const user = await tx.user.findUnique({ where: { id: userId } })
  if (!user?.invitedById) return

  // 检查是否是首充（该用户只有 1 笔成功订单）
  const paidOrders = await tx.order.count({
    where: { userId, status: "PAID" },
  })
  if (paidOrders > 1) return // 不是首充

  // 检查邀请人本月返利次数
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const bonusCount = await tx.creditLog.count({
    where: {
      userId: user.invitedById,
      type: "REFERRAL_BONUS",
      createdAt: { gte: monthStart },
    },
  })
  if (bonusCount >= 3) return // 本月已达上限

  // 发放返利（10%）
  const bonus = Math.floor(credits * 0.1)
  if (bonus <= 0) return

  await tx.user.update({
    where: { id: user.invitedById },
    data: { credits: { increment: bonus } },
  })

  const inviter = await tx.user.findUnique({ where: { id: user.invitedById } })
  await tx.creditLog.create({
    data: {
      userId: user.invitedById,
      type: "REFERRAL_BONUS",
      amount: bonus,
      balance: inviter!.credits,
      description: `邀请的用户首充，返利 ${bonus} 积分`,
      refId: userId,
      refType: "invite",
    },
  })
}
```

### 6.4 积分消耗与 Agent Loop 的集成点

在 Agent Loop 中嵌入积分逻辑：

```ts
async function loop(sessionId: string, agent: Agent, userId: string) {
  // 操作前：预估并冻结
  const estimated = estimateCredits(agent)
  const freezeId = await freezeCredits(userId, estimated)
  const usages: UsageRecord[] = []

  try {
    while (true) {
      const messages = await loadMessages(sessionId)
      const system = buildSystemPrompt(agent)
      const tools = resolveTools(agent)

      const result = await streamText({
        model: getModel(agent.model),
        system,
        messages,
        tools,
      })

      for await (const chunk of result.fullStream) {
        if (chunk.type === "tool-call") {
          const output = await executeTool(chunk, sessionId, agent)
          await saveToolResult(sessionId, chunk.toolCallId, output)
        }
        pushToClient(sessionId, chunk)
      }

      // 记录本轮 token 消耗
      usages.push({
        userId,
        sessionId,
        agentId: agent.name,
        type: "LLM",
        model: agent.model,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        images: 0,
        credits: calculateTokenCredits(agent.model, result.usage),
      })

      // 处理生图
      if (agent.capabilities.imageGen?.enabled) {
        const imageResult = await processImageGeneration(agent, result.text, sessionId)
        if (imageResult.count > 0) {
          usages.push({
            userId,
            sessionId,
            agentId: agent.name,
            type: "IMAGE_GEN",
            model: `${agent.capabilities.imageGen.provider}/${agent.capabilities.imageGen.model}`,
            inputTokens: 0,
            outputTokens: 0,
            images: imageResult.count,
            credits: calculateImageCredits(agent.capabilities.imageGen, imageResult.count),
          })
        }
      }

      if (result.finishReason !== "tool-calls") break
    }
  } finally {
    // 操作后：结算（无论成功失败都要解冻）
    const actual = usages.reduce((sum, u) => sum + u.credits, 0)
    await settleCredits({ userId, freezeLogId: freezeId, actual, sessionId, details: usages })
  }
}
```

---

## 七、前端页面

### 7.1 新增页面

```
/register              → 注册页（含邀请码输入）
/login                 → 登录页
/credits               → 积分中心（余额 + 充值 + 流水）
/credits/recharge      → 充值页（套餐选择 + 支付）
/invite                → 邀请页（我的邀请码 + 邀请记录）
/usage                 → 消耗统计（图表）
```

### 7.2 积分中心布局

```
┌──────────────────────────────────────────────────┐
│ 积分中心                                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 可用积分  │ │ 冻结中   │ │ 本月消耗  │        │
│  │   128    │ │   15     │ │   342    │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                    [充值]       │
│                                                  │
│  ── 积分流水 ──────────────────────────────────  │
│                                                  │
│  2026-03-23  注册赠送         +50    余额 50     │
│  2026-03-23  小红书图文创作    -18    余额 32     │
│  2026-03-23  充值 ¥20         +2500  余额 2532  │
│  2026-03-23  网文创作          -8     余额 2524  │
│  ...                                             │
│                                                  │
│  ── 消耗分析 ──────────────────────────────────  │
│                                                  │
│  [柱状图：每日消耗趋势]                            │
│  [饼图：按 Agent 分布]                            │
│  [饼图：LLM vs 生图]                             │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 7.3 充值页布局

```
┌──────────────────────────────────────────────────┐
│ 充值积分                                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  选择套餐：                                       │
│                                                  │
│  ┌────────────┐ ┌────────────┐                  │
│  │ 体验包      │ │ 基础包 ✨   │                  │
│  │ ¥5         │ │ ¥20        │                  │
│  │ 600 积分    │ │ 2,500 积分  │                  │
│  └────────────┘ └────────────┘                  │
│  ┌────────────┐ ┌────────────┐                  │
│  │ 标准包      │ │ 专业包      │                  │
│  │ ¥50        │ │ ¥100       │                  │
│  │ 6,500 积分  │ │ 14,000 积分 │                  │
│  └────────────┘ └────────────┘                  │
│                                                  │
│  支付方式：                                       │
│  ○ 微信支付   ○ 支付宝                            │
│                                                  │
│  [确认充值 ¥20]                                   │
│                                                  │
│  支付后积分实时到账                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 7.4 邀请页布局

```
┌──────────────────────────────────────────────────┐
│ 邀请好友                                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  你的邀请码：                                     │
│  ┌─────────────────────────────────────────┐    │
│  │   MOZE-7K2F         [复制] [分享]       │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  已邀请 3/5 人                                    │
│  累计获得 60 积分奖励                              │
│                                                  │
│  规则：                                           │
│  • 每邀请 1 人，你获得 20 积分                     │
│  • 好友注册即得 50 积分                            │
│  • 好友首充，你额外获得 10% 返利                   │
│                                                  │
│  ── 邀请记录 ──────────────────────────────────  │
│                                                  │
│  小明    2026-03-20  已注册    +20 积分           │
│  小红    2026-03-21  已注册    +20 积分           │
│  小刚    2026-03-22  已充值    +20 +50(返利)      │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 八、补充到 MVP 数据模型

在原有的 Workspace/Agent/Skill/Bundle/Session 之外，新增以上 User/InviteCode/Order/CreditLog/UsageRecord 五个模型。

完整的模型关系：

```
User
  ├── 1:1  InviteCode
  ├── 1:N  Order
  ├── 1:N  CreditLog
  ├── 1:N  UsageRecord
  ├── M:N  Workspace
  │         ├── Agent[]
  │         ├── Skill[]
  │         ├── Bundle[]
  │         └── Session[]
  │               ├── parentId? → 子 agent 会话
  │               └── Message[] → Part[]
  ├── N:1  User (invitedBy)
  └── 1:N  User (invitees)
```

---

## 九、安全与风控

| 风险           | 措施                                                       |
| -------------- | ---------------------------------------------------------- |
| 刷注册薅积分   | 邀请码限次 + 同 IP 24h 限 3 次注册 + 邮箱验证              |
| 邀请返利刷单   | 每人每月返利上限 + 首充才返 + 最多 3 次                    |
| 并发扣费竞态   | 冻结机制 + 数据库事务 + 乐观锁                             |
| 支付回调伪造   | 验签 + 金额核对 + 幂等                                     |
| 订单超时不关闭 | 定时任务扫描 30min 未支付订单，状态改 EXPIRED              |
| 积分余额负数   | 冻结时检查可用余额（credits - frozen），结算时允许小额超支 |
