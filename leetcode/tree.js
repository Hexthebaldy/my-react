const preorderTraversal = (node) => {
    if (!node) return;
    console.log(node.value);
    preorderTraversal(node.left);
    preorderTraversal(node.right);
}

const inorderTraversal = (node) => {
    if (!node) return;
    inorderTraversal(node.left);
    console.log(node.value);
    inorderTraversal(node.right);
}

const postorderTraversal = (node) => {
    if (!node) return;
    postorderTraversal(node.left);
    postorderTraversal(node.right);
    console.log(node.value);
}

//        1
//       / \
//      2   3
//     / \
//    4   5
const tree = {
    value: 1,
    left: {
        value: 2,
        left: { value: 4, left: null, right: null },
        right: { value: 5, left: null, right: null },
    },
    right: {
        value: 3,
        left: null,
        right: null,
    },
};

console.log("--- preorder (expect: 1 2 4 5 3) ---");
preorderTraversal(tree);

console.log("--- inorder (expect: 4 2 5 1 3) ---");
inorderTraversal(tree);

console.log("--- postorder (expect: 4 5 2 3 1) ---");
postorderTraversal(tree);