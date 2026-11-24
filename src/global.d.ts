declare module 'mammoth' {
  export interface Message {
    type: string;
    message: string;
  }
  export interface Result {
    value: string;
    messages: Message[];
  }
  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<Result>;
  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<Result>;
}

declare module '*?url' {
  const src: string;
  export default src;
}
