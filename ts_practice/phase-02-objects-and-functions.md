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

TS 里描述"对象的形状"有两种语法：`interface` 和 `type`：

```ts
interface User { id: number; name: string }
type User = { id: number; name: string }
```

**99% 的场景下两者可以互换**——形状一样，效果也一样。但有几个细节差异，决定了你在某些场景下应该选哪种。

### 差异 1：声明合并（只有 interface 有）

如果你写**两个同名的 interface**，TS 会**自动把它们合并**成一个：

```ts
interface User { id: number }
interface User { name: string }       // 跟上面同名

const u: User = { id: 1, name: 'a' }  // ✅ 合并后 User 等于 { id: number; name: string }
```

`type` 不能这样：

```ts
type User = { id: number }
type User = { name: string }          // ❌ Duplicate identifier 'User'
```

**这个特性主要在"扩展第三方库类型"时有用**——比如你想给 `Window` 全局对象加上自己的属性：

```ts
interface Window {
  myApp: { version: string }
}

window.myApp.version          // ✅ TS 知道 window 上有这个字段
```

`interface Window` 会自动跟内置的 `Window` 接口合并，不影响其他代码。**用 `type` 做不到这件事**。

### 差异 2：能表达的类型范围（`type` 更宽）

`interface` **只能描述对象形状**。`type` 能描述任何东西：

```ts
// type 可以表达 union（联合类型）
type ID = string | number

// type 可以给原始类型起别名
type Email = string

// type 可以表达元组
type Pair = [number, string]

// 这些 interface 都做不到
```

**简单记忆**：`interface` 是"对象专用"，`type` 是"万能别名"。

### 差异 3：继承语法不同（功能等价）

```ts
// interface 用 extends
interface Animal { name: string }
interface Dog extends Animal { breed: string }

// type 用 & 交叉类型
type Animal = { name: string }
type Dog = Animal & { breed: string }
```

两种写法**最终类型完全一样**，只是写法不同。

### 实战选择建议

```
描述对象形状、想要被外部扩展      → interface
表达 union / 元组 / 原始类型      → type（interface 做不到）
工具类型派生 (keyof / Pick / ...) → type
不知道怎么选                       → 选 type，更通用
```

**团队统一一种也完全 OK**，不用纠结。常见的两种约定：
- "对外 API 用 interface，内部用 type"
- "全部用 type，除非要做声明合并"

| 特性 | `interface` | `type` |
|---|---|---|
| 声明合并 | ✅ | ❌ |
| 描述对象形状 | ✅ | ✅ |
| 描述 union / 元组 / 原始类型 | ❌ | ✅ |
| 继承语法 | `extends` | `&` |
| 描述函数 | ✅ | ✅ |

## 二、对象属性的修饰符

对象属性可以加几个"标签"来控制行为：

```ts
interface User {
  readonly id: number       // 只读：赋值之后不能再改
  name: string              // 普通属性
  email?: string            // 可选：可以缺省（实际类型是 string | undefined）
  [key: string]: unknown    // 索引签名：允许任意 string 键（下面会讲）
}
```

### 2.1 readonly 修饰符

加了 `readonly` 之后，这个字段不能被重新赋值：

```ts
const u: User = { id: 1, name: 'a' }
u.name = 'b'              // ✅ 普通字段，能改
u.id = 2                  // ❌ Cannot assign to 'id' because it is a read-only property
```

注意：`readonly` 是**编译时**检查，不影响运行时——绕过去仍然能改（用断言强转）。要真正运行时不可改要用 `Object.freeze`。

### 2.2 可选属性 `?`

`email?: string` 是 `email: string | undefined` 的简写（而且更宽容一点）：

```ts
type User = { name: string; email?: string }
const a: User = { name: 'a' }              // ✅ email 可以省略
const b: User = { name: 'b', email: 'x' }  // ✅
```

### 2.3 索引签名 `[key: string]: T`

这条**告诉 TS "这个对象除了已知字段，还允许任意 string 键，对应值的类型是 T"**——常用于"字典"类型的对象：

```ts
type Headers = {
  contentType: string
  [key: string]: string         // 允许任意 string 键，值都是 string
}

const h: Headers = {
  contentType: 'application/json',
  authorization: 'Bearer xxx',  // ✅ 任意键
  'x-custom': 'foo',            // ✅
}
```

Phase 4 会讲它和 `Record<K, V>` 的关系。

### 2.4 一个让初学者非常困惑的例外：excess property check

这是 TS 类型检查里**最反直觉的一个特例**——必须先理解 TS 类型系统的根本哲学才能看懂。

#### 第一步：TS 是"结构化类型"系统

TS 判断"两个类型是否兼容"，**只看形状（字段名 + 字段类型），不看声明的名字**。

