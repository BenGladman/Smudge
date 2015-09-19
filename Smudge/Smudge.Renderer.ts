/// <reference path="Smudge.Data.ts" />
/// <reference path="Quantize.ts" />
/// <reference path="Quantize.ImageDataAdapter.ts" />

namespace Smudge {
    const messages = {
        imageNotLoaded: "Image is not yet loaded.",
        imageLoaded: "Image is now loaded.",
        generate: "Slide to generate a smudge.",
        generateWait: "Wait for the image to load, then slide to generate a smudge.",
        idError: "No element with passed id.",
        typeError: "Pass in an element or an id.",
    };

    export class Renderer {
        private ctx: CanvasRenderingContext2D;
        private width: number;
        private height: number;
        private element: HTMLElement;
        private image: HTMLImageElement;
        private data: Data;

        constructor(elementOrId: HTMLElement | string) {
            let element: HTMLElement;

            if (typeof elementOrId === "string") {
                element = document.getElementById(elementOrId);
                if (!element) { throw new Error(messages.idError); }
            } else if (elementOrId instanceof HTMLElement) {
                element = elementOrId;
            } else {
                throw new TypeError(messages.typeError);
            }

            this.element = element;

            element.classList.add("smudge-container");

            this.image = this.element.getElementsByTagName("img")[0];
            this.checkImageLoaded();

            this.width = element.scrollWidth;
            this.height = element.scrollHeight;

            const canvas = document.createElement("canvas");
            canvas.width = this.width;
            canvas.height = this.height;
            canvas.className = "smudge-canvas";

            element.appendChild(canvas);

            this.ctx = canvas.getContext("2d");

            this.smudge();
        }

        /**
         * Check if the image is loaded. Set or unset the "loading" class. Set a caption based on the loaded status.
         * @param loadedCaption The caption to display if the image has loaded.
         * @param notLoadedCaption The caption to display if the image has not loaded.
         * @param onloadCaption The caption to display after the image has loaded.
         */
        private checkImageLoaded(loadedCaption?: string, notLoadedCaption?: string, onloadCaption?: string): boolean {
            if (!this.image) {
                if (notLoadedCaption) { this.caption(notLoadedCaption); }
                return false;
            }

            this.image.classList.add("smudge-image");

            if (this.image.complete) {
                this.element.classList.remove("smudge-image-loading");
                if (loadedCaption) { this.caption(loadedCaption); }
                return true;
            } else {
                this.element.classList.add("smudge-image-loading");
                if (notLoadedCaption) { this.caption(notLoadedCaption); }
                this.image.onload = () => { this.checkImageLoaded(onloadCaption, notLoadedCaption, onloadCaption); }
                return false;
            }
        }

        /**
         * Load the image.
         * @param src Source URL for the image. Leave undefined to use the URL specified in the data-src attribute.
         */
        load(src?: string): Renderer {
            if (!src) { src = this.element.dataset["src"]; }
            if (!src) { return this; }

            var image = this.image;

            if (!image) {
                image = new Image(this.width, this.height);
                image.className = "smudge-image";
                this.element.appendChild(image);
                this.image = image;
            }

            if (src != image.src) {
                image.src = src;
                this.checkImageLoaded();
            }

            return this;
        }

        /**
         * Set the smudge data.
         * @param b64 Base64 representation of the smudge. Leave undefined to use the data specified in the data-smudge attribute.
         */
        smudge(b64?: string): Renderer {
            if (!b64) { b64 = this.element.dataset["smudge"]; }
            if (!b64) { return this; }

            this.data = new Data(b64);

            return this;
        }

        /**
         * Draw the smudge.
         */
        draw(): Renderer {
            if (!this.data) {
                return this;
            }

            const previewData = this.data;
            const previewWidth = previewData.width;
            const previewHeight = previewData.height;

            const ctx = this.ctx;
            const imagedata = ctx.createImageData(previewWidth, previewHeight);
            const data = imagedata.data;
            const lendata = data.length;
            for (let i = 0, previewIndex = 0; i < lendata;) {
                const [r, g, b] = previewData.rgbAt(previewIndex++);
                data[i++] = r;
                data[i++] = g;
                data[i++] = b;
                data[i++] = 255;
            }
            ctx.putImageData(imagedata, 0, 0);
            ctx.drawImage(ctx.canvas, 0, 0, previewWidth, previewHeight, 0, 0, this.width, this.height);

            return this;
        }

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
        generate(swidth: number, quantize?: boolean): Renderer {
            if (!this.checkImageLoaded(null, messages.imageNotLoaded, messages.imageLoaded)) {
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
         * Set the caption text.
         * @param text Text on the caption.
         */
        caption(text?: string): Renderer {
            let infoDiv = this.element.getElementsByClassName("smudge-caption")[0] as HTMLDivElement;
            if (text) {
                if (!infoDiv) {
                    infoDiv = document.createElement("div");
                    infoDiv.className = "smudge-caption";
                    this.element.appendChild(infoDiv);
                }
                infoDiv.innerText = text;
            } else {
                if (infoDiv) {
                    infoDiv.remove();
                }
            }

            return this;
        }

        toString(): string {
            return this.data ?
                `Smudge(width=${this.data.width}, height=${this.data.height}, length=${this.data.base64.length}, base64=${this.data.base64})`
                :
                "Smudge(empty)";
        }

        /**
         * Add a slider control to allow the user the generate a smudge.
         * @param min The minimum value of the slider.
         * @param max The maximum value of the slider.
         */
        slider(min?: number, max?: number, quantize?: boolean): Renderer {
            let sliderControl = <HTMLInputElement> this.element.getElementsByClassName("smudge-slider")[0];
            if (!sliderControl) {
                sliderControl = document.createElement("input");
                sliderControl.className = "smudge-slider";
                sliderControl.type = "range";
                sliderControl.step = "1";
                sliderControl.title = messages.generate;
                this.element.appendChild(sliderControl);

                const oninput = () => {
                    if (this.checkImageLoaded(null, messages.generateWait, messages.generate)) {
                        const ssize = Number(sliderControl.value);
                        this.generate(ssize, quantize).draw();
                        this.caption(this.toString());
                    }
                };
                sliderControl.oninput = oninput;

                this.checkImageLoaded(messages.generate, messages.generateWait, messages.generate);
            }

            sliderControl.min = min ? min.toString() : "1";
            sliderControl.max = max ? max.toString() : "10";
            sliderControl.value = this.data ? this.data.width.toString() : "0";

            return this;
        }

        /**
         * Set what happens when the pointer hovers over the smudge.
         * @param showSmudgeOnHover Show the smudge image on hover.
         * @param showCaptionOnHover Show the caption and slider on hover.
         */
        hover(showSmudgeOnHover: boolean, showCaptionOnHover: boolean): Renderer {
            if (showSmudgeOnHover) {
                this.element.classList.add("smudge-hover");
            } else {
                this.element.classList.remove("smudge-hover");
            }

            if (showCaptionOnHover) {
                this.element.classList.add("smudge-hover-caption");
            } else {
                this.element.classList.remove("smudge-hover-caption");
            }

            return this;
        }
    }
}