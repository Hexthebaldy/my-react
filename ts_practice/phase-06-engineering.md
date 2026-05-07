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

### 必须理解的几个开关（详解）

下面这些开关是 tsconfig 里**最常被问、影响最大**的几个。每一个都讲清楚"它在防什么坑"。

---

#### 开关 1：`strict: true` —— 严格模式总开关

`strict: true` 是 TS 的**核心开关**。它一次性打开 **7 个相关检查**——其中最重要的两个：

##### `noImplicitAny`：不许"隐式 any"

```ts
// 关闭时（不严格）：
function add(a, b) { return a + b }
//             ↑ ↑
//   TS 没有信息，悄悄给 a、b 推为 any
//   等于关掉了类型检查

// 打开后：
function add(a, b) { return a + b }
//             ↑ ↑ ❌ Parameter 'a' implicitly has an 'any' type
// 强制你显式写类型
```

##### `strictNullChecks`：null/undefined 不能当作"任何类型"用

```ts
// 关闭时（不严格）：
function len(s: string) { return s.length }
len(null)   // ✅ 编译通过（TS 把 null 当作合法 string）
            // 但运行时炸：null.length

// 打开后：
len(null)   // ❌ 编译期就拦住
len('hi')   // ✅
```

不开 `strict` 等于回到"半个 JS"——TS 的核心价值都没用上。**所有新项目无脑开 strict**。

---

#### 开关 2：`noUncheckedIndexedAccess` —— 修复 TS 的"数组越界谎言"

##### 问题：默认 TS 撒谎说"数组取值永远不会 undefined"

```ts
const arr = [1, 2, 3]
const x = arr[10]      // x: number  ← TS 说有！
console.log(x.toFixed(2))   // 运行时炸：Cannot read properties of undefined
```

数组越界明明会拿到 `undefined`，但 TS **默认不管**——它对每个 `arr[i]` 都假定"一定有值"。

##### 开了之后

```ts
const arr = [1, 2, 3]
const x = arr[10]      // x: number | undefined  ← 实事求是
x.toFixed(2)           // ❌ 编译报错，强制你处理 undefined

if (x !== undefined) {
  x.toFixed(2)         // ✅ 收窄后才能用
}
```

同样作用于对象的索引访问：

```ts
const dict: Record<string, User> = ...
const u = dict['unknown']   // u: User | undefined（开关打开后）
                            // u: User（开关关闭时——撒谎）
```

**强烈推荐开**——这是个真实存在的运行时陷阱，TS 默认装看不见。开了之后稍微啰嗦点，但安全得多。

---

#### 开关 3：`exactOptionalPropertyTypes` —— 区分"字段不存在"和"字段是 undefined"

##### 问题：可选字段 `?` 默认会偷偷加上 undefined

```ts
type User = { name: string; email?: string }

// 关闭时（默认）：
const u: User = { name: 'a', email: undefined }   // ✅ 通过
                                       ↑
                       TS 把 email?: string 当成 email?: string | undefined
```

但语义上，`email?` 应该是"**可以省略**"，而不是"**可以显式赋 undefined**"。这两件事在某些场景下行为不同：

```ts
const obj = { email: undefined }
'email' in obj        // true   ← 字段存在，只是值为 undefined
obj.email             // undefined

const obj2 = {}
'email' in obj2       // false  ← 字段根本不存在
obj2.email            // undefined（但读起来报错）
```

##### 开了之后

```ts
const u: User = { name: 'a', email: undefined }   // ❌ 不允许显式 undefined
const u: User = { name: 'a' }                      // ✅ 省略才是正确做法
```

强制让"可选" = "省略"，不允许把 undefined 当合法值塞进去。**对 API 调用、JSON 序列化场景非常重要**——避免发出去的请求带着 `email: undefined` 这种垃圾字段。

---

#### 开关 4：`verbatimModuleSyntax` —— 强制区分"类型 import"

##### 问题：默认 TS 不区分"导入的是值还是类型"

```ts
// app.ts
import { User } from './types'    // User 只是个 type/interface
//                                  这一行编译后，TS 自动判断"User 是类型，删掉"

// 编译产物：（一行都没了）
```

但**Babel/esbuild/SWC 这类快速工具单文件编译**——它们看不到 `./types` 里 User 是啥，**会把这行原样保留**：

```js
import { User } from './types'   // 运行时炸：types.js 里没有 User
```

