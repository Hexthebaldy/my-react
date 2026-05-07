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

React + TS 是现代前端的标配，但有一堆**容易踩坑的细节**：组件 props 怎么定义、ref 怎么类型化、事件怎么写、泛型组件怎么搞。这一节把常见场景一个个过一遍。

### 3.1 组件 Props 类型定义

**最常见、最基础的需求**——给一个组件的参数加类型。

```tsx
// 用 type（推荐，更通用）
type ButtonProps = {
  variant?: 'primary' | 'secondary'   // 字面量 union 表达枚举
  disabled?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode            // 任何能渲染的东西
}

function Button({ variant = 'primary', disabled, onClick, children }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  )
}

// 调用
<Button variant="primary" onClick={(e) => console.log(e.currentTarget)}>OK</Button>
```

**几个关键约定**：

| 类型 | 含义 |
|---|---|
| `React.ReactNode` | 能被 React 渲染的任何东西（JSX、字符串、数字、null、数组） |
| `React.ReactElement` | 严格的 JSX 元素（不含字符串、null） |
| `React.CSSProperties` | `style={...}` 对象的类型 |
| `React.MouseEvent<T>` | 鼠标事件，T 是事件目标元素类型 |
| `React.ChangeEvent<T>` | 表单输入变化事件 |

`children` 几乎总是写成 `React.ReactNode`——它最宽容，能接收任何渲染内容。

---

### 3.2 `React.FC` 用还是不用？

`React.FC<Props>` 是早期 React + TS 教程里推荐的写法：

```tsx
// 老写法
const Button: React.FC<ButtonProps> = ({ children }) => <button>{children}</button>
```

**现在社区主流：不要用 React.FC，直接写普通函数**。

```tsx
// 推荐写法
function Button({ children }: ButtonProps) {
  return <button>{children}</button>
}
```

#### 为什么不推荐 React.FC

**问题 1**：以前的 `React.FC` 隐式给你加了个 `children?: ReactNode`——意味着任何用 `React.FC` 标注的组件**都被认为接受 children**，即使你不想要：

```tsx
const Avatar: React.FC<{ src: string }> = ({ src }) => <img src={src} />

<Avatar src="x.png">这里塞了 children</Avatar>   // 老 React.FC 会让这个通过
                                                  // 但 Avatar 根本没用 children
```

React 18 之后官方修复了这个（新版 React.FC 不再隐式加 children），但**问题 2 和 3 还在**。

**问题 2**：泛型组件用 React.FC 写起来别扭：

```tsx
// 你想这么写
const Select: React.FC<SelectProps<T>> = ...   // ❌ T 没法在这里声明

// 必须改成普通函数
function Select<T>(props: SelectProps<T>) { ... }   // ✅
```

**问题 3**：跟普通函数标注方式不一致——团队里既有 `React.FC` 又有普通函数，看起来乱。

**结论**：**统一用普通函数**（`function Button(props: ButtonProps)`），不要用 React.FC。这是 React 官方文档现在的推荐写法。

---

### 3.3 useRef 与 forwardRef

#### useRef 的两种用法

`useRef` 既能存"对 DOM 元素的引用"，也能存"任意可变值"——两种用法的类型写法不同。

```tsx
// 用法 1：拿 DOM 引用（必须传 null 作初始值）
const inputRef = useRef<HTMLInputElement>(null)
//               ↑ 显式传泛型告诉 TS 这个 ref 指向 input

inputRef.current        // HTMLInputElement | null   ← 注意有 null
inputRef.current?.focus()   // 必须先判 null

// 用法 2：存可变值（mutable container）
const countRef = useRef(0)
//               ↑ 不需要泛型，从初始值推
countRef.current = 5    // ✅ 直接改
```

**为什么有 null**？React 在组件挂载之前 ref 是空的，所以类型必然包含 null。要么 `?.` 链调，要么先判断。

#### forwardRef：把 ref 转发给内部 DOM

