global.name = "g"

function createObj1() {
    let name = "co1";

    return function () {
        return {
            name: "f1",
            sayHello() {
                console.log(name);
            }
        }
    };
}

function createObj2() {
    let name = "co2";

    return () => {
        let name = "ex2"
        return {
            name: "f2",
            sayHello: () => {
                console.log(this.name);
            }
        }
    };
}

let excutor1 = createObj1();
let excutor2 = createObj2();

let obj1 = excutor1();
let obj2 = excutor2();

obj1.sayHello = obj2.sayHello;
obj1.sayHello();