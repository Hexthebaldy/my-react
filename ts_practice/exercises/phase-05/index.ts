type PartiaL<T> = {[K in keyof T]?:T[K]};
type RequireD<T> = {[K in keyof T]-?: T[K]};
type ReadonlY<T> = {readonly [K in keyof T]:T[K]};
type PicK<T,K extends keyof T> = {[P in K]:T[P]};
type OmiT<T,K extends keyof any> = Pick<T,Exclude<keyof T, K>>;
type RecorD<K extends keyof any,T> = {[P in K]:T};
type ExcludD<T,U> = T extends U ? never : T;
type ExtracT<T,U> = T extends U ? T : never;
type NonNullablE <T> = T extends null|undefined ? never : T
type ParameterS<T extends (...args:any)=>any> = T extends (...args:infer P)=>any ? P:never
type ReturnTypE<T extends (...args:any)=> any> = T extends (...args:any)=> infer P ? P: never
type ConstructorParameterS<T extends abstract new (...args:any)=>any> = T extends new (...args: infer P)=>any ? P: never;
type InstanceTypE<T extends abstract new (...args:any)=>any> = T extends new (...args:any)=> infer R ? R : never; 
type AwaiteD<T> = 
    T extends null | undefined ? T : 
    T extends object & {then(cb: infer F,...args:any):any } ? 
        F extends (args: infer V)=>any ? AwaiteD<V> : never :
    T
    