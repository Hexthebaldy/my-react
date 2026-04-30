# Phase 1：类型系统基础（Week 1）

> 目标：建立 TS 类型的心智模型，能给一段普通 JS 代码加上正确的基础类型

## 知识图谱

```
基础类型
├── 原始类型              string / number / boolean / bigint / symbol / null / undefined
├── 顶/底/单元类型        any / unknown / never / void
├── 字面量类型            'red' / 42 / true，配合 union 实现枚举效果
├── 类型推断 (inference)  let x = 1     → number
│                         const x = 1   → 1（字面量类型）
├── 类型注解 vs 推断      显式注解 vs 让编译器推
├── 类型断言             value as Type  /  <Type>value（JSX 中用前者）
├── 非空断言             value!（告诉编译器"我保证这里不是 null/undefined"）
└── const 断言           as const（把字面量推成最窄类型 + readonly）
```

## 一、原始类型（来自 JS 的友军）

```ts
let name: string = '王二'
let age: number = 30        // 包括整数、浮点、NaN、Infinity
let isAdmin: boolean = true
let id: bigint = 100n
let key: symbol = Symbol('k')
let nothing: null = null
let undef: undefined = undefined
```

**注意点**：
- `number` 包含 `NaN` 和 `Infinity`（运行时陷阱仍然存在，TS 不解决这些）
- `null` 和 `undefined` 是各自独立的类型，开启 `strictNullChecks` 后不能互相赋值

## 二、几个特殊类型：any / unknown / never / void

除了原始类型之外，TS 有几个**特殊类型**——它们不对应任何 JS 里的具体值，是 TS 自己设计出来表达"特殊语义"的。这些是 TS 学习中的关键概念，必须吃透。

### 2.1 速查表

| 类型 | 一句话理解 | 何时用 |
|---|---|---|
| `any` | "我放弃类型检查了" | **避免使用**；老代码迁移临时用 |
| `unknown` | "我不知道是啥，先得证明" | 处理外部输入（API、`JSON.parse`） |
| `never` | "永远不会有这个值" | 穷尽性检查、抛错函数的返回值 |
| `void` | "函数没返回值" | 函数返回值注解 |
| `object` | "任何非原始类型" | 很少用，通常用具体接口替代 |

下面挑最重要的两个详细讲。

### 2.2 `any` vs `unknown`（最容易混的两个）

两者都表示"什么都行"，但语义完全不同：

```ts
const a: any = JSON.parse(input)
a.foo.bar.baz       // 编译通过，运行时可能直接炸
a()                 // 编译通过，运行时也许炸
a + 1               // 编译通过

const b: unknown = JSON.parse(input)
b.foo               // ❌ 编译报错：unknown 上没东西
b()                 // ❌
b + 1               // ❌
```

**核心区别**：
- `any` = "**关掉**类型检查"——你想干嘛干嘛，TS 不管
- `unknown` = "**先证明**给我看"——必须经过类型守卫收窄成具体类型，才能用

`unknown` 的"必须先证明"是这样实现的：

```ts
const b: unknown = JSON.parse(input)

if (typeof b === 'string') {
  b.toUpperCase()        // ✅ 这一段里 b 被收窄成 string
}

if (typeof b === 'object' && b !== null && 'foo' in b) {
  b.foo                  // ✅ 这里编译器知道 b 上有 foo
}
```

**实战建议**：处理外部数据（API 响应、用户输入、JSON.parse）一律用 `unknown`，强迫自己写运行时校验。`any` 几乎永远不该用——一旦用了，类型保护全失效。

### 2.3 `never`：永不存在的值

`never` 表示"这个位置不可能有任何值"——比 `null`/`undefined` 还要"虚无"。

#### 它在哪里自然出现

```ts
// 1. 函数永远抛错（不会正常返回）
function panic(msg: string): never {
  throw new Error(msg)
}

// 2. 死循环（永不结束）
function loop(): never {
  while (true) {}
}

// 3. 类型层"减法"的结果
type X = string & number    // never，因为没有值同时是 string 和 number
```

#### 经典实战：穷尽性检查（exhaustive check）

