let g = function* (){
    const id1 = yield 1;
    const id2 = yield 2+id1;
    yield 3;
}()

console.log(g.next());
console.log(g.next(2));
console.log(g.next());
console.log(g.next());

