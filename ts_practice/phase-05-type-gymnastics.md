# Phase 5：类型编程 / 类型体操（Week 6-7）

> **本阶段目标**：
> 1. 把 TS 的类型系统当成一门**编程语言**——不只是"标注类型"，而是用类型**计算**出新类型
> 2. 学完能看懂、能手写：条件类型、infer 提取、映射类型、模板字面量、递归类型
> 3. 最终能独立实现 TS 内置工具类型（`Partial`、`Pick`、`ReturnType` 等），完成 type-challenges easy 全部题目

> **这是 TS 学习的第二道分水岭**——也是和"会用 TS 的人"拉开差距的地方。但循序渐进就不难。

---

## 学习心态调整

在动手之前，先**重塑一下你对 TS 的认知**：

> **TS 的类型系统本身就是一门编程语言**。它有：
> - 变量（类型别名 `type X = ...`）
> - 函数（泛型 `type F<T> = ...`）
> - 条件分支（`T extends U ? X : Y`）
> - 模式匹配（`infer`）
> - 循环/遍历（映射类型 `[K in keyof T]`）
> - 递归（类型自己引用自己）

之前阶段你是"**标注**类型"，本阶段你要学的是"**用类型计算类型**"——从已有的类型推导/构造出新的类型。

类比一下：

| 普通 TS | 类型编程 |
|---|---|
| `let x: number = 1` | `type X = ReturnType<typeof fn>` |
| 描述值长什么样 | **计算**新的类型 |
| 静态、固定 | 动态、推导 |

下面会一步步带你进入这个新世界。

---

## 知识图谱

```
类型编程
├── 条件类型
│   ├── T extends U ? X : Y
│   ├── 分布式条件类型（distribute over union）
│   ├── 用 [T] extends [U] 关闭分布式
│   └── never 在条件类型中的特殊行为
├── infer 关键字
│   ├── 在 extends 子句中提取类型
│   ├── 配合元组提取参数 / 返回值
│   ├── 配合数组提取元素
│   └── 模板字面量中的 infer
├── 映射类型
│   ├── { [K in keyof T]: ... }
│   ├── readonly / ? 修饰符的添加和移除（+/-）
│   ├── as 重映射键名
│   └── 配合条件类型过滤键
├── 模板字面量类型
│   ├── 字符串拼接
│   ├── 内置 Uppercase / Lowercase / Capitalize / Uncapitalize
│   ├── 模式匹配（infer）
│   └── 路径类型（Object Path）
├── 内置工具类型（手撕实现）
│   ├── Partial / Required / Readonly
│   ├── Pick / Omit / Record
│   ├── Exclude / Extract / NonNullable
│   ├── ReturnType / Parameters / ConstructorParameters / InstanceType
│   ├── Awaited（4.5+）
│   └── ThisParameterType / OmitThisParameter
└── 类型体操技巧
    ├── 递归类型（注意深度限制）
    ├── 元组操作（Head / Tail / Reverse / Length）
    ├── 字符串操作（Split / Join / Trim / Replace）
    └── 性能 / 可读性权衡
```

---

## 一、条件类型：类型层面的 if-else

### 1.1 起步：什么是条件类型？

JS 里你写过三元运算符：

```js
const tag = age >= 18 ? 'adult' : 'minor'
//          ↑ 条件          ↑ 真分支    ↑ 假分支
```

TS 在**类型层面**也有同样的语法：

```ts
type IsAdult<Age> = Age extends 18 | 19 | 20 ? 'adult' : 'minor'
//                  ↑ 条件                       ↑ 真分支    ↑ 假分支
```

只是把 `>=` 换成了 **`extends`** —— 表示"**符合 / 是…的子集**"。

```ts
type A = IsAdult<19>      // 'adult'  （19 符合 18|19|20）
type B = IsAdult<10>      // 'minor'  （10 不符合）
```

### 1.2 `extends` 在条件类型里到底是什么意思？

**`A extends B` = "A 是不是符合 B 的形状？"**

```ts
type T1 = 'hello' extends string ? true : false   // true（'hello' 是 string 的子类型）
type T2 = string extends 'hello' ? true : false   // false（string 比 'hello' 宽）
type T3 = { a: 1; b: 2 } extends { a: 1 } ? true : false   // true（多字段也算"符合"）
type T4 = number extends string ? true : false    // false
```