这是 `never` 最重要的用法——**让编译器帮你防止"漏处理某种情况"**。

假设你有个表示形状的联合类型，写一个计算面积的函数：

```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; s: number }

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2
    case 'square': return s.s ** 2
    default:
      const _exhaustive: never = s    // ✨ 关键的一行
      return _exhaustive
  }
}
```

**这一行 `const _exhaustive: never = s` 在做什么？**

把它拆开：
- 走到 `default` 分支说明 `s.kind` 不是 `'circle'` 也不是 `'square'`
- TS 经过前面 case 的收窄，认为 `s` 此时是 "Shape 中除了 circle 和 square 的所有可能"
- 如果 Shape 只有这两种，TS 推断 `s` 此时是 `never`（不可能再有别的）
- 把一个 `never` 类型赋给 `_exhaustive: never` → ✅ 编译通过

**关键来了**——如果你**未来**给 Shape 加了新成员：

```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; s: number }
  | { kind: 'triangle'; a: number; h: number }   // ← 新加的
```

`area` 函数没改，TS 立刻在 `_exhaustive` 那行报错：

```
Type '{ kind: "triangle"; ... }' is not assignable to type 'never'
```

**编译器逼你回去把 triangle 这个 case 处理掉**——这就是穷尽性检查的威力：用类型系统强制保证"所有可能都被处理"。

写状态机、Redux reducer、消息分发器时这个模式非常重要，值得形成肌肉记忆。

## 三、字面量类型与 union（取代 enum 的现代方案）

### 3.1 什么是字面量类型

普通类型描述的是**一类值**，字面量类型描述的是**一个值**：

```ts
let a: string = 'hello'        // string —— 任意字符串都行
let b: 'hello' = 'hello'       // 字面量类型 —— 只能是 'hello'，别的不行

b = 'world'                    // ❌ Type '"world"' is not assignable to type '"hello"'
```

单看一个字面量类型没什么用——它的威力来自和 `|`（union）组合。

### 3.2 字面量 union：表达"有限取值"

```ts
type Direction = 'up' | 'down' | 'left' | 'right'   // 字符串字面量 union
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6                // 数字字面量 union

function move(dir: Direction) { /* ... */ }
move('up')        // ✅
move('north')     // ❌ 编译时拦截
```

这就替代了 JS 里没有的"枚举"概念——比写一堆字符串常量安全得多。

### 3.3 为什么字面量 union 比 enum 好

TS 也有 `enum` 关键字，但**社区主流共识是优先用字面量 union**：

```ts
// 写法 A：enum（不推荐）
enum Status { Idle = 'idle', Loading = 'loading', Done = 'done' }

// 写法 B：字面量 union（推荐）
type Status = 'idle' | 'loading' | 'done'
```

**为什么倾向 B**：

- **零运行时开销**：enum 编译后会生成一个对象，union 完全没有运行时产物
- **更好的工具链兼容**：现代打包器（esbuild/SWC）对 `const enum` 处理有兼容问题
- **更易组合**：union 能配合后面的 `keyof`、模板字面量等做精妙派生（Phase 5 详解）
- **直接和字符串/数字互通**：不需要 `Status.Loading` 这种额外语法

> 不需要现在记住所有理由——只要"默认用字面量 union，少用 enum"就行。

### 3.4 字面量类型怎么"自动出现"

很多时候你不用手写字面量类型——TS 在某些情况下自动推：

```ts
let a = 'hello'          // a: string         （let 推宽）
const b = 'hello'        // b: 'hello'        （const 推窄）

const arr = ['red', 'green']            // arr: string[]    ← 注意还是宽
const arr2 = ['red', 'green'] as const  // arr2: readonly ['red', 'green']
```

为什么 `let` 和 `const` 不一样？因为 `let` 后面可能改、`const` 不会。这就是下一节的"宽化"问题——加 `as const` 是关键工具。

## 四、类型推断（inference）— 最常被忽视的能力

```ts
let a = 1          // 推断为 number
const b = 1        // 推断为 1（字面量类型）

let c = [1, 2]     // 推断为 number[]
const d = [1, 2]   // 推断为 number[]（注意不是 [1, 2]）

const e = { x: 1 } as const  // 推断为 { readonly x: 1 }
```

