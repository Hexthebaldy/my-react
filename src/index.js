// 示例应用 - 使用我们自己的 React
// 目标：使用 myReact 构建一个简单的应用来测试功能

/** @jsx myReact.createElement */
import myReact from "./myReact.js";

/**
 * 任务 1：创建一个简单的函数组件
 * 功能：返回一个包含标题、段落和列表的虚拟 DOM 结构
 *
 * 可以使用：
 * - 原始 JS 方式：myReact.createElement()
 * - JSX 方式（需要上面的 @jsx 注释）
 *
 * 建议步骤：
 * 1. 先用 createElement 方式实现一个简单 div
 * 2. 测试成功后，尝试使用 JSX 语法
 * 3. 添加更多元素（h1, p, ul, li 等）
 */
function App() {
  // TODO: 你的代码实现
  // 提示：先实现一个简单的 div
}

/**
 * 任务 2（可选）：使用 JSX 语法创建元素
 * 功能：练习 JSX 转译是否正常工作
 *
 * 只有当任务 1 成功后，再尝试这个任务
 */
// const jsxElement = (
//   // TODO: 你的 JSX 代码
// );

/**
 * 任务 3：获取 DOM 容器并渲染应用
 * 功能：将虚拟 DOM 渲染到真实页面
 *
 * 提示：
 * - 使用 document.getElementById() 获取 root 容器
 * - 使用 myReact.render() 方法
 * - 传入你的组件和容器
 */
function mountApp() {
  // TODO: 你的代码实现
}

// 启动应用
mountApp();


let p1 = "Using original js to create dom tree";
let p2 = "I'm too old school ...";
let element = myReact.createElement("div", { id: "114514_beast_senpai" }, p1, p2);

let root = document.getElementById("root");
myReact.render(element, root);