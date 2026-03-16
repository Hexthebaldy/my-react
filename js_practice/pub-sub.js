class EventBus {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    emit(eventName, ...args) {
        if (!this.events[eventName]) {
            return
        }
        const cbs = this.events[eventName];
        cbs.forEach(cb => cb(...args))
    }

    off(eventName, callback) {
        if (!this.events[eventName]) return;
        if (!callback) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }
}