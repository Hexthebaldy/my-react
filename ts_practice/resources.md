# 精选学习资源

> 资源很多，宁缺毋滥。下面每一项都经过筛选，按推荐顺序排列。

## 一、官方文档与权威资料

### 必读
- [TypeScript Handbook（中文版）](https://www.typescriptlang.org/zh/docs/handbook/intro.html) — 必读 #1，质量极高
- [TypeScript Playground](https://www.typescriptlang.org/play) — 永远开着的实验场
- [TS Release Notes](https://devblogs.microsoft.com/typescript/) — 跟进新版本特性

### 进阶
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) — basarat 老哥的开源书，免费
- [Effective TypeScript](https://effectivetypescript.com/) — 62 条最佳实践，纸质书
- [type-fest 源码](https://github.com/sindresorhus/type-fest) — 实战工具类型大全

## 二、教学博客 / 视频（按质量排序）

1. **[Matt Pocock (Total TypeScript)](https://www.totaltypescript.com/)** — 当今最强 TS 教学者，YouTube 频道也有大量免费内容
2. **[Type-Level TypeScript](https://type-level-typescript.com/)** — 专攻类型体操的免费课程
3. **[Josh Goldberg 的视频和书](https://www.joshuakgoldberg.com/)** — TS 团队成员，Learning TypeScript 作者
4. **[Marius Schulz 的博客](https://mariusschulz.com/blog/series/typescript-evolution)** — 每个 TS 特性深度解析

## 三、刷题 / 实战

- **[type-challenges](https://github.com/type-challenges/type-challenges)** — 类型体操圣地，必刷
  - Easy 全做（约 13 道）
  - Medium 至少做 30 道
  - Hard 选着做
- **[exercism TypeScript track](https://exercism.org/tracks/typescript)** — 经典算法题用 TS 实现
- **[ts-reset](https://github.com/total-typescript/ts-reset) 源码** — 优雅类型增强的范本

## 四、生态工具（用一个学一个）

| 工具 | 学习价值 |
|---|---|
| [Zod](https://zod.dev/) | 必学。运行时校验 + 类型推导的标杆 |
| [type-fest](https://github.com/sindresorhus/type-fest) | 必看。大量实用工具类型范例 |
| [ts-pattern](https://github.com/gvergnaud/ts-pattern) | 模式匹配，比 switch 优雅 |
| [tRPC](https://trpc.io/) | 端到端类型安全的范式 |
| [Effect](https://effect.website/) | 函数式 + 类型驱动的下一代 TS 框架 |
| [Drizzle ORM](https://orm.drizzle.team/) | 类型推导极致的 ORM，看它的 d.ts 就是上课 |

## 五、阅读源码（看类型大佬怎么写）

按推荐顺序，从易到难：

1. **lodash 的 d.ts** — 大量重载的范例（在 `@types/lodash`）
2. **zod 源码** — 类型推导从输入到输出的优秀实践
3. **redux-toolkit 源码** — 复杂泛型组合的典范
4. **react-hook-form** — 路径类型 / 字段类型的极致用法
5. **tRPC 源码** — 跨进程类型推导的天花板
6. **Effect 源码** — 类型层 DSL 的极限

## 六、社区与持续学习

- TypeScript GitHub Issues — 看官方对疑难问题的讨论
- [r/typescript](https://www.reddit.com/r/typescript/) — Reddit 上的 TS 社区
- Twitter / X 上关注：`@mattpocockuk`、`@DanielRosenwasser`（TS 项目经理）、`@sebmarkbage`

## 七、参考速查表（手边备一份）

- [TypeScript Cheat Sheets（官方）](https://www.typescriptlang.org/cheatsheets/)
  - 包括 Classes / Interfaces / Types / Control Flow Analysis 四张
- 内置工具类型表：[Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

## 八、避坑指南：不推荐的资源

- 老旧博客（2020 年之前的） — TS 4.x、5.x 迭代太快，老资料容易误导
- 仅讲"加注解"不讲类型推导的教程 — 这种水平和 JS 没区别
- 把 enum 当核心特性教的教程 — 现代 TS 已淡化 enum

---

## 学习节奏建议

- **每周一篇 release note**：跟进 TS 最新进展（每 3 个月一个版本）
- **每周一道 type-challenges**：保持类型体操手感
- **每月一个开源 d.ts**：精读一个库的类型定义
- **每季一个项目**：从零搭建一个类型驱动的小项目

回到主页：[README.md](./README.md)