**记忆**：
- `extends` 的左边是"**具体的**"
- `extends` 的右边是"**宽松的形状**"
- 只要左边能塞进右边的形状里，就 true

### 1.3 最简单的条件类型例子

```ts
type IsString<T> = T extends string ? true : false

type A = IsString<'hi'>     // true
type B = IsString<42>       // false
type C = IsString<boolean>  // false
```

`T` 是**泛型参数**（类型层的"输入"），`IsString` 是个**类型函数**——给它一个类型，它返回 `true` 或 `false`。

### 1.4 条件类型的"陷阱"：分布式条件类型

> ⚠️ 这是 TS 类型编程里**第一个反直觉的地方**，必须先理解，否则后面都看不懂。

#### 反常识的例子

```ts
type ToArray<T> = T extends any ? T[] : never

type R = ToArray<string | number>
//   ↑ 你可能以为是：(string | number)[]
//     实际是：    string[] | number[]
```

**为什么？**

当 `T` 是个**裸类型参数**（直接写 `T`，不被包在元组/对象里），且传入的是**联合类型**时，TS 会**自动把联合"分发"开**：

```
ToArray<string | number>
  ↓ 分发
ToArray<string> | ToArray<number>
  ↓ 各自计算
string[] | number[]
```

像数学里的分配律：`(a + b) × c = a×c + b×c`。

#### 触发分布的两个条件（必须同时满足）

1. 条件类型作用在**裸**泛型参数上（不是 `[T]`、不是 `{ x: T }`）
2. 这个参数被传入了**联合类型**

#### 怎么"关闭"分布？

把 `T` 用元组包起来：

```ts
type ToArray<T> = [T] extends [any] ? T[] : never
//                ↑                  ↑
//              用 [] 包起来，不是裸的 T 了

type R = ToArray<string | number>   // (string | number)[]  ← 这次不分发了
```

**经验**：写条件类型时，问自己"我希望它分发吗？"
- **要分发**（给联合的每个成员单独处理）→ 直接 `T extends ...`
- **不要分发**（把联合当一个整体）→ 用 `[T] extends [...]` 包起来

### 1.5 经典应用：`Exclude` 和 `Extract`

正是因为分布性，下面这两个类型才能工作。

```ts
// 从 T 中"减去"能赋给 U 的成员
type Exclude<T, U> = T extends U ? never : T

type A = Exclude<'a' | 'b' | 'c', 'a'>     // 'b' | 'c'
//                ↓ 分发
//   Exclude<'a', 'a'> | Exclude<'b', 'a'> | Exclude<'c', 'a'>
//        never        |       'b'         |       'c'
//   = 'b' | 'c'  （never 在联合里被吸收）
```

```ts
// 反过来：从 T 中"挑出"能赋给 U 的成员
type Extract<T, U> = T extends U ? T : never

type B = Extract<'a' | 'b' | 'c', 'a' | 'd'>  // 'a'
```

#### 关键知识点：`never` 在联合里被吸收

```ts
type X = 'a' | never   // = 'a'
type Y = string | never // = string
```

**`never` 表示"不可能存在的类型"**，它出现在联合里就像加了个 0：`'a' | never = 'a'`。

这是 `Exclude` 能工作的根本——分发后，"被排除"的项变成 `never`，自动消失，留下其他项。

---

## 二、infer：在条件类型中"捕获"一个类型

### 2.1 它解决什么问题？

假设你想写一个类型："给我一个函数类型，告诉我它的返回值类型是什么"。

```ts
type GetReturn<T> = ???

type R = GetReturn<() => string>   // 期望得到 string
```

你的难点是：**你怎么"挖出"函数类型里的"返回值"那一块？** 类型层面没有 `.return` 这种属性可以访问。

**`infer` 就是为了解决这个问题**——它让你在 `extends` 子句里**声明一个类型变量**来"捕获"某个位置的类型。

### 2.2 最简单的 infer 例子

```ts
type GetReturn<T> = T extends (...args: any[]) => infer R ? R : never
//                                                 ↑↑↑↑↑↑↑↑
//                  在"返回值"位置声明一个变量 R 来捕获那个类型

type R1 = GetReturn<() => string>          // string
type R2 = GetReturn<() => number>          // number
type R3 = GetReturn<(x: number) => User>   // User
```

