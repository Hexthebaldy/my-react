export function getProp<T,K extends keyof T>(obj:T,key:K):T[K]{
    return obj[key];
}

export function isNonEmptyArray<T>(arr:T[]):arr is [T,...T[]]{
    if(arr.length) return true;
    return false;
}

export function assertDefined<T>(x:T|null|undefined):asserts x is T{
    if(x == undefined) throw Error("x is null or undefined");
}

export type AsyncState<T,E> = 
    {status:'idle'}
  | {status:'loading'}
  | {status:'success',res:T}
  | {status:'error',err:E}

export type AsyncAction<T,E> = 
    {type:'FETCH'}
  | {type:'SUCCESS',res:T}
  | {type:'ERROR',err:E}
  | {type:'RESET'}

export function reduce<T,E>(s:AsyncState<T,E>,action:AsyncAction<T,E>):AsyncState<T,E>{
    switch (action.type){
        case 'FETCH':
            return {status:'loading'}
        case 'SUCCESS':
            return {status:'success',res: action.res};
        case 'ERROR': 
            return {status:'error',err:action.err}
        case 'RESET':
            return {status:'idle'}
    }
}

export function setState<T,E>(s:AsyncState<T,E>,action:(s:AsyncState<T,E>)=>{}):AsyncState<T,E>{
    action(s);
    return s;
}

export interface User{
    id:number,
    name:string
}

export function isUser(obj:unknown): obj is User{
    if(obj instanceof Object && 'id' in obj && 'name' in obj){
        if(typeof obj.id === 'number' && typeof obj.name === 'string') return true;
    }
    return false
}

