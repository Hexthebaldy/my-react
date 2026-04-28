# Phase 2：对象与函数类型（Week 2）

> 目标：能为任意 JS 工具函数（如 lodash 风格）写出精确的类型签名

## 知识图谱

```
对象与函数
├── 对象类型描述
│   ├── interface          可声明合并、可继承
│   ├── type alias         不可合并、可用任意类型
│   ├── 索引签名           [key: string]: T
│   ├── 可选属性 ?         readonly 修饰符
│   └── 多余属性检查        excess property check（字面量陷阱）
├── 函数类型
│   ├── 函数签名表达式      (a: number, b: number) => number
│   ├── call signature 写在 interface/type 里
│   ├── 重载（overload）    多个签名 + 一个实现
│   ├── 可选/默认/剩余参数
│   ├── this 参数与 ThisType
│   └── 函数返回类型推断 vs 注解
└── 数组与元组
    ├── T[] vs Array<T>
    ├── 元组 [string, number]
    ├── 可选元素 [string, number?]
    ├── 剩余元素 [string, ...number[]]
    └── 只读元组 readonly [...]
```

## 一、interface vs type alias（最常被问的问题）

```ts
interface User { id: number; name: string }
type User = { id: number; name: string }
```

两者在 99% 场景下可互换。**关键差异**：

| 特性 | `interface` | `type` |
|---|---|---|
| 声明合并（自动 merge 同名） | ✅ | ❌ |
| 用 `extends` 继承 | ✅ | ✅（用 `&` 交叉） |
| 表达 union / 元组 / 原始类型 | ❌ | ✅ |
| 描述函数签名 | ✅（call signature） | ✅ |
| 性能（编译器缓存） | 略优 | 略劣 |

**实战选择规则**：
- **对象形状/库的公共 API** → `interface`（允许使用者扩展）
- **联合 / 工具类型派生 / 复杂组合** → `type`
- 团队统一一种也完全可以，不要纠结

```ts
// interface 声明合并（库扩展点的常见模式）
interface Window {
  myAppGlobal: { version: string }
}

// type 适合 union 和派生
type ID = string | number
type Keys = keyof User
```

## 二、对象属性的修饰符

```ts
interface User {
  readonly id: number       // 只读，赋值后不能改
  name: string
  email?: string            // 可选（即 string | undefined）
  [key: string]: unknown    // 索引签名：允许任意 string 键
}
```

**常见陷阱**：
```ts
type Strict = { name: string }
const u: Strict = { name: 'a', age: 10 }
// ❌ Object literal may only specify known properties
// 这是 "excess property check"，只发生在字面量直接赋值时

const tmp = { name: 'a', age: 10 }
const u2: Strict = tmp  // ✅ 通过！结构化类型，多余的属性被忽略
```

理解这点对调试很重要——TS 是结构化类型，"多了字段没关系，只要必需字段都在"。

## 三、函数类型的写法

### 函数类型表达式（最常用）
```ts
type Adder = (a: number, b: number) => number
const add: Adder = (a, b) => a + b   // 参数自动推断
```

### Call signature（在 interface/type 里写）
```ts
interface Adder {
  (a: number, b: number): number    // 注意是冒号 :，不是箭头
  description: string                // 函数也可以有属性
}

const add: Adder = ((a, b) => a + b) as Adder
add.description = '加法'
```

### Construct signature（构造函数）
```ts
interface UserCtor {
  new (id: number, name: string): User
}
```

## 四、参数类型的进阶

### 可选参数 / 默认参数 / 剩余参数

```ts
function greet(
  name: string,
  greeting?: string,             // 可选 → string | undefined
  punctuation: string = '!',     // 默认值 → 调用方可省略
  ...extras: string[]            // 剩余 → 数组
): string {
  return `${greeting ?? 'Hi'}, ${name}${punctuation} ${extras.join(' ')}`
}
```

### 解构参数的类型
```ts
function fetch({ url, method = 'GET' }: { url: string; method?: string }) { /* ... */ }

// 提取类型更清晰
type FetchOptions = { url: string; method?: string }
function fetch2({ url, method = 'GET' }: FetchOptions) { /* ... */ }
```

## 五、函数重载（关键能力）

> 一个函数对不同输入返回不同类型时，普通签名搞不定，要用重载。

