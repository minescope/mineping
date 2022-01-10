export default varint;
declare namespace varint {
    function encodeInt(val: number): Buffer;
    function encodeString(val: string): Buffer;
    function encodeUShort(val: number): Buffer;
    function concat(chunks: Buffer[]): Buffer;
    function decodeInt(buffer: Buffer, offset: number): number;
    function decodeString(val: Buffer, offset?: number): string;
    function decodeLength(val: number): 5 | 7 | 8 | 1 | 2 | 3 | 4 | 6 | 9 | 10;
}
