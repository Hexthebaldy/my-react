export function repeat(s: string, n: number) {
  return Array(n).fill(s).join("");
}

export interface User {
  id: number;
  name: string;
}

export function safeParse(json: string): User | null {
  let data: unknown = JSON.parse(json);
  function isUser(x: unknown): x is User {
    if (
      data instanceof Object &&
      data !== null &&
      "id" in data &&
      typeof data.id === "number" &&
      "name" in data &&
      typeof data.name === "string"
    ) {
      return true;
    }
    return false;
  }
  if (isUser(data)) return data;
  return null;
}

export type Event = 'click' | 'hover' | 'press';

export function handle(e:Event){
    return e;
}

const colors = ['red', 'green', 'blue'] as const
export type Color = typeof colors[number];

let c1:Color = 'red';
// let c2:Color = 'gray';