var Quantize;
(function (Quantize) {
    function testColorArrayInterface() {
        var test = new Array();
    }
})(Quantize || (Quantize = {}));
/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */
var Quantize;
(function (Quantize) {
    var PQueue = (function () {
        function PQueue(comparator) {
            this.contents = [];
            this.sorted = false;
            this.comparator = comparator;
        }
        PQueue.prototype.sort = function () {
            this.contents.sort(this.comparator);
            this.sorted = true;
        };
        PQueue.prototype.push = function (o) {
            this.contents.push(o);
            this.sorted = false;
        };
        PQueue.prototype.peek = function (index) {
            if (!this.sorted)
                this.sort();
            if (index === undefined)
                index = this.contents.length - 1;
            return this.contents[index];
        };
        PQueue.prototype.pop = function () {
            if (!this.sorted)
                this.sort();
            return this.contents.pop();
        };
        PQueue.prototype.size = function () {
            return this.contents.length;
        };
        PQueue.prototype.map = function (f) {
            if (!this.sorted)
                this.sort();
            return this.contents.map(f);
        };
        PQueue.prototype.debug = function () {
            if (!this.sorted)
                this.sort();
            return this.contents;
        };
        return PQueue;
    })();
    Quantize.PQueue = PQueue;
})(Quantize || (Quantize = {}));
/// <reference path="Quantize.CommonTypes.ts" />
/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */
var Quantize;
(function (Quantize) {
    var sigbits = 5;
    var rshift = 8 - sigbits;
    function getColorIndex(r, g, b) {
        return (r << (2 * sigbits)) + (g << sigbits) + b;
    }
    var VBox = (function () {
        function VBox(r1, r2, g1, g2, b1, b2, histo) {
            this.r1 = r1;
            this.r2 = r2;
            this.g1 = g1;
            this.g2 = g2;
            this.b1 = b1;
            this.b2 = b2;
            this.histo = histo;
        }
        VBox.prototype.volume = function (force) {
            var vbox = this;
            if (!vbox._volume || force) {
                vbox._volume = ((vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1));
            }
            return vbox._volume;
        };
        VBox.prototype.count = function (force) {
            var vbox = this;
            var histo = vbox.histo;
            if (!vbox._count_set || force) {
                var npix = 0, index;
                for (var i = vbox.r1; i <= vbox.r2; i++) {
                    for (var j = vbox.g1; j <= vbox.g2; j++) {
                        for (var k = vbox.b1; k <= vbox.b2; k++) {
                            index = getColorIndex(i, j, k);
                            npix += (histo[index] || 0);
                        }
                    }
                }
                vbox._count = npix;
                vbox._count_set = true;
            }
            return vbox._count;
        };
        VBox.prototype.copy = function () {
            var vbox = this;
            return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
        };
        VBox.prototype.avg = function (force) {
            var vbox = this;
            var histo = vbox.histo;
            if (!vbox._avg || force) {
                var ntot = 0;
                var mult = 1 << (8 - sigbits);
                var rsum = 0, gsum = 0, bsum = 0;
                for (var i = vbox.r1; i <= vbox.r2; i++) {
                    for (var j = vbox.g1; j <= vbox.g2; j++) {
                        for (var k = vbox.b1; k <= vbox.b2; k++) {
                            var histoindex = getColorIndex(i, j, k);
                            var hval = histo[histoindex] || 0;
                            ntot += hval;
                            rsum += (hval * (i + 0.5) * mult);
                            gsum += (hval * (j + 0.5) * mult);
                            bsum += (hval * (k + 0.5) * mult);
                        }
                    }
                }
                if (ntot) {
                    vbox._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
                }
                else {
                    console.log('empty box');
                    vbox._avg = [
                        ~~(mult * (vbox.r1 + vbox.r2 + 1) / 2),
                        ~~(mult * (vbox.g1 + vbox.g2 + 1) / 2),
                        ~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)
                    ];
                }
            }
            return vbox._avg;
        };
        VBox.prototype.contains = function (pixel) {
            var vbox = this;
            var rval = pixel[0] >> rshift;
            var gval = pixel[1] >> rshift;
            var bval = pixel[2] >> rshift;
            return (rval >= vbox.r1 && rval <= vbox.r2 &&
                gval >= vbox.g1 && gval <= vbox.g2 &&
                bval >= vbox.b1 && bval <= vbox.b2);
        };
        VBox.getHisto = function (pixels) {
            var histosize = 1 << (3 * sigbits);
            var histo = new Array(histosize);
            pixels.forEach(function (pixel) {
                var rval = pixel[0] >> rshift;
                var gval = pixel[1] >> rshift;
                var bval = pixel[2] >> rshift;
                var index = getColorIndex(rval, gval, bval);
                histo[index] = (histo[index] || 0) + 1;
            });
            return histo;
        };
        VBox.fromPixels = function (pixels, histo) {
            var rmin = 1000000, rmax = 0;
            var gmin = 1000000, gmax = 0;
            var bmin = 1000000, bmax = 0;
            pixels.forEach(function (pixel) {
                var rval = pixel[0] >> rshift;
                var gval = pixel[1] >> rshift;
                var bval = pixel[2] >> rshift;
                if (rval < rmin)
                    rmin = rval;
                else if (rval > rmax)
                    rmax = rval;
                if (gval < gmin)
                    gmin = gval;
                else if (gval > gmax)
                    gmax = gval;
                if (bval < bmin)
                    bmin = bval;
                else if (bval > bmax)
                    bmax = bval;
            });
            return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
        };
        VBox.prototype.medianCutApply = function (histo) {
            var vbox = this;
            if (!vbox.count())
                return;
            if (vbox.count() == 1) {
                return [vbox.copy()];
            }
            var rw = vbox.r2 - vbox.r1 + 1;
            var gw = vbox.g2 - vbox.g1 + 1;
            var bw = vbox.b2 - vbox.b1 + 1;
            var maxw = Math.max(rw, gw, bw);
            var total = 0, partialsum = [], lookaheadsum = [];
            if (maxw == rw) {
                for (var i = vbox.r1; i <= vbox.r2; i++) {
                    var sum = 0;
                    for (var j = vbox.g1; j <= vbox.g2; j++) {
                        for (var k = vbox.b1; k <= vbox.b2; k++) {
                            var index = getColorIndex(i, j, k);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            }
            else if (maxw == gw) {
                for (var i = vbox.g1; i <= vbox.g2; i++) {
                    var sum = 0;
                    for (var j = vbox.r1; j <= vbox.r2; j++) {
                        for (var k = vbox.b1; k <= vbox.b2; k++) {
                            var index = getColorIndex(j, i, k);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            }
            else {
                for (var i = vbox.b1; i <= vbox.b2; i++) {
                    var sum = 0;
                    for (var j = vbox.r1; j <= vbox.r2; j++) {
                        for (var k = vbox.g1; k <= vbox.g2; k++) {
                            var index = getColorIndex(j, k, i);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            }
            partialsum.forEach(function (d, i) {
                lookaheadsum[i] = total - d;
            });
            var doCut = function (color) {
                var dim1 = color + '1';
                var dim2 = color + '2';
                var left, right;
                var vbox1, vbox2;
                var d2, count2 = 0;
                for (var i = vbox[dim1]; i <= vbox[dim2]; i++) {
                    if (partialsum[i] > total / 2) {
                        vbox1 = vbox.copy();
                        vbox2 = vbox.copy();
                        left = i - vbox[dim1];
                        right = vbox[dim2] - i;
                        if (left <= right) {
                            d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
                        }
                        else {
                            d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                        }
                        while (!partialsum[d2]) {
                            d2++;
                        }
                        count2 = lookaheadsum[d2];
                        while (!count2 && partialsum[d2 - 1]) {
                            count2 = lookaheadsum[--d2];
                        }
                        vbox1[dim2] = d2;
                        vbox2[dim1] = vbox1[dim2] + 1;
                        console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
                        return [vbox1, vbox2];
                    }
                }
            };
            return maxw == rw ? doCut('r') :
                maxw == gw ? doCut('g') :
                    doCut('b');
        };
        return VBox;
    })();
    Quantize.VBox = VBox;
})(Quantize || (Quantize = {}));
/// <reference path="Quantize.CommonTypes.ts" />
/// <reference path="Quantize.PQueue.ts" />
/// <reference path="Quantize.VBox.ts" />
/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */
var Quantize;
(function (Quantize) {
    var CMap = (function () {
        function CMap() {
            this.vboxes = new Quantize.PQueue(function (a, b) {
                return (a.vbox.count() * a.vbox.volume()) - (b.vbox.count() * b.vbox.volume());
            });
        }
        CMap.prototype.push = function (vbox) {
            this.vboxes.push({
                vbox: vbox,
                color: vbox.avg()
            });
        };
        CMap.prototype.palette = function () {
            return this.vboxes.map(function (vb) { return vb.color; });
        };
        CMap.prototype.size = function () {
            return this.vboxes.size();
        };
        CMap.prototype.mapIndex = function (color) {
            var vboxes = this.vboxes;
            for (var i = 0; i < vboxes.size(); i++) {
                if (vboxes.peek(i).vbox.contains(color)) {
                    return i;
                }
            }
            return this.nearestIndex(color);
        };
        CMap.prototype.map = function (color) {
            var pIndex = this.mapIndex(color);
            return this.vboxes.peek(pIndex).color;
        };
        CMap.prototype.nearestIndex = function (color) {
            var vboxes = this.vboxes;
            var d1;
            var pIndex = 0;
            for (var i = 0; i < vboxes.size(); i++) {
                var d2 = Math.sqrt(Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
                    Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
                    Math.pow(color[2] - vboxes.peek(i).color[2], 2));
                if (d2 < d1 || d1 === undefined) {
                    d1 = d2;
                    pIndex = i;
                }
            }
            return pIndex;
        };
        CMap.prototype.nearest = function (color) {
            var pIndex = this.nearestIndex(color);
            return this.vboxes.peek(pIndex).color;
        };
        return CMap;
    })();
    Quantize.CMap = CMap;
})(Quantize || (Quantize = {}));
/// <reference path="Quantize.PQueue.ts" />
/// <reference path="Quantize.VBox.ts" />
/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Converted to Typescript by Ben Gladman 2015
 */
var Quantize;
(function (Quantize) {
    var maxIterations = 1000;
    var fractByPopulations = 0.75;
    function quantize(pixels, maxcolors) {
        if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
            console.log('wrong number of maxcolors');
            return null;
        }
        var histo = Quantize.VBox.getHisto(pixels);
        var vbox = Quantize.VBox.fromPixels(pixels, histo);
        var pq = new Quantize.PQueue(function (a, b) { return a.count() - b.count(); });
        pq.push(vbox);
        function iter(lh, target) {
            var ncolors = 1;
            var niters = 0;
            while (niters < maxIterations) {
                var vbox_1 = lh.pop();
                if (!vbox_1.count()) {
                    lh.push(vbox_1);
                    niters++;
                    continue;
                }
                var vboxes = vbox_1.medianCutApply(histo);
                var vbox1 = vboxes[0];
                var vbox2 = vboxes[1];
                if (!vbox1) {
                    console.log("vbox1 not defined; shouldn't happen!");
                    return;
                }
                lh.push(vbox1);
                if (vbox2) {
                    lh.push(vbox2);
                    ncolors++;
                }
                if (ncolors >= target)
                    return;
                if (niters++ > maxIterations) {
                    console.log("infinite loop; perhaps too few pixels!");
                    return;
                }
            }
        }
        iter(pq, fractByPopulations * maxcolors);
        var pq2 = new Quantize.PQueue(function (a, b) {
            return ((a.count() * a.volume()) - (b.count() * b.volume()));
        });
        while (pq.size()) {
            pq2.push(pq.pop());
        }
        iter(pq2, maxcolors - pq2.size());
        var cmap = new Quantize.CMap();
        while (pq2.size()) {
            cmap.push(pq2.pop());
        }
        return cmap;
    }
    Quantize.quantize = quantize;
})(Quantize || (Quantize = {}));
/// <reference path="Quantize.ts" />
/// <reference path="Quantize.CommonTypes.ts" />
var Quantize;
(function (Quantize) {
    var ImageDataAdapter = (function () {
        function ImageDataAdapter(imageData) {
            this.pixelData = imageData.data;
            this.lendata = imageData.data.length;
            this.length = imageData.data.length >> 2;
        }
        ImageDataAdapter.prototype.forEach = function (callbackfn) {
            var pixelIndex = 0;
            for (var i = 0; i < this.lendata;) {
                var pixel = [
                    this.pixelData[i++],
                    this.pixelData[i++],
                    this.pixelData[i++]
                ];
                i++;
                callbackfn(pixel, pixelIndex++);
            }
        };
        ImageDataAdapter.prototype.apply = function (callbackfn) {
            var pixelIndex = 0;
            for (var i = 0; i < this.lendata;) {
                var pixelIn = [
                    this.pixelData[i],
                    this.pixelData[i + 1],
                    this.pixelData[i + 2]
                ];
                var pixelOut = callbackfn(pixelIn, pixelIndex++);
                this.pixelData[i++] = pixelOut[0];
                this.pixelData[i++] = pixelOut[1];
                this.pixelData[i++] = pixelOut[2];
                i++;
            }
        };
        return ImageDataAdapter;
    })();
    Quantize.ImageDataAdapter = ImageDataAdapter;
})(Quantize || (Quantize = {}));
var Smudge;
(function (Smudge) {
    var Data = (function () {
        function Data(widthOrBase64, quantized) {
            this.width = 1;
            this.quantized = false;
            this.palette = [];
            this.data = [];
            this.colourMapper = null;
            if (typeof widthOrBase64 === "number") {
                this.width = widthOrBase64;
                this.quantized = quantized;
            }
            else if (typeof widthOrBase64 === "string") {
                this.base64 = widthOrBase64;
            }
        }
        Object.defineProperty(Data.prototype, "height", {
            get: function () {
                return Math.max(1, Math.ceil((this.data.length - 1) / this.width));
            },
            enumerable: true,
            configurable: true
        });
        Data.prototype.rgbAt = function (index) {
            var val = this.data[index];
            if (this.quantized) {
                var byte = this.palette[val & 15];
                return this.byteToColour(byte);
            }
            else {
                return this.byteToColour(val);
            }
        };
        Data.prototype.appendRgb = function (colour) {
            if (this.colourMapper) {
                var ix = this.colourMapper(colour);
                this.data.push(ix);
            }
            else if (this.quantized) {
                var byte = this.colourToByte(colour);
                this.data.push(this.palette.indexOf(byte));
            }
            else {
                var byte = this.colourToByte(colour);
                this.data.push(byte);
            }
        };
        Data.prototype.setPalette = function (colours) {
            var _this = this;
            var palette = [];
            colours.forEach(function (c) { return palette.push(_this.colourToByte(c)); });
            this.palette = palette;
        };
        Data.prototype.colourToByte = function (_a) {
            var r = _a[0], g = _a[1], b = _a[2];
            return ((r >> 5) << 5)
                | ((g >> 5) << 2)
                | (b >> 6);
        };
        Data.prototype.byteToColour = function (byte) {
            var r = (7 & (byte >> 5)) * 36;
            var g = (7 & (byte >> 2)) * 36;
            var b = (3 & byte) * 85;
            return [r, g, b];
        };
        Object.defineProperty(Data.prototype, "base64", {
            get: function () {
                var dd = "";
                dd += String.fromCharCode(((this.width - 1) & 127) + (this.quantized ? 128 : 0));
                var quantizedColors = this.palette;
                var data = this.data;
                if (this.quantized) {
                    for (var i = 0; i < 16; i++) {
                        dd += String.fromCharCode(quantizedColors[i]);
                    }
                    for (var i = 0, datalen = data.length; i < datalen;) {
                        var n1 = (data[i++] & 15) << 4;
                        var n2 = (data[i++] & 15);
                        dd += String.fromCharCode(n1 + n2);
                    }
                }
                else {
                    for (var i = 0, datalen = data.length; i < datalen; i++) {
                        var b1 = data[i] & 255;
                        dd += String.fromCharCode(b1);
                    }
                }
                return window.btoa(dd);
            },
            set: function (b64data) {
                var dd = window.atob(b64data);
                var quantizedColors = [];
                var data = [];
                this.width = (dd.charCodeAt(0) & 127) + 1;
                this.quantized = !!(dd.charCodeAt(0) & 128);
                if (this.quantized) {
                    for (var i = 1; i < 17; i++) {
                        quantizedColors.push(dd.charCodeAt(i));
                    }
                    for (var i = 17, datalen = dd.length; i < datalen; i++) {
                        var b1 = dd.charCodeAt(i);
                        data.push(b1 >> 4);
                        data.push(b1 & 15);
                    }
                }
                else {
                    for (var i = 1, datalen = dd.length; i < datalen; i++) {
                        data.push(dd.charCodeAt(i));
                    }
                }
                this.palette = quantizedColors;
                this.data = data;
            },
            enumerable: true,
            configurable: true
        });
        return Data;
    })();
    Smudge.Data = Data;
})(Smudge || (Smudge = {}));
/// <reference path="Smudge.Data.ts" />
var Smudge;
(function (Smudge) {
    var messages = {
        idError: "No element with passed id.",
        typeError: "Pass in an element or an id.",
    };
    var Renderer = (function () {
        function Renderer(elementOrId) {
            var element;
            if (typeof elementOrId === "string") {
                element = document.getElementById(elementOrId);
                if (!element) {
                    throw new Error(messages.idError);
                }
            }
            else if (elementOrId instanceof HTMLElement) {
                element = elementOrId;
            }
            else {
                throw new TypeError(messages.typeError);
            }
            this.element = element;
            element.classList.add("smudge-container");
            this.image = this.element.getElementsByTagName("img")[0];
            this.checkImageLoaded();
            this.width = element.scrollWidth;
            this.height = element.scrollHeight;
            var canvas = document.createElement("canvas");
            canvas.width = this.width;
            canvas.height = this.height;
            canvas.className = "smudge-canvas";
            element.appendChild(canvas);
            this.ctx = canvas.getContext("2d");
            this.smudge();
        }
        Renderer.prototype.checkImageLoaded = function (loadedCaption, notLoadedCaption, onloadCaption) {
            var _this = this;
            if (!this.image) {
                if (notLoadedCaption) {
                    this.caption(notLoadedCaption);
                }
                return false;
            }
            this.image.classList.add("smudge-image");
            if (this.image.complete) {
                this.element.classList.add("smudge-image-loaded");
                if (loadedCaption) {
                    this.caption(loadedCaption);
                }
                return true;
            }
            else {
                this.element.classList.remove("smudge-image-loaded");
                if (notLoadedCaption) {
                    this.caption(notLoadedCaption);
                }
                this.image.onload = function () { _this.checkImageLoaded(onloadCaption, notLoadedCaption, onloadCaption); };
                return false;
            }
        };
        Renderer.prototype.load = function (src) {
            if (!src) {
                src = this.element.dataset["src"];
            }
            if (!src) {
                return this;
            }
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
        };
        Renderer.prototype.smudge = function (b64) {
            if (!b64) {
                b64 = this.element.dataset["smudge"];
            }
            if (!b64) {
                return this;
            }
            this.data = new Smudge.Data(b64);
            return this;
        };
        Renderer.prototype.draw = function () {
            if (!this.data) {
                return this;
            }
            var previewData = this.data;
            var previewWidth = previewData.width;
            var previewHeight = previewData.height;
            var ctx = this.ctx;
            var imagedata = ctx.createImageData(previewWidth, previewHeight);
            var data = imagedata.data;
            var lendata = data.length;
            for (var i = 0, previewIndex = 0; i < lendata;) {
                var _a = previewData.rgbAt(previewIndex++), r = _a[0], g = _a[1], b = _a[2];
                data[i++] = r;
                data[i++] = g;
                data[i++] = b;
                data[i++] = 255;
            }
            ctx.putImageData(imagedata, 0, 0);
            ctx.drawImage(ctx.canvas, 0, 0, previewWidth, previewHeight, 0, 0, this.width, this.height);
            return this;
        };
        Renderer.prototype.caption = function (text) {
            var infoDiv = this.element.getElementsByClassName("smudge-caption")[0];
            if (text) {
                if (!infoDiv) {
                    infoDiv = document.createElement("div");
                    infoDiv.className = "smudge-caption";
                    this.element.appendChild(infoDiv);
                }
                infoDiv.innerText = text;
            }
            else {
                if (infoDiv) {
                    infoDiv.remove();
                }
            }
            return this;
        };
        Renderer.prototype.toString = function () {
            return this.data ?
                "Smudge(width=" + this.data.width + ", height=" + this.data.height + ", length=" + this.data.base64.length + ", base64=" + this.data.base64 + ")"
                :
                    "Smudge(empty)";
        };
        Renderer.prototype.hover = function (showSmudgeOnHover, showCaptionOnHover) {
            if (showSmudgeOnHover) {
                this.element.classList.add("smudge-hover");
            }
            else {
                this.element.classList.remove("smudge-hover");
            }
            if (showCaptionOnHover) {
                this.element.classList.add("smudge-hover-caption");
            }
            else {
                this.element.classList.remove("smudge-hover-caption");
            }
            return this;
        };
        return Renderer;
    })();
    Smudge.Renderer = Renderer;
})(Smudge || (Smudge = {}));
/// <reference path="Smudge.Data.ts" />
/// <reference path="Smudge.Renderer.ts" />
/// <reference path="Quantize.ts" />
/// <reference path="Quantize.ImageDataAdapter.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Smudge;
(function (Smudge) {
    var messages = {
        imageNotLoaded: "Image is not yet loaded.",
        imageLoaded: "Image is now loaded.",
        slide: "Slide to generate a smudge.",
        wait: "Wait for the image to load, then slide to generate a smudge.",
    };
    var Generator = (function (_super) {
        __extends(Generator, _super);
        function Generator() {
            _super.apply(this, arguments);
        }
        Generator.prototype.calcWidthForSize = function (ssize) {
            return Math.sqrt(ssize * this.width / this.height);
        };
        Generator.prototype.generate = function (swidth, quantize) {
            if (!this.checkImageLoaded(null, messages.imageNotLoaded, messages.imageLoaded)) {
                return this;
            }
            swidth = Math.max(1, Math.floor(swidth));
            var sheight = Math.max(1, Math.round(swidth * this.height / this.width));
            var sdata = new Smudge.Data(swidth, quantize);
            this.ctx.drawImage(this.image, 0, 0, this.width, this.height);
            var imagedata = this.ctx.getImageData(0, 0, this.width, this.height);
            var cellWidth = this.width / swidth;
            var cellHeight = this.height / sheight;
            if (quantize) {
                var cmap = Quantize.quantize(new Quantize.ImageDataAdapter(imagedata), 16);
                if (cmap) {
                    sdata.setPalette(cmap.palette());
                    sdata.colourMapper = function (c) { return cmap.nearestIndex(c); };
                }
            }
            var data = imagedata.data;
            for (var sy = 0; sy < sheight; sy++) {
                for (var sx = 0; sx < swidth; sx++) {
                    var imageIndex = (Math.floor(sx * cellWidth) + (Math.floor(sy * cellHeight) * this.width)) * 4;
                    var colour = this.calcAverageColour(data, imageIndex, cellWidth, cellHeight);
                    sdata.appendRgb(colour);
                }
            }
            this.data = sdata;
            return this;
        };
        Generator.prototype.calcAverageColour = function (data, imageIndex1, cellWidth, cellHeight) {
            var r = 0, g = 0, b = 0, count = 0;
            for (var j = 0; j < cellHeight; j++) {
                var imageIndex = imageIndex1 + (j * this.width * 4);
                for (var i = 0; i < cellWidth; i++) {
                    count++;
                    r += data[imageIndex++];
                    g += data[imageIndex++];
                    b += data[imageIndex++];
                    imageIndex++;
                }
            }
            return [(r / count), (g / count), (b / count)];
        };
        Generator.prototype.slider = function (min, max, quantize) {
            var _this = this;
            var sliderControl = this.element.getElementsByClassName("smudge-slider")[0];
            if (!sliderControl) {
                sliderControl = document.createElement("input");
                sliderControl.className = "smudge-slider";
                sliderControl.type = "range";
                sliderControl.step = "1";
                sliderControl.title = messages.slide;
                this.element.appendChild(sliderControl);
                var oninput_1 = function () {
                    if (_this.checkImageLoaded(null, messages.wait, messages.slide)) {
                        var ssize = Number(sliderControl.value);
                        _this.generate(ssize, quantize).draw();
                        _this.caption(_this.toString());
                    }
                };
                sliderControl.oninput = oninput_1;
                this.checkImageLoaded(messages.slide, messages.wait, messages.slide);
            }
            sliderControl.min = min ? min.toString() : "1";
            sliderControl.max = max ? max.toString() : "10";
            sliderControl.value = this.data ? this.data.width.toString() : "0";
            return this;
        };
        return Generator;
    })(Smudge.Renderer);
    Smudge.Generator = Generator;
})(Smudge || (Smudge = {}));
/// <reference path="Smudge.Renderer.ts" />
/// <reference path="Quantize.ts" />
/// <reference path="Quantize.ImageDataAdapter.ts" />
var Smudge;
(function (Smudge) {
    var messages = {
        imageNotLoaded: "Image is not yet loaded.",
        imageLoaded: "Image is now loaded.",
        quantize: "Slide to quantize.",
        wait: "Wait for the image to load, then slide to quantize.",
    };
    var Quantizer = (function (_super) {
        __extends(Quantizer, _super);
        function Quantizer() {
            _super.apply(this, arguments);
            this.maxcolours = 0;
        }
        Quantizer.prototype.quantize = function (maxcolours) {
            if (!this.checkImageLoaded(null, messages.imageNotLoaded, messages.imageLoaded)) {
                return this;
            }
            this.ctx.drawImage(this.image, 0, 0, this.width, this.height);
            var imagedata = this.ctx.getImageData(0, 0, this.width, this.height);
            var ida = new Quantize.ImageDataAdapter(imagedata);
            var cmap = Quantize.quantize(ida, maxcolours);
            if (cmap) {
                ida.apply(function (c) { return cmap.nearest(c); });
                this.ctx.putImageData(imagedata, 0, 0);
            }
            return this;
        };
        Quantizer.prototype.slider = function () {
            var _this = this;
            var sliderControl = this.element.getElementsByClassName("smudge-slider")[0];
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
                var oninput_2 = function () {
                    if (_this.checkImageLoaded(null, messages.wait, messages.quantize)) {
                        _this.maxcolours = Number(sliderControl.value);
                        _this.quantize(_this.maxcolours);
                        _this.caption(_this.toString());
                    }
                };
                sliderControl.oninput = oninput_2;
                this.checkImageLoaded(messages.quantize, messages.wait, messages.quantize);
            }
            return this;
        };
        Quantizer.prototype.toString = function () {
            return "Quantized(colours=" + this.maxcolours + ")";
        };
        return Quantizer;
    })(Smudge.Renderer);
    Smudge.Quantizer = Quantizer;
})(Smudge || (Smudge = {}));
/// <reference path="Smudge.Renderer.ts" />
/// <reference path="Smudge.Generator.ts" />
/// <reference path="Smudge.Quantizer.ts" />
var Smudge;
(function (Smudge) {
    function renderer(elementOrId) {
        return new Smudge.Renderer(elementOrId);
    }
    Smudge.renderer = renderer;
    function generator(elementOrId) {
        return new Smudge.Generator(elementOrId);
    }
    Smudge.generator = generator;
    function quantizer(elementOrId) {
        return new Smudge.Quantizer(elementOrId);
    }
    Smudge.quantizer = quantizer;
})(Smudge || (Smudge = {}));
//# sourceMappingURL=smudge.js.map