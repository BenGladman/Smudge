/// <reference path="Smudge.Renderer.ts" />
/// <reference path="Quantize.ts" />
/// <reference path="Quantize.ImageDataAdapter.ts" />

namespace Smudge {
    const messages = {
        quantize: "Slide to quantize.",
        wait: "Wait for the image to load, then slide to quantize.",
    };

    export class Quantizer extends Renderer {
        private maxcolours: number = 0;

        quantize(maxcolours: number): Quantizer {
            if (!this.checkImageLoaded()) {
                return this;
            }

            this.ctx.drawImage(this.image, 0, 0, this.width, this.height);
            const imagedata = this.ctx.getImageData(0, 0, this.width, this.height);

            const ida = new Quantize.ImageDataAdapter(imagedata);
            const cmap = Quantize.quantize(ida, maxcolours);
            if (cmap) {
                ida.apply((c) => cmap.nearest(c));
                this.ctx.putImageData(imagedata, 0, 0);
            }

            return this;
        }

        /**
         * Add a slider control to allow the user the generate a smudge.
         * @param min The minimum value of the slider.
         * @param max The maximum value of the slider.
         */
        slider(): Quantizer {
            let sliderControl = this.element.getElementsByClassName("smudge-slider")[0] as HTMLInputElement;
            if (!sliderControl) {
                sliderControl = document.createElement("input");
                sliderControl.className = "smudge-slider";
                sliderControl.type = "range";
                sliderControl.step = "1";
                sliderControl.min = "2";
                sliderControl.max = "32";
                sliderControl.value = "16";

                sliderControl.title = messages.quantize;
                this.element.appendChild(sliderControl);

                const oninput = () => {
                    if (this.checkImageLoaded(null, messages.wait, messages.quantize)) {
                        this.maxcolours = Number(sliderControl.value);
                        this.quantize(this.maxcolours).draw();
                        this.caption(this.toString());
                    }
                };
                sliderControl.oninput = oninput;

                this.checkImageLoaded(messages.quantize, messages.wait, messages.quantize);
            }

            return this;
        }

        toString(): string {
            return `Quantized(colours=${this.maxcolours})`;
        }
    }
}