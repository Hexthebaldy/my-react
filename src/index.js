// 示例应用 - 使用我们自己的 React
/** @jsx myReact.createElement */
import myReact from "./myReact.js";

// 我们的组件
function App() {
  return myReact.createElement(
    "div",
    { id: "app" },
    myReact.createElement("h1", null, "Hello, Build Your Own React!"),
    myReact.createElement("p", null, "This is a custom React implementation."),
    myReact.createElement(
      "ul",
      null,
      myReact.createElement("li", null, "Step 0: Review"),
      myReact.createElement("li", null, "Step 1: The createElement Function"),
      myReact.createElement("li", null, "Step 2: The render Function")
    )
  );
}

// 使用 JSX 语法的版本（需要 @jsx 注释）
const element = (
  <div style="background: lightblue; padding: 20px;">
    <h2>Using JSX Syntax!</h2>
    <p>This JSX is transpiled by Babel to use myReact.createElement</p>
  </div>
);

// 渲染应用
const container = document.getElementById("root");
myReact.render(App(), container);
myReact.render(element, container);