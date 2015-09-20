/// <reference path="Quantize.CommonTypes.ts" />
/// <reference path="Quantize.PQueue.ts" />
/// <reference path="Quantize.VBox.ts" />

/*! 
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */

namespace Quantize {
    type VBoxColor = { vbox: VBox, color: Color };

    // Color map
    export class CMap {
        private vboxes: PQueue<VBoxColor>;

        constructor() {
            this.vboxes = new PQueue<VBoxColor>((a, b) => {
                return (a.vbox.count() * a.vbox.volume()) - (b.vbox.count() * b.vbox.volume())
            });
        }

        push(vbox: VBox) {
            this.vboxes.push({
                vbox: vbox,
                color: vbox.avg()
            });
        }

        palette(): Color[] {
            return this.vboxes.map(vb => vb.color);
        }

        size(): number {
            return this.vboxes.size();
        }

        mapIndex(color: Color): number {
            const vboxes = this.vboxes;
            for (let i = 0; i < vboxes.size(); i++) {
                if (vboxes.peek(i).vbox.contains(color)) {
                    return i;
                }
            }
            return this.nearestIndex(color);
        }

        map(color: Color): Color {
            const pIndex = this.mapIndex(color);
            return this.vboxes.peek(pIndex).color;
        }

        nearestIndex(color: Color): number {
            const vboxes = this.vboxes;
            let d1: number;
            let pIndex = 0;
            for (let i = 0; i < vboxes.size(); i++) {
                const d2 = Math.sqrt(
                    Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
                    Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
                    Math.pow(color[2] - vboxes.peek(i).color[2], 2)
                );
                if (d2 < d1 || d1 === undefined) {
                    d1 = d2;
                    pIndex = i;
                }
            }
            return pIndex;
        }

        nearest(color: Color): Color {
            const pIndex = this.nearestIndex(color);
            return this.vboxes.peek(pIndex).color;
        }
    }
}