**逐步翻译这一行**：

```ts
T extends (...args: any[]) => infer R ? R : never
```

> "如果 T 是一个函数类型（`(...args: any[]) => 某种返回值`），就把它的返回值类型起名叫 R，然后**返回 R**；否则返回 never"

`infer` 像是个**模板匹配**——TS 帮你把返回值那一块"扣下来"，命名为 R。

### 2.3 各种位置都能用 infer

`infer` 不只能用在返回值——只要是 `extends` 子句里的某个"位置"，都能用：

```ts
// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never
//                              ↑↑↑↑↑↑↑↑↑
//                              "如果 T 是数组，捕获元素类型为 E"

type E1 = ElementOf<string[]>   // string
type E2 = ElementOf<number[]>   // number

// 提取 Promise 的解析值类型
type AwaitedSimple<T> = T extends Promise<infer V> ? V : T

type A1 = AwaitedSimple<Promise<string>>   // string
type A2 = AwaitedSimple<number>            // number（不是 Promise，原样返回）

// 提取构造器参数列表
type CtorParams<T> = T extends new (...args: infer P) => any ? P : never

class User { constructor(public name: string, public age: number) {} }
type P = CtorParams<typeof User>   // [name: string, age: number]
```

### 2.4 infer 的心法

> **`infer X` 的意思是：在这个位置，给我一个名为 X 的变量去捕获 TS 推断出的类型。**

它**只能出现在 `extends` 的右边**（条件类型的"模式"里）。其他位置写 `infer` 会报错。

```ts
type Bad<T> = infer X   // ❌ 'infer' declarations are only permitted in the 'extends' clause
```

### 2.5 完整示例：手写 ReturnType

把上面的 `GetReturn` 加上泛型约束，就是 TS 内置的 `ReturnType`：

```ts
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never

type R = ReturnType<() => Promise<User>>   // Promise<User>
```

`T extends (...args: any) => any` 是**泛型约束**——确保你只能传函数类型进来。

---

## 三、映射类型：遍历对象的所有键

### 3.1 起步：用类型"复制"一个对象

之前讲过 `keyof T` 拿到对象的所有键。**映射类型**让你**遍历这些键**，构造一个新对象类型。

```ts
type CopyOf<T> = {
  [K in keyof T]: T[K]
}

type User = { id: number; name: string }
type U2 = CopyOf<User>   // { id: number; name: string }  ← 跟 User 一模一样
```

**逐字翻译这个语法**：

```ts
{ [K in keyof T]: T[K] }
//   ↑    ↑↑↑↑↑↑↑↑↑    ↑↑↑↑
//   K   遍历 T 的每个键   每个键对应的值类型还是 T[K]
```

类比 JS 的 `for...in`：

```js
const result = {}
for (const k in t) {
  result[k] = t[k]
}
```

只不过这是**类型层面**的"遍历"。

### 3.2 在遍历时**改造**字段——这才是真本事

把 `T[K]` 换成别的，就能"改造"每个字段：

```ts
// 把所有字段变成可选
type Partial<T> = {
  [K in keyof T]?: T[K]
  //              ↑ 加个 ? 就是可选
}

// 把所有字段变成只读
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
//   ↑↑↑↑↑↑↑↑ 加 readonly
}

// 把所有字段变成 boolean（不管原来是什么类型）
type AllBool<T> = {
  [K in keyof T]: boolean
}

type U = AllBool<{ id: number; name: string }>
// = { id: boolean; name: boolean }
```

这就是 TS 内置 `Partial`、`Readonly` 的**完整实现**——只用了一行映射类型。

### 3.3 修饰符的"加减"（`+` / `-`）

映射类型的修饰符可以**加**也可以**减**：

```ts
// 移除 readonly（让字段可写）
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
//↑↑↑↑↑↑↑↑↑ 减号表示"去掉 readonly"
}

// 移除可选（让字段必填）
type Required<T> = {
  [K in keyof T]-?: T[K]
//              ↑↑ 减号表示"去掉可选"
}
```

写 `readonly`/`?` 就是加，写 `-readonly`/`-?` 就是减。

