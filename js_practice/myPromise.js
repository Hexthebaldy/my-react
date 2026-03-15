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
                    try {
                        const res = successCallback(this.value);
                        resolve(res);
                    } catch (err) {
                        reject(err);
                    }
                })
                this.failCallbackList.push(() => {
                    try {
                        const rea = failCallback(this.reason);
                        resolve(rea);
                    } catch (err) {
                        reject(err);
                    }
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
}