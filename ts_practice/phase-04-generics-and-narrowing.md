# Phase 4：泛型与类型收窄（Week 4-5）

> 目标：能写出受约束的泛型工具函数；理解类型收窄是 TS 类型系统的灵魂

> 这是 TS 学习的**第一道分水岭**——很多人卡在这里。慢一点，多动手。

## 知识图谱

```
泛型与收窄
├── 泛型基础
│   ├── 泛型函数 / 类 / 接口 / 类型别名
│   ├── 泛型参数命名约定（T, K, V, P, R...）
│   ├── 类型推断 vs 显式传入
│   ├── 泛型默认值 <T = string>
│   └── 多泛型参数协作
├── 泛型约束
│   ├── extends 约束
│   ├── 用 keyof 约束键名
│   ├── 约束 + 推断（T extends X ? Y : Z 的雏形）
│   └── 子类型关系（A extends B 意味什么）
├── 类型查询操作符
│   ├── typeof（值 → 类型）
│   ├── keyof（类型 → 键的字面量 union）
│   ├── T[K] 索引访问
│   └── T[number] / T[keyof T]
├── 类型收窄（narrowing）
│   ├── typeof 守卫
│   ├── instanceof 守卫
│   ├── in 操作符守卫
│   ├── 字面量比较（=== / switch）
│   ├── 真值收窄（truthy）
│   ├── 自定义类型谓词 user is User
│   ├── 断言函数 asserts x is T
│   └── 可辨识联合（discriminated union）
└── 协变 / 逆变（了解即可）
    └── 函数参数逆变、返回值协变
```

## 一、泛型 = 类型层面的"参数化"

JS 类比：
```js
const identity = (x) => x
```
TS 泛型：
```ts
const identity = <T>(x: T): T => x

identity(1)         // T 推断为 number
identity('a')       // T 推断为 string
identity<boolean>(true)  // 显式传入
```

**心法**：把 `<T>` 当作"接收一个类型作为参数"。整个类型系统其实就是函数式语言。

### 泛型在哪里出现
```ts
// 泛型函数
function map<T, U>(arr: T[], fn: (x: T) => U): U[] { /* ... */ }

// 泛型接口
interface Box<T> { value: T }

// 泛型类型别名
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

// 泛型类
class Stack<T> {
  private items: T[] = []
  push(x: T) { this.items.push(x) }
  pop(): T | undefined { return this.items.pop() }
}
```

### 泛型默认值
```ts
type ApiResp<T = unknown> = { code: number; data: T }
const r: ApiResp = { code: 0, data: 'ok' }  // T 默认 unknown
```

## 二、泛型约束（重点）

不约束的泛型 ≈ `any`，几乎没用。约束让编译器知道"这个类型至少有什么"。

```ts
// ❌ 不约束：不能假设有 .length
function longest<T>(a: T, b: T): T {
  return a.length > b.length ? a : b   // 'length' does not exist on T
}

// ✅ 约束 T 必须有 length: number
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length > b.length ? a : b
}

longest('aaa', 'bb')        // ✅
longest([1, 2], [1, 2, 3])  // ✅
longest(1, 2)               // ❌ number 没 length
```

### 用 `keyof` 约束键名（高频用法）
```ts
function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const u = { id: 1, name: 'a' }
const id = get(u, 'id')      // id: number
const x = get(u, 'foo')      // ❌ 'foo' 不在 keyof
```

这是 lodash `_.get`、Pick、Omit 等的基础。

## 三、`typeof` / `keyof` / `T[K]` 三剑客

```ts
// typeof：值 → 类型
const config = { url: '/api', port: 80 }
type Config = typeof config       // { url: string; port: number }

// keyof：对象类型 → 键的 union
type Key = keyof Config           // 'url' | 'port'

// T[K]：索引访问
type UrlType = Config['url']      // string
type Values = Config[keyof Config]  // string | number

// 数组转 union 的常用技巧
const colors = ['red', 'green', 'blue'] as const
type Color = typeof colors[number]  // 'red' | 'green' | 'blue'
```

**记住这个组合拳**：`typeof` 把值搬到类型层 → `keyof` 取键 → `T[K]` 取值类型。

## 四、类型收窄 — TS 类型系统的灵魂

> JS 中变量的"实际类型"在不同代码分支可能不同。TS 用**控制流分析**追踪这个过程，叫做"收窄"。

### 1. `typeof` 守卫
```ts
function format(x: string | number) {
  if (typeof x === 'string') {
    return x.toUpperCase()    // 这里 x: string
  }
  return x.toFixed(2)          // 这里 x: number
}
```

### 2. `instanceof` 守卫
```ts
function area(s: Circle | Square) {
  if (s instanceof Circle) return Math.PI * s.r ** 2
  return s.size ** 2
}
```

