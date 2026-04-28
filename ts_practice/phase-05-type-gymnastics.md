# Phase 5：类型编程 / 类型体操（Week 6-7）

> 目标：把类型系统当作一门函数式语言，能实现内置工具类型，能解 type-challenges medium 题

> 这是 TS 学习的**第二道分水岭**，也是和"会用 TS 的人"拉开差距的地方。

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

## 一、条件类型：类型层的三元运算符

```ts
type IsString<T> = T extends string ? true : false

type A = IsString<'hi'>     // true
type B = IsString<42>       // false
```

### 分布式条件类型（distributive conditional types）

> **关键陷阱**：当条件类型作用于"裸"泛型且类型是 union 时，会自动**分发**。

```ts
type ToArray<T> = T extends any ? T[] : never

type R = ToArray<string | number>
// 不是 (string | number)[]，而是 string[] | number[]
// 因为它分发成了：ToArray<string> | ToArray<number>
```

**关闭分发**：用元组包裹
```ts
type ToArray2<T> = [T] extends [any] ? T[] : never
type R2 = ToArray2<string | number>   // (string | number)[]
```

### 经典应用：`Exclude` 和 `Extract`
```ts
type Exclude<T, U> = T extends U ? never : T
type Extract<T, U> = T extends U ? T : never

type A = Exclude<'a' | 'b' | 'c', 'a'>     // 'b' | 'c'
type B = Extract<'a' | 'b' | 'c', 'a' | 'd'>  // 'a'
```

> **never 在 union 中会被吸收**：`never | 'a'` = `'a'`。这是 Exclude 能工作的关键。

## 二、infer：在条件类型中"声明并提取"类型变量

```ts
// 提取函数返回值类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type R = ReturnType<() => number>   // number

// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never
type E = ElementOf<string[]>   // string

// 提取 Promise 解析值
type Awaited<T> = T extends Promise<infer V> ? V : T  // 简化版（真实版要递归）

// 提取构造器参数
type CtorParams<T> = T extends new (...args: infer P) => any ? P : never
```

**心法**：`infer X` 就是"在这个位置，给我一个名为 X 的变量去捕获类型"。

## 三、映射类型：遍历键

```ts
// 内置 Partial 实现
type Partial<T> = {
  [K in keyof T]?: T[K]
}

// 内置 Readonly 实现
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
}
```

### 修饰符的加减（`+` / `-`）
```ts
// 移除 readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

// 移除可选（变成 Required）
type Required<T> = {
  [K in keyof T]-?: T[K]
}
```

### `as` 重映射键名（4.1+）

> 这是字符串模板类型 + 映射类型的化学反应，威力巨大。

```ts
// 给所有键加 'on' 前缀，并改成驼峰
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

type U = { id: number; name: string }
type G = Getters<U>
// {
//   getId: () => number
//   getName: () => string
// }
```

### 用 `as` + 条件类型过滤键
```ts
// 提取所有值为函数的键
type FunctionKeys<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K]
}

type Obj = { id: number; print: () => void; greet: (n: string) => void }
type Fns = FunctionKeys<Obj>   // { print: () => void; greet: (n: string) => void }
```

`never` 的键会被自动剔除——这是过滤模式的核心。

## 四、模板字面量类型（4.1+）

```ts
type Greeting = `Hello, ${string}`
type X = Greeting   // 'Hello, anything'

type HttpUrl = `https://${string}.com`
const u: HttpUrl = 'https://example.com'   // ✅
const v: HttpUrl = 'http://example.com'    // ❌
```

### 配合 union 自动展开（笛卡尔积）
```ts
type Lang = 'en' | 'zh'
type Region = 'US' | 'CN'
type Locale = `${Lang}-${Region}`   // 'en-US' | 'en-CN' | 'zh-US' | 'zh-CN'
```

### 配合 infer 做模式匹配
```ts
type ExtractRoute<T> = T extends `/${infer P}` ? P : never
type R = ExtractRoute<'/users/123'>   // 'users/123'

