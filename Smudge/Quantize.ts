/// <reference path="Quantize.PQueue.ts" />
/// <reference path="Quantize.VBox.ts" />

/*! 
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */

namespace Quantize {
    /**
     * Basic Javascript port of the MMCQ (modified median cut quantization)
     * algorithm from the Leptonica library (http://www.leptonica.com/).
     * Returns a color map you can use to map original pixels to the reduced
     * palette. Still a work in progress.
     * 
     * @author Nick Rabinowitz
     * @example
    
    // array of pixels as [R,G,B] arrays
    var myPixels = [[190,197,190], [202,204,200], [207,214,210], [211,214,211], [205,207,207]
                    // etc
                    ];
    var maxColors = 4;
    
    var cmap = Quantize.quantize(myPixels, maxColors);
    var newPalette = cmap.palette();
    var newPixels = myPixels.map(function(p) { 
        return cmap.map(p); 
    });
     
     */

    // private constants
    const maxIterations = 1000;
    const fractByPopulations = 0.75;

    export function quantize(pixels: ColorArray, maxcolors: number): CMap {
        // short-circuit
        if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
            console.log('wrong number of maxcolors');
            return null;
        }
        
        const histo = VBox.getHisto(pixels);
        
        // get the beginning vbox from the colors
        const vbox = VBox.fromPixels(pixels, histo);
        const pq = new PQueue<VBox>((a, b) => { return a.count() - b.count() });
        pq.push(vbox);
        
        // inner function to do the iteration
        function iter(lh: PQueue<VBox>, target: number) {
            let ncolors = 1;
            let niters = 0;

            while (niters < maxIterations) {
                let vbox = lh.pop();

                if (!vbox.count()) { /* just put it back */
                    lh.push(vbox);
                    niters++;
                    continue;
                }
                // do the cut
                const vboxes = vbox.medianCutApply(histo);
                const vbox1 = vboxes[0];
                const vbox2 = vboxes[1];

                if (!vbox1) {
                    console.log("vbox1 not defined; shouldn't happen!");
                    return;
                }
                lh.push(vbox1);
                if (vbox2) {  /* vbox2 can be null */
                    lh.push(vbox2);
                    ncolors++;
                }
                if (ncolors >= target) return;
                if (niters++ > maxIterations) {
                    console.log("infinite loop; perhaps too few pixels!");
                    return;
                }
            }
        }
        
        // first set of colors, sorted by population
        iter(pq, fractByPopulations * maxcolors);
        // console.log(pq.size(), pq.debug().length, pq.debug().slice());
        
        // Re-sort by the product of pixel occupancy times the size in color space.
        const pq2 = new PQueue<VBox>((a, b) => {
            return ((a.count() * a.volume()) - (b.count() * b.volume()))
        });
        while (pq.size()) {
            pq2.push(pq.pop());
        }
        
        // next set - generate the median cuts using the (npix * vol) sorting.
        iter(pq2, maxcolors - pq2.size());
        
        // calculate the actual colors
        const cmap = new CMap();
        while (pq2.size()) {
            cmap.push(pq2.pop());
        }

        return cmap;
    }
}