```ts
type Cat = { name: string; sound(): void }
type Dog = { name: string; sound(): void }

const c: Cat = { name: 'tom', sound() {} }
const d: Dog = c        // ✅ 通过！
//        ↑ 虽然变量声明的是 Cat，但因为 Cat 和 Dog 形状一模一样
//          TS 认为它们就是同一种类型
```

跟 Java/C# 那种"声明的是 Cat 就是 Cat、声明的是 Dog 就是 Dog"的"名义类型"完全不同。TS 信奉的是**鸭子类型**——"走起来像鸭子叫起来像鸭子，那它就是鸭子"。

#### 第二步：结构化类型的自然推论 — 多字段没事

由这条规则可以推出：**只要目标类型要的字段都有，多出来的字段不影响兼容**：

```ts
type Strict = { name: string }      // Strict 只要求一个字段：name

const tmp = { name: 'a', age: 10 } // tmp 的类型: { name: string; age: number }
const u: Strict = tmp               // ✅ 通过

// 因为 tmp 拥有 Strict 要的所有字段（name）
// 多出来的 age？Strict 又没说"必须只有 name"
// 多了无所谓，少了才不行 ← 结构化类型的精神
```

#### 第三步：让人懵的特例 — excess property check

把上面同样的代码**少写一行**（不经过 tmp 中转）：

```ts
const u: Strict = { name: 'a', age: 10 }
// ❌ Object literal may only specify known properties, and 'age'
//    does not exist in type 'Strict'
```

按结构化类型规则**应该通过的，TS 偏偏报错了**。这条额外规则叫 **"多余属性检查"**（excess property check / EPC），只在一个特定场景触发：

> **当你用一个对象字面量（`{ ... }`）直接赋值给已知类型的变量、参数、return 时**，TS 会**额外**检查这个字面量有没有"多余"的字段，有就报错。

#### 第四步：为什么 TS 要加这个特例？— 防 typo

下面这种代码在没有 EPC 的情况下会变成静默 bug：

```ts
type Config = { url: string; timeout: number }

const c: Config = {
  url: '/api',
  timoutt: 3000           // 你打错字了，多了个 t
}

// 如果纯按结构化类型放行：
// - timoutt 字段被忽略
// - 真正的 timeout 字段为 undefined
// - 运行时 timeout 拿不到，等于 0 或者直接挂
// - 你查半天找不到原因
```

TS 团队权衡之后决定：**字面量场景**（`= { ... }`、传参、return）是 typo 高发地，应该额外严查。

而**经过变量中转**（`const tmp = ...; const u = tmp`）说明你"显式地"已经持有这个对象，是有意为之的，就走标准结构化规则。

#### 第五步：怎么绕过 EPC（如果你真想传多余字段）

```ts
// 路 1：先存变量再赋值（最常见）
const tmp = { name: 'a', age: 10 }
const u: Strict = tmp

// 路 2：在类型里声明"允许额外字段" — 加索引签名
type Loose = { name: string; [key: string]: unknown }
const u: Loose = { name: 'a', age: 10 }

// 路 3：扩展运算符（编译器认为来自变量）
const extra = { age: 10 }
const u: Strict = { name: 'a', ...extra }

// 路 4：用 as 断言（不推荐，关闭了类型保护）
const u: Strict = { name: 'a', age: 10 } as Strict
```

#### 一张图看懂赋值时 TS 怎么判断

```
赋值时 TS 是怎么判断的？

  目标类型的所有【必需字段】都满足？
       ├─ 否 → ❌ 直接报错
       │
       ├─ 是 →  右边是不是【对象字面量直接写】？
       │           ├─ 是 → 触发 EPC
       │           │       ├─ 有多余字段 → ❌ 报错
       │           │       └─ 没有多余字段 → ✅ 通过
       │           │
       │           └─ 否（变量、函数返回值等）→ ✅ 通过
       │                                      （按结构化规则，多了不管）
```

#### 实战上你需要记住的三句话

1. **TS 的根本规则是结构化类型** — 形状一致就兼容，多字段没关系
2. **字面量直接赋值会被额外严查** — TS 故意加的"反 typo 保险"
3. **遇到 EPC 报错先想是不是 typo**，是就改字段名；不是就用变量中转或加索引签名

## 三、函数类型的写法

TS 描述函数有三种语法，对应三种使用场景。

### 3.1 函数类型表达式（最常用，95% 场景）

最直接的写法——用箭头表示"什么参数 → 什么返回值"：

```ts
type Adder = (a: number, b: number) => number

const add: Adder = (a, b) => a + b
//                  ↑     ↑
//          这两个参数会自动推断成 number，因为 Adder 已经规定了
```

它就是个"类型版的箭头函数"——左边参数列表，右边返回值类型。

### 3.2 Call signature（描述"既能当函数调用、又有属性"的对象）

