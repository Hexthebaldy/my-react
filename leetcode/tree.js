//bytedance tech interview 2026-03-09
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

const preorderRes = [1, 2, 4, 5, 3];
const inorderRes = [4, 2, 5, 1, 3];

const buildTree = (preorder, inorder) => {
    if (!preorder.length && !inorder.length) return;
    let preorderLeft = [];
    let preorderRight = [];
    let inorderLeft = [];
    let inorderRight = [];

    let root = {
        val: preorder[0],
        left: null,
        right: null,
    }

    for (let i = 0; i < inorder.length; i++) {
        if (inorder[i] === root.val) {
            inorderLeft = inorder.slice(0, i + 1);
            inorderRight = inorder.slice(i, inorder.length - 1);
            break;
        }
    }

    for (let i = 1; i < preorder.length; i++) {
        if (inorderLeft.includes(preorder[i])) {
            preorderLeft = preorder.slice(1, i + 1);
            preorderRight = preorder.slice(i, preorder.length - 1);
        }
    }

    root.left = buildTree(preorderLeft, inorderLeft);
    root.right = buildTree(preorderRight, inorderRight);
    return root;
}
console.log('----------------build tree using preorder&inorder traversal result')
console.log(buildTree(preorderRes, inorderRes));