```tsx
type InputProps = { value: string; onChange: (v: string) => void }

const Input = forwardRef<HTMLInputElement, InputProps>(({ value, onChange }, ref) => {
//                       ↑ 第一个泛型：ref 指向的元素
//                                      ↑ 第二个泛型：组件的 props
  return <input ref={ref} value={value} onChange={e => onChange(e.target.value)} />
})

// 父组件能拿到内部 input 的 ref
const parentRef = useRef<HTMLInputElement>(null)
<Input ref={parentRef} value="" onChange={() => {}} />
```

**注意泛型顺序很反人类**：第一个是 ref 类型，第二个是 props——记不住就查 API。

> 📌 **React 19 后**：`ref` 直接作为 props 传递，**不再需要 forwardRef**。但目前 React 18 仍是主流，所以还得知道这个写法。

---

### 3.4 React 事件类型一览

React 把所有 DOM 事件**包了一层**叫 SyntheticEvent，做了跨浏览器兼容。每种事件对应不同的 TS 类型：

| 事件类型 | 对应的 React 类型 | 触发的属性 |
|---|---|---|
| 鼠标事件 | `React.MouseEvent<T>` | onClick、onMouseEnter、onContextMenu |
| 表单变化 | `React.ChangeEvent<T>` | input/select/textarea 的 onChange |
| 键盘事件 | `React.KeyboardEvent<T>` | onKeyDown、onKeyUp |
| 焦点事件 | `React.FocusEvent<T>` | onFocus、onBlur |
| 表单提交 | `React.FormEvent<T>` | form 的 onSubmit |
| 拖拽事件 | `React.DragEvent<T>` | onDragStart、onDrop |
| 触摸事件 | `React.TouchEvent<T>` | onTouchStart 等 |

`<T>` 是事件**触发元素**的类型（`HTMLButtonElement`、`HTMLInputElement` 等）。

#### 实际用例

```tsx
// onChange
function Input() {
  const [value, setValue] = useState('')
  return <input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)   // ✅ e.target.value 是 string
  }} />
}

// onSubmit
function Form() {
  return <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)   // currentTarget 类型精确
  }} />
}

// onKeyDown
<input onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') submit()
}} />
```

#### 简化技巧：让 TS 自动推断

如果事件 handler **直接写在 JSX 里**（行内），TS 通常能根据上下文自动推断，不用每次都标：

```tsx
<button onClick={(e) => {
  e.currentTarget.disabled = true   // ✅ TS 自动推出 e: MouseEvent<HTMLButtonElement>
}}>click</button>
```

**只有在把 handler 提取出去**时才需要显式标注：

```tsx
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {  // ← 这里要标
  e.currentTarget.disabled = true
}

return <button onClick={handleClick}>click</button>
```

---

### 3.5 泛型组件（写通用 UI 组件时常用）

写**通用容器组件**（Select、List、Table 等）时，元素类型应该跟着用户传的数据走——这就需要**泛型组件**。

```tsx
// 一个通用 Select，元素类型由用户决定
type SelectProps<T> = {
  options: T[]
  value: T
  onChange: (v: T) => void
  getLabel: (v: T) => string
  getKey: (v: T) => string | number
}

function Select<T>({ options, value, onChange, getLabel, getKey }: SelectProps<T>) {
  return (
    <select
      value={getKey(value)}
      onChange={(e) => {
        const found = options.find(o => String(getKey(o)) === e.target.value)
        if (found) onChange(found)
      }}
    >
      {options.map(o => (
        <option key={getKey(o)} value={getKey(o)}>{getLabel(o)}</option>
      ))}
    </select>
  )
}

// 用法：T 自动推断
type User = { id: number; name: string }
const users: User[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]

<Select
  options={users}
  value={users[0]}
  onChange={(u) => console.log(u.name)}    // ✅ u 自动推为 User
  getLabel={(u) => u.name}                  // ✅
  getKey={(u) => u.id}                      // ✅
/>
```

#### JSX 里写泛型的坑

在 `.tsx` 文件里写泛型，TS 解析器有时分不清"`<T>` 是泛型还是 JSX 标签"。常见解决办法：

```tsx
// ❌ 在 .tsx 文件里 TS 可能解析失败
const fn = <T>(x: T) => x

// ✅ 加个逗号告诉 TS "这是泛型"
const fn = <T,>(x: T) => x
//           ↑ 注意逗号

// ✅ 或者用 extends 约束
const fn = <T extends unknown>(x: T) => x

// ✅ 函数声明（普通 function）没这个问题
function fn<T>(x: T) { return x }
```