```ts
// 多个"假签名" + 一个"真实现"
function parse(input: string): object
function parse(input: number): string
function parse(input: string | number): object | string {
  if (typeof input === 'string') return JSON.parse(input)
  return String(input)
}

const a = parse('{"x":1}')   // a: object
const b = parse(42)          // b: string
```

**重载的坑**：
- 实现签名（最后一个）对调用方**不可见**，只是给 TS 看的
- 重载签名要从最具体到最一般排列
- 现代 TS 中，**多数情况下用泛型 + 条件类型可以替代重载**（更优雅）

## 六、`this` 参数（重要但易被忽视）

JS 的 `this` 之乱大家都懂，TS 给了一个解法：把 `this` 写成第一个"伪参数"（不出现在调用中）：

```ts
interface User {
  name: string
  greet(this: User): void
}

const u: User = {
  name: '老王',
  greet() { console.log(this.name) }
}

u.greet()              // ✅
const g = u.greet
g()                    // ❌ 'this' implicitly has type any
```

开启 `noImplicitThis` 后，所有未注明 `this` 的函数都会被检查。

## 七、数组与元组（比 JS 多一层精度）

### 数组
```ts
const a: number[] = [1, 2, 3]
const b: Array<number> = [1, 2, 3]    // 等价
const c: ReadonlyArray<number> = [1, 2, 3]  // 不能 push/pop
const d: readonly number[] = [1, 2, 3]      // 同上
```

### 元组（fixed length & ordered types）
```ts
const point: [number, number] = [10, 20]
const named: [name: string, age: number] = ['老王', 30]  // 标签元组（可读性更好）

// 可选元素
type Pair = [string, number?]      // [a] 或 [a, 1] 都合法

// 剩余元素（位置任意）
type Cmd = [string, ...string[]]                  // ['git', 'commit', '-m', 'fix']
type Last = [...string[], number]                 // ['a', 'b', 42]
type Mix  = [string, ...number[], boolean]        // ['x', 1, 2, 3, true]
```

元组在配合泛型描述函数参数时（比如 `Parameters<T>`）非常重要，后面会反复用到。

---

## 实战示例：写一个类型安全的 `pick`

这是必修题——能写出来说明你过 Phase 2 了。

```ts
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>
  for (const k of keys) out[k] = obj[k]
  return out
}

const u = { id: 1, name: 'a', age: 30 }
const x = pick(u, ['id', 'name'])      // x: { id: number; name: string }
const y = pick(u, ['id', 'foo'])       // ❌ 'foo' 不在 keyof
```

如果暂时看不懂 `keyof` 和 `Pick`，没关系，Phase 4 会详细讲。

---

## 必做练习（Phase 2）

### Exercise 2.1 — interface 还是 type？
给以下场景选择 interface 或 type 并说明理由：
1. 描述 React 组件的 props
2. 表达 `'success' | 'error'`
3. 给第三方库的 `Window` 对象加全局属性
4. 描述函数的返回值的多种可能形态

### Exercise 2.2 — 函数重载
实现 `createElement` 函数：
- `createElement('div')` → `HTMLDivElement`
- `createElement('a')` → `HTMLAnchorElement`
- `createElement('input')` → `HTMLInputElement`
- 其他字符串 → `HTMLElement`

提示：可以用 `HTMLElementTagNameMap`。

### Exercise 2.3 — this 类型
给一个事件处理器加上正确的 `this` 类型：
```ts
function onClick(e: Event) {
  console.log(this /* HTMLElement */, e.target)
}
```

### Exercise 2.4 — 元组与剩余参数
写一个 `tuple<T extends any[]>(...args: T): T` 函数，使它能精确保留元组形态：
```ts
const t = tuple(1, 'a', true)  // t: [number, string, boolean]
```

### Exercise 2.5 — readonly 防御
写一个 `freezeDeep` 类型签名（先不实现），让传入的对象类型递归变成 readonly。

---

## 检查清单

- [ ] interface 和 type 各自的合理使用场景？
- [ ] 什么是 excess property check，何时会触发？
- [ ] 函数重载的实现签名为什么"对调用方不可见"？
- [ ] this 参数和普通参数的区别？
- [ ] 元组和数组在类型层面有什么本质不同？

下一阶段：[Phase 3 — 类、模块、声明](./phase-03-class-and-module.md)
