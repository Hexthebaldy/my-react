export class myPromise {
    constructor(excutor) {
        this.state = "pending";
        this.value = null;
        this.reason = null;
        this.successCallbackList = [];
        this.failCallbackList = [];

        const resolve = (value) => {
            if (this.state !== "pending") return;
            this.state = "fulfilled";
            this.value = value;
            this.successCallbackList.forEach(fn => fn());
        };

        const reject = (value) => {
            if (this.state !== "pending") return;
            this.state = "rejected";
            this.reason = value;
            this.failCallbackList.forEach(fn => fn());
        };

        try {
            excutor(resolve, reject);
        } catch (err) {
            reject(err);
        }
    }

    then(successCallback, failCallback) {
        successCallback = successCallback instanceof Function ? successCallback : val => val;
        failCallback = failCallback instanceof Function ? failCallback : val => { throw val };

        return new myPromise((resolve, reject) => {
            if (this.state === "fulfilled") {
                queueMicrotask(() => {
                    try {
                        const res = successCallback(this.value);
                        resolve(res);
                    } catch (err) {
                        reject(err);
                    }
                });
            }
            if (this.state === "rejected") {
                queueMicrotask(() => {
                    try {
                        const rea = failCallback(this.reason);
                        resolve(rea);
                    } catch (err) {
                        reject(err);
                    }
                });
            }
            if (this.state === "pending") {
                this.successCallbackList.push(() => {
                    queueMicrotask(() => {
                        try {
                            const res = successCallback(this.value);
                            resolve(res);
                        } catch (err) {
                            reject(err);
                        }
                    })
                })
                this.failCallbackList.push(() => {
                    queueMicrotask(() => {
                        try {
                            const rea = failCallback(this.reason);
                            resolve(rea);
                        } catch (err) {
                            reject(err);
                        }
                    })
                })
            }
        })
    };

    catch(failCallback) {
        return this.then(undefined, failCallback);
    };

    finally(cb) {
        return this.then(value => {
            cb();
            return value;
        }, value => {
            cb();
            throw value;
        })
    }

    static all(arr) {
        return new myPromise((resolve, reject) => {
            let res = new Array(arr.length).fill(null);
            let count = 0;
            for (let i = 0; i < arr.length; i++) {
                arr[i].then((val) => {
                    res[i] = val
                    count++;
                    if (count === arr.length) {
                        resolve(res);
                    }
                }, (reason) => {
                    reject(reason);
                })
            }
        })
    }

    static resolve(val) {
        if (val instanceof myPromise) return val;
        return new myPromise((resolve, reject) => {
            resolve(val);
        })
    }

    static reject(rea) {
        return new myPromise((resolve, reject) => {
            reject(rea)
        })
    }

}



















// ========== 测试用例 ==========
// 请先自己分析每一步的输出顺序和值，再运行验证

const p = new myPromise((resolve, reject) => {
    console.log("1");
    setTimeout(() => {
        reject("error_from_p");
    }, 1000);
    console.log("2");
});

p.then(val => {
    console.log("3:", val);
    return "result_a";
}).then(val => {
    console.log("4:", val);
    throw "oops";
}).catch(err => {
    console.log("5:", err);
    return "recovered";
}).then(val => {
    console.log("6:", val);
}).finally(() => {
    console.log("7: finally");
});

p.catch(err => {
    console.log("8:", err);
    return 42;
}).then(val => {
    console.log("9:", val);
});

console.log("10");

//ans: 1, 2, 10, 8: error_from_p, 9: 42, 5:error_from_p, 6: recovered, 7:finally