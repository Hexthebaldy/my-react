export function getProp<T,K extends keyof T>(obj:T,key:K):T[K]{
    return obj[key];
}

export function isNonEmptyArray<T>(arr:T[]):arr is [T,...T[]]{
    if(arr.length) return true;
    return false;
}