##### 开了之后：必须显式标注 `type`

```ts
// 必须写明白：
import type { User } from './types'   // 仅类型，编译后删掉
import { type User } from './types'   // 行内写法

// 混用值和类型时：
import { someFn, type User } from './types'
```

这样 esbuild 看到 `type` 关键字，知道"这是类型，要删掉"。

**新项目强烈推荐开**——避免后续遇到 esbuild/SWC 兼容问题。

---

#### 开关 5：`isolatedModules` —— 强制"每个文件能独立编译"

##### 问题：某些 TS 语法需要"看其他文件"才能正确编译

例子 1：转发未知是值还是类型的 export

```ts
// types.ts
export interface User { ... }
export class Account { ... }

// app.ts
export { User, Account } from './types'
                              // 单看 app.ts，esbuild 不知道 User 是 interface
                              // 会把它原样保留 → 运行时炸
```

例子 2：`const enum` 内联

```ts
const enum Color { Red, Green }   // tsc 会把使用方的 Color.Red 替换成 0
                                   // 但 esbuild 做不到（它不读 enum 定义文件）
```

##### 开了之后：禁止这类"跨文件依赖"的语法

```ts
export { User, Account } from './types'
// ❌ 'User' is a type and must be imported using a type-only import
// 强制改成：
export { type User, Account } from './types'
```

**任何用 Vite/Next/Webpack-with-Babel 的项目都该开**——保证你写的代码跟快速编译工具兼容。

---

#### 开关 6：`skipLibCheck` —— 跳过 node_modules 的类型检查

##### 问题：node_modules 里第三方库的 .d.ts 也会被 tsc 检查

某个库的类型定义有点小毛病、或者跟其他库类型冲突——你没改任何代码，但 tsc 一跑就报一堆错。这种错你改不了（不是你的代码），还拖慢编译速度。

##### 开了之后

跳过 `node_modules/**/*.d.ts` 的检查，**编译速度立刻提升 30-70%**。代价是丢失了对依赖类型的彻底验证——但 99% 的项目都不需要这种验证。

**所有新项目无脑开**——这是社区共识，几乎没有不开的理由。

---

#### 开关 7：`noEmit` —— 不输出 .js，只做类型检查

##### 用法 1：现代项目分工

现代 Vite/Next.js 项目里：
- **打包/转译** 由 Vite/esbuild 负责（快速擦类型）
- **类型检查** 由 tsc 负责（严格但慢）

如果 tsc **同时也输出 .js**，会跟打包器的产物**打架**——一份代码两套 .js 文件，混乱。所以让 tsc 只检查不输出：

```jsonc
{ "compilerOptions": { "noEmit": true } }
```

```sh
$ tsc           # 只跑类型检查，不生成任何 .js
$ vite build    # 打包器负责生成最终产物
```

##### 用法 2：CI 类型检查

CI 里这么跑：

```sh
tsc --noEmit    # 只检查，有错就让 CI 红，阻止 merge
```

不需要产物的场景（脚手架检查、PR 把关），加 `--noEmit` 跑得更快。

##### 什么时候不开

- **写库**（用 tsc 编译输出 .js + .d.ts 给用户用）→ **不开**
- **传统 Webpack + Babel 配置**（让 tsc 输出 .js 给 Webpack 处理）→ **不开**
- **现代打包器项目（Vite/Next 等）** → **开**

---

### 速查表（看完详解后翻这个）

| 开关 | 一句话 | 推荐 |
|---|---|---|
| `strict` | 严格模式总开关 | ✅ 无脑开 |
| `noUncheckedIndexedAccess` | `arr[i]` 自动 `T \| undefined` | ✅ 强烈推荐 |
| `exactOptionalPropertyTypes` | `?` 不再隐含 `undefined` | ✅ 推荐 |
| `verbatimModuleSyntax` | 强制 `import type` | ✅（新项目） |
| `isolatedModules` | 每文件独立编译 | ✅（用 Vite/esbuild 时必开） |
| `skipLibCheck` | 跳过 node_modules 类型检查 | ✅ 无脑开 |
| `noEmit` | 不输出 .js | 看场景 |

## 二、渐进式 JS → TS 迁移

### 2.1 这一节在解决什么问题

假设你接手了一个**纯 JS 写的老项目**——成千上万行代码，没有任何类型。现在你想把它改成 TS，但**一次性全改不现实**：
- 几百个文件，全改完没两个月搞不定
- 改的同时还得继续做业务，不能停
- 改坏了上线出 bug 谁负责