### 3. `in` 操作符守卫
```ts
type Cat = { meow(): void }
type Dog = { bark(): void }

function speak(p: Cat | Dog) {
  if ('meow' in p) p.meow()
  else p.bark()
}
```

### 4. 真值收窄
```ts
function len(s?: string) {
  if (s) return s.length   // 这里 s: string（不是 string | undefined）
  return 0
}
```

### 5. 字面量比较 / switch
```ts
function move(d: 'up' | 'down') {
  if (d === 'up') { /* d: 'up' */ }
  else { /* d: 'down' */ }
}
```

### 6. 自定义类型谓词（很重要）
当内置守卫不够用时，自己写：

```ts
function isString(x: unknown): x is string {
  return typeof x === 'string'
}

function process(x: unknown) {
  if (isString(x)) {
    x.toUpperCase()  // ✅ x 收窄为 string
  }
}
```

**注意**：返回值类型必须是 `参数 is 某类型`，编译器才会用它做收窄。

### 7. 断言函数（4.0+）
```ts
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new Error('not string')
}

function process(x: unknown) {
  assertString(x)
  x.toUpperCase()  // x 已被断言为 string
}
```

## 五、可辨识联合（Discriminated Union）— 必杀技

> JS 中处理"形态不同的对象"通常很乱，TS 给了一个优雅模式。

```ts
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string }

function render(s: RequestState) {
  switch (s.status) {
    case 'idle':    return 'Click to load'
    case 'loading': return 'Loading...'
    case 'success': return `Hi, ${s.data.name}`     // s 收窄为含 data
    case 'error':   return `Oops: ${s.error}`       // 收窄为含 error
    default:
      const _: never = s   // 穷尽性检查
      return _
  }
}
```

这是写 React useReducer、Redux、有限状态机的最佳模式。**强烈建议形成肌肉记忆**。

## 六、协变 / 逆变（了解层面）

> 这块第一遍看不懂没关系，做项目时遇到 "Type X is not assignable" 再回来看。

**核心结论**：
- 函数返回值是**协变**的：`Cat[]` 可赋给 `Animal[]`
- 函数参数是**逆变**的：能接 `Animal` 的函数才能赋给"接 `Cat` 的函数"位置（反过来不行）
- TS 默认对函数参数采用**双变**（除非开启 `strictFunctionTypes`）

```ts
type Handler<T> = (x: T) => void

const animalHandler: Handler<Animal> = (a) => {}
const catHandler: Handler<Cat> = animalHandler   // ✅ 逆变：能处理父类型的，肯定能处理子类型

const animalHandler2: Handler<Animal> = catHandler  // ❌（在 strict 下）
```

---

## 实战：实现常见工具函数

### `pick`
```ts
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>
  for (const k of keys) out[k] = obj[k]
  return out
}
```

### `omit`
```ts
function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const out = { ...obj }
  for (const k of keys) delete (out as any)[k]
  return out
}
```

### `groupBy`
```ts
function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const it of arr) {
    const k = keyFn(it)
    ;(out[k] ||= []).push(it)
  }
  return out
}
```

---

## 必做练习（Phase 4）

### Exercise 4.1 — keyof 路径
实现 `getProp<T, K extends keyof T>(obj: T, key: K): T[K]`，要求 `key` 必须是 `obj` 的合法键。

### Exercise 4.2 — 自定义类型谓词
写一个 `isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]]`。

### Exercise 4.3 — 断言函数
实现 `assertDefined<T>(x: T | null | undefined): asserts x is T`。

### Exercise 4.4 — 可辨识联合 + 状态机
设计一个 `Promise` 状态机：
```ts
type AsyncState<T, E> = ???   // 你来填
function reducer<T, E>(s: AsyncState<T, E>, action: ???): AsyncState<T, E>
```
要求覆盖 idle / loading / success / error 四种状态。

### Exercise 4.5 — 类型收窄实战
不使用 `as`，将 `unknown` 收窄为 `{ id: number; name: string }[]`。

### Exercise 4.6 — 泛型约束
实现 `merge<A, B>(a: A, b: B): A & B`，要求两个参数都必须是 object。

### Exercise 4.7 — typeof + keyof 派生
给定：
```ts
const ROUTES = {
  home: '/',
  about: '/about',
  profile: (id: number) => `/profile/${id}`,
} as const
```
派生类型 `RouteName`（`'home' | 'about' | 'profile'`）和 `RouteValue`（路径字面量 union）。

---

## 检查清单

- [ ] 泛型约束 `<T extends X>` 解决什么问题？
- [ ] `keyof T` 和 `typeof obj` 的组合用法？
- [ ] 类型谓词 `x is T` 与普通 boolean 函数的区别？
- [ ] 可辨识联合的"判别字段"必须是什么形态？
- [ ] 哪些操作会触发类型收窄？

下一阶段：[Phase 5 — 类型编程（类型体操）](./phase-05-type-gymnastics.md)