### 3.4 `as` 重映射键名（TS 4.1+）—— 巨好用

默认情况下，映射类型只能改"值的类型"，不能改"键的名字"。从 TS 4.1 开始，你可以用 `as` 关键字**给键改名**：

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
//              ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
//              把键名 K 改成 'get' + 首字母大写的 K
}

type U = { id: number; name: string }
type G = Getters<U>
// {
//   getId: () => number
//   getName: () => string
// }
```

**逐步看**：
- `K in keyof T` —— 遍历 U 的每个键（'id' | 'name'）
- `as ...` —— 把键改成新的名字
- `Capitalize<K & string>` —— 把键名首字母大写（`Capitalize` 是 TS 内置的）
- `K & string` —— 因为 `keyof T` 可能包含 number/symbol，这里用 `& string` 强制是字符串

### 3.5 用 `as` + 条件类型**过滤**键

`as` 还有个超有用的能力：**把不想要的键改成 `never`，TS 会自动剔除它们**。

```ts
// 只保留值是函数的字段
type FunctionKeys<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K]
//              ↑                          ↑    ↑
//              如果值是函数，键名保持 K；否则键名是 never（被剔除）
}

type Obj = {
  id: number
  print: () => void
  greet: (n: string) => void
}

type Fns = FunctionKeys<Obj>
// {
//   print: () => void
//   greet: (n: string) => void
// }
// id 被剔除了，因为它的键名变成 never
```

**核心规则**：**键名是 `never` 的字段会被自动从结果里剔除**。这是过滤模式的本质。

---

## 四、模板字面量类型（TS 4.1+）

### 4.1 起步：字符串拼接（在类型层面！）

JS 里 `` `Hello, ${name}` `` 是字符串模板。TS 让你在**类型层面**做同样的事：

```ts
type Greeting = `Hello, ${string}`

const a: Greeting = 'Hello, world'   // ✅
const b: Greeting = 'Hello, Alice'   // ✅
const c: Greeting = 'Hi there'       // ❌ 不以 'Hello, ' 开头
```

`Greeting` 这个类型表示"任何以 'Hello, ' 开头的字符串"。

### 4.2 配合字面量联合 → 自动展开（笛卡尔积）

```ts
type Lang = 'en' | 'zh'
type Region = 'US' | 'CN'

type Locale = `${Lang}-${Region}`
// = 'en-US' | 'en-CN' | 'zh-US' | 'zh-CN'
```

每个变量位置遇到联合类型，TS 会**穷举所有组合**——像数学里的笛卡尔积。这在描述事件名、CSS 类名、locale 等场景下极其有用。

### 4.3 内置的字符串工具类型

TS 4.1 起内置了 4 个字符串操作工具：

```ts
type A = Uppercase<'hello'>    // 'HELLO'
type B = Lowercase<'HELLO'>    // 'hello'
type C = Capitalize<'hello'>   // 'Hello'
type D = Uncapitalize<'HELLO'> // 'hELLO'
```

注意它们是**类型层面的**操作，不是 JS 函数。

### 4.4 模板字面量配合 infer：解析字符串

终极用法——**用 infer 从字符串里"扣"出某一段**：

```ts
type ExtractName<T> = T extends `Hello, ${infer Name}` ? Name : never

type N = ExtractName<'Hello, Alice'>   // 'Alice'
```

像正则匹配，但完全在类型层面进行。

#### 实战例子：解析 React Router 的路径参数

```ts
type Params<S> =
  S extends `${string}/:${infer P}/${infer Rest}`
    ? P | Params<`/${Rest}`>
    : S extends `${string}/:${infer P}`
    ? P
    : never

type T = Params<'/users/:id/posts/:postId'>   // 'id' | 'postId'
```

这正是 React Router、Express 之类做"参数类型推断"的核心技巧。

---

## 五、手撕内置工具类型（必做基本功）

每一个都先尝试**自己实现**，再看答案对照。

> ⚠️ 不要跳过！手写这些是培养"类型编程肌肉记忆"的最佳方式。

```ts
// Partial<T> — 所有属性变可选
type Partial<T> = { [K in keyof T]?: T[K] }

// Required<T> — 所有属性变必填
type Required<T> = { [K in keyof T]-?: T[K] }