写泛型组件**优先用 `function 声明`**——避免箭头函数 + JSX 的歧义。

---

### 3.6 Polymorphic 组件（as prop）—— 进阶，了解即可

设计系统（Chakra UI、Radix、MUI）里有一种"**一个组件能渲染成不同 HTML 标签**"的模式：

```tsx
<Box>div</Box>
<Box as="a" href="/x">link</Box>            // 渲染成 <a>，自动有 href
<Box as="button" onClick={() => {}}>btn</Box>  // 渲染成 <button>，自动有 onClick
```

#### 难点：根据 `as` 推出对应 HTML 标签的所有 props

实现需要泛型 + 内置类型 + 各种约束的组合：

```tsx
type AsProp<C extends React.ElementType> = { as?: C }

type PropsWithAs<C extends React.ElementType, P> =
  P
  & AsProp<C>
  & Omit<React.ComponentPropsWithoutRef<C>, keyof (P & AsProp<C>)>

function Box<C extends React.ElementType = 'div'>(props: PropsWithAs<C, { color?: string }>) {
  const { as, color, ...rest } = props
  const Comp = as ?? 'div'
  return <Comp style={{ color }} {...rest as any} />
}
```

涉及的类型：
- `React.ElementType` — 任何"能传给 JSX 的东西"（标签名字符串、组件函数）
- `React.ComponentPropsWithoutRef<C>` — 这个标签/组件的所有 props
- `Omit<...>` — 剔除已经被自定义 props 占用的字段

> 💡 **看不懂没关系**——这是设计系统级别的高级技巧，业务代码里几乎用不到。要写设计系统时回来看就行。

---

### 3.7 React + TS 实战速查

最实用的几个套路：

```tsx
// 1. 组件 Props
function Comp({ x, y }: { x: string; y: number }) { ... }

// 2. useState 推断/手写
const [count, setCount] = useState(0)              // 推为 number
const [user, setUser] = useState<User | null>(null) // 联合类型必须显式

// 3. useReducer
type State = { count: number }
type Action = { type: 'inc' } | { type: 'set'; value: number }
const [state, dispatch] = useReducer(
  (s: State, a: Action): State => { ... },
  { count: 0 }
)

// 4. Context
const UserContext = React.createContext<User | null>(null)

// 5. 自定义 Hook
function useUser(): { user: User | null; loading: boolean } {
  // ...
}
```

记住一个原则：**优先让 TS 自己推，必要时再显式标注**——`useState(0)` 比 `useState<number>(0)` 更地道。

## 四、Node 项目中的 TS

Node 后端项目用 TS 跟前端不太一样——没有 JSX、没有打包器、跑在服务器上。需要注意的几个点：

### 4.1 装类型定义

Node 的内置 API（fs、path、http 等）的类型不在 TypeScript 自身里，而是在 **`@types/node`** 这个包：

```sh
npm i -D @types/node typescript tsx
```

| 包 | 作用 |
|---|---|
| `typescript` | 提供 tsc 命令、核心类型 |
| `@types/node` | Node 内置 API 的类型（fs、Buffer、process 等） |
| `tsx` | 直接跑 .ts 脚本的工具（替代 ts-node，基于 esbuild，更快） |

装完之后 `import fs from 'node:fs'` 就有类型提示了。

### 4.2 给 `process.env` 加类型

默认情况下，`process.env.XXX` 的类型是 `string | undefined`——任何字符串都能读，但你拿到的可能是 undefined：

```ts
const url = process.env.DATABASE_URL   // string | undefined
url.toLowerCase()                       // ❌ 可能是 undefined
```

实际项目里通常已经知道哪些环境变量是必填的、它们的类型是什么。可以**用模块扩展**给 `ProcessEnv` 加精确类型：

```ts
// env.d.ts（放在 src/ 或项目根目录）
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string                              // 必填
    NODE_ENV: 'development' | 'production' | 'test'   // 字面量 union
    PORT?: string                                     // 可选
  }
}
```

加了之后：

