# Phase 3：类、模块与声明文件（Week 3）

> **本阶段目标**：
> 1. 把 JS 的类升级成 TS 的类，理解访问修饰符、抽象类、`implements`
> 2. **彻底搞懂"类既是值又是类型"这件事** —— 这是 TS 里最容易卡住的点之一
> 3. 学会写 `.d.ts` 文件，给没有类型的 JS 库补类型

---

## 知识图谱（先扫一眼，不需要全懂）

```
类与模块
├── 类的类型化
│   ├── 字段、构造器、方法的类型
│   ├── 访问修饰符 public / private / protected
│   ├── readonly 字段
│   ├── 参数属性（constructor 简写）
│   ├── # 私有字段（运行时真私有） vs private（编译时）
│   ├── abstract 抽象类
│   ├── implements vs extends
│   └── 静态成员、static blocks
├── 类作为类型
│   ├── 类名既是值也是类型
│   ├── 类的实例类型 vs 构造器类型
│   └── InstanceType<typeof Cls>
├── 模块系统
│   ├── ES Module 类型导入导出
│   ├── import type / export type（仅类型导入，编译后消失）
│   ├── 模块解析策略 (node / classic / bundler / nodenext)
│   ├── allowSyntheticDefaultImports / esModuleInterop
│   └── 路径别名 paths
└── 声明文件 .d.ts
    ├── declare var / function / class / namespace / module
    ├── 三斜线指令 /// <reference />
    ├── 全局声明 declare global
    ├── 模块扩展 module augmentation
    └── DefinitelyTyped (@types/*)
```

---

## 一、类的类型化（JS 类的"加强版"）

JS 的 `class` 已经能用，TS 在它基础上加了**类型标注** + **访问控制** + **几个语法糖**。

### 1.1 完整示例（先看长什么样）

```ts
class User {
  readonly id: number               // 只读字段，赋值后不能改
  name: string
  private password: string          // 编译时私有：只有 User 内部能访问
  protected role: string            // 子类可访问，外部不可
  public email: string              // 默认就是 public，写不写都一样

  constructor(id: number, name: string, password: string) {
    this.id = id
    this.name = name
    this.password = password
    this.role = 'user'
    this.email = ''
  }

  changePassword(newP: string): void {
    this.password = newP
  }
}
```

### 1.2 三个访问修饰符

| 修饰符 | 谁能访问 | 类比现实 |
|---|---|---|
| `public`（默认） | 任何人 | 大门敞开 |
| `protected` | 自己 + 子类 | 家族内部 |
| `private` | 仅自己 | 上锁的抽屉 |

```ts
class Animal {
  public name = ''
  protected age = 0
  private secret = 'xxx'
}

class Dog extends Animal {
  bark() {
    this.name      // ✅ public 能访问
    this.age       // ✅ protected 子类能访问
    this.secret    // ❌ private 子类也不能访问
  }
}

const d = new Dog()
d.name             // ✅
d.age              // ❌ protected 外部不能
d.secret           // ❌ private 外部更不能
```

### 1.3 `readonly` 字段

加了 `readonly` 后，**只能在构造函数里赋值**，之后再改就报错：

```ts
class User {
  readonly id: number
  constructor(id: number) {
    this.id = id     // ✅ 构造函数里能赋
  }
}

const u = new User(1)
u.id = 2             // ❌ Cannot assign to 'id' because it is read-only
```

适合用在"创建后不应该变"的字段上，比如 ID、创建时间。

### 1.4 参数属性（constructor 简写）

每次都要写 "声明字段 → 构造函数参数 → 在构造函数里赋值" 这三步太啰嗦。TS 提供一个语法糖：**直接在构造函数参数前加修饰符**，三步合一步：

```ts
// 啰嗦版
class User {
  public readonly id: number
  public name: string
  private password: string

  constructor(id: number, name: string, password: string) {
    this.id = id
    this.name = name
    this.password = password
  }
}

// 简写版（完全等价）
class User {
  constructor(
    public readonly id: number,     // = 声明 readonly id + this.id = id
    public name: string,            // = 声明 name + this.name = name
    private password: string,       // = 声明 private password + this.password = password
  ) {}
}
```

