export class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }

  off(event: string, listener: Function) {
    this.events[event] = (this.events[event] || []).filter((l) => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    (this.events[event] || []).forEach((listener) => listener(...args));
  }
}
