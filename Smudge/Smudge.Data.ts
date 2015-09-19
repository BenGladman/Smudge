namespace Smudge {
    export type Colour = [number, number, number];

    export class Data {
        width = 1;
        private quantized = false;
        private palette: number[] = [];
        private data: number[] = [];

        constructor(widthOrBase64?: number | string, quantized?: boolean) {
            if (typeof widthOrBase64 === "number") {
                this.width = widthOrBase64;
            } else if (typeof widthOrBase64 === "string") {
                this.base64 = widthOrBase64;
            }
            this.quantized = quantized;
        }

        /**
         * Height of the smudge.
         */
        get height(): number {
            return Math.max(1, Math.ceil((this.data.length - 1) / this.width));
        }

        /**
         * Get the colour at the index.
         */
        rgbAt(index: number): Colour {
            const val = this.data[index];
            if (this.quantized) {
                const byte = this.palette[val & 15];
                return this.byteToColour(byte);
            } else {
                return this.byteToColour(val);
            }
        }

        /**
         * Function which maps a colour to the index in the palette.
         */
        colourMapper: (colour: Colour) => number = null;

        /**
         * Append the colour as the next value.
         */
        appendRgb(colour: Colour) {
            if (this.colourMapper) {
                const ix = this.colourMapper(colour);
                this.data.push(ix);
            } else if (this.quantized) {
                const byte = this.colourToByte(colour);
                this.data.push(this.palette.indexOf(byte));
            } else {
                const byte = this.colourToByte(colour);
                this.data.push(byte);
            }
        }

        /**
         * Set the palette colours for quantized mode.
         */
        setPalette(colours: Colour[]) {
            let palette: number[] = [];
            colours.forEach((c) => palette.push(this.colourToByte(c)));
            this.palette = palette;
        }
    
        private colourToByte([r, g, b]: Colour): number {
            return ((r >> 5) << 5)
                | ((g >> 5) << 2)
                | (b >> 6);
        }

        private byteToColour(byte: number): Colour {
            const r = (7 & (byte >> 5)) * 36;
            const g = (7 & (byte >> 2)) * 36;
            const b = (3 & byte) * 85;
            return [r, g, b];
        }

        /**
         * Base64 representation of the smudge.
         */
        get base64(): string {
            let dd = "";
            dd += String.fromCharCode(((this.width - 1) & 127) + (this.quantized ? 128 : 0));

            const quantizedColors = this.palette;
            const data = this.data;

            if (this.quantized) {
                for (let i = 0; i < 16; i++) {
                    dd += String.fromCharCode(quantizedColors[i]);
                }
                for (let i = 0, datalen = data.length; i < datalen;) {
                    const n1 = (data[i++] & 15) << 4;
                    const n2 = (data[i++] & 15);
                    dd += String.fromCharCode(n1 + n2);
                }
            } else {
                for (let i = 0, datalen = data.length; i < datalen; i++) {
                    const b1 = data[i] & 255;
                    dd += String.fromCharCode(b1);
                }
            }

            return window.btoa(dd);
        }

        set base64(b64data: string) {
            const dd = window.atob(b64data);
            const quantizedColors: number[] = [];
            const data: number[] = [];

            this.width = (dd.charCodeAt(0) & 127) + 1;
            this.quantized = !!(dd.charCodeAt(0) & 128)

            if (this.quantized) {
                for (let i = 1; i < 17; i++) {
                    quantizedColors.push(dd.charCodeAt(i));
                }
                for (let i = 17, datalen = dd.length; i < datalen; i++) {
                    const b1 = dd.charCodeAt(i);
                    data.push(b1 >> 4);
                    data.push(b1 & 15);
                }
            } else {
                for (let i = 1, datalen = dd.length; i < datalen; i++) {
                    data.push(dd.charCodeAt(i));
                }
            }

            this.palette = quantizedColors;
            this.data = data;
        }
    }
}