> ⚠️ **必须有修饰符**才会触发简写。如果只写 `constructor(id: number)`，那 `id` 只是个普通参数，**不会**变成实例字段。

### 1.5 `private` vs `#private` —— 编译时 vs 运行时

这是个**容易踩的坑**，TS 有两种"私有"，行为完全不同：

```ts
class A {
  private secret = 1               // TS 的 private（编译时检查）
  #realSecret = 2                  // ES2022 的 # 字段（运行时真私有）
}

const a = new A()

// private 的"私有"只是 TS 在编译时检查：
a.secret              // ❌ TS 报错
;(a as any).secret    // ✅ 但用 as any 就能绕过，运行时真的能拿到
a['secret']           // ✅ 老版本 TS 还能这样绕

// # 字段是 JS 引擎层面的真私有：
a.#realSecret                  // ❌ 编译时报错
;(a as any).#realSecret        // ❌ 语法都过不了，as any 救不了
```

**记忆口诀**：
- `private` = **君子协定**（TS 帮你盯着，但运行时拦不住）
- `#field` = **物理锁**（JS 引擎真的不让你访问）

**新项目（target ES2022+）建议优先用 `#`**，封装更牢靠。

### 1.6 `abstract` 抽象类

抽象类 = **只能当父类、不能直接 new 的类**。它的存在是为了**强制子类实现某些方法**。

```ts
abstract class Animal {
  abstract speak(): string         // 抽象方法：只有签名，没有实现
                                   // 任何子类必须实现它
  move() { return 'move' }         // 普通方法：有实现，子类直接继承
}

class Dog extends Animal {
  speak() { return 'woof' }        // ✅ 必须实现 speak
}

new Animal()  // ❌ Cannot create an instance of an abstract class
new Dog()     // ✅
```

如果子类没把所有抽象方法都实现，那子类自己也得是 abstract：

```ts
abstract class Animal {
  abstract speak(): string
  abstract eat(): void
}

abstract class Mammal extends Animal {  // 还是 abstract
  speak() { return 'sound' }
  // eat 没实现 → Mammal 还是抽象的，不能 new
}

class Dog extends Mammal {
  eat() { console.log('eating') }       // 把剩下的补齐 → Dog 是具体类
}
```

> 💡 和 Java/C# 的 `abstract` 几乎一样，区别仅在于：TS 的 `abstract` 关键字编译后会消失，运行时不存在"抽象"概念，只是 `tsc` 编译期帮你拦住。

### 1.7 `implements` vs `extends` —— 完全不同的两件事

名字相近，但做的事**完全不同**：

| | `extends` | `implements` |
|---|---|---|
| 含义 | "我**是**父类的一种" | "我**符合**这个规格" |
| 给你什么 | 父类的代码（字段+方法）全部继承 | **什么都不给**，只是检查你写得对不对 |
| 数量 | 只能 extends 1 个类 | 可以 implements 多个接口 |
| 类比 | 继承家产 | 通过 ISO 认证 |

#### `extends`：白嫖父类代码

```ts
class Animal {
  name = ''
  move() { return `${this.name} is moving` }
}

class Dog extends Animal {
  // 啥都没写，但 name 和 move() 已经有了
}

const d = new Dog()
d.name = 'Rex'
d.move()  // 'Rex is moving' ← 来自父类
```

#### `implements`：只是签字保证

```ts
interface Named { name: string }
interface Greetable { greet(): string }

class Person implements Named, Greetable {
  // implements 不会送你任何代码
  // 你必须自己写出 name 和 greet()，否则报错
  name = ''
  greet() { return 'hi' }
}

// 反例：implements 但没实现
class BadPerson implements Named {
  // ❌ Class 'BadPerson' incorrectly implements interface 'Named'.
  //    Property 'name' is missing
}
```

#### 可以一起用

```ts
interface Loggable { log(): void }

class Animal {
  name = ''
  move() {}
}

class Dog extends Animal implements Loggable {
  //    ↑ 继承父类代码    ↑ 承诺实现 Loggable 接口

  log() { console.log(this.name) }   // implements 要求的，自己写
  // name 和 move 来自 Animal，不用写
}
```

