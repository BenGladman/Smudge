/// <reference path="Quantize.CommonTypes.ts" />

/*! 
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */

namespace Quantize {
    // private constants
    const sigbits = 5;
    const rshift = 8 - sigbits;

    // get reduced-space color index for a pixel
    function getColorIndex(r: number, g: number, b: number) {
        return (r << (2 * sigbits)) + (g << sigbits) + b;
    }

    // 3d color space box
    export class VBox {
        [index: string]: any;
        r1: number;
        r2: number;
        g1: number;
        g2: number;
        b1: number;
        b2: number;
        private histo: number[];

        constructor(r1: number, r2: number, g1: number, g2: number, b1: number, b2: number, histo: number[]) {
            this.r1 = r1;
            this.r2 = r2;
            this.g1 = g1;
            this.g2 = g2;
            this.b1 = b1;
            this.b2 = b2;
            this.histo = histo;
        }

        private _volume: number;

        volume(force?: boolean) {
            const vbox = this;
            if (!vbox._volume || force) {
                vbox._volume = ((vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1));
            }
            return vbox._volume;
        }

        private _count: number;
        private _count_set: boolean;

        count(force?: boolean) {
            const vbox = this;
            const histo = vbox.histo;

            if (!vbox._count_set || force) {
                let npix = 0, index: number;
                for (let i = vbox.r1; i <= vbox.r2; i++) {
                    for (let j = vbox.g1; j <= vbox.g2; j++) {
                        for (let k = vbox.b1; k <= vbox.b2; k++) {
                            index = getColorIndex(i, j, k);
                            npix += (histo[index] || 0);
                        }
                    }
                }
                vbox._count = npix;
                vbox._count_set = true;
            }
            return vbox._count;
        }

        copy() {
            const vbox = this;
            return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
        }

        private _avg: Color;

        avg(force?: boolean) {
            const vbox = this;
            const histo = vbox.histo;
            if (!vbox._avg || force) {
                let ntot = 0;
                const mult = 1 << (8 - sigbits);
                let rsum = 0, gsum = 0, bsum = 0;
                for (let i = vbox.r1; i <= vbox.r2; i++) {
                    for (let j = vbox.g1; j <= vbox.g2; j++) {
                        for (let k = vbox.b1; k <= vbox.b2; k++) {
                            const histoindex = getColorIndex(i, j, k);
                            const hval = histo[histoindex] || 0;
                            ntot += hval;
                            rsum += (hval * (i + 0.5) * mult);
                            gsum += (hval * (j + 0.5) * mult);
                            bsum += (hval * (k + 0.5) * mult);
                        }
                    }
                }
                if (ntot) {
                    vbox._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
                } else {
                    console.log('empty box');
                    vbox._avg = [
                        ~~(mult * (vbox.r1 + vbox.r2 + 1) / 2),
                        ~~(mult * (vbox.g1 + vbox.g2 + 1) / 2),
                        ~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)
                    ];
                }
            }
            return vbox._avg;
        }

        contains(pixel: Color) {
            const vbox = this;
            const rval = pixel[0] >> rshift;
            const gval = pixel[1] >> rshift;
            const bval = pixel[2] >> rshift;
            return (rval >= vbox.r1 && rval <= vbox.r2 &&
                gval >= vbox.g1 && gval <= vbox.g2 &&
                bval >= vbox.b1 && bval <= vbox.b2);
        }

        // histo (1-d array, giving the number of pixels in
        // each quantized region of color space), or null on error
        static getHisto(pixels: ColorArray): number[] {
            const histosize = 1 << (3 * sigbits);
            const histo: number[] = new Array(histosize);

            pixels.forEach((pixel) => {
                const rval = pixel[0] >> rshift;
                const gval = pixel[1] >> rshift;
                const bval = pixel[2] >> rshift;
                const index = getColorIndex(rval, gval, bval);
                histo[index] = (histo[index] || 0) + 1;
            });
            return histo;
        }

        static fromPixels(pixels: ColorArray, histo: number[]) {
            let rmin = 1000000, rmax = 0;
            let gmin = 1000000, gmax = 0;
            let bmin = 1000000, bmax = 0;
            // find min/max
            pixels.forEach((pixel) => {
                const rval = pixel[0] >> rshift;
                const gval = pixel[1] >> rshift;
                const bval = pixel[2] >> rshift;
                if (rval < rmin) rmin = rval;
                else if (rval > rmax) rmax = rval;
                if (gval < gmin) gmin = gval;
                else if (gval > gmax) gmax = gval;
                if (bval < bmin) bmin = bval;
                else if (bval > bmax) bmax = bval;
            });
            return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
        }

        medianCutApply(histo: number[]) {
            const vbox = this;
            if (!vbox.count()) return;

            // only one pixel, no split
            if (vbox.count() == 1) {
                return [vbox.copy()]
            }

            const rw = vbox.r2 - vbox.r1 + 1;
            const gw = vbox.g2 - vbox.g1 + 1;
            const bw = vbox.b2 - vbox.b1 + 1;
            const maxw = Math.max(rw, gw, bw);

            /* Find the partial sum arrays along the selected axis. */
            let total = 0,
                partialsum: number[] = [],
                lookaheadsum: number[] = [];
            if (maxw == rw) {
                for (let i = vbox.r1; i <= vbox.r2; i++) {
                    let sum = 0;
                    for (let j = vbox.g1; j <= vbox.g2; j++) {
                        for (let k = vbox.b1; k <= vbox.b2; k++) {
                            const index = getColorIndex(i, j, k);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            }
            else if (maxw == gw) {
                for (let i = vbox.g1; i <= vbox.g2; i++) {
                    let sum = 0;
                    for (let j = vbox.r1; j <= vbox.r2; j++) {
                        for (let k = vbox.b1; k <= vbox.b2; k++) {
                            const index = getColorIndex(j, i, k);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            }
            else {  /* maxw == bw */
                for (let i = vbox.b1; i <= vbox.b2; i++) {
                    let sum = 0;
                    for (let j = vbox.r1; j <= vbox.r2; j++) {
                        for (let k = vbox.g1; k <= vbox.g2; k++) {
                            const index = getColorIndex(j, k, i);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            }

            partialsum.forEach((d, i) => {
                lookaheadsum[i] = total - d
            });

            const doCut = (color: string) => {
                const dim1 = color + '1';
                const dim2 = color + '2';
                let left: number, right: number;
                let vbox1: VBox, vbox2: VBox;
                let d2: number, count2 = 0;

                for (let i = vbox[dim1]; i <= vbox[dim2]; i++) {
                    if (partialsum[i] > total / 2) {
                        vbox1 = vbox.copy();
                        vbox2 = vbox.copy();
                        left = i - vbox[dim1];
                        right = vbox[dim2] - i;
                        if (left <= right) {
                            d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
                        } else {
                            d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                        }
                        // avoid 0-count boxes
                        while (!partialsum[d2]) { d2++; }
                        count2 = lookaheadsum[d2];
                        while (!count2 && partialsum[d2 - 1]) { count2 = lookaheadsum[--d2]; }
                        // set dimensions
                        vbox1[dim2] = d2;
                        vbox2[dim1] = vbox1[dim2] + 1;
                        console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
                        return [vbox1, vbox2];
                    }
                }

            }
            // determine the cut planes
            return maxw == rw ? doCut('r') :
                maxw == gw ? doCut('g') :
                    doCut('b');
        }
    }
}