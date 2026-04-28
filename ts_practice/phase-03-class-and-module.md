# Phase 3：类、模块与声明文件（Week 3）

> 目标：彻底理解 TS 中"类既是值又是类型"的双重身份；能为第三方 JS 库写 .d.ts

## 知识图谱

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

## 一、类的类型化（JS 类的"加强版"）

```ts
class User {
  readonly id: number               // 只读字段
  name: string
  private password: string          // 编译时私有
  protected role: string            // 子类可访问
  public email: string              // 默认就是 public

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

### 参数属性（constructor 简写）
```ts
class User {
  constructor(
    public readonly id: number,     // 自动声明 + 赋值
    public name: string,
    private password: string,
  ) {}
}
// 等价于上面那个手写版本
```

### `private` vs `#private`
```ts
class A {
  private secret = 1               // TS 编译时检查，运行时仍可访问 a['secret']
  #realSecret = 2                  // ES2022 真私有字段，运行时也访问不了
}
```
现代代码（targets ES2022+）建议用 `#`。

### `abstract` 抽象类
```ts
abstract class Animal {
  abstract speak(): string         // 必须被子类实现
  move() { return 'move' }         // 普通方法
}

class Dog extends Animal {
  speak() { return 'woof' }
}

new Animal()  // ❌ 不能实例化抽象类
```

### `implements` vs `extends`
```ts
interface Named { name: string }
interface Greetable { greet(): string }

// implements：纯契约检查，不带实现
class Person implements Named, Greetable {
  name = ''
  greet() { return 'hi' }
}

// extends：继承实现
class Manager extends Person { }
```

## 二、类的双重身份（重点）

> 类名 `User` 在 TS 中**同时是值和类型**。这是理解很多 d.ts 的关键。

```ts
class User { id = 1 }

const u: User = new User()         // 这里 User 是【实例类型】
const Ctor: typeof User = User     // 这里 typeof User 是【构造器类型】

// 想要构造器类型必须用 typeof
function makeUser(C: typeof User) { return new C() }

// 想要"任何能 new 出 T 的构造器"
type Ctor<T> = new (...args: any[]) => T
function instantiate<T>(C: Ctor<T>): T { return new C() }
```

**`InstanceType` 工具类型**：
```ts
type U = InstanceType<typeof User>   // 等同于 User
```

## 三、模块系统

### import / export
```ts
// utils.ts
export const add = (a: number, b: number) => a + b
export default function sub(a: number, b: number) { return a - b }
export type Pair = [number, number]

// app.ts
import sub, { add, type Pair } from './utils'
```

### `import type` / `export type`（很重要）
```ts
import type { User } from './user'      // 仅类型，编译后整行消失
import { type User } from './user'      // 同上，行内写法
```

**为什么重要**：
- 避免运行时副作用（不会触发模块求值）
- 在 `isolatedModules` 模式下必需（Babel、esbuild、SWC 都依赖）
- 不会和打包器的 tree-shaking 打架

### 模块解析策略
`tsconfig.json` 中的 `moduleResolution` 字段：
- `node` / `node10`：老的 Node 解析（不推荐用于新项目）
- `node16` / `nodenext`：现代 Node 的 ESM/CJS 双模式
- `bundler`：TS 4.7+，专给 Vite/Webpack/esbuild 使用，最宽松（**新项目推荐**）

### 路径别名
```jsonc
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
注意：TS 只做类型层面的别名，运行时还需要打包器支持（vite/webpack/tsx 自动支持）。

## 四、声明文件 `.d.ts`（写 TS 的高阶能力）

声明文件**只描述类型，不包含实现**，用于：
1. 给纯 JS 库加类型
2. 声明全局变量/函数（如 `window.gtag`）
3. 给非代码资源（`.svg`、`.css`）声明类型

### 基础语法
```ts
// jquery.d.ts
declare function $(selector: string): JQuery
declare namespace $ {
  function ajax(opts: AjaxOptions): Promise<unknown>
}

interface JQuery {
  text(s: string): JQuery
  css(prop: string, val: string): JQuery
}
```

### 全局声明
```ts
// global.d.ts
declare global {
  interface Window {
    gtag?: (event: string, action: string, params?: object) => void
  }
}

export {}   // 必须有这行，让文件被当作模块
```

### 模块声明
```ts
// 给一个没类型的库 'tinycolor' 写类型
declare module 'tinycolor' {
  export function parse(s: string): { r: number; g: number; b: number }
  export const VERSION: string
}

// 给静态资源声明类型
declare module '*.svg' {
  const content: string
  export default content
}
```

### 模块扩展（augmentation）
往已有模块加字段，常见于扩展第三方库：
```ts
// 扩展 axios 的请求配置
import 'axios'
declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean
  }
}
```

### 三斜线指令（老语法，了解即可）
```ts
/// <reference types="node" />
/// <reference path="./other.d.ts" />
```
现代项目用 `tsconfig.types` 和 `import type` 替代。

### `@types/*` 与 DefinitelyTyped
- 全社区共享的类型仓库：[DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)
- 装包：`npm i -D @types/lodash`
- 没有官方类型时优先去这里找

---

## 实战：给一个 JS 函数写 d.ts

```js
// math-utils.js (假设没有类型)
function clamp(n, min, max) { return Math.min(Math.max(n, min), max) }
function inRange(n, min, max) { return n >= min && n < max }
module.exports = { clamp, inRange }
```

```ts
// math-utils.d.ts
export function clamp(n: number, min: number, max: number): number
export function inRange(n: number, min: number, max: number): boolean
```

写完后 `import { clamp } from './math-utils'` 就有类型提示了。

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

## 检查清单

- [ ] `private` 和 `#` 字段的本质区别？
- [ ] 类名 `User` 何时是值、何时是类型？
- [ ] `InstanceType<typeof User>` 等价于什么？
- [ ] `import type` 解决了什么问题？
- [ ] `declare module 'xxx'` 和 `declare module '*.svg'` 用法上的区别？
- [ ] 模块扩展（augmentation）何时用？

下一阶段：[Phase 4 — 泛型与类型收窄](./phase-04-generics-and-narrowing.md)
