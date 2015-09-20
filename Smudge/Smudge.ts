/// <reference path="Smudge.Renderer.ts" />
/// <reference path="Smudge.Generator.ts" />
/// <reference path="Smudge.Quantizer.ts" />

namespace Smudge {
    export function renderer(elementOrId: HTMLElement | string): Renderer {
        return new Renderer(elementOrId);
    }

    export function generator(elementOrId: HTMLElement | string): Generator {
        return new Generator(elementOrId);
    }

    export function quantizer(elementOrId: HTMLElement | string): Quantizer {
        return new Quantizer(elementOrId);
    }
}