```ts
process.env.DATABASE_URL    // string ✅（不再带 undefined）
process.env.NODE_ENV        // 'development' | 'production' | 'test'
process.env.UNKNOWN         // ❌ 没在声明里出现，报错（防 typo）
```

> ⚠️ **注意**：这只是**编译时**的"约定"——TS 不会真的去检查 `.env` 文件。如果你声明了 `DATABASE_URL: string` 但运行时根本没设置，运行时拿到的是 undefined，依然会炸。要真正保证存在，要么在启动时显式校验（比如用 zod），要么手动 `if (!url) throw ...`。

### 4.3 ESM 还是 CommonJS？

Node 历史上有**两套模块系统**，TS 项目要选一个：

| 模块系统 | 语法 | 引入时间 |
|---|---|---|
| **CommonJS (CJS)** | `require()` / `module.exports` | Node 最早就有 |
| **ES Modules (ESM)** | `import` / `export` | Node 12+（2019 起逐步成熟） |

#### 选哪个

- **新项目 → ESM**：与浏览器、现代生态对齐
- **老项目 / 跟很多 CJS 库打交道 → CJS**：避免互操作问题

#### ESM 项目配置

```jsonc
// package.json
{
  "type": "module"          // 告诉 Node "本项目用 ESM"
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

#### ESM 的怪规则：import 路径必须写 `.js`

ESM 在 Node 里**强制要求显式后缀**——即使你写的是 .ts，也要 import `.js`（编译后的产物）：

```ts
// ❌ 写不带后缀
import { foo } from './utils'

// ❌ 写 .ts
import { foo } from './utils.ts'

// ✅ 写 .js（即使源文件是 utils.ts）
import { foo } from './utils.js'
```

听起来很反直觉——你的源文件是 `utils.ts`，但 import 路径写 `utils.js`。原因是 TS 不会在编译时改 import 路径，所以路径必须是**编译后**产物的路径。

如果觉得别扭，可以用 `tsx` 直接跑 .ts 文件（开发期），或者用 `tsc --moduleResolution Bundler`（让打包器处理路径）。

## 五、性能优化（项目大了会遇到）

### 5.1 为什么要关心 TS 编译性能

小项目你完全感觉不到 TS 慢。但项目长到一定程度会出现这些痛点：

- IDE 红线/补全要等 5-10 秒才出
- `tsc --noEmit` 跑一次要几十秒
- CI 里类型检查比单元测试还慢
- Vite/Next 启动慢得能去倒杯咖啡

10w+ 行的 TS 项目，**类型检查可能是整个工具链最慢的一环**。这一节讲怎么诊断和加速。

---

### 5.2 第一招：`skipLibCheck` —— 几乎所有项目都该开

```jsonc
{ "compilerOptions": { "skipLibCheck": true } }
```

跳过 `node_modules` 里所有 .d.ts 文件的类型检查。**通常能立刻提速 30%-70%**。

**为什么效果这么大**？因为现代项目随便装几个库，node_modules 里的 .d.ts 文件加起来可能有几万到几十万行——而你又改不了它们的类型错误。tsc 默认会去检查这些文件，纯粹浪费时间。

**会不会丢失安全性**？理论上会——某个库的类型定义跟另一个冲突时你不会知道。但实际上 99% 的项目都不需要这种验证，社区共识是**无脑开**。

---

### 5.3 第二招：`incremental` —— 增量编译

```jsonc
{ "compilerOptions": { "incremental": true } }
```

开了之后，tsc 会在第一次编译时生成一个 `.tsbuildinfo` 文件——**记录哪些文件已检查过**。下次编译时，只检查变更的文件 + 受影响的文件。

效果：第一次还是慢，**之后每次大约提速 70%-90%**。

> 📌 用 Vite/Next 时也建议开——你跑 `tsc --noEmit` 做类型检查时同样受益。

---

### 5.4 第三招：项目引用（Project References）—— 大型 / monorepo 项目

#### 这是干嘛用的

假设你的项目结构是 monorepo：

```
my-monorepo/
├── packages/
│   ├── utils/      （工具函数库）
│   ├── api/        （后端，依赖 utils）
│   └── web/        （前端，依赖 utils 和 api）
└── tsconfig.json   （唯一一个 tsconfig）
```

默认情况下，tsc 会把所有 packages 当一个大项目编译——**改一个文件，整个项目重新检查**。

**项目引用**让你给每个子包独立配 tsconfig，子包之间显式声明依赖关系。tsc 编译时：
- 改了 utils → 只重编 utils + 依赖它的 api、web
- 改了 web → 只重编 web（utils、api 用缓存）

**好处**：
- 增量编译粒度细
- 子包能独立类型检查
- 子包能独立产出 .d.ts，互相用 .d.ts 而不是源码（更快）

#### 怎么配

每个子包写自己的 `tsconfig.json`，开 `composite: true`：

```jsonc
// packages/utils/tsconfig.json
{
  "compilerOptions": {
    "composite": true,         // 必须，让这个项目能被引用
    "declaration": true,       // 产出 .d.ts 给别人用
    "outDir": "dist"
  },
  "include": ["src"]
}
```

依赖它的子包在 `references` 里声明：

```jsonc
// packages/api/tsconfig.json
{
  "compilerOptions": { "composite": true, ... },
  "references": [
    { "path": "../utils" }     // 我依赖 utils
  ],
  "include": ["src"]
}
```

根目录写一个"总入口"：

```jsonc
// tsconfig.json（根目录）
{
  "files": [],
  "references": [
    { "path": "./packages/utils" },
    { "path": "./packages/api" },
    { "path": "./packages/web" }
  ]
}
```

#### 怎么用

```sh
tsc --build                # 编译所有项目（自动按依赖顺序）
tsc --build --watch        # 监听模式增量编译
tsc --build --clean        # 清理产物
```

注意是 `tsc --build` 不是 `tsc`——`--build` 模式才支持项目引用。

#### 什么项目需要

- **monorepo**（pnpm/yarn workspace）→ 强烈推荐
- **几万行起步的单体项目**，能拆成几个明显的子模块 → 推荐
- **小项目** → 不用，配置开销不值

---

### 5.5 第四招：避免"类型炸弹"

某些类型写法会让 tsc 算得很累。常见的几个坑：

#### ① 巨型 union

```ts
// 不要这么干
type AllCharacters = 'a' | 'b' | 'c' | ... | 'z' | 'A' | 'B' | ... | '9'

