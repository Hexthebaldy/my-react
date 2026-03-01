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
let currentRoot = null; // 上一次提交到 DOM 的 fiber 树（用于 reconciliation 对比）
let deletions = null;   // 需要删除的旧 fiber 列表

function workLoop(deadline) {
  // TODO: 你的代码实现
  let shouldStop = false;
  while (!shouldStop && nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);

    if (deadline.timeRemaining() < 1) {
      shouldStop = true
    }
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
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
  wipRoot = {
    dom: container,
    props: { children: [element] },
    child: null,
    sibling: null,
    parent: null,
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

/**
 * 任务 4: 实现 performUnitOfWork（Step 4）
 * 功能：处理一个 fiber 单元，返回下一个工作单元
 */
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  if (fiber.props.children.length) {
    reconcileChildren(fiber, fiber.props.children);
  }
  if (fiber.child) {
    return fiber.child;
  }
  if (fiber.sibling) {
    return fiber.sibling;
  }

  let cur = fiber;
  while (!cur.sibling && cur.parent) {
    cur = cur.parent;
  }
  return cur.sibling;
}

// =============== Step 6：Reconciliation（新旧 fiber 对比） ===============

/**
 * 任务 8: 实现 reconcileChildren 函数
 * 功能：对比新的 children 和旧的 fiber 树，决定如何更新 DOM
 *
 * 核心逻辑：同时遍历【新 children 数组】和【旧 fiber 链表（通过 oldFiber.sibling）】
 * 对每一对 (newChild, oldFiber) 进行比较：
 *
 *   情况 1: type 相同 → UPDATE（复用旧 DOM，只更新 props）
 *     - 新 fiber 的 dom 复用 oldFiber.dom
 *     - 新 fiber 的 alternate 指向 oldFiber
 *     - 设置 effectTag = "UPDATE"
 *
 *   情况 2: type 不同 且 有新元素 → PLACEMENT（需要创建新 DOM）
 *     - 新 fiber 的 dom 为 null（之后由 performUnitOfWork 创建）
 *     - 设置 effectTag = "PLACEMENT"
 *
 *   情况 3: type 不同 且 有旧 fiber → DELETION（需要删除旧 DOM）
 *     - 给 oldFiber 设置 effectTag = "DELETION"
 *     - 将 oldFiber 加入 deletions 数组
 *
 * 输入：
 *   - wipFiber: 当前正在处理的 fiber 节点
 *   - elements: 该节点的新 children 数组
 *
 * 遍历方式：
 *   - 新 children 通过数组索引 i 遍历
 *   - 旧 fiber 通过 oldFiber = oldFiber.sibling 遍历
 *   - 第一个旧子 fiber 从 wipFiber.alternate?.child 获取
 *
 * 构建新 fiber 树的方式和之前一样：
 *   - 第一个子 fiber → wipFiber.child = newFiber
 *   - 后续子 fiber → prevSibling.sibling = newFiber
 */
function reconcileChildren(wipFiber, elements) {
  // TODO: 你的代码实现
  let oldFiber = null;
  if (wipFiber.alternate) {
    oldFiber = wipFiber.alternate.child;
  }

  let index = 0;
  let prevSibling = null;

  while (oldFiber || index < elements.length) {
    let element = elements[index];
    let sameType = element && oldFiber && element.type === oldFiber.type;
    let newFiber = null;

    if (sameType) {
      newFiber = {
        dom: oldFiber?.dom,
        type: oldFiber?.type,
        props: element?.props,
        child: null,
        sibling: null,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE"
      }
    }
    if (!sameType && element) {
      newFiber = {
        type: element.type,
        props: element.props,
        child: null,
        sibling: null,
        parent: wipFiber,
        effectTag: "PLACEMENT"
      }
    }

    if (!sameType && oldFiber) {
      deletions.push(oldFiber);
      oldFiber["effectTag"] = "DELETION"
    }

    if (!index) {
      prevSibling = newFiber;
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    index++;
    oldFiber = oldFiber?.sibling
  }
}

/**
 * 任务 9: 修改 commitWork 函数
 * 功能：根据 fiber 的 effectTag 决定如何操作 DOM
 *
 * 需要处理三种 effectTag：
 *
 *   "PLACEMENT" → 新增节点
 *     - fiber.parent.dom.appendChild(fiber.dom)
 *
 *   "DELETION" → 删除节点
 *     - fiber.parent.dom.removeChild(fiber.dom)
 *     - 删除后直接 return，不需要递归子节点
 *
 *   "UPDATE" → 更新节点属性
 *     - 调用 updateDom(fiber.dom, fiber.alternate.props, fiber.props)
 *
 * 注意：没有 effectTag 的 fiber 不需要操作 DOM
 */

/**
 * 任务 10: 实现 updateDom 函数
 * 功能：对比旧 props 和新 props，更新真实 DOM 上的属性
 *
 * 需要处理的情况：
 *   1. 删除旧属性：旧 props 中有，新 props 中没有的属性 → 从 DOM 移除
 *   2. 添加/更新属性：新 props 中有，且值与旧 props 不同的属性 → 设置到 DOM
 *   3. 事件处理（以 "on" 开头的属性，如 onClick）：
 *      - 移除旧事件监听器
 *      - 添加新事件监听器
 *      - 事件名需要转换：onClick → click（去掉 "on" 前缀并小写）
 *   4. 跳过 children 属性（不是 DOM 属性）
 *
 * 输入：
 *   - dom: 真实 DOM 节点
 *   - prevProps: 旧的 props
 *   - nextProps: 新的 props
 */
function updateDom(dom, prevProps, nextProps) {
  const isEvent = key => key.startsWith("on");
  const isProperty = key => key !== "children" && !isEvent(key);

  // 删除旧事件监听器
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || prevProps[key] !== nextProps[key])
    .forEach(key => {
      const eventType = key.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[key]);
    });

  // 删除旧属性（新 props 中已不存在的）
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(key => !(key in nextProps))
    .forEach(key => {
      dom[key] = "";
    });

  // 添加/更新新属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(key => prevProps[key] !== nextProps[key])
    .forEach(key => {
      dom[key] = nextProps[key];
    });

  // 添加新事件监听器
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(key => prevProps[key] !== nextProps[key])
    .forEach(key => {
      const eventType = key.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[key]);
    });
}

/**
 * 任务 5: 实现 createDom（Step 4）
 * 功能：为 fiber 创建真实 DOM 节点（但不挂载）
 */
function createDom(fiber) {
  if (!fiber) return;
  // TODO: 你的代码实现
  let node = fiber.type === "TEXT_ELEMENT" ?
    document.createTextNode("") :
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
  // 先处理需要删除的节点
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * 任务 7: 实现 commitWork（Step 5）
 * 功能：递归地把 fiber 对应的 DOM 挂载到页面
 */
function commitWork(fiber) {
  // TODO: 你的代码实现
  if (!fiber) return;
  let parentDom = null
  if (fiber.parent) {
    parentDom = fiber.parent.dom;
  }

  if (fiber.effectTag === "PLACEMENT") {
    parentDom.append(fiber.dom);
  }
  if (fiber.effectTag === "UPDATE") {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }
  if (fiber.effectTag === "DELETION") {
    parentDom.removeChild(fiber.dom);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

// 导出我们的 React 实现
const myReact = { createElement, render };

export default myReact;