JS 的函数本身也是对象——可以挂属性。所以 TS 需要一种语法描述"这个对象既能被调用、又有自己的属性"：

```ts
interface Adder {
  (a: number, b: number): number   // ← 这就是 call signature，没有方法名
  description: string               // ← 同时这个对象上还有 description 属性
}

const add: Adder = ((a, b) => a + b) as Adder
add.description = '加法函数'

add(1, 2)              // 当函数调用 ✅
add.description        // 当对象访问属性 ✅
```

注意 call signature 用**冒号** `(...): T`，函数类型表达式用**箭头** `(...) => T`——含义一样，写法不同（前者只能写在 interface/type 内部）。

**什么时候用 call signature？** 当你需要描述"函数 + 属性"的复合对象。比如 React 的 `forwardRef` 返回值、jQuery 的 `$` 对象、有 `displayName` 属性的 React 组件。

### 3.3 Construct signature（描述"能用 new 调用"的东西）

JS 的函数前面加 `new` 可以当构造器用。如果某个参数必须是"可 new 的东西"，就要用 `new` signature：

```ts
interface UserCtor {
  new (id: number, name: string): User    // 注意前面的 new
}

// 实际用法：写一个工厂函数，接收任意"能 new 出 User 的构造器"
function createUser(Ctor: UserCtor): User {
  return new Ctor(1, 'a')
}

class RealUser { constructor(public id: number, public name: string) {} }
createUser(RealUser)    // ✅ RealUser 类符合 UserCtor 的形态
```

**什么时候用？** 主要在写**框架/工厂**时——比如依赖注入容器、ORM 的模型注册、DI 框架，需要描述"任何能被 new 的类"。日常业务代码里很少直接写。

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

### 5.1 重载在解决什么问题

有时一个函数会**根据参数的类型返回不同类型的结果**。普通函数签名表达不了这种"输入决定输出"的对应关系：

```ts
// 普通签名只能写得很宽
function parse(input: string | number): object | string {
  if (typeof input === 'string') return JSON.parse(input)
  return String(input)
}

const a = parse('{"x":1}')    // a: object | string  ← 你知道是 object，但 TS 不知道
const b = parse(42)           // b: object | string  ← 同样
```

调用方拿到的类型是 `object | string`——这种"反正是其中一个"的信息几乎没用，每次都得自己 `if (typeof a === ...)` 收窄一遍。

### 5.2 重载的语法：多个"假签名" + 一个"真实现"

重载的写法是**写多遍函数签名**（不写函数体），最后再写一个真正包含函数体的实现：

```ts
function parse(input: string): object        // 重载签名 1：传字符串 → 返回对象
function parse(input: number): string        // 重载签名 2：传数字 → 返回字符串
function parse(input: string | number): object | string {   // 实现签名
  if (typeof input === 'string') return JSON.parse(input)
  return String(input)
}

const a = parse('{"x":1}')   // a: object   ✅ 精确
const b = parse(42)          // b: string   ✅ 精确
```

调用时 TS **从上往下匹配**重载签名，第一个匹配的就用——你之前看到的 `Array()` 的多重载就是同一个机制。

### 5.3 三个关键规则

#### 规则 1：实现签名"对调用方不可见"

最后那个带函数体的实现签名**只给 TS 编译器看**，调用方调用时**根本看不到**：

```ts
function parse(input: string): object
function parse(input: number): string
function parse(input: string | number): object | string {  // 只是实现，不对外暴露
  ...
}

parse(true)     // ❌ 报错：调用方只能看到前两个签名，不接受 boolean
//              即使实现签名写的是 string | number，但调用方看不到这个
```

#### 规则 2：重载签名要从"最具体"到"最一般"排列

TS 从上往下找匹配，所以**具体的放前面，宽的放后面**：

```ts
// ✅ 对：先具体后宽泛
function find(id: number): User
function find(id: string): User
function find(id: number | string): User { ... }

// ❌ 错：宽泛的写在前面会"吃掉"具体的
function find(id: number | string): User
function find(id: number): User    // 永远走不到这条
function find(id: number | string): User { ... }
```

#### 规则 3：实现签名要"涵盖所有重载签名"

实现签名的参数和返回值必须**兼容所有的重载签名**——它得能处理所有可能的输入：

```ts
function parse(input: string): object
function parse(input: number): string
function parse(input: string | number): object | string {  // ✅ 涵盖了所有情况
  ...
}
```

如果实现签名写得太窄（比如只写 `string`），TS 会立刻报错。

## 六、`this` 参数（重要但易被忽视）

### 6.1 这个特性在解决什么

JS 的 `this` 取决于**调用方式**——同一个函数被不同对象调用，`this` 就指向不同的东西。这经常导致 bug：

```js
const u = {
  name: '老王',
  greet() { console.log(this.name) }
}

u.greet()              // '老王'  ✅ 在 u 身上调用
const g = u.greet      // 把方法"摘出来"
g()                    // undefined（甚至报错）  ❌ this 丢了
```

