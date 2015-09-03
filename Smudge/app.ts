class SmudgeData {
    private data: string = "";

    constructor(widthOrBase64?: number | string) {
        if (typeof widthOrBase64 === "number") {
            this.width = widthOrBase64;
        } else if (typeof widthOrBase64 === "string") {
            this.base64 = widthOrBase64;
        }
    }

    get width(): number {
        if (this.data.length < 1) { return 1; }
        return this.data.charCodeAt(0) + 1;
    }

    set width(value: number) {
        if (value < 1) { throw new RangeError("Width must be 1 or more"); }
        if (value > 256) { throw new RangeError("Width must be 256 or less"); }
        this.data = String.fromCharCode(value - 1) + this.data.substring(1);
    }

    get height(): number {
        return Math.max(1, Math.ceil((this.data.length - 1) / this.width));
    }

    valueAt(index: number): number {
        if (this.data.length <= (index + 1)) { return 0; }
        return this.data.charCodeAt(index + 1);;
    }

    rgbAt(index: number): [number, number, number] {
        let val = this.valueAt(index);
        let r = (7 & (val >> 5)) * 36;
        let g = (7 & (val >> 2)) * 36;
        let b = (3 & val) * 85;
        return [r, g, b];
    }

    appendRgb(r: number, g: number, b: number) {
        if (this.data.length === 0) { this.data = "\0"; }
        let val = (r >> 5) << 5;
        val |= (g >> 5) << 2;
        val |= (b >> 6);
        this.data += String.fromCharCode(val);
    }

    get base64(): string {
        return window.btoa(this.data);
    }

    set base64(b64data: string) {
        this.data = window.atob(b64data);
    }
}

class Smudge {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    private element: HTMLElement;
    private image: HTMLImageElement;
    private data: SmudgeData;

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

        element.className = "smudge-container";

        this.width = element.scrollWidth;
        this.height = element.scrollHeight;

        let src = element.dataset["src"];
        if (src) {
            let image = new Image(this.width,this.height);
            image.src = src;
            image.className = "smudge-img";
            element.appendChild(image);
            this.image = image;
        }

        let canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.className = "smudge-canvas";

        element.appendChild(canvas);

        this.ctx = canvas.getContext("2d");

        let previewBase64 = element.dataset["preview"];
        if (previewBase64) {
            this.data = new SmudgeData(previewBase64);
            this.draw();
        }
    }

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

    generate(ssize: number): Smudge {
        if (!this.image.complete) {
            this.info("Image is not yet fully loaded.");
            this.image.onload = () => this.info("Image is now fully loaded.");
            return this;
        }

        let swidth = Math.max(1, Math.floor(Math.sqrt(ssize * this.width / this.height)));
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
                let [r, g, b] = this.getAverageColour(data, imageIndex, cellWidth, cellHeight);
                sdata.appendRgb(r, g, b);
            }
        }

        this.data = sdata;
        return this;
    }

    private getAverageColour(data: number[], imageIndex1: number, cellWidth: number, cellHeight: number): [number, number, number] {
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

    get sbase64() { return this.data ? this.data.base64 : ""; }
    get swidth() { return this.data ? this.data.width : 0; }
    get sheight() { return this.data ? this.data.height : 0; }

    info(text?: string): Smudge {
        var infoDiv = <HTMLDivElement> this.element.getElementsByClassName("smudge-info")[0];
        if (!infoDiv) {
            infoDiv = document.createElement("div");
            infoDiv.className = "smudge-info";
            this.element.appendChild(infoDiv);
        }
        if (text) {
            infoDiv.innerText = text;
        } else if (this.data) {
            infoDiv.innerText = `width=${this.swidth}, height=${this.sheight}, length=${this.sbase64.length}, base64=${this.sbase64}`;
        }
        return this;
    }

    slider(): Smudge {
        var sliderControl = <HTMLInputElement> this.element.getElementsByClassName("smudge-slider")[0];
        if (!sliderControl) {
            sliderControl = document.createElement("input");
            sliderControl.className = "smudge-slider";
            sliderControl.type = "range";
            sliderControl.min = "1";
            sliderControl.max = "500";
            sliderControl.value = "0";
            sliderControl.oninput = () => { this.generate(Number(sliderControl.value)).draw().info(); };
            this.element.appendChild(sliderControl);

            if (this.image.complete) {
                this.info("Slide right to generate a smudge");
            } else {
                this.info("Wait for the image to load, then slide right to generate a smudge");
                this.image.onload = () => { this.info("Slide right to generate a smudge"); }
            }
        }
        return this;
    }
}

window.onload = () => {
    new Smudge("beach").slider();
    new Smudge("ram").slider();
    new Smudge("table").slider();
    new Smudge("yellow").slider();
};