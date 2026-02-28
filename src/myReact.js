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

let nextUnitOfWork = null;
let wipRoot = null;

function workLoop(deadline) {
  // TODO: 你的代码实现
  let shouldStop = false;
  while (!shouldStop && nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);

    if (deadline.timeRemaining() < 1) {
      shouldStop = true
    }
  }

  requestIdleCallback(workLoop);
}

// 启动调度器
requestIdleCallback(workLoop);

// =============== Step 4：Fibers（构建 fiber tree） ===============

// wipRoot：work in progress root（正在构建的 fiber 树根）

/**
 * 任务 3: 实现 render 函数（Step 3）
 * 功能：初始化 fiber 树并启动调度
 */
function render(element, container) {
  // TODO: 你的代码实现
  wipRoot = {
    dom: container,
    props: { children: [element] },
    child: null,
    sibling: null,
    parent: null
  };

  nextUnitOfWork = wipRoot;
}

/**
 * 任务 4: 实现 performUnitOfWork（Step 4）
 * 功能：处理一个 fiber 单元，返回下一个工作单元
 */
function performUnitOfWork(fiber) {
  // TODO: 你的代码实现
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  if (fiber.props.children.length && !fiber.child) {
    let children = fiber.props.children;
    let newFiber = {};
    newFiber.parent = fiber;
    for (let i = 0; i < children.length; i++) {
      let temp = newFiber;
      newFiber = {
        type: children[i].type,
        props: children[i].props,
        parent: fiber,
        sibling: null,
        child: null,
      }
      if (i > 0) {
        temp.sibling = newFiber;
      } else {
        fiber.child = newFiber;
      }
    }
  }

  if (fiber.child) {
    return fiber.child;
  }

  if (fiber.sibling) {
    return fiber.sibling
  }

  let currentFiber = fiber;
  while (!currentFiber.sibling && currentFiber.parent) {
    currentFiber = currentFiber.parent;
  }
  if (currentFiber.sibling) {
    return currentFiber.sibling;
  }

  return null;
}

/**
 * 任务 5: 实现 createDom（Step 4）
 * 功能：为 fiber 创建真实 DOM 节点（但不挂载）
 */
function createDom(fiber) {
  // TODO: 你的代码实现
  let node = fiber.type === "TEXT_ELEMENT" ?
    document.createTextElement("") :
    document.createElement(fiber.type);

  for (let key in fiber.props) {
    if (key !== "children") {
      node[key] = fiber.props[key];
    }
  }
  return node
}

// =============== Step 5：Render & Commit（commit 阶段一次性改 DOM） ===============

/**
 * 任务 6: 实现 commitRoot（Step 5）
 * 功能：提交整棵 fiber 树
 */
function commitRoot() {
  // TODO: 你的代码实现
}

/**
 * 任务 7: 实现 commitWork（Step 5）
 * 功能：递归地把 fiber 对应的 DOM 挂载到页面
 */
function commitWork(fiber) {
  // TODO: 你的代码实现
}

// 导出我们的 React 实现
const myReact = { createElement, render };

export default myReact;