class Smudge {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    private element: HTMLElement;
    private image: HTMLImageElement;
    private data: SmudgeData;
    private captionOnload: string;

    constructor(elementOrId: HTMLElement | string) {
        let element: HTMLElement;

        if (typeof elementOrId === "string") {
            element = document.getElementById(elementOrId);
            if (!element) { throw new Error("No element with id " + elementOrId); }
        } else if (elementOrId instanceof HTMLElement) {
            element = elementOrId;
        } else {
            throw new TypeError("Pass in an element or and id");
        }

        this.element = element;

        element.classList.add("smudge-container");

        this.width = element.scrollWidth;
        this.height = element.scrollHeight;

        let src = element.dataset["src"];
        if (src) {
            element.classList.add("smudge-image-loading");

            let image = new Image(this.width, this.height);
            image.src = src;
            image.className = "smudge-image";
            element.appendChild(image);
            this.image = image;

            image.onload = () => {
                element.classList.remove("smudge-image-loading");
                if (this.captionOnload) { this.caption(this.captionOnload); }
            };
        }

        let canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.className = "smudge-canvas";

        element.appendChild(canvas);

        this.ctx = canvas.getContext("2d");

        let b64 = element.dataset["smudge"];
        if (b64) {
            this.data = new SmudgeData(b64);
            this.draw();
        }
    }

    /**
     * Draw the smudge.
     */
    draw(): Smudge {
        if (!this.data) {
            return this;
        }

        let previewData = this.data;
        let previewWidth = previewData.width;
        let previewHeight = previewData.height;

        let ctx = this.ctx;
        let imagedata = ctx.createImageData(previewWidth, previewHeight);
        let previewIndex = 0;
        for (let i = 0, data = imagedata.data, lendata = data.length; i < lendata;) {
            let [r, g, b] = previewData.rgbAt(previewIndex++);
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
     * Generate the smudge.
     * @param swidth Width of the smudge.
     */
    generate(swidth: number): Smudge {
        if (!this.image.complete) {
            this.caption("Image is not yet fully loaded.");
            this.captionOnload = "Image is now fully loaded.";
            return this;
        }

        swidth = Math.max(1, Math.floor(swidth));
        let sheight = Math.max(1, Math.round(swidth * this.height / this.width));
        let sdata = new SmudgeData(swidth);

        this.ctx.drawImage(this.image, 0, 0, this.width, this.height);
        let imagedata = this.ctx.getImageData(0, 0, this.width, this.height);
        let cellWidth = this.width / swidth;
        let cellHeight = this.height / sheight;

        let data = imagedata.data;
        for (let sy = 0; sy < sheight; sy++) {
            for (let sx = 0; sx < swidth; sx++) {
                let imageIndex = (Math.floor(sx * cellWidth) + (Math.floor(sy * cellHeight) * this.width)) * 4;
                let [r, g, b] = this.calcAverageColour(data, imageIndex, cellWidth, cellHeight);
                sdata.appendRgb(r, g, b);
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
    private calcAverageColour(data: number[], imageIndex1: number, cellWidth: number, cellHeight: number): [number, number, number] {
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
    caption(text?: string): Smudge {
        let infoDiv = <HTMLDivElement> this.element.getElementsByClassName("smudge-caption")[0];
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

    /**
     * Base64 representation of the smudge.
     */
    get sbase64() { return this.data ? this.data.base64 : ""; }

    /**
     * Width of the smudge.
     */
    get swidth() { return this.data ? this.data.width : 0; }

    /**
     * Height of the smudge.
     */
    get sheight() { return this.data ? this.data.height : 0; }

    toString(): string {
        return `Smudge(width=${this.swidth}, height=${this.sheight}, length=${this.sbase64.length}, base64=${this.sbase64})`;
    }

    /**
     * Add a slider control to allow the user the generate a smudge.
     * @param min The minimum value of the slider.
     * @param max The maximum value of the slider.
     */
    slider(min?: number, max?: number): Smudge {
        let sliderControl = <HTMLInputElement> this.element.getElementsByClassName("smudge-slider")[0];
        if (!sliderControl) {
            sliderControl = document.createElement("input");
            sliderControl.className = "smudge-slider";
            sliderControl.type = "range";
            sliderControl.step = "1";
            sliderControl.title = "Slide to generate a smudge.";
            this.element.appendChild(sliderControl);

            let oninput = () => {
                let ssize = Number(sliderControl.value);
                this.generate(ssize).draw();
                if (this.data) { this.caption(this.toString()); }
            };
            sliderControl.oninput = oninput;

            if (this.image.complete) {
                this.caption("Slide to generate a smudge.");
            } else {
                this.caption("Wait for the image to load, then slide .to generate a smudge.");
                this.captionOnload = "Slide to generate a smudge.";
            }
        }

        sliderControl.min = min ? min.toString() : "1";
        sliderControl.max = max ? max.toString() : "10";
        sliderControl.value = this.swidth.toString();

        return this;
    }

    /**
     * Set what happens when the pointer hovers over the smudge.
     * @param showSmudgeOnHover Show the smudge image on hover.
     * @param showCaptionOnHover Show the caption and slider on hover.
     */
    hover(showSmudgeOnHover: boolean, showCaptionOnHover: boolean): Smudge {
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