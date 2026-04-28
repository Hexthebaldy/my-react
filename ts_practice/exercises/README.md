# 配套练习

每个阶段配套练习放在对应子目录下。建议：

1. 在本目录初始化一个 TS 环境（已有 tsconfig 模板见下方）
2. 每个 exercise 一个文件，命名如 `1.1-add-types.ts`
3. 完成后用 `npx tsc --noEmit` 检查（或用 IDE 直接看红线）
4. 标准答案先不放，挑战自己——卡 30 分钟以上再去查

## 推荐 tsconfig（学习用）

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["**/*.ts"]
}
```

## 目录规划

```
exercises/
├── README.md                     ← 本文件
├── tsconfig.json                 ← 学习环境配置（自行创建）
├── phase-01/                     ← Phase 1 五道题
├── phase-02/                     ← Phase 2 五道题
├── phase-03/                     ← Phase 3 六道题
├── phase-04/                     ← Phase 4 七道题
├── phase-05/                     ← 类型体操，含 type-challenges 答案
└── phase-06/                     ← 综合项目（任选一个）
```

每个阶段目录创建一个 `index.ts`，把题目写成测试用例形式：

```ts
// phase-01/1.1-add-types.ts
// TODO: 给下面的函数加上类型注解
export function repeat(s, n) {
  return Array(n).fill(s).join('')
}

// 期望以下调用都通过类型检查：
const ok1: string = repeat('a', 3)
// 期望以下调用类型检查失败（用 // @ts-expect-error 标注）：
// @ts-expect-error
const fail1 = repeat(1, 3)
```

`@ts-expect-error` 注释的妙处：如果"期望出错"的代码居然没出错，编译器会反过来报错。这是给类型测试用例的最佳手段。

## 进度追踪

完成一道题就在下面打勾（自行编辑此文件）：

### Phase 1 — 类型基础
- [ ] 1.1 为 JS 函数加类型
- [ ] 1.2 unknown 收窄
- [ ] 1.3 穷尽性检查
- [ ] 1.4 字面量 union 替代 enum
- [ ] 1.5 as const 派生类型

### Phase 2 — 对象与函数
- [ ] 2.1 interface vs type 选择
- [ ] 2.2 函数重载 createElement
- [ ] 2.3 this 类型
- [ ] 2.4 元组 + 剩余参数
- [ ] 2.5 readonly 防御类型

### Phase 3 — 类与模块
- [ ] 3.1 类的类型化（Account）
- [ ] 3.2 抽象类（Shape）
- [ ] 3.3 泛型工厂 instantiate
- [ ] 3.4 写 d.ts（counter.js）
- [ ] 3.5 模块扩展（Window）
- [ ] 3.6 import type 改造

### Phase 4 — 泛型与收窄
- [ ] 4.1 keyof 路径 getProp
- [ ] 4.2 自定义类型谓词 isNonEmptyArray
- [ ] 4.3 断言函数 assertDefined
- [ ] 4.4 可辨识联合状态机
- [ ] 4.5 unknown 收窄
- [ ] 4.6 merge 泛型
- [ ] 4.7 typeof + keyof 派生 ROUTES

### Phase 5 — 类型体操
- [ ] Tier 1：手撕 9 个工具类型
- [ ] Tier 2：type-challenges Easy 全部
- [ ] Tier 3：type-challenges Medium 至少 20 道
- [ ] Tier 4-1：Path<T>
- [ ] Tier 4-2：PathValue<T, P>
- [ ] Tier 4-3：RouteParams<S>
- [ ] Tier 4-4：Handlers<EventMap>

### Phase 6 — 综合项目（任选一）
- [ ] 项目 A：TypedEmitter
- [ ] 项目 B：状态机
- [ ] 项目 C：类型化路由
- [ ] 项目 D：generator.ts 重构
