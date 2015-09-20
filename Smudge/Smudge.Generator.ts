/// <reference path="Smudge.Data.ts" />
/// <reference path="Smudge.Renderer.ts" />
/// <reference path="Quantize.ts" />
/// <reference path="Quantize.ImageDataAdapter.ts" />

namespace Smudge {
    const messages = {
        slide: "Slide to generate a smudge.",
        wait: "Wait for the image to load, then slide to generate a smudge.",
    };

    export class Generator extends Renderer {
        /**
         * Calculate the smudge width for a given total size.
         * @param ssize The total size of the smudge.
         */
        private calcWidthForSize(ssize: number): number {
            return Math.sqrt(ssize * this.width / this.height);
        }

        /**
         * Generate the smudge for the loaded image.
         * @param swidth Width of the smudge.
         */
        generate(swidth: number, quantize?: boolean): Generator {
            if (!this.checkImageLoaded()) {
                return this;
            }

            swidth = Math.max(1, Math.floor(swidth));
            const sheight = Math.max(1, Math.round(swidth * this.height / this.width));
            const sdata = new Data(swidth, quantize);

            this.ctx.drawImage(this.image, 0, 0, this.width, this.height);
            const imagedata = this.ctx.getImageData(0, 0, this.width, this.height);
            const cellWidth = this.width / swidth;
            const cellHeight = this.height / sheight;

            if (quantize) {
                const cmap = Quantize.quantize(new Quantize.ImageDataAdapter(imagedata), 16);
                if (cmap) {
                    sdata.setPalette(cmap.palette());
                    sdata.colourMapper = (c) => cmap.nearestIndex(c);
                }
            }

            const data = imagedata.data;
            for (let sy = 0; sy < sheight; sy++) {
                for (let sx = 0; sx < swidth; sx++) {
                    const imageIndex = (Math.floor(sx * cellWidth) + (Math.floor(sy * cellHeight) * this.width)) * 4;
                    const colour = this.calcAverageColour(data, imageIndex, cellWidth, cellHeight);
                    sdata.appendRgb(colour);
                }
            }

            this.data = sdata;
            return this;
        }

        /**
         * Calculate the average colour of a cell.
         * @param data Pixel data.
         * @param imageIndex1 Index in data of the first pixel in the cell.
         * @param cellWidth Width of the cell in pixels.
         * @param cellHeight Height of the cell in pixels.
         */
        private calcAverageColour(data: number[], imageIndex1: number, cellWidth: number, cellHeight: number): Colour {
            let r = 0, g = 0, b = 0, count = 0;

            for (let j = 0; j < cellHeight; j++) {
                let imageIndex = imageIndex1 + (j * this.width * 4);

                for (let i = 0; i < cellWidth; i++) {
                    count++;
                    r += data[imageIndex++];
                    g += data[imageIndex++];
                    b += data[imageIndex++];
                    imageIndex++;
                }
            }

            return [(r / count), (g / count), (b / count)];
        }

        /**
         * Add a slider control to allow the user the generate a smudge.
         * @param min The minimum value of the slider.
         * @param max The maximum value of the slider.
        */
        slider(min?: number, max?: number, quantize?: boolean): Generator {
            let sliderControl = this.element.getElementsByClassName("smudge-slider")[0] as HTMLInputElement;
            if (!sliderControl) {
                sliderControl = document.createElement("input");
                sliderControl.className = "smudge-slider";
                sliderControl.type = "range";
                sliderControl.step = "1";
                sliderControl.title = messages.slide;
                this.element.appendChild(sliderControl);

                const oninput = () => {
                    if (this.checkImageLoaded(null, messages.wait, messages.slide)) {
                        const ssize = Number(sliderControl.value);
                        this.generate(ssize, quantize).draw();
                        this.caption(this.toString());
                    }
                };
                sliderControl.oninput = oninput;

                this.checkImageLoaded(messages.slide, messages.wait, messages.slide);
            }

            sliderControl.min = min ? min.toString() : "1";
            sliderControl.max = max ? max.toString() : "10";
            sliderControl.value = this.data ? this.data.width.toString() : "0";

            return this;
        }
    }
}