// Readonly<T> — 所有属性变只读
type Readonly<T> = { readonly [K in keyof T]: T[K] }

// Pick<T, K> — 只保留指定的几个键
type Pick<T, K extends keyof T> = { [P in K]: T[P] }

// Omit<T, K> — 排除指定的几个键
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

// Record<K, T> — 构造一个键为 K、值为 T 的对象类型
type Record<K extends keyof any, T> = { [P in K]: T }

// Exclude<T, U> — 从联合 T 中排除能赋给 U 的成员
type Exclude<T, U> = T extends U ? never : T

// Extract<T, U> — 从联合 T 中挑出能赋给 U 的成员
type Extract<T, U> = T extends U ? T : never

// NonNullable<T> — 排除 null 和 undefined
type NonNullable<T> = T extends null | undefined ? never : T

// Parameters<T> — 提取函数的参数列表
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never

// ReturnType<T> — 提取函数的返回值类型
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never

// ConstructorParameters<T> — 提取构造器的参数列表
type ConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: infer P) => any ? P : never

// InstanceType<T> — 从构造器拿到实例类型（之前 phase-03 见过）
type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : never

// Awaited<T> — 递归解开 Promise<Promise<...<T>>>
type Awaited<T> =
  T extends null | undefined ? T :
  T extends object & { then(onfulfilled: infer F, ...args: any[]): any } ?
    F extends ((value: infer V, ...args: any[]) => any) ? Awaited<V> : never :
  T
```

每实现一个就在 VS Code 里**鼠标悬停验证**结果，确认理解。

---

## 六、递归类型：让类型自己调用自己

### 6.1 类型可以"调用"自己

跟 JS 函数一样，类型也能递归——**自己引用自己**：

```ts
// 元组反转
type Reverse<T extends any[]> =
  T extends [infer Head, ...infer Tail]
    ? [...Reverse<Tail>, Head]
    : []
//    ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
//    用 Reverse 调用自己

type R = Reverse<[1, 2, 3]>   // [3, 2, 1]
```

**逐步推导**：

```
Reverse<[1, 2, 3]>
  Head = 1, Tail = [2, 3]
  → [...Reverse<[2, 3]>, 1]

  Reverse<[2, 3]>
    Head = 2, Tail = [3]
    → [...Reverse<[3]>, 2]

    Reverse<[3]>
      Head = 3, Tail = []
      → [...Reverse<[]>, 3]

      Reverse<[]>
        不匹配 [Head, ...Tail]，返回 []

      → [...[], 3] = [3]

    → [...[3], 2] = [3, 2]

  → [...[3, 2], 1] = [3, 2, 1]
```

理解递归类型的关键是**手动模拟一遍展开**——和 JS 递归同样的思路。

### 6.2 更多递归例子

```ts
// 元组长度
type Length<T extends readonly any[]> = T['length']

type L = Length<[1, 2, 3]>   // 3

// 字符串分割
type Split<S extends string, D extends string> =
  S extends `${infer Head}${D}${infer Tail}`
    ? [Head, ...Split<Tail, D>]
    : [S]

type Parts = Split<'a-b-c', '-'>   // ['a', 'b', 'c']

// 字符串去除首尾空格
type TrimLeft<S extends string> =
  S extends ` ${infer R}` ? TrimLeft<R> : S

type TrimRight<S extends string> =
  S extends `${infer R} ` ? TrimRight<R> : S

type Trim<S extends string> = TrimLeft<TrimRight<S>>

type T = Trim<'   hello   '>   // 'hello'
```

### 6.3 递归深度限制

⚠️ TS 的递归默认有**深度上限**（约 50 层），过深会被 TS 直接放弃推导：

```ts
type Tuple<N extends number, R extends any[] = []> =
  R['length'] extends N ? R : Tuple<N, [...R, any]>

