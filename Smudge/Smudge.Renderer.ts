/// <reference path="Smudge.Data.ts" />

namespace Smudge {
    const messages = {
        idError: "No element with passed id.",
        typeError: "Pass in an element or an id.",
        imageNotLoaded: "Image is not yet loaded.",
        imageLoaded: "Image is now loaded.",
    };

    export class Renderer {
        protected element: HTMLElement;
        protected ctx: CanvasRenderingContext2D;
        protected width: number;
        protected height: number;
        protected image: HTMLImageElement;
        protected data: Data;

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
        protected checkImageLoaded(loadedCaption?: string, notLoadedCaption: string = messages.imageNotLoaded, onloadCaption: string = messages.imageLoaded): boolean {
            if (!this.image) {
                if (notLoadedCaption) { this.caption(notLoadedCaption); }
                return false;
            }

            this.image.classList.add("smudge-image");

            if (this.image.complete) {
                this.element.classList.add("smudge-image-loaded");
                if (loadedCaption) { this.caption(loadedCaption); }
                return true;
            } else {
                this.element.classList.remove("smudge-image-loaded");
                if (notLoadedCaption) { this.caption(notLoadedCaption); }
                this.image.onload = () => { this.checkImageLoaded(onloadCaption, notLoadedCaption, onloadCaption); }
                return false;
            }
        }

        /**
         * Load the image.
         * @param src Source URL for the image. Leave undefined to use the URL specified in the data-src attribute.
         */
        load(src?: string) {
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
        smudge(b64?: string) {
            if (!b64) { b64 = this.element.dataset["smudge"]; }
            if (!b64) { return this; }

            this.data = new Data(b64);

            return this;
        }

        /**
         * Draw the smudge.
         */
        draw() {
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
         * Set the caption text.
         * @param text Text on the caption.
         */
        caption(text?: string) {
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