**顺序固定**：`extends` 在前，`implements` 在后。

> 💡 **跟 Java 的细微区别**：Java 的接口检查是**名义性**的（必须显式 `implements` 才算），TS 是**结构性**的（长得像就算，`implements` 只是给自己加保险）。所以 TS 里就算不写 `implements`，只要类的结构匹配，照样能当那个接口用。

### 1.8 静态成员

`static` 修饰的成员属于**类本身**，不属于实例：

```ts
class MathUtil {
  static PI = 3.14
  static square(n: number) { return n * n }
}

MathUtil.PI            // ✅ 直接通过类访问
MathUtil.square(3)     // ✅

const m = new MathUtil()
m.PI                   // ❌ 实例上没有
```

适合放工具函数、常量、计数器等"和具体实例无关"的东西。

---

## 二、类的双重身份（**本阶段最重点**）

> 这一节如果搞懂了，你就能看懂 90% 的 `.d.ts` 文件。请慢慢读。

### 2.1 一个名字，两种身份

写下这一行代码：

```ts
class User {
  id = 1
}
```

你**同时得到了两样东西**，名字都叫 `User`：

#### 身份 A：**值** —— 那个构造函数本身（运行时真实存在）

```ts
console.log(User)         // [class User]  ← 它就是个 JS 函数对象
const Ctor = User         // 可以把"类"赋值给变量传来传去
new Ctor()                // 能用它 new 出实例
```

#### 身份 B：**类型** —— 实例的形状（编译后消失）

```ts
const u: User = new User()
//        ↑ 这里的 User 不是上面那个值，而是"类型"
//          意思是 "u 的类型是 User 实例的形状"，即 { id: number }
```

### 2.2 怎么区分什么时候是值、什么时候是类型？

**位置决定身份**：

| 位置 | 身份 |
|---|---|
| 冒号 `:` 后面 | 类型 |
| `<>` 泛型尖括号里 | 类型 |
| `as` 后面 | 类型 |
| `extends` / `implements` 后面 | 类型 |
| 其他所有地方 | 值 |

```ts
const a = User              // 值位置 → User 是构造函数
const b: User = ???         // 类型位置 → User 是实例类型
const c = new User()        // 值位置 → 调用构造函数
function f(x: User) {}      // 类型位置 → x 是实例类型
class Sub extends User {}   // 类型位置（其实也兼具值的身份）
```

### 2.3 为什么需要 `typeof User`？—— 一个具体场景

假设你想写一个函数，**接收"User 这个类本身"作为参数**（不是接收一个 user 实例）：

```ts
function makeUser(C: User) {  // ❌ 错的
  return new C()
}
```

为啥错？因为冒号后面是**类型位置**，这里的 `User` 表示"User 实例的形状"，也就是 `{ id: number }`。一个 `{ id: number }` 对象当然不能 `new`。

正确写法：

```ts
function makeUser(C: typeof User) {  // ✅ 对
  return new C()
}

makeUser(User)  // 把 User 这个类（值）传进去
```

**`typeof User` 是什么意思？**

> 把"那个值 `User`"从值的世界带到类型的世界。
>
> 得到的类型是"User 这个构造函数本身的类型"，包含构造签名 `new () => User实例` 和所有静态成员。

### 2.4 两个平行宇宙图示

```
   值的宇宙（运行时真实存在）          类型的宇宙（编译后消失）
   ─────────────────────              ─────────────────────
   User（构造函数对象）   ──typeof──>  typeof User（构造器类型）
                                              │
                                          InstanceType
                                              │
                                              ▼
   new User()  ─────────────────────────►  User（实例类型）
   （运行时 new 出实例）                    （描述实例形状）
```

- **`typeof X`**：从"值"跳到"类型"
- **`InstanceType<T>`**：从"构造器类型"拿到"实例类型"
- **`new X()`**：在值的世界里造出实例

### 2.5 通用版："任何能 new 出 T 的构造器"