所以业界标准做法是 **"渐进式迁移"**——**一次改一点，新老代码共存**，慢慢往 TS 过渡。下面 4 步是社区最成熟的迁移路径。

> ⚠️ 前提：**所有配置都写在项目根目录的 `tsconfig.json` 里**——就是上一节讲的那个文件。如果你的项目还没有，先 `npx tsc --init` 生成一个（你用不了 npm 的话，手动创建一个 `tsconfig.json` 也行）。

---

### 2.2 Step 1：让 tsc 也认 .js 文件 — `allowJs` + `checkJs`

打开 `tsconfig.json`，加上这几个选项：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "allowJs": true,       // 让 tsc 也处理 .js 文件（默认只处理 .ts）
    "checkJs": true,       // 让 tsc 真的去【检查】这些 .js 文件的类型
    "strict": false        // 严格模式先关掉（老 JS 代码扛不住）
  },
  "include": ["src"]       // 处理 src 下所有 .js 和 .ts 文件
}
```

#### 这两个开关在干什么

**`allowJs: true`**
- 默认情况下，tsc **只看 .ts 文件**——你的 .js 文件它当不存在
- 开了这个，.js 文件也会被纳入编译范围（能跟 .ts 文件互相 import）

**`checkJs: true`**
- 仅仅 `allowJs` 还不够——它只是允许处理 .js，但不会**主动检查**
- `checkJs` 让 tsc 像对 .ts 一样去检查 .js 文件的类型错误

#### 开了之后会发生什么

```js
// utils.js
function greet(name) {
  return name.toUpperCase()
}

greet(42)    // 之前：随便传，运行时炸
             // 现在：tsc 在编辑器里画红线提示 "number 没有 toUpperCase"
```

**老 JS 代码立刻被类型检查覆盖**——一行代码没改，但已经能从中发现 bug。

#### 单文件级别的开关：`// @ts-check`

如果你不想全局开 `checkJs`（怕一开报 800 个错），可以**只在想检查的文件顶部加注释**：

```js
// @ts-check  ← 只对这个文件生效

function greet(name) {
  return name.toUpperCase()
}
```

或者反过来，全局开了之后想跳过某个文件：

```js
// @ts-nocheck  ← 这个文件别检查
```

**实战推荐**：先全局关 `checkJs`，逐文件加 `// @ts-check` 慢慢放开——风险更可控。

---

### 2.3 Step 2：用 JSDoc 给 JS 加类型（不改后缀）

```js
// utils.js（注意还是 .js）

/**
 * @param {string} name
 * @param {number} age
 * @returns {string}
 */
function greet(name, age) {
  return `${name} is ${age}`
}

greet('a', 30)         // ✅
greet(42, 'a')         // ❌ tsc 报错：第一个参数应是 string
```

#### JSDoc 是什么

**JSDoc 是用注释写文档的标准**——很多年前就有了，本来是给文档生成器（jsdoc.app）用的。TS 后来"借用"了它的语法，让你**用注释表达类型**：

| TS 语法 | JSDoc 等价写法 |
|---|---|
| `(name: string) => string` | `@param {string} name` |
| `: number` | `@type {number}` |
| `interface User { ... }` | `@typedef {{...}} User` |
| `Foo<T>` | `@template T` |

#### 为什么用 JSDoc 而不直接改 .ts

**好处**：
- 文件后缀不变（还是 .js），不影响 import 路径、构建配置、CI
- 风险极低：注释是注释，运行时彻底无感
- 改坏了 revert 简单（删几行注释就行）
- 不用一下子学全 TS 的语法，慢慢加

**适合场景**：
- 老项目刚开始迁移，团队还没准备好
- 写 npm 包，想给用户提供类型但不引入构建步骤

#### 完整 JSDoc 示例

```js
/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name
 */

/**
 * @param {User} user
 * @param {string[]} tags
 * @returns {Promise<User>}
 */
async function updateUser(user, tags) {
  // ...
}
```

效果**几乎等价于**：

```ts
type User = { id: number; name: string }
async function updateUser(user: User, tags: string[]): Promise<User> { /* ... */ }
```

但写起来确实啰嗦——所以 JSDoc 通常只是**临时方案**，最终目标还是改成 .ts。

---

### 2.4 Step 3：逐文件把 .js 改成 .ts