**核心心法**：
> 能让编译器推就让它推，不要无脑加注解。
> 加注解的目的是"约束"或"文档"，不是"为了让 TS 满意"。

```ts
// ❌ 冗余
const list: number[] = [1, 2, 3]

// ✅ 推断已经够用
const list = [1, 2, 3]

// ✅ 函数返回值注解 = 给调用方写契约（推荐）
function add(a: number, b: number): number {
  return a + b
}
```

## 五、类型断言：编译期"宣示主权"

### 5.1 它在做什么

类型断言告诉编译器"这个值的类型按我说的算"——是**纯编译时**指令，**不改变运行时的值**。

```ts
const el = document.querySelector('#app') as HTMLDivElement
const id = (event.target as HTMLInputElement).value
```

类比：你工资单上写"P7"，但实际能力还是实际能力——断言只让 TS 闭嘴，错了运行时照样炸。

### 5.2 两种语法
- `value as Type` — 推荐，JSX 里**只能用这种**
- `<Type>value` — 老语法，与 JSX 冲突

### 5.3 断言不是转换（必懂）

```ts
const n = ('42' as unknown) as number
typeof n            // 'string'  ← 实际还是字符串！
n + 1               // '421'     ← 字符串拼接，不是 43
```

要真正改变值，用运行时函数：`Number(x)` / `String(x)` / `Boolean(x)`。

### 5.4 兼容性规则与双重断言

```ts
const a: string = 'hi'
const b = a as 'hi' | 'bye'   // ✅ 收窄到子类型
const c = a as number         // ❌ 不兼容，编译器拦截
```

要强转毫不相关的类型，需要双重断言绕过：

```ts
const x = (someValue as unknown) as TargetType
```

**出现 `as unknown as X` 通常意味着设计有问题**——它完全关闭了类型保护，作为最后手段。

### 5.5 优先用类型守卫替代

绝大多数 `as` 都有更安全的写法：

```ts
// ❌ 断言
function getValue(target: EventTarget | null) {
  return (target as HTMLInputElement).value
}

// ✅ 守卫（编译时和运行时都安全）
function getValue(target: EventTarget | null) {
  if (target instanceof HTMLInputElement) return target.value
  return ''
}
```

**断言 = 向编译器宣示主权；守卫 = 向编译器证明事实**。能用守卫就别用断言。

## 六、非空断言 `!`

`!` 是 `as` 的一个特化版本——专门用来告诉编译器"这个值此刻一定不是 null/undefined"：

```ts
function getLength(s: string | null): number {
  return s!.length          // ! 表示"我保证 s 不是 null"
}
```

它等价于 `(s as NonNullable<typeof s>)`，但是写起来短得多。

**和 `as` 一样的注意事项**：
- 只在编译时生效，错了运行时照样炸
- 是你在用"人格担保"——TS 完全不验证

**绝大多数情况优先用类型守卫**：

```ts
function getLength(s: string | null): number {
  if (s === null) return 0    // 显式处理 null
  return s.length              // 这里 s 自动收窄成 string，不用 !
}
```

只在那种"代码上下文逻辑保证不为 null，但 TS 不够聪明推不出来"的场景才用 `!`。能用守卫就别用 `!`。

## 七、const 断言（很重要，常被低估）

### 7.1 类型宽化：为什么需要 as const

TS 推断时会把字面量"扩宽"成它的父类型：

```ts
let a = 'hello'              // string         ← 宽化
const b = 'hello'            // 'hello'        ← 不宽化
const c = { x: 'hello' }     // { x: string }  ← 又宽化
```

`const` 只锁"指向"，不锁内部——所以对象属性、数组元素仍然会被宽化。这导致两个常见痛点：

```ts
// 痛点 1：函数要字面量，但对象属性推成了宽类型
function setMethod(m: 'GET' | 'POST') {}
const config = { method: 'GET' }
setMethod(config.method)          // ❌ string 不能赋给 'GET' | 'POST'

// 痛点 2：从数组派生 union 时丢了字面量信息
const colors = ['red', 'green']
type Color = typeof colors[number]   // string  ← 期望是 'red' | 'green'
```

