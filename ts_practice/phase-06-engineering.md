# Phase 6：工程化与生态（Week 8）

> 目标：能为大型项目设计 TS 配置；能在 React/Node 项目中精准使用类型；能识别和优化编译性能瓶颈

## 知识图谱

```
工程化
├── tsconfig.json 详解
│   ├── strict 系列开关
│   ├── module / moduleResolution / target
│   ├── jsx / jsxImportSource
│   ├── paths / baseUrl
│   ├── isolatedModules / verbatimModuleSyntax
│   ├── lib / types / typeRoots
│   ├── declaration / declarationMap / sourceMap
│   └── 性能相关：incremental / skipLibCheck / composite
├── 渐进式迁移 JS → TS
│   ├── allowJs + checkJs
│   ├── // @ts-check / // @ts-nocheck
│   ├── JSDoc 标注（不改后缀就能加类型）
│   └── 文件粒度逐步切换
├── React 集成
│   ├── React.FC 用还是不用
│   ├── 组件 Props 设计
│   ├── 受控/非受控组件类型
│   ├── ref 类型（forwardRef / useRef）
│   ├── 事件类型（SyntheticEvent 家族）
│   ├── 泛型组件
│   └── polymorphic 组件（as prop）
├── Node 集成
│   ├── @types/node
│   ├── ESM vs CJS（exports / type module）
│   └── process.env 类型化
├── 性能优化
│   ├── skipLibCheck（必开）
│   ├── 项目引用（project references）
│   ├── declaration cache
│   └── 减少深递归类型 / 大量 union
└── 生态工具
    ├── Zod / Valibot / ArkType（运行时校验）
    ├── tRPC（端到端类型）
    ├── ts-reset / type-fest（类型增强库）
    └── tsx / ts-node / vitest 类型支持
```

## 一、tsconfig.json — 你写过的最重要的配置文件

### 推荐基线（现代项目）

```jsonc
{
  "compilerOptions": {
    /* === 严格模式（一定开） === */
    "strict": true,                          // 等价于打开下面所有
    // "noImplicitAny": true,
    // "strictNullChecks": true,
    // "strictFunctionTypes": true,
    // "strictBindCallApply": true,
    // "strictPropertyInitialization": true,
    // "alwaysStrict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,        // 强烈推荐：arr[i] 自动变 T | undefined
    "exactOptionalPropertyTypes": true,      // 可选字段不再隐式包含 undefined

    /* === 模块系统 === */
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",           // Vite/Webpack/esbuild 项目
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,            // 强制 import type，更安全
    "resolveJsonModule": true,

    /* === JSX === */
    "jsx": "react-jsx",                      // React 17+ 新转换

    /* === 编译输出 === */
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "noEmit": true,                          // Vite 等用打包器时设 true，让 tsc 只做检查

    /* === 性能 === */
    "skipLibCheck": true,                    // 必开，跳过 node_modules 类型检查
    "incremental": true,

    /* === 路径别名 === */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 必须理解的几个开关

| 开关 | 作用 | 推荐 |
|---|---|---|
| `strict` | 总开关 | ✅ 必开 |
| `noUncheckedIndexedAccess` | `arr[i]` 自动加 undefined | ✅ 强烈推荐 |
| `exactOptionalPropertyTypes` | `{ x?: string }` 不允许显式赋 undefined | ✅ |
| `verbatimModuleSyntax` | 严格区分 import type | ✅（新项目） |
| `skipLibCheck` | 跳过 node_modules .d.ts 检查 | ✅ |
| `isolatedModules` | 每个文件可独立编译（Babel/SWC 必需） | ✅ |
| `noEmit` | 只检查不输出（用打包器时开） | 视情况 |

## 二、渐进式 JS → TS 迁移

### Step 1：开启 `allowJs` + `checkJs`
```jsonc
{ "compilerOptions": { "allowJs": true, "checkJs": true, "strict": false } }
```

### Step 2：用 JSDoc 注解（不改后缀）
```js
/**
 * @param {string} name
 * @param {number} age
 * @returns {string}
 */
function greet(name, age) { return `${name} is ${age}` }
```

### Step 3：逐文件改 .ts，逐步开启 strict

### Step 4：最难的部分留到最后
- 全局变量
- 高阶组件
- 复杂的事件总线 / pub-sub

## 三、React 中的 TS

### 组件 Props
```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}