第二步铺垫好之后，开始**真改**——一次只改一个文件：

```sh
# 把 utils.js 改成 utils.ts
mv src/utils.js src/utils.ts

# 把 JSDoc 注释翻译成 TS 类型语法
```

```ts
// utils.ts
function greet(name: string, age: number): string {
  return `${name} is ${age}`
}
```

#### 操作建议

**从叶子节点开始改**——也就是"被很多人 import、自己不 import 别的"的文件先改：

```
工具函数 (utils.ts)        ← 第一批改这种
   ↑
被各种业务模块 import       ← 后改这些
   ↑
被组件 import              ← 最后改这些
```

理由：底层先稳，上层改的时候才有靠谱的类型可用。

#### 渐进开 strict

刚开始一定要 `strict: false`——老代码很多 `any` 一开严格就一片红。改完一批后再**逐步打开严格模式**：

```jsonc
// 阶段 1：基本能跑就行
{ "strict": false }

// 阶段 2：先开几个关键的
{
  "strict": false,
  "noImplicitAny": true,        // 至少不让随便 any
  "strictNullChecks": true      // 至少处理 null
}

// 阶段 3：全严格
{ "strict": true }
```

每开一个新检查就会冒出一堆错——**一批一批改**，不要试图一次开全。

---

### 2.5 Step 4：最难的部分留到最后

迁移过程中最麻烦的几类代码——别一上来碰它们，让团队先熟练 TS 再说：

#### ① 全局变量

```js
// 老代码常见写法
window.__APP_VERSION__ = '1.0'
window.gtag('event', 'click')
```

这种**改 TS 后会立刻报错**：`Property '__APP_VERSION__' does not exist on type 'Window'`。要修就得写**模块扩展**（Phase 3 讲过）：

```ts
// global.d.ts
declare global {
  interface Window {
    __APP_VERSION__: string
    gtag: (event: string, action: string) => void
  }
}
export {}
```

牵涉到怎么组织 .d.ts、include 路径、构建影响——比较绕。

#### ② 复杂的 HOC（高阶组件）

```js
// 给组件包一层加超能力——TS 类型推导极复杂
const withAuth = (Component) => (props) => {
  if (!isLoggedIn()) return <Login />
  return <Component {...props} />
}
```

要让 `withAuth(MyComp)` 自动推出 props 类型，得用泛型 + `ComponentType` 等，新人很难一次写对。

#### ③ 动态事件总线 / pub-sub

```js
// 这种"运行时动态注册事件"在 TS 里很难精确建模
emitter.on('user:login', (user) => {})
emitter.on('cart:update', (cart) => {})
```

要做到"事件名和 payload 类型一一对应"得用**映射类型 + 泛型 + 字面量**——Phase 5 学完才能写得优雅。

**应对策略**：
- 这些文件**最后改**，让团队先在简单文件上练手
- 实在搞不定就先用 `any` 顶住，别让它阻塞整体进度
- 等熟练了再回头精修

---

### 2.6 整体节奏建议

```
Week 1-2:   配 tsconfig，开 allowJs/checkJs，用 // @ts-check 开个口子
Week 3-6:   用 JSDoc 给核心工具/数据模型加类型
Week 7+:    逐文件 .js → .ts，从叶子模块开始
逐步:       开 noImplicitAny → strictNullChecks → 全 strict
最后:       全局变量、HOC、事件系统这些硬骨头
```

**一个中型项目（10w 行级别）从 0% TS 到 100% TS，通常需要 3-6 个月**——不要追求快，要追求**每周都比上周更安全**。

---

### 2.7 关键开关速查

```jsonc
// tsconfig.json — 迁移期推荐配置
{
  "compilerOptions": {
    "allowJs": true,            // 让 tsc 处理 .js
    "checkJs": false,           // 全局别检查（用 // @ts-check 单文件开）
    "strict": false,            // 严格模式后期再开
    "noImplicitAny": true,      // 但至少不让 any 满天飞

    "outDir": "dist",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

| 文件级注释 | 作用 |
|---|---|
| `// @ts-check` | 单文件启用类型检查（即使全局没开） |
| `// @ts-nocheck` | 单文件**关闭**类型检查（即使全局开了） |
| `// @ts-ignore` | 忽略**下一行**的类型错误 |
| `// @ts-expect-error` | 期望**下一行**有错（如果没错反而报错——做迁移测试用） |

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