`typeof User` 只接受 User 这一个具体的类。如果你想写一个**通用工厂**，接受**任何能 new 出某种东西的类**，要这样写：

```ts
// 这个类型表示："任何接受任意参数、能 new 出 T 的构造函数"
type Ctor<T> = new (...args: any[]) => T

function instantiate<T>(C: Ctor<T>): T {
  return new C()
}

// 用起来
class Dog { bark() { return 'woof' } }
class Cat { meow() { return 'meow' } }

const d = instantiate(Dog)   // d 的类型自动推断为 Dog
const c = instantiate(Cat)   // c 的类型自动推断为 Cat
d.bark()  // ✅
c.meow()  // ✅
```

`Ctor<T>` 比 `typeof XX` 更灵活：它不绑定到任何具体的类，**只要"长得像构造函数"就行**。

### 2.6 `InstanceType` 工具类型

```ts
class User { id = 1 }

type U = InstanceType<typeof User>   // 等同于 User（实例类型）
```

它的作用是**反向操作**：给我一个构造器类型，告诉我它 new 出来的实例长什么样。

**实际用途**：当你只能拿到"构造器类型"（比如某个库返回了一个类），想知道它的实例类型时：

```ts
function getUserClass() {
  return User       // 返回类本身（值）
}

type C = ReturnType<typeof getUserClass>    // typeof User（构造器类型）
type I = InstanceType<C>                    // User（实例类型）
```

### 2.7 一句话记忆

> **`class User` = 一个值（构造函数）+ 一个类型（实例形状），共用同一个名字。**
>
> **想从值跳到类型用 `typeof`，想从构造器类型拿到实例类型用 `InstanceType`。**

---

## 三、模块系统

### 3.1 import / export 基本用法

```ts
// utils.ts
export const add = (a: number, b: number) => a + b              // 命名导出
export default function sub(a: number, b: number) { return a - b }  // 默认导出
export type Pair = [number, number]                             // 类型导出

// app.ts
import sub, { add, type Pair } from './utils'
//     ↑      ↑          ↑
//     默认  命名      行内 type 关键字（仅类型）
```

### 3.2 `import type` / `export type`（**很重要，新手最容易忽略**）

#### 长什么样

```ts
import type { User } from './user'      // 整行只导入类型，编译后整行消失
import { type User } from './user'      // 同上效果，行内写法
```

#### 为什么重要

**对比一下编译产物**：

```ts
// 写法 1：普通 import
import { User } from './user'
const u: User = ...
```

编译成 JS 后：

```js
import { User } from './user'   // ← 这一行还在！哪怕你只用了类型
const u = ...
```

**问题**：这一行 `import` 真的会执行 `./user.ts`，触发它里面的代码（顶层 `console.log`、注册副作用等）。

```ts
// 写法 2：import type
import type { User } from './user'
const u: User = ...
```

编译成 JS 后：

```js
// ← 整行没了！
const u = ...
```

`import type` 明确告诉编译器："我**只要类型**，不要在运行时执行这个文件"，编译时直接擦除。

#### 三个具体好处

1. **避免运行时副作用**：不会触发被导入模块的求值
2. **`isolatedModules` 模式必需**：Babel/esbuild/SWC 这些"单文件编译"的工具没法跨文件分析"哪个 import 只用作类型"，所以你必须用 `import type` 显式标记
3. **不会和打包器的 tree-shaking 打架**：明确的"仅类型"标记让打包器能更准确地剔除死代码

**经验法则**：**只要这个 import 只用在类型位置，就用 `import type`。** 现代 ESLint 规则（`@typescript-eslint/consistent-type-imports`）可以自动帮你修。

### 3.3 模块解析策略

`tsconfig.json` 里的 `moduleResolution` 字段告诉 TS **怎么找** `import` 的文件。

| 值 | 用途 | 推荐场景 |
|---|---|---|
| `node` / `node10` | 老的 Node CommonJS 解析 | 老项目，不推荐用于新项目 |
| `node16` / `nodenext` | 现代 Node，区分 ESM/CJS | 纯 Node 项目（如 CLI 工具） |
| `bundler` | TS 4.7+ 引入，最宽松 | **新项目首选**（Vite/Webpack/esbuild）|