function Button({ variant = 'primary', onClick, children }: ButtonProps) {
  return <button onClick={onClick} data-variant={variant}>{children}</button>
}
```

### `React.FC` 用不用？
**不推荐**用：
- 隐式包含 `children`（即使你不需要）
- 不能轻易加泛型
- 在 React 18 后已被官方淡化

直接用普通函数 + `Props` 类型即可。

### useRef 与 forwardRef
```tsx
const ref = useRef<HTMLInputElement>(null)
// ref.current: HTMLInputElement | null

const Input = forwardRef<HTMLInputElement, InputProps>(({ value }, ref) => {
  return <input ref={ref} value={value} />
})
```

### 事件类型一览
- `MouseEvent<T>` — onClick、onMouseEnter
- `ChangeEvent<T>` — input/select/textarea
- `KeyboardEvent<T>` — onKeyDown
- `FocusEvent<T>` — onFocus、onBlur
- `FormEvent<T>` — onSubmit

### 泛型组件
```tsx
type SelectProps<T> = {
  options: T[]
  value: T
  onChange: (v: T) => void
  getKey: (v: T) => string | number
}

function Select<T>({ options, value, onChange, getKey }: SelectProps<T>) {
  return (
    <select value={getKey(value)} onChange={e =>
      onChange(options.find(o => String(getKey(o)) === e.target.value)!)
    }>
      {options.map(o => <option key={getKey(o)} value={getKey(o)}>{String(o)}</option>)}
    </select>
  )
}
```

### Polymorphic 组件（as prop）— 进阶
```tsx
type AsProp<C extends React.ElementType> = { as?: C }
type PropsWithAs<C extends React.ElementType, P> =
  P & AsProp<C> & Omit<React.ComponentPropsWithoutRef<C>, keyof (P & AsProp<C>)>

function Box<C extends React.ElementType = 'div'>(props: PropsWithAs<C, { color?: string }>) {
  const { as, color, ...rest } = props
  const Comp = as ?? 'div'
  return <Comp style={{ color }} {...rest as any} />
}

// 用法
<Box>div</Box>
<Box as="a" href="/x">link</Box>            // 自动有 a 标签的所有 props
<Box as="button" onClick={() => {}} />      // 同上
```

这是 Chakra UI、Radix 等设计系统的核心模式。

## 四、Node 项目中的 TS

### 安装类型
```sh
# npm i -D @types/node typescript tsx
```
（用户的全局规则禁止包管理器命令，仅做参考写法。）

### process.env 类型化
默认 `process.env.X` 是 `string | undefined`。可以扩展：
```ts
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    NODE_ENV: 'development' | 'production' | 'test'
    PORT?: string
  }
}
```

### ESM 还是 CJS？
- 现代 Node 项目首选 ESM：`"type": "module"` + `import/export`
- `tsconfig.module = "NodeNext"`，`moduleResolution = "NodeNext"`
- 路径要写 `.js`（即使源文件是 `.ts`）— ESM 的怪规则

## 五、性能优化（项目大了会遇到）

### 必开：`skipLibCheck`
不检查 node_modules 里的 .d.ts，编译速度立刻提升 50%+。

### 项目引用（Project References）
适合 monorepo / 大型项目，让 tsc 增量编译。
```jsonc
// tsconfig.json
{ "references": [{ "path": "./packages/utils" }, { "path": "./packages/web" }] }
```
配合 `composite: true`、`declaration: true`，子项目独立编译并产出 .d.ts。

### 减少类型复杂度
- 避免 50+ 项的 union
- 避免深度递归类型（必要时设递归保护）
- 大表用 `interface` 比 `type` 编译更快

### 排查瓶颈
```sh
tsc --extendedDiagnostics
# 关键指标：Check time、Total memory used、Files
```

## 六、生态工具（强烈推荐了解）

| 工具 | 解决什么 | 推荐理由 |
|---|---|---|
| **Zod** | 运行时数据校验 + 类型推导 | API 边界、表单校验，**必学** |
| **type-fest** | 大量实用类型（PartialDeep、ReadonlyDeep...） | 不重复造轮子 |
| **ts-reset** | 修复内置类型的"宽松"问题（如 `JSON.parse: any`） | 一行 import 提升整个项目类型严格度 |
| **tRPC** | 前后端共享类型，无需写 schema | 全栈 TS 项目首选 |
| **ts-pattern** | 模式匹配（switch 升级版） | 处理可辨识联合的好搭档 |

### Zod 范式（每个 TS 开发者都该会）
```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().optional(),
})

