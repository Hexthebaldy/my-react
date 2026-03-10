class MyPromise {
    constructor(executor) {
        this.state = "pending"
        this.value = undefined
        this.reason = undefined

        this.onFulfilledCallbacks = []
        this.onRejectedCallbacks = []

        const resolve = (value) => {
            if (this.state === "pending") {
                this.state = "fulfilled"
                this.value = value
                this.onFulfilledCallbacks.forEach(fn => fn())
            }
        }

        const reject = (reason) => {
            if (this.state === "pending") {
                this.state = "rejected"
                this.reason = reason
                this.onRejectedCallbacks.forEach(fn => fn())
            }
        }

        try {
            executor(resolve, reject)
        } catch (err) {
            reject(err)
        }
    }

    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === "function" ? onFulfilled : v => v
        onRejected = typeof onRejected === "function" ? onRejected : e => { throw e }

        const promise2 = new MyPromise((resolve, reject) => {

            if (this.state === "fulfilled") {
                queueMicrotask(() => {
                    try {
                        const x = onFulfilled(this.value)
                        resolve(x)
                    } catch (err) {
                        reject(err)
                    }
                })
            }

            if (this.state === "rejected") {
                queueMicrotask(() => {
                    try {
                        const x = onRejected(this.reason)
                        resolve(x)
                    } catch (err) {
                        reject(err)
                    }
                })
            }

            if (this.state === "pending") {
                this.onFulfilledCallbacks.push(() => {
                    queueMicrotask(() => {
                        try {
                            const x = onFulfilled(this.value)
                            resolve(x)
                        } catch (err) {
                            reject(err)
                        }
                    })
                })

                this.onRejectedCallbacks.push(() => {
                    queueMicrotask(() => {
                        try {
                            const x = onRejected(this.reason)
                            resolve(x)
                        } catch (err) {
                            reject(err)
                        }
                    })
                })
            }
        })

        return promise2
    }
}

Promise.myAll = function (promises) {

    return new Promise((resolve, reject) => {

        const results = []
        let completed = 0

        if (promises.length === 0) {
            resolve([])
        }

        promises.forEach((p, index) => {

            Promise.resolve(p).then(value => {

                results[index] = value

                completed++

                if (completed === promises.length) {
                    resolve(results)
                }

            }).catch(err => {

                reject(err)

            })

        })

    })

}