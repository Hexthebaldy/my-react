// 创建自己的 React 实现

/**
 * 创建虚拟 DOM 元素
 * @param {string|Function} type - 元素类型（标签名或组件函数）
 * @param {Object} props - 元素属性
 * @param  {...any} children - 子元素
 * @returns {Object} 虚拟 DOM 对象
 */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child)
      )
    }
  };
}

/**
 * 创建文本类型的虚拟 DOM 元素
 * @param {string} text - 文本内容
 * @returns {Object} 文本类型的虚拟 DOM 对象
 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}

/**
 * 渲染函数 - 将虚拟 DOM 转换为真实 DOM 并添加到容器中
 * @param {Object} element - 虚拟 DOM 元素
 * @param {HTMLElement} container - 真实 DOM 容器
 */
function render(element, container) {
  // 创建真实 DOM 节点
  const dom = element.type === "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(element.type);

  // 处理属性
  const isProperty = key => key !== "children";
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name];
    });

  // 递归渲染子节点
  element.props.children.forEach(child =>
    render(child, dom)
  );

  // 将创建好的节点添加到容器中
  container.appendChild(dom);
}

// 导出我们的 React 实现
const myReact = {
  createElement,
  render
};

export default myReact;