type T1 = Tuple<10>   // [any, any, ..., any] 10 个，OK
type T2 = Tuple<100>  // ❌ Type instantiation is excessively deep
```

处理大数据时，能用迭代写法就用迭代，避免深递归。

---

## 实战练习（Phase 5）

### Tier 1 — 实现内置工具类型

不看答案，独立实现：
- [ ] `MyPartial<T>`
- [ ] `MyRequired<T>`
- [ ] `MyReadonly<T>`
- [ ] `MyPick<T, K>`
- [ ] `MyOmit<T, K>`
- [ ] `MyExclude<T, U>`
- [ ] `MyReturnType<T>`
- [ ] `MyParameters<T>`
- [ ] `MyAwaited<T>`

### Tier 2 — Type-Challenges Easy

至少做完 [type-challenges](https://github.com/type-challenges/type-challenges) 全部 easy 题（约 13 题），重点：
- `Tuple to Object`
- `First of Array`
- `Length of Tuple`
- `If`
- `Concat`
- `Includes`
- `Push`
- `Unshift`
- `Parameters`

### Tier 3 — Type-Challenges Medium 精选

- `Get Return Type`
- `Pick by Type`（按值类型 pick）
- `Last of Array`
- `Pop`
- `Promise.all` 类型
- `Trim`
- `Capitalize`
- `Replace`
- `Replace All`
- `Append Argument`
- `Permutation`
- `Length of String`
- `Flatten`
- `Append to object`
- `Absolute`
- `String to Union`
- `Merge`
- `KebabCase` / `CamelCase`
- `Diff`

### Tier 4 — 进阶应用

#### 1. 路径类型（Object Path）
实现 `Path<T>` 类型，给定嵌套对象类型，得到所有合法路径字符串：
```ts
type Obj = { user: { name: string; addr: { city: string } } }
type P = Path<Obj>
// 'user' | 'user.name' | 'user.addr' | 'user.addr.city'
```

#### 2. 路径取值
实现 `PathValue<T, P>`，根据路径字符串取值类型：
```ts
type V = PathValue<Obj, 'user.addr.city'>   // string
```

#### 3. URL 参数提取
实现 `RouteParams<S>`：
```ts
type R = RouteParams<'/users/:id/posts/:postId'>
// { id: string; postId: string }
```

#### 4. Event 名 → 处理器映射
```ts
type EventMap = { click: MouseEvent; keydown: KeyboardEvent }
type Handlers<T> = ???
type H = Handlers<EventMap>
// { onClick: (e: MouseEvent) => void; onKeydown: (e: KeyboardEvent) => void }
```

---

## 调试类型的技巧

### 1. 用 hover 查看推导结果
在 VS Code 里把鼠标停在类型名上，能看到 TS 算出来的具体类型。**这是调试类型的第一手段**。

### 2. `// $ExpectType` 注释（社区惯例）
许多库用这种方式做类型测试，配合 `tsd` 等工具可以自动验证。

### 3. 强制展开类型（避免显示成别名）
默认 hover 看到的是别名（比如 `Pick<User, 'id' | 'name'>`），不是展开后的形状。这两个工具能强制展开：

```ts
type Expand<T> = { [K in keyof T]: T[K] } & {}

type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T
```

调试时把类型套一层 `Expand<...>` 再 hover，一目了然。

### 4. `tsc --noEmit --extendedDiagnostics`
排查类型推导慢的"凶手"。大型项目里复杂的条件类型可能拖慢编译，这个命令会输出耗时统计。

---

## 检查清单（学完应该能回答）

- [ ] **`extends` 在条件类型里到底是什么意思？** 谁是"具体的"，谁是"宽松的"？
- [ ] **分布式条件类型在何种条件下触发？** 怎么关闭它？为什么 `[T]` 包一层就能关闭？
- [ ] **`never` 在联合类型里为什么会"消失"？** 这跟 `Exclude` 怎么扯上关系？
- [ ] **`infer` 关键字解决了什么核心问题？** 为什么它只能写在 `extends` 子句里？
- [ ] **映射类型的语法 `{ [K in keyof T]: ... }` 类比 JS 的什么操作？**
- [ ] **`as` 重映射键名解决了映射类型的什么局限？**
- [ ] **如何用 `as` + `never` 实现"过滤键"？** 为什么键名是 `never` 的字段会被剔除？
- [ ] **模板字面量类型 + 联合为什么会笛卡尔积展开？**
- [ ] **为什么 `Omit` 的实现要用 `Exclude<keyof T, K>` 而不是直接 `K extends keyof T`？**
- [ ] **递归类型的"基线"（终止条件）应该怎么设计？** 如果忘了写会怎样？

下一阶段：[Phase 6 — 工程化与生态](./phase-06-engineering.md)