### 7.2 as const 三连封印

加在字面量后面，一次性做三件事：

1. **属性变 readonly**
2. **字面量类型不再宽化**
3. **数组变只读元组**

```ts
const config = { url: '/api', method: 'GET' } as const
// { readonly url: '/api'; readonly method: 'GET' }

const colors = ['red', 'green'] as const
// readonly ['red', 'green']    ← 不再是 string[]
```

效果是递归的，嵌套对象/数组也一起锁。

### 7.3 核心用法：从值派生类型

`as const` 让一份值同时充当**类型字典的源头**——避免值和类型重复维护。三个固定套路（背下来）：

```ts
// 套路 1：数组 → union
const COLORS = ['red', 'green', 'blue'] as const
type Color = typeof COLORS[number]    // 'red' | 'green' | 'blue'

// 套路 2：对象键 → union
const ROLE = { ADMIN: 'admin', USER: 'user' } as const
type RoleKey = keyof typeof ROLE      // 'ADMIN' | 'USER'

// 套路 3：对象值 → union
type RoleValue = typeof ROLE[keyof typeof ROLE]   // 'admin' | 'user'
```

> `keyof` 和 `T[K]` 是 Phase 4 才系统讲，这里先记住组合套路。

### 7.4 实战：状态机判别字段

```ts
const a1 = { type: 'LOGIN', userId: 1 }            // a1.type: string
const a2 = { type: 'LOGIN', userId: 1 } as const   // a2.type: 'LOGIN'  ← 可作判别
```

Redux / Zustand / XState 等所有状态库都依赖这个技巧让 `type` 字段保留字面量。

### 7.5 编译时 vs 运行时

`as const` 只在编译时生效，运行时仍可被断言绕过去：

```ts
const obj = { x: 1 } as const
const sneaky = obj as { x: number }
sneaky.x = 2                  // 运行时真改了
```

要真正运行时不可变，需要 `Object.freeze`。两者职责不同：`as const` 是编译时类型守门员，`Object.freeze` 是运行时锁。

**`as const` 是从值派生类型的桥梁**——这一句话在 Phase 4-5 会反复用到。

---

## 必做练习（Phase 1）

练习模板见 `exercises/phase-01/`。完成后用 `tsc --noEmit` 检查。

### Exercise 1.1 — 为 JS 函数加类型
给定纯 JS 实现，加上完整类型注解：

```ts
// before
function repeat(s, n) {
  return Array(n).fill(s).join('')
}

// 你来加注解
```

### Exercise 1.2 — `unknown` 收窄
实现一个 `safeParse(json: string): User | null` 函数，要求：
- `json` 通过 `JSON.parse` 后类型必须从 `unknown` 安全收窄
- 不允许使用 `any` 和 `as`
- `User` 类型为 `{ id: number; name: string }`

### Exercise 1.3 — 穷尽性检查
设计一个 `Event` 联合类型（包含 `'click' | 'hover' | 'submit'`），写一个 `handle(e: Event)` 函数，使用 `never` 确保新增事件类型时编译报错。

### Exercise 1.4 — 字面量 union 替代 enum
把以下 enum 改写为 字面量 union，并保持 API 不变：
```ts
enum Status { Idle = 'idle', Loading = 'loading', Done = 'done' }
```

### Exercise 1.5 — `as const` 派生类型
给定 `const colors = ['red', 'green', 'blue']`，写出派生类型 `Color`，使其等于 `'red' | 'green' | 'blue'`。

---

## 检查清单（学完 Phase 1 你应该能回答）

- [ ] `unknown` 和 `any` 的根本区别？
- [ ] `never` 在哪些场景会自然出现？
- [ ] 什么时候应该手动加类型注解，什么时候让编译器推？
- [ ] `as const` 的两个效果是什么？
- [ ] `value!` 和 `value as Type` 的本质区别？

下一阶段：[Phase 2 — 对象与函数类型](./phase-02-objects-and-functions.md)
