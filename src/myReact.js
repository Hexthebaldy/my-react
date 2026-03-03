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
 *
 * ============ Step 6 改造：支持 Function Component ============
 *
 * 核心变化：判断 fiber.type 是否为函数，分发到不同的处理逻辑
 *
 *   if (fiber.type instanceof Function) {
 *     updateFunctionComponent(fiber)
 *   } else {
 *     updateHostComponent(fiber)
 *   }
 *
 * - updateHostComponent: 原来的逻辑（创建 DOM + reconcile props.children）
 * - updateFunctionComponent: 调用函数获取 children，再 reconcile
 *
 * 其余返回下一个工作单元的逻辑不变。
 */
function performUnitOfWork(fiber) {
  // TODO Step 6: 根据 fiber.type 是否为函数，分发到不同处理函数
  if (!fiber) return;
  if (fiber.type instanceof Function) {
    fiber.props.children = [fiber.type(fiber.props)];
  } else if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  if (fiber.props.children.length) {
    reconcileChildren(fiber, fiber.props.children);
  }
  if (fiber.child) {
    return fiber.child;
  } else if (fiber.sibling) {
    return fiber.sibling;
  }

  while (fiber && !fiber.sibling) {
    fiber = fiber?.parent
  }
  return fiber?.sibling;
}

// =============== Step 6：Function Components ===============

/**
 * 任务 11: 实现 updateFunctionComponent
 * 功能：处理函数组件类型的 fiber
 *
 * 函数组件与普通 DOM 元素的两个关键区别：
 *   1. 函数组件的 fiber 没有 DOM 节点（不需要 createDom）
 *   2. children 来自于【调用函数】而非 props.children
 *
 * 实现步骤：
 *   1. 调用 fiber.type(fiber.props) 执行函数组件，得到返回的子元素
 *   2. 将返回值包装成数组 [children]
 *   3. 调用 reconcileChildren(fiber, children) 进行协调
 *
 * 示例：
 *   function App(props) { return <h1>Hi {props.name}</h1> }
 *   // fiber.type 就是 App 函数
 *   // fiber.type(fiber.props) 返回 h1 元素
 */
// function updateFunctionComponent(fiber) {
//   // TODO: 你的代码实现
// }

/**
 * 任务 12: 实现 updateHostComponent
 * 功能：处理普通 DOM 元素类型的 fiber（从 performUnitOfWork 中提取出来）
 *
 * 逻辑与之前一致：
 *   1. 如果 fiber 没有 dom，调用 createDom 创建
 *   2. 调用 reconcileChildren(fiber, fiber.props.children)
 */
// function updateHostComponent(fiber) {
//   // TODO: 你的代码实现
// }

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
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;

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

  updateDom(node, {}, fiber.props);
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

  /**
   * ============ Step 6 改造点 1：查找父 DOM 节点 ============
   *
   * 问题：函数组件的 fiber 没有 dom，所以 fiber.parent.dom 可能为 null
   * 解决：向上遍历 fiber 树，直到找到一个有 dom 的祖先节点
   *
   * 原来：let parentDom = fiber.parent.dom
   * 改为：
   *   let domParentFiber = fiber.parent
   *   while (!domParentFiber.dom) {
   *     domParentFiber = domParentFiber.parent
   *   }
   *   let parentDom = domParentFiber.dom
   */
  let parentFiber = fiber?.parent;
  while (parentFiber && !parentFiber.dom) {
    parentFiber = parentFiber?.parent;
  }
  let parentDom = parentFiber.dom


  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    // Step 6 注意：函数组件 fiber 没有 dom，需要加 fiber.dom != null 守卫
    parentDom.append(fiber.dom);
  }
  if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }

  /**
   * ============ Step 6 改造点 2：删除节点 ============
   *
   * 问题：函数组件 fiber 自身没有 dom，直接 removeChild 会失败
   * 解决：递归向下找到第一个有 dom 的子 fiber，再删除它
   *
   * 原来：parentDom.removeChild(fiber.dom)
   * 改为：调用 commitDeletion(fiber, parentDom)
   *
   * 任务 13: 实现 commitDeletion(fiber, domParent)
   *   if (fiber.dom) {
   *     domParent.removeChild(fiber.dom)
   *   } else {
   *     commitDeletion(fiber.child, domParent)
   *   }
   */
  if (fiber.effectTag === "DELETION") {
    let q = fiber;
    if (!q.dom) {
      while (q && !q.dom) {
        q = q.child;
      }
    }
    parentDom.removeChild(q.dom);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * 任务 13: 实现 commitDeletion
 * 功能：递归查找有真实 DOM 的子节点并删除
 *
 * 为什么需要这个函数？
 * 当删除一个函数组件时，该 fiber 没有 dom 属性，
 * 需要一直往 child 方向找，直到找到一个有 dom 的 fiber，然后删除它。
 */
// function commitDeletion(fiber, domParent) {
//   // TODO: 你的代码实现
// }

// 导出我们的 React 实现
const myReact = { createElement, render };

export default myReact;