// TS 在这种 50+ 项的 union 上做类型推导会变得非常慢
```

如果真需要这种"所有字符"，用 `string` 或更宽的类型。

#### ② 深递归类型（无限/超深递归）

```ts
// 在递归类型里没有终止条件 → tsc 直接放弃推导
type Deep<T> = { x: Deep<T> }
```

写递归类型时一定要有清晰的退出条件。TS 5.0+ 有递归深度保护，会自动截断深度过大的递归（默认 50 层）。

#### ③ 大量映射类型嵌套

```ts
// 三层映射类型 + 条件类型 + infer
type ComplexThing<T> = {
  [K in keyof T]: T[K] extends ... ? {
    [P in keyof T[K]]: ...
  } : ...
}
```

每层映射都让 TS 多算一遍，成倍增加耗时。**类型体操题里常见**——业务代码尽量避免。

#### ④ `interface` 比 `type` 更快

对于**形状很大的对象类型**，`interface` 比 `type` 编译更快——因为 TS 内部有 interface 的缓存优化。

```ts
// 大表（10+ 字段）优先用 interface
interface User { ... 20 个字段 ... }

// 小的、组合用的还是用 type
type Status = 'idle' | 'loading'
type Result = { ok: true; data: T } | { ok: false; error: string }
```

---

### 5.6 排查工具：`tsc --extendedDiagnostics`

哪天发现 tsc 慢了想查原因，跑这个：

```sh
tsc --extendedDiagnostics
```

输出大致这样：

```
Files:                  3450
Lines:                540000
Identifiers:           45000
Symbols:              123000
Types:                 67000
Memory used:          512MB
I/O read time:         0.12s
Parse time:            1.23s
Bind time:             0.45s
Check time:           12.34s    ← 类型检查时间，通常是大头
Emit time:             2.10s
Total time:           15.50s
```

关键指标：
- **`Check time`** 是大头 → 类型检查慢，看是不是有"类型炸弹"
- **`Files`** 太多 → `include` / `exclude` 没配好，扫了不必要的文件
- **`Memory used` 飙高** → 类型太复杂，考虑简化

进一步分析单个 source file：

```sh
tsc --generateTrace ./trace
# 然后打开 chrome://tracing 加载生成的文件，可视化分析
```

这是 TS 团队官方推荐的诊断工具，能精确定位是哪个文件、哪个类型在拖慢编译。

---

### 5.7 性能优化优先级

按"投入产出比"排序：

1. ✅ `skipLibCheck: true` — 一行配置，巨幅提速
2. ✅ `incremental: true` — 一行配置，二次编译变快
3. 🔍 用 `--extendedDiagnostics` 排查瓶颈 — 找到具体慢在哪
4. 🛠 简化复杂类型（避免巨型 union、深递归）
5. 🏗 项目引用（仅大型 / monorepo 项目值得）

前两条新项目无脑加，后面几条**等真的慢了再说**——过早优化是浪费精力。

## 六、生态工具（强烈推荐了解）

TS 本身不解决所有问题，社区有几个**"必装"级别的工具**——它们填补了 TS 的空白，几乎所有现代 TS 项目都用。

### 6.1 工具速览

| 工具 | 解决什么问题 | 推荐程度 |
|---|---|---|
| **Zod** | TS 类型只在编译期，运行时数据进来谁来校验？ | ⭐⭐⭐ 必学 |
| **type-fest** | 内置工具类型不够用（如深度 Partial、深度 Readonly） | ⭐⭐ 实用 |
| **ts-reset** | 内置类型太宽松（如 `JSON.parse` 返回 `any`） | ⭐⭐ 实用 |
| **tRPC** | 前后端通信怎么共享类型？ | ⭐⭐⭐ 全栈 TS 必看 |
| **ts-pattern** | switch 不够强，想要真正的模式匹配 | ⭐ 进阶 |

### 6.2 Zod —— 运行时校验 + 类型推导（重点）

#### Zod 在解决什么

回想一下 `safeParse` 那道练习——你要从 `unknown` 收窄到具体类型，写一堆 `typeof`、`'x' in y`、`Array.isArray` 检查。**繁琐易出错**。

Zod 把这件事**模式化**了：你写一份 schema，它自动给你**类型** + **运行时校验**。

#### 基本用法

```ts
import { z } from 'zod'