**怎么选？**
- 浏览器项目（用 Vite/Webpack）→ `bundler`
- Node 服务/CLI → `nodenext`
- 维护老项目 → 跟原来保持一致就行

### 3.4 路径别名 `paths`

把又长又丑的相对路径变短：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

这样就能这样写：

```ts
// 之前：
import { format } from '../../../utils/date'
// 之后：
import { format } from '@utils/date'
```

> ⚠️ **注意**：TS 的 `paths` **只在类型层面有效**。运行时还需要打包器支持：
> - Vite / Webpack / Next.js / tsx → 自动支持
> - 直接用 Node 跑 `.js` → 不支持，得自己处理（用 `tsc-alias` 或类似工具）

---

## 四、声明文件 `.d.ts`（写 TS 的高阶能力）

### 4.1 这是什么、为什么需要它

`.d.ts` 文件**只描述类型，不包含任何实现**。用途有三个：

1. **给纯 JS 库加类型**：很多老库用 JS 写的，没有自带类型，你装上后 TS 会报"找不到类型声明"。这时你（或社区）写一个 `.d.ts` 描述它的 API。
2. **声明全局变量/函数**：比如你在 HTML 里加了 `<script src="gtag.js">`，window 上多了 `gtag` 函数，TS 不知道它存在。
3. **给非代码资源加类型**：`import logo from './logo.svg'` 默认 TS 不知道 svg 是什么类型。

### 4.2 基础语法：用 `declare` 描述存在的东西

```ts
// jquery.d.ts
declare function $(selector: string): JQuery
//       ↑ declare 表示"运行时已经有这个函数了，我只是声明它的类型"

declare namespace $ {
  function ajax(opts: AjaxOptions): Promise<unknown>
}

interface JQuery {
  text(s: string): JQuery
  css(prop: string, val: string): JQuery
}
```

`declare` 关键字的意思是：**"这个东西在运行时已经存在了（来自外部 JS、全局变量、HTML script 等），我现在只是告诉 TS 它的类型是什么。"**

### 4.3 全局声明 `declare global`

往全局对象（比如 `window`）上加东西：

```ts
// global.d.ts
declare global {
  interface Window {
    gtag?: (event: string, action: string, params?: object) => void
  }
}

export {}   // ⚠️ 必须有这一行！
```

**为什么需要 `export {}`？**

TS 判断一个文件是"脚本"还是"模块"的规则：**有任何 import/export 就是模块，没有就是脚本**。

- 脚本里写 `interface Window`：直接合并到全局，但不能用 `declare global`
- 模块里写 `interface Window`：默认是模块内部的局部 interface，不影响全局

`declare global { ... }` 这个语法**只能在模块里用**。所以加一个空的 `export {}` 把文件强制变成模块，里面再用 `declare global` 把声明"穿透"回全局。

### 4.4 模块声明 `declare module`

#### 用法 1：给一个没类型的库补类型

```ts
// 给 'tinycolor' 这个库补类型
declare module 'tinycolor' {
  export function parse(s: string): { r: number; g: number; b: number }
  export const VERSION: string
}
```

之后 `import tc from 'tinycolor'` 就有类型提示了。

#### 用法 2：给静态资源声明类型

```ts
// 让 TS 知道 import xx from './xx.svg' 返回字符串
declare module '*.svg' {
  const content: string
  export default content
}
```

`*.svg` 是通配符，匹配所有 svg 文件。CSS、图片、字体都可以这么处理。

### 4.5 模块扩展（augmentation）—— 给已有模块加东西

这是 TS 一个**很强的能力**：你可以**往别人写好的模块里加字段**。

典型场景：你给 axios 加了一个自定义配置项 `skipAuth`，但 axios 的类型定义里没有这个字段，TS 会报错。解决方案：

```ts
// axios-augment.d.ts
import 'axios'                          // ⚠️ 必须先 import 一下"激活"这个模块

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean                  // 加进去
  }
}
```

