namespace Quantize {
    export type Color = [number, number, number];

    /**
     * ColorArray interface is compatible with an array of [r,g,b] arrays.
     */
    export interface ColorArray {
        forEach: (callbackfn: (pixel: Color, index: number) => void) => void;
        length: number;
    }

    function testColorArrayInterface() {
        const test: ColorArray = new Array<Color>();
    }
}