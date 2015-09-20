/*! 
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */

namespace Quantize {
    type comparatorType<T> = (a: T, b: T) => number;

    // Simple priority queue
    export class PQueue<T> {
        private contents: T[] = [];
        private sorted = false;

        private comparator: comparatorType<T>;

        constructor(comparator: comparatorType<T>) {
            this.comparator = comparator;
        }

        private sort(): void {
            this.contents.sort(this.comparator);
            this.sorted = true;
        }

        push(o: T) {
            this.contents.push(o);
            this.sorted = false;
        }

        peek(index?: number): T {
            if (!this.sorted) this.sort();
            if (index === undefined) index = this.contents.length - 1;
            return this.contents[index];
        }

        pop(): T {
            if (!this.sorted) this.sort();
            return this.contents.pop();
        }

        size(): number {
            return this.contents.length;
        }

        map(f: (item: T) => any) {
            if (!this.sorted) this.sort();
            return this.contents.map(f);
        }

        debug(): T[] {
            if (!this.sorted) this.sort();
            return this.contents;
        }
    }
}