之后 `axios.get(url, { skipAuth: true })` 就不报错了。

**原理**：TS 的 `interface` 有"声明合并"特性，多次声明同一个 interface 会自动合并。这里我们利用这个特性，往 axios 内部的 `AxiosRequestConfig` interface 里"塞"了一个新字段。

**模块扩展常见场景**：
- 扩展 `Vue` 的实例属性（`this.$xxx`）
- 扩展 `express` 的 `Request` 对象（`req.user`）
- 给第三方库的配置对象加字段

### 4.6 三斜线指令（老语法，了解即可）

```ts
/// <reference types="node" />
/// <reference path="./other.d.ts" />
```

这是 TS 早期（模块系统不完善时）引入其他声明的方式。**现代项目用 `tsconfig` 的 `types` 字段和 `import type` 替代**，看到了认得出就行。

### 4.7 `@types/*` 与 DefinitelyTyped

很多库没有自带类型，但社区在 [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) 仓库里维护了类型定义。

**怎么用**：

```bash
npm i lodash             # 装库本身
npm i -D @types/lodash   # 装社区维护的类型
```

之后 `import _ from 'lodash'` 就有完整类型提示了。

**经验**：装一个库后如果 TS 报"找不到声明"，先去 npm 搜 `@types/库名` 试试。

---

## 实战：给一个 JS 函数库写 d.ts

```js
// math-utils.js（假设这是个老库，没有类型）
function clamp(n, min, max) { return Math.min(Math.max(n, min), max) }
function inRange(n, min, max) { return n >= min && n < max }
module.exports = { clamp, inRange }
```

```ts
// math-utils.d.ts
export function clamp(n: number, min: number, max: number): number
export function inRange(n: number, min: number, max: number): boolean
```

写完后 `import { clamp } from './math-utils'` 就有完整类型提示和检查了。

---

## 必做练习（Phase 3）

### Exercise 3.1 — 类的类型化
重写下面的 JS 类为 TS 版，要求：
- `id` 只读
- `password` 真正运行时私有（用 `#`）
- 用参数属性简化 constructor

```js
class Account {
  constructor(id, balance) { this.id = id; this.balance = balance }
  deposit(n) { this.balance += n }
}
```

### Exercise 3.2 — 抽象类
设计一个 `Shape` 抽象类，包含 `abstract area(): number` 和具体的 `describe()` 方法（输出类似 "shape with area X"）。再实现 `Circle` 和 `Rectangle`。

### Exercise 3.3 — 类作为类型
写一个泛型工厂函数 `instantiate<T>(C: new () => T): T`。然后给它一个变体支持构造参数。

### Exercise 3.4 — 写 d.ts
为一个 JS 库写声明文件：
```js
// counter.js
function createCounter(start) {
  let n = start
  return { inc: () => ++n, dec: () => --n, value: () => n }
}
module.exports = createCounter
```

### Exercise 3.5 — 模块扩展
扩展全局 `Window`，加一个可选的 `__APP_VERSION__: string`。

### Exercise 3.6 — `import type` 实战
找一个项目中只用作类型的导入，把它改成 `import type`，观察编译产物是否变化。

---

## 检查清单（学完应该能回答）

- [ ] `private` 和 `#` 字段的本质区别？哪个是"君子协定"，哪个是"物理锁"？
- [ ] `extends` 和 `implements` 各做什么？为什么 `implements` "什么都不送"？
- [ ] 类名 `User` 何时是值、何时是类型？怎么区分？
- [ ] `typeof User` 和 `User` 在类型位置时分别表示什么？
- [ ] `InstanceType<typeof User>` 等价于什么？什么时候会用到？
- [ ] `import type` 解决了什么问题？编译后会发生什么变化？
- [ ] `declare module 'xxx'` 和 `declare module '*.svg'` 用法上的区别？
- [ ] 模块扩展（augmentation）的原理是什么？为什么要先 `import 'axios'`？
- [ ] 写 `declare global` 时为什么要加 `export {}`？

下一阶段：[Phase 4 — 泛型与类型收窄](./phase-04-generics-and-narrowing.md)
