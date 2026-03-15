// 创建自己的 React 实现
// 目标：从零实现虚拟 DOM 创建和渲染到真实 DOM 的过程

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

function performUnitOfWork(fiber) {
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

function reconcileChildren(wipFiber, elements) {
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

function createDom(fiber) {
  if (!fiber) return;
  let node = fiber.type === "TEXT_ELEMENT" ?
    document.createTextNode("") :
    document.createElement(fiber.type);

  updateDom(node, {}, fiber.props);
  return node
}

function commitRoot() {
  // 先处理需要删除的节点
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;

  let parentFiber = fiber?.parent;
  while (parentFiber && !parentFiber.dom) {
    parentFiber = parentFiber?.parent;
  }
  let parentDom = parentFiber.dom


  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    parentDom.append(fiber.dom);
  }
  if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }
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

const myReact = { createElement, render };

export default myReact;