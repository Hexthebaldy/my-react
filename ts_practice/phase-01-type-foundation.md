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

## 二、顶/底/单元类型（重点）

| 类型 | 说明 | 何时用 |
|---|---|---|
| `any` | 关闭类型检查，万能 | **避免使用**；迁移老代码时临时挡一下 |
| `unknown` | 类型安全的 any，必须收窄后才能用 | 处理外部输入（API 响应、`JSON.parse`） |
| `never` | 永不存在的值（抛错、死循环） | 穷尽性检查、不可达分支 |
| `void` | 函数没有返回值 | 函数返回值注解 |
| `object` | 任何非原始类型 | 很少用，通常用具体接口代替 |

**`unknown` vs `any` 的关键区别**：
```ts
const a: any = JSON.parse(input)
a.foo.bar  // 编译通过，运行时炸

const b: unknown = JSON.parse(input)
b.foo.bar  // ❌ 编译报错：必须先收窄
if (typeof b === 'object' && b !== null && 'foo' in b) {
  // 这里 b 才安全
}
```

**`never` 的经典用法 — 穷尽性检查**：
```ts
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; s: number }

function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2
    case 'square': return s.s ** 2
    default:
      const _exhaustive: never = s  // 新加 kind 时这里会报错，强制处理
      return _exhaustive
  }
}
```

## 三、字面量类型与 union（取代 enum 的现代方案）

```ts
// 比 enum 更好：字面量 union
type Direction = 'up' | 'down' | 'left' | 'right'
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6

function move(dir: Direction) { /* ... */ }
move('up')      // ✅
move('north')   // ❌
```

**为什么字面量 union 优于 enum**：
- 编译后零运行时开销（enum 会生成对象）
- 与字符串无缝互通
- 可被 `keyof`、模板字面量类型组合派生
- TS 5+ 中 enum 有一些争议（`const enum` 在 isolated module 下还有兼容问题）

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

```ts
function getLength(s: string | null): number {
  return s!.length  // 我保证 s 不是 null
}
```

和 `as` 一样，是你在用人格担保。**优先用类型守卫**：

```ts
function getLength(s: string | null): number {
  if (s === null) return 0
  return s.length  // 这里编译器自动收窄成 string
}
```

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
