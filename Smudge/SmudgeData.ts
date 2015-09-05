class SmudgeData {
    private data: string = "";

    constructor(widthOrBase64?: number | string) {
        if (typeof widthOrBase64 === "number") {
            this.width = widthOrBase64;
        } else if (typeof widthOrBase64 === "string") {
            this.base64 = widthOrBase64;
        }
    }

    /**
     * Width of the smudge.
     */
    get width(): number {
        if (this.data.length < 1) { return 1; }
        return this.data.charCodeAt(0) + 1;
    }

    set width(value: number) {
        if (value < 1) { throw new RangeError("Width must be 1 or more"); }
        if (value > 256) { throw new RangeError("Width must be 256 or less"); }
        this.data = String.fromCharCode(value - 1) + this.data.substring(1);
    }

    /**
     * Height of the smudge.
     */
    get height(): number {
        return Math.max(1, Math.ceil((this.data.length - 1) / this.width));
    }

    /**
     * Get the value at the index.
     */
    private valueAt(index: number): number {
        if (this.data.length <= (index + 1)) { return 0; }
        return this.data.charCodeAt(index + 1);;
    }

    /**
     * Get the colour at the index.
     */
    rgbAt(index: number): [number, number, number] {
        let val = this.valueAt(index);
        let r = (7 & (val >> 5)) * 36;
        let g = (7 & (val >> 2)) * 36;
        let b = (3 & val) * 85;
        return [r, g, b];
    }

    /**
     * Append the colour as the next value.
     */
    appendRgb(r: number, g: number, b: number) {
        if (this.data.length === 0) { this.data = "\0"; }
        let val = (r >> 5) << 5;
        val |= (g >> 5) << 2;
        val |= (b >> 6);
        this.data += String.fromCharCode(val);
    }

    /**
     * Base64 representation of the smudge.
     */
    get base64(): string {
        return window.btoa(this.data);
    }

    set base64(b64data: string) {
        this.data = window.atob(b64data);
    }
}