// 1. 定义 schema（描述数据形状 + 校验规则）
const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1),                          // 字符串非空
  email: z.string().email().optional(),             // 可选 + 必须是邮箱格式
  age: z.number().int().min(0).max(150),
  role: z.enum(['admin', 'user', 'guest']),
})

// 2. 自动推导出 TS 类型（不用手写一遍）
type User = z.infer<typeof UserSchema>
// = { id: number; name: string; email?: string; age: number; role: 'admin' | 'user' | 'guest' }

// 3. 运行时校验
const rawData = await fetch('/api/user').then(r => r.json())   // any 或 unknown

const user = UserSchema.parse(rawData)
// 校验通过 → user 类型为 User
// 校验失败 → 抛 ZodError（详细错误信息）
```

#### 关键价值

**"一份 schema 兼任三个角色"**：
1. **类型源**：用 `z.infer` 自动派生 TS 类型
2. **运行时校验**：从外部进来的数据先 parse 一遍，确保形状正确
3. **文档**：schema 本身就是数据契约的文档

不用 Zod 时你需要：

```ts
// 类型（手写一份）
type User = { id: number; name: string; ... }

// 校验（手写守卫函数）
function isUser(x: unknown): x is User { /* 一堆 typeof / in 检查 */ }

// 文档（写 markdown 或 JSDoc 描述字段）
```

三件事维护起来很容易**漂移**——schema 改了、类型忘改、文档更别提。Zod 把它们绑成一份。

#### 实战常见用法

```ts
// API 边界
async function getUser(id: number): Promise<User> {
  const raw = await fetch(`/api/users/${id}`).then(r => r.json())
  return UserSchema.parse(raw)   // 拿到的不是合法 User 立刻报错
}

