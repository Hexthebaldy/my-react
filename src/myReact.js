// 创建自己的 React 实现
// 目标：从零实现虚拟 DOM 创建和渲染到真实 DOM 的过程

/**
 * 任务 1: 实现 createElement 函数
 * 功能：将 JSX 转换为虚拟 DOM 对象（Virtual DOM）
 *
 * 输入：
 * - type: 元素类型（字符串如 "div"，或函数如组件）
 * - props: 属性对象（id, className, style 等）
 * - ...children: 子元素（可以是字符串、数字、其他虚拟 DOM）
 *
 * 输出：
 * 虚拟 DOM 对象，格式示例：
 * {
 *   type: "div",
 *   props: {
 *     id: "app",
 *     children: [
 *       { type: "TEXT_ELEMENT", props: { nodeValue: "Hello", children: [] } },
 *       { type: "p", props: { children: [] } }
 *     ]
 *   }
 * }
 *
 * 注意：
 * - 处理文本节点需要特殊类型 "TEXT_ELEMENT"
 * - 需要创建 createTextElement 辅助函数
 */
function createElement(type, props, ...children) {
  // TODO: 你的代码实现
  let node = {};

  node["type"] = type;
  node["props"] = {
    ...props,
    children: []
  };

  children.forEach(c => {
    if (typeof c !== 'object') {
      node.props.children.push(createTextElement(c));
    } else {
      node.props.children.push(c);
    }
  })

  return node;
}

/**
 * 任务 2: 实现 createTextElement 函数
 * 功能：专门处理文本内容的虚拟 DOM 节点
 *
 * 输入：text 文本字符串
 * 输出：文本类型的虚拟 DOM 对象
 */
function createTextElement(text) {
  // TODO: 你的代码实现
  return {
    "type": "TEXT_ELEMENT",
    "props": {
      "nodeValue": text,
      "children": []
    }
  }
}

/**
 * 任务 3: 实现 render 函数
 * 功能：将虚拟 DOM 转换为真实 DOM 并挂载到容器中
 *
 * 步骤：
 * 1. 根据虚拟 DOM 类型创建真实 DOM 节点（document.createElement 或 document.createTextNode）
 * 2. 处理属性：将虚拟 DOM props 赋值到真实 DOM 上
 * 3. 递归处理所有子节点
 * 4. 将节点添加到容器中
 *
 * 注意：
 * - 需要过滤掉 children 属性（因为它不是 DOM 属性）
 * - 递归渲染是关键
 */
function render(element, container) {
  // TODO: 你的代码实现
}

// 导出我们的 React 实现
const myReact = {
  createElement,
  render
};

export default myReact;