TS 提供了一种语法，让你**对函数的 `this` 加类型限制**——避免被乱用。

### 6.2 `this` 参数的写法

把 `this` 写成函数的**第一个"伪参数"**（位置在第一位，但实际调用时不传）：

```ts
interface User {
  name: string
  greet(this: User): void   // 声明：调用 greet 时 this 必须是 User
}

const u: User = {
  name: '老王',
  greet() { console.log(this.name) }
}

u.greet()              // ✅ 正常调用，this = u
const g = u.greet
g()                    // ❌ The 'this' context of type 'void' is not assignable to 'User'
```

`this` 这个参数**不算在普通参数里**——TS 看到名字是 `this` 就会特殊处理，调用时不需要也不能显式传它。

### 6.3 使用建议

- 默认情况下 TS 不强制每个函数都标 `this`——开了 `noImplicitThis` 之后会更严格
- 写**类的方法**通常不用手动写 `this`——TS 自动推
- 写**独立函数想限制调用上下文**（比如要求 `this` 必须是 HTMLElement）才会显式写

## 七、数组与元组（比 JS 多一层精度）

JS 的数组很灵活——长度任意、元素类型混乱都行。TS 在这之上给你**两种粒度的描述方式**：

### 7.1 数组：长度不限，所有元素同类型

```ts
const a: number[] = [1, 2, 3]
const b: Array<number> = [1, 2, 3]          // 完全等价于上面，写法不同
```

只读版本——禁止 push/pop/splice 等修改：

```ts
const c: readonly number[] = [1, 2, 3]
c.push(4)                                    // ❌ 'push' does not exist on readonly
```

`number[]` 适合"列表"语义——你不在乎有几个元素、每个元素的位置，只要类型一致。

### 7.2 元组：长度固定，每个位置类型确定

元组（tuple）是 TS 比 JS 多出来的概念——**精确到每个位置类型**的数组：

```ts
const point: [number, number] = [10, 20]    // 必须正好 2 个 number
const pair: [string, number] = ['老王', 30]  // 第 0 位 string，第 1 位 number

const wrong: [number, number] = [10]         // ❌ 长度不对
const wrong2: [string, number] = [30, '老王']  // ❌ 顺序错了
```

#### 标签元组（4.0+，可读性更好）

```ts
type Person = [name: string, age: number]
//             ↑ 名字只是给人看的，不影响类型，但 IDE hover 时更直观
```

#### 可选元素 `?`

```ts
type Pair = [string, number?]
const a: Pair = ['x']           // ✅ 第二个可省略
const b: Pair = ['x', 1]        // ✅
```

#### 剩余元素 `...`

跟函数的剩余参数一个意思——表示"后面任意多个同类型元素"：

```ts
type Cmd = [string, ...string[]]
const c1: Cmd = ['git']                          // ✅
const c2: Cmd = ['git', 'commit', '-m', 'fix']   // ✅

// 剩余元素也能放中间
type Mix = [string, ...number[], boolean]
const m: Mix = ['x', 1, 2, 3, true]              // ✅
```

### 7.3 数组 vs 元组：什么时候用哪个？

```
列表数据（待办、用户、消息）            → number[] / User[] / Message[]
位置有意义的固定结构（坐标、键值对）    → [number, number] / [string, T]
函数的参数列表（用类型把它们描述出来）  → 元组（Phase 5 会大量用到）
React 的 useState 返回值                → 元组：[T, (v: T) => void]
```

元组在配合泛型描述函数参数时（比如内置的 `Parameters<T>`）非常重要，后面阶段会反复用到。

---

## 实战示例：预告一下 `pick`（看不懂没关系）

> ⚠️ 下面这段用到了 `keyof` 和 `Pick`——这俩都是 Phase 4 才系统讲的概念。
> 现在贴出来不是要你看懂，而是让你先**眼熟一下**："原来 TS 能写出这种精确签名的工具函数"。

```ts
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>
  for (const k of keys) out[k] = obj[k]
  return out
}

const u = { id: 1, name: 'a', age: 30 }
const x = pick(u, ['id', 'name'])      // x: { id: number; name: string }
const y = pick(u, ['id', 'foo'])       // ❌ 'foo' 不在 u 的字段里
```

**先理解大意就行**：传一个对象 + 一组字段名，返回一个只包含这些字段的新对象。TS 神奇的地方是：返回值类型**精确到具体字段**——传 `['id', 'name']` 就推出 `{ id: number; name: string }`，传 `['id', 'foo']` 直接报错（因为 u 上没有 foo 字段）。

Phase 4 学完 `keyof` / `extends 约束` / `Pick` 之后回头看这段，会觉得"哦，原来不过如此"。

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