// 解析路径参数
type Params<S> =
  S extends `${string}/:${infer P}/${infer Rest}`
    ? P | Params<`/${Rest}`>
    : S extends `${string}/:${infer P}`
    ? P
    : never

type T = Params<'/users/:id/posts/:postId'>   // 'id' | 'postId'
```

这是 React Router、Express 之类做"参数类型推断"的核心技巧。

## 五、手撕内置工具类型（必做基本功）

每一个都尝试不看答案先实现。

```ts
// Partial<T> — 所有属性变可选
type Partial<T> = { [K in keyof T]?: T[K] }

// Required<T> — 所有属性变必填
type Required<T> = { [K in keyof T]-?: T[K] }

// Readonly<T>
type Readonly<T> = { readonly [K in keyof T]: T[K] }

// Pick<T, K>
type Pick<T, K extends keyof T> = { [P in K]: T[P] }

// Omit<T, K>
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

// Record<K, T>
type Record<K extends keyof any, T> = { [P in K]: T }

// Exclude<T, U>
type Exclude<T, U> = T extends U ? never : T

// Extract<T, U>
type Extract<T, U> = T extends U ? T : never

// NonNullable<T>
type NonNullable<T> = T extends null | undefined ? never : T

// Parameters<T>
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never

// ReturnType<T>
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never

// ConstructorParameters<T>
type ConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: infer P) => any ? P : never

// InstanceType<T>
type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : never

// Awaited<T> — 递归解开 Promise
type Awaited<T> =
  T extends null | undefined ? T :
  T extends object & { then(onfulfilled: infer F, ...args: any[]): any } ?
    F extends ((value: infer V, ...args: any[]) => any) ? Awaited<V> : never :
  T
```

## 六、递归类型：进入"图灵完备"领域

```ts
// 元组反转
type Reverse<T extends any[]> =
  T extends [infer Head, ...infer Tail] ? [...Reverse<Tail>, Head] : []

type R = Reverse<[1, 2, 3]>   // [3, 2, 1]

// 元组长度
type Length<T extends readonly any[]> = T['length']

// 字符串分割
type Split<S extends string, D extends string> =
  S extends `${infer Head}${D}${infer Tail}`
    ? [Head, ...Split<Tail, D>]
    : [S]

type Parts = Split<'a-b-c', '-'>   // ['a', 'b', 'c']

// 字符串去除空格（Trim）
type TrimLeft<S extends string> =
  S extends ` ${infer R}` ? TrimLeft<R> : S
type TrimRight<S extends string> =
  S extends `${infer R} ` ? TrimRight<R> : S
type Trim<S extends string> = TrimLeft<TrimRight<S>>
```

### 递归深度限制
TS 默认递归深度有限（约 50 层），过深会报错或被简化。处理大数据时要注意，能用迭代写法就用迭代。

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
在 VSCode 里把鼠标停在类型名上。

### 2. `// $ExpectType` 注释（社区惯例）
许多库用这种方式做类型测试。

### 3. 强制展开类型（避免显示成别名）
```ts
type Expand<T> = { [K in keyof T]: T[K] } & {}
type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T
```
hover 时一目了然，不再显示成 `Pick<...>`。

### 4. `tsc --noEmit --extendedDiagnostics`
排查类型推导慢的"凶手"。

---

## 检查清单

- [ ] 分布式条件类型在何种条件下触发？怎么关闭？
- [ ] `infer` 在 `extends` 之外的位置能用吗？为什么？
- [ ] `[K in keyof T as ...]` 解决了映射类型的什么局限？
- [ ] 模板字面量 + union 为什么会笛卡尔积展开？
- [ ] 为什么 `Omit` 用 `Exclude<keyof T, K>` 而不是 `K extends keyof T`？
- [ ] `never` 在 union 和映射类型中的"消失行为"？

下一阶段：[Phase 6 — 工程化与生态](./phase-06-engineering.md)
