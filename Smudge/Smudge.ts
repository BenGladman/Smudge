/// <reference path="SmudgeRenderer.ts" />

namespace Smudge {
    export function on(elementOrId: HTMLElement | string): Renderer {
        return new Renderer(elementOrId);
    }
}