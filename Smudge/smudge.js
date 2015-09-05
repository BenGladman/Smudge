var Smudge = (function () {
    function Smudge(elementOrId) {
        var _this = this;
        var element;
        if (typeof elementOrId === "string") {
            element = document.getElementById(elementOrId);
            if (!element) {
                throw new Error("No element with id " + elementOrId);
            }
        }
        else if (elementOrId instanceof HTMLElement) {
            element = elementOrId;
        }
        else {
            throw new TypeError("Pass in an element or and id");
        }
        this.element = element;
        element.classList.add("smudge-container");
        this.width = element.scrollWidth;
        this.height = element.scrollHeight;
        var src = element.dataset["src"];
        if (src) {
            element.classList.add("smudge-image-loading");
            var image = new Image(this.width, this.height);
            image.src = src;
            image.className = "smudge-image";
            element.appendChild(image);
            this.image = image;
            image.onload = function () {
                element.classList.remove("smudge-image-loading");
                if (_this.captionOnload) {
                    _this.caption(_this.captionOnload);
                }
            };
        }
        var canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.className = "smudge-canvas";
        element.appendChild(canvas);
        this.ctx = canvas.getContext("2d");
        var b64 = element.dataset["smudge"];
        if (b64) {
            this.data = new SmudgeData(b64);
            this.draw();
        }
    }
    Smudge.prototype.draw = function () {
        if (!this.data) {
            return this;
        }
        var previewData = this.data;
        var previewWidth = previewData.width;
        var previewHeight = previewData.height;
        var ctx = this.ctx;
        var imagedata = ctx.createImageData(previewWidth, previewHeight);
        var previewIndex = 0;
        for (var i = 0, data = imagedata.data, lendata = data.length; i < lendata;) {
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
    Smudge.prototype.calcWidthForSize = function (ssize) {
        return Math.sqrt(ssize * this.width / this.height);
    };
    Smudge.prototype.generate = function (swidth) {
        if (!this.image.complete) {
            this.caption("Image is not yet fully loaded.");
            this.captionOnload = "Image is now fully loaded.";
            return this;
        }
        swidth = Math.max(1, Math.floor(swidth));
        var sheight = Math.max(1, Math.round(swidth * this.height / this.width));
        var sdata = new SmudgeData(swidth);
        this.ctx.drawImage(this.image, 0, 0, this.width, this.height);
        var imagedata = this.ctx.getImageData(0, 0, this.width, this.height);
        var cellWidth = this.width / swidth;
        var cellHeight = this.height / sheight;
        var data = imagedata.data;
        for (var sy = 0; sy < sheight; sy++) {
            for (var sx = 0; sx < swidth; sx++) {
                var imageIndex = (Math.floor(sx * cellWidth) + (Math.floor(sy * cellHeight) * this.width)) * 4;
                var _a = this.calcAverageColour(data, imageIndex, cellWidth, cellHeight), r = _a[0], g = _a[1], b = _a[2];
                sdata.appendRgb(r, g, b);
            }
        }
        this.data = sdata;
        return this;
    };
    Smudge.prototype.calcAverageColour = function (data, imageIndex1, cellWidth, cellHeight) {
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
    Smudge.prototype.caption = function (text) {
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
    Object.defineProperty(Smudge.prototype, "sbase64", {
        get: function () { return this.data ? this.data.base64 : ""; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Smudge.prototype, "swidth", {
        get: function () { return this.data ? this.data.width : 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Smudge.prototype, "sheight", {
        get: function () { return this.data ? this.data.height : 0; },
        enumerable: true,
        configurable: true
    });
    Smudge.prototype.toString = function () {
        return "Smudge(width=" + this.swidth + ", height=" + this.sheight + ", length=" + this.sbase64.length + ", base64=" + this.sbase64 + ")";
    };
    Smudge.prototype.slider = function (min, max) {
        var _this = this;
        var sliderControl = this.element.getElementsByClassName("smudge-slider")[0];
        if (!sliderControl) {
            sliderControl = document.createElement("input");
            sliderControl.className = "smudge-slider";
            sliderControl.type = "range";
            sliderControl.step = "1";
            sliderControl.title = "Slide to generate a smudge.";
            this.element.appendChild(sliderControl);
            var oninput_1 = function () {
                var ssize = Number(sliderControl.value);
                _this.generate(ssize).draw();
                if (_this.data) {
                    _this.caption(_this.toString());
                }
            };
            sliderControl.oninput = oninput_1;
            if (this.image.complete) {
                this.caption("Slide to generate a smudge.");
            }
            else {
                this.caption("Wait for the image to load, then slide .to generate a smudge.");
                this.captionOnload = "Slide to generate a smudge.";
            }
        }
        sliderControl.min = min ? min.toString() : "1";
        sliderControl.max = max ? max.toString() : "10";
        sliderControl.value = this.swidth.toString();
        return this;
    };
    Smudge.prototype.hover = function (showSmudgeOnHover, showCaptionOnHover) {
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
    return Smudge;
})();
var SmudgeData = (function () {
    function SmudgeData(widthOrBase64) {
        this.data = "";
        if (typeof widthOrBase64 === "number") {
            this.width = widthOrBase64;
        }
        else if (typeof widthOrBase64 === "string") {
            this.base64 = widthOrBase64;
        }
    }
    Object.defineProperty(SmudgeData.prototype, "width", {
        get: function () {
            if (this.data.length < 1) {
                return 1;
            }
            return this.data.charCodeAt(0) + 1;
        },
        set: function (value) {
            if (value < 1) {
                throw new RangeError("Width must be 1 or more");
            }
            if (value > 256) {
                throw new RangeError("Width must be 256 or less");
            }
            this.data = String.fromCharCode(value - 1) + this.data.substring(1);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SmudgeData.prototype, "height", {
        get: function () {
            return Math.max(1, Math.ceil((this.data.length - 1) / this.width));
        },
        enumerable: true,
        configurable: true
    });
    SmudgeData.prototype.valueAt = function (index) {
        if (this.data.length <= (index + 1)) {
            return 0;
        }
        return this.data.charCodeAt(index + 1);
        ;
    };
    SmudgeData.prototype.rgbAt = function (index) {
        var val = this.valueAt(index);
        var r = (7 & (val >> 5)) * 36;
        var g = (7 & (val >> 2)) * 36;
        var b = (3 & val) * 85;
        return [r, g, b];
    };
    SmudgeData.prototype.appendRgb = function (r, g, b) {
        if (this.data.length === 0) {
            this.data = "\0";
        }
        var val = (r >> 5) << 5;
        val |= (g >> 5) << 2;
        val |= (b >> 6);
        this.data += String.fromCharCode(val);
    };
    Object.defineProperty(SmudgeData.prototype, "base64", {
        get: function () {
            return window.btoa(this.data);
        },
        set: function (b64data) {
            this.data = window.atob(b64data);
        },
        enumerable: true,
        configurable: true
    });
    return SmudgeData;
})();
//# sourceMappingURL=smudge.js.map