type User = z.infer<typeof UserSchema>      // 自动推导出 TS 类型

const u = UserSchema.parse(rawData)         // 运行时校验 + 类型断言
```

## 七、综合实战项目（Phase 6 收官）

挑选一个做完，作为 8 周学习的毕业项目：

### 项目 A：类型安全的 EventEmitter
```ts
type EventMap = {
  login: { userId: number; ts: number }
  logout: { userId: number }
  error: Error
}

class TypedEmitter<E extends Record<string, any>> {
  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): this { /* ... */ }
  emit<K extends keyof E>(event: K, payload: E[K]): void { /* ... */ }
}

const ee = new TypedEmitter<EventMap>()
ee.on('login', p => p.userId)               // ✅ p 自动推断为 { userId; ts }
ee.emit('login', { userId: 1, ts: 0 })      // ✅
ee.emit('login', { userId: 1 })             // ❌ 缺 ts
```

### 项目 B：迷你 React 状态机（仿 XState 简化版）
设计一个有限状态机的类型，让 `transition(state, event)` 的返回类型精确依赖于当前 state。

### 项目 C：类型化路由（仿 React Router）
- 给定路由表 `{ '/users/:id': UserPage, '/posts/:slug': PostPage }`
- 提供 `Link to="/users/:id"` 自动校验 params 是否齐全
- 提供 `useParams()` 自动推导出当前路由的 params 类型

### 项目 D：把 `js_practice/generator.js` 翻译成 TS
- 加上完整类型
- 写出 Generator 的类型签名（`Generator<TYield, TReturn, TNext>`）
- 用泛型让外部能复用

---

## 8 周学习总检查清单

回看一下，你能做到吗？

### 类型基础
- [ ] 准确说出 `any` / `unknown` / `never` 的差异和场景
- [ ] 用字面量 union 替代所有 enum
- [ ] 不滥用 `as`、`!`，能用类型守卫优先用类型守卫

### 对象与函数
- [ ] 知道何时用 interface 何时用 type
- [ ] 能写函数重载，知道它和泛型的优劣
- [ ] 元组 / 剩余元素能玩转

### 类与模块
- [ ] 看见 `typeof Class` 不发懵
- [ ] 能给一个纯 JS 库手写 .d.ts
- [ ] `import type` 用得正确

### 泛型与收窄
- [ ] 写得出 `pick`、`get`、`groupBy` 的精确签名
- [ ] 写自定义类型谓词
- [ ] 用可辨识联合处理状态

### 类型编程
- [ ] 不看答案手撕 `Partial` / `ReturnType` / `Awaited`
- [ ] 解决 type-challenges medium 题
- [ ] 看到 `T extends infer U ? ...` 知道在干什么

### 工程化
- [ ] 能从零写出合理的 tsconfig
- [ ] 会用 Zod 做边界校验
- [ ] 知道大型项目的性能优化手段

---

## 下一步：成为 TS 专家的路

8 周学习计划走完，你的水平大约是"中高级 TS 开发者"。要继续深入：

1. **读源码**：精读 lodash、zod、tRPC、redux-toolkit 的类型定义。看大佬怎么写。
2. **造轮子**：自己实现一个小型 zod-like 库 / 状态机库 / 路由库
3. **跟进 TS 版本**：每次 minor release 都看 release notes（特别是 4.x → 5.x → 6.x 的演进）
4. **挑战 type-challenges hard 题**：medium 都做完后，hard 是 boss 关
5. **关注社区**：
   - [Matt Pocock (totaltypescript)](https://www.totaltypescript.com/) — 最优秀的 TS 教学博主之一
   - [Type-Level TypeScript](https://type-level-typescript.com/)
   - 微软 TS 团队成员的 GitHub Issue 讨论

回到主页：[README.md](./README.md)