// 表单校验（配合 React Hook Form）
const form = useForm({ resolver: zodResolver(UserSchema) })

// 环境变量校验
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),   // 字符串自动转 number
})
const env = EnvSchema.parse(process.env)
```

**结论**：写 TS 项目几乎必装 Zod。Phase 6 学完之后强烈建议自己挑个小项目用上。

### 6.3 type-fest —— 工具类型大全

TS 内置的工具类型（`Partial`、`Pick` 等）只有十几个。type-fest 提供**几百个**进阶工具类型：

```ts
import type { PartialDeep, ReadonlyDeep, Simplify, RequiredKeysOf } from 'type-fest'

type User = { name: string; addr: { city: string; zip: number } }

// PartialDeep：递归把所有字段变可选
type T1 = PartialDeep<User>
// = { name?: string; addr?: { city?: string; zip?: number } }
//                          ↑ 内层也变可选，TS 内置的 Partial 只浅一层

// Simplify：把复杂的交叉类型展平，IDE hover 时更可读
type T2 = Simplify<{ a: 1 } & { b: 2 }>   // { a: 1; b: 2 }
```

不用每次都自己造轮子——遇到"我想要 XX 类型"先去 type-fest 找。

### 6.4 ts-reset —— 修复内置类型的"宽松"

TS 标准库里有些类型为了向后兼容写得很宽松，导致明明能更精确的地方却给了 `any`。ts-reset 修一遍：

```ts
// 不装 ts-reset
JSON.parse('...')           // any  ← 关掉了类型检查
'a,b,c'.split(',')          // string[]  （好像没问题）
[1, 2, 3].includes('foo')   // boolean ✅ 编译通过，但其实永远 false

// 装了 ts-reset 后（在某个文件 import 一次就全局生效）
import '@total-typescript/ts-reset'

JSON.parse('...')           // unknown  ← 强制你校验
[1, 2, 3].includes('foo')   // ❌ 编译报错：'foo' 不在 number[] 里
```

**安装方式**：在项目入口（如 `src/index.ts` 或 `vite-env.d.ts`）import 一次：

```ts
import '@total-typescript/ts-reset'
```

整个项目的类型严格度立刻提升。

### 6.5 tRPC —— 前后端类型共享

传统全栈项目里，前端和后端的接口约定靠**手动维护**——后端改了 API，前端不知道，到运行时才发现。

tRPC 让你**直接调用后端函数**，类型自动从后端流到前端：

```ts
// 后端：定义路由
const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.users.find(input.id)),
})

// 前端：调用——自动有类型
const user = await trpc.getUser.query({ id: 1 })
//    ↑ 自动推为后端 db.users.find 的返回类型
```

**没有手写 schema，没有 OpenAPI 文档**——后端的类型直接被前端"看到"。改后端立刻在前端编译报错。

只适合**前后端都用 TS 且部署在同一项目**的场景，但在那种场景下是杀手锏。

### 6.6 ts-pattern —— 模式匹配

`switch` 在处理可辨识联合时不够优雅——ts-pattern 提供更强的"模式匹配"：

```ts
import { match } from 'ts-pattern'

type Result = { ok: true; data: User } | { ok: false; error: string } | { loading: true }

const display = match(result)
  .with({ ok: true }, (r) => `Hi, ${r.data.name}`)
  .with({ ok: false }, (r) => `Error: ${r.error}`)
  .with({ loading: true }, () => 'Loading...')
  .exhaustive()    // ← 编译时检查"所有情况都覆盖了"
```

`.exhaustive()` 这一招相当于把 `_exhaustive: never` 那个穷尽性技巧封装成了 API——漏处理一个 case 立刻报错。

代码量大、状态多的项目值得用；小项目用原生 `switch + never` 就够。

## 七、综合实战项目（Phase 6 收官）

挑一个做完，作为 8 周学习的毕业项目。每个项目都综合考察前 5 个 Phase 的所有核心技能。

---

### 项目 A：类型安全的 EventEmitter（推荐入门）

#### 目标
做一个事件总线（pub/sub），但**事件名和 payload 类型严格对应**——发对了通过，错了立刻编译报错。

#### 期望的使用体验

```ts
type EventMap = {
  login: { userId: number; ts: number }
  logout: { userId: number }
  error: Error
}

