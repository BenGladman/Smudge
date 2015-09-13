namespace Quantize {
    type Colour = [number, number, number];

    /**
     * Adapter class to allow canvas ImageData to be quantized.
     * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
     * Ben Gladman 2015
     */
    export class ImageDataAdapter {
        private pixelData: number[];
        private lendata: number;
        length: number;

        constructor(imageData: ImageData) {
            this.pixelData = imageData.data;
            this.lendata = imageData.data.length;
            this.length = imageData.data.length >> 2;
        }

        forEach(callbackfn: (pixel: Colour, index: number) => void) {
            let pixelIndex = 0;
            for (let i = 0; i < this.lendata;) {
                const pixel: Colour = [
                    this.pixelData[i++], // r
                    this.pixelData[i++], // g
                    this.pixelData[i++] // b
                ];
                i++; // a
                callbackfn(pixel, pixelIndex++);
            }
        }
    }
}