class HttpConcurrencyScheduler {
    /**
     * @param {object} options
     * @param {number} options.concurrency 同时并发数
     * @param {number} options.timeoutMs 单个请求超时（ms）
     * @param {number} options.retries 失败重试次数
     * @param {(err:any, attempt:number)=>boolean} [options.shouldRetry] 是否重试
     */
    constructor({ concurrency = 5, timeoutMs = 0, retries = 0, shouldRetry } = {}) {
        this.concurrency = Math.max(1, concurrency)
        this.timeoutMs = Math.max(0, timeoutMs)
        this.retries = Math.max(0, retries)
        this.shouldRetry = shouldRetry || (() => true)

        this.queue = []
        this.running = 0
        this.closed = false
        this.controllers = new Set() // 用于 cancelAll
    }

    /**
     * 推入一个任务（返回一个 Promise）
     * task: ({signal}) => Promise<any>
     */
    add(task) {
        if (this.closed) {
            return Promise.reject(new Error("Scheduler is closed"))
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject })
            this._drain()
        })
    }

    /** 关闭调度器：不再接收新任务（已入队的仍会跑） */
    close() {
        this.closed = true
    }

    /** 取消所有正在进行的请求（需要任务内部使用 fetch + signal 才有效） */
    cancelAll(reason = "cancelled") {
        for (const c of this.controllers) c.abort(reason)
        this.controllers.clear()
    }

    _drain() {
        while (this.running < this.concurrency && this.queue.length > 0) {
            const job = this.queue.shift()
            this._runOne(job)
        }
    }

    async _runOne({ task, resolve, reject }) {
        this.running++

        const controller = new AbortController()
        this.controllers.add(controller)

        try {
            const result = await this._withRetryAndTimeout(
                () => task({ signal: controller.signal }),
                controller
            )
            resolve(result)
        } catch (err) {
            reject(err)
        } finally {
            this.controllers.delete(controller)
            this.running--
            this._drain()
        }
    }

    async _withRetryAndTimeout(fn, controller) {
        let attempt = 0
        while (true) {
            try {
                return await this._withTimeout(fn, controller)
            } catch (err) {
                if (attempt >= this.retries) throw err
                if (!this.shouldRetry(err, attempt + 1)) throw err
                attempt++
            }
        }
    }

    _withTimeout(fn, controller) {
        if (!this.timeoutMs) return fn()

        let t
        const timeoutPromise = new Promise((_, reject) => {
            t = setTimeout(() => {
                controller.abort("timeout")
                reject(new Error(`Timeout after ${this.timeoutMs}ms`))
            }, this.timeoutMs)
        })

        return Promise.race([
            (async () => {
                try {
                    return await fn()
                } finally {
                    clearTimeout(t)
                }
            })(),
            timeoutPromise,
        ])
    }
}


