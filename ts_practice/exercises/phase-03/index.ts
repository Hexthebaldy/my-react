export class Account {
    id:string;
    balance: number;
    #password:string = '';

    constructor(id:string, balance:number) { this.id = id; this.balance = balance }
    deposit(n:number) { this.balance += n }
}