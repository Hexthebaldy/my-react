export class Account {
    id:string;
    balance: number;
    #password:string = '';

    constructor(id:string, balance:number) { this.id = id; this.balance = balance }
    deposit(n:number) { this.balance += n }
}

export abstract class Shape{
    abstract area():number;
    describe(){
        console.log('shape with area X')
    }
}

export class Circle extends Shape {
    r:number
    static PI = 3.14;

    constructor(r:number){
        super();
        this.r = r;
    }

    area():number{
        return Circle.PI * this.r*this.r ;
    }
}

export class Rectangle extends Shape{
    width:number;
    height:number;
    constructor(width:number,height:number){
        super();
        this.width = width;
        this.height = height;
    }

    area():number{
        return this.width*this.height;
    }
}

export function instantiate<T, A extends any[]>(C:new (...args:A)=>T, ...args:A):T{
    return new C(...args);
}

let circleA = instantiate(Circle,3)