const ee = new TypedEmitter<EventMap>()

// ✅ 正确用法
ee.on('login', p => p.userId)                // p 自动推断为 { userId; ts }
ee.emit('login', { userId: 1, ts: 0 })

// ❌ 应该编译报错的情况
ee.emit('login', { userId: 1 })              // 缺 ts
ee.emit('login', { userId: 1, ts: 0, extra: 'x' })  // 多了字段
ee.emit('logout', { userId: 1, ts: 0 })      // logout 不要 ts
ee.on('unknown', () => {})                    // 没声明的事件
```

#### 考察点

- 泛型类（`TypedEmitter<E>`）
- 泛型方法（`on<K extends keyof E>`）
- 索引访问类型（`E[K]`）
- `keyof` 取键 union
- 实例字段的类型（用 `Map<keyof E, ...>` 存储 listener）

#### 起步代码

```ts
class TypedEmitter<E extends Record<string, any>> {
  private listeners = new Map<keyof E, Set<Function>>()

  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler)
    return this
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.listeners.get(event)?.forEach(h => h(payload))
  }

  // 进阶：补上 off / once
}
```

---

### 项目 B：迷你状态机（仿 XState 简化版）

#### 目标

设计一个**有限状态机**类型——给定状态集合 + 事件集合 + 转换规则，调用 `transition(state, event)` 时类型精确：

- 当前状态决定能接受哪些事件
- 事件决定下一个状态是什么
- 错误的转换在编译时被拦住

#### 期望的使用体验

```ts
// 定义一个红绿灯
type Light = 'red' | 'yellow' | 'green'
type LightEvent = 'next' | 'reset'

const transitions = {
  red:    { next: 'green',  reset: 'red' },
  green:  { next: 'yellow', reset: 'red' },
  yellow: { next: 'red',    reset: 'red' },
} as const

const machine = createMachine(transitions)

// 使用
let state: Light = 'red'
state = machine.transition('red', 'next')      // 返回 'green'
state = machine.transition('green', 'next')    // 返回 'yellow'
state = machine.transition('green', 'invalid') // ❌ 编译报错：green 不接受 invalid 事件
```

#### 考察点

- `as const` 派生字面量类型
- `keyof` + `T[K]` 取嵌套类型
- 泛型函数的双层类型推导
- 字面量 union 的精确建模

---

### 项目 C：类型化路由（仿 React Router）

#### 目标

给定一份路由表，让 `Link` 组件**强制要求**传入合法路径 + 必要的 params：

```ts
const routes = {
  '/users/:id': UserPage,
  '/posts/:slug/:section': PostPage,
  '/about': AboutPage,
} as const

// ✅
<Link to="/users/:id" params={{ id: '1' }} />
<Link to="/about" />

// ❌
<Link to="/users/:id" />                                 // 缺 params
<Link to="/users/:id" params={{ slug: 'a' }} />          // params 字段不对
<Link to="/wrong" />                                      // 路径不在表里
```

#### 考察点（综合性最高的项目）

- 模板字面量类型：从 `'/users/:id/posts/:postId'` 提取 `'id' | 'postId'`（Phase 5 的 Params<S>）
- 条件类型 + 递归
- `keyof typeof routes` 派生路径 union
- 复杂泛型组合

---

### 项目 D：把 `js_practice/generator.js` 翻译成 TS

#### 目标

把你 js_practice 目录下原有的 generator.js 完整加上类型，并设计成**通用泛型工具**。

#### 起步要求

- 读懂 Generator 的类型签名 `Generator<TYield, TReturn, TNext>`
- 给每个生成器函数加上精确的类型
- 把"消费 generator"的辅助函数写成泛型，能复用

#### 考察点

- 泛型函数 / 泛型类
- 内置类型 `Generator<...>` 的三个参数含义
- 处理"yield 出去" / "return 结束" / "next 传入" 三种值的不同类型
- 联合类型与可辨识联合（如果生成器多种产出）

适合**已经熟悉 JS Generator** 的同学——能把现有代码改造成 TS，是检验掌握度的最佳方式。

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
