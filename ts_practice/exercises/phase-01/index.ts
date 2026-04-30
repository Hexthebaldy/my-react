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
