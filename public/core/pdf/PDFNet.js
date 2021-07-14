(function() {
    var $jscomp = $jscomp || {};
    $jscomp.scope = {};
    $jscomp.arrayIteratorImpl = function(array) {
        var index = 0;
        return function() {
            return index < array.length ? { done: !1, value: array[index++] } : { done: !0 };
        };
    };
    $jscomp.arrayIterator = function(array) {
        return { next: $jscomp.arrayIteratorImpl(array) };
    };
    $jscomp.makeIterator = function(iterable) {
        var iteratorFunction = "undefined" != typeof Symbol && Symbol.iterator && iterable[Symbol.iterator];
        return iteratorFunction ? iteratorFunction.call(iterable) : $jscomp.arrayIterator(iterable);
    };
    $jscomp.getGlobal = function(maybeGlobal) {
        return "undefined" != typeof window && window === maybeGlobal ? maybeGlobal : "undefined" != typeof global && null != global ? global : maybeGlobal;
    };
    $jscomp.global = $jscomp.getGlobal(this);
    $jscomp.ASSUME_ES5 = !1;
    $jscomp.ASSUME_NO_NATIVE_MAP = !1;
    $jscomp.ASSUME_NO_NATIVE_SET = !1;
    $jscomp.SIMPLE_FROUND_POLYFILL = !1;
    $jscomp.defineProperty = $jscomp.ASSUME_ES5 || "function" == typeof Object.defineProperties ? Object.defineProperty : function(target, property, descriptor) {
        target != Array.prototype && target != Object.prototype && (target[property] = descriptor.value);
    };
    $jscomp.polyfill = function(target, polyfill, fromLang, toLang) {
        if (polyfill) {
            fromLang = $jscomp.global;
            target = target.split(".");
            for (toLang = 0; toLang < target.length - 1; toLang++) {
                var key = target[toLang];
                key in fromLang || (fromLang[key] = {});
                fromLang = fromLang[key];
            }
            target = target[target.length - 1];
            toLang = fromLang[target];
            polyfill = polyfill(toLang);
            polyfill != toLang && null != polyfill && $jscomp.defineProperty(fromLang, target, {
                configurable: !0,
                writable: !0,
                value: polyfill,
            });
        }
    };
    $jscomp.FORCE_POLYFILL_PROMISE = !1;
    $jscomp.polyfill("Promise", function(NativePromise) {
        function AsyncExecutor() {
            this.batch_ = null;
        }

        function resolvingPromise(opt_value) {
            return opt_value instanceof PolyfillPromise ? opt_value : new PolyfillPromise(function(resolve, reject) {
                resolve(opt_value);
            });
        }

        if (NativePromise && !$jscomp.FORCE_POLYFILL_PROMISE) return NativePromise;
        AsyncExecutor.prototype.asyncExecute = function(f) {
            null == this.batch_ && (this.batch_ = [], this.asyncExecuteBatch_());
            this.batch_.push(f);
            return this;
        };
        AsyncExecutor.prototype.asyncExecuteBatch_ =
            function() {
                var self = this;
                this.asyncExecuteFunction(function() {
                    self.executeBatch_();
                });
            };
        var nativeSetTimeout = $jscomp.global.setTimeout;
        AsyncExecutor.prototype.asyncExecuteFunction = function(f) {
            nativeSetTimeout(f, 0);
        };
        AsyncExecutor.prototype.executeBatch_ = function() {
            for (; this.batch_ && this.batch_.length;) {
                var executingBatch = this.batch_;
                this.batch_ = [];
                for (var i = 0; i < executingBatch.length; ++i) {
                    var f = executingBatch[i];
                    executingBatch[i] = null;
                    try {
                        f();
                    } catch (error) {
                        this.asyncThrow_(error);
                    }
                }
            }
            this.batch_ = null;
        };
        AsyncExecutor.prototype.asyncThrow_ =
            function(exception) {
                this.asyncExecuteFunction(function() {
                    throw exception;
                });
            };
        var PolyfillPromise = function(executor) {
            this.state_ = 0;
            this.result_ = void 0;
            this.onSettledCallbacks_ = [];
            var resolveAndReject = this.createResolveAndReject_();
            try {
                executor(resolveAndReject.resolve, resolveAndReject.reject);
            } catch (e) {
                resolveAndReject.reject(e);
            }
        };
        PolyfillPromise.prototype.createResolveAndReject_ = function() {
            function firstCallWins(method) {
                return function(x) {
                    alreadyCalled || (alreadyCalled = !0, method.call(thisPromise, x));
                };
            }

            var thisPromise = this, alreadyCalled = !1;
            return { resolve: firstCallWins(this.resolveTo_), reject: firstCallWins(this.reject_) };
        };
        PolyfillPromise.prototype.resolveTo_ = function(value) {
            if (value === this) {
                this.reject_(new TypeError("A Promise cannot resolve to itself"));
            } else if (value instanceof PolyfillPromise) {
                this.settleSameAsPromise_(value);
            } else {
                a:switch (typeof value) {
                case "object":
                    var JSCompiler_inline_result = null != value;
                    break a;
                case "function":
                    JSCompiler_inline_result = !0;
                    break a;
                default:
                    JSCompiler_inline_result =
                        !1;
                }
                JSCompiler_inline_result ? this.resolveToNonPromiseObj_(value) : this.fulfill_(value);
            }
        };
        PolyfillPromise.prototype.resolveToNonPromiseObj_ = function(obj) {
            var thenMethod = void 0;
            try {
                thenMethod = obj.then;
            } catch (error) {
                this.reject_(error);
                return;
            }
            "function" == typeof thenMethod ? this.settleSameAsThenable_(thenMethod, obj) : this.fulfill_(obj);
        };
        PolyfillPromise.prototype.reject_ = function(reason) {
            this.settle_(2, reason);
        };
        PolyfillPromise.prototype.fulfill_ = function(value) {
            this.settle_(1, value);
        };
        PolyfillPromise.prototype.settle_ =
            function(settledState, valueOrReason) {
                if (0 != this.state_) throw Error("Cannot settle(" + settledState + ", " + valueOrReason + "): Promise already settled in state" + this.state_);
                this.state_ = settledState;
                this.result_ = valueOrReason;
                this.executeOnSettledCallbacks_();
            };
        PolyfillPromise.prototype.executeOnSettledCallbacks_ = function() {
            if (null != this.onSettledCallbacks_) {
                for (var i = 0; i < this.onSettledCallbacks_.length; ++i) asyncExecutor.asyncExecute(this.onSettledCallbacks_[i]);
                this.onSettledCallbacks_ = null;
            }
        };
        var asyncExecutor =
            new AsyncExecutor;
        PolyfillPromise.prototype.settleSameAsPromise_ = function(promise) {
            var methods = this.createResolveAndReject_();
            promise.callWhenSettled_(methods.resolve, methods.reject);
        };
        PolyfillPromise.prototype.settleSameAsThenable_ = function(thenMethod, thenable) {
            var methods = this.createResolveAndReject_();
            try {
                thenMethod.call(thenable, methods.resolve, methods.reject);
            } catch (error) {
                methods.reject(error);
            }
        };
        PolyfillPromise.prototype.then = function(onFulfilled, onRejected) {
            function createCallback(paramF, defaultF) {
                return "function" ==
                typeof paramF ? function(x) {
                    try {
                        resolveChild(paramF(x));
                    } catch (error) {
                        rejectChild(error);
                    }
                } : defaultF;
            }

            var resolveChild, rejectChild, childPromise = new PolyfillPromise(function(resolve, reject) {
                resolveChild = resolve;
                rejectChild = reject;
            });
            this.callWhenSettled_(createCallback(onFulfilled, resolveChild), createCallback(onRejected, rejectChild));
            return childPromise;
        };
        PolyfillPromise.prototype.catch = function(onRejected) {
            return this.then(void 0, onRejected);
        };
        PolyfillPromise.prototype.callWhenSettled_ = function(onFulfilled,
            onRejected) {
            function callback() {
                switch (thisPromise.state_) {
                case 1:
                    onFulfilled(thisPromise.result_);
                    break;
                case 2:
                    onRejected(thisPromise.result_);
                    break;
                default:
                    throw Error("Unexpected state: " + thisPromise.state_);
                }
            }

            var thisPromise = this;
            null == this.onSettledCallbacks_ ? asyncExecutor.asyncExecute(callback) : this.onSettledCallbacks_.push(callback);
        };
        PolyfillPromise.resolve = resolvingPromise;
        PolyfillPromise.reject = function(opt_reason) {
            return new PolyfillPromise(function(resolve, reject) {
                reject(opt_reason);
            });
        };
        PolyfillPromise.race = function(thenablesOrValues) {
            return new PolyfillPromise(function(resolve, reject) {
                for (var iterator = $jscomp.makeIterator(thenablesOrValues), iterRec = iterator.next(); !iterRec.done; iterRec = iterator.next()) resolvingPromise(iterRec.value).callWhenSettled_(resolve, reject);
            });
        };
        PolyfillPromise.all = function(thenablesOrValues) {
            var iterator = $jscomp.makeIterator(thenablesOrValues), iterRec = iterator.next();
            return iterRec.done ? resolvingPromise([]) : new PolyfillPromise(function(resolveAll, rejectAll) {
                function onFulfilled(i) {
                    return function(ithResult) {
                        resultsArray[i] =
                            ithResult;
                        unresolvedCount--;
                        0 == unresolvedCount && resolveAll(resultsArray);
                    };
                }

                var resultsArray = [], unresolvedCount = 0;
                do resultsArray.push(void 0), unresolvedCount++, resolvingPromise(iterRec.value).callWhenSettled_(onFulfilled(resultsArray.length - 1), rejectAll), iterRec = iterator.next(); while (!iterRec.done);
            });
        };
        return PolyfillPromise;
    }, "es6", "es3");
    $jscomp.polyfill("Array.from", function(orig) {
        return orig ? orig : function(arrayLike, opt_mapFn, opt_thisArg) {
            opt_mapFn = null != opt_mapFn ? opt_mapFn : function(x) {
                return x;
            };
            var result = [],
                iteratorFunction = "undefined" != typeof Symbol && Symbol.iterator && arrayLike[Symbol.iterator];
            if ("function" == typeof iteratorFunction) {
                arrayLike = iteratorFunction.call(arrayLike);
                for (var k = 0; !(iteratorFunction = arrayLike.next()).done;) result.push(opt_mapFn.call(opt_thisArg, iteratorFunction.value, k++));
            } else {
                for (iteratorFunction = arrayLike.length,
                    k = 0; k < iteratorFunction; k++) {
                    result.push(opt_mapFn.call(opt_thisArg, arrayLike[k], k));
                }
            }
            return result;
        };
    }, "es6", "es3");
    (function(modules) {
        function __webpack_require__(moduleId) {
            if (installedModules[moduleId]) return installedModules[moduleId].exports;
            var module = installedModules[moduleId] = { i: moduleId, l: !1, exports: {} };
            modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
            module.l = !0;
            return module.exports;
        }

        var installedModules = {};
        __webpack_require__.m = modules;
        __webpack_require__.c = installedModules;
        __webpack_require__.d = function(exports, name, getter) {
            __webpack_require__.o(exports, name) || Object.defineProperty(exports,
                name, { enumerable: !0, get: getter });
        };
        __webpack_require__.r = function(exports) {
            "undefined" !== typeof Symbol && Symbol.toStringTag && Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
            Object.defineProperty(exports, "__esModule", { value: !0 });
        };
        __webpack_require__.t = function(value, mode) {
            mode & 1 && (value = __webpack_require__(value));
            if (mode & 8 || mode & 4 && "object" === typeof value && value && value.__esModule) return value;
            var ns = Object.create(null);
            __webpack_require__.r(ns);
            Object.defineProperty(ns, "default",
                { enumerable: !0, value: value });
            if (mode & 2 && "string" != typeof value) {
                for (var key$jscomp$0 in value) {
                    __webpack_require__.d(ns, key$jscomp$0, function(key) {
                        return value[key];
                    }.bind(null, key$jscomp$0));
                }
            }
            return ns;
        };
        __webpack_require__.n = function(module) {
            var getter = module && module.__esModule ? function() {
                return module["default"];
            } : function() {
                return module;
            };
            __webpack_require__.d(getter, "a", getter);
            return getter;
        };
        __webpack_require__.o = function(object, property) {
            return Object.prototype.hasOwnProperty.call(object, property);
        };
        __webpack_require__.p = "/core/pdf/";
        return __webpack_require__(__webpack_require__.s = 0);
    })([function(module, exports, __webpack_require__) {
        module.exports = __webpack_require__(1);
    }, function(module, exports$jscomp$0) {
        function _typeof(obj$jscomp$0) {
            "@babel/helpers - typeof";
            _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
                return typeof obj;
            } : function(obj) {
                return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
            };
            return _typeof(obj$jscomp$0);
        }

        var createdObjects = [], lockedObjects = [], stackCallCounter = 0, beginOperationCounter = 0,
            deallocStackCounter = [], unlockStackCounter = [];
        (function(exports) {
            function optionsHelpers() {
                return {
                    putNumber: function(implObj, key, value) {
                        implObj[key] = 0 + value;
                    }, jsColorToNumber: function(jsColor) {
                        return 16777216 * Math.floor(jsColor.A) + 65536 * Math.floor(jsColor.R) + 256 * Math.floor(jsColor.G) + Math.floor(jsColor.B);
                    }, jsColorFromNumber: function(number) {
                        return {
                            A: 5.9604644775390625E-8 * number & 255, R: ((number | 0) & 16711680) >>> 16, G: ((number |
                                0) & 65280) >>> 8, B: (number | 0) & 255,
                        };
                    },
                };
            }

            function finishGenerator(iterator) {
                function iterate(val) {
                    val = iterator.next(val);
                    var promise = val.value;
                    return val.done ? val.value : promise.then(iterate);
                }

                return Promise.resolve().then(iterate);
            }

            var PDFNet = exports.PDFNet ? exports.PDFNet : {};
            PDFNet.Convert = exports.PDFNet && exports.PDFNet.Convert ? exports.PDFNet.Convert : {};
            PDFNet.Optimizer = {};
            exports.CoreControls && exports.CoreControls.enableFullPDF(!0);
            exports.isArrayBuffer = function(obj) {
                return obj instanceof ArrayBuffer || null !=
                    obj && null != obj.constructor && "ArrayBuffer" === obj.constructor.name && "number" === typeof obj.byteLength;
            };
            PDFNet.Destroyable = function() {
                if (this.constructor === PDFNet.Destroyable) throw Error("Can't instantiate abstract class!");
            };
            PDFNet.Destroyable.prototype.takeOwnership = function() {
                avoidCleanup(this.id);
            };
            PDFNet.Destroyable.prototype.destroy = function() {
                this.takeOwnership();
                return PDFNet.messageHandler.sendWithPromise(this.name + ".destroy", { auto_dealloc_obj: this.id }, this.userPriority);
            };
            PDFNet.createRefreshOptions =
                function() {
                    return Promise.resolve(new PDFNet.RefreshOptions);
                };
            PDFNet.RefreshOptions = function() {
                this.mImpl = {};
                this.mHelpers = optionsHelpers();
            };
            PDFNet.RefreshOptions.prototype.getDrawBackgroundOnly = function() {
                return "DrawBackgroundOnly" in mImpl ? !!mImpl.DrawBackgroundOnly : !0;
            };
            PDFNet.RefreshOptions.prototype.setDrawBackgroundOnly = function(value) {
                mHelpers.putBool(mImpl, "DrawBackgroundOnly", value);
                return this;
            };
            PDFNet.RefreshOptions.prototype.getRefreshExisting = function() {
                return "RefreshExisting" in mImpl ? !!mImpl.RefreshExisting :
                    !0;
            };
            PDFNet.RefreshOptions.prototype.setRefreshExisting = function(value) {
                mHelpers.putBool(mImpl, "RefreshExisting", value);
                return this;
            };
            PDFNet.RefreshOptions.prototype.getUseNonStandardRotation = function() {
                return "UseNonStandardRotation" in mImpl ? !!mImpl.UseNonStandardRotation : !1;
            };
            PDFNet.RefreshOptions.prototype.setUseNonStandardRotation = function(value) {
                mHelpers.putBool(mImpl, "UseNonStandardRotation", value);
                return this;
            };
            PDFNet.RefreshOptions.prototype.getUseRoundedCorners = function() {
                return "UseRoundedCorners" in
                mImpl ? !!mImpl.UseRoundedCorners : !1;
            };
            PDFNet.RefreshOptions.prototype.setUseRoundedCorners = function(value) {
                mHelpers.putBool(mImpl, "UseRoundedCorners", value);
                return this;
            };
            PDFNet.RefreshOptions.prototype.getJsonString = function() {
                return JSON.stringify(this.mImpl);
            };
            PDFNet.createDiffOptions = function() {
                return Promise.resolve(new PDFNet.DiffOptions);
            };
            PDFNet.DiffOptions = function() {
                this.mImpl = {};
                this.mHelpers = optionsHelpers();
            };
            PDFNet.DiffOptions.prototype.getAddGroupAnnots = function() {
                return "AddGroupAnnots" in
                this.mImpl ? !!this.mImpl.AddGroupAnnots : !1;
            };
            PDFNet.DiffOptions.prototype.setAddGroupAnnots = function(value) {
                this.mHelpers.putBool(this.mImpl, "AddGroupAnnots", value);
                return this;
            };
            PDFNet.DiffOptions.prototype.getBlendMode = function() {
                return "BlendMode" in this.mImpl ? this.mImpl.BlendMode : 5;
            };
            PDFNet.DiffOptions.prototype.setBlendMode = function(value) {
                this.mHelpers.putNumber(this.mImpl, "BlendMode", value);
                return this;
            };
            PDFNet.DiffOptions.prototype.getColorA = function() {
                return "ColorA" in this.mImpl ? this.mHelpers.jsColorFromNumber(this.mImpl.ColorA) :
                    this.mHelpers.jsColorFromNumber(4291559424);
            };
            PDFNet.DiffOptions.prototype.setColorA = function(value) {
                this.mHelpers.putNumber(this.mImpl, "ColorA", this.mHelpers.jsColorToNumber(value));
                return this;
            };
            PDFNet.DiffOptions.prototype.getColorB = function() {
                return "ColorB" in this.mImpl ? this.mHelpers.jsColorFromNumber(this.mImpl.ColorB) : this.mHelpers.jsColorFromNumber(4278242508);
            };
            PDFNet.DiffOptions.prototype.setColorB = function(value) {
                this.mHelpers.putNumber(this.mImpl, "ColorB", this.mHelpers.jsColorToNumber(value));
                return this;
            };
            PDFNet.DiffOptions.prototype.getJsonString = function() {
                return JSON.stringify(this.mImpl);
            };
            PDFNet.Action = function(id) {
                this.name = "Action";
                this.id = id;
            };
            PDFNet.ActionParameter = function(id) {
                this.name = "ActionParameter";
                this.id = id;
            };
            PDFNet.ActionParameter.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.Annot = function(id) {
                this.name = "Annot";
                this.id = id;
            };
            PDFNet.AnnotBorderStyle = function(id) {
                this.name = "AnnotBorderStyle";
                this.id = id;
            };
            PDFNet.AnnotBorderStyle.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.AppearanceReferenceList = function(id) {
                this.name = "AppearanceReferenceList";
                this.id = id;
            };
            PDFNet.AttrObj = function(id) {
                this.name = "AttrObj";
                this.id = id;
            };
            PDFNet.Bookmark = function(id) {
                this.name = "Bookmark";
                this.id = id;
            };
            PDFNet.ByteRange = function(m_offset, m_size) {
                this.name = "ByteRange";
                if (m_offset && "undefined" === typeof m_size) {
                    copyFunc(m_offset, this);
                } else {
                    return "undefined" === typeof m_offset && (m_offset = 0), "undefined" === typeof m_size && (m_size = 0), new PDFNet.ByteRange({
                        m_offset: m_offset,
                        m_size: m_size,
                    });
                }
            };
            PDFNet.CaretAnnot =
                function(id) {
                    this.name = "CaretAnnot";
                    this.id = id;
                };
            PDFNet.CheckBoxWidget = function(id) {
                this.name = "CheckBoxWidget";
                this.id = id;
            };
            PDFNet.ChunkRenderer = function(id) {
                this.name = "ChunkRenderer";
                this.id = id;
            };
            PDFNet.CircleAnnot = function(id) {
                this.name = "CircleAnnot";
                this.id = id;
            };
            PDFNet.ClassMap = function(id) {
                this.name = "ClassMap";
                this.id = id;
            };
            PDFNet.ColorPt = function(id) {
                this.name = "ColorPt";
                this.id = id;
            };
            PDFNet.ColorPt.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ColorSpace = function(id) {
                this.name = "ColorSpace";
                this.id = id;
            };
            PDFNet.ColorSpace.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ComboBoxWidget = function(id) {
                this.name = "ComboBoxWidget";
                this.id = id;
            };
            PDFNet.ContentItem = function(o, p) {
                this.name = "ContentItem";
                if (o && "undefined" === typeof p) {
                    copyFunc(o, this);
                } else {
                    return "undefined" === typeof o && (o = "0"), "undefined" === typeof p && (p = "0"), new PDFNet.ContentItem({
                        o: o,
                        p: p,
                    });
                }
            };
            PDFNet.ContentReplacer = function(id) {
                this.name = "ContentReplacer";
                this.id = id;
            };
            PDFNet.ContentReplacer.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ConversionMonitor = function(id) {
                this.name = "ConversionMonitor";
                this.id = id;
            };
            PDFNet.ConversionMonitor.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.Date = function(year, month, day, hour, minute, second, UT, UT_hour, UT_minutes, mp_obj) {
                this.name = "Date";
                if (year && "undefined" === typeof month) {
                    copyFunc(year, this);
                } else {
                    return "undefined" === typeof year && (year = 0), "undefined" === typeof month && (month = 0), "undefined" === typeof day && (day = 0), "undefined" === typeof hour && (hour = 0), "undefined" === typeof minute &&
                    (minute = 0), "undefined" === typeof second && (second = 0), "undefined" === typeof UT && (UT = 0), "undefined" === typeof UT_hour && (UT_hour = 0), "undefined" === typeof UT_minutes && (UT_minutes = 0), "undefined" === typeof mp_obj && (mp_obj = "0"), new PDFNet.Date({
                        year: year,
                        month: month,
                        day: day,
                        hour: hour,
                        minute: minute,
                        second: second,
                        UT: UT,
                        UT_hour: UT_hour,
                        UT_minutes: UT_minutes,
                        mp_obj: mp_obj,
                    });
                }
            };
            PDFNet.Destination = function(id) {
                this.name = "Destination";
                this.id = id;
            };
            PDFNet.DictIterator = function(id) {
                this.name = "DictIterator";
                this.id = id;
            };
            PDFNet.DictIterator.prototype =
                Object.create(PDFNet.Destroyable.prototype);
            PDFNet.DigestAlgorithm = function(id) {
                this.name = "DigestAlgorithm";
                this.id = id;
            };
            PDFNet.DigitalSignatureField = function(mp_field_dict_obj) {
                this.name = "DigitalSignatureField";
                if ("object" === _typeof(mp_field_dict_obj)) copyFunc(mp_field_dict_obj, this); else if ("undefined" !== typeof mp_field_dict_obj) return new PDFNet.DigitalSignatureField({ mp_field_dict_obj: mp_field_dict_obj });
            };
            PDFNet.DisallowedChange = function(id) {
                this.name = "DisallowedChange";
                this.id = id;
            };
            PDFNet.DisallowedChange.prototype =
                Object.create(PDFNet.Destroyable.prototype);
            PDFNet.DocSnapshot = function(id) {
                this.name = "DocSnapshot";
                this.id = id;
            };
            PDFNet.DocSnapshot.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.DocumentConversion = function(id) {
                this.name = "DocumentConversion";
                this.id = id;
            };
            PDFNet.Element = function(id) {
                this.name = "Element";
                this.id = id;
            };
            PDFNet.ElementBuilder = function(id) {
                this.name = "ElementBuilder";
                this.id = id;
            };
            PDFNet.ElementBuilder.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ElementReader = function(id) {
                this.name =
                    "ElementReader";
                this.id = id;
            };
            PDFNet.ElementReader.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ElementWriter = function(id) {
                this.name = "ElementWriter";
                this.id = id;
            };
            PDFNet.ElementWriter.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.EmbeddedTimestampVerificationResult = function(id) {
                this.name = "EmbeddedTimestampVerificationResult";
                this.id = id;
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.FDFDoc = function(id) {
                this.name = "FDFDoc";
                this.id = id;
            };
            PDFNet.FDFDoc.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.FDFField = function(mp_leaf_node, mp_root_array) {
                this.name = "FDFField";
                if (mp_leaf_node && "undefined" === typeof mp_root_array) {
                    copyFunc(mp_leaf_node, this);
                } else {
                    return "undefined" === typeof mp_leaf_node && (mp_leaf_node = "0"), "undefined" === typeof mp_root_array && (mp_root_array = "0"), new PDFNet.FDFField({
                        mp_leaf_node: mp_leaf_node,
                        mp_root_array: mp_root_array,
                    });
                }
            };
            PDFNet.Field = function(leaf_node, builder) {
                this.name = "Field";
                if (leaf_node &&
                    "undefined" === typeof builder) {
                    copyFunc(leaf_node, this);
                } else {
                    return "undefined" === typeof leaf_node && (leaf_node = "0"), "undefined" === typeof builder && (builder = "0"), new PDFNet.Field({
                        leaf_node: leaf_node,
                        builder: builder,
                    });
                }
            };
            PDFNet.FileAttachmentAnnot = function(id) {
                this.name = "FileAttachmentAnnot";
                this.id = id;
            };
            PDFNet.FileSpec = function(id) {
                this.name = "FileSpec";
                this.id = id;
            };
            PDFNet.Filter = function(id) {
                this.name = "Filter";
                this.id = id;
            };
            PDFNet.Filter.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.FilterReader =
                function(id) {
                    this.name = "FilterReader";
                    this.id = id;
                };
            PDFNet.FilterReader.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.FilterWriter = function(id) {
                this.name = "FilterWriter";
                this.id = id;
            };
            PDFNet.FilterWriter.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.Flattener = function(id) {
                this.name = "Flattener";
                this.id = id;
            };
            PDFNet.Flattener.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.Font = function(id) {
                this.name = "Font";
                this.id = id;
            };
            PDFNet.Font.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.FreeTextAnnot = function(id) {
                this.name = "FreeTextAnnot";
                this.id = id;
            };
            PDFNet.Function = function(id) {
                this.name = "Function";
                this.id = id;
            };
            PDFNet.Function.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.GState = function(id) {
                this.name = "GState";
                this.id = id;
            };
            PDFNet.GeometryCollection = function(id) {
                this.name = "GeometryCollection";
                this.id = id;
            };
            PDFNet.GeometryCollection.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.HighlightAnnot = function(id) {
                this.name = "HighlightAnnot";
                this.id = id;
            };
            PDFNet.Highlights =
                function(id) {
                    this.name = "Highlights";
                    this.id = id;
                };
            PDFNet.Highlights.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.Image = function(id) {
                this.name = "Image";
                this.id = id;
            };
            PDFNet.InkAnnot = function(id) {
                this.name = "InkAnnot";
                this.id = id;
            };
            PDFNet.Iterator = function(id, type) {
                this.name = "Iterator";
                this.id = id;
                this.type = type;
            };
            PDFNet.Iterator.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.KeyStrokeActionResult = function(id) {
                this.name = "KeyStrokeActionResult";
                this.id = id;
            };
            PDFNet.KeyStrokeActionResult.prototype =
                Object.create(PDFNet.Destroyable.prototype);
            PDFNet.KeyStrokeEventData = function(id) {
                this.name = "KeyStrokeEventData";
                this.id = id;
            };
            PDFNet.KeyStrokeEventData.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.LineAnnot = function(id) {
                this.name = "LineAnnot";
                this.id = id;
            };
            PDFNet.LinkAnnot = function(id) {
                this.name = "LinkAnnot";
                this.id = id;
            };
            PDFNet.ListBoxWidget = function(id) {
                this.name = "ListBoxWidget";
                this.id = id;
            };
            PDFNet.MarkupAnnot = function(id) {
                this.name = "MarkupAnnot";
                this.id = id;
            };
            PDFNet.Matrix2D = function(m_a,
                m_b, m_c, m_d, m_h, m_v) {
                this.name = "Matrix2D";
                if (m_a && "undefined" === typeof m_b) {
                    copyFunc(m_a, this);
                } else {
                    return "undefined" === typeof m_a && (m_a = 0), "undefined" === typeof m_b && (m_b = 0), "undefined" === typeof m_c && (m_c = 0), "undefined" === typeof m_d && (m_d = 0), "undefined" === typeof m_h && (m_h = 0), "undefined" === typeof m_v && (m_v = 0), new PDFNet.Matrix2D({
                        m_a: m_a,
                        m_b: m_b,
                        m_c: m_c,
                        m_d: m_d,
                        m_h: m_h,
                        m_v: m_v,
                    });
                }
            };
            PDFNet.MovieAnnot = function(id) {
                this.name = "MovieAnnot";
                this.id = id;
            };
            PDFNet.NameTree = function(id) {
                this.name = "NameTree";
                this.id =
                    id;
            };
            PDFNet.NumberTree = function(id) {
                this.name = "NumberTree";
                this.id = id;
            };
            PDFNet.OCG = function(id) {
                this.name = "OCG";
                this.id = id;
            };
            PDFNet.OCGConfig = function(id) {
                this.name = "OCGConfig";
                this.id = id;
            };
            PDFNet.OCGContext = function(id) {
                this.name = "OCGContext";
                this.id = id;
            };
            PDFNet.OCGContext.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.OCMD = function(id) {
                this.name = "OCMD";
                this.id = id;
            };
            PDFNet.Obj = function(id) {
                this.name = "Obj";
                this.id = id;
            };
            PDFNet.ObjSet = function(id) {
                this.name = "ObjSet";
                this.id = id;
            };
            PDFNet.ObjSet.prototype =
                Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ObjectIdentifier = function(id) {
                this.name = "ObjectIdentifier";
                this.id = id;
            };
            PDFNet.ObjectIdentifier.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.OwnedBitmap = function(id) {
                this.name = "OwnedBitmap";
                this.id = id;
            };
            PDFNet.PDFACompliance = function(id) {
                this.name = "PDFACompliance";
                this.id = id;
            };
            PDFNet.PDFACompliance.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.PDFDC = function(id) {
                this.name = "PDFDC";
                this.id = id;
            };
            PDFNet.PDFDCEX = function(id) {
                this.name =
                    "PDFDCEX";
                this.id = id;
            };
            PDFNet.PDFDoc = function(id) {
                this.name = "PDFDoc";
                this.id = id;
            };
            PDFNet.PDFDoc.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.PDFDocInfo = function(id) {
                this.name = "PDFDocInfo";
                this.id = id;
            };
            PDFNet.PDFDocViewPrefs = function(id) {
                this.name = "PDFDocViewPrefs";
                this.id = id;
            };
            PDFNet.PDFDraw = function(id) {
                this.name = "PDFDraw";
                this.id = id;
            };
            PDFNet.PDFDraw.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.PDFRasterizer = function(id) {
                this.name = "PDFRasterizer";
                this.id = id;
            };
            PDFNet.PDFRasterizer.prototype =
                Object.create(PDFNet.Destroyable.prototype);
            PDFNet.PDFView = function(id) {
                this.name = "PDFView";
                this.id = id;
            };
            PDFNet.PDFViewCtrl = function(id) {
                this.name = "PDFViewCtrl";
                this.id = id;
            };
            PDFNet.Page = function(id) {
                this.name = "Page";
                this.id = id;
            };
            PDFNet.PageLabel = function(mp_obj, m_first_page, m_last_page) {
                this.name = "PageLabel";
                if (mp_obj && "undefined" === typeof m_first_page) {
                    copyFunc(mp_obj, this);
                } else {
                    return "undefined" === typeof mp_obj && (mp_obj = "0"), "undefined" === typeof m_first_page && (m_first_page = 0), "undefined" === typeof m_last_page &&
                    (m_last_page = 0), new PDFNet.PageLabel({
                        mp_obj: mp_obj,
                        m_first_page: m_first_page,
                        m_last_page: m_last_page,
                    });
                }
            };
            PDFNet.PageSet = function(id) {
                this.name = "PageSet";
                this.id = id;
            };
            PDFNet.PageSet.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.PatternColor = function(id) {
                this.name = "PatternColor";
                this.id = id;
            };
            PDFNet.PatternColor.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.PolyLineAnnot = function(id) {
                this.name = "PolyLineAnnot";
                this.id = id;
            };
            PDFNet.PolygonAnnot = function(id) {
                this.name = "PolygonAnnot";
                this.id = id;
            };
            PDFNet.PopupAnnot = function(id) {
                this.name = "PopupAnnot";
                this.id = id;
            };
            PDFNet.PrinterMode = function(id) {
                this.name = "PrinterMode";
                this.id = id;
            };
            PDFNet.PushButtonWidget = function(id) {
                this.name = "PushButtonWidget";
                this.id = id;
            };
            PDFNet.RadioButtonGroup = function(id) {
                this.name = "RadioButtonGroup";
                this.id = id;
            };
            PDFNet.RadioButtonWidget = function(id) {
                this.name = "RadioButtonWidget";
                this.id = id;
            };
            PDFNet.Rect = function(x1, y1, x2, y2, mp_rect) {
                this.name = "Rect";
                if (x1 && "undefined" === typeof y1) {
                    copyFunc(x1, this);
                } else {
                    return "undefined" ===
                    typeof x1 && (x1 = 0), "undefined" === typeof y1 && (y1 = 0), "undefined" === typeof x2 && (x2 = 0), "undefined" === typeof y2 && (y2 = 0), "undefined" === typeof mp_rect && (mp_rect = "0"), new PDFNet.Rect({
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2,
                        mp_rect: mp_rect,
                    });
                }
            };
            PDFNet.Redaction = function(id) {
                this.name = "Redaction";
                this.id = id;
            };
            PDFNet.RedactionAnnot = function(id) {
                this.name = "RedactionAnnot";
                this.id = id;
            };
            PDFNet.Redactor = function(id) {
                this.name = "Redactor";
                this.id = id;
            };
            PDFNet.ResultSnapshot = function(id) {
                this.name = "ResultSnapshot";
                this.id = id;
            };
            PDFNet.ResultSnapshot.prototype =
                Object.create(PDFNet.Destroyable.prototype);
            PDFNet.RoleMap = function(id) {
                this.name = "RoleMap";
                this.id = id;
            };
            PDFNet.RubberStampAnnot = function(id) {
                this.name = "RubberStampAnnot";
                this.id = id;
            };
            PDFNet.SDFDoc = function(id) {
                this.name = "SDFDoc";
                this.id = id;
            };
            PDFNet.SElement = function(obj, k) {
                this.name = "SElement";
                if (obj && "undefined" === typeof k) {
                    copyFunc(obj, this);
                } else {
                    return "undefined" === typeof obj && (obj = "0"), "undefined" === typeof k && (k = "0"), new PDFNet.SElement({
                        obj: obj,
                        k: k,
                    });
                }
            };
            PDFNet.STree = function(id) {
                this.name = "STree";
                this.id = id;
            };
            PDFNet.ScreenAnnot = function(id) {
                this.name = "ScreenAnnot";
                this.id = id;
            };
            PDFNet.SecurityHandler = function(id) {
                this.name = "SecurityHandler";
                this.id = id;
            };
            PDFNet.SecurityHandler.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.Shading = function(id) {
                this.name = "Shading";
                this.id = id;
            };
            PDFNet.Shading.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ShapedText = function(id) {
                this.name = "ShapedText";
                this.id = id;
            };
            PDFNet.ShapedText.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.SignatureHandler =
                function(id) {
                    this.name = "SignatureHandler";
                    this.id = id;
                };
            PDFNet.SignatureWidget = function(id) {
                this.name = "SignatureWidget";
                this.id = id;
            };
            PDFNet.SoundAnnot = function(id) {
                this.name = "SoundAnnot";
                this.id = id;
            };
            PDFNet.SquareAnnot = function(id) {
                this.name = "SquareAnnot";
                this.id = id;
            };
            PDFNet.SquigglyAnnot = function(id) {
                this.name = "SquigglyAnnot";
                this.id = id;
            };
            PDFNet.Stamper = function(id) {
                this.name = "Stamper";
                this.id = id;
            };
            PDFNet.Stamper.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.StrikeOutAnnot = function(id) {
                this.name =
                    "StrikeOutAnnot";
                this.id = id;
            };
            PDFNet.TextAnnot = function(id) {
                this.name = "TextAnnot";
                this.id = id;
            };
            PDFNet.TextExtractor = function(id) {
                this.name = "TextExtractor";
                this.id = id;
            };
            PDFNet.TextExtractor.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.TextExtractorLine = function(line, uni, num, cur_num, m_direction, mp_bld) {
                this.name = "TextExtractorLine";
                if (line && "undefined" === typeof uni) {
                    copyFunc(line, this);
                } else {
                    return "undefined" === typeof line && (line = "0"), "undefined" === typeof uni && (uni = "0"), "undefined" === typeof num &&
                    (num = 0), "undefined" === typeof cur_num && (cur_num = 0), "undefined" === typeof m_direction && (m_direction = 0), "undefined" === typeof mp_bld && (mp_bld = "0"), new PDFNet.TextExtractorLine({
                        line: line,
                        uni: uni,
                        num: num,
                        cur_num: cur_num,
                        m_direction: m_direction,
                        mp_bld: mp_bld,
                    });
                }
            };
            PDFNet.TextExtractorStyle = function(mp_imp) {
                this.name = "TextExtractorStyle";
                if ("object" === _typeof(mp_imp)) copyFunc(mp_imp, this); else if ("undefined" !== typeof mp_imp) return new PDFNet.TextExtractorStyle({ mp_imp: mp_imp });
            };
            PDFNet.TextExtractorWord = function(line,
                word, end, uni, num, cur_num, mp_bld) {
                this.name = "TextExtractorWord";
                if (line && "undefined" === typeof word) {
                    copyFunc(line, this);
                } else {
                    return "undefined" === typeof line && (line = "0"), "undefined" === typeof word && (word = "0"), "undefined" === typeof end && (end = "0"), "undefined" === typeof uni && (uni = "0"), "undefined" === typeof num && (num = 0), "undefined" === typeof cur_num && (cur_num = 0), "undefined" === typeof mp_bld && (mp_bld = "0"), new PDFNet.TextExtractorWord({
                        line: line,
                        word: word,
                        end: end,
                        uni: uni,
                        num: num,
                        cur_num: cur_num,
                        mp_bld: mp_bld,
                    });
                }
            };
            PDFNet.TextMarkupAnnot = function(id) {
                this.name = "TextMarkupAnnot";
                this.id = id;
            };
            PDFNet.TextSearch = function(id) {
                this.name = "TextSearch";
                this.id = id;
            };
            PDFNet.TextSearch.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.TextWidget = function(id) {
                this.name = "TextWidget";
                this.id = id;
            };
            PDFNet.TimestampingConfiguration = function(id) {
                this.name = "TimestampingConfiguration";
                this.id = id;
            };
            PDFNet.TimestampingConfiguration.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.TimestampingTestResult = function(id) {
                this.name =
                    "TimestampingTestResult";
                this.id = id;
            };
            PDFNet.TimestampingTestResult.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.TrustVerificationResult = function(id) {
                this.name = "TrustVerificationResult";
                this.id = id;
            };
            PDFNet.TrustVerificationResult.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.UnderlineAnnot = function(id) {
                this.name = "UnderlineAnnot";
                this.id = id;
            };
            PDFNet.UndoManager = function(id) {
                this.name = "UndoManager";
                this.id = id;
            };
            PDFNet.UndoManager.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.VerificationOptions = function(id) {
                this.name = "VerificationOptions";
                this.id = id;
            };
            PDFNet.VerificationOptions.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.VerificationResult = function(id) {
                this.name = "VerificationResult";
                this.id = id;
            };
            PDFNet.VerificationResult.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.ViewChangeCollection = function(id) {
                this.name = "ViewChangeCollection";
                this.id = id;
            };
            PDFNet.ViewChangeCollection.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.WatermarkAnnot =
                function(id) {
                    this.name = "WatermarkAnnot";
                    this.id = id;
                };
            PDFNet.WidgetAnnot = function(id) {
                this.name = "WidgetAnnot";
                this.id = id;
            };
            PDFNet.X501AttributeTypeAndValue = function(id) {
                this.name = "X501AttributeTypeAndValue";
                this.id = id;
            };
            PDFNet.X501AttributeTypeAndValue.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.X501DistinguishedName = function(id) {
                this.name = "X501DistinguishedName";
                this.id = id;
            };
            PDFNet.X501DistinguishedName.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.X509Certificate = function(id) {
                this.name =
                    "X509Certificate";
                this.id = id;
            };
            PDFNet.X509Certificate.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.X509Extension = function(id) {
                this.name = "X509Extension";
                this.id = id;
            };
            PDFNet.X509Extension.prototype = Object.create(PDFNet.Destroyable.prototype);
            PDFNet.QuadPoint = function(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
                this.name = "QuadPoint";
                if (p1x && "undefined" === typeof p1y) {
                    copyFunc(p1x, this);
                } else {
                    return "undefined" === typeof p1x && (p1x = 0), "undefined" === typeof p1y && (p1y = 0), "undefined" === typeof p2x && (p2x = 0), "undefined" ===
                    typeof p2y && (p2y = 0), "undefined" === typeof p3x && (p3x = 0), "undefined" === typeof p3y && (p3y = 0), "undefined" === typeof p4x && (p4x = 0), "undefined" === typeof p4y && (p4y = 0), new PDFNet.QuadPoint({
                        p1x: p1x,
                        p1y: p1y,
                        p2x: p2x,
                        p2y: p2y,
                        p3x: p3x,
                        p3y: p3y,
                        p4x: p4x,
                        p4y: p4y,
                    });
                }
            };
            PDFNet.Point = function(x, y) {
                this.name = "Point";
                if (x && "undefined" === typeof y) {
                    copyFunc(x, this);
                } else {
                    return "undefined" === typeof x && (x = 0), "undefined" === typeof y && (y = 0), new PDFNet.Point({
                        x: x,
                        y: y,
                    });
                }
            };
            PDFNet.Optimizer.createImageSettings = function() {
                return Promise.resolve(new PDFNet.Optimizer.ImageSettings);
            };
            PDFNet.Optimizer.ImageSettings = function() {
                this.m_max_pixels = 4294967295;
                this.m_max_dpi = 225;
                this.m_resample_dpi = 150;
                this.m_quality = 5;
                this.m_compression_mode = PDFNet.Optimizer.ImageSettings.CompressionMode.e_retain;
                this.m_downsample_mode = PDFNet.Optimizer.ImageSettings.DownsampleMode.e_default;
                this.m_force_changes = this.m_force_recompression = !1;
            };
            PDFNet.Optimizer.ImageSettings.prototype.setImageDPI = function(maximum, resampling) {
                this.m_max_dpi = maximum;
                this.m_resample_dpi = resampling;
                return this;
            };
            PDFNet.Optimizer.ImageSettings.prototype.setCompressionMode =
                function(mode) {
                    this.m_compression_mode = mode;
                    return this;
                };
            PDFNet.Optimizer.ImageSettings.prototype.setDownsampleMode = function(mode) {
                this.m_downsample_mode = mode;
                return this;
            };
            PDFNet.Optimizer.ImageSettings.prototype.setQuality = function(quality) {
                this.m_quality = quality;
                return this;
            };
            PDFNet.Optimizer.ImageSettings.prototype.forceRecompression = function(force) {
                this.m_force_recompression = force;
                return this;
            };
            PDFNet.Optimizer.ImageSettings.prototype.forceChanges = function(force) {
                this.m_force_changes = force;
                return this;
            };
            PDFNet.Optimizer.createMonoImageSettings = function() {
                return Promise.resolve(new PDFNet.Optimizer.MonoImageSettings);
            };
            PDFNet.Optimizer.MonoImageSettings = function() {
                this.m_max_pixels = 4294967295;
                this.m_max_dpi = 450;
                this.m_resample_dpi = 300;
                this.m_jbig2_threshold = 8.5;
                this.m_compression_mode = PDFNet.Optimizer.ImageSettings.CompressionMode.e_retain;
                this.m_downsample_mode = PDFNet.Optimizer.ImageSettings.DownsampleMode.e_default;
                this.m_force_changes = this.m_force_recompression = !1;
            };
            PDFNet.Optimizer.MonoImageSettings.prototype.setImageDPI =
                function(maximum, resampling) {
                    this.m_max_dpi = maximum;
                    this.m_resample_dpi = resampling;
                    return this;
                };
            PDFNet.Optimizer.MonoImageSettings.prototype.setCompressionMode = function(mode) {
                this.m_compression_mode = mode;
                return this;
            };
            PDFNet.Optimizer.MonoImageSettings.prototype.setDownsampleMode = function(mode) {
                this.m_downsample_mode = mode;
                return this;
            };
            PDFNet.Optimizer.MonoImageSettings.prototype.setJBIG2Threshold = function(jbig2_threshold) {
                this.m_jbig2_threshold = quality;
                return this;
            };
            PDFNet.Optimizer.MonoImageSettings.prototype.forceRecompression =
                function(force) {
                    this.m_force_recompression = force;
                    return this;
                };
            PDFNet.Optimizer.MonoImageSettings.prototype.forceChanges = function(force) {
                this.m_force_changes = force;
                return this;
            };
            PDFNet.Optimizer.createTextSettings = function() {
                return Promise.resolve(new PDFNet.Optimizer.TextSettings);
            };
            PDFNet.Optimizer.TextSettings = function() {
                this.m_embed_fonts = this.m_subset_fonts = !1;
            };
            PDFNet.Optimizer.TextSettings.prototype.subsetFonts = function(subset) {
                this.m_subset_fonts = subset;
                return this;
            };
            PDFNet.Optimizer.TextSettings.prototype.embedFonts =
                function(embed) {
                    this.m_embed_fonts = embed;
                    return this;
                };
            PDFNet.Optimizer.createOptimizerSettings = function() {
                return Promise.resolve(new PDFNet.Optimizer.OptimizerSettings);
            };
            PDFNet.Optimizer.OptimizerSettings = function() {
                this.color_image_settings = new PDFNet.Optimizer.ImageSettings;
                this.grayscale_image_settings = new PDFNet.Optimizer.ImageSettings;
                this.mono_image_settings = new PDFNet.Optimizer.MonoImageSettings;
                this.text_settings = new PDFNet.Optimizer.TextSettings;
                this.remove_custom = !0;
            };
            PDFNet.Optimizer.OptimizerSettings.prototype.setColorImageSettings =
                function(settings) {
                    this.color_image_settings = settings;
                    return this;
                };
            PDFNet.Optimizer.OptimizerSettings.prototype.setGrayscaleImageSettings = function(settings) {
                this.grayscale_image_settings = settings;
                return this;
            };
            PDFNet.Optimizer.OptimizerSettings.prototype.setMonoImageSettings = function(settings) {
                this.mono_image_settings = settings;
                return this;
            };
            PDFNet.Optimizer.OptimizerSettings.prototype.setTextSettings = function(settings) {
                this.text_settings = settings;
                return this;
            };
            PDFNet.Optimizer.OptimizerSettings.prototype.removeCustomEntries =
                function(should_remove) {
                    this.remove_custom = should_remove;
                    return this;
                };
            PDFNet.Optimizer.ImageSettings.CompressionMode = {
                e_retain: 0,
                e_flate: 1,
                e_jpeg: 2,
                e_jpeg2000: 3,
                e_none: 4,
            };
            PDFNet.Optimizer.ImageSettings.DownsampleMode = { e_off: 0, e_default: 1 };
            PDFNet.Optimizer.MonoImageSettings.CompressionMode = { e_jbig2: 0, e_flate: 1, e_none: 2 };
            PDFNet.Optimizer.MonoImageSettings.DownsampleMode = { e_off: 0, e_default: 1 };
            PDFNet.Convert.ConversionOptions = function() {
            };
            PDFNet.Convert.createOfficeToPDFOptions = function() {
                return Promise.resolve(new PDFNet.Convert.OfficeToPDFOptions);
            };
            PDFNet.Convert.OfficeToPDFOptions = function() {
                this.name = "PDFNet.Convert.ConversionOptions";
            };
            PDFNet.Convert.OfficeToPDFOptions.prototype.setLayoutResourcesPluginPath = function(value) {
                this.LayoutResourcesPluginPath = value;
                return this;
            };
            PDFNet.Convert.OfficeToPDFOptions.prototype.setResourceDocPath = function(value) {
                this.ResourceDocPath = value;
                return this;
            };
            PDFNet.Convert.OfficeToPDFOptions.prototype.setSmartSubstitutionPluginPath = function(value) {
                this.SmartSubstitutionPluginPath = value;
                return this;
            };
            PDFNet.Convert.OfficeToPDFOptions.prototype.setExcelDefaultCellBorderWidth =
                function(width) {
                    this.ExcelDefaultCellBorderWidth = width;
                    return this;
                };
            PDFNet.Convert.OverprintPreviewMode = { e_op_off: 0, e_op_on: 1, e_op_pdfx_on: 2 };
            PDFNet.Convert.XPSOutputCommonOptions = function() {
                this.name = "PDFNet.Convert.XPSOutputCommonOptions";
            };
            PDFNet.Convert.XPSOutputCommonOptions.prototype.setPrintMode = function(print_mode) {
                this.PRINTMODE = print_mode;
                return this;
            };
            PDFNet.Convert.XPSOutputCommonOptions.prototype.setDPI = function(dpi) {
                this.DPI = dpi;
                return this;
            };
            PDFNet.Convert.XPSOutputCommonOptions.prototype.setRenderPages =
                function(render) {
                    this.RENDER = render;
                    return this;
                };
            PDFNet.Convert.XPSOutputCommonOptions.prototype.setThickenLines = function(thicken) {
                this.THICKENLINES = thicken;
                return this;
            };
            PDFNet.Convert.XPSOutputCommonOptions.prototype.generateURLLinks = function(generate) {
                this.URL_LINKS = generate;
                return this;
            };
            PDFNet.Convert.XPSOutputCommonOptions.prototype.setOverprint = function(mode) {
                switch (mode) {
                case PDFNet.Convert.OverprintPreviewMode.e_op_off:
                    this.OVERPRINT_MODE = "OFF";
                    break;
                case PDFNet.Convert.OverprintPreviewMode.e_op_on:
                    this.OVERPRINT_MODE =
                        "ON";
                    break;
                case PDFNet.Convert.OverprintPreviewMode.e_op_pdfx_on:
                    this.OVERPRINT_MODE = "PDFX";
                    break;
                default:
                    console.log("unrecognized PDFNet.Convert.OverprintPreviewMode type: " + mode);
                }
                return this;
            };
            PDFNet.Convert.createXPSOutputOptions = function() {
                return Promise.resolve(new PDFNet.Convert.XPSOutputOptions);
            };
            PDFNet.Convert.XPSOutputOptions = function() {
                this.name = "PDFNet.Convert.XPSOutputOptions";
            };
            PDFNet.Convert.XPSOutputOptions.prototype = Object.create(PDFNet.Convert.XPSOutputCommonOptions.prototype);
            PDFNet.Convert.XPSOutputOptions.prototype.setOpenXps =
                function(openxps) {
                    this.OPENXPS = openxps;
                    return this;
                };
            PDFNet.Convert.FlattenFlag = { e_off: 0, e_simple: 1, e_fast: 2, e_high_quality: 3 };
            PDFNet.Convert.FlattenThresholdFlag = {
                e_very_strict: 0,
                e_strict: 1,
                e_default: 2,
                e_keep_most: 3,
                e_keep_all: 4,
            };
            PDFNet.Convert.AnnotationOutputFlag = { e_internal_xfdf: 0, e_external_xfdf: 1, e_flatten: 2 };
            PDFNet.Convert.createXODOutputOptions = function() {
                return Promise.resolve(new PDFNet.Convert.XODOutputOptions);
            };
            PDFNet.Convert.XODOutputOptions = function() {
                this.name = "PDFNet.Convert.XODOutputOptions";
            };
            PDFNet.Convert.XODOutputOptions.prototype = Object.create(PDFNet.Convert.XPSOutputCommonOptions.prototype);
            PDFNet.Convert.XODOutputOptions.prototype.setOutputThumbnails = function(include_thumbs) {
                this.NOTHUMBS = include_thumbs;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setOutputThumbnails = function(include_thumbs) {
                this.NOTHUMBS = include_thumbs;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setThumbnailSize = function(regular_size, large_size) {
                this.THUMB_SIZE = regular_size;
                this.LARGE_THUMB_SIZE =
                    large_size ? large_size : regular_size;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setElementLimit = function(element_limit) {
                this.ELEMENTLIMIT = element_limit;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setOpacityMaskWorkaround = function(opacity_render) {
                this.MASKRENDER = opacity_render;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setMaximumImagePixels = function(max_pixels) {
                this.MAX_IMAGE_PIXELS = max_pixels;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setFlattenContent =
                function(flatten) {
                    switch (flatten) {
                    case PDFNet.Convert.FlattenFlag.e_off:
                        this.FLATTEN_CONTENT = "OFF";
                        break;
                    case PDFNet.Convert.FlattenFlag.e_simple:
                        this.FLATTEN_CONTENT = "SIMPLE";
                        break;
                    case PDFNet.Convert.FlattenFlag.e_fast:
                        this.FLATTEN_CONTENT = "FAST";
                        break;
                    case PDFNet.Convert.FlattenFlag.e_high_quality:
                        this.FLATTEN_CONTENT = "HIGH_QUALITY";
                        break;
                    default:
                        console.log("unrecognized PDFNet.Convert.FlattenFlag type: " + flatten);
                    }
                    return this;
                };
            PDFNet.Convert.XODOutputOptions.prototype.setFlattenThreshold = function(threshold) {
                switch (threshold) {
                case PDFNet.Convert.FlattenThresholdFlag.e_very_strict:
                    this.FLATTEN_THRESHOLD =
                        "VERY_STRICT";
                    break;
                case PDFNet.Convert.FlattenThresholdFlag.e_strict:
                    this.FLATTEN_THRESHOLD = "STRICT";
                    break;
                case PDFNet.Convert.FlattenThresholdFlag.e_default:
                    this.FLATTEN_THRESHOLD = "DEFAULT";
                    break;
                case PDFNet.Convert.FlattenThresholdFlag.e_keep_most:
                    this.FLATTEN_THRESHOLD = "KEEP_MOST";
                    break;
                case PDFNet.Convert.FlattenThresholdFlag.e_keep_all:
                    this.FLATTEN_THRESHOLD = "KEEP_ALL";
                    break;
                default:
                    console.log("unrecognized PDFNet.Convert.FlattenThresholdFlag type: " + threshold);
                }
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setPreferJPG =
                function(prefer_jpg) {
                    this.PREFER_JPEG = prefer_jpg;
                    return this;
                };
            PDFNet.Convert.XODOutputOptions.prototype.setJPGQuality = function(quality) {
                this.JPEG_QUALITY = quality;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setSilverlightTextWorkaround = function(workaround) {
                this.REMOVE_ROTATED_TEXT = workaround;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setAnnotationOutput = function(annot_output) {
                switch (annot_output) {
                case PDFNet.Convert.AnnotationOutputFlag.e_internal_xfdf:
                    this.ANNOTATION_OUTPUT =
                        "INTERNAL";
                    break;
                case PDFNet.Convert.AnnotationOutputFlag.e_external_xfdf:
                    this.ANNOTATION_OUTPUT = "EXTERNAL";
                    break;
                case PDFNet.Convert.AnnotationOutputFlag.e_flatten:
                    this.ANNOTATION_OUTPUT = "FLATTEN";
                    break;
                default:
                    console.log("unrecognized PDFNet.Convert.AnnotationOutputFlag type: " + annot_output);
                }
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setExternalParts = function(generate) {
                this.EXTERNAL_PARTS = generate;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.setEncryptPassword = function(pass) {
                this.ENCRYPT_PASSWORD =
                    pass;
                return this;
            };
            PDFNet.Convert.XODOutputOptions.prototype.useSilverlightFlashCompatible = function(compatible) {
                this.COMPATIBLE_XOD = compatible;
                return this;
            };
            PDFNet.MarkupAnnot.prototype = new PDFNet.Annot;
            PDFNet.TextMarkupAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.CaretAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.LineAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.CircleAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.FileAttachmentAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.FreeTextAnnot.prototype =
                new PDFNet.MarkupAnnot;
            PDFNet.HighlightAnnot.prototype = new PDFNet.TextMarkupAnnot;
            PDFNet.InkAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.LinkAnnot.prototype = new PDFNet.Annot;
            PDFNet.MovieAnnot.prototype = new PDFNet.Annot;
            PDFNet.PolyLineAnnot.prototype = new PDFNet.LineAnnot;
            PDFNet.PolygonAnnot.prototype = new PDFNet.PolyLineAnnot;
            PDFNet.PopupAnnot.prototype = new PDFNet.Annot;
            PDFNet.RedactionAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.RubberStampAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.ScreenAnnot.prototype =
                new PDFNet.Annot;
            PDFNet.SoundAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.SquareAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.SquigglyAnnot.prototype = new PDFNet.TextMarkupAnnot;
            PDFNet.StrikeOutAnnot.prototype = new PDFNet.TextMarkupAnnot;
            PDFNet.TextAnnot.prototype = new PDFNet.MarkupAnnot;
            PDFNet.UnderlineAnnot.prototype = new PDFNet.TextMarkupAnnot;
            PDFNet.WatermarkAnnot.prototype = new PDFNet.Annot;
            PDFNet.WidgetAnnot.prototype = new PDFNet.Annot;
            PDFNet.SignatureWidget.prototype = new PDFNet.WidgetAnnot;
            PDFNet.ComboBoxWidget.prototype =
                new PDFNet.WidgetAnnot;
            PDFNet.ListBoxWidget.prototype = new PDFNet.WidgetAnnot;
            PDFNet.TextWidget.prototype = new PDFNet.WidgetAnnot;
            PDFNet.CheckBoxWidget.prototype = new PDFNet.WidgetAnnot;
            PDFNet.RadioButtonWidget.prototype = new PDFNet.WidgetAnnot;
            PDFNet.PushButtonWidget.prototype = new PDFNet.WidgetAnnot;
            PDFNet.PrinterMode.PaperSize = {
                e_custom: 0,
                e_letter: 1,
                e_letter_small: 2,
                e_tabloid: 3,
                e_ledger: 4,
                e_legal: 5,
                e_statement: 6,
                e_executive: 7,
                e_a3: 8,
                e_a4: 9,
                e_a4_mall: 10,
                e_a5: 11,
                e_b4_jis: 12,
                e_b5_jis: 13,
                e_folio: 14,
                e_quarto: 15,
                e_10x14: 16,
                e_11x17: 17,
                e_note: 18,
                e_envelope_9: 19,
                e_envelope_10: 20,
                e_envelope_11: 21,
                e_envelope_12: 22,
                e_envelope_14: 23,
                e_c_size_sheet: 24,
                e_d_size_sheet: 25,
                e_e_size_sheet: 26,
                e_envelope_dl: 27,
                e_envelope_c5: 28,
                e_envelope_c3: 29,
                e_envelope_c4: 30,
                e_envelope_c6: 31,
                e_envelope_c65: 32,
                e_envelope_b4: 33,
                e_envelope_b5: 34,
                e_envelope_b6: 35,
                e_envelope_italy: 36,
                e_envelope_monarch: 37,
                e_6_3_quarters_envelope: 38,
                e_us_std_fanfold: 39,
                e_german_std_fanfold: 40,
                e_german_legal_fanfold: 41,
                e_b4_iso: 42,
                e_japanese_postcard: 43,
                e_9x11: 44,
                e_10x11: 45,
                e_15x11: 46,
                e_envelope_invite: 47,
                e_reserved_48: 48,
                e_reserved_49: 49,
                e_letter_extra: 50,
                e_legal_extra: 51,
                e_tabloid_extra: 52,
                e_a4_extra: 53,
                e_letter_transverse: 54,
                e_a4_transverse: 55,
                e_letter_extra_transverse: 56,
                e_supera_supera_a4: 57,
                e_Superb_Superb_a3: 58,
                e_letter_plus: 59,
                e_a4_plus: 60,
                e_a5_transverse: 61,
                e_b5_jis_transverse: 62,
                e_a3_extra: 63,
                e_a5_extra: 64,
                e_b5_iso_extra: 65,
                e_a2: 66,
                e_a3_transverse: 67,
                e_a3_extra_transverse: 68,
                e_japanese_double_postcard: 69,
                e_a6: 70,
                e_japanese_envelope_kaku_2: 71,
                e_japanese_envelope_kaku_3: 72,
                e_japanese_envelope_chou_3: 73,
                e_japanese_envelope_chou_4: 74,
                e_letter_rotated: 75,
                e_a3_rotated: 76,
                e_a4_rotated: 77,
                e_a5_rotated: 78,
                e_b4_jis_rotated: 79,
                e_b5_jis_rotated: 80,
                e_japanese_postcard_rotated: 81,
                e_double_japanese_postcard_rotated: 82,
                e_a6_rotated: 83,
                e_japanese_envelope_kaku_2_rotated: 84,
                e_japanese_envelope_kaku_3_rotated: 85,
                e_japanese_envelope_chou_3_rotated: 86,
                e_japanese_envelope_chou_4_rotated: 87,
                e_b6_jis: 88,
                e_b6_jis_rotated: 89,
                e_12x11: 90,
                e_japanese_envelope_you_4: 91,
                e_japanese_envelope_you_4_rotated: 92,
                e_PrinterMode_prc_16k: 93,
                e_prc_32k: 94,
                e_prc_32k_big: 95,
                e_prc_envelop_1: 96,
                e_prc_envelop_2: 97,
                e_prc_envelop_3: 98,
                e_prc_envelop_4: 99,
                e_prc_envelop_5: 100,
                e_prc_envelop_6: 101,
                e_prc_envelop_7: 102,
                e_prc_envelop_8: 103,
                e_prc_envelop_9: 104,
                e_prc_envelop_10: 105,
                e_prc_16k_rotated: 106,
                e_prc_32k_rotated: 107,
                e_prc_32k_big__rotated: 108,
                e_prc_envelop_1_rotated: 109,
                e_prc_envelop_2_rotated: 110,
                e_prc_envelop_3_rotated: 111,
                e_prc_envelop_4_rotated: 112,
                e_prc_envelop_5_rotated: 113,
                e_prc_envelop_6_rotated: 114,
                e_prc_envelop_7_rotated: 115,
                e_prc_envelop_8_rotated: 116,
                e_prc_envelop_9_rotated: 117,
                e_prc_envelop_10_rotated: 118,
            };
            PDFNet.Field.EventType = {
                e_action_trigger_keystroke: 13,
                e_action_trigger_format: 14,
                e_action_trigger_validate: 15,
                e_action_trigger_calculate: 16,
            };
            PDFNet.Field.Type = {
                e_button: 0,
                e_check: 1,
                e_radio: 2,
                e_text: 3,
                e_choice: 4,
                e_signature: 5,
                e_null: 6,
            };
            PDFNet.Field.Flag = {
                e_read_only: 0,
                e_required: 1,
                e_no_export: 2,
                e_pushbutton_flag: 3,
                e_radio_flag: 4,
                e_toggle_to_off: 5,
                e_radios_in_unison: 6,
                e_multiline: 7,
                e_password: 8,
                e_file_select: 9,
                e_no_spellcheck: 10,
                e_no_scroll: 11,
                e_comb: 12,
                e_rich_text: 13,
                e_combo: 14,
                e_edit: 15,
                e_sort: 16,
                e_multiselect: 17,
                e_commit_on_sel_change: 18,
            };
            PDFNet.Field.TextJustification = { e_left_justified: 0, e_centered: 1, e_right_justified: 2 };
            PDFNet.Filter.StdFileOpenMode = { e_read_mode: 0, e_write_mode: 1, e_append_mode: 2 };
            PDFNet.Filter.ReferencePos = { e_begin: 0, e_end: 2, e_cur: 1 };
            PDFNet.OCGContext.OCDrawMode = { e_VisibleOC: 0, e_AllOC: 1, e_NoOC: 2 };
            PDFNet.OCMD.VisibilityPolicyType = { e_AllOn: 0, e_AnyOn: 1, e_AnyOff: 2, e_AllOff: 3 };
            PDFNet.PDFACompliance.Conformance =
                {
                    e_Level1A: 1,
                    e_Level1B: 2,
                    e_Level2A: 3,
                    e_Level2B: 4,
                    e_Level2U: 5,
                    e_Level3A: 6,
                    e_Level3B: 7,
                    e_Level3U: 8,
                };
            PDFNet.PDFACompliance.ErrorCode = {
                e_PDFA0_1_0: 10,
                e_PDFA0_1_1: 11,
                e_PDFA0_1_2: 12,
                e_PDFA0_1_3: 13,
                e_PDFA0_1_4: 14,
                e_PDFA0_1_5: 15,
                e_PDFA1_2_1: 121,
                e_PDFA1_2_2: 122,
                e_PDFA1_3_1: 131,
                e_PDFA1_3_2: 132,
                e_PDFA1_3_3: 133,
                e_PDFA1_3_4: 134,
                e_PDFA1_4_1: 141,
                e_PDFA1_4_2: 142,
                e_PDFA1_6_1: 161,
                e_PDFA1_7_1: 171,
                e_PDFA1_7_2: 172,
                e_PDFA1_7_3: 173,
                e_PDFA1_7_4: 174,
                e_PDFA1_8_1: 181,
                e_PDFA1_8_2: 182,
                e_PDFA1_8_3: 183,
                e_PDFA1_8_4: 184,
                e_PDFA1_8_5: 185,
                e_PDFA1_8_6: 186,
                e_PDFA1_10_1: 1101,
                e_PDFA1_11_1: 1111,
                e_PDFA1_11_2: 1112,
                e_PDFA1_12_1: 1121,
                e_PDFA1_12_2: 1122,
                e_PDFA1_12_3: 1123,
                e_PDFA1_12_4: 1124,
                e_PDFA1_12_5: 1125,
                e_PDFA1_12_6: 1126,
                e_PDFA1_13_1: 1131,
                e_PDFA2_2_1: 221,
                e_PDFA2_3_2: 232,
                e_PDFA2_3_3: 233,
                e_PDFA2_3_3_1: 2331,
                e_PDFA2_3_3_2: 2332,
                e_PDFA2_3_4_1: 2341,
                e_PDFA2_4_1: 241,
                e_PDFA2_4_2: 242,
                e_PDFA2_4_3: 243,
                e_PDFA2_4_4: 244,
                e_PDFA2_5_1: 251,
                e_PDFA2_5_2: 252,
                e_PDFA2_6_1: 261,
                e_PDFA2_7_1: 271,
                e_PDFA2_8_1: 281,
                e_PDFA2_9_1: 291,
                e_PDFA2_10_1: 2101,
                e_PDFA3_2_1: 321,
                e_PDFA3_3_1: 331,
                e_PDFA3_3_2: 332,
                e_PDFA3_3_3_1: 3331,
                e_PDFA3_3_3_2: 3332,
                e_PDFA3_4_1: 341,
                e_PDFA3_5_1: 351,
                e_PDFA3_5_2: 352,
                e_PDFA3_5_3: 353,
                e_PDFA3_5_4: 354,
                e_PDFA3_5_5: 355,
                e_PDFA3_5_6: 356,
                e_PDFA3_6_1: 361,
                e_PDFA3_7_1: 371,
                e_PDFA3_7_2: 372,
                e_PDFA3_7_3: 373,
                e_PDFA4_1: 41,
                e_PDFA4_2: 42,
                e_PDFA4_3: 43,
                e_PDFA4_4: 44,
                e_PDFA4_5: 45,
                e_PDFA4_6: 46,
                e_PDFA5_2_1: 521,
                e_PDFA5_2_2: 522,
                e_PDFA5_2_3: 523,
                e_PDFA5_2_4: 524,
                e_PDFA5_2_5: 525,
                e_PDFA5_2_6: 526,
                e_PDFA5_2_7: 527,
                e_PDFA5_2_8: 528,
                e_PDFA5_2_9: 529,
                e_PDFA5_2_10: 5210,
                e_PDFA5_2_11: 5211,
                e_PDFA5_3_1: 531,
                e_PDFA5_3_2_1: 5321,
                e_PDFA5_3_2_2: 5322,
                e_PDFA5_3_2_3: 5323,
                e_PDFA5_3_2_4: 5324,
                e_PDFA5_3_2_5: 5325,
                e_PDFA5_3_3_1: 5331,
                e_PDFA5_3_3_2: 5332,
                e_PDFA5_3_3_3: 5333,
                e_PDFA5_3_3_4: 5334,
                e_PDFA5_3_4_0: 5340,
                e_PDFA5_3_4_1: 5341,
                e_PDFA5_3_4_2: 5342,
                e_PDFA5_3_4_3: 5343,
                e_PDFA6_1_1: 611,
                e_PDFA6_1_2: 612,
                e_PDFA6_2_1: 621,
                e_PDFA6_2_2: 622,
                e_PDFA6_2_3: 623,
                e_PDFA7_2_1: 721,
                e_PDFA7_2_2: 722,
                e_PDFA7_2_3: 723,
                e_PDFA7_2_4: 724,
                e_PDFA7_2_5: 725,
                e_PDFA7_3_1: 731,
                e_PDFA7_3_2: 732,
                e_PDFA7_3_3: 733,
                e_PDFA7_3_4: 734,
                e_PDFA7_3_5: 735,
                e_PDFA7_3_6: 736,
                e_PDFA7_3_7: 737,
                e_PDFA7_3_8: 738,
                e_PDFA7_3_9: 739,
                e_PDFA7_5_1: 751,
                e_PDFA7_8_1: 781,
                e_PDFA7_8_2: 782,
                e_PDFA7_8_3: 783,
                e_PDFA7_8_4: 784,
                e_PDFA7_8_5: 785,
                e_PDFA7_8_6: 786,
                e_PDFA7_8_7: 787,
                e_PDFA7_8_8: 788,
                e_PDFA7_8_9: 789,
                e_PDFA7_8_10: 7810,
                e_PDFA7_8_11: 7811,
                e_PDFA7_8_12: 7812,
                e_PDFA7_8_13: 7813,
                e_PDFA7_8_14: 7814,
                e_PDFA7_8_15: 7815,
                e_PDFA7_8_16: 7816,
                e_PDFA7_8_17: 7817,
                e_PDFA7_8_18: 7818,
                e_PDFA7_8_19: 7819,
                e_PDFA7_8_20: 7820,
                e_PDFA7_8_21: 7821,
                e_PDFA7_8_22: 7822,
                e_PDFA7_8_23: 7823,
                e_PDFA7_8_24: 7824,
                e_PDFA7_8_25: 7825,
                e_PDFA7_8_26: 7826,
                e_PDFA7_8_27: 7827,
                e_PDFA7_8_28: 7828,
                e_PDFA7_8_29: 7829,
                e_PDFA7_8_30: 7830,
                e_PDFA7_8_31: 7831,
                e_PDFA7_11_1: 7111,
                e_PDFA7_11_2: 7112,
                e_PDFA7_11_3: 7113,
                e_PDFA7_11_4: 7114,
                e_PDFA7_11_5: 7115,
                e_PDFA9_1: 91,
                e_PDFA9_2: 92,
                e_PDFA9_3: 93,
                e_PDFA9_4: 94,
                e_PDFA3_8_1: 381,
                e_PDFA8_2_2: 822,
                e_PDFA8_3_3_1: 8331,
                e_PDFA8_3_3_2: 8332,
                e_PDFA8_3_4_1: 8341,
                e_PDFA1_2_3: 123,
                e_PDFA1_10_2: 1102,
                e_PDFA1_10_3: 1103,
                e_PDFA1_12_10: 11210,
                e_PDFA1_13_5: 1135,
                e_PDFA2_3_10: 2310,
                e_PDFA2_4_2_10: 24220,
                e_PDFA2_4_2_11: 24221,
                e_PDFA2_4_2_12: 24222,
                e_PDFA2_4_2_13: 24223,
                e_PDFA2_5_10: 2510,
                e_PDFA2_5_11: 2511,
                e_PDFA2_5_12: 2512,
                e_PDFA2_8_3_1: 2831,
                e_PDFA2_8_3_2: 2832,
                e_PDFA2_8_3_3: 2833,
                e_PDFA2_8_3_4: 2834,
                e_PDFA2_8_3_5: 2835,
                e_PDFA2_10_20: 21020,
                e_PDFA2_10_21: 21021,
                e_PDFA11_0_0: 11E3,
                e_PDFA6_2_11_8: 62118,
                e_PDFA8_1: 81,
                e_PDFA_3E1: 1,
                e_PDFA_3E2: 2,
                e_PDFA_3E3: 3,
                e_PDFA_LAST: 4,
            };
            PDFNet.ContentItem.Type = { e_MCR: 0, e_MCID: 1, e_OBJR: 2, e_Unknown: 3 };
            PDFNet.Action.Type = {
                e_GoTo: 0,
                e_GoToR: 1,
                e_GoToE: 2,
                e_Launch: 3,
                e_Thread: 4,
                e_URI: 5,
                e_Sound: 6,
                e_Movie: 7,
                e_Hide: 8,
                e_Named: 9,
                e_SubmitForm: 10,
                e_ResetForm: 11,
                e_ImportData: 12,
                e_JavaScript: 13,
                e_SetOCGState: 14,
                e_Rendition: 15,
                e_Trans: 16,
                e_GoTo3DView: 17,
                e_RichMediaExecute: 18,
                e_Unknown: 19,
            };
            PDFNet.Action.FormActionFlag = {
                e_exclude: 0,
                e_include_no_value_fields: 1,
                e_export_format: 2,
                e_get_method: 3,
                e_submit_coordinates: 4,
                e_xfdf: 5,
                e_include_append_saves: 6,
                e_include_annotations: 7,
                e_submit_pdf: 8,
                e_canonical_format: 9,
                e_excl_non_user_annots: 10,
                e_excl_F_key: 11,
                e_embed_form: 13,
            };
            PDFNet.Page.EventType = { e_action_trigger_page_open: 11, e_action_trigger_page_close: 12 };
            PDFNet.Page.Box =
                { e_media: 0, e_crop: 1, e_bleed: 2, e_trim: 3, e_art: 4 };
            PDFNet.Page.Rotate = { e_0: 0, e_90: 1, e_180: 2, e_270: 3 };
            PDFNet.Annot.EventType = {
                e_action_trigger_activate: 0,
                e_action_trigger_annot_enter: 1,
                e_action_trigger_annot_exit: 2,
                e_action_trigger_annot_down: 3,
                e_action_trigger_annot_up: 4,
                e_action_trigger_annot_focus: 5,
                e_action_trigger_annot_blur: 6,
                e_action_trigger_annot_page_open: 7,
                e_action_trigger_annot_page_close: 8,
                e_action_trigger_annot_page_visible: 9,
                e_action_trigger_annot_page_invisible: 10,
            };
            PDFNet.Annot.Type = {
                e_Text: 0,
                e_Link: 1,
                e_FreeText: 2,
                e_Line: 3,
                e_Square: 4,
                e_Circle: 5,
                e_Polygon: 6,
                e_Polyline: 7,
                e_Highlight: 8,
                e_Underline: 9,
                e_Squiggly: 10,
                e_StrikeOut: 11,
                e_Stamp: 12,
                e_Caret: 13,
                e_Ink: 14,
                e_Popup: 15,
                e_FileAttachment: 16,
                e_Sound: 17,
                e_Movie: 18,
                e_Widget: 19,
                e_Screen: 20,
                e_PrinterMark: 21,
                e_TrapNet: 22,
                e_Watermark: 23,
                e_3D: 24,
                e_Redact: 25,
                e_Projection: 26,
                e_RichMedia: 27,
                e_Unknown: 28,
            };
            PDFNet.Annot.Flag = {
                e_invisible: 0,
                e_hidden: 1,
                e_print: 2,
                e_no_zoom: 3,
                e_no_rotate: 4,
                e_no_view: 5,
                e_annot_read_only: 6,
                e_locked: 7,
                e_toggle_no_view: 8,
                e_locked_contents: 9,
            };
            PDFNet.AnnotBorderStyle.Style = { e_solid: 0, e_dashed: 1, e_beveled: 2, e_inset: 3, e_underline: 4 };
            PDFNet.Annot.State = { e_normal: 0, e_rollover: 1, e_down: 2 };
            PDFNet.LineAnnot.EndingStyle = {
                e_Square: 0,
                e_Circle: 1,
                e_Diamond: 2,
                e_OpenArrow: 3,
                e_ClosedArrow: 4,
                e_Butt: 5,
                e_ROpenArrow: 6,
                e_RClosedArrow: 7,
                e_Slash: 8,
                e_None: 9,
                e_Unknown: 10,
            };
            PDFNet.LineAnnot.IntentType = { e_LineArrow: 0, e_LineDimension: 1, e_null: 2 };
            PDFNet.LineAnnot.CapPos = { e_Inline: 0, e_Top: 1 };
            PDFNet.FileAttachmentAnnot.Icon = {
                e_Graph: 0, e_PushPin: 1, e_Paperclip: 2, e_Tag: 3,
                e_Unknown: 4,
            };
            PDFNet.FreeTextAnnot.IntentName = {
                e_FreeText: 0,
                e_FreeTextCallout: 1,
                e_FreeTextTypeWriter: 2,
                e_Unknown: 3,
            };
            PDFNet.LinkAnnot.HighlightingMode = { e_none: 0, e_invert: 1, e_outline: 2, e_push: 3 };
            PDFNet.MarkupAnnot.BorderEffect = { e_None: 0, e_Cloudy: 1 };
            PDFNet.PolyLineAnnot.IntentType = {
                e_PolygonCloud: 0,
                e_PolyLineDimension: 1,
                e_PolygonDimension: 2,
                e_Unknown: 3,
            };
            PDFNet.RedactionAnnot.QuadForm = { e_LeftJustified: 0, e_Centered: 1, e_RightJustified: 2, e_None: 3 };
            PDFNet.RubberStampAnnot.Icon = {
                e_Approved: 0,
                e_Experimental: 1,
                e_NotApproved: 2,
                e_AsIs: 3,
                e_Expired: 4,
                e_NotForPublicRelease: 5,
                e_Confidential: 6,
                e_Final: 7,
                e_Sold: 8,
                e_Departmental: 9,
                e_ForComment: 10,
                e_TopSecret: 11,
                e_ForPublicRelease: 12,
                e_Draft: 13,
                e_Unknown: 14,
            };
            PDFNet.ScreenAnnot.ScaleType = { e_Anamorphic: 0, e_Proportional: 1 };
            PDFNet.ScreenAnnot.ScaleCondition = { e_Always: 0, e_WhenBigger: 1, e_WhenSmaller: 2, e_Never: 3 };
            PDFNet.ScreenAnnot.IconCaptionRelation = {
                e_NoIcon: 0,
                e_NoCaption: 1,
                e_CBelowI: 2,
                e_CAboveI: 3,
                e_CRightILeft: 4,
                e_CLeftIRight: 5,
                e_COverlayI: 6,
            };
            PDFNet.SoundAnnot.Icon =
                { e_Speaker: 0, e_Mic: 1, e_Unknown: 2 };
            PDFNet.TextAnnot.Icon = {
                e_Comment: 0,
                e_Key: 1,
                e_Help: 2,
                e_NewParagraph: 3,
                e_Paragraph: 4,
                e_Insert: 5,
                e_Note: 6,
                e_Unknown: 7,
            };
            PDFNet.WidgetAnnot.HighlightingMode = { e_none: 0, e_invert: 1, e_outline: 2, e_push: 3, e_toggle: 4 };
            PDFNet.WidgetAnnot.ScaleType = { e_Anamorphic: 0, e_Proportional: 1 };
            PDFNet.WidgetAnnot.IconCaptionRelation = {
                e_NoIcon: 0,
                e_NoCaption: 1,
                e_CBelowI: 2,
                e_CAboveI: 3,
                e_CRightILeft: 4,
                e_CLeftIRight: 5,
                e_COverlayI: 6,
            };
            PDFNet.WidgetAnnot.ScaleCondition = {
                e_Always: 0, e_WhenBigger: 1, e_WhenSmaller: 2,
                e_Never: 3,
            };
            PDFNet.ColorSpace.Type = {
                e_device_gray: 0,
                e_device_rgb: 1,
                e_device_cmyk: 2,
                e_cal_gray: 3,
                e_cal_rgb: 4,
                e_lab: 5,
                e_icc: 6,
                e_indexed: 7,
                e_pattern: 8,
                e_separation: 9,
                e_device_n: 10,
                e_null: 11,
            };
            PDFNet.DocumentConversion.Result = { e_Success: 0, e_Incomplete: 1, e_Failure: 2 };
            PDFNet.Convert.PrinterMode = {
                e_auto: 0,
                e_interop_only: 1,
                e_printer_only: 2,
                e_prefer_builtin_converter: 3,
            };
            PDFNet.Destination.FitType = {
                e_XYZ: 0,
                e_Fit: 1,
                e_FitH: 2,
                e_FitV: 3,
                e_FitR: 4,
                e_FitB: 5,
                e_FitBH: 6,
                e_FitBV: 7,
            };
            PDFNet.GState.Attribute = {
                e_transform: 0,
                e_rendering_intent: 1,
                e_stroke_cs: 2,
                e_stroke_color: 3,
                e_fill_cs: 4,
                e_fill_color: 5,
                e_line_width: 6,
                e_line_cap: 7,
                e_line_join: 8,
                e_flatness: 9,
                e_miter_limit: 10,
                e_dash_pattern: 11,
                e_char_spacing: 12,
                e_word_spacing: 13,
                e_horizontal_scale: 14,
                e_leading: 15,
                e_font: 16,
                e_font_size: 17,
                e_text_render_mode: 18,
                e_text_rise: 19,
                e_text_knockout: 20,
                e_text_pos_offset: 21,
                e_blend_mode: 22,
                e_opacity_fill: 23,
                e_opacity_stroke: 24,
                e_alpha_is_shape: 25,
                e_soft_mask: 26,
                e_smoothnes: 27,
                e_auto_stoke_adjust: 28,
                e_stroke_overprint: 29,
                e_fill_overprint: 30,
                e_overprint_mode: 31,
                e_transfer_funct: 32,
                e_BG_funct: 33,
                e_UCR_funct: 34,
                e_halftone: 35,
                e_null: 36,
            };
            PDFNet.GState.LineCap = { e_butt_cap: 0, e_round_cap: 1, e_square_cap: 2 };
            PDFNet.GState.LineJoin = { e_miter_join: 0, e_round_join: 1, e_bevel_join: 2 };
            PDFNet.GState.TextRenderingMode = {
                e_fill_text: 0,
                e_stroke_text: 1,
                e_fill_stroke_text: 2,
                e_invisible_text: 3,
                e_fill_clip_text: 4,
                e_stroke_clip_text: 5,
                e_fill_stroke_clip_text: 6,
                e_clip_text: 7,
            };
            PDFNet.GState.RenderingIntent = {
                e_absolute_colorimetric: 0, e_relative_colorimetric: 1, e_saturation: 2,
                e_perceptual: 3,
            };
            PDFNet.GState.BlendMode = {
                e_bl_compatible: 0,
                e_bl_normal: 1,
                e_bl_multiply: 2,
                e_bl_screen: 3,
                e_bl_difference: 4,
                e_bl_darken: 5,
                e_bl_lighten: 6,
                e_bl_color_dodge: 7,
                e_bl_color_burn: 8,
                e_bl_exclusion: 9,
                e_bl_hard_light: 10,
                e_bl_overlay: 11,
                e_bl_soft_light: 12,
                e_bl_luminosity: 13,
                e_bl_hue: 14,
                e_bl_saturation: 15,
                e_bl_color: 16,
            };
            PDFNet.Element.Type = {
                e_null: 0,
                e_path: 1,
                e_text_begin: 2,
                e_text: 3,
                e_text_new_line: 4,
                e_text_end: 5,
                e_image: 6,
                e_inline_image: 7,
                e_shading: 8,
                e_form: 9,
                e_group_begin: 10,
                e_group_end: 11,
                e_marked_content_begin: 12,
                e_marked_content_end: 13,
                e_marked_content_point: 14,
            };
            PDFNet.Element.PathSegmentType = {
                e_moveto: 1,
                e_lineto: 2,
                e_cubicto: 3,
                e_conicto: 4,
                e_rect: 5,
                e_closepath: 6,
            };
            PDFNet.ShapedText.ShapingStatus = { e_FullShaping: 0, e_PartialShaping: 1, e_NoShaping: 2 };
            PDFNet.ShapedText.FailureReason = {
                e_NoFailure: 0,
                e_UnsupportedFontType: 1,
                e_NotIndexEncoded: 2,
                e_FontDataNotFound: 3,
            };
            PDFNet.ElementWriter.WriteMode = { e_underlay: 0, e_overlay: 1, e_replacement: 2 };
            PDFNet.Flattener.Threshold = {
                e_very_strict: 0, e_strict: 1, e_default: 2, e_keep_most: 3,
                e_keep_all: 4,
            };
            PDFNet.Flattener.Mode = { e_simple: 0, e_fast: 1 };
            PDFNet.Font.StandardType1Font = {
                e_times_roman: 0,
                e_times_bold: 1,
                e_times_italic: 2,
                e_times_bold_italic: 3,
                e_helvetica: 4,
                e_helvetica_bold: 5,
                e_helvetica_oblique: 6,
                e_helvetica_bold_oblique: 7,
                e_courier: 8,
                e_courier_bold: 9,
                e_courier_oblique: 10,
                e_courier_bold_oblique: 11,
                e_symbol: 12,
                e_zapf_dingbats: 13,
                e_null: 14,
            };
            PDFNet.Font.Encoding = { e_IdentityH: 0, e_Indices: 1 };
            PDFNet.Font.Type = {
                e_Type1: 0,
                e_TrueType: 1,
                e_MMType1: 2,
                e_Type3: 3,
                e_Type0: 4,
                e_CIDType0: 5,
                e_CIDType2: 6,
            };
            PDFNet.Function.Type = { e_sampled: 0, e_exponential: 2, e_stitching: 3, e_postscript: 4 };
            PDFNet.Image.InputFilter = { e_none: 0, e_jpeg: 1, e_jp2: 2, e_flate: 3, e_g3: 4, e_g4: 5, e_ascii_hex: 6 };
            PDFNet.PageLabel.Style = {
                e_decimal: 0,
                e_roman_uppercase: 1,
                e_roman_lowercase: 2,
                e_alphabetic_uppercase: 3,
                e_alphabetic_lowercase: 4,
                e_none: 5,
            };
            PDFNet.PageSet.Filter = { e_all: 0, e_even: 1, e_odd: 2 };
            PDFNet.PatternColor.Type = {
                e_uncolored_tiling_pattern: 0,
                e_colored_tiling_pattern: 1,
                e_shading: 2,
                e_null: 3,
            };
            PDFNet.PatternColor.TilingType = {
                e_constant_spacing: 0,
                e_no_distortion: 1, e_constant_spacing_fast_fill: 2,
            };
            PDFNet.GeometryCollection.SnappingMode = {
                e_DefaultSnapMode: 14,
                e_PointOnLine: 1,
                e_LineMidpoint: 2,
                e_LineIntersection: 4,
                e_PathEndpoint: 8,
            };
            PDFNet.ObjectIdentifier.Predefined = {
                e_commonName: 0,
                e_surname: 1,
                e_countryName: 2,
                e_localityName: 3,
                e_stateOrProvinceName: 4,
                e_streetAddress: 5,
                e_organizationName: 6,
                e_organizationalUnitName: 7,
            };
            PDFNet.DigestAlgorithm.Type = {
                e_SHA1: 0,
                e_SHA256: 1,
                e_SHA384: 2,
                e_SHA512: 3,
                e_RIPEMD160: 4,
                e_unknown_digest_algorithm: 5,
            };
            PDFNet.DigitalSignatureField.SubFilterType =
                {
                    e_adbe_x509_rsa_sha1: 0,
                    e_adbe_pkcs7_detached: 1,
                    e_adbe_pkcs7_sha1: 2,
                    e_ETSI_CAdES_detached: 3,
                    e_ETSI_RFC3161: 4,
                    e_unknown: 5,
                    e_absent: 6,
                };
            PDFNet.DigitalSignatureField.DocumentPermissions = {
                e_no_changes_allowed: 1,
                e_formfilling_signing_allowed: 2,
                e_annotating_formfilling_signing_allowed: 3,
                e_unrestricted: 4,
            };
            PDFNet.DigitalSignatureField.FieldPermissions = { e_lock_all: 0, e_include: 1, e_exclude: 2 };
            PDFNet.PDFDoc.EventType = {
                e_action_trigger_doc_will_close: 17,
                e_action_trigger_doc_will_save: 18,
                e_action_trigger_doc_did_save: 19,
                e_action_trigger_doc_will_print: 20,
                e_action_trigger_doc_did_print: 21,
            };
            PDFNet.PDFDoc.InsertFlag = { e_none: 0, e_insert_bookmark: 1 };
            PDFNet.PDFDoc.ExtractFlag = { e_forms_only: 0, e_annots_only: 1, e_both: 2 };
            PDFNet.PDFDoc.SignaturesVerificationStatus = {
                e_unsigned: 0,
                e_failure: 1,
                e_untrusted: 2,
                e_unsupported: 3,
                e_verified: 4,
            };
            PDFNet.PDFDocViewPrefs.PageMode = {
                e_UseNone: 0,
                e_UseThumbs: 1,
                e_UseBookmarks: 2,
                e_FullScreen: 3,
                e_UseOC: 4,
                e_UseAttachments: 5,
            };
            PDFNet.PDFDocViewPrefs.PageLayout = {
                e_Default: 0, e_SinglePage: 1, e_OneColumn: 2,
                e_TwoColumnLeft: 3, e_TwoColumnRight: 4, e_TwoPageLeft: 5, e_TwoPageRight: 6,
            };
            PDFNet.PDFDocViewPrefs.ViewerPref = {
                e_HideToolbar: 0,
                e_HideMenubar: 1,
                e_HideWindowUI: 2,
                e_FitWindow: 3,
                e_CenterWindow: 4,
                e_DisplayDocTitle: 5,
            };
            PDFNet.PDFRasterizer.Type = { e_BuiltIn: 0, e_GDIPlus: 1 };
            PDFNet.PDFRasterizer.OverprintPreviewMode = { e_op_off: 0, e_op_on: 1, e_op_pdfx_on: 2 };
            PDFNet.PDFRasterizer.ColorPostProcessMode = { e_postprocess_none: 0, e_postprocess_invert: 1 };
            PDFNet.PDFDraw.PixelFormat = {
                e_rgba: 0, e_bgra: 1, e_rgb: 2, e_bgr: 3, e_gray: 4, e_gray_alpha: 5,
                e_cmyk: 6,
            };
            PDFNet.CMSType = { e_lcms: 0, e_icm: 1, e_no_cms: 2 };
            PDFNet.CharacterOrdering = { e_Identity: 0, e_Japan1: 1, e_Japan2: 2, e_GB1: 3, e_CNS1: 4, e_Korea1: 5 };
            PDFNet.LogLevel = {
                e_LogLevel_Off: -1,
                e_LogLevel_Fatal: 5,
                e_LogLevel_Error: 4,
                e_LogLevel_Warning: 3,
                e_LogLevel_Info: 2,
                e_LogLevel_Trace: 1,
                e_LogLevel_Debug: 0,
            };
            PDFNet.Shading.Type = {
                e_function_shading: 0,
                e_axial_shading: 1,
                e_radial_shading: 2,
                e_free_gouraud_shading: 3,
                e_lattice_gouraud_shading: 4,
                e_coons_shading: 5,
                e_tensor_shading: 6,
                e_null: 7,
            };
            PDFNet.Stamper.SizeType = {
                e_relative_scale: 1,
                e_absolute_size: 2, e_font_size: 3,
            };
            PDFNet.Stamper.TextAlignment = { e_align_left: -1, e_align_center: 0, e_align_right: 1 };
            PDFNet.Stamper.HorizontalAlignment = {
                e_horizontal_left: -1,
                e_horizontal_center: 0,
                e_horizontal_right: 1,
            };
            PDFNet.Stamper.VerticalAlignment = { e_vertical_bottom: -1, e_vertical_center: 0, e_vertical_top: 1 };
            PDFNet.TextExtractor.ProcessingFlags = {
                e_no_ligature_exp: 1,
                e_no_dup_remove: 2,
                e_punct_break: 4,
                e_remove_hidden_text: 8,
                e_no_invisible_text: 16,
            };
            PDFNet.TextExtractor.XMLOutputFlags = {
                e_words_as_elements: 1,
                e_output_bbox: 2, e_output_style_info: 4,
            };
            PDFNet.TextSearch.ResultCode = { e_done: 0, e_page: 1, e_found: 2 };
            PDFNet.TextSearch.Mode = {
                e_reg_expression: 1,
                e_case_sensitive: 2,
                e_whole_word: 4,
                e_search_up: 8,
                e_page_stop: 16,
                e_highlight: 32,
                e_ambient_string: 64,
            };
            PDFNet.Obj.Type = {
                e_null: 0,
                e_bool: 1,
                e_number: 2,
                e_name: 3,
                e_string: 4,
                e_dict: 5,
                e_array: 6,
                e_stream: 7,
            };
            PDFNet.SDFDoc.SaveOptions = {
                e_incremental: 1,
                e_remove_unused: 2,
                e_hex_strings: 4,
                e_omit_xref: 8,
                e_linearized: 16,
                e_compatibility: 32,
            };
            PDFNet.SecurityHandler.Permission = {
                e_owner: 1,
                e_doc_open: 2,
                e_doc_modify: 3,
                e_print: 4,
                e_print_high: 5,
                e_extract_content: 6,
                e_mod_annot: 7,
                e_fill_forms: 8,
                e_access_support: 9,
                e_assemble_doc: 10,
            };
            PDFNet.SecurityHandler.AlgorithmType = { e_RC4_40: 1, e_RC4_128: 2, e_AES: 3, e_AES_256: 4 };
            PDFNet.VerificationOptions.SecurityLevel = { e_compatibility_and_archiving: 0, e_maximum: 1 };
            PDFNet.VerificationOptions.TimeMode = { e_signing: 0, e_timestamp: 1, e_current: 2 };
            PDFNet.VerificationResult.DocumentStatus = {
                e_no_error: 0,
                e_corrupt_file: 1,
                e_unsigned: 2,
                e_bad_byteranges: 3,
                e_corrupt_cryptographic_contents: 4,
            };
            PDFNet.VerificationResult.DigestStatus = {
                e_digest_invalid: 0,
                e_digest_verified: 1,
                e_digest_verification_disabled: 2,
                e_weak_digest_algorithm_but_digest_verifiable: 3,
                e_no_digest_status: 4,
                e_unsupported_encoding: 5,
            };
            PDFNet.VerificationResult.TrustStatus = {
                e_trust_verified: 0,
                e_untrusted: 1,
                e_trust_verification_disabled: 2,
                e_no_trust_status: 3,
            };
            PDFNet.VerificationResult.ModificationPermissionsStatus = {
                e_invalidated_by_disallowed_changes: 0,
                e_has_allowed_changes: 1,
                e_unmodified: 2,
                e_permissions_verification_disabled: 3,
                e_no_permissions_status: 4,
            };
            PDFNet.DisallowedChange.Type = {
                e_form_filled: 0,
                e_digital_signature_signed: 1,
                e_page_template_instantiated: 2,
                e_annotation_created_or_updated_or_deleted: 3,
                e_other: 4,
                e_unknown: 5,
            };
            PDFNet.Iterator.prototype.hasNext = function() {
                return PDFNet.messageHandler.sendWithPromise("Iterator.hasNext", { itr: this.id }, this.userPriority);
            };
            PDFNet.Iterator.prototype.next = function() {
                return PDFNet.messageHandler.sendWithPromise("Iterator.next", { itr: this.id }, this.userPriority);
            };
            PDFNet.DictIterator.prototype.hasNext =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("DictIterator.hasNext", { itr: this.id }, this.userPriority);
                };
            PDFNet.DictIterator.prototype.key = function() {
                return PDFNet.messageHandler.sendWithPromise("DictIterator.key", { itr: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.DictIterator.prototype.value = function() {
                return PDFNet.messageHandler.sendWithPromise("DictIterator.value", { itr: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.DictIterator.prototype.next = function() {
                return PDFNet.messageHandler.sendWithPromise("DictIterator.next", { itr: this.id }, this.userPriority);
            };
            PDFNet.Matrix2D.prototype.copy = function() {
                checkThisYieldFunction("copy", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.copy", { m: this }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Matrix2D.prototype.set = function(a, b, c, d, h, v) {
                checkArguments(arguments.length, 6, "set", "(number, number, number, number, number, number)",
                    [[a, "number"], [b, "number"], [c, "number"], [d, "number"], [h, "number"], [v, "number"]]);
                checkThisYieldFunction("set", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Matrix2D.set";
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.set", {
                    matrix: this,
                    a: a,
                    b: b,
                    c: c,
                    d: d,
                    h: h,
                    v: v,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Matrix2D.prototype.concat = function(a, b, c, d, h, v) {
                checkArguments(arguments.length, 6, "concat", "(number, number, number, number, number, number)",
                    [[a, "number"], [b, "number"], [c, "number"], [d, "number"], [h, "number"], [v, "number"]]);
                checkThisYieldFunction("concat", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Matrix2D.concat";
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.concat", {
                    matrix: this,
                    a: a,
                    b: b,
                    c: c,
                    d: d,
                    h: h,
                    v: v,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Matrix2D.prototype.equals = function(m2) {
                checkArguments(arguments.length, 1, "equals", "(PDFNet.Matrix2D)", [[m2, "Structure", PDFNet.Matrix2D,
                    "Matrix2D"]]);
                checkThisYieldFunction("equals", this.yieldFunction);
                checkParamsYieldFunction("equals", [[m2, 0]]);
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.equals", { m1: this, m2: m2 }, this.userPriority);
            };
            PDFNet.Matrix2D.prototype.inverse = function() {
                checkThisYieldFunction("inverse", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.inverse", { matrix: this }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Matrix2D.prototype.translate = function(h,
                v) {
                checkArguments(arguments.length, 2, "translate", "(number, number)", [[h, "number"], [v, "number"]]);
                checkThisYieldFunction("translate", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Matrix2D.translate";
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.translate", {
                    matrix: this,
                    h: h,
                    v: v,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Matrix2D.prototype.preTranslate = function(h, v) {
                checkArguments(arguments.length, 2, "preTranslate", "(number, number)", [[h, "number"],
                    [v, "number"]]);
                checkThisYieldFunction("preTranslate", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Matrix2D.preTranslate";
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.preTranslate", {
                    matrix: this,
                    h: h,
                    v: v,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Matrix2D.prototype.postTranslate = function(h, v) {
                checkArguments(arguments.length, 2, "postTranslate", "(number, number)", [[h, "number"], [v, "number"]]);
                checkThisYieldFunction("postTranslate", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Matrix2D.postTranslate";
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.postTranslate", {
                    matrix: this,
                    h: h,
                    v: v,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Matrix2D.prototype.scale = function(h, v) {
                checkArguments(arguments.length, 2, "scale", "(number, number)", [[h, "number"], [v, "number"]]);
                checkThisYieldFunction("scale", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Matrix2D.scale";
                return PDFNet.messageHandler.sendWithPromise("Matrix2D.scale",
                    { matrix: this, h: h, v: v }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Matrix2D.createZeroMatrix = function() {
                return PDFNet.messageHandler.sendWithPromise("matrix2DCreateZeroMatrix", {}, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Matrix2D.createIdentityMatrix = function() {
                return PDFNet.messageHandler.sendWithPromise("matrix2DCreateIdentityMatrix", {}, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Matrix2D.createRotationMatrix =
                function(angle) {
                    checkArguments(arguments.length, 1, "createRotationMatrix", "(number)", [[angle, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("matrix2DCreateRotationMatrix", { angle: angle }, this.userPriority).then(function(id) {
                        return new PDFNet.Matrix2D(id);
                    });
                };
            PDFNet.Field.create = function(field_dict) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)", [[field_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("fieldCreate", { field_dict: field_dict.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Field(id);
                });
            };
            PDFNet.Field.prototype.isValid = function() {
                checkThisYieldFunction("isValid", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.isValid", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.getType = function() {
                checkThisYieldFunction("getType", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getType", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.getValue = function() {
                checkThisYieldFunction("getValue", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getValue",
                    { field: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Field.prototype.getValueAsString = function() {
                checkThisYieldFunction("getValueAsString", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getValueAsString", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.getDefaultValueAsString = function() {
                checkThisYieldFunction("getDefaultValueAsString", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getDefaultValueAsString",
                    { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.setValueAsString = function(value) {
                checkArguments(arguments.length, 1, "setValueAsString", "(string)", [[value, "string"]]);
                checkThisYieldFunction("setValueAsString", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.setValueAsString";
                return PDFNet.messageHandler.sendWithPromise("Field.setValueAsString", {
                    field: this,
                    value: value,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = createDestroyableObj(PDFNet.ViewChangeCollection,
                        id.result);
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.Field.prototype.setValue = function(value) {
                checkArguments(arguments.length, 1, "setValue", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                checkThisYieldFunction("setValue", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.setValue";
                return PDFNet.messageHandler.sendWithPromise("Field.setValue", {
                    field: this,
                    value: value.id,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = createDestroyableObj(PDFNet.ViewChangeCollection,
                        id.result);
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.Field.prototype.setValueAsBool = function(value) {
                checkArguments(arguments.length, 1, "setValueAsBool", "(boolean)", [[value, "boolean"]]);
                checkThisYieldFunction("setValueAsBool", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.setValueAsBool";
                return PDFNet.messageHandler.sendWithPromise("Field.setValueAsBool", {
                    field: this,
                    value: value,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = createDestroyableObj(PDFNet.ViewChangeCollection,
                        id.result);
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.Field.prototype.getTriggerAction = function(trigger) {
                checkArguments(arguments.length, 1, "getTriggerAction", "(number)", [[trigger, "number"]]);
                checkThisYieldFunction("getTriggerAction", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getTriggerAction", {
                    field: this,
                    trigger: trigger,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Field.prototype.getValueAsBool = function() {
                checkThisYieldFunction("getValueAsBool",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getValueAsBool", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.refreshAppearance = function() {
                checkThisYieldFunction("refreshAppearance", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.refreshAppearance";
                return PDFNet.messageHandler.sendWithPromise("Field.refreshAppearance", { field: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Field.prototype.eraseAppearance = function() {
                checkThisYieldFunction("eraseAppearance",
                    this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.eraseAppearance";
                return PDFNet.messageHandler.sendWithPromise("Field.eraseAppearance", { field: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Field.prototype.getDefaultValue = function() {
                checkThisYieldFunction("getDefaultValue", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getDefaultValue", { field: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.Field.prototype.getName = function() {
                checkThisYieldFunction("getName", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getName", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.getPartialName = function() {
                checkThisYieldFunction("getPartialName", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getPartialName", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.rename = function(field_name) {
                checkArguments(arguments.length, 1, "rename", "(string)",
                    [[field_name, "string"]]);
                checkThisYieldFunction("rename", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.rename";
                return PDFNet.messageHandler.sendWithPromise("Field.rename", {
                    field: this,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Field.prototype.isAnnot = function() {
                checkThisYieldFunction("isAnnot", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.isAnnot", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.useSignatureHandler =
                function(signature_handler_id) {
                    checkArguments(arguments.length, 1, "useSignatureHandler", "(number)", [[signature_handler_id, "number"]]);
                    checkThisYieldFunction("useSignatureHandler", this.yieldFunction);
                    var me = this;
                    this.yieldFunction = "Field.useSignatureHandler";
                    return PDFNet.messageHandler.sendWithPromise("Field.useSignatureHandler", {
                        field: this,
                        signature_handler_id: signature_handler_id,
                    }, this.userPriority).then(function(id) {
                        me.yieldFunction = void 0;
                        id.result = createPDFNetObj(PDFNet.Obj, id.result);
                        copyFunc(id.field,
                            me);
                        return id.result;
                    });
                };
            PDFNet.Field.prototype.getFlag = function(flag) {
                checkArguments(arguments.length, 1, "getFlag", "(number)", [[flag, "number"]]);
                checkThisYieldFunction("getFlag", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getFlag", {
                    field: this,
                    flag: flag,
                }, this.userPriority);
            };
            PDFNet.Field.prototype.setFlag = function(flag, value) {
                checkArguments(arguments.length, 2, "setFlag", "(number, boolean)", [[flag, "number"], [value, "boolean"]]);
                checkThisYieldFunction("setFlag", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.setFlag";
                return PDFNet.messageHandler.sendWithPromise("Field.setFlag", {
                    field: this,
                    flag: flag,
                    value: value,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Field.prototype.getJustification = function() {
                checkThisYieldFunction("getJustification", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.getJustification";
                return PDFNet.messageHandler.sendWithPromise("Field.getJustification", { field: this }, this.userPriority).then(function(id) {
                    me.yieldFunction =
                        void 0;
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.Field.prototype.setJustification = function(j) {
                checkArguments(arguments.length, 1, "setJustification", "(number)", [[j, "number"]]);
                checkThisYieldFunction("setJustification", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.setJustification";
                return PDFNet.messageHandler.sendWithPromise("Field.setJustification", {
                    field: this,
                    j: j,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Field.prototype.setMaxLen = function(max_len) {
                checkArguments(arguments.length,
                    1, "setMaxLen", "(number)", [[max_len, "number"]]);
                checkThisYieldFunction("setMaxLen", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.setMaxLen";
                return PDFNet.messageHandler.sendWithPromise("Field.setMaxLen", {
                    field: this,
                    max_len: max_len,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Field.prototype.getMaxLen = function() {
                checkThisYieldFunction("getMaxLen", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getMaxLen", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.getDefaultAppearance = function() {
                checkThisYieldFunction("getDefaultAppearance", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.getDefaultAppearance";
                return PDFNet.messageHandler.sendWithPromise("Field.getDefaultAppearance", { field: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = createPDFNetObj(PDFNet.GState, id.result);
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.Field.prototype.getUpdateRect = function() {
                checkThisYieldFunction("getUpdateRect",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getUpdateRect", { field: this }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Field.prototype.flatten = function(page) {
                checkArguments(arguments.length, 1, "flatten", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                checkThisYieldFunction("flatten", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Field.flatten";
                return PDFNet.messageHandler.sendWithPromise("Field.flatten", {
                    field: this,
                    page: page.id,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction =
                        void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Field.prototype.findInheritedAttribute = function(attrib) {
                checkArguments(arguments.length, 1, "findInheritedAttribute", "(string)", [[attrib, "string"]]);
                checkThisYieldFunction("findInheritedAttribute", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.findInheritedAttribute", {
                    field: this,
                    attrib: attrib,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Field.prototype.getSDFObj = function() {
                checkThisYieldFunction("getSDFObj",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getSDFObj", { field: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Field.prototype.getOptCount = function() {
                checkThisYieldFunction("getOptCount", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getOptCount", { field: this }, this.userPriority);
            };
            PDFNet.Field.prototype.getOpt = function(index) {
                checkArguments(arguments.length, 1, "getOpt", "(number)", [[index, "number"]]);
                checkThisYieldFunction("getOpt",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.getOpt", {
                    field: this,
                    index: index,
                }, this.userPriority);
            };
            PDFNet.Field.prototype.isLockedByDigitalSignature = function() {
                checkThisYieldFunction("isLockedByDigitalSignature", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Field.isLockedByDigitalSignature", { field: this }, this.userPriority);
            };
            PDFNet.FDFDoc.create = function() {
                return PDFNet.messageHandler.sendWithPromise("fdfDocCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.FDFDoc,
                        id);
                });
            };
            PDFNet.FDFDoc.createFromStream = function(stream) {
                checkArguments(arguments.length, 1, "createFromStream", "(PDFNet.Filter)", [[stream, "Object", PDFNet.Filter, "Filter"]]);
                0 != stream.id && avoidCleanup(stream.id);
                return PDFNet.messageHandler.sendWithPromise("fdfDocCreateFromStream", { no_own_stream: stream.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.FDFDoc, id);
                });
            };
            PDFNet.FDFDoc.createFromMemoryBuffer = function(buf) {
                checkArguments(arguments.length, 1, "createFromMemoryBuffer", "(ArrayBuffer|TypedArray)",
                    [[buf, "ArrayBuffer"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("fdfDocCreateFromMemoryBuffer", { buf: bufArrayBuffer }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.FDFDoc, id);
                });
            };
            PDFNet.FDFDoc.prototype.isModified = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.isModified", { doc: this.id }, this.userPriority);
            };
            PDFNet.FDFDoc.prototype.saveMemoryBuffer = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.saveMemoryBuffer",
                    { doc: this.id }, this.userPriority).then(function(id) {
                    return new Uint8Array(id);
                });
            };
            PDFNet.FDFDoc.prototype.getTrailer = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.getTrailer", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.FDFDoc.prototype.getRoot = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.getRoot", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.FDFDoc.prototype.getFDF =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("FDFDoc.getFDF", { doc: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.FDFDoc.prototype.getPDFFileName = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.getPDFFileName", { doc: this.id }, this.userPriority);
            };
            PDFNet.FDFDoc.prototype.setPDFFileName = function(filepath) {
                checkArguments(arguments.length, 1, "setPDFFileName", "(string)", [[filepath, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.setPDFFileName",
                    { doc: this.id, filepath: filepath }, this.userPriority);
            };
            PDFNet.FDFDoc.prototype.getID = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.getID", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.FDFDoc.prototype.setID = function(id) {
                checkArguments(arguments.length, 1, "setID", "(PDFNet.Obj)", [[id, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.setID", {
                    doc: this.id,
                    id: id.id,
                }, this.userPriority);
            };
            PDFNet.FDFDoc.prototype.getFieldIteratorBegin =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("FDFDoc.getFieldIteratorBegin", { doc: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.Iterator, id, "FDFField");
                    });
                };
            PDFNet.FDFDoc.prototype.getFieldIterator = function(field_name) {
                checkArguments(arguments.length, 1, "getFieldIterator", "(string)", [[field_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.getFieldIterator", {
                    doc: this.id,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Iterator,
                        id, "FDFField");
                });
            };
            PDFNet.FDFDoc.prototype.getField = function(field_name) {
                checkArguments(arguments.length, 1, "getField", "(string)", [[field_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.getField", {
                    doc: this.id,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.FDFField(id);
                });
            };
            PDFNet.FDFDoc.prototype.fieldCreate = function(field_name, type, field_value) {
                "undefined" === typeof field_value && (field_value = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 2, "fieldCreate",
                    "(string, number, PDFNet.Obj)", [[field_name, "string"], [type, "number"], [field_value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.fieldCreate", {
                    doc: this.id,
                    field_name: field_name,
                    type: type,
                    field_value: field_value.id,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.FDFField(id);
                });
            };
            PDFNet.FDFDoc.prototype.fieldCreateFromString = function(field_name, type, field_value) {
                checkArguments(arguments.length, 3, "fieldCreateFromString", "(string, number, string)", [[field_name,
                    "string"], [type, "number"], [field_value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.fieldCreateFromString", {
                    doc: this.id,
                    field_name: field_name,
                    type: type,
                    field_value: field_value,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.FDFField(id);
                });
            };
            PDFNet.FDFDoc.prototype.getSDFDoc = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.getSDFDoc", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SDFDoc, id);
                });
            };
            PDFNet.FDFDoc.createFromXFDF =
                function(file_name) {
                    checkArguments(arguments.length, 1, "createFromXFDF", "(string)", [[file_name, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("fdfDocCreateFromXFDF", { file_name: file_name }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.FDFDoc, id);
                    });
                };
            PDFNet.FDFDoc.prototype.saveAsXFDFAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.saveAsXFDFAsString", { doc: this.id }, this.userPriority);
            };
            PDFNet.FDFDoc.prototype.mergeAnnots = function(command_file,
                permitted_user) {
                "undefined" === typeof permitted_user && (permitted_user = "");
                checkArguments(arguments.length, 1, "mergeAnnots", "(string, string)", [[command_file, "string"], [permitted_user, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FDFDoc.mergeAnnots", {
                    doc: this.id,
                    command_file: command_file,
                    permitted_user: permitted_user,
                }, this.userPriority);
            };
            PDFNet.FDFField.create = function(field_dict, fdf_dict) {
                "undefined" === typeof field_dict && (field_dict = new PDFNet.Obj("0"));
                "undefined" === typeof fdf_dict && (fdf_dict =
                    new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj, PDFNet.Obj)", [[field_dict, "Object", PDFNet.Obj, "Obj"], [fdf_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("fdfFieldCreate", {
                    field_dict: field_dict.id,
                    fdf_dict: fdf_dict.id,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.FDFField(id);
                });
            };
            PDFNet.FDFField.prototype.getValue = function() {
                checkThisYieldFunction("getValue", this.yieldFunction);
                var me = this;
                this.yieldFunction = "FDFField.getValue";
                return PDFNet.messageHandler.sendWithPromise("FDFField.getValue", { field: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = createPDFNetObj(PDFNet.Obj, id.result);
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.FDFField.prototype.setValue = function(value) {
                checkArguments(arguments.length, 1, "setValue", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                checkThisYieldFunction("setValue", this.yieldFunction);
                var me = this;
                this.yieldFunction = "FDFField.setValue";
                return PDFNet.messageHandler.sendWithPromise("FDFField.setValue",
                    { field: this, value: value.id }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.FDFField.prototype.getName = function() {
                checkThisYieldFunction("getName", this.yieldFunction);
                var me = this;
                this.yieldFunction = "FDFField.getName";
                return PDFNet.messageHandler.sendWithPromise("FDFField.getName", { field: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.FDFField.prototype.getPartialName = function() {
                checkThisYieldFunction("getPartialName",
                    this.yieldFunction);
                var me = this;
                this.yieldFunction = "FDFField.getPartialName";
                return PDFNet.messageHandler.sendWithPromise("FDFField.getPartialName", { field: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.field, me);
                    return id.result;
                });
            };
            PDFNet.FDFField.prototype.getSDFObj = function() {
                checkThisYieldFunction("getSDFObj", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("FDFField.getSDFObj", { field: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.FDFField.prototype.findAttribute = function(attrib) {
                checkArguments(arguments.length, 1, "findAttribute", "(string)", [[attrib, "string"]]);
                checkThisYieldFunction("findAttribute", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("FDFField.findAttribute", {
                    field: this,
                    attrib: attrib,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Filter.prototype.createASCII85Encode = function(line_width, buf_sz) {
                checkArguments(arguments.length, 2, "createASCII85Encode",
                    "(number, number)", [[line_width, "number"], [buf_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Filter.createASCII85Encode", {
                    no_own_input_filter: this.id,
                    line_width: line_width,
                    buf_sz: buf_sz,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.createMemoryFilter = function(buf_sz, is_input) {
                checkArguments(arguments.length, 2, "createMemoryFilter", "(number, boolean)", [[buf_sz, "number"], [is_input, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("filterCreateMemoryFilter",
                    { buf_sz: buf_sz, is_input: is_input }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.createImage2RGBFromElement = function(elem) {
                checkArguments(arguments.length, 1, "createImage2RGBFromElement", "(PDFNet.Element)", [[elem, "Object", PDFNet.Element, "Element"]]);
                return PDFNet.messageHandler.sendWithPromise("filterCreateImage2RGBFromElement", { elem: elem.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.createImage2RGBFromObj =
                function(obj) {
                    checkArguments(arguments.length, 1, "createImage2RGBFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                    return PDFNet.messageHandler.sendWithPromise("filterCreateImage2RGBFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.Filter, id);
                    });
                };
            PDFNet.Filter.createImage2RGB = function(img) {
                checkArguments(arguments.length, 1, "createImage2RGB", "(PDFNet.Image)", [[img, "Object", PDFNet.Image, "Image"]]);
                return PDFNet.messageHandler.sendWithPromise("filterCreateImage2RGB",
                    { img: img.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.createImage2RGBAFromElement = function(elem, premultiply) {
                checkArguments(arguments.length, 2, "createImage2RGBAFromElement", "(PDFNet.Element, boolean)", [[elem, "Object", PDFNet.Element, "Element"], [premultiply, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("filterCreateImage2RGBAFromElement", {
                    elem: elem.id,
                    premultiply: premultiply,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter,
                        id);
                });
            };
            PDFNet.Filter.createImage2RGBAFromObj = function(obj, premultiply) {
                checkArguments(arguments.length, 2, "createImage2RGBAFromObj", "(PDFNet.Obj, boolean)", [[obj, "Object", PDFNet.Obj, "Obj"], [premultiply, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("filterCreateImage2RGBAFromObj", {
                    obj: obj.id,
                    premultiply: premultiply,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.createImage2RGBA = function(img, premultiply) {
                checkArguments(arguments.length,
                    2, "createImage2RGBA", "(PDFNet.Image, boolean)", [[img, "Object", PDFNet.Image, "Image"], [premultiply, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("filterCreateImage2RGBA", {
                    img: img.id,
                    premultiply: premultiply,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.prototype.attachFilter = function(attach_filter) {
                checkArguments(arguments.length, 1, "attachFilter", "(PDFNet.Filter)", [[attach_filter, "Object", PDFNet.Filter, "Filter"]]);
                0 != attach_filter.id &&
                avoidCleanup(attach_filter.id);
                return PDFNet.messageHandler.sendWithPromise("Filter.attachFilter", {
                    filter: this.id,
                    no_own_attach_filter: attach_filter.id,
                }, this.userPriority);
            };
            PDFNet.Filter.prototype.releaseAttachedFilter = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.releaseAttachedFilter", { filter: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.prototype.getAttachedFilter = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.getAttachedFilter",
                    { filter: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.prototype.getSourceFilter = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.getSourceFilter", { filter: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.prototype.getName = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.getName", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.getDecodeName = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.getDecodeName",
                    { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.begin = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.begin", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.size = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.size", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.consume = function(num_bytes) {
                checkArguments(arguments.length, 1, "consume", "(number)", [[num_bytes, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Filter.consume",
                    { filter: this.id, num_bytes: num_bytes }, this.userPriority);
            };
            PDFNet.Filter.prototype.count = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.count", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.setCount = function(new_count) {
                checkArguments(arguments.length, 1, "setCount", "(number)", [[new_count, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Filter.setCount", {
                    filter: this.id,
                    new_count: new_count,
                }, this.userPriority);
            };
            PDFNet.Filter.prototype.setStreamLength = function(bytes) {
                checkArguments(arguments.length,
                    1, "setStreamLength", "(number)", [[bytes, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Filter.setStreamLength", {
                    filter: this.id,
                    bytes: bytes,
                }, this.userPriority);
            };
            PDFNet.Filter.prototype.flush = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.flush", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.flushAll = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.flushAll", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.isInputFilter = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.isInputFilter",
                    { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.canSeek = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.canSeek", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.seek = function(offset, origin) {
                checkArguments(arguments.length, 2, "seek", "(number, number)", [[offset, "number"], [origin, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Filter.seek", {
                    filter: this.id,
                    offset: offset,
                    origin: origin,
                }, this.userPriority);
            };
            PDFNet.Filter.prototype.tell = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.tell",
                    { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.createInputIterator = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.createInputIterator", { filter: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Filter.prototype.getFilePath = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.getFilePath", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.memoryFilterGetBuffer = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.memoryFilterGetBuffer",
                    { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.memoryFilterSetAsInputFilter = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.memoryFilterSetAsInputFilter", { filter: this.id }, this.userPriority);
            };
            PDFNet.Filter.prototype.memoryFilterReset = function() {
                return PDFNet.messageHandler.sendWithPromise("Filter.memoryFilterReset", { filter: this.id }, this.userPriority);
            };
            PDFNet.FilterReader.create = function(filter) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Filter)", [[filter, "Object",
                    PDFNet.Filter, "Filter"]]);
                return PDFNet.messageHandler.sendWithPromise("filterReaderCreate", { filter: filter.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.FilterReader, id);
                });
            };
            PDFNet.FilterReader.prototype.attachFilter = function(filter) {
                checkArguments(arguments.length, 1, "attachFilter", "(PDFNet.Filter)", [[filter, "Object", PDFNet.Filter, "Filter"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterReader.attachFilter", {
                    reader: this.id,
                    filter: filter.id,
                }, this.userPriority);
            };
            PDFNet.FilterReader.prototype.getAttachedFilter = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterReader.getAttachedFilter", { reader: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.FilterReader.prototype.seek = function(offset, origin) {
                checkArguments(arguments.length, 2, "seek", "(number, number)", [[offset, "number"], [origin, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterReader.seek", {
                        reader: this.id,
                        offset: offset,
                        origin: origin,
                    },
                    this.userPriority);
            };
            PDFNet.FilterReader.prototype.tell = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterReader.tell", { reader: this.id }, this.userPriority);
            };
            PDFNet.FilterReader.prototype.count = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterReader.count", { reader: this.id }, this.userPriority);
            };
            PDFNet.FilterReader.prototype.flush = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterReader.flush", { reader: this.id }, this.userPriority);
            };
            PDFNet.FilterReader.prototype.flushAll =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("FilterReader.flushAll", { reader: this.id }, this.userPriority);
                };
            PDFNet.FilterReader.prototype.get = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterReader.get", { reader: this.id }, this.userPriority);
            };
            PDFNet.FilterReader.prototype.peek = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterReader.peek", { reader: this.id }, this.userPriority);
            };
            PDFNet.FilterWriter.create = function(filter) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Filter)",
                    [[filter, "Object", PDFNet.Filter, "Filter"]]);
                return PDFNet.messageHandler.sendWithPromise("filterWriterCreate", { filter: filter.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.FilterWriter, id);
                });
            };
            PDFNet.FilterWriter.prototype.attachFilter = function(filter) {
                checkArguments(arguments.length, 1, "attachFilter", "(PDFNet.Filter)", [[filter, "Object", PDFNet.Filter, "Filter"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.attachFilter", {
                    writer: this.id,
                    filter: filter.id,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.getAttachedFilter = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.getAttachedFilter", { writer: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.FilterWriter.prototype.seek = function(offset, origin) {
                checkArguments(arguments.length, 2, "seek", "(number, number)", [[offset, "number"], [origin, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.seek", {
                        writer: this.id,
                        offset: offset,
                        origin: origin,
                    },
                    this.userPriority);
            };
            PDFNet.FilterWriter.prototype.tell = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.tell", { writer: this.id }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.count = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.count", { writer: this.id }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.flush = function() {
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.flush", { writer: this.id }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.flushAll =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("FilterWriter.flushAll", { writer: this.id }, this.userPriority);
                };
            PDFNet.FilterWriter.prototype.writeUChar = function(ch) {
                checkArguments(arguments.length, 1, "writeUChar", "(number)", [[ch, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeUChar", {
                    writer: this.id,
                    ch: ch,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeInt16 = function(num) {
                checkArguments(arguments.length, 1, "writeInt16", "(number)", [[num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeInt16",
                    { writer: this.id, num: num }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeUInt16 = function(num) {
                checkArguments(arguments.length, 1, "writeUInt16", "(number)", [[num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeUInt16", {
                    writer: this.id,
                    num: num,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeInt32 = function(num) {
                checkArguments(arguments.length, 1, "writeInt32", "(number)", [[num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeInt32", {
                    writer: this.id,
                    num: num,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeUInt32 = function(num) {
                checkArguments(arguments.length, 1, "writeUInt32", "(number)", [[num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeUInt32", {
                    writer: this.id,
                    num: num,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeInt64 = function(num) {
                checkArguments(arguments.length, 1, "writeInt64", "(number)", [[num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeInt64", { writer: this.id, num: num },
                    this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeUInt64 = function(num) {
                checkArguments(arguments.length, 1, "writeUInt64", "(number)", [[num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeUInt64", {
                    writer: this.id,
                    num: num,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeString = function(str) {
                checkArguments(arguments.length, 1, "writeString", "(string)", [[str, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeString", {
                    writer: this.id,
                    str: str,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeFilter = function(reader) {
                checkArguments(arguments.length, 1, "writeFilter", "(PDFNet.FilterReader)", [[reader, "Object", PDFNet.FilterReader, "FilterReader"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeFilter", {
                    writer: this.id,
                    reader: reader.id,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeLine = function(line, eol) {
                "undefined" === typeof eol && (eol = 13);
                checkArguments(arguments.length, 1, "writeLine", "(string, number)", [[line, "const char* = 0"], [eol,
                    "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeLine", {
                    writer: this.id,
                    line: line,
                    eol: eol,
                }, this.userPriority);
            };
            PDFNet.FilterWriter.prototype.writeBuffer = function(buf) {
                checkArguments(arguments.length, 1, "writeBuffer", "(ArrayBuffer|TypedArray)", [[buf, "ArrayBuffer"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("FilterWriter.writeBuffer", {
                    writer: this.id,
                    buf: bufArrayBuffer,
                }, this.userPriority);
            };
            PDFNet.OCG.create = function(pdfdoc, name) {
                checkArguments(arguments.length,
                    2, "create", "(PDFNet.PDFDoc, string)", [[pdfdoc, "PDFDoc"], [name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ocgCreate", {
                    pdfdoc: pdfdoc.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCG, id);
                });
            };
            PDFNet.OCG.createFromObj = function(ocg_dict) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[ocg_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ocgCreateFromObj", { ocg_dict: ocg_dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCG,
                        id);
                });
            };
            PDFNet.OCG.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("OCG.copy", { ocg: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCG, id);
                });
            };
            PDFNet.OCG.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("OCG.getSDFObj", { ocg: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCG.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("OCG.isValid", { ocg: this.id }, this.userPriority);
            };
            PDFNet.OCG.prototype.getName = function() {
                return PDFNet.messageHandler.sendWithPromise("OCG.getName", { c: this.id }, this.userPriority);
            };
            PDFNet.OCG.prototype.setName = function(value) {
                checkArguments(arguments.length, 1, "setName", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.setName", {
                    c: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.OCG.prototype.getIntent = function() {
                return PDFNet.messageHandler.sendWithPromise("OCG.getIntent", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.OCG.prototype.setIntent = function(value) {
                checkArguments(arguments.length, 1, "setIntent", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.setIntent", {
                    c: this.id,
                    value: value.id,
                }, this.userPriority);
            };
            PDFNet.OCG.prototype.hasUsage = function() {
                return PDFNet.messageHandler.sendWithPromise("OCG.hasUsage", { c: this.id }, this.userPriority);
            };
            PDFNet.OCG.prototype.getUsage = function(key) {
                checkArguments(arguments.length, 1, "getUsage", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.getUsage", {
                    c: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCG.prototype.getCurrentState = function(ctx) {
                checkArguments(arguments.length, 1, "getCurrentState", "(PDFNet.OCGContext)", [[ctx, "Object", PDFNet.OCGContext, "OCGContext"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.getCurrentState", {
                    c: this.id,
                    ctx: ctx.id,
                }, this.userPriority);
            };
            PDFNet.OCG.prototype.setCurrentState = function(ctx, state) {
                checkArguments(arguments.length,
                    2, "setCurrentState", "(PDFNet.OCGContext, boolean)", [[ctx, "Object", PDFNet.OCGContext, "OCGContext"], [state, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.setCurrentState", {
                    c: this.id,
                    ctx: ctx.id,
                    state: state,
                }, this.userPriority);
            };
            PDFNet.OCG.prototype.getInitialState = function(cfg) {
                checkArguments(arguments.length, 1, "getInitialState", "(PDFNet.OCGConfig)", [[cfg, "Object", PDFNet.OCGConfig, "OCGConfig"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.getInitialState", { c: this.id, cfg: cfg.id },
                    this.userPriority);
            };
            PDFNet.OCG.prototype.setInitialState = function(cfg, state) {
                checkArguments(arguments.length, 2, "setInitialState", "(PDFNet.OCGConfig, boolean)", [[cfg, "Object", PDFNet.OCGConfig, "OCGConfig"], [state, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.setInitialState", {
                    c: this.id,
                    cfg: cfg.id,
                    state: state,
                }, this.userPriority);
            };
            PDFNet.OCG.prototype.isLocked = function(cfg) {
                checkArguments(arguments.length, 1, "isLocked", "(PDFNet.OCGConfig)", [[cfg, "Object", PDFNet.OCGConfig, "OCGConfig"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.isLocked", {
                    c: this.id,
                    cfg: cfg.id,
                }, this.userPriority);
            };
            PDFNet.OCG.prototype.setLocked = function(cfg, state) {
                checkArguments(arguments.length, 2, "setLocked", "(PDFNet.OCGConfig, boolean)", [[cfg, "Object", PDFNet.OCGConfig, "OCGConfig"], [state, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("OCG.setLocked", {
                    c: this.id,
                    cfg: cfg.id,
                    state: state,
                }, this.userPriority);
            };
            PDFNet.OCGConfig.createFromObj = function(dict) {
                checkArguments(arguments.length, 1, "createFromObj",
                    "(PDFNet.Obj)", [[dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ocgConfigCreateFromObj", { dict: dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCGConfig, id);
                });
            };
            PDFNet.OCGConfig.create = function(pdfdoc, default_config) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, boolean)", [[pdfdoc, "PDFDoc"], [default_config, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("ocgConfigCreate", {
                        pdfdoc: pdfdoc.id,
                        default_config: default_config,
                    },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCGConfig, id);
                });
            };
            PDFNet.OCGConfig.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.copy", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCGConfig, id);
                });
            };
            PDFNet.OCGConfig.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getSDFObj", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCGConfig.prototype.getOrder =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("OCGConfig.getOrder", { c: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.OCGConfig.prototype.setOrder = function(value) {
                checkArguments(arguments.length, 1, "setOrder", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setOrder", {
                    c: this.id,
                    value: value.id,
                }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.getName = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getName",
                    { c: this.id }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.setName = function(value) {
                checkArguments(arguments.length, 1, "setName", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setName", {
                    c: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.getCreator = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getCreator", { c: this.id }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.setCreator = function(value) {
                checkArguments(arguments.length,
                    1, "setCreator", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setCreator", {
                    c: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.getInitBaseState = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getInitBaseState", { c: this.id }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.setInitBaseState = function(value) {
                "undefined" === typeof value && (value = "ON");
                checkArguments(arguments.length, 0, "setInitBaseState", "(string)", [[value, "const char* = 0"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setInitBaseState", {
                    c: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.getInitOnStates = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getInitOnStates", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCGConfig.prototype.setInitOnStates = function(value) {
                checkArguments(arguments.length, 1, "setInitOnStates", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setInitOnStates",
                    { c: this.id, value: value.id }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.getInitOffStates = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getInitOffStates", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCGConfig.prototype.setInitOffStates = function(value) {
                checkArguments(arguments.length, 1, "setInitOffStates", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setInitOffStates",
                    { c: this.id, value: value.id }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.getIntent = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getIntent", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCGConfig.prototype.setIntent = function(value) {
                checkArguments(arguments.length, 1, "setIntent", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setIntent", {
                    c: this.id,
                    value: value.id,
                }, this.userPriority);
            };
            PDFNet.OCGConfig.prototype.getLockedOCGs = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.getLockedOCGs", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCGConfig.prototype.setLockedOCGs = function(value) {
                checkArguments(arguments.length, 1, "setLockedOCGs", "(PDFNet.Obj)", [[value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGConfig.setLockedOCGs", {
                    c: this.id,
                    value: value.id,
                }, this.userPriority);
            };
            PDFNet.OCGContext.createFromConfig =
                function(cfg) {
                    checkArguments(arguments.length, 1, "createFromConfig", "(PDFNet.OCGConfig)", [[cfg, "Object", PDFNet.OCGConfig, "OCGConfig"]]);
                    return PDFNet.messageHandler.sendWithPromise("ocgContextCreateFromConfig", { cfg: cfg.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.OCGContext, id);
                    });
                };
            PDFNet.OCGContext.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGContext.copy", { c: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.OCGContext,
                        id);
                });
            };
            PDFNet.OCGContext.prototype.getState = function(grp) {
                checkArguments(arguments.length, 1, "getState", "(PDFNet.OCG)", [[grp, "Object", PDFNet.OCG, "OCG"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGContext.getState", {
                    c: this.id,
                    grp: grp.id,
                }, this.userPriority);
            };
            PDFNet.OCGContext.prototype.setState = function(grp, state) {
                checkArguments(arguments.length, 2, "setState", "(PDFNet.OCG, boolean)", [[grp, "Object", PDFNet.OCG, "OCG"], [state, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGContext.setState",
                    { c: this.id, grp: grp.id, state: state }, this.userPriority);
            };
            PDFNet.OCGContext.prototype.resetStates = function(all_on) {
                checkArguments(arguments.length, 1, "resetStates", "(boolean)", [[all_on, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGContext.resetStates", {
                    c: this.id,
                    all_on: all_on,
                }, this.userPriority);
            };
            PDFNet.OCGContext.prototype.setNonOCDrawing = function(draw_non_OC) {
                checkArguments(arguments.length, 1, "setNonOCDrawing", "(boolean)", [[draw_non_OC, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGContext.setNonOCDrawing",
                    { c: this.id, draw_non_OC: draw_non_OC }, this.userPriority);
            };
            PDFNet.OCGContext.prototype.getNonOCDrawing = function() {
                return PDFNet.messageHandler.sendWithPromise("OCGContext.getNonOCDrawing", { c: this.id }, this.userPriority);
            };
            PDFNet.OCGContext.prototype.setOCDrawMode = function(oc_draw_mode) {
                checkArguments(arguments.length, 1, "setOCDrawMode", "(number)", [[oc_draw_mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("OCGContext.setOCDrawMode", {
                    c: this.id,
                    oc_draw_mode: oc_draw_mode,
                }, this.userPriority);
            };
            PDFNet.OCGContext.prototype.getOCMode =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("OCGContext.getOCMode", { c: this.id }, this.userPriority);
                };
            PDFNet.OCMD.createFromObj = function(ocmd_dict) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[ocmd_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ocmdCreateFromObj", { ocmd_dict: ocmd_dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCMD, id);
                });
            };
            PDFNet.OCMD.create = function(pdfdoc, ocgs, vis_policy) {
                checkArguments(arguments.length,
                    3, "create", "(PDFNet.PDFDoc, PDFNet.Obj, number)", [[pdfdoc, "PDFDoc"], [ocgs, "Object", PDFNet.Obj, "Obj"], [vis_policy, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ocmdCreate", {
                    pdfdoc: pdfdoc.id,
                    ocgs: ocgs.id,
                    vis_policy: vis_policy,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCMD, id);
                });
            };
            PDFNet.OCMD.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("OCMD.copy", { ocmd: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCMD, id);
                });
            };
            PDFNet.OCMD.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("OCMD.getSDFObj", { ocmd: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCMD.prototype.getOCGs = function() {
                return PDFNet.messageHandler.sendWithPromise("OCMD.getOCGs", { ocmd: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCMD.prototype.getVisibilityExpression = function() {
                return PDFNet.messageHandler.sendWithPromise("OCMD.getVisibilityExpression",
                    { ocmd: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.OCMD.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("OCMD.isValid", { ocmd: this.id }, this.userPriority);
            };
            PDFNet.OCMD.prototype.isCurrentlyVisible = function(ctx) {
                checkArguments(arguments.length, 1, "isCurrentlyVisible", "(PDFNet.OCGContext)", [[ctx, "Object", PDFNet.OCGContext, "OCGContext"]]);
                return PDFNet.messageHandler.sendWithPromise("OCMD.isCurrentlyVisible", { ocmd: this.id, ctx: ctx.id },
                    this.userPriority);
            };
            PDFNet.OCMD.prototype.getVisibilityPolicy = function() {
                return PDFNet.messageHandler.sendWithPromise("OCMD.getVisibilityPolicy", { ocmd: this.id }, this.userPriority);
            };
            PDFNet.OCMD.prototype.setVisibilityPolicy = function(vis_policy) {
                checkArguments(arguments.length, 1, "setVisibilityPolicy", "(number)", [[vis_policy, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("OCMD.setVisibilityPolicy", {
                    ocmd: this.id,
                    vis_policy: vis_policy,
                }, this.userPriority);
            };
            PDFNet.PDFACompliance.prototype.getErrorCount =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFACompliance.getErrorCount", { pdfac: this.id }, this.userPriority);
                };
            PDFNet.PDFACompliance.prototype.getError = function(idx) {
                checkArguments(arguments.length, 1, "getError", "(number)", [[idx, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFACompliance.getError", {
                    pdfac: this.id,
                    idx: idx,
                }, this.userPriority);
            };
            PDFNet.PDFACompliance.prototype.getRefObjCount = function(id) {
                checkArguments(arguments.length, 1, "getRefObjCount", "(number)", [[id, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFACompliance.getRefObjCount", {
                    pdfac: this.id,
                    id: id,
                }, this.userPriority);
            };
            PDFNet.PDFACompliance.prototype.getRefObj = function(id, err_idx) {
                checkArguments(arguments.length, 2, "getRefObj", "(number, number)", [[id, "number"], [err_idx, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFACompliance.getRefObj", {
                    pdfac: this.id,
                    id: id,
                    err_idx: err_idx,
                }, this.userPriority);
            };
            PDFNet.PDFACompliance.getPDFAErrorMessage = function(id) {
                checkArguments(arguments.length, 1,
                    "getPDFAErrorMessage", "(number)", [[id, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfaComplianceGetPDFAErrorMessage", { id: id }, this.userPriority);
            };
            PDFNet.PDFACompliance.getDeclaredConformance = function(doc) {
                checkArguments(arguments.length, 1, "getDeclaredConformance", "(PDFNet.PDFDoc)", [[doc, "PDFDoc"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfaComplianceGetDeclaredConformance", { doc: doc.id }, this.userPriority);
            };
            PDFNet.PDFACompliance.prototype.saveAsFromFileName = function(file_path, linearized) {
                "undefined" ===
                typeof linearized && (linearized = !1);
                checkArguments(arguments.length, 1, "saveAsFromFileName", "(string, boolean)", [[file_path, "string"], [linearized, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFACompliance.saveAsFromFileName", {
                    pdfac: this.id,
                    file_path: file_path,
                    linearized: linearized,
                }, this.userPriority);
            };
            PDFNet.PDFACompliance.prototype.saveAsFromBuffer = function(linearized) {
                "undefined" === typeof linearized && (linearized = !1);
                checkArguments(arguments.length, 0, "saveAsFromBuffer", "(boolean)", [[linearized,
                    "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFACompliance.saveAsFromBuffer", {
                    pdfac: this.id,
                    linearized: linearized,
                }, this.userPriority).then(function(id) {
                    return new Uint8Array(id);
                });
            };
            PDFNet.AttrObj.create = function(dict) {
                "undefined" === typeof dict && (dict = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("attrObjCreate", { dict: dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.AttrObj,
                        id);
                });
            };
            PDFNet.AttrObj.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("AttrObj.copy", { a: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.AttrObj, id);
                });
            };
            PDFNet.AttrObj.prototype.getOwner = function() {
                return PDFNet.messageHandler.sendWithPromise("AttrObj.getOwner", { obj: this.id }, this.userPriority);
            };
            PDFNet.AttrObj.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("AttrObj.getSDFObj", { obj: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.ClassMap.create = function(dict) {
                "undefined" === typeof dict && (dict = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("classMapCreate", { dict: dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ClassMap, id);
                });
            };
            PDFNet.ClassMap.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("ClassMap.copy", { p: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ClassMap,
                        id);
                });
            };
            PDFNet.ClassMap.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("ClassMap.isValid", { map: this.id }, this.userPriority);
            };
            PDFNet.ClassMap.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("ClassMap.getSDFObj", { map: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ContentItem.prototype.copy = function() {
                checkThisYieldFunction("copy", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ContentItem.copy",
                    { c: this }, this.userPriority).then(function(id) {
                    return new PDFNet.ContentItem(id);
                });
            };
            PDFNet.ContentItem.prototype.getType = function() {
                checkThisYieldFunction("getType", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ContentItem.getType", { item: this }, this.userPriority);
            };
            PDFNet.ContentItem.prototype.getParent = function() {
                checkThisYieldFunction("getParent", this.yieldFunction);
                var me = this;
                this.yieldFunction = "ContentItem.getParent";
                return PDFNet.messageHandler.sendWithPromise("ContentItem.getParent",
                    { item: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.SElement(id.result);
                    copyFunc(id.item, me);
                    return id.result;
                });
            };
            PDFNet.ContentItem.prototype.getPage = function() {
                checkThisYieldFunction("getPage", this.yieldFunction);
                var me = this;
                this.yieldFunction = "ContentItem.getPage";
                return PDFNet.messageHandler.sendWithPromise("ContentItem.getPage", { item: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = createPDFNetObj(PDFNet.Page, id.result);
                    copyFunc(id.item,
                        me);
                    return id.result;
                });
            };
            PDFNet.ContentItem.prototype.getSDFObj = function() {
                checkThisYieldFunction("getSDFObj", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ContentItem.getSDFObj", { item: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ContentItem.prototype.getMCID = function() {
                checkThisYieldFunction("getMCID", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ContentItem.getMCID", { item: this }, this.userPriority);
            };
            PDFNet.ContentItem.prototype.getContainingStm =
                function() {
                    checkThisYieldFunction("getContainingStm", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("ContentItem.getContainingStm", { item: this }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.ContentItem.prototype.getStmOwner = function() {
                checkThisYieldFunction("getStmOwner", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ContentItem.getStmOwner", { item: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.ContentItem.prototype.getRefObj = function() {
                checkThisYieldFunction("getRefObj", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ContentItem.getRefObj", { item: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.RoleMap.create = function(dict) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)", [[dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("roleMapCreate", { dict: dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RoleMap,
                        id);
                });
            };
            PDFNet.RoleMap.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("RoleMap.copy", { p: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RoleMap, id);
                });
            };
            PDFNet.RoleMap.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("RoleMap.isValid", { map: this.id }, this.userPriority);
            };
            PDFNet.RoleMap.prototype.getDirectMap = function(type) {
                checkArguments(arguments.length, 1, "getDirectMap", "(string)", [[type, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("RoleMap.getDirectMap",
                    { map: this.id, type: type }, this.userPriority);
            };
            PDFNet.RoleMap.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("RoleMap.getSDFObj", { map: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SElement.create = function(dict) {
                "undefined" === typeof dict && (dict = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("sElementCreate", { dict: dict.id },
                    this.userPriority).then(function(id) {
                    return new PDFNet.SElement(id);
                });
            };
            PDFNet.SElement.createFromPDFDoc = function(doc, struct_type) {
                checkArguments(arguments.length, 2, "createFromPDFDoc", "(PDFNet.PDFDoc, string)", [[doc, "PDFDoc"], [struct_type, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("sElementCreateFromPDFDoc", {
                    doc: doc.id,
                    struct_type: struct_type,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.SElement(id);
                });
            };
            PDFNet.SElement.prototype.insert = function(kid, insert_before) {
                checkArguments(arguments.length,
                    2, "insert", "(PDFNet.SElement, number)", [[kid, "Structure", PDFNet.SElement, "SElement"], [insert_before, "number"]]);
                checkThisYieldFunction("insert", this.yieldFunction);
                checkParamsYieldFunction("insert", [[kid, 0]]);
                var me = this;
                this.yieldFunction = "SElement.insert";
                kid.yieldFunction = "SElement.insert";
                return PDFNet.messageHandler.sendWithPromise("SElement.insert", {
                    e: this,
                    kid: kid,
                    insert_before: insert_before,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    kid.yieldFunction = void 0;
                    copyFunc(id.e,
                        me);
                    copyFunc(id.kid, kid);
                });
            };
            PDFNet.SElement.prototype.createContentItem = function(doc, page, insert_before) {
                "undefined" === typeof insert_before && (insert_before = -1);
                checkArguments(arguments.length, 2, "createContentItem", "(PDFNet.PDFDoc, PDFNet.Page, number)", [[doc, "PDFDoc"], [page, "Object", PDFNet.Page, "Page"], [insert_before, "number"]]);
                checkThisYieldFunction("createContentItem", this.yieldFunction);
                var me = this;
                this.yieldFunction = "SElement.createContentItem";
                return PDFNet.messageHandler.sendWithPromise("SElement.createContentItem",
                    {
                        e: this,
                        doc: doc.id,
                        page: page.id,
                        insert_before: insert_before,
                    }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.e, me);
                    return id.result;
                });
            };
            PDFNet.SElement.prototype.isValid = function() {
                checkThisYieldFunction("isValid", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.isValid", { e: this }, this.userPriority);
            };
            PDFNet.SElement.prototype.getType = function() {
                checkThisYieldFunction("getType", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getType",
                    { e: this }, this.userPriority);
            };
            PDFNet.SElement.prototype.getNumKids = function() {
                checkThisYieldFunction("getNumKids", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getNumKids", { e: this }, this.userPriority);
            };
            PDFNet.SElement.prototype.isContentItem = function(index) {
                checkArguments(arguments.length, 1, "isContentItem", "(number)", [[index, "number"]]);
                checkThisYieldFunction("isContentItem", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.isContentItem", {
                    e: this,
                    index: index,
                }, this.userPriority);
            };
            PDFNet.SElement.prototype.getAsContentItem = function(index) {
                checkArguments(arguments.length, 1, "getAsContentItem", "(number)", [[index, "number"]]);
                checkThisYieldFunction("getAsContentItem", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getAsContentItem", {
                    e: this,
                    index: index,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.ContentItem(id);
                });
            };
            PDFNet.SElement.prototype.getAsStructElem = function(index) {
                checkArguments(arguments.length, 1, "getAsStructElem",
                    "(number)", [[index, "number"]]);
                checkThisYieldFunction("getAsStructElem", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getAsStructElem", {
                    e: this,
                    index: index,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.SElement(id);
                });
            };
            PDFNet.SElement.prototype.getParent = function() {
                checkThisYieldFunction("getParent", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getParent", { e: this }, this.userPriority).then(function(id) {
                    return new PDFNet.SElement(id);
                });
            };
            PDFNet.SElement.prototype.getStructTreeRoot = function() {
                checkThisYieldFunction("getStructTreeRoot", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getStructTreeRoot", { e: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.STree, id);
                });
            };
            PDFNet.SElement.prototype.hasTitle = function() {
                checkThisYieldFunction("hasTitle", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.hasTitle", { e: this }, this.userPriority);
            };
            PDFNet.SElement.prototype.getTitle =
                function() {
                    checkThisYieldFunction("getTitle", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("SElement.getTitle", { e: this }, this.userPriority);
                };
            PDFNet.SElement.prototype.getID = function() {
                checkThisYieldFunction("getID", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getID", { e: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SElement.prototype.hasActualText = function() {
                checkThisYieldFunction("hasActualText", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.hasActualText", { e: this }, this.userPriority);
            };
            PDFNet.SElement.prototype.getActualText = function() {
                checkThisYieldFunction("getActualText", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getActualText", { e: this }, this.userPriority);
            };
            PDFNet.SElement.prototype.hasAlt = function() {
                checkThisYieldFunction("hasAlt", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.hasAlt", { e: this }, this.userPriority);
            };
            PDFNet.SElement.prototype.getAlt =
                function() {
                    checkThisYieldFunction("getAlt", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("SElement.getAlt", { e: this }, this.userPriority);
                };
            PDFNet.SElement.prototype.getSDFObj = function() {
                checkThisYieldFunction("getSDFObj", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("SElement.getSDFObj", { e: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.STree.create = function(struct_dict) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)",
                    [[struct_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("sTreeCreate", { struct_dict: struct_dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.STree, id);
                });
            };
            PDFNet.STree.createFromPDFDoc = function(doc) {
                checkArguments(arguments.length, 1, "createFromPDFDoc", "(PDFNet.PDFDoc)", [[doc, "PDFDoc"]]);
                return PDFNet.messageHandler.sendWithPromise("sTreeCreateFromPDFDoc", { doc: doc.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.STree, id);
                });
            };
            PDFNet.STree.prototype.insert = function(kid, insert_before) {
                checkArguments(arguments.length, 2, "insert", "(PDFNet.SElement, number)", [[kid, "Structure", PDFNet.SElement, "SElement"], [insert_before, "number"]]);
                checkParamsYieldFunction("insert", [[kid, 0]]);
                kid.yieldFunction = "STree.insert";
                return PDFNet.messageHandler.sendWithPromise("STree.insert", {
                    tree: this.id,
                    kid: kid,
                    insert_before: insert_before,
                }, this.userPriority).then(function(id) {
                    kid.yieldFunction = void 0;
                    copyFunc(id, kid);
                });
            };
            PDFNet.STree.prototype.copy =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("STree.copy", { c: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.STree, id);
                    });
                };
            PDFNet.STree.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("STree.isValid", { tree: this.id }, this.userPriority);
            };
            PDFNet.STree.prototype.getNumKids = function() {
                return PDFNet.messageHandler.sendWithPromise("STree.getNumKids", { tree: this.id }, this.userPriority);
            };
            PDFNet.STree.prototype.getKid = function(index) {
                checkArguments(arguments.length,
                    1, "getKid", "(number)", [[index, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("STree.getKid", {
                    tree: this.id,
                    index: index,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.SElement(id);
                });
            };
            PDFNet.STree.prototype.getRoleMap = function() {
                return PDFNet.messageHandler.sendWithPromise("STree.getRoleMap", { tree: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RoleMap, id);
                });
            };
            PDFNet.STree.prototype.getClassMap = function() {
                return PDFNet.messageHandler.sendWithPromise("STree.getClassMap",
                    { tree: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ClassMap, id);
                });
            };
            PDFNet.STree.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("STree.getSDFObj", { tree: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Action.createGoto = function(dest) {
                checkArguments(arguments.length, 1, "createGoto", "(PDFNet.Destination)", [[dest, "Object", PDFNet.Destination, "Destination"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateGoto",
                    { dest: dest.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createGotoWithKey = function(key, dest) {
                checkArguments(arguments.length, 2, "createGotoWithKey", "(string, PDFNet.Destination)", [[key, "string"], [dest, "Object", PDFNet.Destination, "Destination"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateGotoWithKey", {
                    key: key,
                    dest: dest.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createGotoRemote =
                function(file, page_num) {
                    checkArguments(arguments.length, 2, "createGotoRemote", "(PDFNet.FileSpec, number)", [[file, "Object", PDFNet.FileSpec, "FileSpec"], [page_num, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("actionCreateGotoRemote", {
                        file: file.id,
                        page_num: page_num,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Action, id);
                    });
                };
            PDFNet.Action.createGotoRemoteSetNewWindow = function(file, page_num, new_window) {
                checkArguments(arguments.length, 3, "createGotoRemoteSetNewWindow", "(PDFNet.FileSpec, number, boolean)",
                    [[file, "Object", PDFNet.FileSpec, "FileSpec"], [page_num, "number"], [new_window, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateGotoRemoteSetNewWindow", {
                    file: file.id,
                    page_num: page_num,
                    new_window: new_window,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createURI = function(sdfdoc, uri) {
                checkArguments(arguments.length, 2, "createURI", "(PDFNet.SDFDoc, string)", [[sdfdoc, "SDFDoc"], [uri, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateURI",
                    { sdfdoc: sdfdoc.id, uri: uri }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createURIWithUString = function(sdfdoc, current) {
                checkArguments(arguments.length, 2, "createURIWithUString", "(PDFNet.SDFDoc, string)", [[sdfdoc, "SDFDoc"], [current, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateURIWithUString", {
                    sdfdoc: sdfdoc.id,
                    current: current,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createSubmitForm =
                function(url) {
                    checkArguments(arguments.length, 1, "createSubmitForm", "(PDFNet.FileSpec)", [[url, "Object", PDFNet.FileSpec, "FileSpec"]]);
                    return PDFNet.messageHandler.sendWithPromise("actionCreateSubmitForm", { url: url.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Action, id);
                    });
                };
            PDFNet.Action.createLaunch = function(sdfdoc, path) {
                checkArguments(arguments.length, 2, "createLaunch", "(PDFNet.SDFDoc, string)", [[sdfdoc, "SDFDoc"], [path, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateLaunch",
                    { sdfdoc: sdfdoc.id, path: path }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createHideField = function(sdfdoc, field_names_list) {
                checkArguments(arguments.length, 2, "createHideField", "(PDFNet.SDFDoc, Array<string>)", [[sdfdoc, "SDFDoc"], [field_names_list, "Array"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateHideField", {
                    sdfdoc: sdfdoc.id,
                    field_names_list: field_names_list,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action,
                        id);
                });
            };
            PDFNet.Action.createImportData = function(sdfdoc, path) {
                checkArguments(arguments.length, 2, "createImportData", "(PDFNet.SDFDoc, string)", [[sdfdoc, "SDFDoc"], [path, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateImportData", {
                    sdfdoc: sdfdoc.id,
                    path: path,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createResetForm = function(sdfdoc) {
                checkArguments(arguments.length, 1, "createResetForm", "(PDFNet.SDFDoc)", [[sdfdoc, "SDFDoc"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateResetForm",
                    { sdfdoc: sdfdoc.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.createJavaScript = function(sdfdoc, script) {
                checkArguments(arguments.length, 2, "createJavaScript", "(PDFNet.SDFDoc, string)", [[sdfdoc, "SDFDoc"], [script, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreateJavaScript", {
                    sdfdoc: sdfdoc.id,
                    script: script,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.create = function(in_obj) {
                "undefined" ===
                typeof in_obj && (in_obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[in_obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("actionCreate", { in_obj: in_obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.copy", { in_action: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Action.prototype.compare =
                function(in_action) {
                    checkArguments(arguments.length, 1, "compare", "(PDFNet.Action)", [[in_action, "Object", PDFNet.Action, "Action"]]);
                    return PDFNet.messageHandler.sendWithPromise("Action.compare", {
                        action: this.id,
                        in_action: in_action.id,
                    }, this.userPriority);
                };
            PDFNet.Action.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.isValid", { action: this.id }, this.userPriority);
            };
            PDFNet.Action.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.getType", { action: this.id },
                    this.userPriority);
            };
            PDFNet.Action.prototype.getDest = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.getDest", { action: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Action.prototype.getNext = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.getNext", { action: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Action.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.getSDFObj",
                    { action: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Action.prototype.getFormActionFlag = function(flag) {
                checkArguments(arguments.length, 1, "getFormActionFlag", "(number)", [[flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Action.getFormActionFlag", {
                    action: this.id,
                    flag: flag,
                }, this.userPriority);
            };
            PDFNet.Action.prototype.setFormActionFlag = function(flag, value) {
                checkArguments(arguments.length, 2, "setFormActionFlag", "(number, boolean)", [[flag, "number"],
                    [value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Action.setFormActionFlag", {
                    action: this.id,
                    flag: flag,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.Action.prototype.needsWriteLock = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.needsWriteLock", { action: this.id }, this.userPriority);
            };
            PDFNet.Action.prototype.execute = function() {
                return PDFNet.messageHandler.sendWithPromise("Action.execute", { action: this.id }, this.userPriority);
            };
            PDFNet.Action.prototype.executeKeyStrokeAction = function(data) {
                checkArguments(arguments.length,
                    1, "executeKeyStrokeAction", "(PDFNet.KeyStrokeEventData)", [[data, "Object", PDFNet.KeyStrokeEventData, "KeyStrokeEventData"]]);
                return PDFNet.messageHandler.sendWithPromise("Action.executeKeyStrokeAction", {
                    action: this.id,
                    data: data.id,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.KeyStrokeActionResult, id);
                });
            };
            PDFNet.KeyStrokeActionResult.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("KeyStrokeActionResult.isValid", { action_ret: this.id }, this.userPriority);
            };
            PDFNet.KeyStrokeActionResult.prototype.getText = function() {
                return PDFNet.messageHandler.sendWithPromise("KeyStrokeActionResult.getText", { action_ret: this.id }, this.userPriority);
            };
            PDFNet.KeyStrokeActionResult.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("KeyStrokeActionResult.copy", { action_ret: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.KeyStrokeActionResult, id);
                });
            };
            PDFNet.KeyStrokeEventData.create = function(field_name, current, change, selection_start,
                selection_end) {
                checkArguments(arguments.length, 5, "create", "(string, string, string, number, number)", [[field_name, "string"], [current, "string"], [change, "string"], [selection_start, "number"], [selection_end, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("keyStrokeEventDataCreate", {
                    field_name: field_name,
                    current: current,
                    change: change,
                    selection_start: selection_start,
                    selection_end: selection_end,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.KeyStrokeEventData, id);
                });
            };
            PDFNet.KeyStrokeEventData.prototype.copy =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("KeyStrokeEventData.copy", { data: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.KeyStrokeEventData, id);
                    });
                };
            PDFNet.Page.create = function(page_dict) {
                "undefined" === typeof page_dict && (page_dict = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[page_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("pageCreate", { page_dict: page_dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Page,
                        id);
                });
            };
            PDFNet.Page.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.copy", { p: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Page, id);
                });
            };
            PDFNet.Page.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.isValid", { page: this.id }, this.userPriority);
            };
            PDFNet.Page.prototype.getIndex = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getIndex", { page: this.id }, this.userPriority);
            };
            PDFNet.Page.prototype.getTriggerAction =
                function(trigger) {
                    checkArguments(arguments.length, 1, "getTriggerAction", "(number)", [[trigger, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("Page.getTriggerAction", {
                        page: this.id,
                        trigger: trigger,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.Page.prototype.getBox = function(type) {
                checkArguments(arguments.length, 1, "getBox", "(number)", [[type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.getBox", {
                    page: this.id,
                    type: type,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Page.prototype.setBox = function(type, box) {
                checkArguments(arguments.length, 2, "setBox", "(number, PDFNet.Rect)", [[type, "number"], [box, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setBox", [[box, 1]]);
                return PDFNet.messageHandler.sendWithPromise("Page.setBox", {
                    page: this.id,
                    type: type,
                    box: box,
                }, this.userPriority);
            };
            PDFNet.Page.prototype.getCropBox = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getCropBox", { page: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Page.prototype.setCropBox = function(box) {
                checkArguments(arguments.length, 1, "setCropBox", "(PDFNet.Rect)", [[box, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setCropBox", [[box, 0]]);
                return PDFNet.messageHandler.sendWithPromise("Page.setCropBox", {
                    page: this.id,
                    box: box,
                }, this.userPriority);
            };
            PDFNet.Page.prototype.getMediaBox = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getMediaBox", { page: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Page.prototype.setMediaBox =
                function(box) {
                    checkArguments(arguments.length, 1, "setMediaBox", "(PDFNet.Rect)", [[box, "Structure", PDFNet.Rect, "Rect"]]);
                    checkParamsYieldFunction("setMediaBox", [[box, 0]]);
                    return PDFNet.messageHandler.sendWithPromise("Page.setMediaBox", {
                        page: this.id,
                        box: box,
                    }, this.userPriority);
                };
            PDFNet.Page.prototype.getVisibleContentBox = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getVisibleContentBox", { page: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Page.prototype.getRotation =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Page.getRotation", { page: this.id }, this.userPriority);
                };
            PDFNet.Page.prototype.setRotation = function(angle) {
                checkArguments(arguments.length, 1, "setRotation", "(number)", [[angle, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.setRotation", {
                    page: this.id,
                    angle: angle,
                }, this.userPriority);
            };
            PDFNet.Page.addRotations = function(r0, r1) {
                checkArguments(arguments.length, 2, "addRotations", "(number, number)", [[r0, "number"], [r1, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageAddRotations",
                    { r0: r0, r1: r1 }, this.userPriority);
            };
            PDFNet.Page.subtractRotations = function(r0, r1) {
                checkArguments(arguments.length, 2, "subtractRotations", "(number, number)", [[r0, "number"], [r1, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageSubtractRotations", {
                    r0: r0,
                    r1: r1,
                }, this.userPriority);
            };
            PDFNet.Page.rotationToDegree = function(r) {
                checkArguments(arguments.length, 1, "rotationToDegree", "(number)", [[r, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageRotationToDegree", { r: r }, this.userPriority);
            };
            PDFNet.Page.degreeToRotation = function(r) {
                checkArguments(arguments.length, 1, "degreeToRotation", "(number)", [[r, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageDegreeToRotation", { r: r }, this.userPriority);
            };
            PDFNet.Page.prototype.getPageWidth = function(box_type) {
                "undefined" === typeof box_type && (box_type = PDFNet.Page.Box.e_crop);
                checkArguments(arguments.length, 0, "getPageWidth", "(number)", [[box_type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.getPageWidth", { page: this.id, box_type: box_type },
                    this.userPriority);
            };
            PDFNet.Page.prototype.getPageHeight = function(box_type) {
                "undefined" === typeof box_type && (box_type = PDFNet.Page.Box.e_crop);
                checkArguments(arguments.length, 0, "getPageHeight", "(number)", [[box_type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.getPageHeight", {
                    page: this.id,
                    box_type: box_type,
                }, this.userPriority);
            };
            PDFNet.Page.prototype.getDefaultMatrix = function(flip_y, box_type, angle) {
                "undefined" === typeof flip_y && (flip_y = !1);
                "undefined" === typeof box_type && (box_type = PDFNet.Page.Box.e_crop);
                "undefined" === typeof angle && (angle = PDFNet.Page.Rotate.e_0);
                checkArguments(arguments.length, 0, "getDefaultMatrix", "(boolean, number, number)", [[flip_y, "boolean"], [box_type, "number"], [angle, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.getDefaultMatrix", {
                    page: this.id,
                    flip_y: flip_y,
                    box_type: box_type,
                    angle: angle,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Page.prototype.getAnnots = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getAnnots",
                    { page: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Page.prototype.getNumAnnots = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getNumAnnots", { page: this.id }, this.userPriority);
            };
            PDFNet.Page.prototype.getAnnot = function(index) {
                checkArguments(arguments.length, 1, "getAnnot", "(number)", [[index, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.getAnnot", {
                    page: this.id,
                    index: index,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Annot,
                        id);
                });
            };
            PDFNet.Page.prototype.annotInsert = function(pos, annot) {
                checkArguments(arguments.length, 2, "annotInsert", "(number, PDFNet.Annot)", [[pos, "number"], [annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.annotInsert", {
                    page: this.id,
                    pos: pos,
                    annot: annot.id,
                }, this.userPriority);
            };
            PDFNet.Page.prototype.annotPushBack = function(annot) {
                checkArguments(arguments.length, 1, "annotPushBack", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.annotPushBack",
                    { page: this.id, annot: annot.id }, this.userPriority);
            };
            PDFNet.Page.prototype.annotPushFront = function(annot) {
                checkArguments(arguments.length, 1, "annotPushFront", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.annotPushFront", {
                    page: this.id,
                    annot: annot.id,
                }, this.userPriority);
            };
            PDFNet.Page.prototype.annotRemove = function(annot) {
                checkArguments(arguments.length, 1, "annotRemove", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.annotRemove",
                    { page: this.id, annot: annot.id }, this.userPriority);
            };
            PDFNet.Page.prototype.annotRemoveByIndex = function(index) {
                checkArguments(arguments.length, 1, "annotRemoveByIndex", "(number)", [[index, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.annotRemoveByIndex", {
                    page: this.id,
                    index: index,
                }, this.userPriority);
            };
            PDFNet.Page.prototype.scale = function(scale) {
                checkArguments(arguments.length, 1, "scale", "(number)", [[scale, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.scale", { page: this.id, scale: scale },
                    this.userPriority);
            };
            PDFNet.Page.prototype.flattenField = function(field_to_flatten) {
                checkArguments(arguments.length, 1, "flattenField", "(PDFNet.Field)", [[field_to_flatten, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("flattenField", [[field_to_flatten, 0]]);
                field_to_flatten.yieldFunction = "Page.flattenField";
                return PDFNet.messageHandler.sendWithPromise("Page.flattenField", {
                    page: this.id,
                    field_to_flatten: field_to_flatten,
                }, this.userPriority).then(function(id) {
                    field_to_flatten.yieldFunction = void 0;
                    copyFunc(id, field_to_flatten);
                });
            };
            PDFNet.Page.prototype.hasTransition = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.hasTransition", { page: this.id }, this.userPriority);
            };
            PDFNet.Page.prototype.getUserUnitSize = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getUserUnitSize", { page: this.id }, this.userPriority);
            };
            PDFNet.Page.prototype.setUserUnitSize = function(unit_size) {
                checkArguments(arguments.length, 1, "setUserUnitSize", "(number)", [[unit_size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.setUserUnitSize",
                    { page: this.id, unit_size: unit_size }, this.userPriority);
            };
            PDFNet.Page.prototype.getResourceDict = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getResourceDict", { page: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Page.prototype.getContents = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getContents", { page: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Page.prototype.getThumb = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getThumb",
                    { page: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Page.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Page.getSDFObj", { page: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Page.prototype.findInheritedAttribute = function(attrib) {
                checkArguments(arguments.length, 1, "findInheritedAttribute", "(string)", [[attrib, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Page.findInheritedAttribute",
                    { page: this.id, attrib: attrib }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Annot.create = function(doc, type, pos) {
                checkArguments(arguments.length, 3, "create", "(PDFNet.SDFDoc, number, PDFNet.Rect)", [[doc, "SDFDoc"], [type, "number"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 2]]);
                return PDFNet.messageHandler.sendWithPromise("annotCreate", {
                    doc: doc.id,
                    type: type,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Annot,
                        id);
                });
            };
            PDFNet.Annot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("annotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Annot, id);
                });
            };
            PDFNet.Annot.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.copy", { d: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Annot,
                        id);
                });
            };
            PDFNet.Annot.prototype.compare = function(d) {
                checkArguments(arguments.length, 1, "compare", "(PDFNet.Annot)", [[d, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.compare", {
                    annot: this.id,
                    d: d.id,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.isValid", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getSDFObj", { annot: this.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Annot.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getType", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.isMarkup = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.isMarkup", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.getRect = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getRect", { annot: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Annot.prototype.getVisibleContentBox = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getVisibleContentBox", { annot: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Annot.prototype.setRect = function(pos) {
                checkArguments(arguments.length, 1, "setRect", "(PDFNet.Rect)", [[pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setRect", [[pos, 0]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setRect", {
                    annot: this.id,
                    pos: pos,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.resize = function(newrect) {
                checkArguments(arguments.length, 1, "resize", "(PDFNet.Rect)", [[newrect, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("resize", [[newrect, 0]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.resize", {
                    annot: this.id,
                    newrect: newrect,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.setContents = function(contents) {
                checkArguments(arguments.length, 1, "setContents", "(string)", [[contents, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setContents",
                    { annot: this.id, contents: contents }, this.userPriority);
            };
            PDFNet.Annot.prototype.getContents = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getContents", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.getTriggerAction = function(trigger) {
                checkArguments(arguments.length, 1, "getTriggerAction", "(number)", [[trigger, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.getTriggerAction", {
                    annot: this.id,
                    trigger: trigger,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.Annot.prototype.getCustomData = function(key) {
                checkArguments(arguments.length, 1, "getCustomData", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.getCustomData", {
                    annot: this.id,
                    key: key,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.setCustomData = function(key, value) {
                checkArguments(arguments.length, 2, "setCustomData", "(string, string)", [[key, "string"], [value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setCustomData", {
                        annot: this.id,
                        key: key,
                        value: value,
                    },
                    this.userPriority);
            };
            PDFNet.Annot.prototype.deleteCustomData = function(key) {
                checkArguments(arguments.length, 1, "deleteCustomData", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.deleteCustomData", {
                    annot: this.id,
                    key: key,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.getPage = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getPage", { annot: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Page, id);
                });
            };
            PDFNet.Annot.prototype.setPage = function(page) {
                checkArguments(arguments.length,
                    1, "setPage", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setPage", {
                    annot: this.id,
                    page: page.id,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.getUniqueID = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getUniqueID", { annot: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Annot.prototype.getDate = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getDate", { annot: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Date(id);
                });
            };
            PDFNet.Annot.prototype.setDate = function(date) {
                checkArguments(arguments.length, 1, "setDate", "(PDFNet.Date)", [[date, "Structure", PDFNet.Date, "Date"]]);
                checkParamsYieldFunction("setDate", [[date, 0]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setDate", {
                    annot: this.id,
                    date: date,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.getFlag = function(flag) {
                checkArguments(arguments.length, 1, "getFlag", "(number)", [[flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.getFlag", { annot: this.id, flag: flag },
                    this.userPriority);
            };
            PDFNet.Annot.prototype.setFlag = function(flag, value) {
                checkArguments(arguments.length, 2, "setFlag", "(number, boolean)", [[flag, "number"], [value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setFlag", {
                    annot: this.id,
                    flag: flag,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.create = function(s, b_width, b_hr, b_vr) {
                checkArguments(arguments.length, 4, "create", "(number, number, number, number)", [[s, "number"], [b_width, "number"], [b_hr, "number"], [b_vr, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("annotBorderStyleCreate",
                    { s: s, b_width: b_width, b_hr: b_hr, b_vr: b_vr }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.AnnotBorderStyle, id);
                });
            };
            PDFNet.AnnotBorderStyle.createWithDashPattern = function(s, b_width, b_hr, b_vr, buffer) {
                checkArguments(arguments.length, 5, "createWithDashPattern", "(number, number, number, number, Array)", [[s, "number"], [b_width, "number"], [b_hr, "number"], [b_vr, "number"], [buffer, "ArrayAsBuffer"]]);
                var bufferArrayBuffer = getArrayBuffer(buffer, !0);
                return PDFNet.messageHandler.sendWithPromise("annotBorderStyleCreateWithDashPattern",
                    {
                        s: s,
                        b_width: b_width,
                        b_hr: b_hr,
                        b_vr: b_vr,
                        buffer: bufferArrayBuffer,
                    }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.AnnotBorderStyle, id);
                });
            };
            PDFNet.AnnotBorderStyle.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.copy", { bs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.AnnotBorderStyle, id);
                });
            };
            PDFNet.AnnotBorderStyle.prototype.getStyle = function() {
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.getStyle",
                    { bs: this.id }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.setStyle = function(style) {
                checkArguments(arguments.length, 1, "setStyle", "(number)", [[style, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.setStyle", {
                    bs: this.id,
                    style: style,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.getAppearance = function(annot_state, app_state) {
                "undefined" === typeof annot_state && (annot_state = PDFNet.Annot.State.e_normal);
                "undefined" === typeof app_state && (app_state = null);
                checkArguments(arguments.length,
                    0, "getAppearance", "(number, string)", [[annot_state, "number"], [app_state, "const char* = 0"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.getAppearance", {
                    annot: this.id,
                    annot_state: annot_state,
                    app_state: app_state,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Annot.prototype.setAppearance = function(app_stream, annot_state, app_state) {
                "undefined" === typeof annot_state && (annot_state = PDFNet.Annot.State.e_normal);
                "undefined" === typeof app_state && (app_state = null);
                checkArguments(arguments.length, 1, "setAppearance", "(PDFNet.Obj, number, string)", [[app_stream, "Object", PDFNet.Obj, "Obj"], [annot_state, "number"], [app_state, "const char* = 0"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setAppearance", {
                    annot: this.id,
                    app_stream: app_stream.id,
                    annot_state: annot_state,
                    app_state: app_state,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.removeAppearance = function(annot_state, app_state) {
                "undefined" === typeof annot_state && (annot_state = PDFNet.Annot.State.e_normal);
                "undefined" ===
                typeof app_state && (app_state = null);
                checkArguments(arguments.length, 0, "removeAppearance", "(number, string)", [[annot_state, "number"], [app_state, "const char* = 0"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.removeAppearance", {
                    annot: this.id,
                    annot_state: annot_state,
                    app_state: app_state,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.flatten = function(page) {
                checkArguments(arguments.length, 1, "flatten", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.flatten",
                    { annot: this.id, page: page.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.getActiveAppearanceState = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getActiveAppearanceState", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.setActiveAppearanceState = function(astate) {
                checkArguments(arguments.length, 1, "setActiveAppearanceState", "(string)", [[astate, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setActiveAppearanceState", {
                    annot: this.id,
                    astate: astate,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.getColor = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getColor", { annot: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.Annot.prototype.getColorAsRGB = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getColorAsRGB", { annot: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.Annot.prototype.getColorAsCMYK = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getColorAsCMYK",
                    { annot: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.Annot.prototype.getColorAsGray = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getColorAsGray", { annot: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.Annot.prototype.getColorCompNum = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getColorCompNum", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.setColorDefault =
                function(col) {
                    checkArguments(arguments.length, 1, "setColorDefault", "(PDFNet.ColorPt)", [[col, "Object", PDFNet.ColorPt, "ColorPt"]]);
                    return PDFNet.messageHandler.sendWithPromise("Annot.setColorDefault", {
                        annot: this.id,
                        col: col.id,
                    }, this.userPriority);
                };
            PDFNet.Annot.prototype.setColor = function(col, numcomp) {
                "undefined" === typeof numcomp && (numcomp = 3);
                checkArguments(arguments.length, 1, "setColor", "(PDFNet.ColorPt, number)", [[col, "Object", PDFNet.ColorPt, "ColorPt"], [numcomp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setColor",
                    { annot: this.id, col: col.id, numcomp: numcomp }, this.userPriority);
            };
            PDFNet.Annot.prototype.getStructParent = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getStructParent", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.setStructParent = function(parkeyval) {
                checkArguments(arguments.length, 1, "setStructParent", "(number)", [[parkeyval, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setStructParent", {
                    annot: this.id,
                    parkeyval: parkeyval,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.getOptionalContent =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Annot.getOptionalContent", { annot: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.Annot.prototype.setOptionalContent = function(content) {
                checkArguments(arguments.length, 1, "setOptionalContent", "(PDFNet.Obj)", [[content, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setOptionalContent", {
                    annot: this.id,
                    content: content.id,
                }, this.userPriority);
            };
            PDFNet.Annot.prototype.refreshAppearance =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Annot.refreshAppearance", { annot: this.id }, this.userPriority);
                };
            PDFNet.Annot.prototype.refreshAppearanceRefreshOptions = function(options) {
                "undefined" === typeof options && (options = null);
                checkArguments(arguments.length, 0, "refreshAppearanceRefreshOptions", "(PDFNet.OptionBase)", [[options, "OptionBase"]]);
                checkParamsYieldFunction("refreshAppearanceRefreshOptions", [[options, 0]]);
                options = options ? options.getJsonString() : "{}";
                return PDFNet.messageHandler.sendWithPromise("Annot.refreshAppearanceRefreshOptions",
                    { annot: this.id, options: options }, this.userPriority);
            };
            PDFNet.Annot.prototype.getRotation = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getRotation", { annot: this.id }, this.userPriority);
            };
            PDFNet.Annot.prototype.setRotation = function(angle) {
                checkArguments(arguments.length, 1, "setRotation", "(number)", [[angle, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setRotation", {
                    annot: this.id,
                    angle: angle,
                }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.getWidth = function() {
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.getWidth",
                    { bs: this.id }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.setWidth = function(width) {
                checkArguments(arguments.length, 1, "setWidth", "(number)", [[width, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.setWidth", {
                    bs: this.id,
                    width: width,
                }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.getHR = function() {
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.getHR", { bs: this.id }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.setHR = function(horizontal_radius) {
                checkArguments(arguments.length,
                    1, "setHR", "(number)", [[horizontal_radius, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.setHR", {
                    bs: this.id,
                    horizontal_radius: horizontal_radius,
                }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.getVR = function() {
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.getVR", { bs: this.id }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.setVR = function(vertical_radius) {
                checkArguments(arguments.length, 1, "setVR", "(number)", [[vertical_radius, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.setVR",
                    { bs: this.id, vertical_radius: vertical_radius }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.getDashPattern = function() {
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.getDashPattern", { bs: this.id }, this.userPriority).then(function(id) {
                    return new Float64Array(id);
                });
            };
            PDFNet.Annot.prototype.getBorderStyle = function() {
                return PDFNet.messageHandler.sendWithPromise("Annot.getBorderStyle", { annot: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.AnnotBorderStyle,
                        id);
                });
            };
            PDFNet.Annot.prototype.setBorderStyle = function(bs, oldStyleOnly) {
                "undefined" === typeof oldStyleOnly && (oldStyleOnly = !1);
                checkArguments(arguments.length, 1, "setBorderStyle", "(PDFNet.AnnotBorderStyle, boolean)", [[bs, "Object", PDFNet.AnnotBorderStyle, "AnnotBorderStyle"], [oldStyleOnly, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Annot.setBorderStyle", {
                    annot: this.id,
                    bs: bs.id,
                    oldStyleOnly: oldStyleOnly,
                }, this.userPriority);
            };
            PDFNet.Annot.getBorderStyleStyle = function(bs) {
                checkArguments(arguments.length,
                    1, "getBorderStyleStyle", "(PDFNet.AnnotBorderStyle)", [[bs, "Object", PDFNet.AnnotBorderStyle, "AnnotBorderStyle"]]);
                return PDFNet.messageHandler.sendWithPromise("annotGetBorderStyleStyle", { bs: bs.id }, this.userPriority);
            };
            PDFNet.Annot.setBorderStyleStyle = function(bs, bst) {
                checkArguments(arguments.length, 2, "setBorderStyleStyle", "(PDFNet.AnnotBorderStyle, number)", [[bs, "Object", PDFNet.AnnotBorderStyle, "AnnotBorderStyle"], [bst, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("annotSetBorderStyleStyle",
                    { bs: bs.id, bst: bst }, this.userPriority);
            };
            PDFNet.AnnotBorderStyle.prototype.compare = function(b) {
                checkArguments(arguments.length, 1, "compare", "(PDFNet.AnnotBorderStyle)", [[b, "Object", PDFNet.AnnotBorderStyle, "AnnotBorderStyle"]]);
                return PDFNet.messageHandler.sendWithPromise("AnnotBorderStyle.compare", {
                    a: this.id,
                    b: b.id,
                }, this.userPriority);
            };
            PDFNet.CaretAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object",
                    PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("caretAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CaretAnnot, id);
                });
            };
            PDFNet.CaretAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("caretAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CaretAnnot,
                        id);
                });
            };
            PDFNet.CaretAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("caretAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CaretAnnot, id);
                });
            };
            PDFNet.CaretAnnot.prototype.getSymbol = function() {
                return PDFNet.messageHandler.sendWithPromise("CaretAnnot.getSymbol",
                    { caret: this.id }, this.userPriority);
            };
            PDFNet.CaretAnnot.prototype.setSymbol = function(symbol) {
                checkArguments(arguments.length, 1, "setSymbol", "(string)", [[symbol, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("CaretAnnot.setSymbol", {
                    caret: this.id,
                    symbol: symbol,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("lineAnnotCreateFromObj",
                    { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.LineAnnot, id);
                });
            };
            PDFNet.LineAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("lineAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.LineAnnot, id);
                });
            };
            PDFNet.LineAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create",
                    "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("lineAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.LineAnnot, id);
                });
            };
            PDFNet.LineAnnot.prototype.getStartPoint = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getStartPoint", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setStartPoint = function(sp) {
                checkArguments(arguments.length,
                    1, "setStartPoint", "(PDFNet.Point)", [[sp, "Structure", PDFNet.Point, "Point"]]);
                checkParamsYieldFunction("setStartPoint", [[sp, 0]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setStartPoint", {
                    line: this.id,
                    sp: sp,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getEndPoint = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getEndPoint", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setEndPoint = function(ep) {
                checkArguments(arguments.length, 1, "setEndPoint", "(PDFNet.Point)",
                    [[ep, "Structure", PDFNet.Point, "Point"]]);
                checkParamsYieldFunction("setEndPoint", [[ep, 0]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setEndPoint", {
                    line: this.id,
                    ep: ep,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getStartStyle = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getStartStyle", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setStartStyle = function(ss) {
                checkArguments(arguments.length, 1, "setStartStyle", "(number)", [[ss, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setStartStyle",
                    { line: this.id, ss: ss }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getEndStyle = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getEndStyle", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setEndStyle = function(es) {
                checkArguments(arguments.length, 1, "setEndStyle", "(number)", [[es, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setEndStyle", {
                    line: this.id,
                    es: es,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getLeaderLineLength = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getLeaderLineLength",
                    { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setLeaderLineLength = function(length) {
                checkArguments(arguments.length, 1, "setLeaderLineLength", "(number)", [[length, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setLeaderLineLength", {
                    line: this.id,
                    length: length,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getLeaderLineExtensionLength = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getLeaderLineExtensionLength", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setLeaderLineExtensionLength = function(length) {
                checkArguments(arguments.length, 1, "setLeaderLineExtensionLength", "(number)", [[length, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setLeaderLineExtensionLength", {
                    line: this.id,
                    length: length,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getShowCaption = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getShowCaption", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setShowCaption =
                function(showCaption) {
                    checkArguments(arguments.length, 1, "setShowCaption", "(boolean)", [[showCaption, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("LineAnnot.setShowCaption", {
                        line: this.id,
                        showCaption: showCaption,
                    }, this.userPriority);
                };
            PDFNet.LineAnnot.prototype.getIntentType = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getIntentType", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setIntentType = function(it) {
                checkArguments(arguments.length, 1, "setIntentType",
                    "(number)", [[it, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setIntentType", {
                    line: this.id,
                    it: it,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getCapPos = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getCapPos", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setCapPos = function(it) {
                checkArguments(arguments.length, 1, "setCapPos", "(number)", [[it, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setCapPos", { line: this.id, it: it },
                    this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getLeaderLineOffset = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getLeaderLineOffset", { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setLeaderLineOffset = function(length) {
                checkArguments(arguments.length, 1, "setLeaderLineOffset", "(number)", [[length, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setLeaderLineOffset", {
                    line: this.id,
                    length: length,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getTextHOffset =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("LineAnnot.getTextHOffset", { line: this.id }, this.userPriority);
                };
            PDFNet.LineAnnot.prototype.setTextHOffset = function(offset) {
                checkArguments(arguments.length, 1, "setTextHOffset", "(number)", [[offset, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setTextHOffset", {
                    line: this.id,
                    offset: offset,
                }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.getTextVOffset = function() {
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.getTextVOffset",
                    { line: this.id }, this.userPriority);
            };
            PDFNet.LineAnnot.prototype.setTextVOffset = function(offset) {
                checkArguments(arguments.length, 1, "setTextVOffset", "(number)", [[offset, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LineAnnot.setTextVOffset", {
                    line: this.id,
                    offset: offset,
                }, this.userPriority);
            };
            PDFNet.CircleAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("circleAnnotCreateFromObj",
                    { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CircleAnnot, id);
                });
            };
            PDFNet.CircleAnnot.createFromAnnot = function(circle) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[circle, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("circleAnnotCreateFromAnnot", { circle: circle.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CircleAnnot, id);
                });
            };
            PDFNet.CircleAnnot.create = function(doc, pos) {
                checkArguments(arguments.length,
                    2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("circleAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CircleAnnot, id);
                });
            };
            PDFNet.CircleAnnot.prototype.getInteriorColor = function() {
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.getInteriorColor", { circle: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt,
                        id);
                });
            };
            PDFNet.CircleAnnot.prototype.getInteriorColorCompNum = function() {
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.getInteriorColorCompNum", { circle: this.id }, this.userPriority);
            };
            PDFNet.CircleAnnot.prototype.setInteriorColorDefault = function(col) {
                checkArguments(arguments.length, 1, "setInteriorColorDefault", "(PDFNet.ColorPt)", [[col, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.setInteriorColorDefault", {
                    circle: this.id,
                    col: col.id,
                }, this.userPriority);
            };
            PDFNet.CircleAnnot.prototype.setInteriorColor = function(col, numcomp) {
                checkArguments(arguments.length, 2, "setInteriorColor", "(PDFNet.ColorPt, number)", [[col, "Object", PDFNet.ColorPt, "ColorPt"], [numcomp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.setInteriorColor", {
                    circle: this.id,
                    col: col.id,
                    numcomp: numcomp,
                }, this.userPriority);
            };
            PDFNet.CircleAnnot.prototype.getContentRect = function() {
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.getContentRect", { circle: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.CircleAnnot.prototype.setContentRect = function(cr) {
                checkArguments(arguments.length, 1, "setContentRect", "(PDFNet.Rect)", [[cr, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setContentRect", [[cr, 0]]);
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.setContentRect", {
                    circle: this.id,
                    cr: cr,
                }, this.userPriority);
            };
            PDFNet.CircleAnnot.prototype.getPadding = function() {
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.getPadding", { circle: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.CircleAnnot.prototype.setPadding = function(cr) {
                checkArguments(arguments.length, 1, "setPadding", "(PDFNet.Rect)", [[cr, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setPadding", [[cr, 0]]);
                return PDFNet.messageHandler.sendWithPromise("CircleAnnot.setPadding", {
                    circle: this.id,
                    cr: cr,
                }, this.userPriority);
            };
            PDFNet.FileAttachmentAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj,
                    "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("fileAttachmentAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileAttachmentAnnot, id);
                });
            };
            PDFNet.FileAttachmentAnnot.prototype["export"] = function(save_as) {
                "undefined" === typeof save_as && (save_as = "");
                checkArguments(arguments.length, 0, "export", "(string)", [[save_as, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.export", {
                    fileatt: this.id,
                    save_as: save_as,
                }, this.userPriority);
            };
            PDFNet.FileAttachmentAnnot.prototype.createFromAnnot = function() {
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.createFromAnnot", { fileatt: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Annot, id);
                });
            };
            PDFNet.FileAttachmentAnnot.createWithFileSpec = function(doc, pos, fs, icon_name) {
                "undefined" === typeof icon_name && (icon_name = PDFNet.FileAttachmentAnnot.Icon.e_PushPin);
                checkArguments(arguments.length, 3, "createWithFileSpec", "(PDFNet.SDFDoc, PDFNet.Rect, PDFNet.FileSpec, number)",
                    [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [fs, "Object", PDFNet.FileSpec, "FileSpec"], [icon_name, "number"]]);
                checkParamsYieldFunction("createWithFileSpec", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("fileAttachmentAnnotCreateWithFileSpec", {
                    doc: doc.id,
                    pos: pos,
                    fs: fs.id,
                    icon_name: icon_name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileAttachmentAnnot, id);
                });
            };
            PDFNet.FileAttachmentAnnot.createDefault = function(doc, pos, path) {
                checkArguments(arguments.length, 3,
                    "createDefault", "(PDFNet.SDFDoc, PDFNet.Rect, string)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [path, "string"]]);
                checkParamsYieldFunction("createDefault", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("fileAttachmentAnnotCreateDefault", {
                    doc: doc.id,
                    pos: pos,
                    path: path,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileAttachmentAnnot, id);
                });
            };
            PDFNet.FileAttachmentAnnot.prototype.getFileSpec = function() {
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.getFileSpec",
                    { fileatt: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileSpec, id);
                });
            };
            PDFNet.FileAttachmentAnnot.prototype.setFileSpec = function(file) {
                checkArguments(arguments.length, 1, "setFileSpec", "(PDFNet.FileSpec)", [[file, "Object", PDFNet.FileSpec, "FileSpec"]]);
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.setFileSpec", {
                    fileatt: this.id,
                    file: file.id,
                }, this.userPriority);
            };
            PDFNet.FileAttachmentAnnot.prototype.getIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.getIcon",
                    { fileatt: this.id }, this.userPriority);
            };
            PDFNet.FileAttachmentAnnot.prototype.setIcon = function(type) {
                "undefined" === typeof type && (type = PDFNet.FileAttachmentAnnot.Icon.e_PushPin);
                checkArguments(arguments.length, 0, "setIcon", "(number)", [[type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.setIcon", {
                    fileatt: this.id,
                    type: type,
                }, this.userPriority);
            };
            PDFNet.FileAttachmentAnnot.prototype.getIconName = function() {
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.getIconName",
                    { fileatt: this.id }, this.userPriority);
            };
            PDFNet.FileAttachmentAnnot.prototype.setIconName = function(iname) {
                checkArguments(arguments.length, 1, "setIconName", "(string)", [[iname, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FileAttachmentAnnot.setIconName", {
                    fileatt: this.id,
                    iname: iname,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("freeTextAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FreeTextAnnot, id);
                });
            };
            PDFNet.FreeTextAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("freeTextAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FreeTextAnnot, id);
                });
            };
            PDFNet.FreeTextAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("freeTextAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FreeTextAnnot, id);
                });
            };
            PDFNet.FreeTextAnnot.prototype.getDefaultAppearance = function() {
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getDefaultAppearance",
                    { ft: this.id }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.setDefaultAppearance = function(app_str) {
                checkArguments(arguments.length, 1, "setDefaultAppearance", "(string)", [[app_str, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setDefaultAppearance", {
                    ft: this.id,
                    app_str: app_str,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.getQuaddingFormat = function() {
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getQuaddingFormat", { ft: this.id }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.setQuaddingFormat =
                function(format) {
                    checkArguments(arguments.length, 1, "setQuaddingFormat", "(number)", [[format, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setQuaddingFormat", {
                        ft: this.id,
                        format: format,
                    }, this.userPriority);
                };
            PDFNet.FreeTextAnnot.prototype.getCalloutLinePoints = function() {
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getCalloutLinePoints", { ft: this.id }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.setCalloutLinePoints = function(p1, p2, p3) {
                checkArguments(arguments.length,
                    3, "setCalloutLinePoints", "(PDFNet.Point, PDFNet.Point, PDFNet.Point)", [[p1, "Structure", PDFNet.Point, "Point"], [p2, "Structure", PDFNet.Point, "Point"], [p3, "Structure", PDFNet.Point, "Point"]]);
                checkParamsYieldFunction("setCalloutLinePoints", [[p1, 0], [p2, 1], [p3, 2]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setCalloutLinePoints", {
                    ft: this.id,
                    p1: p1,
                    p2: p2,
                    p3: p3,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.setCalloutLinePointsTwo = function(p1, p2) {
                checkArguments(arguments.length, 2, "setCalloutLinePointsTwo",
                    "(PDFNet.Point, PDFNet.Point)", [[p1, "Structure", PDFNet.Point, "Point"], [p2, "Structure", PDFNet.Point, "Point"]]);
                checkParamsYieldFunction("setCalloutLinePointsTwo", [[p1, 0], [p2, 1]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setCalloutLinePointsTwo", {
                    ft: this.id,
                    p1: p1,
                    p2: p2,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.getIntentName = function() {
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getIntentName", { ft: this.id }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.setIntentName =
                function(mode) {
                    "undefined" === typeof mode && (mode = PDFNet.FreeTextAnnot.IntentName.e_FreeText);
                    checkArguments(arguments.length, 0, "setIntentName", "(number)", [[mode, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setIntentName", {
                        ft: this.id,
                        mode: mode,
                    }, this.userPriority);
                };
            PDFNet.FreeTextAnnot.prototype.setIntentNameDefault = function() {
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setIntentNameDefault", { ft: this.id }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.getEndingStyle =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getEndingStyle", { ft: this.id }, this.userPriority);
                };
            PDFNet.FreeTextAnnot.prototype.setEndingStyle = function(style) {
                checkArguments(arguments.length, 1, "setEndingStyle", "(number)", [[style, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setEndingStyle", {
                    ft: this.id,
                    style: style,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.setEndingStyleName = function(est) {
                checkArguments(arguments.length, 1, "setEndingStyleName",
                    "(string)", [[est, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setEndingStyleName", {
                    ft: this.id,
                    est: est,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.setTextColor = function(color, col_comp) {
                checkArguments(arguments.length, 2, "setTextColor", "(PDFNet.ColorPt, number)", [[color, "Object", PDFNet.ColorPt, "ColorPt"], [col_comp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setTextColor", {
                    ft: this.id,
                    color: color.id,
                    col_comp: col_comp,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.getTextColor =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getTextColor", { ft: this.id }, this.userPriority).then(function(id) {
                        id.color = createDestroyableObj(PDFNet.ColorPt, id.color);
                        return id;
                    });
                };
            PDFNet.FreeTextAnnot.prototype.setLineColor = function(color, col_comp) {
                checkArguments(arguments.length, 2, "setLineColor", "(PDFNet.ColorPt, number)", [[color, "Object", PDFNet.ColorPt, "ColorPt"], [col_comp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setLineColor", {
                    ft: this.id, color: color.id,
                    col_comp: col_comp,
                }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.getLineColor = function() {
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getLineColor", { ft: this.id }, this.userPriority).then(function(id) {
                    id.color = createDestroyableObj(PDFNet.ColorPt, id.color);
                    return id;
                });
            };
            PDFNet.FreeTextAnnot.prototype.setFontSize = function(font_size) {
                checkArguments(arguments.length, 1, "setFontSize", "(number)", [[font_size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.setFontSize",
                    { ft: this.id, font_size: font_size }, this.userPriority);
            };
            PDFNet.FreeTextAnnot.prototype.getFontSize = function() {
                return PDFNet.messageHandler.sendWithPromise("FreeTextAnnot.getFontSize", { ft: this.id }, this.userPriority);
            };
            PDFNet.HighlightAnnot.createFromObj = function(d) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("highlightAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.HighlightAnnot,
                        id);
                });
            };
            PDFNet.HighlightAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("highlightAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.HighlightAnnot, id);
                });
            };
            PDFNet.HighlightAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect,
                    "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("highlightAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.HighlightAnnot, id);
                });
            };
            PDFNet.InkAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("inkAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.InkAnnot,
                        id);
                });
            };
            PDFNet.InkAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("inkAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.InkAnnot, id);
                });
            };
            PDFNet.InkAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create",
                    [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("inkAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.InkAnnot, id);
                });
            };
            PDFNet.InkAnnot.prototype.getPathCount = function() {
                return PDFNet.messageHandler.sendWithPromise("InkAnnot.getPathCount", { ink: this.id }, this.userPriority);
            };
            PDFNet.InkAnnot.prototype.getPointCount = function(pathindex) {
                checkArguments(arguments.length, 1, "getPointCount", "(number)", [[pathindex, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("InkAnnot.getPointCount",
                    { ink: this.id, pathindex: pathindex }, this.userPriority);
            };
            PDFNet.InkAnnot.prototype.getPoint = function(pathindex, pointindex) {
                checkArguments(arguments.length, 2, "getPoint", "(number, number)", [[pathindex, "number"], [pointindex, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("InkAnnot.getPoint", {
                    ink: this.id,
                    pathindex: pathindex,
                    pointindex: pointindex,
                }, this.userPriority);
            };
            PDFNet.InkAnnot.prototype.setPoint = function(pathindex, pointindex, pt) {
                checkArguments(arguments.length, 3, "setPoint", "(number, number, PDFNet.Point)",
                    [[pathindex, "number"], [pointindex, "number"], [pt, "Structure", PDFNet.Point, "Point"]]);
                checkParamsYieldFunction("setPoint", [[pt, 2]]);
                return PDFNet.messageHandler.sendWithPromise("InkAnnot.setPoint", {
                    ink: this.id,
                    pathindex: pathindex,
                    pointindex: pointindex,
                    pt: pt,
                }, this.userPriority);
            };
            PDFNet.InkAnnot.prototype.erase = function(pt1, pt2, width) {
                checkArguments(arguments.length, 3, "erase", "(PDFNet.Point, PDFNet.Point, number)", [[pt1, "Structure", PDFNet.Point, "Point"], [pt2, "Structure", PDFNet.Point, "Point"], [width, "number"]]);
                checkParamsYieldFunction("erase", [[pt1, 0], [pt2, 1]]);
                return PDFNet.messageHandler.sendWithPromise("InkAnnot.erase", {
                    ink: this.id,
                    pt1: pt1,
                    pt2: pt2,
                    width: width,
                }, this.userPriority);
            };
            PDFNet.InkAnnot.prototype.getHighlightIntent = function() {
                return PDFNet.messageHandler.sendWithPromise("InkAnnot.getHighlightIntent", { ink: this.id }, this.userPriority);
            };
            PDFNet.InkAnnot.prototype.setHighlightIntent = function(highlight) {
                checkArguments(arguments.length, 1, "setHighlightIntent", "(boolean)", [[highlight, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("InkAnnot.setHighlightIntent",
                    { ink: this.id, highlight: highlight }, this.userPriority);
            };
            PDFNet.LinkAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("linkAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.LinkAnnot, id);
                });
            };
            PDFNet.LinkAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot",
                    "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("linkAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.LinkAnnot, id);
                });
            };
            PDFNet.LinkAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("linkAnnotCreate",
                    { doc: doc.id, pos: pos }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.LinkAnnot, id);
                });
            };
            PDFNet.LinkAnnot.prototype.removeAction = function() {
                return PDFNet.messageHandler.sendWithPromise("LinkAnnot.removeAction", { link: this.id }, this.userPriority);
            };
            PDFNet.LinkAnnot.prototype.getAction = function() {
                return PDFNet.messageHandler.sendWithPromise("LinkAnnot.getAction", { link: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.LinkAnnot.prototype.setAction =
                function(action) {
                    checkArguments(arguments.length, 1, "setAction", "(PDFNet.Action)", [[action, "Object", PDFNet.Action, "Action"]]);
                    return PDFNet.messageHandler.sendWithPromise("LinkAnnot.setAction", {
                        link: this.id,
                        action: action.id,
                    }, this.userPriority);
                };
            PDFNet.LinkAnnot.prototype.getHighlightingMode = function() {
                return PDFNet.messageHandler.sendWithPromise("LinkAnnot.getHighlightingMode", { link: this.id }, this.userPriority);
            };
            PDFNet.LinkAnnot.prototype.setHighlightingMode = function(value) {
                checkArguments(arguments.length,
                    1, "setHighlightingMode", "(number)", [[value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LinkAnnot.setHighlightingMode", {
                    link: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.LinkAnnot.prototype.getQuadPointCount = function() {
                return PDFNet.messageHandler.sendWithPromise("LinkAnnot.getQuadPointCount", { link: this.id }, this.userPriority);
            };
            PDFNet.LinkAnnot.prototype.getQuadPoint = function(idx) {
                checkArguments(arguments.length, 1, "getQuadPoint", "(number)", [[idx, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("LinkAnnot.getQuadPoint",
                    { link: this.id, idx: idx }, this.userPriority);
            };
            PDFNet.LinkAnnot.prototype.setQuadPoint = function(idx, qp) {
                checkArguments(arguments.length, 2, "setQuadPoint", "(number, PDFNet.QuadPoint)", [[idx, "number"], [qp, "Structure", PDFNet.QuadPoint, "QuadPoint"]]);
                checkParamsYieldFunction("setQuadPoint", [[qp, 1]]);
                return PDFNet.messageHandler.sendWithPromise("LinkAnnot.setQuadPoint", {
                    link: this.id,
                    idx: idx,
                    qp: qp,
                }, this.userPriority);
            };
            PDFNet.getNormalizedUrl = function(url) {
                checkArguments(arguments.length, 1, "getNormalizedUrl",
                    "(string)", [[url, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("getNormalizedUrl", { url: url }, this.userPriority);
            };
            PDFNet.MarkupAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("markupAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.MarkupAnnot, id);
                });
            };
            PDFNet.MarkupAnnot.createFromAnnot =
                function(ann) {
                    checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                    return PDFNet.messageHandler.sendWithPromise("markupAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.MarkupAnnot, id);
                    });
                };
            PDFNet.MarkupAnnot.prototype.getTitle = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getTitle", { markup: this.id }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setTitle = function(title) {
                checkArguments(arguments.length,
                    1, "setTitle", "(string)", [[title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setTitle", {
                    markup: this.id,
                    title: title,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setTitleUString = function(title) {
                checkArguments(arguments.length, 1, "setTitleUString", "(string)", [[title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setTitleUString", {
                    markup: this.id,
                    title: title,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.getPopup = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getPopup",
                    { markup: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Annot, id);
                });
            };
            PDFNet.MarkupAnnot.prototype.setPopup = function(ppup) {
                checkArguments(arguments.length, 1, "setPopup", "(PDFNet.Annot)", [[ppup, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setPopup", {
                    markup: this.id,
                    ppup: ppup.id,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.getOpacity = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getOpacity", { markup: this.id },
                    this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setOpacity = function(op) {
                checkArguments(arguments.length, 1, "setOpacity", "(number)", [[op, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setOpacity", {
                    markup: this.id,
                    op: op,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.getSubject = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getSubject", { markup: this.id }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setSubject = function(contents) {
                checkArguments(arguments.length,
                    1, "setSubject", "(string)", [[contents, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setSubject", {
                    markup: this.id,
                    contents: contents,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.getCreationDates = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getCreationDates", { markup: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Date(id);
                });
            };
            PDFNet.MarkupAnnot.prototype.getBorderEffect = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getBorderEffect",
                    { markup: this.id }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setBorderEffect = function(effect) {
                "undefined" === typeof effect && (effect = PDFNet.MarkupAnnot.BorderEffect.e_None);
                checkArguments(arguments.length, 0, "setBorderEffect", "(number)", [[effect, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setBorderEffect", {
                    markup: this.id,
                    effect: effect,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.getBorderEffectIntensity = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getBorderEffectIntensity",
                    { markup: this.id }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setBorderEffectIntensity = function(intensity) {
                "undefined" === typeof intensity && (intensity = 0);
                checkArguments(arguments.length, 0, "setBorderEffectIntensity", "(number)", [[intensity, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setBorderEffectIntensity", {
                    markup: this.id,
                    intensity: intensity,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setCreationDates = function(dt) {
                checkArguments(arguments.length, 1, "setCreationDates",
                    "(PDFNet.Date)", [[dt, "Structure", PDFNet.Date, "Date"]]);
                checkParamsYieldFunction("setCreationDates", [[dt, 0]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setCreationDates", {
                    markup: this.id,
                    dt: dt,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.getInteriorColor = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getInteriorColor", { markup: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.MarkupAnnot.prototype.getInteriorColorCompNum =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getInteriorColorCompNum", { markup: this.id }, this.userPriority);
                };
            PDFNet.MarkupAnnot.prototype.setInteriorColorRGB = function(col) {
                checkArguments(arguments.length, 1, "setInteriorColorRGB", "(PDFNet.ColorPt)", [[col, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setInteriorColorRGB", {
                    markup: this.id,
                    col: col.id,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.setInteriorColor = function(c, compnum) {
                checkArguments(arguments.length,
                    2, "setInteriorColor", "(PDFNet.ColorPt, number)", [[c, "Object", PDFNet.ColorPt, "ColorPt"], [compnum, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setInteriorColor", {
                    markup: this.id,
                    c: c.id,
                    compnum: compnum,
                }, this.userPriority);
            };
            PDFNet.MarkupAnnot.prototype.getContentRect = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getContentRect", { markup: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.MarkupAnnot.prototype.setContentRect =
                function(cr) {
                    checkArguments(arguments.length, 1, "setContentRect", "(PDFNet.Rect)", [[cr, "Structure", PDFNet.Rect, "Rect"]]);
                    checkParamsYieldFunction("setContentRect", [[cr, 0]]);
                    return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setContentRect", {
                        markup: this.id,
                        cr: cr,
                    }, this.userPriority);
                };
            PDFNet.MarkupAnnot.prototype.getPadding = function() {
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.getPadding", { markup: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.MarkupAnnot.prototype.setPadding =
                function(rd) {
                    checkArguments(arguments.length, 1, "setPadding", "(PDFNet.Rect)", [[rd, "Structure", PDFNet.Rect, "Rect"]]);
                    checkParamsYieldFunction("setPadding", [[rd, 0]]);
                    return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.setPadding", {
                        markup: this.id,
                        rd: rd,
                    }, this.userPriority);
                };
            PDFNet.MarkupAnnot.prototype.rotateAppearance = function(angle) {
                checkArguments(arguments.length, 1, "rotateAppearance", "(number)", [[angle, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("MarkupAnnot.rotateAppearance", {
                    markup: this.id,
                    angle: angle,
                }, this.userPriority);
            };
            PDFNet.MovieAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("movieAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.MovieAnnot, id);
                });
            };
            PDFNet.MovieAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)",
                    [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("movieAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.MovieAnnot, id);
                });
            };
            PDFNet.MovieAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("movieAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.MovieAnnot, id);
                });
            };
            PDFNet.MovieAnnot.prototype.getTitle = function() {
                return PDFNet.messageHandler.sendWithPromise("MovieAnnot.getTitle", { movie: this.id }, this.userPriority);
            };
            PDFNet.MovieAnnot.prototype.setTitle = function(title) {
                checkArguments(arguments.length, 1, "setTitle", "(string)", [[title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("MovieAnnot.setTitle", {
                    movie: this.id,
                    title: title,
                }, this.userPriority);
            };
            PDFNet.MovieAnnot.prototype.isToBePlayed =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("MovieAnnot.isToBePlayed", { movie: this.id }, this.userPriority);
                };
            PDFNet.MovieAnnot.prototype.setToBePlayed = function(isplay) {
                "undefined" === typeof isplay && (isplay = !0);
                checkArguments(arguments.length, 0, "setToBePlayed", "(boolean)", [[isplay, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("MovieAnnot.setToBePlayed", {
                    movie: this.id,
                    isplay: isplay,
                }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("polyLineAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PolyLineAnnot, id);
                });
            };
            PDFNet.PolyLineAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("polyLineAnnotCreateFromAnnot",
                    { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PolyLineAnnot, id);
                });
            };
            PDFNet.PolyLineAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("polyLineAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PolyLineAnnot, id);
                });
            };
            PDFNet.PolyLineAnnot.prototype.getVertexCount =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.getVertexCount", { polyline: this.id }, this.userPriority);
                };
            PDFNet.PolyLineAnnot.prototype.getVertex = function(idx) {
                checkArguments(arguments.length, 1, "getVertex", "(number)", [[idx, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.getVertex", {
                    polyline: this.id,
                    idx: idx,
                }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.prototype.setVertex = function(idx, pt) {
                checkArguments(arguments.length, 2, "setVertex", "(number, PDFNet.Point)",
                    [[idx, "number"], [pt, "Structure", PDFNet.Point, "Point"]]);
                checkParamsYieldFunction("setVertex", [[pt, 1]]);
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.setVertex", {
                    polyline: this.id,
                    idx: idx,
                    pt: pt,
                }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.prototype.getStartStyle = function() {
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.getStartStyle", { polyline: this.id }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.prototype.setStartStyle = function(style) {
                checkArguments(arguments.length, 1, "setStartStyle",
                    "(number)", [[style, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.setStartStyle", {
                    polyline: this.id,
                    style: style,
                }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.prototype.getEndStyle = function() {
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.getEndStyle", { polyline: this.id }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.prototype.setEndStyle = function(style) {
                checkArguments(arguments.length, 1, "setEndStyle", "(number)", [[style, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.setEndStyle",
                    { polyline: this.id, style: style }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.prototype.getIntentName = function() {
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.getIntentName", { polyline: this.id }, this.userPriority);
            };
            PDFNet.PolyLineAnnot.prototype.setIntentName = function(mode) {
                checkArguments(arguments.length, 1, "setIntentName", "(number)", [[mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PolyLineAnnot.setIntentName", {
                    polyline: this.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.PolygonAnnot.createFromObj =
                function(d) {
                    "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                    checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                    return PDFNet.messageHandler.sendWithPromise("polygonAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.PolygonAnnot, id);
                    });
                };
            PDFNet.PolygonAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("polygonAnnotCreateFromAnnot",
                    { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PolygonAnnot, id);
                });
            };
            PDFNet.PolygonAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("polygonAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PolygonAnnot, id);
                });
            };
            PDFNet.PopupAnnot.createFromObj =
                function(d) {
                    "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                    checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                    return PDFNet.messageHandler.sendWithPromise("popupAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.PopupAnnot, id);
                    });
                };
            PDFNet.PopupAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("popupAnnotCreateFromAnnot",
                    { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PopupAnnot, id);
                });
            };
            PDFNet.PopupAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("popupAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PopupAnnot, id);
                });
            };
            PDFNet.PopupAnnot.prototype.getParent =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PopupAnnot.getParent", { popup: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Annot, id);
                    });
                };
            PDFNet.PopupAnnot.prototype.setParent = function(parent) {
                checkArguments(arguments.length, 1, "setParent", "(PDFNet.Annot)", [[parent, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("PopupAnnot.setParent", {
                    popup: this.id,
                    parent: parent.id,
                }, this.userPriority);
            };
            PDFNet.PopupAnnot.prototype.isOpen = function() {
                return PDFNet.messageHandler.sendWithPromise("PopupAnnot.isOpen",
                    { popup: this.id }, this.userPriority);
            };
            PDFNet.PopupAnnot.prototype.setOpen = function(isopen) {
                checkArguments(arguments.length, 1, "setOpen", "(boolean)", [[isopen, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PopupAnnot.setOpen", {
                    popup: this.id,
                    isopen: isopen,
                }, this.userPriority);
            };
            PDFNet.RedactionAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("redactionAnnotCreateFromObj",
                    { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RedactionAnnot, id);
                });
            };
            PDFNet.RedactionAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("redactionAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RedactionAnnot, id);
                });
            };
            PDFNet.RedactionAnnot.create = function(doc, pos) {
                checkArguments(arguments.length,
                    2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("redactionAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RedactionAnnot, id);
                });
            };
            PDFNet.RedactionAnnot.prototype.getQuadPointCount = function() {
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.getQuadPointCount", { redaction: this.id }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.getQuadPoint = function(idx) {
                checkArguments(arguments.length, 1, "getQuadPoint", "(number)", [[idx, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.getQuadPoint", {
                    redaction: this.id,
                    idx: idx,
                }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.setQuadPoint = function(idx, qp) {
                checkArguments(arguments.length, 2, "setQuadPoint", "(number, PDFNet.QuadPoint)", [[idx, "number"], [qp, "Structure", PDFNet.QuadPoint, "QuadPoint"]]);
                checkParamsYieldFunction("setQuadPoint",
                    [[qp, 1]]);
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.setQuadPoint", {
                    redaction: this.id,
                    idx: idx,
                    qp: qp,
                }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.setAppFormXO = function(formxo) {
                checkArguments(arguments.length, 1, "setAppFormXO", "(PDFNet.Obj)", [[formxo, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.setAppFormXO", {
                    redaction: this.id,
                    formxo: formxo.id,
                }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.getOverlayText = function() {
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.getOverlayText",
                    { redaction: this.id }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.setOverlayText = function(title) {
                checkArguments(arguments.length, 1, "setOverlayText", "(string)", [[title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.setOverlayText", {
                    redaction: this.id,
                    title: title,
                }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.getUseRepeat = function() {
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.getUseRepeat", { redaction: this.id }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.setUseRepeat =
                function(userepeat) {
                    "undefined" === typeof userepeat && (userepeat = !1);
                    checkArguments(arguments.length, 0, "setUseRepeat", "(boolean)", [[userepeat, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.setUseRepeat", {
                        redaction: this.id,
                        userepeat: userepeat,
                    }, this.userPriority);
                };
            PDFNet.RedactionAnnot.prototype.getOverlayTextAppearance = function() {
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.getOverlayTextAppearance", { redaction: this.id }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.setOverlayTextAppearance =
                function(app) {
                    checkArguments(arguments.length, 1, "setOverlayTextAppearance", "(string)", [[app, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.setOverlayTextAppearance", {
                        redaction: this.id,
                        app: app,
                    }, this.userPriority);
                };
            PDFNet.RedactionAnnot.prototype.getQuadForm = function() {
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.getQuadForm", { redaction: this.id }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.setQuadForm = function(form) {
                "undefined" === typeof form && (form = PDFNet.RedactionAnnot.QuadForm.e_LeftJustified);
                checkArguments(arguments.length, 0, "setQuadForm", "(number)", [[form, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.setQuadForm", {
                    redaction: this.id,
                    form: form,
                }, this.userPriority);
            };
            PDFNet.RedactionAnnot.prototype.getAppFormXO = function() {
                return PDFNet.messageHandler.sendWithPromise("RedactionAnnot.getAppFormXO", { redaction: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.RubberStampAnnot.createFromObj = function(d) {
                "undefined" === typeof d &&
                (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("rubberStampAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RubberStampAnnot, id);
                });
            };
            PDFNet.RubberStampAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("rubberStampAnnotCreateFromAnnot",
                    { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RubberStampAnnot, id);
                });
            };
            PDFNet.RubberStampAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("rubberStampAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RubberStampAnnot,
                        id);
                });
            };
            PDFNet.RubberStampAnnot.createCustom = function(doc, pos, formxo) {
                checkArguments(arguments.length, 3, "createCustom", "(PDFNet.SDFDoc, PDFNet.Rect, PDFNet.Obj)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [formxo, "Object", PDFNet.Obj, "Obj"]]);
                checkParamsYieldFunction("createCustom", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("rubberStampAnnotCreateCustom", {
                    doc: doc.id,
                    pos: pos,
                    formxo: formxo.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RubberStampAnnot, id);
                });
            };
            PDFNet.RubberStampAnnot.prototype.getIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("RubberStampAnnot.getIcon", { stamp: this.id }, this.userPriority);
            };
            PDFNet.RubberStampAnnot.prototype.setIcon = function(type) {
                "undefined" === typeof type && (type = PDFNet.RubberStampAnnot.Icon.e_Draft);
                checkArguments(arguments.length, 0, "setIcon", "(number)", [[type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("RubberStampAnnot.setIcon", {
                    stamp: this.id,
                    type: type,
                }, this.userPriority);
            };
            PDFNet.RubberStampAnnot.prototype.setIconDefault =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("RubberStampAnnot.setIconDefault", { stamp: this.id }, this.userPriority);
                };
            PDFNet.RubberStampAnnot.prototype.getIconName = function() {
                return PDFNet.messageHandler.sendWithPromise("RubberStampAnnot.getIconName", { stamp: this.id }, this.userPriority);
            };
            PDFNet.RubberStampAnnot.prototype.setIconName = function(iconstring) {
                checkArguments(arguments.length, 1, "setIconName", "(string)", [[iconstring, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("RubberStampAnnot.setIconName",
                    { stamp: this.id, iconstring: iconstring }, this.userPriority);
            };
            PDFNet.ScreenAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("screenAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ScreenAnnot, id);
                });
            };
            PDFNet.ScreenAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot",
                    "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("screenAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ScreenAnnot, id);
                });
            };
            PDFNet.ScreenAnnot.prototype.getTitle = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getTitle", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setTitle = function(title) {
                checkArguments(arguments.length, 1, "setTitle", "(string)", [[title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setTitle", {
                    s: this.id,
                    title: title,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("screenAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ScreenAnnot, id);
                });
            };
            PDFNet.ScreenAnnot.prototype.getAction = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getAction", { s: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.ScreenAnnot.prototype.setAction = function(action) {
                checkArguments(arguments.length, 1, "setAction", "(PDFNet.Action)", [[action, "Object", PDFNet.Action, "Action"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setAction", {
                    s: this.id,
                    action: action.id,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getBorderColor =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getBorderColor", { s: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.ColorPt, id);
                    });
                };
            PDFNet.ScreenAnnot.prototype.setBorderColor = function(col, numcomp) {
                checkArguments(arguments.length, 2, "setBorderColor", "(PDFNet.ColorPt, number)", [[col, "Object", PDFNet.ColorPt, "ColorPt"], [numcomp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setBorderColor", {
                        s: this.id,
                        col: col.id,
                        numcomp: numcomp,
                    },
                    this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getBorderColorCompNum = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getBorderColorCompNum", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getBackgroundColorCompNum = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getBackgroundColorCompNum", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getBackgroundColor = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getBackgroundColor",
                    { s: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.ScreenAnnot.prototype.setBackgroundColor = function(col, numcomp) {
                checkArguments(arguments.length, 2, "setBackgroundColor", "(PDFNet.ColorPt, number)", [[col, "Object", PDFNet.ColorPt, "ColorPt"], [numcomp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setBackgroundColor", {
                    s: this.id,
                    col: col.id,
                    numcomp: numcomp,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getStaticCaptionText = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getStaticCaptionText",
                    { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setStaticCaptionText = function(contents) {
                checkArguments(arguments.length, 1, "setStaticCaptionText", "(string)", [[contents, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setStaticCaptionText", {
                    s: this.id,
                    contents: contents,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getRolloverCaptionText = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getRolloverCaptionText", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setRolloverCaptionText =
                function(contents) {
                    checkArguments(arguments.length, 1, "setRolloverCaptionText", "(string)", [[contents, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setRolloverCaptionText", {
                        s: this.id,
                        contents: contents,
                    }, this.userPriority);
                };
            PDFNet.ScreenAnnot.prototype.getMouseDownCaptionText = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getMouseDownCaptionText", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setMouseDownCaptionText = function(contents) {
                checkArguments(arguments.length,
                    1, "setMouseDownCaptionText", "(string)", [[contents, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setMouseDownCaptionText", {
                    s: this.id,
                    contents: contents,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getStaticIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getStaticIcon", { s: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ScreenAnnot.prototype.setStaticIcon = function(icon) {
                checkArguments(arguments.length,
                    1, "setStaticIcon", "(PDFNet.Obj)", [[icon, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setStaticIcon", {
                    s: this.id,
                    icon: icon.id,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getRolloverIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getRolloverIcon", { s: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ScreenAnnot.prototype.setRolloverIcon = function(icon) {
                checkArguments(arguments.length, 1,
                    "setRolloverIcon", "(PDFNet.Obj)", [[icon, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setRolloverIcon", {
                    s: this.id,
                    icon: icon.id,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getMouseDownIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getMouseDownIcon", { s: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ScreenAnnot.prototype.setMouseDownIcon = function(icon) {
                checkArguments(arguments.length,
                    1, "setMouseDownIcon", "(PDFNet.Obj)", [[icon, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setMouseDownIcon", {
                    s: this.id,
                    icon: icon.id,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getScaleType = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getScaleType", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setScaleType = function(st) {
                checkArguments(arguments.length, 1, "setScaleType", "(number)", [[st, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setScaleType",
                    { s: this.id, st: st }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getIconCaptionRelation = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getIconCaptionRelation", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setIconCaptionRelation = function(icr) {
                checkArguments(arguments.length, 1, "setIconCaptionRelation", "(number)", [[icr, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setIconCaptionRelation", {
                    s: this.id,
                    icr: icr,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getScaleCondition =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getScaleCondition", { s: this.id }, this.userPriority);
                };
            PDFNet.ScreenAnnot.prototype.setScaleCondition = function(sc) {
                checkArguments(arguments.length, 1, "setScaleCondition", "(number)", [[sc, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setScaleCondition", {
                    s: this.id,
                    sc: sc,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getFitFull = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getFitFull", { s: this.id },
                    this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setFitFull = function(ff) {
                checkArguments(arguments.length, 1, "setFitFull", "(boolean)", [[ff, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setFitFull", {
                    s: this.id,
                    ff: ff,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getHIconLeftOver = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getHIconLeftOver", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setHIconLeftOver = function(hl) {
                checkArguments(arguments.length,
                    1, "setHIconLeftOver", "(number)", [[hl, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setHIconLeftOver", {
                    s: this.id,
                    hl: hl,
                }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.getVIconLeftOver = function() {
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.getVIconLeftOver", { s: this.id }, this.userPriority);
            };
            PDFNet.ScreenAnnot.prototype.setVIconLeftOver = function(vl) {
                checkArguments(arguments.length, 1, "setVIconLeftOver", "(number)", [[vl, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ScreenAnnot.setVIconLeftOver",
                    { s: this.id, vl: vl }, this.userPriority);
            };
            PDFNet.SoundAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("soundAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SoundAnnot, id);
                });
            };
            PDFNet.SoundAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)",
                    [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("soundAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SoundAnnot, id);
                });
            };
            PDFNet.SoundAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("soundAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SoundAnnot, id);
                });
            };
            PDFNet.SoundAnnot.createWithData = function(doc, pos, stream, sample_bits, sample_freq, num_channels) {
                checkArguments(arguments.length, 6, "createWithData", "(PDFNet.SDFDoc, PDFNet.Rect, PDFNet.Filter, number, number, number)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [stream, "Object", PDFNet.Filter, "Filter"], [sample_bits, "number"], [sample_freq, "number"], [num_channels, "number"]]);
                checkParamsYieldFunction("createWithData",
                    [[pos, 1]]);
                0 != stream.id && avoidCleanup(stream.id);
                return PDFNet.messageHandler.sendWithPromise("soundAnnotCreateWithData", {
                    doc: doc.id,
                    pos: pos,
                    no_own_stream: stream.id,
                    sample_bits: sample_bits,
                    sample_freq: sample_freq,
                    num_channels: num_channels,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SoundAnnot, id);
                });
            };
            PDFNet.SoundAnnot.createAtPoint = function(doc, pos) {
                checkArguments(arguments.length, 2, "createAtPoint", "(PDFNet.SDFDoc, PDFNet.Point)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Point,
                    "Point"]]);
                checkParamsYieldFunction("createAtPoint", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("soundAnnotCreateAtPoint", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SoundAnnot, id);
                });
            };
            PDFNet.SoundAnnot.prototype.getSoundStream = function() {
                return PDFNet.messageHandler.sendWithPromise("SoundAnnot.getSoundStream", { sound: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SoundAnnot.prototype.setSoundStream =
                function(icon) {
                    checkArguments(arguments.length, 1, "setSoundStream", "(PDFNet.Obj)", [[icon, "Object", PDFNet.Obj, "Obj"]]);
                    return PDFNet.messageHandler.sendWithPromise("SoundAnnot.setSoundStream", {
                        sound: this.id,
                        icon: icon.id,
                    }, this.userPriority);
                };
            PDFNet.SoundAnnot.prototype.getIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("SoundAnnot.getIcon", { sound: this.id }, this.userPriority);
            };
            PDFNet.SoundAnnot.prototype.setIcon = function(type) {
                "undefined" === typeof type && (type = PDFNet.SoundAnnot.Icon.e_Speaker);
                checkArguments(arguments.length, 0, "setIcon", "(number)", [[type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SoundAnnot.setIcon", {
                    sound: this.id,
                    type: type,
                }, this.userPriority);
            };
            PDFNet.SoundAnnot.prototype.getIconName = function() {
                return PDFNet.messageHandler.sendWithPromise("SoundAnnot.getIconName", { sound: this.id }, this.userPriority);
            };
            PDFNet.SoundAnnot.prototype.setIconName = function(type) {
                checkArguments(arguments.length, 1, "setIconName", "(string)", [[type, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SoundAnnot.setIconName",
                    { sound: this.id, type: type }, this.userPriority);
            };
            PDFNet.SquareAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("squareAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SquareAnnot, id);
                });
            };
            PDFNet.SquareAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot",
                    "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("squareAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SquareAnnot, id);
                });
            };
            PDFNet.SquareAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("squareAnnotCreate",
                    { doc: doc.id, pos: pos }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SquareAnnot, id);
                });
            };
            PDFNet.SquareAnnot.prototype.getInteriorColor = function() {
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.getInteriorColor", { square: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.SquareAnnot.prototype.getInteriorColorCompNum = function() {
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.getInteriorColorCompNum", { square: this.id },
                    this.userPriority);
            };
            PDFNet.SquareAnnot.prototype.setInteriorColorDefault = function(col) {
                checkArguments(arguments.length, 1, "setInteriorColorDefault", "(PDFNet.ColorPt)", [[col, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.setInteriorColorDefault", {
                    square: this.id,
                    col: col.id,
                }, this.userPriority);
            };
            PDFNet.SquareAnnot.prototype.setInteriorColor = function(col, numcomp) {
                checkArguments(arguments.length, 2, "setInteriorColor", "(PDFNet.ColorPt, number)", [[col, "Object",
                    PDFNet.ColorPt, "ColorPt"], [numcomp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.setInteriorColor", {
                    square: this.id,
                    col: col.id,
                    numcomp: numcomp,
                }, this.userPriority);
            };
            PDFNet.SquareAnnot.prototype.getContentRect = function() {
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.getContentRect", { square: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.SquareAnnot.prototype.setContentRect = function(cr) {
                checkArguments(arguments.length, 1, "setContentRect",
                    "(PDFNet.Rect)", [[cr, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setContentRect", [[cr, 0]]);
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.setContentRect", {
                    square: this.id,
                    cr: cr,
                }, this.userPriority);
            };
            PDFNet.SquareAnnot.prototype.getPadding = function() {
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.getPadding", { square: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.SquareAnnot.prototype.setPadding = function(cr) {
                checkArguments(arguments.length,
                    1, "setPadding", "(PDFNet.Rect)", [[cr, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setPadding", [[cr, 0]]);
                return PDFNet.messageHandler.sendWithPromise("SquareAnnot.setPadding", {
                    square: this.id,
                    cr: cr,
                }, this.userPriority);
            };
            PDFNet.SquigglyAnnot.createFromObj = function(d) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("squigglyAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SquigglyAnnot,
                        id);
                });
            };
            PDFNet.SquigglyAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("squigglyAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SquigglyAnnot, id);
                });
            };
            PDFNet.SquigglyAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect,
                    "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("squigglyAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SquigglyAnnot, id);
                });
            };
            PDFNet.StrikeOutAnnot.createFromObj = function(d) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("strikeOutAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.StrikeOutAnnot,
                        id);
                });
            };
            PDFNet.StrikeOutAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("strikeOutAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.StrikeOutAnnot, id);
                });
            };
            PDFNet.StrikeOutAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect,
                    "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("strikeOutAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.StrikeOutAnnot, id);
                });
            };
            PDFNet.TextAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("textAnnotCreateFromObj", { d: d.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextAnnot, id);
                });
            };
            PDFNet.TextAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("textAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextAnnot, id);
                });
            };
            PDFNet.TextAnnot.createAtPoint = function(doc, pos) {
                checkArguments(arguments.length, 2, "createAtPoint",
                    "(PDFNet.SDFDoc, PDFNet.Point)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Point, "Point"]]);
                checkParamsYieldFunction("createAtPoint", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("textAnnotCreateAtPoint", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextAnnot, id);
                });
            };
            PDFNet.TextAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create",
                    [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("textAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextAnnot, id);
                });
            };
            PDFNet.TextAnnot.prototype.isOpen = function() {
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.isOpen", { text: this.id }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.setOpen = function(isopen) {
                checkArguments(arguments.length, 1, "setOpen", "(boolean)", [[isopen, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.setOpen",
                    { text: this.id, isopen: isopen }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.getIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.getIcon", { text: this.id }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.setIcon = function(icon) {
                "undefined" === typeof icon && (icon = PDFNet.TextAnnot.Icon.e_Note);
                checkArguments(arguments.length, 0, "setIcon", "(number)", [[icon, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.setIcon", {
                    text: this.id,
                    icon: icon,
                }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.setIconDefault =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("TextAnnot.setIconDefault", { text: this.id }, this.userPriority);
                };
            PDFNet.TextAnnot.prototype.getIconName = function() {
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.getIconName", { text: this.id }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.setIconName = function(icon) {
                checkArguments(arguments.length, 1, "setIconName", "(string)", [[icon, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.setIconName", {
                    text: this.id,
                    icon: icon,
                }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.getState = function() {
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.getState", { text: this.id }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.setState = function(state) {
                "undefined" === typeof state && (state = "");
                checkArguments(arguments.length, 0, "setState", "(string)", [[state, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.setState", {
                    text: this.id,
                    state: state,
                }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.getStateModel = function() {
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.getStateModel",
                    { text: this.id }, this.userPriority);
            };
            PDFNet.TextAnnot.prototype.setStateModel = function(sm) {
                checkArguments(arguments.length, 1, "setStateModel", "(string)", [[sm, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("TextAnnot.setStateModel", {
                    text: this.id,
                    sm: sm,
                }, this.userPriority);
            };
            PDFNet.UnderlineAnnot.createFromObj = function(d) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("underlineAnnotCreateFromObj", { d: d.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.UnderlineAnnot, id);
                });
            };
            PDFNet.UnderlineAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("underlineAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.UnderlineAnnot, id);
                });
            };
            PDFNet.UnderlineAnnot.create = function(doc, pos) {
                checkArguments(arguments.length,
                    2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("underlineAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.UnderlineAnnot, id);
                });
            };
            PDFNet.WatermarkAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj,
                    "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("watermarkAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.WatermarkAnnot, id);
                });
            };
            PDFNet.WatermarkAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("watermarkAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.WatermarkAnnot,
                        id);
                });
            };
            PDFNet.WatermarkAnnot.create = function(doc, pos) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, PDFNet.Rect)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("watermarkAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.WatermarkAnnot, id);
                });
            };
            PDFNet.TextMarkupAnnot.createFromObj = function(d) {
                checkArguments(arguments.length, 1, "createFromObj",
                    "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("textMarkupAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextMarkupAnnot, id);
                });
            };
            PDFNet.TextMarkupAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("textMarkupAnnotCreateFromAnnot", { ann: ann.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextMarkupAnnot,
                        id);
                });
            };
            PDFNet.TextMarkupAnnot.prototype.getQuadPointCount = function() {
                return PDFNet.messageHandler.sendWithPromise("TextMarkupAnnot.getQuadPointCount", { textmarkup: this.id }, this.userPriority);
            };
            PDFNet.TextMarkupAnnot.prototype.getQuadPoint = function(idx) {
                checkArguments(arguments.length, 1, "getQuadPoint", "(number)", [[idx, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("TextMarkupAnnot.getQuadPoint", {
                    textmarkup: this.id,
                    idx: idx,
                }, this.userPriority);
            };
            PDFNet.TextMarkupAnnot.prototype.setQuadPoint = function(idx,
                qp) {
                checkArguments(arguments.length, 2, "setQuadPoint", "(number, PDFNet.QuadPoint)", [[idx, "number"], [qp, "Structure", PDFNet.QuadPoint, "QuadPoint"]]);
                checkParamsYieldFunction("setQuadPoint", [[qp, 1]]);
                return PDFNet.messageHandler.sendWithPromise("TextMarkupAnnot.setQuadPoint", {
                    textmarkup: this.id,
                    idx: idx,
                    qp: qp,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.create = function(doc, pos, field) {
                checkArguments(arguments.length, 3, "create", "(PDFNet.SDFDoc, PDFNet.Rect, PDFNet.Field)", [[doc, "SDFDoc"], [pos, "Structure", PDFNet.Rect,
                    "Rect"], [field, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("create", [[pos, 1], [field, 2]]);
                field.yieldFunction = "WidgetAnnot.create";
                return PDFNet.messageHandler.sendWithPromise("widgetAnnotCreate", {
                    doc: doc.id,
                    pos: pos,
                    field: field,
                }, this.userPriority).then(function(id) {
                    field.yieldFunction = void 0;
                    id.result = createPDFNetObj(PDFNet.WidgetAnnot, id.result);
                    copyFunc(id.field, field);
                    return id.result;
                });
            };
            PDFNet.WidgetAnnot.createFromObj = function(d) {
                "undefined" === typeof d && (d = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("widgetAnnotCreateFromObj", { d: d.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.WidgetAnnot, id);
                });
            };
            PDFNet.WidgetAnnot.createFromAnnot = function(ann) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[ann, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("widgetAnnotCreateFromAnnot", { ann: ann.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.WidgetAnnot, id);
                });
            };
            PDFNet.WidgetAnnot.prototype.getField = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getField", { widget: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Field(id);
                });
            };
            PDFNet.WidgetAnnot.prototype.getHighlightingMode = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getHighlightingMode", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setHighlightingMode =
                function(value) {
                    "undefined" === typeof value && (value = PDFNet.WidgetAnnot.HighlightingMode.e_invert);
                    checkArguments(arguments.length, 0, "setHighlightingMode", "(number)", [[value, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setHighlightingMode", {
                        widget: this.id,
                        value: value,
                    }, this.userPriority);
                };
            PDFNet.WidgetAnnot.prototype.getAction = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getAction", { widget: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action,
                        id);
                });
            };
            PDFNet.WidgetAnnot.prototype.setAction = function(action) {
                checkArguments(arguments.length, 1, "setAction", "(PDFNet.Action)", [[action, "Object", PDFNet.Action, "Action"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setAction", {
                    widget: this.id,
                    action: action.id,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getBorderColor = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getBorderColor", { widget: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt,
                        id);
                });
            };
            PDFNet.WidgetAnnot.prototype.setBorderColor = function(col, compnum) {
                checkArguments(arguments.length, 2, "setBorderColor", "(PDFNet.ColorPt, number)", [[col, "Object", PDFNet.ColorPt, "ColorPt"], [compnum, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setBorderColor", {
                    widget: this.id,
                    col: col.id,
                    compnum: compnum,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getBorderColorCompNum = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getBorderColorCompNum", { widget: this.id },
                    this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getBackgroundColorCompNum = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getBackgroundColorCompNum", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getBackgroundColor = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getBackgroundColor", { widget: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.WidgetAnnot.prototype.setBackgroundColor = function(col,
                compnum) {
                checkArguments(arguments.length, 2, "setBackgroundColor", "(PDFNet.ColorPt, number)", [[col, "Object", PDFNet.ColorPt, "ColorPt"], [compnum, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setBackgroundColor", {
                    widget: this.id,
                    col: col.id,
                    compnum: compnum,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getStaticCaptionText = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getStaticCaptionText", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setStaticCaptionText =
                function(contents) {
                    checkArguments(arguments.length, 1, "setStaticCaptionText", "(string)", [[contents, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setStaticCaptionText", {
                        widget: this.id,
                        contents: contents,
                    }, this.userPriority);
                };
            PDFNet.WidgetAnnot.prototype.getRolloverCaptionText = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getRolloverCaptionText", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setRolloverCaptionText = function(contents) {
                checkArguments(arguments.length,
                    1, "setRolloverCaptionText", "(string)", [[contents, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setRolloverCaptionText", {
                    widget: this.id,
                    contents: contents,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getMouseDownCaptionText = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getMouseDownCaptionText", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setMouseDownCaptionText = function(contents) {
                checkArguments(arguments.length, 1, "setMouseDownCaptionText",
                    "(string)", [[contents, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setMouseDownCaptionText", {
                    widget: this.id,
                    contents: contents,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getStaticIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getStaticIcon", { widget: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.WidgetAnnot.prototype.setStaticIcon = function(icon) {
                checkArguments(arguments.length, 1, "setStaticIcon",
                    "(PDFNet.Obj)", [[icon, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setStaticIcon", {
                    widget: this.id,
                    icon: icon.id,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getRolloverIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getRolloverIcon", { widget: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.WidgetAnnot.prototype.setRolloverIcon = function(icon) {
                checkArguments(arguments.length, 1, "setRolloverIcon",
                    "(PDFNet.Obj)", [[icon, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setRolloverIcon", {
                    widget: this.id,
                    icon: icon.id,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getMouseDownIcon = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getMouseDownIcon", { widget: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.WidgetAnnot.prototype.setMouseDownIcon = function(icon) {
                checkArguments(arguments.length, 1, "setMouseDownIcon",
                    "(PDFNet.Obj)", [[icon, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setMouseDownIcon", {
                    widget: this.id,
                    icon: icon.id,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getScaleType = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getScaleType", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setScaleType = function(st) {
                checkArguments(arguments.length, 1, "setScaleType", "(number)", [[st, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setScaleType",
                    { widget: this.id, st: st }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getIconCaptionRelation = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getIconCaptionRelation", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setIconCaptionRelation = function(icr) {
                checkArguments(arguments.length, 1, "setIconCaptionRelation", "(number)", [[icr, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setIconCaptionRelation", {
                    widget: this.id,
                    icr: icr,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getScaleCondition = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getScaleCondition", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setScaleCondition = function(sd) {
                checkArguments(arguments.length, 1, "setScaleCondition", "(number)", [[sd, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setScaleCondition", {
                    widget: this.id,
                    sd: sd,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getFitFull = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getFitFull",
                    { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setFitFull = function(ff) {
                checkArguments(arguments.length, 1, "setFitFull", "(boolean)", [[ff, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setFitFull", {
                    widget: this.id,
                    ff: ff,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getHIconLeftOver = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getHIconLeftOver", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setHIconLeftOver = function(hl) {
                checkArguments(arguments.length,
                    1, "setHIconLeftOver", "(number)", [[hl, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setHIconLeftOver", {
                    widget: this.id,
                    hl: hl,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getVIconLeftOver = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getVIconLeftOver", { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setVIconLeftOver = function(vl) {
                checkArguments(arguments.length, 1, "setVIconLeftOver", "(number)", [[vl, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setVIconLeftOver",
                    { widget: this.id, vl: vl }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setFontSize = function(font_size) {
                checkArguments(arguments.length, 1, "setFontSize", "(number)", [[font_size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setFontSize", {
                    widget: this.id,
                    font_size: font_size,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setTextColor = function(col, col_comp) {
                checkArguments(arguments.length, 2, "setTextColor", "(PDFNet.ColorPt, number)", [[col, "Object", PDFNet.ColorPt, "ColorPt"], [col_comp,
                    "number"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setTextColor", {
                    widget: this.id,
                    col: col.id,
                    col_comp: col_comp,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.setFont = function(font) {
                checkArguments(arguments.length, 1, "setFont", "(PDFNet.Font)", [[font, "Object", PDFNet.Font, "Font"]]);
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.setFont", {
                    widget: this.id,
                    font: font.id,
                }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getFontSize = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getFontSize",
                    { widget: this.id }, this.userPriority);
            };
            PDFNet.WidgetAnnot.prototype.getTextColor = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getTextColor", { widget: this.id }, this.userPriority).then(function(id) {
                    id.col = createDestroyableObj(PDFNet.ColorPt, id.col);
                    return id;
                });
            };
            PDFNet.WidgetAnnot.prototype.getFont = function() {
                return PDFNet.messageHandler.sendWithPromise("WidgetAnnot.getFont", { widget: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Font, id);
                });
            };
            PDFNet.SignatureWidget.create =
                function(doc, pos, field_name) {
                    "undefined" === typeof field_name && (field_name = "");
                    checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, PDFNet.Rect, string)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field_name, "string"]]);
                    checkParamsYieldFunction("create", [[pos, 1]]);
                    return PDFNet.messageHandler.sendWithPromise("signatureWidgetCreate", {
                        doc: doc.id,
                        pos: pos,
                        field_name: field_name,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.SignatureWidget, id);
                    });
                };
            PDFNet.SignatureWidget.createWithField =
                function(doc, pos, field) {
                    checkArguments(arguments.length, 3, "createWithField", "(PDFNet.PDFDoc, PDFNet.Rect, PDFNet.Field)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field, "Structure", PDFNet.Field, "Field"]]);
                    checkParamsYieldFunction("createWithField", [[pos, 1], [field, 2]]);
                    return PDFNet.messageHandler.sendWithPromise("signatureWidgetCreateWithField", {
                        doc: doc.id,
                        pos: pos,
                        field: field,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.SignatureWidget, id);
                    });
                };
            PDFNet.SignatureWidget.createWithDigitalSignatureField =
                function(doc, pos, field) {
                    checkArguments(arguments.length, 3, "createWithDigitalSignatureField", "(PDFNet.PDFDoc, PDFNet.Rect, PDFNet.DigitalSignatureField)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field, "Structure", PDFNet.DigitalSignatureField, "DigitalSignatureField"]]);
                    checkParamsYieldFunction("createWithDigitalSignatureField", [[pos, 1], [field, 2]]);
                    return PDFNet.messageHandler.sendWithPromise("signatureWidgetCreateWithDigitalSignatureField", {
                        doc: doc.id,
                        pos: pos,
                        field: field,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.SignatureWidget,
                            id);
                    });
                };
            PDFNet.SignatureWidget.createFromObj = function(obj) {
                "undefined" === typeof obj && (obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("signatureWidgetCreateFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SignatureWidget, id);
                });
            };
            PDFNet.SignatureWidget.createFromAnnot = function(annot) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)",
                    [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("signatureWidgetCreateFromAnnot", { annot: annot.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SignatureWidget, id);
                });
            };
            PDFNet.SignatureWidget.prototype.createSignatureAppearance = function(img) {
                checkArguments(arguments.length, 1, "createSignatureAppearance", "(PDFNet.Image)", [[img, "Object", PDFNet.Image, "Image"]]);
                return PDFNet.messageHandler.sendWithPromise("SignatureWidget.createSignatureAppearance",
                    { self: this.id, img: img.id }, this.userPriority);
            };
            PDFNet.SignatureWidget.prototype.getDigitalSignatureField = function() {
                return PDFNet.messageHandler.sendWithPromise("SignatureWidget.getDigitalSignatureField", { self: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.DigitalSignatureField(id);
                });
            };
            PDFNet.ComboBoxWidget.create = function(doc, pos, field_name) {
                "undefined" === typeof field_name && (field_name = "");
                checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, PDFNet.Rect, string)", [[doc, "PDFDoc"],
                    [pos, "Structure", PDFNet.Rect, "Rect"], [field_name, "string"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("comboBoxWidgetCreate", {
                    doc: doc.id,
                    pos: pos,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ComboBoxWidget, id);
                });
            };
            PDFNet.ComboBoxWidget.createWithField = function(doc, pos, field) {
                checkArguments(arguments.length, 3, "createWithField", "(PDFNet.PDFDoc, PDFNet.Rect, PDFNet.Field)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect,
                    "Rect"], [field, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("createWithField", [[pos, 1], [field, 2]]);
                return PDFNet.messageHandler.sendWithPromise("comboBoxWidgetCreateWithField", {
                    doc: doc.id,
                    pos: pos,
                    field: field,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ComboBoxWidget, id);
                });
            };
            PDFNet.ComboBoxWidget.createFromObj = function(obj) {
                "undefined" === typeof obj && (obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj,
                    "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("comboBoxWidgetCreateFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ComboBoxWidget, id);
                });
            };
            PDFNet.ComboBoxWidget.createFromAnnot = function(annot) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("comboBoxWidgetCreateFromAnnot", { annot: annot.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ComboBoxWidget,
                        id);
                });
            };
            PDFNet.ComboBoxWidget.prototype.addOption = function(value) {
                checkArguments(arguments.length, 1, "addOption", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ComboBoxWidget.addOption", {
                    combobox: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.ComboBoxWidget.prototype.addOptions = function(option_list) {
                checkArguments(arguments.length, 1, "addOptions", "(Array<string>)", [[option_list, "Array"]]);
                return PDFNet.messageHandler.sendWithPromise("ComboBoxWidget.addOptions", {
                    combobox: this.id,
                    option_list: option_list,
                }, this.userPriority);
            };
            PDFNet.ComboBoxWidget.prototype.setSelectedOption = function(value) {
                checkArguments(arguments.length, 1, "setSelectedOption", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ComboBoxWidget.setSelectedOption", {
                    combobox: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.ComboBoxWidget.prototype.getSelectedOption = function() {
                return PDFNet.messageHandler.sendWithPromise("ComboBoxWidget.getSelectedOption", { combobox: this.id }, this.userPriority);
            };
            PDFNet.ComboBoxWidget.prototype.replaceOptions = function(option_list) {
                checkArguments(arguments.length, 1, "replaceOptions", "(Array<string>)", [[option_list, "Array"]]);
                return PDFNet.messageHandler.sendWithPromise("ComboBoxWidget.replaceOptions", {
                    combobox: this.id,
                    option_list: option_list,
                }, this.userPriority);
            };
            PDFNet.ComboBoxWidget.prototype.removeOption = function(value) {
                checkArguments(arguments.length, 1, "removeOption", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ComboBoxWidget.removeOption",
                    { combobox: this.id, value: value }, this.userPriority);
            };
            PDFNet.ListBoxWidget.create = function(doc, pos, field_name) {
                "undefined" === typeof field_name && (field_name = "");
                checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, PDFNet.Rect, string)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field_name, "string"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("listBoxWidgetCreate", {
                    doc: doc.id,
                    pos: pos,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ListBoxWidget,
                        id);
                });
            };
            PDFNet.ListBoxWidget.createWithField = function(doc, pos, field) {
                checkArguments(arguments.length, 3, "createWithField", "(PDFNet.PDFDoc, PDFNet.Rect, PDFNet.Field)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("createWithField", [[pos, 1], [field, 2]]);
                return PDFNet.messageHandler.sendWithPromise("listBoxWidgetCreateWithField", {
                    doc: doc.id,
                    pos: pos,
                    field: field,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ListBoxWidget,
                        id);
                });
            };
            PDFNet.ListBoxWidget.createFromObj = function(obj) {
                "undefined" === typeof obj && (obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("listBoxWidgetCreateFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ListBoxWidget, id);
                });
            };
            PDFNet.ListBoxWidget.createFromAnnot = function(annot) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)",
                    [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("listBoxWidgetCreateFromAnnot", { annot: annot.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ListBoxWidget, id);
                });
            };
            PDFNet.ListBoxWidget.prototype.addOption = function(value) {
                checkArguments(arguments.length, 1, "addOption", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ListBoxWidget.addOption", {
                    listbox: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.ListBoxWidget.prototype.addOptions =
                function(option_list) {
                    checkArguments(arguments.length, 1, "addOptions", "(Array<string>)", [[option_list, "Array"]]);
                    return PDFNet.messageHandler.sendWithPromise("ListBoxWidget.addOptions", {
                        listbox: this.id,
                        option_list: option_list,
                    }, this.userPriority);
                };
            PDFNet.ListBoxWidget.prototype.setSelectedOptions = function(option_list) {
                checkArguments(arguments.length, 1, "setSelectedOptions", "(Array<string>)", [[option_list, "Array"]]);
                return PDFNet.messageHandler.sendWithPromise("ListBoxWidget.setSelectedOptions", {
                    listbox: this.id,
                    option_list: option_list,
                }, this.userPriority);
            };
            PDFNet.ListBoxWidget.prototype.replaceOptions = function(option_list) {
                checkArguments(arguments.length, 1, "replaceOptions", "(Array<string>)", [[option_list, "Array"]]);
                return PDFNet.messageHandler.sendWithPromise("ListBoxWidget.replaceOptions", {
                    listbox: this.id,
                    option_list: option_list,
                }, this.userPriority);
            };
            PDFNet.ListBoxWidget.prototype.removeOption = function(value) {
                checkArguments(arguments.length, 1, "removeOption", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ListBoxWidget.removeOption",
                    { listbox: this.id, value: value }, this.userPriority);
            };
            PDFNet.TextWidget.create = function(doc, pos, field_name) {
                "undefined" === typeof field_name && (field_name = "");
                checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, PDFNet.Rect, string)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field_name, "string"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("textWidgetCreate", {
                    doc: doc.id,
                    pos: pos,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextWidget,
                        id);
                });
            };
            PDFNet.TextWidget.createWithField = function(doc, pos, field) {
                checkArguments(arguments.length, 3, "createWithField", "(PDFNet.PDFDoc, PDFNet.Rect, PDFNet.Field)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("createWithField", [[pos, 1], [field, 2]]);
                return PDFNet.messageHandler.sendWithPromise("textWidgetCreateWithField", {
                    doc: doc.id,
                    pos: pos,
                    field: field,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextWidget,
                        id);
                });
            };
            PDFNet.TextWidget.createFromObj = function(obj) {
                "undefined" === typeof obj && (obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("textWidgetCreateFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextWidget, id);
                });
            };
            PDFNet.TextWidget.createFromAnnot = function(annot) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[annot,
                    "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("textWidgetCreateFromAnnot", { annot: annot.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.TextWidget, id);
                });
            };
            PDFNet.TextWidget.prototype.setText = function(text) {
                checkArguments(arguments.length, 1, "setText", "(string)", [[text, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("TextWidget.setText", {
                    widget: this.id,
                    text: text,
                }, this.userPriority);
            };
            PDFNet.TextWidget.prototype.getText = function() {
                return PDFNet.messageHandler.sendWithPromise("TextWidget.getText",
                    { widget: this.id }, this.userPriority);
            };
            PDFNet.CheckBoxWidget.create = function(doc, pos, field_name) {
                "undefined" === typeof field_name && (field_name = "");
                checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, PDFNet.Rect, string)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field_name, "string"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("checkBoxWidgetCreate", {
                    doc: doc.id,
                    pos: pos,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CheckBoxWidget,
                        id);
                });
            };
            PDFNet.CheckBoxWidget.createWithField = function(doc, pos, field) {
                checkArguments(arguments.length, 3, "createWithField", "(PDFNet.PDFDoc, PDFNet.Rect, PDFNet.Field)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("createWithField", [[pos, 1], [field, 2]]);
                return PDFNet.messageHandler.sendWithPromise("checkBoxWidgetCreateWithField", {
                    doc: doc.id,
                    pos: pos,
                    field: field,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CheckBoxWidget,
                        id);
                });
            };
            PDFNet.CheckBoxWidget.createFromObj = function(obj) {
                "undefined" === typeof obj && (obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("checkBoxWidgetCreateFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CheckBoxWidget, id);
                });
            };
            PDFNet.CheckBoxWidget.createFromAnnot = function(annot) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)",
                    [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("checkBoxWidgetCreateFromAnnot", { annot: annot.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.CheckBoxWidget, id);
                });
            };
            PDFNet.CheckBoxWidget.prototype.isChecked = function() {
                return PDFNet.messageHandler.sendWithPromise("CheckBoxWidget.isChecked", { button: this.id }, this.userPriority);
            };
            PDFNet.CheckBoxWidget.prototype.setChecked = function(checked) {
                checkArguments(arguments.length, 1, "setChecked", "(boolean)",
                    [[checked, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("CheckBoxWidget.setChecked", {
                    button: this.id,
                    checked: checked,
                }, this.userPriority);
            };
            PDFNet.RadioButtonWidget.createFromObj = function(obj) {
                "undefined" === typeof obj && (obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("radioButtonWidgetCreateFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RadioButtonWidget,
                        id);
                });
            };
            PDFNet.RadioButtonWidget.createFromAnnot = function(annot) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("radioButtonWidgetCreateFromAnnot", { annot: annot.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RadioButtonWidget, id);
                });
            };
            PDFNet.RadioButtonWidget.prototype.isEnabled = function() {
                return PDFNet.messageHandler.sendWithPromise("RadioButtonWidget.isEnabled", { button: this.id },
                    this.userPriority);
            };
            PDFNet.RadioButtonWidget.prototype.enableButton = function() {
                return PDFNet.messageHandler.sendWithPromise("RadioButtonWidget.enableButton", { button: this.id }, this.userPriority);
            };
            PDFNet.RadioButtonWidget.prototype.getGroup = function() {
                return PDFNet.messageHandler.sendWithPromise("RadioButtonWidget.getGroup", { button: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.RadioButtonGroup, id);
                });
            };
            PDFNet.PushButtonWidget.create = function(doc, pos, field_name) {
                "undefined" ===
                typeof field_name && (field_name = "");
                checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, PDFNet.Rect, string)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field_name, "string"]]);
                checkParamsYieldFunction("create", [[pos, 1]]);
                return PDFNet.messageHandler.sendWithPromise("pushButtonWidgetCreate", {
                    doc: doc.id,
                    pos: pos,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PushButtonWidget, id);
                });
            };
            PDFNet.PushButtonWidget.createWithField = function(doc, pos, field) {
                checkArguments(arguments.length,
                    3, "createWithField", "(PDFNet.PDFDoc, PDFNet.Rect, PDFNet.Field)", [[doc, "PDFDoc"], [pos, "Structure", PDFNet.Rect, "Rect"], [field, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("createWithField", [[pos, 1], [field, 2]]);
                return PDFNet.messageHandler.sendWithPromise("pushButtonWidgetCreateWithField", {
                    doc: doc.id,
                    pos: pos,
                    field: field,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PushButtonWidget, id);
                });
            };
            PDFNet.PushButtonWidget.createFromObj = function(obj) {
                "undefined" === typeof obj &&
                (obj = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("pushButtonWidgetCreateFromObj", { obj: obj.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PushButtonWidget, id);
                });
            };
            PDFNet.PushButtonWidget.createFromAnnot = function(annot) {
                checkArguments(arguments.length, 1, "createFromAnnot", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("pushButtonWidgetCreateFromAnnot",
                    { annot: annot.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PushButtonWidget, id);
                });
            };
            PDFNet.Bookmark.create = function(in_doc, in_title) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.PDFDoc, string)", [[in_doc, "PDFDoc"], [in_title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("bookmarkCreate", {
                    in_doc: in_doc.id,
                    in_title: in_title,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.createFromObj = function(in_bookmark_dict) {
                checkArguments(arguments.length,
                    1, "createFromObj", "(PDFNet.Obj)", [[in_bookmark_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("bookmarkCreateFromObj", { in_bookmark_dict: in_bookmark_dict.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.copy", { in_bookmark: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.compare =
                function(in_bookmark) {
                    checkArguments(arguments.length, 1, "compare", "(PDFNet.Bookmark)", [[in_bookmark, "Object", PDFNet.Bookmark, "Bookmark"]]);
                    return PDFNet.messageHandler.sendWithPromise("Bookmark.compare", {
                        bm: this.id,
                        in_bookmark: in_bookmark.id,
                    }, this.userPriority);
                };
            PDFNet.Bookmark.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.isValid", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.hasChildren = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.hasChildren",
                    { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getNext = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getNext", { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.getPrev = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getPrev", { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.getFirstChild = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getFirstChild",
                    { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.getLastChild = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getLastChild", { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.getParent = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getParent", { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark,
                        id);
                });
            };
            PDFNet.Bookmark.prototype.find = function(in_title) {
                checkArguments(arguments.length, 1, "find", "(string)", [[in_title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.find", {
                    bm: this.id,
                    in_title: in_title,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.addNewChild = function(in_title) {
                checkArguments(arguments.length, 1, "addNewChild", "(string)", [[in_title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.addNewChild",
                    { bm: this.id, in_title: in_title }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.addChild = function(in_bookmark) {
                checkArguments(arguments.length, 1, "addChild", "(PDFNet.Bookmark)", [[in_bookmark, "Object", PDFNet.Bookmark, "Bookmark"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.addChild", {
                    bm: this.id,
                    in_bookmark: in_bookmark.id,
                }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.addNewNext = function(in_title) {
                checkArguments(arguments.length,
                    1, "addNewNext", "(string)", [[in_title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.addNewNext", {
                    bm: this.id,
                    in_title: in_title,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.addNext = function(in_bookmark) {
                checkArguments(arguments.length, 1, "addNext", "(PDFNet.Bookmark)", [[in_bookmark, "Object", PDFNet.Bookmark, "Bookmark"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.addNext", {
                        bm: this.id,
                        in_bookmark: in_bookmark.id,
                    },
                    this.userPriority);
            };
            PDFNet.Bookmark.prototype.addNewPrev = function(in_title) {
                checkArguments(arguments.length, 1, "addNewPrev", "(string)", [[in_title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.addNewPrev", {
                    bm: this.id,
                    in_title: in_title,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.Bookmark.prototype.addPrev = function(in_bookmark) {
                checkArguments(arguments.length, 1, "addPrev", "(PDFNet.Bookmark)", [[in_bookmark, "Object", PDFNet.Bookmark, "Bookmark"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.addPrev", {
                    bm: this.id,
                    in_bookmark: in_bookmark.id,
                }, this.userPriority);
            };
            PDFNet.Bookmark.prototype["delete"] = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.delete", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.unlink = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.unlink", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getIndent = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getIndent",
                    { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.isOpen = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.isOpen", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.setOpen = function(in_open) {
                checkArguments(arguments.length, 1, "setOpen", "(boolean)", [[in_open, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.setOpen", {
                    bm: this.id,
                    in_open: in_open,
                }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getOpenCount = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getOpenCount",
                    { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getTitle = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getTitle", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getTitleObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getTitleObj", { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Bookmark.prototype.setTitle = function(title) {
                checkArguments(arguments.length, 1, "setTitle", "(string)", [[title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.setTitle", {
                    bm: this.id,
                    title: title,
                }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getAction = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getAction", { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.Bookmark.prototype.setAction = function(in_action) {
                checkArguments(arguments.length, 1, "setAction", "(PDFNet.Action)", [[in_action, "Object", PDFNet.Action, "Action"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.setAction",
                    { bm: this.id, in_action: in_action.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.removeAction = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.removeAction", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getFlags = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getFlags", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.setFlags = function(in_flags) {
                checkArguments(arguments.length, 1, "setFlags", "(number)", [[in_flags, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.setFlags",
                    { bm: this.id, in_flags: in_flags }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getColor = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getColor", { bm: this.id }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.setColor = function(in_r, in_g, in_b) {
                "undefined" === typeof in_r && (in_r = 0);
                "undefined" === typeof in_g && (in_g = 0);
                "undefined" === typeof in_b && (in_b = 0);
                checkArguments(arguments.length, 0, "setColor", "(number, number, number)", [[in_r, "number"], [in_g, "number"], [in_b, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Bookmark.setColor",
                    { bm: this.id, in_r: in_r, in_g: in_g, in_b: in_b }, this.userPriority);
            };
            PDFNet.Bookmark.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Bookmark.getSDFObj", { bm: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ColorPt.init = function(x, y, z, w) {
                "undefined" === typeof x && (x = 0);
                "undefined" === typeof y && (y = 0);
                "undefined" === typeof z && (z = 0);
                "undefined" === typeof w && (w = 0);
                checkArguments(arguments.length, 0, "init", "(number, number, number, number)",
                    [[x, "number"], [y, "number"], [z, "number"], [w, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("colorPtInit", {
                    x: x,
                    y: y,
                    z: z,
                    w: w,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.ColorPt.prototype.compare = function(right) {
                checkArguments(arguments.length, 1, "compare", "(PDFNet.ColorPt)", [[right, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("ColorPt.compare", {
                    left: this.id,
                    right: right.id,
                }, this.userPriority);
            };
            PDFNet.ColorPt.prototype.set =
                function(x, y, z, w) {
                    "undefined" === typeof x && (x = 0);
                    "undefined" === typeof y && (y = 0);
                    "undefined" === typeof z && (z = 0);
                    "undefined" === typeof w && (w = 0);
                    checkArguments(arguments.length, 0, "set", "(number, number, number, number)", [[x, "number"], [y, "number"], [z, "number"], [w, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("ColorPt.set", {
                        cp: this.id,
                        x: x,
                        y: y,
                        z: z,
                        w: w,
                    }, this.userPriority);
                };
            PDFNet.ColorPt.prototype.setByIndex = function(colorant_index, colorant_value) {
                checkArguments(arguments.length, 2, "setByIndex", "(number, number)",
                    [[colorant_index, "number"], [colorant_value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ColorPt.setByIndex", {
                    cp: this.id,
                    colorant_index: colorant_index,
                    colorant_value: colorant_value,
                }, this.userPriority);
            };
            PDFNet.ColorPt.prototype.get = function(colorant_index) {
                checkArguments(arguments.length, 1, "get", "(number)", [[colorant_index, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ColorPt.get", {
                    cp: this.id,
                    colorant_index: colorant_index,
                }, this.userPriority);
            };
            PDFNet.ColorPt.prototype.setColorantNum =
                function(num) {
                    checkArguments(arguments.length, 1, "setColorantNum", "(number)", [[num, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("ColorPt.setColorantNum", {
                        cp: this.id,
                        num: num,
                    }, this.userPriority);
                };
            PDFNet.ColorSpace.createDeviceGray = function() {
                return PDFNet.messageHandler.sendWithPromise("colorSpaceCreateDeviceGray", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.ColorSpace.createDeviceRGB = function() {
                return PDFNet.messageHandler.sendWithPromise("colorSpaceCreateDeviceRGB",
                    {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.ColorSpace.createDeviceCMYK = function() {
                return PDFNet.messageHandler.sendWithPromise("colorSpaceCreateDeviceCMYK", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.ColorSpace.createPattern = function() {
                return PDFNet.messageHandler.sendWithPromise("colorSpaceCreatePattern", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace,
                        id);
                });
            };
            PDFNet.ColorSpace.create = function(color_space) {
                "undefined" === typeof color_space && (color_space = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[color_space, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("colorSpaceCreate", { color_space: color_space.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.ColorSpace.createICCFromFilter = function(doc, filter) {
                checkArguments(arguments.length, 2, "createICCFromFilter",
                    "(PDFNet.SDFDoc, PDFNet.Filter)", [[doc, "SDFDoc"], [filter, "Object", PDFNet.Filter, "Filter"]]);
                0 != filter.id && avoidCleanup(filter.id);
                return PDFNet.messageHandler.sendWithPromise("colorSpaceCreateICCFromFilter", {
                    doc: doc.id,
                    no_own_filter: filter.id,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.ColorSpace.createICCFromBuffer = function(doc, buf) {
                checkArguments(arguments.length, 2, "createICCFromBuffer", "(PDFNet.SDFDoc, ArrayBuffer|TypedArray)", [[doc, "SDFDoc"],
                    [buf, "ArrayBuffer"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("colorSpaceCreateICCFromBuffer", {
                    doc: doc.id,
                    buf: bufArrayBuffer,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.ColorSpace.getComponentNumFromObj = function(cs_type, cs_obj) {
                checkArguments(arguments.length, 2, "getComponentNumFromObj", "(number, PDFNet.Obj)", [[cs_type, "number"], [cs_obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("colorSpaceGetComponentNumFromObj",
                    { cs_type: cs_type, cs_obj: cs_obj.id }, this.userPriority);
            };
            PDFNet.ColorSpace.getTypeFromObj = function(cs_obj) {
                checkArguments(arguments.length, 1, "getTypeFromObj", "(PDFNet.Obj)", [[cs_obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("colorSpaceGetTypeFromObj", { cs_obj: cs_obj.id }, this.userPriority);
            };
            PDFNet.ColorSpace.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getType", { cs: this.id }, this.userPriority);
            };
            PDFNet.ColorSpace.prototype.getSDFObj =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("ColorSpace.getSDFObj", { cs: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.ColorSpace.prototype.getComponentNum = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getComponentNum", { cs: this.id }, this.userPriority);
            };
            PDFNet.ColorSpace.prototype.initColor = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.initColor", { cs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt,
                        id);
                });
            };
            PDFNet.ColorSpace.prototype.initComponentRanges = function(num_comps) {
                checkArguments(arguments.length, 1, "initComponentRanges", "(number)", [[num_comps, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.initComponentRanges", {
                    cs: this.id,
                    num_comps: num_comps,
                }, this.userPriority);
            };
            PDFNet.ColorSpace.prototype.convert2Gray = function(in_color) {
                checkArguments(arguments.length, 1, "convert2Gray", "(PDFNet.ColorPt)", [[in_color, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.convert2Gray",
                    { cs: this.id, in_color: in_color.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.ColorSpace.prototype.convert2RGB = function(in_color) {
                checkArguments(arguments.length, 1, "convert2RGB", "(PDFNet.ColorPt)", [[in_color, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.convert2RGB", {
                    cs: this.id,
                    in_color: in_color.id,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.ColorSpace.prototype.convert2CMYK =
                function(in_color) {
                    checkArguments(arguments.length, 1, "convert2CMYK", "(PDFNet.ColorPt)", [[in_color, "Object", PDFNet.ColorPt, "ColorPt"]]);
                    return PDFNet.messageHandler.sendWithPromise("ColorSpace.convert2CMYK", {
                        cs: this.id,
                        in_color: in_color.id,
                    }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.ColorPt, id);
                    });
                };
            PDFNet.ColorSpace.prototype.getAlternateColorSpace = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getAlternateColorSpace", { cs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace,
                        id);
                });
            };
            PDFNet.ColorSpace.prototype.getBaseColorSpace = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getBaseColorSpace", { cs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.ColorSpace.prototype.getHighVal = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getHighVal", { cs: this.id }, this.userPriority);
            };
            PDFNet.ColorSpace.prototype.getLookupTable = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getLookupTable",
                    { cs: this.id }, this.userPriority);
            };
            PDFNet.ColorSpace.prototype.getBaseColor = function(color_idx) {
                checkArguments(arguments.length, 1, "getBaseColor", "(number)", [[color_idx, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getBaseColor", {
                    cs: this.id,
                    color_idx: color_idx,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.ColorSpace.prototype.getTintFunction = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.getTintFunction", { cs: this.id },
                    this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Function, id);
                });
            };
            PDFNet.ColorSpace.prototype.isAll = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.isAll", { cs: this.id }, this.userPriority);
            };
            PDFNet.ColorSpace.prototype.isNone = function() {
                return PDFNet.messageHandler.sendWithPromise("ColorSpace.isNone", { cs: this.id }, this.userPriority);
            };
            PDFNet.ContentReplacer.create = function() {
                return PDFNet.messageHandler.sendWithPromise("contentReplacerCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ContentReplacer,
                        id);
                });
            };
            PDFNet.ContentReplacer.prototype.addImage = function(target_region, replacement_image) {
                checkArguments(arguments.length, 2, "addImage", "(PDFNet.Rect, PDFNet.Obj)", [[target_region, "Structure", PDFNet.Rect, "Rect"], [replacement_image, "Object", PDFNet.Obj, "Obj"]]);
                checkParamsYieldFunction("addImage", [[target_region, 0]]);
                return PDFNet.messageHandler.sendWithPromise("ContentReplacer.addImage", {
                    cr: this.id,
                    target_region: target_region,
                    replacement_image: replacement_image.id,
                }, this.userPriority);
            };
            PDFNet.ContentReplacer.prototype.addText =
                function(target_region, replacement_text) {
                    checkArguments(arguments.length, 2, "addText", "(PDFNet.Rect, string)", [[target_region, "Structure", PDFNet.Rect, "Rect"], [replacement_text, "string"]]);
                    checkParamsYieldFunction("addText", [[target_region, 0]]);
                    return PDFNet.messageHandler.sendWithPromise("ContentReplacer.addText", {
                        cr: this.id,
                        target_region: target_region,
                        replacement_text: replacement_text,
                    }, this.userPriority);
                };
            PDFNet.ContentReplacer.prototype.addString = function(template_text, replacement_text) {
                checkArguments(arguments.length,
                    2, "addString", "(string, string)", [[template_text, "string"], [replacement_text, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ContentReplacer.addString", {
                    cr: this.id,
                    template_text: template_text,
                    replacement_text: replacement_text,
                }, this.userPriority);
            };
            PDFNet.ContentReplacer.prototype.setMatchStrings = function(start_str, end_str) {
                checkArguments(arguments.length, 2, "setMatchStrings", "(string, string)", [[start_str, "string"], [end_str, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ContentReplacer.setMatchStrings",
                    { cr: this.id, start_str: start_str, end_str: end_str }, this.userPriority);
            };
            PDFNet.ContentReplacer.prototype.process = function(page) {
                checkArguments(arguments.length, 1, "process", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("ContentReplacer.process", {
                    cr: this.id,
                    page: page.id,
                }, this.userPriority);
            };
            PDFNet.DocumentConversion.prototype.getDoc = function() {
                return PDFNet.messageHandler.sendWithPromise("DocumentConversion.getDoc", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PDFDoc,
                        id);
                });
            };
            PDFNet.DocumentConversion.prototype.isCancelled = function() {
                return PDFNet.messageHandler.sendWithPromise("DocumentConversion.isCancelled", { self: this.id }, this.userPriority);
            };
            PDFNet.DocumentConversion.prototype.getNumConvertedPages = function() {
                return PDFNet.messageHandler.sendWithPromise("DocumentConversion.getNumConvertedPages", { self: this.id }, this.userPriority);
            };
            PDFNet.Convert.fromXpsMem = function(in_pdfdoc, buf) {
                checkArguments(arguments.length, 2, "fromXpsMem", "(PDFNet.PDFDoc, ArrayBuffer|TypedArray)",
                    [[in_pdfdoc, "PDFDoc"], [buf, "ArrayBuffer"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("convertFromXpsMem", {
                    in_pdfdoc: in_pdfdoc.id,
                    buf: bufArrayBuffer,
                }, this.userPriority);
            };
            PDFNet.ConversionMonitor.prototype.next = function() {
                return PDFNet.messageHandler.sendWithPromise("ConversionMonitor.next", { conversionMonitor: this.id }, this.userPriority);
            };
            PDFNet.ConversionMonitor.prototype.ready = function() {
                return PDFNet.messageHandler.sendWithPromise("ConversionMonitor.ready",
                    { conversionMonitor: this.id }, this.userPriority);
            };
            PDFNet.ConversionMonitor.prototype.progress = function() {
                return PDFNet.messageHandler.sendWithPromise("ConversionMonitor.progress", { conversionMonitor: this.id }, this.userPriority);
            };
            PDFNet.ConversionMonitor.prototype.filter = function() {
                return PDFNet.messageHandler.sendWithPromise("ConversionMonitor.filter", { conversionMonitor: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Convert.streamingPdfConversionWithPath =
                function(in_filename, options$jscomp$0) {
                    "undefined" === typeof options$jscomp$0 && (options$jscomp$0 = new PDFNet.Obj("0"));
                    checkArguments(arguments.length, 1, "streamingPdfConversionWithPath", "(string, PDFNet.Obj)", [[in_filename, "string"], [options$jscomp$0, "OptionObject", PDFNet.Obj, "Obj", "PDFNet.Convert.ConversionOptions"]]);
                    if ("PDFNet.Convert.ConversionOptions" === options$jscomp$0.name) {
                        var optsCopy = options$jscomp$0;
                        options$jscomp$0 = PDFNet.ObjSet.create().then(function(set) {
                            return set.createFromJson(JSON.stringify(optsCopy));
                        });
                    } else {
                        options$jscomp$0 =
                            Promise.resolve(options$jscomp$0);
                    }
                    return options$jscomp$0.then(function(options) {
                        return PDFNet.messageHandler.sendWithPromise("convertStreamingPdfConversionWithPath", {
                            in_filename: in_filename,
                            options: options.id,
                        }, this.userPriority).then(function(id) {
                            return createPDFNetObj(PDFNet.DocumentConversion, id);
                        });
                    });
                };
            PDFNet.Convert.streamingPdfConversionWithPdfAndPath = function(in_pdfdoc, in_filename, options$jscomp$0) {
                "undefined" === typeof options$jscomp$0 && (options$jscomp$0 = new PDFNet.Obj("0"));
                checkArguments(arguments.length,
                    2, "streamingPdfConversionWithPdfAndPath", "(PDFNet.PDFDoc, string, PDFNet.Obj)", [[in_pdfdoc, "PDFDoc"], [in_filename, "string"], [options$jscomp$0, "OptionObject", PDFNet.Obj, "Obj", "PDFNet.Convert.ConversionOptions"]]);
                if ("PDFNet.Convert.ConversionOptions" === options$jscomp$0.name) {
                    var optsCopy = options$jscomp$0;
                    options$jscomp$0 = PDFNet.ObjSet.create().then(function(set) {
                        return set.createFromJson(JSON.stringify(optsCopy));
                    });
                } else {
                    options$jscomp$0 = Promise.resolve(options$jscomp$0);
                }
                return options$jscomp$0.then(function(options) {
                    return PDFNet.messageHandler.sendWithPromise("convertStreamingPdfConversionWithPdfAndPath",
                        {
                            in_pdfdoc: in_pdfdoc.id,
                            in_filename: in_filename,
                            options: options.id,
                        }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.DocumentConversion, id);
                    });
                });
            };
            PDFNet.Convert.officeToPdfWithFilter = function(in_pdfdoc, in_stream, options$jscomp$0) {
                "undefined" === typeof options$jscomp$0 && (options$jscomp$0 = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 2, "officeToPdfWithFilter", "(PDFNet.PDFDoc, PDFNet.Filter, PDFNet.Obj)", [[in_pdfdoc, "PDFDoc"], [in_stream, "Object", PDFNet.Filter, "Filter"], [options$jscomp$0,
                    "OptionObject", PDFNet.Obj, "Obj", "PDFNet.Convert.ConversionOptions"]]);
                0 != in_stream.id && avoidCleanup(in_stream.id);
                if ("PDFNet.Convert.ConversionOptions" === options$jscomp$0.name) {
                    var optsCopy = options$jscomp$0;
                    options$jscomp$0 = PDFNet.ObjSet.create().then(function(set) {
                        return set.createFromJson(JSON.stringify(optsCopy));
                    });
                } else {
                    options$jscomp$0 = Promise.resolve(options$jscomp$0);
                }
                return options$jscomp$0.then(function(options) {
                    return PDFNet.messageHandler.sendWithPromise("convertOfficeToPdfWithFilter", {
                        in_pdfdoc: in_pdfdoc.id,
                        no_own_in_stream: in_stream.id, options: options.id,
                    }, this.userPriority);
                });
            };
            PDFNet.Convert.streamingPdfConversionWithFilter = function(in_stream, options$jscomp$0) {
                "undefined" === typeof options$jscomp$0 && (options$jscomp$0 = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 1, "streamingPdfConversionWithFilter", "(PDFNet.Filter, PDFNet.Obj)", [[in_stream, "Object", PDFNet.Filter, "Filter"], [options$jscomp$0, "OptionObject", PDFNet.Obj, "Obj", "PDFNet.Convert.ConversionOptions"]]);
                if ("PDFNet.Convert.ConversionOptions" ===
                    options$jscomp$0.name) {
                    var optsCopy = options$jscomp$0;
                    options$jscomp$0 = PDFNet.ObjSet.create().then(function(set) {
                        return set.createFromJson(JSON.stringify(optsCopy));
                    });
                } else {
                    options$jscomp$0 = Promise.resolve(options$jscomp$0);
                }
                return options$jscomp$0.then(function(options) {
                    return PDFNet.messageHandler.sendWithPromise("convertStreamingPdfConversionWithFilter", {
                        in_stream: in_stream.id,
                        options: options.id,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.DocumentConversion, id);
                    });
                });
            };
            PDFNet.Convert.streamingPdfConversionWithPdfAndFilter =
                function(in_pdfdoc, in_stream, options$jscomp$0) {
                    "undefined" === typeof options$jscomp$0 && (options$jscomp$0 = new PDFNet.Obj("0"));
                    checkArguments(arguments.length, 2, "streamingPdfConversionWithPdfAndFilter", "(PDFNet.PDFDoc, PDFNet.Filter, PDFNet.Obj)", [[in_pdfdoc, "PDFDoc"], [in_stream, "Object", PDFNet.Filter, "Filter"], [options$jscomp$0, "OptionObject", PDFNet.Obj, "Obj", "PDFNet.Convert.ConversionOptions"]]);
                    if ("PDFNet.Convert.ConversionOptions" === options$jscomp$0.name) {
                        var optsCopy = options$jscomp$0;
                        options$jscomp$0 =
                            PDFNet.ObjSet.create().then(function(set) {
                                return set.createFromJson(JSON.stringify(optsCopy));
                            });
                    } else {
                        options$jscomp$0 = Promise.resolve(options$jscomp$0);
                    }
                    return options$jscomp$0.then(function(options) {
                        return PDFNet.messageHandler.sendWithPromise("convertStreamingPdfConversionWithPdfAndFilter", {
                            in_pdfdoc: in_pdfdoc.id,
                            in_stream: in_stream.id,
                            options: options.id,
                        }, this.userPriority).then(function(id) {
                            return createPDFNetObj(PDFNet.DocumentConversion, id);
                        });
                    });
                };
            PDFNet.Convert.fromTiff = function(in_pdfdoc, in_data) {
                checkArguments(arguments.length,
                    2, "fromTiff", "(PDFNet.PDFDoc, PDFNet.Filter)", [[in_pdfdoc, "PDFDoc"], [in_data, "Object", PDFNet.Filter, "Filter"]]);
                return PDFNet.messageHandler.sendWithPromise("convertFromTiff", {
                    in_pdfdoc: in_pdfdoc.id,
                    in_data: in_data.id,
                }, this.userPriority);
            };
            PDFNet.Convert.pageToHtml = function(page) {
                checkArguments(arguments.length, 1, "pageToHtml", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("convertPageToHtml", { page: page.id }, this.userPriority);
            };
            PDFNet.Date.init = function(year,
                month, day, hour, minute, second) {
                checkArguments(arguments.length, 6, "init", "(number, number, number, number, number, number)", [[year, "number"], [month, "number"], [day, "number"], [hour, "number"], [minute, "number"], [second, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("dateInit", {
                    year: year,
                    month: month,
                    day: day,
                    hour: hour,
                    minute: minute,
                    second: second,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.Date(id);
                });
            };
            PDFNet.Date.prototype.isValid = function() {
                checkThisYieldFunction("isValid", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Date.isValid", { date: this }, this.userPriority);
            };
            PDFNet.Date.prototype.attach = function(d) {
                checkArguments(arguments.length, 1, "attach", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                checkThisYieldFunction("attach", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Date.attach";
                return PDFNet.messageHandler.sendWithPromise("Date.attach", {
                    date: this,
                    d: d.id,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Date.prototype.update =
                function(d) {
                    "undefined" === typeof d && (d = new PDFNet.Obj("__null"));
                    checkArguments(arguments.length, 0, "update", "(PDFNet.Obj)", [[d, "Object", PDFNet.Obj, "Obj"]]);
                    checkThisYieldFunction("update", this.yieldFunction);
                    var me = this;
                    this.yieldFunction = "Date.update";
                    return PDFNet.messageHandler.sendWithPromise("Date.update", {
                        date: this,
                        d: d.id,
                    }, this.userPriority).then(function(id) {
                        me.yieldFunction = void 0;
                        copyFunc(id.date, me);
                        return id.result;
                    });
                };
            PDFNet.Destination.createXYZ = function(page, left, top, zoom) {
                checkArguments(arguments.length,
                    4, "createXYZ", "(PDFNet.Page, number, number, number)", [[page, "Object", PDFNet.Page, "Page"], [left, "number"], [top, "number"], [zoom, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateXYZ", {
                    page: page.id,
                    left: left,
                    top: top,
                    zoom: zoom,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.createFit = function(page) {
                checkArguments(arguments.length, 1, "createFit", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateFit",
                    { page: page.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.createFitH = function(page, top) {
                checkArguments(arguments.length, 2, "createFitH", "(PDFNet.Page, number)", [[page, "Object", PDFNet.Page, "Page"], [top, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateFitH", {
                    page: page.id,
                    top: top,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.createFitV = function(page, left) {
                checkArguments(arguments.length,
                    2, "createFitV", "(PDFNet.Page, number)", [[page, "Object", PDFNet.Page, "Page"], [left, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateFitV", {
                    page: page.id,
                    left: left,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.createFitR = function(page, left, bottom, right, top) {
                checkArguments(arguments.length, 5, "createFitR", "(PDFNet.Page, number, number, number, number)", [[page, "Object", PDFNet.Page, "Page"], [left, "number"], [bottom, "number"],
                    [right, "number"], [top, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateFitR", {
                    page: page.id,
                    left: left,
                    bottom: bottom,
                    right: right,
                    top: top,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.createFitB = function(page) {
                checkArguments(arguments.length, 1, "createFitB", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateFitB", { page: page.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination,
                        id);
                });
            };
            PDFNet.Destination.createFitBH = function(page, top) {
                checkArguments(arguments.length, 2, "createFitBH", "(PDFNet.Page, number)", [[page, "Object", PDFNet.Page, "Page"], [top, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateFitBH", {
                    page: page.id,
                    top: top,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.createFitBV = function(page, left) {
                checkArguments(arguments.length, 2, "createFitBV", "(PDFNet.Page, number)", [[page, "Object", PDFNet.Page,
                    "Page"], [left, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreateFitBV", {
                    page: page.id,
                    left: left,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.create = function(dest) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)", [[dest, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("destinationCreate", { dest: dest.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination,
                        id);
                });
            };
            PDFNet.Destination.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("Destination.copy", { d: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Destination, id);
                });
            };
            PDFNet.Destination.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("Destination.isValid", { dest: this.id }, this.userPriority);
            };
            PDFNet.Destination.prototype.getFitType = function() {
                return PDFNet.messageHandler.sendWithPromise("Destination.getFitType", { dest: this.id }, this.userPriority);
            };
            PDFNet.Destination.prototype.getPage = function() {
                return PDFNet.messageHandler.sendWithPromise("Destination.getPage", { dest: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Page, id);
                });
            };
            PDFNet.Destination.prototype.setPage = function(page) {
                checkArguments(arguments.length, 1, "setPage", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("Destination.setPage", {
                    dest: this.id,
                    page: page.id,
                }, this.userPriority);
            };
            PDFNet.Destination.prototype.getSDFObj =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Destination.getSDFObj", { dest: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.Destination.prototype.getExplicitDestObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Destination.getExplicitDestObj", { dest: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.GState.prototype.getTransform = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getTransform",
                    { gs: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.GState.prototype.getStrokeColorSpace = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getStrokeColorSpace", { gs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.GState.prototype.getFillColorSpace = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getFillColorSpace", { gs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace,
                        id);
                });
            };
            PDFNet.GState.prototype.getStrokeColor = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getStrokeColor", { gs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.GState.prototype.getStrokePattern = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getStrokePattern", { gs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PatternColor, id);
                });
            };
            PDFNet.GState.prototype.getFillColor = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getFillColor",
                    { gs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.GState.prototype.getFillPattern = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getFillPattern", { gs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PatternColor, id);
                });
            };
            PDFNet.GState.prototype.getFlatness = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getFlatness", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getLineCap =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("GState.getLineCap", { gs: this.id }, this.userPriority);
                };
            PDFNet.GState.prototype.getLineJoin = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getLineJoin", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getLineWidth = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getLineWidth", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getMiterLimit = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getMiterLimit",
                    { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getPhase = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getPhase", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getCharSpacing = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getCharSpacing", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getWordSpacing = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getWordSpacing", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getHorizontalScale =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("GState.getHorizontalScale", { gs: this.id }, this.userPriority);
                };
            PDFNet.GState.prototype.getLeading = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getLeading", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getFont = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getFont", { gs: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Font, id);
                });
            };
            PDFNet.GState.prototype.getFontSize = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getFontSize",
                    { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getTextRenderMode = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getTextRenderMode", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getTextRise = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getTextRise", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.isTextKnockout = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.isTextKnockout", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getRenderingIntent =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("GState.getRenderingIntent", { gs: this.id }, this.userPriority);
                };
            PDFNet.GState.getRenderingIntentType = function(name) {
                checkArguments(arguments.length, 1, "getRenderingIntentType", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("gStateGetRenderingIntentType", { name: name }, this.userPriority);
            };
            PDFNet.GState.prototype.getBlendMode = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getBlendMode", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getFillOpacity = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getFillOpacity", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getStrokeOpacity = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getStrokeOpacity", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getAISFlag = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getAISFlag", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getSoftMask = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getSoftMask",
                    { gs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.GState.prototype.getSoftMaskTransform = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getSoftMaskTransform", { gs: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.GState.prototype.getStrokeOverprint = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getStrokeOverprint", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getFillOverprint =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("GState.getFillOverprint", { gs: this.id }, this.userPriority);
                };
            PDFNet.GState.prototype.getOverprintMode = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getOverprintMode", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getAutoStrokeAdjust = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getAutoStrokeAdjust", { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getSmoothnessTolerance = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getSmoothnessTolerance",
                    { gs: this.id }, this.userPriority);
            };
            PDFNet.GState.prototype.getTransferFunct = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getTransferFunct", { gs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.GState.prototype.getBlackGenFunct = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getBlackGenFunct", { gs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.GState.prototype.getUCRFunct = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getUCRFunct",
                    { gs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.GState.prototype.getHalftone = function() {
                return PDFNet.messageHandler.sendWithPromise("GState.getHalftone", { gs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.GState.prototype.setTransformMatrix = function(mtx) {
                checkArguments(arguments.length, 1, "setTransformMatrix", "(PDFNet.Matrix2D)", [[mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"]]);
                checkParamsYieldFunction("setTransformMatrix",
                    [[mtx, 0]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setTransformMatrix", {
                    gs: this.id,
                    mtx: mtx,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setTransform = function(a, b, c, d, h, v) {
                checkArguments(arguments.length, 6, "setTransform", "(number, number, number, number, number, number)", [[a, "number"], [b, "number"], [c, "number"], [d, "number"], [h, "number"], [v, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setTransform", {
                    gs: this.id,
                    a: a,
                    b: b,
                    c: c,
                    d: d,
                    h: h,
                    v: v,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.concatMatrix =
                function(mtx) {
                    checkArguments(arguments.length, 1, "concatMatrix", "(PDFNet.Matrix2D)", [[mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"]]);
                    checkParamsYieldFunction("concatMatrix", [[mtx, 0]]);
                    return PDFNet.messageHandler.sendWithPromise("GState.concatMatrix", {
                        gs: this.id,
                        mtx: mtx,
                    }, this.userPriority);
                };
            PDFNet.GState.prototype.concat = function(a, b, c, d, h, v) {
                checkArguments(arguments.length, 6, "concat", "(number, number, number, number, number, number)", [[a, "number"], [b, "number"], [c, "number"], [d, "number"], [h, "number"],
                    [v, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.concat", {
                    gs: this.id,
                    a: a,
                    b: b,
                    c: c,
                    d: d,
                    h: h,
                    v: v,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setStrokeColorSpace = function(cs) {
                checkArguments(arguments.length, 1, "setStrokeColorSpace", "(PDFNet.ColorSpace)", [[cs, "Object", PDFNet.ColorSpace, "ColorSpace"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setStrokeColorSpace", {
                    gs: this.id,
                    cs: cs.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFillColorSpace = function(cs) {
                checkArguments(arguments.length,
                    1, "setFillColorSpace", "(PDFNet.ColorSpace)", [[cs, "Object", PDFNet.ColorSpace, "ColorSpace"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setFillColorSpace", {
                    gs: this.id,
                    cs: cs.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setStrokeColorWithColorPt = function(c) {
                checkArguments(arguments.length, 1, "setStrokeColorWithColorPt", "(PDFNet.ColorPt)", [[c, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setStrokeColorWithColorPt", {
                    gs: this.id,
                    c: c.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setStrokeColorWithPattern = function(pattern) {
                checkArguments(arguments.length, 1, "setStrokeColorWithPattern", "(PDFNet.PatternColor)", [[pattern, "Object", PDFNet.PatternColor, "PatternColor"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setStrokeColorWithPattern", {
                    gs: this.id,
                    pattern: pattern.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setStrokeColor = function(pattern, c) {
                checkArguments(arguments.length, 2, "setStrokeColor", "(PDFNet.PatternColor, PDFNet.ColorPt)", [[pattern,
                    "Object", PDFNet.PatternColor, "PatternColor"], [c, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setStrokeColor", {
                    gs: this.id,
                    pattern: pattern.id,
                    c: c.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFillColorWithColorPt = function(c) {
                checkArguments(arguments.length, 1, "setFillColorWithColorPt", "(PDFNet.ColorPt)", [[c, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setFillColorWithColorPt", {
                    gs: this.id,
                    c: c.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFillColorWithPattern = function(pattern) {
                checkArguments(arguments.length, 1, "setFillColorWithPattern", "(PDFNet.PatternColor)", [[pattern, "Object", PDFNet.PatternColor, "PatternColor"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setFillColorWithPattern", {
                    gs: this.id,
                    pattern: pattern.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFillColor = function(pattern, c) {
                checkArguments(arguments.length, 2, "setFillColor", "(PDFNet.PatternColor, PDFNet.ColorPt)", [[pattern, "Object",
                    PDFNet.PatternColor, "PatternColor"], [c, "Object", PDFNet.ColorPt, "ColorPt"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setFillColor", {
                    gs: this.id,
                    pattern: pattern.id,
                    c: c.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFlatness = function(flatness) {
                checkArguments(arguments.length, 1, "setFlatness", "(number)", [[flatness, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setFlatness", {
                    gs: this.id,
                    flatness: flatness,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setLineCap = function(cap) {
                checkArguments(arguments.length,
                    1, "setLineCap", "(number)", [[cap, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setLineCap", {
                    gs: this.id,
                    cap: cap,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setLineJoin = function(join) {
                checkArguments(arguments.length, 1, "setLineJoin", "(number)", [[join, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setLineJoin", {
                    gs: this.id,
                    join: join,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setLineWidth = function(width) {
                checkArguments(arguments.length, 1, "setLineWidth", "(number)",
                    [[width, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setLineWidth", {
                    gs: this.id,
                    width: width,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setMiterLimit = function(miter_limit) {
                checkArguments(arguments.length, 1, "setMiterLimit", "(number)", [[miter_limit, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setMiterLimit", {
                    gs: this.id,
                    miter_limit: miter_limit,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setDashPattern = function(buf_dash_array, phase) {
                checkArguments(arguments.length,
                    2, "setDashPattern", "(Array, number)", [[buf_dash_array, "ArrayAsBuffer"], [phase, "number"]]);
                var buf_dash_arrayArrayBuffer = getArrayBuffer(buf_dash_array, !0);
                return PDFNet.messageHandler.sendWithPromise("GState.setDashPattern", {
                    gs: this.id,
                    buf_dash_array: buf_dash_arrayArrayBuffer,
                    phase: phase,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setCharSpacing = function(char_spacing) {
                checkArguments(arguments.length, 1, "setCharSpacing", "(number)", [[char_spacing, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setCharSpacing",
                    { gs: this.id, char_spacing: char_spacing }, this.userPriority);
            };
            PDFNet.GState.prototype.setWordSpacing = function(word_spacing) {
                checkArguments(arguments.length, 1, "setWordSpacing", "(number)", [[word_spacing, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setWordSpacing", {
                    gs: this.id,
                    word_spacing: word_spacing,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setHorizontalScale = function(hscale) {
                checkArguments(arguments.length, 1, "setHorizontalScale", "(number)", [[hscale, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setHorizontalScale",
                    { gs: this.id, hscale: hscale }, this.userPriority);
            };
            PDFNet.GState.prototype.setLeading = function(leading) {
                checkArguments(arguments.length, 1, "setLeading", "(number)", [[leading, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setLeading", {
                    gs: this.id,
                    leading: leading,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFont = function(font, font_sz) {
                checkArguments(arguments.length, 2, "setFont", "(PDFNet.Font, number)", [[font, "Object", PDFNet.Font, "Font"], [font_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setFont",
                    { gs: this.id, font: font.id, font_sz: font_sz }, this.userPriority);
            };
            PDFNet.GState.prototype.setTextRenderMode = function(rmode) {
                checkArguments(arguments.length, 1, "setTextRenderMode", "(number)", [[rmode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setTextRenderMode", {
                    gs: this.id,
                    rmode: rmode,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setTextRise = function(rise) {
                checkArguments(arguments.length, 1, "setTextRise", "(number)", [[rise, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setTextRise",
                    { gs: this.id, rise: rise }, this.userPriority);
            };
            PDFNet.GState.prototype.setTextKnockout = function(knockout) {
                checkArguments(arguments.length, 1, "setTextKnockout", "(boolean)", [[knockout, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setTextKnockout", {
                    gs: this.id,
                    knockout: knockout,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setRenderingIntent = function(intent) {
                checkArguments(arguments.length, 1, "setRenderingIntent", "(number)", [[intent, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setRenderingIntent",
                    { gs: this.id, intent: intent }, this.userPriority);
            };
            PDFNet.GState.prototype.setBlendMode = function(BM) {
                checkArguments(arguments.length, 1, "setBlendMode", "(number)", [[BM, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setBlendMode", {
                    gs: this.id,
                    BM: BM,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFillOpacity = function(ca) {
                checkArguments(arguments.length, 1, "setFillOpacity", "(number)", [[ca, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setFillOpacity", {
                    gs: this.id,
                    ca: ca,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setStrokeOpacity = function(CA) {
                checkArguments(arguments.length, 1, "setStrokeOpacity", "(number)", [[CA, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setStrokeOpacity", {
                    gs: this.id,
                    CA: CA,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setAISFlag = function(AIS) {
                checkArguments(arguments.length, 1, "setAISFlag", "(boolean)", [[AIS, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setAISFlag", {
                    gs: this.id,
                    AIS: AIS,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setSoftMask =
                function(SM) {
                    checkArguments(arguments.length, 1, "setSoftMask", "(PDFNet.Obj)", [[SM, "Object", PDFNet.Obj, "Obj"]]);
                    return PDFNet.messageHandler.sendWithPromise("GState.setSoftMask", {
                        gs: this.id,
                        SM: SM.id,
                    }, this.userPriority);
                };
            PDFNet.GState.prototype.setStrokeOverprint = function(OP) {
                checkArguments(arguments.length, 1, "setStrokeOverprint", "(boolean)", [[OP, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setStrokeOverprint", {
                    gs: this.id,
                    OP: OP,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setFillOverprint =
                function(op) {
                    checkArguments(arguments.length, 1, "setFillOverprint", "(boolean)", [[op, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("GState.setFillOverprint", {
                        gs: this.id,
                        op: op,
                    }, this.userPriority);
                };
            PDFNet.GState.prototype.setOverprintMode = function(OPM) {
                checkArguments(arguments.length, 1, "setOverprintMode", "(number)", [[OPM, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setOverprintMode", {
                    gs: this.id,
                    OPM: OPM,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setAutoStrokeAdjust = function(SA) {
                checkArguments(arguments.length,
                    1, "setAutoStrokeAdjust", "(boolean)", [[SA, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setAutoStrokeAdjust", {
                    gs: this.id,
                    SA: SA,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setSmoothnessTolerance = function(SM) {
                checkArguments(arguments.length, 1, "setSmoothnessTolerance", "(number)", [[SM, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setSmoothnessTolerance", {
                    gs: this.id,
                    SM: SM,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setBlackGenFunct = function(BG) {
                checkArguments(arguments.length,
                    1, "setBlackGenFunct", "(PDFNet.Obj)", [[BG, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setBlackGenFunct", {
                    gs: this.id,
                    BG: BG.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setUCRFunct = function(UCR) {
                checkArguments(arguments.length, 1, "setUCRFunct", "(PDFNet.Obj)", [[UCR, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setUCRFunct", {
                    gs: this.id,
                    UCR: UCR.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setTransferFunct = function(TR) {
                checkArguments(arguments.length,
                    1, "setTransferFunct", "(PDFNet.Obj)", [[TR, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setTransferFunct", {
                    gs: this.id,
                    TR: TR.id,
                }, this.userPriority);
            };
            PDFNet.GState.prototype.setHalftone = function(HT) {
                checkArguments(arguments.length, 1, "setHalftone", "(PDFNet.Obj)", [[HT, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("GState.setHalftone", {
                    gs: this.id,
                    HT: HT.id,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getType",
                    { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getGState = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getGState", { e: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.GState, id);
                });
            };
            PDFNet.Element.prototype.getCTM = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getCTM", { e: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Element.prototype.getParentStructElement = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getParentStructElement",
                    { e: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.SElement(id);
                });
            };
            PDFNet.Element.prototype.getStructMCID = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getStructMCID", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isOCVisible = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.isOCVisible", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isClippingPath = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.isClippingPath",
                    { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isStroked = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.isStroked", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isFilled = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.isFilled", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isWindingFill = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.isWindingFill", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isClipWindingFill =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Element.isClipWindingFill", { e: this.id }, this.userPriority);
                };
            PDFNet.Element.prototype.setPathClip = function(clip) {
                checkArguments(arguments.length, 1, "setPathClip", "(boolean)", [[clip, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setPathClip", {
                    e: this.id,
                    clip: clip,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.setPathStroke = function(stroke) {
                checkArguments(arguments.length, 1, "setPathStroke", "(boolean)", [[stroke, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setPathStroke",
                    { e: this.id, stroke: stroke }, this.userPriority);
            };
            PDFNet.Element.prototype.setPathFill = function(fill) {
                checkArguments(arguments.length, 1, "setPathFill", "(boolean)", [[fill, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setPathFill", {
                    e: this.id,
                    fill: fill,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.setWindingFill = function(winding_rule) {
                checkArguments(arguments.length, 1, "setWindingFill", "(boolean)", [[winding_rule, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setWindingFill",
                    { e: this.id, winding_rule: winding_rule }, this.userPriority);
            };
            PDFNet.Element.prototype.setClipWindingFill = function(winding_rule) {
                checkArguments(arguments.length, 1, "setClipWindingFill", "(boolean)", [[winding_rule, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setClipWindingFill", {
                    e: this.id,
                    winding_rule: winding_rule,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.setPathTypes = function(in_seg_types, count) {
                checkArguments(arguments.length, 2, "setPathTypes", "(string, number)", [[in_seg_types,
                    "string"], [count, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setPathTypes", {
                    e: this.id,
                    in_seg_types: in_seg_types,
                    count: count,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.getXObject = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getXObject", { e: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Element.prototype.getImageData = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getImageData", { e: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter,
                        id);
                });
            };
            PDFNet.Element.prototype.getImageDataSize = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getImageDataSize", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getImageColorSpace = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getImageColorSpace", { e: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.Element.prototype.getImageWidth = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getImageWidth",
                    { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getImageHeight = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getImageHeight", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getDecodeArray = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getDecodeArray", { e: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Element.prototype.getBitsPerComponent = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getBitsPerComponent",
                    { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getComponentNum = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getComponentNum", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isImageMask = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.isImageMask", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.isImageInterpolate = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.isImageInterpolate", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getMask =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Element.getMask", { e: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.Element.prototype.getImageRenderingIntent = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getImageRenderingIntent", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getTextString = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getTextString", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getTextMatrix =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Element.getTextMatrix", { e: this.id }, this.userPriority).then(function(id) {
                        return new PDFNet.Matrix2D(id);
                    });
                };
            PDFNet.Element.prototype.getCharIterator = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getCharIterator", { e: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Iterator, id, "Int");
                });
            };
            PDFNet.Element.prototype.getTextLength = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getTextLength",
                    { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getPosAdjustment = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getPosAdjustment", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getNewTextLineOffset = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getNewTextLineOffset", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.hasTextMatrix = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.hasTextMatrix", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.setTextData = function(buf_text_data) {
                checkArguments(arguments.length, 1, "setTextData", "(ArrayBuffer|TypedArray)", [[buf_text_data, "ArrayBuffer"]]);
                var buf_text_dataArrayBuffer = getArrayBuffer(buf_text_data, !1);
                return PDFNet.messageHandler.sendWithPromise("Element.setTextData", {
                    e: this.id,
                    buf_text_data: buf_text_dataArrayBuffer,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.setTextMatrix = function(mtx) {
                checkArguments(arguments.length, 1, "setTextMatrix", "(PDFNet.Matrix2D)", [[mtx, "Structure",
                    PDFNet.Matrix2D, "Matrix2D"]]);
                checkParamsYieldFunction("setTextMatrix", [[mtx, 0]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setTextMatrix", {
                    e: this.id,
                    mtx: mtx,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.setTextMatrixEntries = function(a, b, c, d, h, v) {
                checkArguments(arguments.length, 6, "setTextMatrixEntries", "(number, number, number, number, number, number)", [[a, "number"], [b, "number"], [c, "number"], [d, "number"], [h, "number"], [v, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setTextMatrixEntries",
                    { e: this.id, a: a, b: b, c: c, d: d, h: h, v: v }, this.userPriority);
            };
            PDFNet.Element.prototype.setPosAdjustment = function(adjust) {
                checkArguments(arguments.length, 1, "setPosAdjustment", "(number)", [[adjust, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Element.setPosAdjustment", {
                    e: this.id,
                    adjust: adjust,
                }, this.userPriority);
            };
            PDFNet.Element.prototype.updateTextMetrics = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.updateTextMetrics", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.setNewTextLineOffset =
                function(dx, dy) {
                    checkArguments(arguments.length, 2, "setNewTextLineOffset", "(number, number)", [[dx, "number"], [dy, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("Element.setNewTextLineOffset", {
                        e: this.id,
                        dx: dx,
                        dy: dy,
                    }, this.userPriority);
                };
            PDFNet.Element.prototype.getShading = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getShading", { e: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Shading, id);
                });
            };
            PDFNet.Element.prototype.getMCPropertyDict = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getMCPropertyDict",
                    { e: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Element.prototype.getMCTag = function() {
                return PDFNet.messageHandler.sendWithPromise("Element.getMCTag", { e: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ShapedText.prototype.getScale = function() {
                return PDFNet.messageHandler.sendWithPromise("ShapedText.getScale", { self: this.id }, this.userPriority);
            };
            PDFNet.ShapedText.prototype.getShapingStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("ShapedText.getShapingStatus",
                    { self: this.id }, this.userPriority);
            };
            PDFNet.ShapedText.prototype.getFailureReason = function() {
                return PDFNet.messageHandler.sendWithPromise("ShapedText.getFailureReason", { self: this.id }, this.userPriority);
            };
            PDFNet.ShapedText.prototype.getText = function() {
                return PDFNet.messageHandler.sendWithPromise("ShapedText.getText", { self: this.id }, this.userPriority);
            };
            PDFNet.ShapedText.prototype.getNumGlyphs = function() {
                return PDFNet.messageHandler.sendWithPromise("ShapedText.getNumGlyphs", { self: this.id }, this.userPriority);
            };
            PDFNet.ShapedText.prototype.getGlyph = function(index) {
                checkArguments(arguments.length, 1, "getGlyph", "(number)", [[index, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ShapedText.getGlyph", {
                    self: this.id,
                    index: index,
                }, this.userPriority);
            };
            PDFNet.ShapedText.prototype.getGlyphXPos = function(index) {
                checkArguments(arguments.length, 1, "getGlyphXPos", "(number)", [[index, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ShapedText.getGlyphXPos", {
                    self: this.id,
                    index: index,
                }, this.userPriority);
            };
            PDFNet.ShapedText.prototype.getGlyphYPos =
                function(index) {
                    checkArguments(arguments.length, 1, "getGlyphYPos", "(number)", [[index, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("ShapedText.getGlyphYPos", {
                        self: this.id,
                        index: index,
                    }, this.userPriority);
                };
            PDFNet.ElementBuilder.create = function() {
                return PDFNet.messageHandler.sendWithPromise("elementBuilderCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ElementBuilder, id);
                });
            };
            PDFNet.ElementBuilder.prototype.reset = function(gs) {
                "undefined" === typeof gs && (gs = new PDFNet.GState("0"));
                checkArguments(arguments.length, 0, "reset", "(PDFNet.GState)", [[gs, "Object", PDFNet.GState, "GState"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.reset", {
                    b: this.id,
                    gs: gs.id,
                }, this.userPriority);
            };
            PDFNet.ElementBuilder.prototype.createImage = function(img) {
                checkArguments(arguments.length, 1, "createImage", "(PDFNet.Image)", [[img, "Object", PDFNet.Image, "Image"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createImage", {
                    b: this.id,
                    img: img.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element,
                        id);
                });
            };
            PDFNet.ElementBuilder.prototype.createImageFromMatrix = function(img, mtx) {
                checkArguments(arguments.length, 2, "createImageFromMatrix", "(PDFNet.Image, PDFNet.Matrix2D)", [[img, "Object", PDFNet.Image, "Image"], [mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"]]);
                checkParamsYieldFunction("createImageFromMatrix", [[mtx, 1]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createImageFromMatrix", {
                    b: this.id,
                    img: img.id,
                    mtx: mtx,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element,
                        id);
                });
            };
            PDFNet.ElementBuilder.prototype.createImageScaled = function(img, x, y, hscale, vscale) {
                checkArguments(arguments.length, 5, "createImageScaled", "(PDFNet.Image, number, number, number, number)", [[img, "Object", PDFNet.Image, "Image"], [x, "number"], [y, "number"], [hscale, "number"], [vscale, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createImageScaled", {
                    b: this.id,
                    img: img.id,
                    x: x,
                    y: y,
                    hscale: hscale,
                    vscale: vscale,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element,
                        id);
                });
            };
            PDFNet.ElementBuilder.prototype.createGroupBegin = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createGroupBegin", { b: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createGroupEnd = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createGroupEnd", { b: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createShading =
                function(sh) {
                    checkArguments(arguments.length, 1, "createShading", "(PDFNet.Shading)", [[sh, "Object", PDFNet.Shading, "Shading"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createShading", {
                        b: this.id,
                        sh: sh.id,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Element, id);
                    });
                };
            PDFNet.ElementBuilder.prototype.createFormFromStream = function(form) {
                checkArguments(arguments.length, 1, "createFormFromStream", "(PDFNet.Obj)", [[form, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createFormFromStream",
                    { b: this.id, form: form.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createFormFromPage = function(page) {
                checkArguments(arguments.length, 1, "createFormFromPage", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createFormFromPage", {
                    b: this.id,
                    page: page.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createFormFromDoc =
                function(page, doc) {
                    checkArguments(arguments.length, 2, "createFormFromDoc", "(PDFNet.Page, PDFNet.PDFDoc)", [[page, "Object", PDFNet.Page, "Page"], [doc, "PDFDoc"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createFormFromDoc", {
                        b: this.id,
                        page: page.id,
                        doc: doc.id,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Element, id);
                    });
                };
            PDFNet.ElementBuilder.prototype.createTextBeginWithFont = function(font, font_sz) {
                checkArguments(arguments.length, 2, "createTextBeginWithFont", "(PDFNet.Font, number)",
                    [[font, "Object", PDFNet.Font, "Font"], [font_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextBeginWithFont", {
                    b: this.id,
                    font: font.id,
                    font_sz: font_sz,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createTextBegin = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextBegin", { b: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createTextEnd =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextEnd", { b: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Element, id);
                    });
                };
            PDFNet.ElementBuilder.prototype.createTextRun = function(text_data, font, font_sz) {
                checkArguments(arguments.length, 3, "createTextRun", "(string, PDFNet.Font, number)", [[text_data, "string"], [font, "Object", PDFNet.Font, "Font"], [font_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextRun", {
                    b: this.id,
                    text_data: text_data, font: font.id, font_sz: font_sz,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createTextRunWithSize = function(text_data, text_data_sz, font, font_sz) {
                checkArguments(arguments.length, 4, "createTextRunWithSize", "(string, number, PDFNet.Font, number)", [[text_data, "string"], [text_data_sz, "number"], [font, "Object", PDFNet.Font, "Font"], [font_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextRunWithSize",
                    {
                        b: this.id,
                        text_data: text_data,
                        text_data_sz: text_data_sz,
                        font: font.id,
                        font_sz: font_sz,
                    }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createTextRunUnsigned = function(text_data, font, font_sz) {
                checkArguments(arguments.length, 3, "createTextRunUnsigned", "(string, PDFNet.Font, number)", [[text_data, "string"], [font, "Object", PDFNet.Font, "Font"], [font_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextRunUnsigned",
                    {
                        b: this.id,
                        text_data: text_data,
                        font: font.id,
                        font_sz: font_sz,
                    }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createNewTextRun = function(text_data) {
                checkArguments(arguments.length, 1, "createNewTextRun", "(string)", [[text_data, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createNewTextRun", {
                    b: this.id,
                    text_data: text_data,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createNewTextRunWithSize =
                function(text_data, text_data_sz) {
                    checkArguments(arguments.length, 2, "createNewTextRunWithSize", "(string, number)", [[text_data, "string"], [text_data_sz, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createNewTextRunWithSize", {
                        b: this.id,
                        text_data: text_data,
                        text_data_sz: text_data_sz,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Element, id);
                    });
                };
            PDFNet.ElementBuilder.prototype.createNewTextRunUnsigned = function(text_data) {
                checkArguments(arguments.length, 1, "createNewTextRunUnsigned",
                    "(string)", [[text_data, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createNewTextRunUnsigned", {
                    b: this.id,
                    text_data: text_data,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createShapedTextRun = function(text_data) {
                checkArguments(arguments.length, 1, "createShapedTextRun", "(PDFNet.ShapedText)", [[text_data, "Object", PDFNet.ShapedText, "ShapedText"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createShapedTextRun",
                    { b: this.id, text_data: text_data.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createTextNewLineWithOffset = function(dx, dy) {
                checkArguments(arguments.length, 2, "createTextNewLineWithOffset", "(number, number)", [[dx, "number"], [dy, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextNewLineWithOffset", {
                    b: this.id,
                    dx: dx,
                    dy: dy,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createTextNewLine = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createTextNewLine", { b: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createPath = function(buf_points, buf_seg_types) {
                checkArguments(arguments.length, 2, "createPath", "(Array, ArrayBuffer|TypedArray)", [[buf_points, "ArrayAsBuffer"], [buf_seg_types, "ArrayBuffer"]]);
                var buf_pointsArrayBuffer = getArrayBuffer(buf_points,
                    !0), buf_seg_typesArrayBuffer = getArrayBuffer(buf_seg_types, !1);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createPath", {
                    b: this.id,
                    buf_points: buf_pointsArrayBuffer,
                    buf_seg_types: buf_seg_typesArrayBuffer,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createRect = function(x, y, width, height) {
                checkArguments(arguments.length, 4, "createRect", "(number, number, number, number)", [[x, "number"], [y, "number"], [width, "number"], [height,
                    "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createRect", {
                    b: this.id,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.createEllipse = function(x, y, width, height) {
                checkArguments(arguments.length, 4, "createEllipse", "(number, number, number, number)", [[x, "number"], [y, "number"], [width, "number"], [height, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.createEllipse",
                    { b: this.id, x: x, y: y, width: width, height: height }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.pathBegin = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.pathBegin", { b: this.id }, this.userPriority);
            };
            PDFNet.ElementBuilder.prototype.pathEnd = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.pathEnd", { b: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementBuilder.prototype.rect =
                function(x, y, width, height) {
                    checkArguments(arguments.length, 4, "rect", "(number, number, number, number)", [[x, "number"], [y, "number"], [width, "number"], [height, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementBuilder.rect", {
                        b: this.id,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                    }, this.userPriority);
                };
            PDFNet.ElementBuilder.prototype.ellipse = function(x, y, width, height) {
                checkArguments(arguments.length, 4, "ellipse", "(number, number, number, number)", [[x, "number"], [y, "number"], [width, "number"], [height, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.ellipse", {
                    b: this.id,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                }, this.userPriority);
            };
            PDFNet.ElementBuilder.prototype.moveTo = function(x, y) {
                checkArguments(arguments.length, 2, "moveTo", "(number, number)", [[x, "number"], [y, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.moveTo", {
                    b: this.id,
                    x: x,
                    y: y,
                }, this.userPriority);
            };
            PDFNet.ElementBuilder.prototype.lineTo = function(x, y) {
                checkArguments(arguments.length, 2, "lineTo", "(number, number)",
                    [[x, "number"], [y, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.lineTo", {
                    b: this.id,
                    x: x,
                    y: y,
                }, this.userPriority);
            };
            PDFNet.ElementBuilder.prototype.curveTo = function(cx1, cy1, cx2, cy2, x2, y2) {
                checkArguments(arguments.length, 6, "curveTo", "(number, number, number, number, number, number)", [[cx1, "number"], [cy1, "number"], [cx2, "number"], [cy2, "number"], [x2, "number"], [y2, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.curveTo", {
                    b: this.id, cx1: cx1, cy1: cy1, cx2: cx2,
                    cy2: cy2, x2: x2, y2: y2,
                }, this.userPriority);
            };
            PDFNet.ElementBuilder.prototype.arcTo = function(x, y, width, height, start, extent) {
                checkArguments(arguments.length, 6, "arcTo", "(number, number, number, number, number, number)", [[x, "number"], [y, "number"], [width, "number"], [height, "number"], [start, "number"], [extent, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.arcTo", {
                    b: this.id,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    start: start,
                    extent: extent,
                }, this.userPriority);
            };
            PDFNet.ElementBuilder.prototype.arcTo2 =
                function(xr, yr, rx, isLargeArc, sweep, endX, endY) {
                    checkArguments(arguments.length, 7, "arcTo2", "(number, number, number, boolean, boolean, number, number)", [[xr, "number"], [yr, "number"], [rx, "number"], [isLargeArc, "boolean"], [sweep, "boolean"], [endX, "number"], [endY, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementBuilder.arcTo2", {
                        b: this.id,
                        xr: xr,
                        yr: yr,
                        rx: rx,
                        isLargeArc: isLargeArc,
                        sweep: sweep,
                        endX: endX,
                        endY: endY,
                    }, this.userPriority);
                };
            PDFNet.ElementBuilder.prototype.closePath = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementBuilder.closePath",
                    { b: this.id }, this.userPriority);
            };
            PDFNet.ElementReader.create = function() {
                return PDFNet.messageHandler.sendWithPromise("elementReaderCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ElementReader, id);
                });
            };
            PDFNet.ElementReader.prototype.beginOnPage = function(page, ctx) {
                "undefined" === typeof ctx && (ctx = new PDFNet.OCGContext("0"));
                checkArguments(arguments.length, 1, "beginOnPage", "(PDFNet.Page, PDFNet.OCGContext)", [[page, "Object", PDFNet.Page, "Page"], [ctx, "Object", PDFNet.OCGContext,
                    "OCGContext"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.beginOnPage", {
                    r: this.id,
                    page: page.id,
                    ctx: ctx.id,
                }, this.userPriority);
            };
            PDFNet.ElementReader.prototype.begin = function(content_stream, resource_dict, ctx) {
                "undefined" === typeof resource_dict && (resource_dict = new PDFNet.Obj("0"));
                "undefined" === typeof ctx && (ctx = new PDFNet.OCGContext("0"));
                checkArguments(arguments.length, 1, "begin", "(PDFNet.Obj, PDFNet.Obj, PDFNet.OCGContext)", [[content_stream, "Object", PDFNet.Obj, "Obj"], [resource_dict,
                    "Object", PDFNet.Obj, "Obj"], [ctx, "Object", PDFNet.OCGContext, "OCGContext"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.begin", {
                    r: this.id,
                    content_stream: content_stream.id,
                    resource_dict: resource_dict.id,
                    ctx: ctx.id,
                }, this.userPriority);
            };
            PDFNet.ElementReader.prototype.appendResource = function(res) {
                checkArguments(arguments.length, 1, "appendResource", "(PDFNet.Obj)", [[res, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.appendResource", {
                        r: this.id,
                        res: res.id,
                    },
                    this.userPriority);
            };
            PDFNet.ElementReader.prototype.next = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementReader.next", { r: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementReader.prototype.current = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementReader.current", { r: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Element, id);
                });
            };
            PDFNet.ElementReader.prototype.formBegin = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementReader.formBegin",
                    { r: this.id }, this.userPriority);
            };
            PDFNet.ElementReader.prototype.patternBegin = function(fill_pattern, reset_ctm_tfm) {
                "undefined" === typeof reset_ctm_tfm && (reset_ctm_tfm = !1);
                checkArguments(arguments.length, 1, "patternBegin", "(boolean, boolean)", [[fill_pattern, "boolean"], [reset_ctm_tfm, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.patternBegin", {
                    r: this.id,
                    fill_pattern: fill_pattern,
                    reset_ctm_tfm: reset_ctm_tfm,
                }, this.userPriority);
            };
            PDFNet.ElementReader.prototype.end = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementReader.end",
                    { r: this.id }, this.userPriority);
            };
            PDFNet.ElementReader.prototype.getChangesIterator = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementReader.getChangesIterator", { r: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Iterator, id, "Int");
                });
            };
            PDFNet.ElementReader.prototype.isChanged = function(attrib) {
                checkArguments(arguments.length, 1, "isChanged", "(number)", [[attrib, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.isChanged", { r: this.id, attrib: attrib },
                    this.userPriority);
            };
            PDFNet.ElementReader.prototype.clearChangeList = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementReader.clearChangeList", { r: this.id }, this.userPriority);
            };
            PDFNet.ElementReader.prototype.getFont = function(name) {
                checkArguments(arguments.length, 1, "getFont", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.getFont", {
                    r: this.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ElementReader.prototype.getXObject =
                function(name) {
                    checkArguments(arguments.length, 1, "getXObject", "(string)", [[name, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementReader.getXObject", {
                        r: this.id,
                        name: name,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.ElementReader.prototype.getShading = function(name) {
                checkArguments(arguments.length, 1, "getShading", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.getShading", {
                    r: this.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.ElementReader.prototype.getColorSpace = function(name) {
                checkArguments(arguments.length, 1, "getColorSpace", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.getColorSpace", {
                    r: this.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ElementReader.prototype.getPattern = function(name) {
                checkArguments(arguments.length, 1, "getPattern", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.getPattern",
                    { r: this.id, name: name }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ElementReader.prototype.getExtGState = function(name) {
                checkArguments(arguments.length, 1, "getExtGState", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementReader.getExtGState", {
                    r: this.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ElementWriter.create = function() {
                return PDFNet.messageHandler.sendWithPromise("elementWriterCreate",
                    {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ElementWriter, id);
                });
            };
            PDFNet.ElementWriter.prototype.beginOnPage = function(page, placement, page_coord_sys, compress, resources) {
                "undefined" === typeof placement && (placement = PDFNet.ElementWriter.WriteMode.e_overlay);
                "undefined" === typeof page_coord_sys && (page_coord_sys = !0);
                "undefined" === typeof compress && (compress = !0);
                "undefined" === typeof resources && (resources = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 1, "beginOnPage", "(PDFNet.Page, number, boolean, boolean, PDFNet.Obj)",
                    [[page, "Object", PDFNet.Page, "Page"], [placement, "number"], [page_coord_sys, "boolean"], [compress, "boolean"], [resources, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.beginOnPage", {
                    w: this.id,
                    page: page.id,
                    placement: placement,
                    page_coord_sys: page_coord_sys,
                    compress: compress,
                    resources: resources.id,
                }, this.userPriority);
            };
            PDFNet.ElementWriter.prototype.begin = function(doc, compress) {
                "undefined" === typeof compress && (compress = !0);
                checkArguments(arguments.length, 1, "begin",
                    "(PDFNet.SDFDoc, boolean)", [[doc, "SDFDoc"], [compress, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.begin", {
                    w: this.id,
                    doc: doc.id,
                    compress: compress,
                }, this.userPriority);
            };
            PDFNet.ElementWriter.prototype.beginOnObj = function(stream_obj_to_update, compress, resources) {
                "undefined" === typeof compress && (compress = !0);
                "undefined" === typeof resources && (resources = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 1, "beginOnObj", "(PDFNet.Obj, boolean, PDFNet.Obj)", [[stream_obj_to_update,
                    "Object", PDFNet.Obj, "Obj"], [compress, "boolean"], [resources, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.beginOnObj", {
                    w: this.id,
                    stream_obj_to_update: stream_obj_to_update.id,
                    compress: compress,
                    resources: resources.id,
                }, this.userPriority);
            };
            PDFNet.ElementWriter.prototype.end = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.end", { w: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ElementWriter.prototype.writeElement =
                function(element) {
                    checkArguments(arguments.length, 1, "writeElement", "(PDFNet.Element)", [[element, "Object", PDFNet.Element, "Element"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementWriter.writeElement", {
                        w: this.id,
                        element: element.id,
                    }, this.userPriority);
                };
            PDFNet.ElementWriter.prototype.writePlacedElement = function(element) {
                checkArguments(arguments.length, 1, "writePlacedElement", "(PDFNet.Element)", [[element, "Object", PDFNet.Element, "Element"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.writePlacedElement",
                    { w: this.id, element: element.id }, this.userPriority);
            };
            PDFNet.ElementWriter.prototype.flush = function() {
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.flush", { w: this.id }, this.userPriority);
            };
            PDFNet.ElementWriter.prototype.writeBuffer = function(data, data_sz) {
                checkArguments(arguments.length, 2, "writeBuffer", "(string, number)", [[data, "string"], [data_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.writeBuffer", {
                    w: this.id,
                    data: data,
                    data_sz: data_sz,
                }, this.userPriority);
            };
            PDFNet.ElementWriter.prototype.writeString =
                function(str) {
                    checkArguments(arguments.length, 1, "writeString", "(string)", [[str, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("ElementWriter.writeString", {
                        w: this.id,
                        str: str,
                    }, this.userPriority);
                };
            PDFNet.ElementWriter.prototype.setDefaultGState = function(r) {
                checkArguments(arguments.length, 1, "setDefaultGState", "(PDFNet.ElementReader)", [[r, "Object", PDFNet.ElementReader, "ElementReader"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.setDefaultGState", {
                    w: this.id,
                    r: r.id,
                }, this.userPriority);
            };
            PDFNet.ElementWriter.prototype.writeGStateChanges = function(element) {
                checkArguments(arguments.length, 1, "writeGStateChanges", "(PDFNet.Element)", [[element, "Object", PDFNet.Element, "Element"]]);
                return PDFNet.messageHandler.sendWithPromise("ElementWriter.writeGStateChanges", {
                    w: this.id,
                    element: element.id,
                }, this.userPriority);
            };
            PDFNet.FileSpec.create = function(doc, path, embed) {
                "undefined" === typeof embed && (embed = !0);
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, string, boolean)", [[doc, "SDFDoc"],
                    [path, "string"], [embed, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("fileSpecCreate", {
                    doc: doc.id,
                    path: path,
                    embed: embed,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileSpec, id);
                });
            };
            PDFNet.FileSpec.createURL = function(doc, url) {
                checkArguments(arguments.length, 2, "createURL", "(PDFNet.SDFDoc, string)", [[doc, "SDFDoc"], [url, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("fileSpecCreateURL", {
                    doc: doc.id,
                    url: url,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileSpec,
                        id);
                });
            };
            PDFNet.FileSpec.createFromObj = function(f) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[f, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("fileSpecCreateFromObj", { f: f.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileSpec, id);
                });
            };
            PDFNet.FileSpec.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("FileSpec.copy", { d: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.FileSpec, id);
                });
            };
            PDFNet.FileSpec.prototype.compare = function(d) {
                checkArguments(arguments.length, 1, "compare", "(PDFNet.FileSpec)", [[d, "Object", PDFNet.FileSpec, "FileSpec"]]);
                return PDFNet.messageHandler.sendWithPromise("FileSpec.compare", {
                    fs: this.id,
                    d: d.id,
                }, this.userPriority);
            };
            PDFNet.FileSpec.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("FileSpec.isValid", { fs: this.id }, this.userPriority);
            };
            PDFNet.FileSpec.prototype["export"] = function(save_as) {
                "undefined" === typeof save_as && (save_as = "");
                checkArguments(arguments.length,
                    0, "export", "(string)", [[save_as, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FileSpec.export", {
                    fs: this.id,
                    save_as: save_as,
                }, this.userPriority);
            };
            PDFNet.FileSpec.prototype.getFileData = function() {
                return PDFNet.messageHandler.sendWithPromise("FileSpec.getFileData", { fs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.FileSpec.prototype.getFilePath = function() {
                return PDFNet.messageHandler.sendWithPromise("FileSpec.getFilePath", { fs: this.id }, this.userPriority);
            };
            PDFNet.FileSpec.prototype.setDesc = function(desc) {
                checkArguments(arguments.length, 1, "setDesc", "(string)", [[desc, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("FileSpec.setDesc", {
                    fs: this.id,
                    desc: desc,
                }, this.userPriority);
            };
            PDFNet.FileSpec.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("FileSpec.getSDFObj", { fs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Flattener.create = function() {
                return PDFNet.messageHandler.sendWithPromise("flattenerCreate",
                    {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Flattener, id);
                });
            };
            PDFNet.Flattener.prototype.setDPI = function(dpi) {
                checkArguments(arguments.length, 1, "setDPI", "(number)", [[dpi, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.setDPI", {
                    flattener: this.id,
                    dpi: dpi,
                }, this.userPriority);
            };
            PDFNet.Flattener.prototype.setThreshold = function(threshold) {
                checkArguments(arguments.length, 1, "setThreshold", "(number)", [[threshold, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.setThreshold",
                    { flattener: this.id, threshold: threshold }, this.userPriority);
            };
            PDFNet.Flattener.prototype.setMaximumImagePixels = function(max_pixels) {
                checkArguments(arguments.length, 1, "setMaximumImagePixels", "(number)", [[max_pixels, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.setMaximumImagePixels", {
                    flattener: this.id,
                    max_pixels: max_pixels,
                }, this.userPriority);
            };
            PDFNet.Flattener.prototype.setPreferJPG = function(jpg) {
                checkArguments(arguments.length, 1, "setPreferJPG", "(boolean)", [[jpg, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.setPreferJPG",
                    { flattener: this.id, jpg: jpg }, this.userPriority);
            };
            PDFNet.Flattener.prototype.setJPGQuality = function(quality) {
                checkArguments(arguments.length, 1, "setJPGQuality", "(number)", [[quality, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.setJPGQuality", {
                    flattener: this.id,
                    quality: quality,
                }, this.userPriority);
            };
            PDFNet.Flattener.prototype.setPathHinting = function(hinting) {
                checkArguments(arguments.length, 1, "setPathHinting", "(boolean)", [[hinting, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.setPathHinting",
                    { flattener: this.id, hinting: hinting }, this.userPriority);
            };
            PDFNet.Flattener.prototype.process = function(doc, mode) {
                checkArguments(arguments.length, 2, "process", "(PDFNet.PDFDoc, number)", [[doc, "PDFDoc"], [mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.process", {
                    flattener: this.id,
                    doc: doc.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.Flattener.prototype.processPage = function(page, mode) {
                checkArguments(arguments.length, 2, "processPage", "(PDFNet.Page, number)", [[page, "Object", PDFNet.Page, "Page"],
                    [mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Flattener.processPage", {
                    flattener: this.id,
                    page: page.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.Font.createFromObj = function(font_dict) {
                "undefined" === typeof font_dict && (font_dict = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[font_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("fontCreateFromObj", { font_dict: font_dict.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Font,
                        id);
                });
            };
            PDFNet.Font.create = function(doc, type) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, number)", [[doc, "SDFDoc"], [type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("fontCreate", {
                    doc: doc.id,
                    type: type,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Font, id);
                });
            };
            PDFNet.Font.createFromFontDescriptor = function(doc, from, char_set) {
                checkArguments(arguments.length, 3, "createFromFontDescriptor", "(PDFNet.SDFDoc, PDFNet.Font, string)", [[doc, "SDFDoc"], [from, "Object",
                    PDFNet.Font, "Font"], [char_set, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("fontCreateFromFontDescriptor", {
                    doc: doc.id,
                    from: from.id,
                    char_set: char_set,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Font, id);
                });
            };
            PDFNet.Font.createFromName = function(doc, name, char_set) {
                checkArguments(arguments.length, 3, "createFromName", "(PDFNet.SDFDoc, string, string)", [[doc, "SDFDoc"], [name, "string"], [char_set, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("fontCreateFromName",
                    { doc: doc.id, name: name, char_set: char_set }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Font, id);
                });
            };
            PDFNet.Font.createAndEmbed = function(doc, type) {
                checkArguments(arguments.length, 2, "createAndEmbed", "(PDFNet.SDFDoc, number)", [[doc, "SDFDoc"], [type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("fontCreateAndEmbed", {
                    doc: doc.id,
                    type: type,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Font, id);
                });
            };
            PDFNet.Font.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getType",
                    { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isSimple = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isSimple", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.getTypeFromObj = function(font_dict) {
                checkArguments(arguments.length, 1, "getTypeFromObj", "(PDFNet.Obj)", [[font_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("fontGetTypeFromObj", { font_dict: font_dict.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getSDFObj",
                    { font: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Font.prototype.getDescriptor = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getDescriptor", { font: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Font.prototype.getName = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getName", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getFamilyName = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getFamilyName",
                    { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isFixedWidth = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isFixedWidth", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isSerif = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isSerif", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isSymbolic = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isSymbolic", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isItalic = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isItalic",
                    { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isAllCap = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isAllCap", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isForceBold = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isForceBold", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isHorizontalMode = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isHorizontalMode", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getWidth =
                function(char_code) {
                    checkArguments(arguments.length, 1, "getWidth", "(number)", [[char_code, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("Font.getWidth", {
                        font: this.id,
                        char_code: char_code,
                    }, this.userPriority);
                };
            PDFNet.Font.prototype.getMaxWidth = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getMaxWidth", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getMissingWidth = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getMissingWidth", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getCharCodeIterator = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getCharCodeIterator", { font: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Iterator, id, "Int");
                });
            };
            PDFNet.Font.prototype.getShapedText = function(text_to_shape) {
                checkArguments(arguments.length, 1, "getShapedText", "(string)", [[text_to_shape, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Font.getShapedText", {
                    font: this.id,
                    text_to_shape: text_to_shape,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ShapedText,
                        id);
                });
            };
            PDFNet.Font.prototype.getEncoding = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getEncoding", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.isEmbedded = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isEmbedded", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getEmbeddedFontName = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getEmbeddedFontName", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getEmbeddedFont = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getEmbeddedFont",
                    { font: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Font.prototype.getEmbeddedFontBufSize = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getEmbeddedFontBufSize", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getUnitsPerEm = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getUnitsPerEm", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getBBox = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getBBox",
                    { font: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Font.prototype.getAscent = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getAscent", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getDescent = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getDescent", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getStandardType1FontType = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getStandardType1FontType", { font: this.id },
                    this.userPriority);
            };
            PDFNet.Font.prototype.isCFF = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.isCFF", { font: this.id }, this.userPriority);
            };
            PDFNet.Font.prototype.getType3FontMatrix = function() {
                return PDFNet.messageHandler.sendWithPromise("Font.getType3FontMatrix", { font: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Font.prototype.getType3GlyphStream = function(char_code) {
                checkArguments(arguments.length, 1, "getType3GlyphStream", "(number)", [[char_code,
                    "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Font.getType3GlyphStream", {
                    font: this.id,
                    char_code: char_code,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Font.prototype.getVerticalAdvance = function(char_code) {
                checkArguments(arguments.length, 1, "getVerticalAdvance", "(number)", [[char_code, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Font.getVerticalAdvance", {
                    font: this.id,
                    char_code: char_code,
                }, this.userPriority);
            };
            PDFNet.Font.prototype.getDescendant =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Font.getDescendant", { font: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.Font, id);
                    });
                };
            PDFNet.Font.prototype.mapToCID = function(char_code) {
                checkArguments(arguments.length, 1, "mapToCID", "(number)", [[char_code, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Font.mapToCID", {
                    font: this.id,
                    char_code: char_code,
                }, this.userPriority);
            };
            PDFNet.Function.create = function(funct_dict) {
                "undefined" === typeof funct_dict && (funct_dict =
                    new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[funct_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("functionCreate", { funct_dict: funct_dict.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Function, id);
                });
            };
            PDFNet.Function.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("Function.getType", { f: this.id }, this.userPriority);
            };
            PDFNet.Function.prototype.getInputCardinality = function() {
                return PDFNet.messageHandler.sendWithPromise("Function.getInputCardinality",
                    { f: this.id }, this.userPriority);
            };
            PDFNet.Function.prototype.getOutputCardinality = function() {
                return PDFNet.messageHandler.sendWithPromise("Function.getOutputCardinality", { f: this.id }, this.userPriority);
            };
            PDFNet.Function.prototype.eval = function(inval, outval) {
                checkArguments(arguments.length, 2, "eval", "(number, number)", [[inval, "number"], [outval, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Function.eval", {
                    f: this.id,
                    inval: inval,
                    outval: outval,
                }, this.userPriority);
            };
            PDFNet.Function.prototype.getSDFObj =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Function.getSDFObj", { f: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.Highlights.create = function() {
                return PDFNet.messageHandler.sendWithPromise("highlightsCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Highlights, id);
                });
            };
            PDFNet.Highlights.prototype.copyCtor = function() {
                return PDFNet.messageHandler.sendWithPromise("Highlights.copyCtor", { hlts: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Highlights,
                        id);
                });
            };
            PDFNet.Highlights.prototype.add = function(hlts) {
                checkArguments(arguments.length, 1, "add", "(PDFNet.Highlights)", [[hlts, "Object", PDFNet.Highlights, "Highlights"]]);
                return PDFNet.messageHandler.sendWithPromise("Highlights.add", {
                    hlts2: this.id,
                    hlts: hlts.id,
                }, this.userPriority);
            };
            PDFNet.Highlights.prototype.load = function(file_name) {
                checkArguments(arguments.length, 1, "load", "(string)", [[file_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Highlights.load", { hlts: this.id, file_name: file_name },
                    this.userPriority);
            };
            PDFNet.Highlights.prototype.save = function(file_name) {
                checkArguments(arguments.length, 1, "save", "(string)", [[file_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Highlights.save", {
                    hlts: this.id,
                    file_name: file_name,
                }, this.userPriority);
            };
            PDFNet.Highlights.prototype.clear = function() {
                return PDFNet.messageHandler.sendWithPromise("Highlights.clear", { hlts: this.id }, this.userPriority);
            };
            PDFNet.Highlights.prototype.begin = function(doc) {
                checkArguments(arguments.length, 1, "begin",
                    "(PDFNet.PDFDoc)", [[doc, "PDFDoc"]]);
                return PDFNet.messageHandler.sendWithPromise("Highlights.begin", {
                    hlts: this.id,
                    doc: doc.id,
                }, this.userPriority);
            };
            PDFNet.Highlights.prototype.hasNext = function() {
                return PDFNet.messageHandler.sendWithPromise("Highlights.hasNext", { hlts: this.id }, this.userPriority);
            };
            PDFNet.Highlights.prototype.next = function() {
                return PDFNet.messageHandler.sendWithPromise("Highlights.next", { hlts: this.id }, this.userPriority);
            };
            PDFNet.Highlights.prototype.getCurrentPageNumber = function() {
                return PDFNet.messageHandler.sendWithPromise("Highlights.getCurrentPageNumber",
                    { hlts: this.id }, this.userPriority);
            };
            PDFNet.Image.createFromMemory = function(doc, buf, width, height, bpc, color_space, encoder_hints) {
                "undefined" === typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 6, "createFromMemory", "(PDFNet.SDFDoc, ArrayBuffer|TypedArray, number, number, number, PDFNet.ColorSpace, PDFNet.Obj)", [[doc, "SDFDoc"], [buf, "ArrayBuffer"], [width, "number"], [height, "number"], [bpc, "number"], [color_space, "Object", PDFNet.ColorSpace, "ColorSpace"], [encoder_hints,
                    "Object", PDFNet.Obj, "Obj"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("imageCreateFromMemory", {
                    doc: doc.id,
                    buf: bufArrayBuffer,
                    width: width,
                    height: height,
                    bpc: bpc,
                    color_space: color_space.id,
                    encoder_hints: encoder_hints.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createFromMemory2 = function(doc, buf, encoder_hints) {
                "undefined" === typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length,
                    2, "createFromMemory2", "(PDFNet.SDFDoc, ArrayBuffer|TypedArray, PDFNet.Obj)", [[doc, "SDFDoc"], [buf, "ArrayBuffer"], [encoder_hints, "Object", PDFNet.Obj, "Obj"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("imageCreateFromMemory2", {
                    doc: doc.id,
                    buf: bufArrayBuffer,
                    encoder_hints: encoder_hints.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createFromStream = function(doc, image_data, width, height, bpc, color_space, encoder_hints) {
                "undefined" ===
                typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 6, "createFromStream", "(PDFNet.SDFDoc, PDFNet.FilterReader, number, number, number, PDFNet.ColorSpace, PDFNet.Obj)", [[doc, "SDFDoc"], [image_data, "Object", PDFNet.FilterReader, "FilterReader"], [width, "number"], [height, "number"], [bpc, "number"], [color_space, "Object", PDFNet.ColorSpace, "ColorSpace"], [encoder_hints, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("imageCreateFromStream", {
                    doc: doc.id,
                    image_data: image_data.id,
                    width: width,
                    height: height,
                    bpc: bpc,
                    color_space: color_space.id,
                    encoder_hints: encoder_hints.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createFromStream2 = function(doc, image_data, encoder_hints) {
                "undefined" === typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 2, "createFromStream2", "(PDFNet.SDFDoc, PDFNet.Filter, PDFNet.Obj)", [[doc, "SDFDoc"], [image_data, "Object", PDFNet.Filter, "Filter"], [encoder_hints,
                    "Object", PDFNet.Obj, "Obj"]]);
                0 != image_data.id && avoidCleanup(image_data.id);
                return PDFNet.messageHandler.sendWithPromise("imageCreateFromStream2", {
                    doc: doc.id,
                    no_own_image_data: image_data.id,
                    encoder_hints: encoder_hints.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createImageMask = function(doc, buf, width, height, encoder_hints) {
                "undefined" === typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 4, "createImageMask", "(PDFNet.SDFDoc, ArrayBuffer|TypedArray, number, number, PDFNet.Obj)",
                    [[doc, "SDFDoc"], [buf, "ArrayBuffer"], [width, "number"], [height, "number"], [encoder_hints, "Object", PDFNet.Obj, "Obj"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("imageCreateImageMask", {
                    doc: doc.id,
                    buf: bufArrayBuffer,
                    width: width,
                    height: height,
                    encoder_hints: encoder_hints.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createImageMaskFromStream = function(doc, image_data, width, height, encoder_hints) {
                "undefined" === typeof encoder_hints &&
                (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 4, "createImageMaskFromStream", "(PDFNet.SDFDoc, PDFNet.FilterReader, number, number, PDFNet.Obj)", [[doc, "SDFDoc"], [image_data, "Object", PDFNet.FilterReader, "FilterReader"], [width, "number"], [height, "number"], [encoder_hints, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("imageCreateImageMaskFromStream", {
                    doc: doc.id,
                    image_data: image_data.id,
                    width: width,
                    height: height,
                    encoder_hints: encoder_hints.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image,
                        id);
                });
            };
            PDFNet.Image.createSoftMask = function(doc, buf, width, height, bpc, encoder_hints) {
                "undefined" === typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 5, "createSoftMask", "(PDFNet.SDFDoc, ArrayBuffer|TypedArray, number, number, number, PDFNet.Obj)", [[doc, "SDFDoc"], [buf, "ArrayBuffer"], [width, "number"], [height, "number"], [bpc, "number"], [encoder_hints, "Object", PDFNet.Obj, "Obj"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("imageCreateSoftMask",
                    {
                        doc: doc.id,
                        buf: bufArrayBuffer,
                        width: width,
                        height: height,
                        bpc: bpc,
                        encoder_hints: encoder_hints.id,
                    }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createSoftMaskFromStream = function(doc, image_data, width, height, bpc, encoder_hints) {
                "undefined" === typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 5, "createSoftMaskFromStream", "(PDFNet.SDFDoc, PDFNet.FilterReader, number, number, number, PDFNet.Obj)", [[doc, "SDFDoc"], [image_data,
                    "Object", PDFNet.FilterReader, "FilterReader"], [width, "number"], [height, "number"], [bpc, "number"], [encoder_hints, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("imageCreateSoftMaskFromStream", {
                    doc: doc.id,
                    image_data: image_data.id,
                    width: width,
                    height: height,
                    bpc: bpc,
                    encoder_hints: encoder_hints.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createDirectFromMemory = function(doc, buf, width, height, bpc, color_space, input_format) {
                checkArguments(arguments.length,
                    7, "createDirectFromMemory", "(PDFNet.SDFDoc, ArrayBuffer|TypedArray, number, number, number, PDFNet.ColorSpace, number)", [[doc, "SDFDoc"], [buf, "ArrayBuffer"], [width, "number"], [height, "number"], [bpc, "number"], [color_space, "Object", PDFNet.ColorSpace, "ColorSpace"], [input_format, "number"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("imageCreateDirectFromMemory", {
                        doc: doc.id,
                        buf: bufArrayBuffer,
                        width: width,
                        height: height,
                        bpc: bpc,
                        color_space: color_space.id,
                        input_format: input_format,
                    },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createDirectFromStream = function(doc, image_data, width, height, bpc, color_space, input_format) {
                checkArguments(arguments.length, 7, "createDirectFromStream", "(PDFNet.SDFDoc, PDFNet.FilterReader, number, number, number, PDFNet.ColorSpace, number)", [[doc, "SDFDoc"], [image_data, "Object", PDFNet.FilterReader, "FilterReader"], [width, "number"], [height, "number"], [bpc, "number"], [color_space, "Object", PDFNet.ColorSpace, "ColorSpace"],
                    [input_format, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("imageCreateDirectFromStream", {
                    doc: doc.id,
                    image_data: image_data.id,
                    width: width,
                    height: height,
                    bpc: bpc,
                    color_space: color_space.id,
                    input_format: input_format,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.createFromObj = function(image_xobject) {
                "undefined" === typeof image_xobject && (image_xobject = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj)", [[image_xobject,
                    "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("imageCreateFromObj", { image_xobject: image_xobject.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.copy", { c: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Image, id);
                });
            };
            PDFNet.Image.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getSDFObj",
                    { img: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Image.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.isValid", { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.getImageData = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getImageData", { img: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Image.prototype.getImageDataSize = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getImageDataSize",
                    { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.getImageColorSpace = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getImageColorSpace", { img: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.Image.prototype.getImageWidth = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getImageWidth", { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.getImageHeight = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getImageHeight",
                    { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.getDecodeArray = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getDecodeArray", { img: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Image.prototype.getBitsPerComponent = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getBitsPerComponent", { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.getComponentNum = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getComponentNum",
                    { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.isImageMask = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.isImageMask", { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.isImageInterpolate = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.isImageInterpolate", { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.getMask = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getMask", { img: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.Image.prototype.setMask = function(image_mask) {
                checkArguments(arguments.length, 1, "setMask", "(PDFNet.Image)", [[image_mask, "Object", PDFNet.Image, "Image"]]);
                return PDFNet.messageHandler.sendWithPromise("Image.setMask", {
                    img: this.id,
                    image_mask: image_mask.id,
                }, this.userPriority);
            };
            PDFNet.Image.prototype.setMaskWithObj = function(mask) {
                checkArguments(arguments.length, 1, "setMaskWithObj", "(PDFNet.Obj)", [[mask, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("Image.setMaskWithObj",
                    { img: this.id, mask: mask.id }, this.userPriority);
            };
            PDFNet.Image.prototype.getSoftMask = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getSoftMask", { img: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Image.prototype.setSoftMask = function(soft_mask) {
                checkArguments(arguments.length, 1, "setSoftMask", "(PDFNet.Image)", [[soft_mask, "Object", PDFNet.Image, "Image"]]);
                return PDFNet.messageHandler.sendWithPromise("Image.setSoftMask", {
                        img: this.id,
                        soft_mask: soft_mask.id,
                    },
                    this.userPriority);
            };
            PDFNet.Image.prototype.getImageRenderingIntent = function() {
                return PDFNet.messageHandler.sendWithPromise("Image.getImageRenderingIntent", { img: this.id }, this.userPriority);
            };
            PDFNet.Image.prototype.exportFromStream = function(writer) {
                checkArguments(arguments.length, 1, "exportFromStream", "(PDFNet.FilterWriter)", [[writer, "Object", PDFNet.FilterWriter, "FilterWriter"]]);
                return PDFNet.messageHandler.sendWithPromise("Image.exportFromStream", {
                    img: this.id,
                    writer: writer.id,
                }, this.userPriority);
            };
            PDFNet.Image.prototype.exportAsTiffFromStream =
                function(writer) {
                    checkArguments(arguments.length, 1, "exportAsTiffFromStream", "(PDFNet.FilterWriter)", [[writer, "Object", PDFNet.FilterWriter, "FilterWriter"]]);
                    return PDFNet.messageHandler.sendWithPromise("Image.exportAsTiffFromStream", {
                        img: this.id,
                        writer: writer.id,
                    }, this.userPriority);
                };
            PDFNet.Image.prototype.exportAsPngFromStream = function(writer) {
                checkArguments(arguments.length, 1, "exportAsPngFromStream", "(PDFNet.FilterWriter)", [[writer, "Object", PDFNet.FilterWriter, "FilterWriter"]]);
                return PDFNet.messageHandler.sendWithPromise("Image.exportAsPngFromStream",
                    { img: this.id, writer: writer.id }, this.userPriority);
            };
            PDFNet.PageLabel.create = function(doc, style, prefix, start_at) {
                "undefined" === typeof prefix && (prefix = "");
                "undefined" === typeof start_at && (start_at = 1);
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, number, string, number)", [[doc, "SDFDoc"], [style, "number"], [prefix, "string"], [start_at, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageLabelCreate", {
                    doc: doc.id,
                    style: style,
                    prefix: prefix,
                    start_at: start_at,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.PageLabel(id);
                });
            };
            PDFNet.PageLabel.createFromObj = function(l, first_page, last_page) {
                "undefined" === typeof l && (l = new PDFNet.Obj("0"));
                "undefined" === typeof first_page && (first_page = -1);
                "undefined" === typeof last_page && (last_page = -1);
                checkArguments(arguments.length, 0, "createFromObj", "(PDFNet.Obj, number, number)", [[l, "Object", PDFNet.Obj, "Obj"], [first_page, "number"], [last_page, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageLabelCreateFromObj", {
                    l: l.id,
                    first_page: first_page,
                    last_page: last_page,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.PageLabel(id);
                });
            };
            PDFNet.PageLabel.prototype.compare = function(d) {
                checkArguments(arguments.length, 1, "compare", "(PDFNet.PageLabel)", [[d, "Structure", PDFNet.PageLabel, "PageLabel"]]);
                checkThisYieldFunction("compare", this.yieldFunction);
                checkParamsYieldFunction("compare", [[d, 0]]);
                var me = this;
                this.yieldFunction = "PageLabel.compare";
                return PDFNet.messageHandler.sendWithPromise("PageLabel.compare", {
                    l: this,
                    d: d,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.l, me);
                    return id.result;
                });
            };
            PDFNet.PageLabel.prototype.isValid =
                function() {
                    checkThisYieldFunction("isValid", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("PageLabel.isValid", { l: this }, this.userPriority);
                };
            PDFNet.PageLabel.prototype.getLabelTitle = function(page_num) {
                checkArguments(arguments.length, 1, "getLabelTitle", "(number)", [[page_num, "number"]]);
                checkThisYieldFunction("getLabelTitle", this.yieldFunction);
                var me = this;
                this.yieldFunction = "PageLabel.getLabelTitle";
                return PDFNet.messageHandler.sendWithPromise("PageLabel.getLabelTitle", { l: this, page_num: page_num },
                    this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.l, me);
                    return id.result;
                });
            };
            PDFNet.PageLabel.prototype.setStyle = function(style) {
                checkArguments(arguments.length, 1, "setStyle", "(number)", [[style, "number"]]);
                checkThisYieldFunction("setStyle", this.yieldFunction);
                var me = this;
                this.yieldFunction = "PageLabel.setStyle";
                return PDFNet.messageHandler.sendWithPromise("PageLabel.setStyle", {
                    l: this,
                    style: style,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.PageLabel.prototype.getStyle =
                function() {
                    checkThisYieldFunction("getStyle", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("PageLabel.getStyle", { l: this }, this.userPriority);
                };
            PDFNet.PageLabel.prototype.getPrefix = function() {
                checkThisYieldFunction("getPrefix", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("PageLabel.getPrefix", { l: this }, this.userPriority);
            };
            PDFNet.PageLabel.prototype.setPrefix = function(prefix) {
                checkArguments(arguments.length, 1, "setPrefix", "(string)", [[prefix, "string"]]);
                checkThisYieldFunction("setPrefix",
                    this.yieldFunction);
                var me = this;
                this.yieldFunction = "PageLabel.setPrefix";
                return PDFNet.messageHandler.sendWithPromise("PageLabel.setPrefix", {
                    l: this,
                    prefix: prefix,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.PageLabel.prototype.getStart = function() {
                checkThisYieldFunction("getStart", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("PageLabel.getStart", { l: this }, this.userPriority);
            };
            PDFNet.PageLabel.prototype.setStart = function(start_at) {
                checkArguments(arguments.length,
                    1, "setStart", "(number)", [[start_at, "number"]]);
                checkThisYieldFunction("setStart", this.yieldFunction);
                var me = this;
                this.yieldFunction = "PageLabel.setStart";
                return PDFNet.messageHandler.sendWithPromise("PageLabel.setStart", {
                    l: this,
                    start_at: start_at,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.PageLabel.prototype.getFirstPageNum = function() {
                checkThisYieldFunction("getFirstPageNum", this.yieldFunction);
                var me = this;
                this.yieldFunction = "PageLabel.getFirstPageNum";
                return PDFNet.messageHandler.sendWithPromise("PageLabel.getFirstPageNum",
                    { l: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.l, me);
                    return id.result;
                });
            };
            PDFNet.PageLabel.prototype.getLastPageNum = function() {
                checkThisYieldFunction("getLastPageNum", this.yieldFunction);
                var me = this;
                this.yieldFunction = "PageLabel.getLastPageNum";
                return PDFNet.messageHandler.sendWithPromise("PageLabel.getLastPageNum", { l: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.l, me);
                    return id.result;
                });
            };
            PDFNet.PageLabel.prototype.getSDFObj = function() {
                checkThisYieldFunction("getSDFObj",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("PageLabel.getSDFObj", { l: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PageSet.create = function() {
                return PDFNet.messageHandler.sendWithPromise("pageSetCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PageSet, id);
                });
            };
            PDFNet.PageSet.createSinglePage = function(one_page) {
                checkArguments(arguments.length, 1, "createSinglePage", "(number)", [[one_page, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageSetCreateSinglePage",
                    { one_page: one_page }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PageSet, id);
                });
            };
            PDFNet.PageSet.createRange = function(range_start, range_end) {
                checkArguments(arguments.length, 2, "createRange", "(number, number)", [[range_start, "number"], [range_end, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pageSetCreateRange", {
                    range_start: range_start,
                    range_end: range_end,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PageSet, id);
                });
            };
            PDFNet.PageSet.createFilteredRange =
                function(range_start, range_end, filter) {
                    "undefined" === typeof filter && (filter = PDFNet.PageSet.Filter.e_all);
                    checkArguments(arguments.length, 2, "createFilteredRange", "(number, number, number)", [[range_start, "number"], [range_end, "number"], [filter, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("pageSetCreateFilteredRange", {
                        range_start: range_start,
                        range_end: range_end,
                        filter: filter,
                    }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.PageSet, id);
                    });
                };
            PDFNet.PageSet.prototype.addPage =
                function(one_page) {
                    checkArguments(arguments.length, 1, "addPage", "(number)", [[one_page, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("PageSet.addPage", {
                        page_set: this.id,
                        one_page: one_page,
                    }, this.userPriority);
                };
            PDFNet.PageSet.prototype.addRange = function(range_start, range_end, filter) {
                "undefined" === typeof filter && (filter = PDFNet.PageSet.Filter.e_all);
                checkArguments(arguments.length, 2, "addRange", "(number, number, number)", [[range_start, "number"], [range_end, "number"], [filter, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PageSet.addRange",
                    {
                        page_set: this.id,
                        range_start: range_start,
                        range_end: range_end,
                        filter: filter,
                    }, this.userPriority);
            };
            PDFNet.PatternColor.create = function(pattern) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)", [[pattern, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("patternColorCreate", { pattern: pattern.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PatternColor, id);
                });
            };
            PDFNet.PatternColor.getTypeFromObj = function(pattern) {
                checkArguments(arguments.length,
                    1, "getTypeFromObj", "(PDFNet.Obj)", [[pattern, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("patternColorGetTypeFromObj", { pattern: pattern.id }, this.userPriority);
            };
            PDFNet.PatternColor.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getType", { pc: this.id }, this.userPriority);
            };
            PDFNet.PatternColor.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getSDFObj", { pc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.PatternColor.prototype.getMatrix = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getMatrix", { pc: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.PatternColor.prototype.getShading = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getShading", { pc: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Shading, id);
                });
            };
            PDFNet.PatternColor.prototype.getTilingType = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getTilingType",
                    { pc: this.id }, this.userPriority);
            };
            PDFNet.PatternColor.prototype.getBBox = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getBBox", { pc: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.PatternColor.prototype.getXStep = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getXStep", { pc: this.id }, this.userPriority);
            };
            PDFNet.PatternColor.prototype.getYStep = function() {
                return PDFNet.messageHandler.sendWithPromise("PatternColor.getYStep",
                    { pc: this.id }, this.userPriority);
            };
            PDFNet.GeometryCollection.prototype.snapToNearest = function(x, y, mode) {
                checkArguments(arguments.length, 3, "snapToNearest", "(number, number, number)", [[x, "number"], [y, "number"], [mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GeometryCollection.snapToNearest", {
                    self: this.id,
                    x: x,
                    y: y,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.GeometryCollection.prototype.snapToNearestPixel = function(x, y, dpi, mode) {
                checkArguments(arguments.length, 4, "snapToNearestPixel", "(number, number, number, number)",
                    [[x, "number"], [y, "number"], [dpi, "number"], [mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("GeometryCollection.snapToNearestPixel", {
                    self: this.id,
                    x: x,
                    y: y,
                    dpi: dpi,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.ObjectIdentifier.createFromPredefined = function(in_oid_enum) {
                checkArguments(arguments.length, 1, "createFromPredefined", "(number)", [[in_oid_enum, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("objectIdentifierCreateFromPredefined", { in_oid_enum: in_oid_enum }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ObjectIdentifier,
                        id);
                });
            };
            PDFNet.ObjectIdentifier.createFromIntArray = function(in_list) {
                checkArguments(arguments.length, 1, "createFromIntArray", "(Array<number>)", [[in_list, "Array"]]);
                return PDFNet.messageHandler.sendWithPromise("objectIdentifierCreateFromIntArray", { in_list: in_list }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ObjectIdentifier, id);
                });
            };
            PDFNet.ObjectIdentifier.prototype.getRawValue = function() {
                return PDFNet.messageHandler.sendWithPromise("ObjectIdentifier.getRawValue", { self: this.id },
                    this.userPriority);
            };
            PDFNet.X501DistinguishedName.prototype.hasAttribute = function(in_oid) {
                checkArguments(arguments.length, 1, "hasAttribute", "(PDFNet.ObjectIdentifier)", [[in_oid, "Object", PDFNet.ObjectIdentifier, "ObjectIdentifier"]]);
                return PDFNet.messageHandler.sendWithPromise("X501DistinguishedName.hasAttribute", {
                    self: this.id,
                    in_oid: in_oid.id,
                }, this.userPriority);
            };
            PDFNet.X501DistinguishedName.prototype.getStringValuesForAttribute = function(obj) {
                checkArguments(arguments.length, 1, "getStringValuesForAttribute",
                    "(PDFNet.ObjectIdentifier)", [[obj, "Object", PDFNet.ObjectIdentifier, "ObjectIdentifier"]]);
                return PDFNet.messageHandler.sendWithPromise("X501DistinguishedName.getStringValuesForAttribute", {
                    self: this.id,
                    obj: obj.id,
                }, this.userPriority);
            };
            PDFNet.X501DistinguishedName.prototype.getAllAttributesAndValues = function() {
                return PDFNet.messageHandler.sendWithPromise("X501DistinguishedName.getAllAttributesAndValues", { self: this.id }, this.userPriority).then(function(idArray) {
                    for (var retArray = [], i = 0; i < idArray.length; ++i) {
                        var id =
                            idArray[i];
                        if ("0" === id) return null;
                        id = new PDFNet.X501AttributeTypeAndValue(id);
                        retArray.push(id);
                        createdObjects.push({ name: id.name, id: id.id });
                    }
                    return retArray;
                });
            };
            PDFNet.X509Certificate.prototype.getIssuerField = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getIssuerField", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.X501DistinguishedName, id);
                });
            };
            PDFNet.X509Certificate.prototype.getSubjectField = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getSubjectField",
                    { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.X501DistinguishedName, id);
                });
            };
            PDFNet.X509Certificate.prototype.getNotBeforeEpochTime = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getNotBeforeEpochTime", { self: this.id }, this.userPriority);
            };
            PDFNet.X509Certificate.prototype.getNotAfterEpochTime = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getNotAfterEpochTime", { self: this.id }, this.userPriority);
            };
            PDFNet.X509Certificate.prototype.getRawX509VersionNumber =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("X509Certificate.getRawX509VersionNumber", { self: this.id }, this.userPriority);
                };
            PDFNet.X509Certificate.prototype.toString = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.toString", { self: this.id }, this.userPriority);
            };
            PDFNet.X509Certificate.prototype.getFingerprint = function(in_digest_algorithm) {
                "undefined" === typeof in_digest_algorithm && (in_digest_algorithm = PDFNet.DigestAlgorithm.Type.e_SHA256);
                checkArguments(arguments.length,
                    0, "getFingerprint", "(number)", [[in_digest_algorithm, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getFingerprint", {
                    self: this.id,
                    in_digest_algorithm: in_digest_algorithm,
                }, this.userPriority);
            };
            PDFNet.X509Certificate.prototype.getSerialNumber = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getSerialNumber", { self: this.id }, this.userPriority).then(function(id) {
                    return new Uint8Array(id);
                });
            };
            PDFNet.X509Certificate.prototype.getExtensions = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getExtensions",
                    { self: this.id }, this.userPriority).then(function(idArray) {
                    for (var retArray = [], i = 0; i < idArray.length; ++i) {
                        var id = idArray[i];
                        if ("0" === id) return null;
                        id = new PDFNet.X509Extension(id);
                        retArray.push(id);
                        createdObjects.push({ name: id.name, id: id.id });
                    }
                    return retArray;
                });
            };
            PDFNet.X509Certificate.prototype.getData = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Certificate.getData", { self: this.id }, this.userPriority).then(function(id) {
                    return new Uint8Array(id);
                });
            };
            PDFNet.TimestampingConfiguration.createFromURL =
                function(in_url) {
                    checkArguments(arguments.length, 1, "createFromURL", "(string)", [[in_url, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("timestampingConfigurationCreateFromURL", { in_url: in_url }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.TimestampingConfiguration, id);
                    });
                };
            PDFNet.TimestampingConfiguration.prototype.setTimestampAuthorityServerURL = function(in_url) {
                checkArguments(arguments.length, 1, "setTimestampAuthorityServerURL", "(string)", [[in_url, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("TimestampingConfiguration.setTimestampAuthorityServerURL",
                    { self: this.id, in_url: in_url }, this.userPriority);
            };
            PDFNet.TimestampingConfiguration.prototype.setTimestampAuthorityServerUsername = function(in_username) {
                checkArguments(arguments.length, 1, "setTimestampAuthorityServerUsername", "(string)", [[in_username, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("TimestampingConfiguration.setTimestampAuthorityServerUsername", {
                    self: this.id,
                    in_username: in_username,
                }, this.userPriority);
            };
            PDFNet.TimestampingConfiguration.prototype.setTimestampAuthorityServerPassword =
                function(in_password) {
                    checkArguments(arguments.length, 1, "setTimestampAuthorityServerPassword", "(string)", [[in_password, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("TimestampingConfiguration.setTimestampAuthorityServerPassword", {
                        self: this.id,
                        in_password: in_password,
                    }, this.userPriority);
                };
            PDFNet.TimestampingConfiguration.prototype.setUseNonce = function(in_use_nonce) {
                checkArguments(arguments.length, 1, "setUseNonce", "(boolean)", [[in_use_nonce, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("TimestampingConfiguration.setUseNonce",
                    { self: this.id, in_use_nonce: in_use_nonce }, this.userPriority);
            };
            PDFNet.TimestampingConfiguration.prototype.testConfiguration = function(in_opts) {
                checkArguments(arguments.length, 1, "testConfiguration", "(PDFNet.VerificationOptions)", [[in_opts, "Object", PDFNet.VerificationOptions, "VerificationOptions"]]);
                return PDFNet.messageHandler.sendWithPromise("TimestampingConfiguration.testConfiguration", {
                    self: this.id,
                    in_opts: in_opts.id,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.TimestampingTestResult,
                        id);
                });
            };
            PDFNet.DigitalSignatureField.prototype.hasCryptographicSignature = function() {
                checkThisYieldFunction("hasCryptographicSignature", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.hasCryptographicSignature", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.getSubFilter = function() {
                checkThisYieldFunction("getSubFilter", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getSubFilter", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.getSignatureName = function() {
                checkThisYieldFunction("getSignatureName", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getSignatureName", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.getLocation = function() {
                checkThisYieldFunction("getLocation", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getLocation", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.getReason =
                function() {
                    checkThisYieldFunction("getReason", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getReason", { self: this }, this.userPriority);
                };
            PDFNet.DigitalSignatureField.prototype.getContactInfo = function() {
                checkThisYieldFunction("getContactInfo", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getContactInfo", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.getCertCount = function() {
                checkThisYieldFunction("getCertCount",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getCertCount", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.hasVisibleAppearance = function() {
                checkThisYieldFunction("hasVisibleAppearance", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.hasVisibleAppearance", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.setContactInfo = function(in_contact_info) {
                checkArguments(arguments.length,
                    1, "setContactInfo", "(string)", [[in_contact_info, "string"]]);
                checkThisYieldFunction("setContactInfo", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.setContactInfo";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.setContactInfo", {
                    self: this,
                    in_contact_info: in_contact_info,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.setLocation = function(in_location) {
                checkArguments(arguments.length,
                    1, "setLocation", "(string)", [[in_location, "string"]]);
                checkThisYieldFunction("setLocation", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.setLocation";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.setLocation", {
                    self: this,
                    in_location: in_location,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.setReason = function(in_reason) {
                checkArguments(arguments.length, 1, "setReason", "(string)", [[in_reason,
                    "string"]]);
                checkThisYieldFunction("setReason", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.setReason";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.setReason", {
                    self: this,
                    in_reason: in_reason,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.setDocumentPermissions = function(in_perms) {
                checkArguments(arguments.length, 1, "setDocumentPermissions", "(number)", [[in_perms, "number"]]);
                checkThisYieldFunction("setDocumentPermissions",
                    this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.setDocumentPermissions";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.setDocumentPermissions", {
                    self: this,
                    in_perms: in_perms,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.signOnNextSave = function(in_pkcs12_keyfile_path, in_password) {
                checkArguments(arguments.length, 2, "signOnNextSave", "(string, string)", [[in_pkcs12_keyfile_path, "string"],
                    [in_password, "string"]]);
                checkThisYieldFunction("signOnNextSave", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.signOnNextSave";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.signOnNextSave", {
                    self: this,
                    in_pkcs12_keyfile_path: in_pkcs12_keyfile_path,
                    in_password: in_password,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.certifyOnNextSave = function(in_pkcs12_keyfile_path, in_password) {
                checkArguments(arguments.length,
                    2, "certifyOnNextSave", "(string, string)", [[in_pkcs12_keyfile_path, "string"], [in_password, "string"]]);
                checkThisYieldFunction("certifyOnNextSave", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.certifyOnNextSave";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.certifyOnNextSave", {
                    self: this,
                    in_pkcs12_keyfile_path: in_pkcs12_keyfile_path,
                    in_password: in_password,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.isLockedByDigitalSignature =
                function() {
                    checkThisYieldFunction("isLockedByDigitalSignature", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.isLockedByDigitalSignature", { self: this }, this.userPriority);
                };
            PDFNet.DigitalSignatureField.prototype.getDocumentPermissions = function() {
                checkThisYieldFunction("getDocumentPermissions", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getDocumentPermissions", { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.clearSignature =
                function() {
                    checkThisYieldFunction("clearSignature", this.yieldFunction);
                    var me = this;
                    this.yieldFunction = "DigitalSignatureField.clearSignature";
                    return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.clearSignature", { self: this }, this.userPriority).then(function(id) {
                        me.yieldFunction = void 0;
                        copyFunc(id, me);
                    });
                };
            PDFNet.DigitalSignatureField.createFromField = function(d) {
                checkArguments(arguments.length, 1, "createFromField", "(PDFNet.Field)", [[d, "Structure", PDFNet.Field, "Field"]]);
                checkParamsYieldFunction("createFromField",
                    [[d, 0]]);
                return PDFNet.messageHandler.sendWithPromise("digitalSignatureFieldCreateFromField", { d: d }, this.userPriority).then(function(id) {
                    return new PDFNet.DigitalSignatureField(id);
                });
            };
            PDFNet.DigitalSignatureField.prototype.getSigningTime = function() {
                checkThisYieldFunction("getSigningTime", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getSigningTime", { self: this }, this.userPriority).then(function(id) {
                    return new PDFNet.Date(id);
                });
            };
            PDFNet.DigitalSignatureField.prototype.getCert =
                function(in_index) {
                    checkArguments(arguments.length, 1, "getCert", "(number)", [[in_index, "number"]]);
                    checkThisYieldFunction("getCert", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getCert", {
                        self: this,
                        in_index: in_index,
                    }, this.userPriority).then(function(id) {
                        return new Uint8Array(id);
                    });
                };
            PDFNet.DigitalSignatureField.prototype.setFieldPermissions = function(in_action, in_field_names_list) {
                "undefined" === typeof in_field_names_list && (in_field_names_list = []);
                checkArguments(arguments.length,
                    1, "setFieldPermissions", "(number, Array<string>)", [[in_action, "number"], [in_field_names_list, "Array"]]);
                checkThisYieldFunction("setFieldPermissions", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.setFieldPermissions";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.setFieldPermissions", {
                    self: this,
                    in_action: in_action,
                    in_field_names_list: in_field_names_list,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.signOnNextSaveFromBuffer =
                function(in_pkcs12_buffer, in_password) {
                    checkArguments(arguments.length, 2, "signOnNextSaveFromBuffer", "(ArrayBuffer|TypedArray, string)", [[in_pkcs12_buffer, "ArrayBuffer"], [in_password, "string"]]);
                    checkThisYieldFunction("signOnNextSaveFromBuffer", this.yieldFunction);
                    var me = this;
                    this.yieldFunction = "DigitalSignatureField.signOnNextSaveFromBuffer";
                    var in_pkcs12_bufferArrayBuffer = getArrayBuffer(in_pkcs12_buffer, !1);
                    return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.signOnNextSaveFromBuffer",
                        {
                            self: this,
                            in_pkcs12_buffer: in_pkcs12_bufferArrayBuffer,
                            in_password: in_password,
                        }, this.userPriority).then(function(id) {
                        me.yieldFunction = void 0;
                        copyFunc(id, me);
                    });
                };
            PDFNet.DigitalSignatureField.prototype.signOnNextSaveWithCustomHandler = function(in_signature_handler_id) {
                checkArguments(arguments.length, 1, "signOnNextSaveWithCustomHandler", "(number)", [[in_signature_handler_id, "number"]]);
                checkThisYieldFunction("signOnNextSaveWithCustomHandler", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.signOnNextSaveWithCustomHandler";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.signOnNextSaveWithCustomHandler", {
                    self: this,
                    in_signature_handler_id: in_signature_handler_id,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.certifyOnNextSaveFromBuffer = function(in_pkcs12_buffer, in_password) {
                checkArguments(arguments.length, 2, "certifyOnNextSaveFromBuffer", "(ArrayBuffer|TypedArray, string)", [[in_pkcs12_buffer, "ArrayBuffer"], [in_password, "string"]]);
                checkThisYieldFunction("certifyOnNextSaveFromBuffer", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.certifyOnNextSaveFromBuffer";
                var in_pkcs12_bufferArrayBuffer = getArrayBuffer(in_pkcs12_buffer, !1);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.certifyOnNextSaveFromBuffer", {
                    self: this,
                    in_pkcs12_buffer: in_pkcs12_bufferArrayBuffer,
                    in_password: in_password,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.DigitalSignatureField.prototype.certifyOnNextSaveWithCustomHandler =
                function(in_signature_handler_id) {
                    checkArguments(arguments.length, 1, "certifyOnNextSaveWithCustomHandler", "(number)", [[in_signature_handler_id, "number"]]);
                    checkThisYieldFunction("certifyOnNextSaveWithCustomHandler", this.yieldFunction);
                    var me = this;
                    this.yieldFunction = "DigitalSignatureField.certifyOnNextSaveWithCustomHandler";
                    return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.certifyOnNextSaveWithCustomHandler", {
                        self: this,
                        in_signature_handler_id: in_signature_handler_id,
                    }, this.userPriority).then(function(id) {
                        me.yieldFunction =
                            void 0;
                        copyFunc(id, me);
                    });
                };
            PDFNet.DigitalSignatureField.prototype.getSDFObj = function() {
                checkThisYieldFunction("getSDFObj", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getSDFObj", { self: this }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.DigitalSignatureField.prototype.getLockedFields = function() {
                checkThisYieldFunction("getLockedFields", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getLockedFields",
                    { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.verify = function(in_opts) {
                checkArguments(arguments.length, 1, "verify", "(PDFNet.VerificationOptions)", [[in_opts, "Object", PDFNet.VerificationOptions, "VerificationOptions"]]);
                checkThisYieldFunction("verify", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.verify", {
                    self: this,
                    in_opts: in_opts.id,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.VerificationResult, id);
                });
            };
            PDFNet.DigitalSignatureField.prototype.isCertification =
                function() {
                    checkThisYieldFunction("isCertification", this.yieldFunction);
                    return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.isCertification", { self: this }, this.userPriority);
                };
            PDFNet.DigitalSignatureField.prototype.getSignerCertFromCMS = function() {
                checkThisYieldFunction("getSignerCertFromCMS", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getSignerCertFromCMS", { self: this }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.X509Certificate,
                        id);
                });
            };
            PDFNet.DigitalSignatureField.prototype.getByteRanges = function() {
                checkThisYieldFunction("getByteRanges", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getByteRanges", { self: this }, this.userPriority).then(function(idArray) {
                    for (var retArray = [], i = 0; i < idArray.length; ++i) {
                        var id = idArray[i];
                        if ("0" === id) return null;
                        id = new PDFNet.ByteRange(id);
                        retArray.push(id);
                    }
                    return retArray;
                });
            };
            PDFNet.DigitalSignatureField.prototype.getCertPathsFromCMS = function(index) {
                checkArguments(arguments.length,
                    1, "getCertPathsFromCMS", "(number)", [[index, "number"]]);
                checkThisYieldFunction("getCertPathsFromCMS", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getCertPathsFromCMS", {
                    self: this,
                    index: index,
                }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.getCertPathsFromCMSGetOutterVecSize = function() {
                checkThisYieldFunction("getCertPathsFromCMSGetOutterVecSize", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.getCertPathsFromCMSGetOutterVecSize",
                    { self: this }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.enableLTVOfflineVerification = function(in_veri_res) {
                checkArguments(arguments.length, 1, "enableLTVOfflineVerification", "(PDFNet.VerificationResult)", [[in_veri_res, "Object", PDFNet.VerificationResult, "VerificationResult"]]);
                checkThisYieldFunction("enableLTVOfflineVerification", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.enableLTVOfflineVerification", {
                        self: this,
                        in_veri_res: in_veri_res.id,
                    },
                    this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.timestampOnNextSave = function(in_timestamping_config, in_timestamp_response_verification_options) {
                checkArguments(arguments.length, 2, "timestampOnNextSave", "(PDFNet.TimestampingConfiguration, PDFNet.VerificationOptions)", [[in_timestamping_config, "Object", PDFNet.TimestampingConfiguration, "TimestampingConfiguration"], [in_timestamp_response_verification_options, "Object", PDFNet.VerificationOptions, "VerificationOptions"]]);
                checkThisYieldFunction("timestampOnNextSave",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.timestampOnNextSave", {
                    self: this,
                    in_timestamping_config: in_timestamping_config.id,
                    in_timestamp_response_verification_options: in_timestamp_response_verification_options.id,
                }, this.userPriority);
            };
            PDFNet.DigitalSignatureField.prototype.useSubFilter = function(in_subfilter_type, in_make_mandatory) {
                "undefined" === typeof in_make_mandatory && (in_make_mandatory = !0);
                checkArguments(arguments.length, 1, "useSubFilter", "(number, boolean)",
                    [[in_subfilter_type, "number"], [in_make_mandatory, "boolean"]]);
                checkThisYieldFunction("useSubFilter", this.yieldFunction);
                var me = this;
                this.yieldFunction = "DigitalSignatureField.useSubFilter";
                return PDFNet.messageHandler.sendWithPromise("DigitalSignatureField.useSubFilter", {
                    self: this,
                    in_subfilter_type: in_subfilter_type,
                    in_make_mandatory: in_make_mandatory,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.PDFDoc.prototype.getTriggerAction = function(trigger) {
                checkArguments(arguments.length,
                    1, "getTriggerAction", "(number)", [[trigger, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getTriggerAction", {
                    doc: this.id,
                    trigger: trigger,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.create = function() {
                return PDFNet.messageHandler.sendWithPromise("pdfDocCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PDFDoc, id);
                });
            };
            PDFNet.PDFDoc.createFromFilter = function(stream) {
                checkArguments(arguments.length, 1, "createFromFilter",
                    "(PDFNet.Filter)", [[stream, "Object", PDFNet.Filter, "Filter"]]);
                0 != stream.id && avoidCleanup(stream.id);
                return PDFNet.messageHandler.sendWithPromise("pdfDocCreateFromFilter", { no_own_stream: stream.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PDFDoc, id);
                });
            };
            PDFNet.PDFDoc.createFromBuffer = function(buf) {
                checkArguments(arguments.length, 1, "createFromBuffer", "(ArrayBuffer|TypedArray)", [[buf, "ArrayBuffer"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("pdfDocCreateFromBuffer",
                    { buf: bufArrayBuffer }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PDFDoc, id);
                });
            };
            PDFNet.PDFDoc.createFromLayoutEls = function(buf) {
                checkArguments(arguments.length, 1, "createFromLayoutEls", "(ArrayBuffer|TypedArray)", [[buf, "ArrayBuffer"]]);
                var bufArrayBuffer = getArrayBuffer(buf, !1);
                return PDFNet.messageHandler.sendWithPromise("pdfDocCreateFromLayoutEls", { buf: bufArrayBuffer }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PDFDoc, id);
                });
            };
            PDFNet.PDFDoc.prototype.createShallowCopy =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.createShallowCopy", { source: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.PDFDoc, id);
                    });
                };
            PDFNet.PDFDoc.prototype.isEncrypted = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.isEncrypted", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.initStdSecurityHandler = function(password, password_sz) {
                checkArguments(arguments.length, 2, "initStdSecurityHandler", "(string, number)", [[password, "string"],
                    [password_sz, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.initStdSecurityHandler", {
                    doc: this.id,
                    password: password,
                    password_sz: password_sz,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.initStdSecurityHandlerUString = function(password) {
                checkArguments(arguments.length, 1, "initStdSecurityHandlerUString", "(string)", [[password, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.initStdSecurityHandlerUString", {
                    doc: this.id,
                    password: password,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.initStdSecurityHandlerBuffer =
                function(password_buf) {
                    checkArguments(arguments.length, 1, "initStdSecurityHandlerBuffer", "(ArrayBuffer|TypedArray)", [[password_buf, "ArrayBuffer"]]);
                    var password_bufArrayBuffer = getArrayBuffer(password_buf, !1);
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.initStdSecurityHandlerBuffer", {
                        doc: this.id,
                        password_buf: password_bufArrayBuffer,
                    }, this.userPriority);
                };
            PDFNet.PDFDoc.prototype.getSecurityHandler = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getSecurityHandler", { doc: this.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SecurityHandler, id);
                });
            };
            PDFNet.PDFDoc.prototype.setSecurityHandler = function(handler) {
                checkArguments(arguments.length, 1, "setSecurityHandler", "(PDFNet.SecurityHandler)", [[handler, "Object", PDFNet.SecurityHandler, "SecurityHandler"]]);
                0 != handler.id && avoidCleanup(handler.id);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.setSecurityHandler", {
                    doc: this.id,
                    no_own_handler: handler.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.removeSecurity =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.removeSecurity", { doc: this.id }, this.userPriority);
                };
            PDFNet.PDFDoc.prototype.getDocInfo = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getDocInfo", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PDFDocInfo, id);
                });
            };
            PDFNet.PDFDoc.prototype.getViewPrefs = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getViewPrefs", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PDFDocViewPrefs,
                        id);
                });
            };
            PDFNet.PDFDoc.prototype.isModified = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.isModified", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.hasRepairedXRef = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.hasRepairedXRef", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.isLinearized = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.isLinearized", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.saveMemoryBuffer = function(flags) {
                checkArguments(arguments.length,
                    1, "saveMemoryBuffer", "(number)", [[flags, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.saveMemoryBuffer", {
                    doc: this.id,
                    flags: flags,
                }, this.userPriority).then(function(id) {
                    return new Uint8Array(id);
                });
            };
            PDFNet.PDFDoc.prototype.saveStream = function(stream, flags) {
                checkArguments(arguments.length, 2, "saveStream", "(PDFNet.Filter, number)", [[stream, "Object", PDFNet.Filter, "Filter"], [flags, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.saveStream", {
                    doc: this.id, stream: stream.id,
                    flags: flags,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getPageIterator = function(page_number) {
                "undefined" === typeof page_number && (page_number = 1);
                checkArguments(arguments.length, 0, "getPageIterator", "(number)", [[page_number, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getPageIterator", {
                    doc: this.id,
                    page_number: page_number,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Iterator, id, "Page");
                });
            };
            PDFNet.PDFDoc.prototype.getPage = function(page_number) {
                checkArguments(arguments.length,
                    1, "getPage", "(number)", [[page_number, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getPage", {
                    doc: this.id,
                    page_number: page_number,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Page, id);
                });
            };
            PDFNet.PDFDoc.prototype.pageRemove = function(page_itr) {
                checkArguments(arguments.length, 1, "pageRemove", "(PDFNet.Iterator)", [[page_itr, "Object", PDFNet.Iterator, "Iterator"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.pageRemove", {
                    doc: this.id,
                    page_itr: page_itr.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.pageInsert = function(where, page) {
                checkArguments(arguments.length, 2, "pageInsert", "(PDFNet.Iterator, PDFNet.Page)", [[where, "Object", PDFNet.Iterator, "Iterator"], [page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.pageInsert", {
                    doc: this.id,
                    where: where.id,
                    page: page.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.insertPages = function(insert_before_page_number, src_doc, start_page, end_page, flag) {
                checkArguments(arguments.length, 5, "insertPages", "(number, PDFNet.PDFDoc, number, number, number)",
                    [[insert_before_page_number, "number"], [src_doc, "PDFDoc"], [start_page, "number"], [end_page, "number"], [flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.insertPages", {
                    dest_doc: this.id,
                    insert_before_page_number: insert_before_page_number,
                    src_doc: src_doc.id,
                    start_page: start_page,
                    end_page: end_page,
                    flag: flag,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.insertPageSet = function(insert_before_page_number, src_doc, source_page_set, flag) {
                checkArguments(arguments.length, 4, "insertPageSet", "(number, PDFNet.PDFDoc, PDFNet.PageSet, number)",
                    [[insert_before_page_number, "number"], [src_doc, "PDFDoc"], [source_page_set, "Object", PDFNet.PageSet, "PageSet"], [flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.insertPageSet", {
                    dest_doc: this.id,
                    insert_before_page_number: insert_before_page_number,
                    src_doc: src_doc.id,
                    source_page_set: source_page_set.id,
                    flag: flag,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.movePages = function(move_before_page_number, src_doc, start_page, end_page, flag) {
                checkArguments(arguments.length, 5, "movePages", "(number, PDFNet.PDFDoc, number, number, number)",
                    [[move_before_page_number, "number"], [src_doc, "PDFDoc"], [start_page, "number"], [end_page, "number"], [flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.movePages", {
                    dest_doc: this.id,
                    move_before_page_number: move_before_page_number,
                    src_doc: src_doc.id,
                    start_page: start_page,
                    end_page: end_page,
                    flag: flag,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.movePageSet = function(move_before_page_number, src_doc, source_page_set, flag) {
                checkArguments(arguments.length, 4, "movePageSet", "(number, PDFNet.PDFDoc, PDFNet.PageSet, number)",
                    [[move_before_page_number, "number"], [src_doc, "PDFDoc"], [source_page_set, "Object", PDFNet.PageSet, "PageSet"], [flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.movePageSet", {
                    dest_doc: this.id,
                    move_before_page_number: move_before_page_number,
                    src_doc: src_doc.id,
                    source_page_set: source_page_set.id,
                    flag: flag,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.pagePushFront = function(page) {
                checkArguments(arguments.length, 1, "pagePushFront", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.pagePushFront",
                    { doc: this.id, page: page.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.pagePushBack = function(page) {
                checkArguments(arguments.length, 1, "pagePushBack", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.pagePushBack", {
                    doc: this.id,
                    page: page.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.pageCreate = function(media_box) {
                "undefined" === typeof media_box && (media_box = new PDFNet.Rect(0, 0, 612, 792));
                checkArguments(arguments.length, 0, "pageCreate", "(PDFNet.Rect)",
                    [[media_box, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("pageCreate", [[media_box, 0]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.pageCreate", {
                    doc: this.id,
                    media_box: media_box,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Page, id);
                });
            };
            PDFNet.PDFDoc.prototype.getFirstBookmark = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getFirstBookmark", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Bookmark, id);
                });
            };
            PDFNet.PDFDoc.prototype.addRootBookmark =
                function(root_bookmark) {
                    checkArguments(arguments.length, 1, "addRootBookmark", "(PDFNet.Bookmark)", [[root_bookmark, "Object", PDFNet.Bookmark, "Bookmark"]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.addRootBookmark", {
                        doc: this.id,
                        root_bookmark: root_bookmark.id,
                    }, this.userPriority);
                };
            PDFNet.PDFDoc.prototype.getTrailer = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getTrailer", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.getRoot =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.getRoot", { doc: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.PDFDoc.prototype.jsContextInitialize = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.jsContextInitialize", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getPages = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getPages", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.PDFDoc.prototype.getPageCount = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getPageCount", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getDownloadedByteCount = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getDownloadedByteCount", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getTotalRemoteByteCount = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getTotalRemoteByteCount", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getFieldIteratorBegin =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.getFieldIteratorBegin", { doc: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.Iterator, id, "Field");
                    });
                };
            PDFNet.PDFDoc.prototype.getFieldIterator = function(field_name) {
                checkArguments(arguments.length, 1, "getFieldIterator", "(string)", [[field_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getFieldIterator", {
                    doc: this.id,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Iterator,
                        id, "Field");
                });
            };
            PDFNet.PDFDoc.prototype.getField = function(field_name) {
                checkArguments(arguments.length, 1, "getField", "(string)", [[field_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getField", {
                    doc: this.id,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.Field(id);
                });
            };
            PDFNet.PDFDoc.prototype.fieldCreate = function(field_name, type, field_value, def_field_value) {
                "undefined" === typeof field_value && (field_value = new PDFNet.Obj("0"));
                "undefined" === typeof def_field_value &&
                (def_field_value = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 2, "fieldCreate", "(string, number, PDFNet.Obj, PDFNet.Obj)", [[field_name, "string"], [type, "number"], [field_value, "Object", PDFNet.Obj, "Obj"], [def_field_value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.fieldCreate", {
                    doc: this.id,
                    field_name: field_name,
                    type: type,
                    field_value: field_value.id,
                    def_field_value: def_field_value.id,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.Field(id);
                });
            };
            PDFNet.PDFDoc.prototype.fieldCreateFromStrings =
                function(field_name, type, field_value, def_field_value) {
                    "undefined" === typeof def_field_value && (def_field_value = "");
                    checkArguments(arguments.length, 3, "fieldCreateFromStrings", "(string, number, string, string)", [[field_name, "string"], [type, "number"], [field_value, "string"], [def_field_value, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.fieldCreateFromStrings", {
                        doc: this.id,
                        field_name: field_name,
                        type: type,
                        field_value: field_value,
                        def_field_value: def_field_value,
                    }, this.userPriority).then(function(id) {
                        return new PDFNet.Field(id);
                    });
                };
            PDFNet.PDFDoc.prototype.refreshFieldAppearances = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.refreshFieldAppearances", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.refreshAnnotAppearances = function(options) {
                "undefined" === typeof options && (options = null);
                checkArguments(arguments.length, 0, "refreshAnnotAppearances", "(PDFNet.OptionBase)", [[options, "OptionBase"]]);
                checkParamsYieldFunction("refreshAnnotAppearances", [[options, 0]]);
                options = options ? options.getJsonString() : "{}";
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.refreshAnnotAppearances", {
                    doc: this.id,
                    options: options,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.flattenAnnotations = function(forms_only) {
                "undefined" === typeof forms_only && (forms_only = !1);
                checkArguments(arguments.length, 0, "flattenAnnotations", "(boolean)", [[forms_only, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.flattenAnnotations", {
                    doc: this.id,
                    forms_only: forms_only,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.flattenAnnotationsAdvanced =
                function(flags) {
                    checkArguments(arguments.length, 1, "flattenAnnotationsAdvanced", "(number)", [[flags, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.flattenAnnotationsAdvanced", {
                        doc: this.id,
                        flags: flags,
                    }, this.userPriority);
                };
            PDFNet.PDFDoc.prototype.getAcroForm = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getAcroForm", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.fdfExtract = function(flag) {
                "undefined" ===
                typeof flag && (flag = PDFNet.PDFDoc.ExtractFlag.e_forms_only);
                checkArguments(arguments.length, 0, "fdfExtract", "(number)", [[flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.fdfExtract", {
                    doc: this.id,
                    flag: flag,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.FDFDoc, id);
                });
            };
            PDFNet.PDFDoc.prototype.fdfExtractPageSet = function(pages_to_extract, flag) {
                "undefined" === typeof flag && (flag = PDFNet.PDFDoc.ExtractFlag.e_forms_only);
                checkArguments(arguments.length, 1, "fdfExtractPageSet",
                    "(PDFNet.PageSet, number)", [[pages_to_extract, "Object", PDFNet.PageSet, "PageSet"], [flag, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.fdfExtractPageSet", {
                    doc: this.id,
                    pages_to_extract: pages_to_extract.id,
                    flag: flag,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.FDFDoc, id);
                });
            };
            PDFNet.PDFDoc.prototype.fdfMerge = function(fdf_doc) {
                checkArguments(arguments.length, 1, "fdfMerge", "(PDFNet.FDFDoc)", [[fdf_doc, "FDFDoc"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.fdfMerge",
                    { doc: this.id, fdf_doc: fdf_doc.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.fdfUpdate = function(fdf_doc) {
                checkArguments(arguments.length, 1, "fdfUpdate", "(PDFNet.FDFDoc)", [[fdf_doc, "FDFDoc"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.fdfUpdate", {
                    doc: this.id,
                    fdf_doc: fdf_doc.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getOpenAction = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getOpenAction", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action,
                        id);
                });
            };
            PDFNet.PDFDoc.prototype.setOpenAction = function(action) {
                checkArguments(arguments.length, 1, "setOpenAction", "(PDFNet.Action)", [[action, "Object", PDFNet.Action, "Action"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.setOpenAction", {
                    doc: this.id,
                    action: action.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.addFileAttachment = function(file_key, embedded_file) {
                checkArguments(arguments.length, 2, "addFileAttachment", "(string, PDFNet.FileSpec)", [[file_key, "string"], [embedded_file, "Object", PDFNet.FileSpec,
                    "FileSpec"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.addFileAttachment", {
                    doc: this.id,
                    file_key: file_key,
                    embedded_file: embedded_file.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getPageLabel = function(page_num) {
                checkArguments(arguments.length, 1, "getPageLabel", "(number)", [[page_num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getPageLabel", {
                    doc: this.id,
                    page_num: page_num,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.PageLabel(id);
                });
            };
            PDFNet.PDFDoc.prototype.setPageLabel =
                function(page_num, label) {
                    checkArguments(arguments.length, 2, "setPageLabel", "(number, PDFNet.PageLabel)", [[page_num, "number"], [label, "Structure", PDFNet.PageLabel, "PageLabel"]]);
                    checkParamsYieldFunction("setPageLabel", [[label, 1]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.setPageLabel", {
                        doc: this.id,
                        page_num: page_num,
                        label: label,
                    }, this.userPriority);
                };
            PDFNet.PDFDoc.prototype.removePageLabel = function(page_num) {
                checkArguments(arguments.length, 1, "removePageLabel", "(number)", [[page_num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.removePageLabel", {
                    doc: this.id,
                    page_num: page_num,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getStructTree = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getStructTree", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.STree, id);
                });
            };
            PDFNet.PDFDoc.prototype.hasOC = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.hasOC", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getOCGs = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getOCGs",
                    { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.getOCGConfig = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getOCGConfig", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.OCGConfig, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectName = function(name) {
                checkArguments(arguments.length, 1, "createIndirectName", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectName",
                    { doc: this.id, name: name }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectArray = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectArray", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectBool = function(value) {
                checkArguments(arguments.length, 1, "createIndirectBool", "(boolean)", [[value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectBool",
                    { doc: this.id, value: value }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectDict = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectDict", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectNull = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectNull", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectNumber = function(value) {
                checkArguments(arguments.length, 1, "createIndirectNumber", "(number)", [[value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectNumber", {
                    doc: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectString = function(value, buf_size) {
                checkArguments(arguments.length, 2, "createIndirectString", "(number, number)", [[value, "number"], [buf_size,
                    "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectString", {
                    doc: this.id,
                    value: value,
                    buf_size: buf_size,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectStringFromUString = function(str) {
                checkArguments(arguments.length, 1, "createIndirectStringFromUString", "(string)", [[str, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectStringFromUString", {
                    doc: this.id,
                    str: str,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectStreamFromFilter = function(data, filter_chain) {
                "undefined" === typeof filter_chain && (filter_chain = new PDFNet.Filter("0"));
                checkArguments(arguments.length, 1, "createIndirectStreamFromFilter", "(PDFNet.FilterReader, PDFNet.Filter)", [[data, "Object", PDFNet.FilterReader, "FilterReader"], [filter_chain, "Object", PDFNet.Filter, "Filter"]]);
                0 != filter_chain.id && avoidCleanup(filter_chain.id);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectStreamFromFilter",
                    {
                        doc: this.id,
                        data: data.id,
                        no_own_filter_chain: filter_chain.id,
                    }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.createIndirectStream = function(data, data_size, filter_chain) {
                "undefined" === typeof filter_chain && (filter_chain = new PDFNet.Filter("0"));
                checkArguments(arguments.length, 2, "createIndirectStream", "(string, number, PDFNet.Filter)", [[data, "const char* = 0"], [data_size, "number"], [filter_chain, "Object", PDFNet.Filter, "Filter"]]);
                0 != filter_chain.id &&
                avoidCleanup(filter_chain.id);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createIndirectStream", {
                    doc: this.id,
                    data: data,
                    data_size: data_size,
                    no_own_filter_chain: filter_chain.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDoc.prototype.getSDFDoc = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getSDFDoc", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SDFDoc, id);
                });
            };
            PDFNet.PDFDoc.prototype.unlock = function() {
                var me =
                    this;
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.unlock", { doc: this.id }, this.userPriority).then(function() {
                    unregisterLockedObject(me);
                });
            };
            PDFNet.PDFDoc.prototype.unlockRead = function() {
                var me = this;
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.unlockRead", { doc: this.id }, this.userPriority).then(function() {
                    unregisterLockedObject(me);
                });
            };
            PDFNet.PDFDoc.prototype.addHighlights = function(hilite) {
                checkArguments(arguments.length, 1, "addHighlights", "(string)", [[hilite, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.addHighlights",
                    { doc: this.id, hilite: hilite }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.isTagged = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.isTagged", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.hasSignatures = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.hasSignatures", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.addSignatureHandler = function(signature_handler) {
                checkArguments(arguments.length, 1, "addSignatureHandler", "(PDFNet.SignatureHandler)", [[signature_handler,
                    "Object", PDFNet.SignatureHandler, "SignatureHandler"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.addSignatureHandler", {
                    doc: this.id,
                    signature_handler: signature_handler.id,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.addStdSignatureHandlerFromBuffer = function(pkcs12_buffer, pkcs12_pass) {
                checkArguments(arguments.length, 2, "addStdSignatureHandlerFromBuffer", "(ArrayBuffer|TypedArray, string)", [[pkcs12_buffer, "ArrayBuffer"], [pkcs12_pass, "string"]]);
                var pkcs12_bufferArrayBuffer = getArrayBuffer(pkcs12_buffer,
                    !1);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.addStdSignatureHandlerFromBuffer", {
                    doc: this.id,
                    pkcs12_buffer: pkcs12_bufferArrayBuffer,
                    pkcs12_pass: pkcs12_pass,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.removeSignatureHandler = function(signature_handler_id) {
                checkArguments(arguments.length, 1, "removeSignatureHandler", "(number)", [[signature_handler_id, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.removeSignatureHandler", {
                        doc: this.id,
                        signature_handler_id: signature_handler_id,
                    },
                    this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getSignatureHandler = function(signature_handler_id) {
                checkArguments(arguments.length, 1, "getSignatureHandler", "(number)", [[signature_handler_id, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getSignatureHandler", {
                    doc: this.id,
                    signature_handler_id: signature_handler_id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SignatureHandler, id);
                });
            };
            PDFNet.PDFDoc.prototype.generateThumbnails = function(size) {
                checkArguments(arguments.length,
                    1, "generateThumbnails", "(number)", [[size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.generateThumbnails", {
                    doc: this.id,
                    size: size,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.appendVisualDiff = function(p1, p2, opts) {
                "undefined" === typeof opts && (opts = null);
                checkArguments(arguments.length, 2, "appendVisualDiff", "(PDFNet.Page, PDFNet.Page, PDFNet.OptionBase)", [[p1, "Object", PDFNet.Page, "Page"], [p2, "Object", PDFNet.Page, "Page"], [opts, "OptionBase"]]);
                checkParamsYieldFunction("appendVisualDiff",
                    [[opts, 2]]);
                opts = opts ? opts.getJsonString() : "{}";
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.appendVisualDiff", {
                    doc: this.id,
                    p1: p1.id,
                    p2: p2.id,
                    opts: opts,
                }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.getGeometryCollectionForPage = function(page_num) {
                checkArguments(arguments.length, 1, "getGeometryCollectionForPage", "(number)", [[page_num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getGeometryCollectionForPage", {
                    in_pdfdoc: this.id,
                    page_num: page_num,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.GeometryCollection,
                        id);
                });
            };
            PDFNet.PDFDoc.prototype.getUndoManager = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getUndoManager", { doc: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.UndoManager, id);
                });
            };
            PDFNet.PDFDoc.prototype.createDigitalSignatureField = function(in_sig_field_name) {
                "undefined" === typeof in_sig_field_name && (in_sig_field_name = "");
                checkArguments(arguments.length, 0, "createDigitalSignatureField", "(string)", [[in_sig_field_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.createDigitalSignatureField",
                    { doc: this.id, in_sig_field_name: in_sig_field_name }, this.userPriority).then(function(id) {
                    return new PDFNet.DigitalSignatureField(id);
                });
            };
            PDFNet.PDFDoc.prototype.getDigitalSignatureField = function(field_name) {
                checkArguments(arguments.length, 1, "getDigitalSignatureField", "(string)", [[field_name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getDigitalSignatureField", {
                    doc: this.id,
                    field_name: field_name,
                }, this.userPriority).then(function(id) {
                    return new PDFNet.DigitalSignatureField(id);
                });
            };
            PDFNet.PDFDoc.prototype.getDigitalSignatureFieldIteratorBegin =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.getDigitalSignatureFieldIteratorBegin", { doc: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.Iterator, id, "DigitalSignatureField");
                    });
                };
            PDFNet.PDFDoc.prototype.getDigitalSignaturePermissions = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.getDigitalSignaturePermissions", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.verifySignedDigitalSignatures = function(opts) {
                checkArguments(arguments.length,
                    1, "verifySignedDigitalSignatures", "(PDFNet.VerificationOptions)", [[opts, "Object", PDFNet.VerificationOptions, "VerificationOptions"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.verifySignedDigitalSignatures", {
                    doc: this.id,
                    opts: opts.id,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getTitle = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getTitle", { info: this.id }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getTitleObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getTitleObj",
                    { info: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDocInfo.prototype.setTitle = function(title) {
                checkArguments(arguments.length, 1, "setTitle", "(string)", [[title, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setTitle", {
                    info: this.id,
                    title: title,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getAuthor = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getAuthor", { info: this.id }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getAuthorObj =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getAuthorObj", { info: this.id }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.PDFDocInfo.prototype.setAuthor = function(author) {
                checkArguments(arguments.length, 1, "setAuthor", "(string)", [[author, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setAuthor", {
                    info: this.id,
                    author: author,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getSubject = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getSubject",
                    { info: this.id }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getSubjectObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getSubjectObj", { info: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDocInfo.prototype.setSubject = function(subject) {
                checkArguments(arguments.length, 1, "setSubject", "(string)", [[subject, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setSubject", {
                    info: this.id,
                    subject: subject,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getKeywords = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getKeywords", { info: this.id }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getKeywordsObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getKeywordsObj", { info: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDocInfo.prototype.setKeywords = function(keywords) {
                checkArguments(arguments.length, 1, "setKeywords", "(string)", [[keywords,
                    "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setKeywords", {
                    info: this.id,
                    keywords: keywords,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getCreator = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getCreator", { info: this.id }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getCreatorObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getCreatorObj", { info: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDocInfo.prototype.setCreator = function(creator) {
                checkArguments(arguments.length, 1, "setCreator", "(string)", [[creator, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setCreator", {
                    info: this.id,
                    creator: creator,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getProducer = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getProducer", { info: this.id }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getProducerObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getProducerObj",
                    { info: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDocInfo.prototype.setProducer = function(producer) {
                checkArguments(arguments.length, 1, "setProducer", "(string)", [[producer, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setProducer", {
                    info: this.id,
                    producer: producer,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getCreationDate = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getCreationDate", { info: this.id },
                    this.userPriority).then(function(id) {
                    return new PDFNet.Date(id);
                });
            };
            PDFNet.PDFDocInfo.prototype.setCreationDate = function(creation_date) {
                checkArguments(arguments.length, 1, "setCreationDate", "(PDFNet.Date)", [[creation_date, "Structure", PDFNet.Date, "Date"]]);
                checkParamsYieldFunction("setCreationDate", [[creation_date, 0]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setCreationDate", {
                    info: this.id,
                    creation_date: creation_date,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getModDate = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getModDate",
                    { info: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Date(id);
                });
            };
            PDFNet.PDFDocInfo.prototype.setModDate = function(mod_date) {
                checkArguments(arguments.length, 1, "setModDate", "(PDFNet.Date)", [[mod_date, "Structure", PDFNet.Date, "Date"]]);
                checkParamsYieldFunction("setModDate", [[mod_date, 0]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.setModDate", {
                    info: this.id,
                    mod_date: mod_date,
                }, this.userPriority);
            };
            PDFNet.PDFDocInfo.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.getSDFObj",
                    { info: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDocInfo.create = function(tr) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)", [[tr, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfDocInfoCreate", { tr: tr.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PDFDocInfo, id);
                });
            };
            PDFNet.PDFDocInfo.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocInfo.copy", { info: this.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PDFDocInfo, id);
                });
            };
            PDFNet.PDFDocViewPrefs.prototype.setInitialPage = function(dest) {
                checkArguments(arguments.length, 1, "setInitialPage", "(PDFNet.Destination)", [[dest, "Object", PDFNet.Destination, "Destination"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setInitialPage", {
                    p: this.id,
                    dest: dest.id,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.setPageMode = function(mode) {
                checkArguments(arguments.length, 1, "setPageMode",
                    "(number)", [[mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setPageMode", {
                    p: this.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getPageMode = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getPageMode", { p: this.id }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.setLayoutMode = function(mode) {
                checkArguments(arguments.length, 1, "setLayoutMode", "(number)", [[mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setLayoutMode",
                    { p: this.id, mode: mode }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getLayoutMode = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getLayoutMode", { p: this.id }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.setPref = function(pref, value) {
                checkArguments(arguments.length, 2, "setPref", "(number, boolean)", [[pref, "number"], [value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setPref", {
                    p: this.id,
                    pref: pref,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getPref =
                function(pref) {
                    checkArguments(arguments.length, 1, "getPref", "(number)", [[pref, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getPref", {
                        p: this.id,
                        pref: pref,
                    }, this.userPriority);
                };
            PDFNet.PDFDocViewPrefs.prototype.setNonFullScreenPageMode = function(mode) {
                checkArguments(arguments.length, 1, "setNonFullScreenPageMode", "(number)", [[mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setNonFullScreenPageMode", {
                    p: this.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getNonFullScreenPageMode =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getNonFullScreenPageMode", { p: this.id }, this.userPriority);
                };
            PDFNet.PDFDocViewPrefs.prototype.setDirection = function(left_to_right) {
                checkArguments(arguments.length, 1, "setDirection", "(boolean)", [[left_to_right, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setDirection", {
                    p: this.id,
                    left_to_right: left_to_right,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getDirection = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getDirection",
                    { p: this.id }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.setViewArea = function(box) {
                checkArguments(arguments.length, 1, "setViewArea", "(number)", [[box, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setViewArea", {
                    p: this.id,
                    box: box,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getViewArea = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getViewArea", { p: this.id }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.setViewClip = function(box) {
                checkArguments(arguments.length,
                    1, "setViewClip", "(number)", [[box, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setViewClip", {
                    p: this.id,
                    box: box,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getViewClip = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getViewClip", { p: this.id }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.setPrintArea = function(box) {
                checkArguments(arguments.length, 1, "setPrintArea", "(number)", [[box, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setPrintArea",
                    { p: this.id, box: box }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getPrintArea = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getPrintArea", { p: this.id }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.setPrintClip = function(box) {
                checkArguments(arguments.length, 1, "setPrintClip", "(number)", [[box, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.setPrintClip", {
                    p: this.id,
                    box: box,
                }, this.userPriority);
            };
            PDFNet.PDFDocViewPrefs.prototype.getPrintClip =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getPrintClip", { p: this.id }, this.userPriority);
                };
            PDFNet.PDFDocViewPrefs.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.getSDFObj", { p: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.PDFDocViewPrefs.create = function(tr) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)", [[tr, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfDocViewPrefsCreate",
                    { tr: tr.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PDFDocViewPrefs, id);
                });
            };
            PDFNet.PDFDocViewPrefs.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFDocViewPrefs.copy", { prefs: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.PDFDocViewPrefs, id);
                });
            };
            PDFNet.PDFRasterizer.create = function(type) {
                "undefined" === typeof type && (type = PDFNet.PDFRasterizer.Type.e_BuiltIn);
                checkArguments(arguments.length, 0, "create", "(number)", [[type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfRasterizerCreate", { type: type }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PDFRasterizer, id);
                });
            };
            PDFNet.PDFRasterizer.prototype.getChunkRendererPath = function(page, file_path, width, height, demult, device_mtx, clip, scrl_clp_regions, cancel) {
                checkArguments(arguments.length, 9, "getChunkRendererPath", "(PDFNet.Page, string, number, number, boolean, PDFNet.Matrix2D, PDFNet.Rect, PDFNet.Rect, boolean)", [[page, "Object", PDFNet.Page, "Page"],
                    [file_path, "string"], [width, "number"], [height, "number"], [demult, "boolean"], [device_mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"], [clip, "Structure", PDFNet.Rect, "Rect"], [scrl_clp_regions, "Structure", PDFNet.Rect, "Rect"], [cancel, "boolean"]]);
                checkParamsYieldFunction("getChunkRendererPath", [[device_mtx, 5], [clip, 6], [scrl_clp_regions, 7]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.getChunkRendererPath", {
                    r: this.id,
                    page: page.id,
                    file_path: file_path,
                    width: width,
                    height: height,
                    demult: demult,
                    device_mtx: device_mtx,
                    clip: clip,
                    scrl_clp_regions: scrl_clp_regions,
                    cancel: cancel,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.ChunkRenderer, id);
                });
            };
            PDFNet.PDFRasterizer.prototype.setDrawAnnotations = function(render_annots) {
                checkArguments(arguments.length, 1, "setDrawAnnotations", "(boolean)", [[render_annots, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setDrawAnnotations", {
                    r: this.id,
                    render_annots: render_annots,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setHighlightFields =
                function(highlight) {
                    checkArguments(arguments.length, 1, "setHighlightFields", "(boolean)", [[highlight, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setHighlightFields", {
                        r: this.id,
                        highlight: highlight,
                    }, this.userPriority);
                };
            PDFNet.PDFRasterizer.prototype.setAntiAliasing = function(enable_aa) {
                checkArguments(arguments.length, 1, "setAntiAliasing", "(boolean)", [[enable_aa, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setAntiAliasing", {
                        r: this.id,
                        enable_aa: enable_aa,
                    },
                    this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setPathHinting = function(enable_hinting) {
                checkArguments(arguments.length, 1, "setPathHinting", "(boolean)", [[enable_hinting, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setPathHinting", {
                    r: this.id,
                    enable_hinting: enable_hinting,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setThinLineAdjustment = function(grid_fit, stroke_adjust) {
                checkArguments(arguments.length, 2, "setThinLineAdjustment", "(boolean, boolean)", [[grid_fit, "boolean"],
                    [stroke_adjust, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setThinLineAdjustment", {
                    r: this.id,
                    grid_fit: grid_fit,
                    stroke_adjust: stroke_adjust,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setGamma = function(expgamma) {
                checkArguments(arguments.length, 1, "setGamma", "(number)", [[expgamma, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setGamma", {
                    r: this.id,
                    expgamma: expgamma,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setOCGContext = function(ctx) {
                checkArguments(arguments.length,
                    1, "setOCGContext", "(PDFNet.OCGContext)", [[ctx, "Object", PDFNet.OCGContext, "OCGContext"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setOCGContext", {
                    r: this.id,
                    ctx: ctx.id,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setPrintMode = function(is_printing) {
                checkArguments(arguments.length, 1, "setPrintMode", "(boolean)", [[is_printing, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setPrintMode", {
                    r: this.id,
                    is_printing: is_printing,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setImageSmoothing =
                function(smoothing_enabled, hq_image_resampling) {
                    "undefined" === typeof smoothing_enabled && (smoothing_enabled = !0);
                    "undefined" === typeof hq_image_resampling && (hq_image_resampling = !1);
                    checkArguments(arguments.length, 0, "setImageSmoothing", "(boolean, boolean)", [[smoothing_enabled, "boolean"], [hq_image_resampling, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setImageSmoothing", {
                        r: this.id,
                        smoothing_enabled: smoothing_enabled,
                        hq_image_resampling: hq_image_resampling,
                    }, this.userPriority);
                };
            PDFNet.PDFRasterizer.prototype.setOverprint = function(op) {
                checkArguments(arguments.length, 1, "setOverprint", "(number)", [[op, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setOverprint", {
                    r: this.id,
                    op: op,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setCaching = function(enabled) {
                "undefined" === typeof enabled && (enabled = !0);
                checkArguments(arguments.length, 0, "setCaching", "(boolean)", [[enabled, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setCaching",
                    { r: this.id, enabled: enabled }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setOCGContext = function(ctx) {
                checkArguments(arguments.length, 1, "setOCGContext", "(PDFNet.OCGContext)", [[ctx, "Object", PDFNet.OCGContext, "OCGContext"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setOCGContext", {
                    r: this.id,
                    ctx: ctx.id,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setAnnotationState = function(annot, new_view_state) {
                checkArguments(arguments.length, 2, "setAnnotationState", "(PDFNet.Annot, number)", [[annot,
                    "Object", PDFNet.Annot, "Annot"], [new_view_state, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setAnnotationState", {
                    r: this.id,
                    annot: annot.id,
                    new_view_state: new_view_state,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.setRasterizerType = function(type) {
                checkArguments(arguments.length, 1, "setRasterizerType", "(number)", [[type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setRasterizerType", {
                    r: this.id,
                    type: type,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.getRasterizerType =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.getRasterizerType", { r: this.id }, this.userPriority);
                };
            PDFNet.PDFRasterizer.prototype.setColorPostProcessMode = function(mode) {
                checkArguments(arguments.length, 1, "setColorPostProcessMode", "(number)", [[mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.setColorPostProcessMode", {
                    r: this.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.getColorPostProcessMode = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.getColorPostProcessMode",
                    { r: this.id }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.enableDisplayListCaching = function(enabled) {
                checkArguments(arguments.length, 1, "enableDisplayListCaching", "(boolean)", [[enabled, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.enableDisplayListCaching", {
                    r: this.id,
                    enabled: enabled,
                }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.updateBuffer = function() {
                return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.updateBuffer", { r: this.id }, this.userPriority);
            };
            PDFNet.PDFRasterizer.prototype.rasterizeAnnot =
                function(annot, page, device_mtx, demult, cancel) {
                    checkArguments(arguments.length, 5, "rasterizeAnnot", "(PDFNet.Annot, PDFNet.Page, PDFNet.Matrix2D, boolean, boolean)", [[annot, "Object", PDFNet.Annot, "Annot"], [page, "Object", PDFNet.Page, "Page"], [device_mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"], [demult, "boolean"], [cancel, "boolean"]]);
                    checkParamsYieldFunction("rasterizeAnnot", [[device_mtx, 2]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFRasterizer.rasterizeAnnot", {
                        r: this.id, annot: annot.id, page: page.id,
                        device_mtx: device_mtx, demult: demult, cancel: cancel,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.OwnedBitmap, id);
                    });
                };
            PDFNet.PDFDraw.create = function(dpi) {
                "undefined" === typeof dpi && (dpi = 92);
                checkArguments(arguments.length, 0, "create", "(number)", [[dpi, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfDrawCreate", { dpi: dpi }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.PDFDraw, id);
                });
            };
            PDFNet.PDFDraw.prototype.setRasterizerType = function(type) {
                checkArguments(arguments.length,
                    1, "setRasterizerType", "(number)", [[type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setRasterizerType", {
                    d: this.id,
                    type: type,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setDPI = function(dpi) {
                checkArguments(arguments.length, 1, "setDPI", "(number)", [[dpi, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setDPI", {
                    d: this.id,
                    dpi: dpi,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setImageSize = function(width, height, preserve_aspect_ratio) {
                "undefined" === typeof preserve_aspect_ratio &&
                (preserve_aspect_ratio = !0);
                checkArguments(arguments.length, 2, "setImageSize", "(number, number, boolean)", [[width, "number"], [height, "number"], [preserve_aspect_ratio, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setImageSize", {
                    d: this.id,
                    width: width,
                    height: height,
                    preserve_aspect_ratio: preserve_aspect_ratio,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setPageBox = function(region) {
                checkArguments(arguments.length, 1, "setPageBox", "(number)", [[region, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setPageBox",
                    { d: this.id, region: region }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setClipRect = function(rect) {
                checkArguments(arguments.length, 1, "setClipRect", "(PDFNet.Rect)", [[rect, "Structure", PDFNet.Rect, "Rect"]]);
                checkParamsYieldFunction("setClipRect", [[rect, 0]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setClipRect", {
                    d: this.id,
                    rect: rect,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setFlipYAxis = function(flip_y) {
                checkArguments(arguments.length, 1, "setFlipYAxis", "(boolean)", [[flip_y, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setFlipYAxis", {
                    d: this.id,
                    flip_y: flip_y,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setRotate = function(angle) {
                checkArguments(arguments.length, 1, "setRotate", "(number)", [[angle, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setRotate", {
                    d: this.id,
                    angle: angle,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setDrawAnnotations = function(render_annots) {
                checkArguments(arguments.length, 1, "setDrawAnnotations", "(boolean)", [[render_annots,
                    "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setDrawAnnotations", {
                    d: this.id,
                    render_annots: render_annots,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setHighlightFields = function(highlight) {
                checkArguments(arguments.length, 1, "setHighlightFields", "(boolean)", [[highlight, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setHighlightFields", {
                    d: this.id,
                    highlight: highlight,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setAntiAliasing = function(enable_aa) {
                checkArguments(arguments.length,
                    1, "setAntiAliasing", "(boolean)", [[enable_aa, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setAntiAliasing", {
                    d: this.id,
                    enable_aa: enable_aa,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setPathHinting = function(enable_hinting) {
                checkArguments(arguments.length, 1, "setPathHinting", "(boolean)", [[enable_hinting, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setPathHinting", {
                    d: this.id,
                    enable_hinting: enable_hinting,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setThinLineAdjustment =
                function(grid_fit, stroke_adjust) {
                    checkArguments(arguments.length, 2, "setThinLineAdjustment", "(boolean, boolean)", [[grid_fit, "boolean"], [stroke_adjust, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("PDFDraw.setThinLineAdjustment", {
                        d: this.id,
                        grid_fit: grid_fit,
                        stroke_adjust: stroke_adjust,
                    }, this.userPriority);
                };
            PDFNet.PDFDraw.prototype.setGamma = function(exp) {
                checkArguments(arguments.length, 1, "setGamma", "(number)", [[exp, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setGamma",
                    { d: this.id, exp: exp }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setPrintMode = function(is_printing) {
                checkArguments(arguments.length, 1, "setPrintMode", "(boolean)", [[is_printing, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setPrintMode", {
                    d: this.id,
                    is_printing: is_printing,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setPageTransparent = function(is_transparent) {
                checkArguments(arguments.length, 1, "setPageTransparent", "(boolean)", [[is_transparent, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setPageTransparent",
                    { d: this.id, is_transparent: is_transparent }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setDefaultPageColor = function(r, g, b) {
                checkArguments(arguments.length, 3, "setDefaultPageColor", "(number, number, number)", [[r, "number"], [g, "number"], [b, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setDefaultPageColor", {
                    d: this.id,
                    r: r,
                    g: g,
                    b: b,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setOverprint = function(op) {
                checkArguments(arguments.length, 1, "setOverprint", "(number)", [[op, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setOverprint",
                    { d: this.id, op: op }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setImageSmoothing = function(smoothing_enabled, hq_image_resampling) {
                "undefined" === typeof smoothing_enabled && (smoothing_enabled = !0);
                "undefined" === typeof hq_image_resampling && (hq_image_resampling = !1);
                checkArguments(arguments.length, 0, "setImageSmoothing", "(boolean, boolean)", [[smoothing_enabled, "boolean"], [hq_image_resampling, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setImageSmoothing", {
                    d: this.id, smoothing_enabled: smoothing_enabled,
                    hq_image_resampling: hq_image_resampling,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setCaching = function(enabled) {
                "undefined" === typeof enabled && (enabled = !0);
                checkArguments(arguments.length, 0, "setCaching", "(boolean)", [[enabled, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setCaching", {
                    d: this.id,
                    enabled: enabled,
                }, this.userPriority);
            };
            PDFNet.PDFDraw.prototype.setColorPostProcessMode = function(mode) {
                checkArguments(arguments.length, 1, "setColorPostProcessMode", "(number)", [[mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.setColorPostProcessMode", {
                    d: this.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.enableJavaScript = function(enable) {
                checkArguments(arguments.length, 1, "enableJavaScript", "(boolean)", [[enable, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfNetEnableJavaScript", { enable: enable }, this.userPriority);
            };
            PDFNet.isJavaScriptEnabled = function() {
                return PDFNet.messageHandler.sendWithPromise("pdfNetIsJavaScriptEnabled", {}, this.userPriority);
            };
            PDFNet.addResourceSearchPath =
                function(path) {
                    checkArguments(arguments.length, 1, "addResourceSearchPath", "(string)", [[path, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("pdfNetAddResourceSearchPath", { path: path }, this.userPriority);
                };
            PDFNet.setColorManagement = function(t) {
                "undefined" === typeof t && (t = PDFNet.CMSType.e_lcms);
                checkArguments(arguments.length, 0, "setColorManagement", "(number)", [[t, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfNetSetColorManagement", { t: t }, this.userPriority);
            };
            PDFNet.setDefaultDeviceCMYKProfileFromFilter =
                function(stream) {
                    checkArguments(arguments.length, 1, "setDefaultDeviceCMYKProfileFromFilter", "(PDFNet.Filter)", [[stream, "Object", PDFNet.Filter, "Filter"]]);
                    return PDFNet.messageHandler.sendWithPromise("pdfNetSetDefaultDeviceCMYKProfileFromFilter", { stream: stream.id }, this.userPriority);
                };
            PDFNet.setDefaultDeviceRGBProfileFromFilter = function(stream) {
                checkArguments(arguments.length, 1, "setDefaultDeviceRGBProfileFromFilter", "(PDFNet.Filter)", [[stream, "Object", PDFNet.Filter, "Filter"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfNetSetDefaultDeviceRGBProfileFromFilter",
                    { stream: stream.id }, this.userPriority);
            };
            PDFNet.setDefaultFlateCompressionLevel = function(level) {
                checkArguments(arguments.length, 1, "setDefaultFlateCompressionLevel", "(number)", [[level, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfNetSetDefaultFlateCompressionLevel", { level: level }, this.userPriority);
            };
            PDFNet.getVersion = function() {
                return PDFNet.messageHandler.sendWithPromise("pdfNetGetVersion", {}, this.userPriority);
            };
            PDFNet.setLogLevel = function(level) {
                "undefined" === typeof level && (level = PDFNet.LogLevel.e_LogLevel_Fatal);
                checkArguments(arguments.length, 0, "setLogLevel", "(number)", [[level, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("pdfNetSetLogLevel", { level: level }, this.userPriority);
            };
            PDFNet.getSystemFontList = function() {
                return PDFNet.messageHandler.sendWithPromise("pdfNetGetSystemFontList", {}, this.userPriority);
            };
            PDFNet.Rect.init = function(x1, y1, x2, y2) {
                checkArguments(arguments.length, 4, "init", "(number, number, number, number)", [[x1, "number"], [y1, "number"], [x2, "number"], [y2, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("rectInit",
                    { x1: x1, y1: y1, x2: x2, y2: y2 }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Rect.prototype.attach = function(obj) {
                checkArguments(arguments.length, 1, "attach", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                checkThisYieldFunction("attach", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Rect.attach";
                return PDFNet.messageHandler.sendWithPromise("Rect.attach", {
                    rect: this,
                    obj: obj.id,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Rect.prototype.update =
                function(obj) {
                    "undefined" === typeof obj && (obj = new PDFNet.Obj("__null"));
                    checkArguments(arguments.length, 0, "update", "(PDFNet.Obj)", [[obj, "Object", PDFNet.Obj, "Obj"]]);
                    checkThisYieldFunction("update", this.yieldFunction);
                    var me = this;
                    this.yieldFunction = "Rect.update";
                    return PDFNet.messageHandler.sendWithPromise("Rect.update", {
                        rect: this,
                        obj: obj.id,
                    }, this.userPriority).then(function(id) {
                        me.yieldFunction = void 0;
                        copyFunc(id.rect, me);
                        return id.result;
                    });
                };
            PDFNet.Rect.prototype.get = function() {
                checkThisYieldFunction("get",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Rect.get", { rect: this }, this.userPriority);
            };
            PDFNet.Rect.prototype.set = function(x1, y1, x2, y2) {
                checkArguments(arguments.length, 4, "set", "(number, number, number, number)", [[x1, "number"], [y1, "number"], [x2, "number"], [y2, "number"]]);
                checkThisYieldFunction("set", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Rect.set";
                return PDFNet.messageHandler.sendWithPromise("Rect.set", {
                    rect: this,
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction =
                        void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Rect.prototype.width = function() {
                checkThisYieldFunction("width", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Rect.width", { rect: this }, this.userPriority);
            };
            PDFNet.Rect.prototype.height = function() {
                checkThisYieldFunction("height", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Rect.height", { rect: this }, this.userPriority);
            };
            PDFNet.Rect.prototype.contains = function(x, y) {
                checkArguments(arguments.length, 2, "contains", "(number, number)", [[x,
                    "number"], [y, "number"]]);
                checkThisYieldFunction("contains", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("Rect.contains", {
                    rect: this,
                    x: x,
                    y: y,
                }, this.userPriority);
            };
            PDFNet.Rect.prototype.intersectRect = function(rect1, rect2) {
                checkArguments(arguments.length, 2, "intersectRect", "(PDFNet.Rect, PDFNet.Rect)", [[rect1, "Structure", PDFNet.Rect, "Rect"], [rect2, "Structure", PDFNet.Rect, "Rect"]]);
                checkThisYieldFunction("intersectRect", this.yieldFunction);
                checkParamsYieldFunction("intersectRect", [[rect1,
                    0], [rect2, 1]]);
                var me = this;
                this.yieldFunction = "Rect.intersectRect";
                return PDFNet.messageHandler.sendWithPromise("Rect.intersectRect", {
                    rect: this,
                    rect1: rect1,
                    rect2: rect2,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.rect, me);
                    return id.result;
                });
            };
            PDFNet.Rect.prototype.normalize = function() {
                checkThisYieldFunction("normalize", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Rect.normalize";
                return PDFNet.messageHandler.sendWithPromise("Rect.normalize", { rect: this }, this.userPriority).then(function(id) {
                    me.yieldFunction =
                        void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Rect.prototype.inflate1 = function(amount) {
                checkArguments(arguments.length, 1, "inflate1", "(number)", [[amount, "number"]]);
                checkThisYieldFunction("inflate1", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Rect.inflate1";
                return PDFNet.messageHandler.sendWithPromise("Rect.inflate1", {
                    rect: this,
                    amount: amount,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Rect.prototype.inflate2 = function(x, y) {
                checkArguments(arguments.length, 2, "inflate2",
                    "(number, number)", [[x, "number"], [y, "number"]]);
                checkThisYieldFunction("inflate2", this.yieldFunction);
                var me = this;
                this.yieldFunction = "Rect.inflate2";
                return PDFNet.messageHandler.sendWithPromise("Rect.inflate2", {
                    rect: this,
                    x: x,
                    y: y,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id, me);
                });
            };
            PDFNet.Redactor.redactionCreate = function(page_num, bbox, negative, text) {
                checkArguments(arguments.length, 4, "redactionCreate", "(number, PDFNet.Rect, boolean, string)", [[page_num, "number"], [bbox, "Structure",
                    PDFNet.Rect, "Rect"], [negative, "boolean"], [text, "string"]]);
                checkParamsYieldFunction("redactionCreate", [[bbox, 1]]);
                return PDFNet.messageHandler.sendWithPromise("Redactor.redactionCreate", {
                    page_num: page_num,
                    bbox: bbox,
                    negative: negative,
                    text: text,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Redaction, id);
                });
            };
            PDFNet.Redactor.redactionDestroy = function(redaction) {
                checkArguments(arguments.length, 1, "redactionDestroy", "(PDFNet.Redaction)", [[redaction, "Object", PDFNet.Redaction, "Redaction"]]);
                return PDFNet.messageHandler.sendWithPromise("Redactor.redactionDestroy", { redaction: redaction.id }, this.userPriority);
            };
            PDFNet.Redactor.redactionCopy = function(other) {
                checkArguments(arguments.length, 1, "redactionCopy", "(PDFNet.Redaction)", [[other, "Object", PDFNet.Redaction, "Redaction"]]);
                return PDFNet.messageHandler.sendWithPromise("Redactor.redactionCopy", { other: other.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Redaction, id);
                });
            };
            PDFNet.Shading.create = function(shading_dict) {
                "undefined" ===
                typeof shading_dict && (shading_dict = new PDFNet.Obj("0"));
                checkArguments(arguments.length, 0, "create", "(PDFNet.Obj)", [[shading_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("shadingCreate", { shading_dict: shading_dict.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Shading, id);
                });
            };
            PDFNet.Shading.getTypeFromObj = function(shading_dict) {
                checkArguments(arguments.length, 1, "getTypeFromObj", "(PDFNet.Obj)", [[shading_dict, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("shadingGetTypeFromObj",
                    { shading_dict: shading_dict.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getType", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getSDFObj", { s: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Shading.prototype.getBaseColorSpace = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getBaseColorSpace",
                    { s: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorSpace, id);
                });
            };
            PDFNet.Shading.prototype.hasBBox = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.hasBBox", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getBBox = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getBBox", { s: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Shading.prototype.hasBackground = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.hasBackground",
                    { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getBackground = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getBackground", { s: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.Shading.prototype.getAntialias = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getAntialias", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getParamStart = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getParamStart",
                    { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getParamEnd = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getParamEnd", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.isExtendStart = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.isExtendStart", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.isExtendEnd = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.isExtendEnd", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getColor =
                function(t) {
                    checkArguments(arguments.length, 1, "getColor", "(number)", [[t, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("Shading.getColor", {
                        s: this.id,
                        t: t,
                    }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.ColorPt, id);
                    });
                };
            PDFNet.Shading.prototype.getCoords = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getCoords", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getCoordsRadial = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getCoordsRadial",
                    { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getDomain = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getDomain", { s: this.id }, this.userPriority);
            };
            PDFNet.Shading.prototype.getMatrix = function() {
                return PDFNet.messageHandler.sendWithPromise("Shading.getMatrix", { s: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.Matrix2D(id);
                });
            };
            PDFNet.Shading.prototype.getColorForFunction = function(t1, t2) {
                checkArguments(arguments.length, 2, "getColorForFunction", "(number, number)",
                    [[t1, "number"], [t2, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Shading.getColorForFunction", {
                    s: this.id,
                    t1: t1,
                    t2: t2,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ColorPt, id);
                });
            };
            PDFNet.Stamper.create = function(size_type, a, b) {
                checkArguments(arguments.length, 3, "create", "(number, number, number)", [[size_type, "number"], [a, "number"], [b, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("stamperCreate", {
                    size_type: size_type,
                    a: a,
                    b: b,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.Stamper,
                        id);
                });
            };
            PDFNet.Stamper.prototype.stampImage = function(dest_doc, img, dest_pages) {
                checkArguments(arguments.length, 3, "stampImage", "(PDFNet.PDFDoc, PDFNet.Image, PDFNet.PageSet)", [[dest_doc, "PDFDoc"], [img, "Object", PDFNet.Image, "Image"], [dest_pages, "Object", PDFNet.PageSet, "PageSet"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.stampImage", {
                    stamp: this.id,
                    dest_doc: dest_doc.id,
                    img: img.id,
                    dest_pages: dest_pages.id,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.stampPage = function(dest_doc, page, dest_pages) {
                checkArguments(arguments.length,
                    3, "stampPage", "(PDFNet.PDFDoc, PDFNet.Page, PDFNet.PageSet)", [[dest_doc, "PDFDoc"], [page, "Object", PDFNet.Page, "Page"], [dest_pages, "Object", PDFNet.PageSet, "PageSet"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.stampPage", {
                    stamp: this.id,
                    dest_doc: dest_doc.id,
                    page: page.id,
                    dest_pages: dest_pages.id,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.stampText = function(dest_doc, txt, dest_pages) {
                checkArguments(arguments.length, 3, "stampText", "(PDFNet.PDFDoc, string, PDFNet.PageSet)", [[dest_doc, "PDFDoc"],
                    [txt, "string"], [dest_pages, "Object", PDFNet.PageSet, "PageSet"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.stampText", {
                    stamp: this.id,
                    dest_doc: dest_doc.id,
                    txt: txt,
                    dest_pages: dest_pages.id,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setFont = function(font) {
                checkArguments(arguments.length, 1, "setFont", "(PDFNet.Font)", [[font, "Object", PDFNet.Font, "Font"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setFont", {
                    stamp: this.id,
                    font: font.id,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setFontColor =
                function(font_color) {
                    checkArguments(arguments.length, 1, "setFontColor", "(PDFNet.ColorPt)", [[font_color, "Object", PDFNet.ColorPt, "ColorPt"]]);
                    return PDFNet.messageHandler.sendWithPromise("Stamper.setFontColor", {
                        stamp: this.id,
                        font_color: font_color.id,
                    }, this.userPriority);
                };
            PDFNet.Stamper.prototype.setTextAlignment = function(text_alignment) {
                checkArguments(arguments.length, 1, "setTextAlignment", "(number)", [[text_alignment, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setTextAlignment", {
                    stamp: this.id,
                    text_alignment: text_alignment,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setOpacity = function(opacity) {
                checkArguments(arguments.length, 1, "setOpacity", "(number)", [[opacity, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setOpacity", {
                    stamp: this.id,
                    opacity: opacity,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setRotation = function(rotation) {
                checkArguments(arguments.length, 1, "setRotation", "(number)", [[rotation, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setRotation",
                    { stamp: this.id, rotation: rotation }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setAsBackground = function(background) {
                checkArguments(arguments.length, 1, "setAsBackground", "(boolean)", [[background, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setAsBackground", {
                    stamp: this.id,
                    background: background,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setAsAnnotation = function(annotation) {
                checkArguments(arguments.length, 1, "setAsAnnotation", "(boolean)", [[annotation, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setAsAnnotation",
                    { stamp: this.id, annotation: annotation }, this.userPriority);
            };
            PDFNet.Stamper.prototype.showsOnScreen = function(on_screen) {
                checkArguments(arguments.length, 1, "showsOnScreen", "(boolean)", [[on_screen, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.showsOnScreen", {
                    stamp: this.id,
                    on_screen: on_screen,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.showsOnPrint = function(on_print) {
                checkArguments(arguments.length, 1, "showsOnPrint", "(boolean)", [[on_print, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.showsOnPrint",
                    { stamp: this.id, on_print: on_print }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setAlignment = function(horizontal_alignment, vertical_alignment) {
                checkArguments(arguments.length, 2, "setAlignment", "(number, number)", [[horizontal_alignment, "number"], [vertical_alignment, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setAlignment", {
                    stamp: this.id,
                    horizontal_alignment: horizontal_alignment,
                    vertical_alignment: vertical_alignment,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setPosition = function(x,
                y, use_percentage) {
                "undefined" === typeof use_percentage && (use_percentage = !1);
                checkArguments(arguments.length, 2, "setPosition", "(number, number, boolean)", [[x, "number"], [y, "number"], [use_percentage, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setPosition", {
                    stamp: this.id,
                    x: x,
                    y: y,
                    use_percentage: use_percentage,
                }, this.userPriority);
            };
            PDFNet.Stamper.prototype.setSize = function(size_type, a, b) {
                checkArguments(arguments.length, 3, "setSize", "(number, number, number)", [[size_type, "number"], [a,
                    "number"], [b, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Stamper.setSize", {
                    stamp: this.id,
                    size_type: size_type,
                    a: a,
                    b: b,
                }, this.userPriority);
            };
            PDFNet.Stamper.deleteStamps = function(doc, page_set) {
                checkArguments(arguments.length, 2, "deleteStamps", "(PDFNet.PDFDoc, PDFNet.PageSet)", [[doc, "PDFDoc"], [page_set, "Object", PDFNet.PageSet, "PageSet"]]);
                return PDFNet.messageHandler.sendWithPromise("stamperDeleteStamps", {
                    doc: doc.id,
                    page_set: page_set.id,
                }, this.userPriority);
            };
            PDFNet.Stamper.hasStamps = function(doc,
                page_set) {
                checkArguments(arguments.length, 2, "hasStamps", "(PDFNet.PDFDoc, PDFNet.PageSet)", [[doc, "PDFDoc"], [page_set, "Object", PDFNet.PageSet, "PageSet"]]);
                return PDFNet.messageHandler.sendWithPromise("stamperHasStamps", {
                    doc: doc.id,
                    page_set: page_set.id,
                }, this.userPriority);
            };
            PDFNet.TextExtractor.create = function() {
                return PDFNet.messageHandler.sendWithPromise("textExtractorCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.TextExtractor, id);
                });
            };
            PDFNet.TextExtractor.prototype.setOCGContext =
                function(ctx) {
                    checkArguments(arguments.length, 1, "setOCGContext", "(PDFNet.OCGContext)", [[ctx, "Object", PDFNet.OCGContext, "OCGContext"]]);
                    return PDFNet.messageHandler.sendWithPromise("TextExtractor.setOCGContext", {
                        te: this.id,
                        ctx: ctx.id,
                    }, this.userPriority);
                };
            PDFNet.TextExtractor.prototype.begin = function(page, clip_ptr, flags) {
                "undefined" === typeof clip_ptr && (clip_ptr = null);
                "undefined" === typeof flags && (flags = 0);
                checkArguments(arguments.length, 1, "begin", "(PDFNet.Page, PDFNet.Rect, number)", [[page, "Object",
                    PDFNet.Page, "Page"], [clip_ptr, "Structure", PDFNet.Rect, "Rect"], [flags, "number"]]);
                checkParamsYieldFunction("begin", [[clip_ptr, 1]]);
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.begin", {
                    te: this.id,
                    page: page.id,
                    clip_ptr: clip_ptr,
                    flags: flags,
                }, this.userPriority);
            };
            PDFNet.TextExtractor.prototype.getWordCount = function() {
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.getWordCount", { te: this.id }, this.userPriority);
            };
            PDFNet.TextExtractor.prototype.setRightToLeftLanguage = function(rtl) {
                checkArguments(arguments.length,
                    1, "setRightToLeftLanguage", "(boolean)", [[rtl, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.setRightToLeftLanguage", {
                    te: this.id,
                    rtl: rtl,
                }, this.userPriority);
            };
            PDFNet.TextExtractor.prototype.getRightToLeftLanguage = function() {
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.getRightToLeftLanguage", { te: this.id }, this.userPriority);
            };
            PDFNet.TextExtractor.prototype.getAsText = function(dehyphen) {
                "undefined" === typeof dehyphen && (dehyphen = !0);
                checkArguments(arguments.length,
                    0, "getAsText", "(boolean)", [[dehyphen, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.getAsText", {
                    te: this.id,
                    dehyphen: dehyphen,
                }, this.userPriority);
            };
            PDFNet.TextExtractor.prototype.getTextUnderAnnot = function(annot) {
                checkArguments(arguments.length, 1, "getTextUnderAnnot", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.getTextUnderAnnot", {
                    te: this.id,
                    annot: annot.id,
                }, this.userPriority);
            };
            PDFNet.TextExtractor.prototype.getAsXML =
                function(xml_output_flags) {
                    "undefined" === typeof xml_output_flags && (xml_output_flags = 0);
                    checkArguments(arguments.length, 0, "getAsXML", "(number)", [[xml_output_flags, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("TextExtractor.getAsXML", {
                        te: this.id,
                        xml_output_flags: xml_output_flags,
                    }, this.userPriority);
                };
            PDFNet.TextExtractorStyle.prototype.getFont = function() {
                checkThisYieldFunction("getFont", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorStyle.getFont";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.getFont",
                    { tes: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = createPDFNetObj(PDFNet.Obj, id.result);
                    copyFunc(id.tes, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorStyle.prototype.getFontName = function() {
                checkThisYieldFunction("getFontName", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorStyle.getFontName";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.getFontName", { tes: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tes,
                        me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorStyle.prototype.getFontSize = function() {
                checkThisYieldFunction("getFontSize", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorStyle.getFontSize";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.getFontSize", { tes: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tes, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorStyle.prototype.getWeight = function() {
                checkThisYieldFunction("getWeight", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorStyle.getWeight";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.getWeight", { tes: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tes, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorStyle.prototype.isItalic = function() {
                checkThisYieldFunction("isItalic", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorStyle.isItalic";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.isItalic", { tes: this },
                    this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tes, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorStyle.prototype.isSerif = function() {
                checkThisYieldFunction("isSerif", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorStyle.isSerif";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.isSerif", { tes: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tes, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorStyle.prototype.compare = function(s) {
                checkArguments(arguments.length,
                    1, "compare", "(PDFNet.TextExtractorStyle)", [[s, "Structure", PDFNet.TextExtractorStyle, "TextExtractorStyle"]]);
                checkThisYieldFunction("compare", this.yieldFunction);
                checkParamsYieldFunction("compare", [[s, 0]]);
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.compare", {
                    tes: this,
                    s: s,
                }, this.userPriority);
            };
            PDFNet.TextExtractorStyle.create = function() {
                return PDFNet.messageHandler.sendWithPromise("textExtractorStyleCreate", {}, this.userPriority).then(function(id) {
                    return new PDFNet.TextExtractorStyle(id);
                });
            };
            PDFNet.TextExtractorStyle.prototype.copy = function() {
                checkThisYieldFunction("copy", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorStyle.copy";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.copy", { s: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorStyle(id.result);
                    copyFunc(id.s, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorWord.prototype.getNumGlyphs = function() {
                checkThisYieldFunction("getNumGlyphs", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorWord.getNumGlyphs";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getNumGlyphs", { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tew, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorWord.prototype.getCharStyle = function(char_idx) {
                checkArguments(arguments.length, 1, "getCharStyle", "(number)", [[char_idx, "number"]]);
                checkThisYieldFunction("getCharStyle", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorWord.getCharStyle";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getCharStyle", {
                    tew: this,
                    char_idx: char_idx,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorStyle(id.result);
                    copyFunc(id.tew, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorWord.prototype.getStyle = function() {
                checkThisYieldFunction("getStyle", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorWord.getStyle";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getStyle",
                    { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorStyle(id.result);
                    copyFunc(id.tew, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorWord.prototype.getStringLen = function() {
                checkThisYieldFunction("getStringLen", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorWord.getStringLen";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getStringLen", { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tew,
                        me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorWord.prototype.getNextWord = function() {
                checkThisYieldFunction("getNextWord", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorWord.getNextWord";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getNextWord", { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorWord(id.result);
                    copyFunc(id.tew, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorWord.prototype.getCurrentNum = function() {
                checkThisYieldFunction("getCurrentNum",
                    this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorWord.getCurrentNum";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getCurrentNum", { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tew, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorWord.prototype.compare = function(word) {
                checkArguments(arguments.length, 1, "compare", "(PDFNet.TextExtractorWord)", [[word, "Structure", PDFNet.TextExtractorWord, "TextExtractorWord"]]);
                checkThisYieldFunction("compare",
                    this.yieldFunction);
                checkParamsYieldFunction("compare", [[word, 0]]);
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.compare", {
                    tew: this,
                    word: word,
                }, this.userPriority);
            };
            PDFNet.TextExtractorWord.create = function() {
                return PDFNet.messageHandler.sendWithPromise("textExtractorWordCreate", {}, this.userPriority).then(function(id) {
                    return new PDFNet.TextExtractorWord(id);
                });
            };
            PDFNet.TextExtractorWord.prototype.isValid = function() {
                checkThisYieldFunction("isValid", this.yieldFunction);
                var me = this;
                this.yieldFunction =
                    "TextExtractorWord.isValid";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.isValid", { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.tew, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getNumWords = function() {
                checkThisYieldFunction("getNumWords", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getNumWords";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getNumWords", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction =
                        void 0;
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.isSimpleLine = function() {
                checkThisYieldFunction("isSimpleLine", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.isSimpleLine";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.isSimpleLine", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getFirstWord = function() {
                checkThisYieldFunction("getFirstWord",
                    this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getFirstWord";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getFirstWord", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorWord(id.result);
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getWord = function(word_idx) {
                checkArguments(arguments.length, 1, "getWord", "(number)", [[word_idx, "number"]]);
                checkThisYieldFunction("getWord", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getWord";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getWord", {
                    line: this,
                    word_idx: word_idx,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorWord(id.result);
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getNextLine = function() {
                checkThisYieldFunction("getNextLine", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getNextLine";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getNextLine",
                    { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorLine(id.result);
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getCurrentNum = function() {
                checkThisYieldFunction("getCurrentNum", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getCurrentNum";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getCurrentNum", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.line,
                        me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getStyle = function() {
                checkThisYieldFunction("getStyle", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getStyle";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getStyle", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    id.result = new PDFNet.TextExtractorStyle(id.result);
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getParagraphID = function() {
                checkThisYieldFunction("getParagraphID",
                    this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getParagraphID";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getParagraphID", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.getFlowID = function() {
                checkThisYieldFunction("getFlowID", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.getFlowID";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getFlowID",
                    { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.endsWithHyphen = function() {
                checkThisYieldFunction("endsWithHyphen", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.endsWithHyphen";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.endsWithHyphen", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractorLine.prototype.compare =
                function(line2) {
                    checkArguments(arguments.length, 1, "compare", "(PDFNet.TextExtractorLine)", [[line2, "Structure", PDFNet.TextExtractorLine, "TextExtractorLine"]]);
                    checkThisYieldFunction("compare", this.yieldFunction);
                    checkParamsYieldFunction("compare", [[line2, 0]]);
                    return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.compare", {
                        line: this,
                        line2: line2,
                    }, this.userPriority);
                };
            PDFNet.TextExtractorLine.create = function() {
                return PDFNet.messageHandler.sendWithPromise("textExtractorLineCreate", {}, this.userPriority).then(function(id) {
                    return new PDFNet.TextExtractorLine(id);
                });
            };
            PDFNet.TextExtractorLine.prototype.isValid = function() {
                checkThisYieldFunction("isValid", this.yieldFunction);
                var me = this;
                this.yieldFunction = "TextExtractorLine.isValid";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.isValid", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    copyFunc(id.line, me);
                    return id.result;
                });
            };
            PDFNet.TextExtractor.prototype.getNumLines = function() {
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.getNumLines", { te: this.id }, this.userPriority);
            };
            PDFNet.TextExtractor.prototype.getFirstLine = function() {
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.getFirstLine", { te: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.TextExtractorLine(id);
                });
            };
            PDFNet.TextExtractor.prototype.getQuads = function(mtx, quads, quads_size) {
                checkArguments(arguments.length, 3, "getQuads", "(PDFNet.Matrix2D, number, number)", [[mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"], [quads, "number"], [quads_size, "number"]]);
                checkParamsYieldFunction("getQuads", [[mtx,
                    0]]);
                return PDFNet.messageHandler.sendWithPromise("TextExtractor.getQuads", {
                    te: this.id,
                    mtx: mtx,
                    quads: quads,
                    quads_size: quads_size,
                }, this.userPriority);
            };
            PDFNet.TextSearch.create = function() {
                return PDFNet.messageHandler.sendWithPromise("textSearchCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.TextSearch, id);
                });
            };
            PDFNet.TextSearch.prototype.begin = function(doc, pattern, mode, start_page, end_page) {
                "undefined" === typeof start_page && (start_page = -1);
                "undefined" === typeof end_page &&
                (end_page = -1);
                checkArguments(arguments.length, 3, "begin", "(PDFNet.PDFDoc, string, number, number, number)", [[doc, "PDFDoc"], [pattern, "string"], [mode, "number"], [start_page, "number"], [end_page, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("TextSearch.begin", {
                    ts: this.id,
                    doc: doc.id,
                    pattern: pattern,
                    mode: mode,
                    start_page: start_page,
                    end_page: end_page,
                }, this.userPriority);
            };
            PDFNet.TextSearch.prototype.setPattern = function(pattern) {
                checkArguments(arguments.length, 1, "setPattern", "(string)", [[pattern, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("TextSearch.setPattern", {
                    ts: this.id,
                    pattern: pattern,
                }, this.userPriority);
            };
            PDFNet.TextSearch.prototype.getMode = function() {
                return PDFNet.messageHandler.sendWithPromise("TextSearch.getMode", { ts: this.id }, this.userPriority);
            };
            PDFNet.TextSearch.prototype.setMode = function(mode) {
                checkArguments(arguments.length, 1, "setMode", "(number)", [[mode, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("TextSearch.setMode", {
                    ts: this.id,
                    mode: mode,
                }, this.userPriority);
            };
            PDFNet.TextSearch.prototype.setRightToLeftLanguage =
                function(flag) {
                    checkArguments(arguments.length, 1, "setRightToLeftLanguage", "(boolean)", [[flag, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("TextSearch.setRightToLeftLanguage", {
                        ts: this.id,
                        flag: flag,
                    }, this.userPriority);
                };
            PDFNet.TextSearch.prototype.getCurrentPage = function() {
                return PDFNet.messageHandler.sendWithPromise("TextSearch.getCurrentPage", { ts: this.id }, this.userPriority);
            };
            PDFNet.TextSearch.prototype.setOCGContext = function(ctx) {
                checkArguments(arguments.length, 1, "setOCGContext", "(PDFNet.OCGContext)",
                    [[ctx, "Object", PDFNet.OCGContext, "OCGContext"]]);
                return PDFNet.messageHandler.sendWithPromise("TextSearch.setOCGContext", {
                    te: this.id,
                    ctx: ctx.id,
                }, this.userPriority);
            };
            PDFNet.NameTree.create = function(doc, name) {
                checkArguments(arguments.length, 2, "create", "(PDFNet.SDFDoc, string)", [[doc, "SDFDoc"], [name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("nameTreeCreate", {
                    doc: doc.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.NameTree, id);
                });
            };
            PDFNet.NameTree.find = function(doc,
                name) {
                checkArguments(arguments.length, 2, "find", "(PDFNet.SDFDoc, string)", [[doc, "SDFDoc"], [name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("nameTreeFind", {
                    doc: doc.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.NameTree, id);
                });
            };
            PDFNet.NameTree.createFromObj = function(name_tree) {
                checkArguments(arguments.length, 1, "createFromObj", "(PDFNet.Obj)", [[name_tree, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("nameTreeCreateFromObj", { name_tree: name_tree.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.NameTree, id);
                });
            };
            PDFNet.NameTree.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("NameTree.copy", { d: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.NameTree, id);
                });
            };
            PDFNet.NameTree.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("NameTree.isValid", { tree: this.id }, this.userPriority);
            };
            PDFNet.NameTree.prototype.getIterator = function(key) {
                checkArguments(arguments.length,
                    1, "getIterator", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("NameTree.getIterator", {
                    tree: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DictIterator, id);
                });
            };
            PDFNet.NameTree.prototype.getValue = function(key) {
                checkArguments(arguments.length, 1, "getValue", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("NameTree.getValue", {
                    tree: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.NameTree.prototype.getIteratorBegin = function() {
                return PDFNet.messageHandler.sendWithPromise("NameTree.getIteratorBegin", { tree: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DictIterator, id);
                });
            };
            PDFNet.NameTree.prototype.put = function(key, value) {
                checkArguments(arguments.length, 2, "put", "(string, PDFNet.Obj)", [[key, "string"], [value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("NameTree.put", {
                        tree: this.id,
                        key: key,
                        value: value.id,
                    },
                    this.userPriority);
            };
            PDFNet.NameTree.prototype.eraseKey = function(key) {
                checkArguments(arguments.length, 1, "eraseKey", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("NameTree.eraseKey", {
                    tree: this.id,
                    key: key,
                }, this.userPriority);
            };
            PDFNet.NameTree.prototype.erase = function(pos) {
                checkArguments(arguments.length, 1, "erase", "(PDFNet.DictIterator)", [[pos, "Object", PDFNet.DictIterator, "DictIterator"]]);
                return PDFNet.messageHandler.sendWithPromise("NameTree.erase", { tree: this.id, pos: pos.id },
                    this.userPriority);
            };
            PDFNet.NameTree.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("NameTree.getSDFObj", { tree: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.NumberTree.create = function(number_tree) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Obj)", [[number_tree, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("numberTreeCreate", { number_tree: number_tree.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.NumberTree,
                        id);
                });
            };
            PDFNet.NumberTree.prototype.copy = function() {
                return PDFNet.messageHandler.sendWithPromise("NumberTree.copy", { tree: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.NumberTree, id);
                });
            };
            PDFNet.NumberTree.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("NumberTree.isValid", { tree: this.id }, this.userPriority);
            };
            PDFNet.NumberTree.prototype.getIterator = function(key) {
                checkArguments(arguments.length, 1, "getIterator", "(number)", [[key, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("NumberTree.getIterator",
                    { tree: this.id, key: key }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DictIterator, id);
                });
            };
            PDFNet.NumberTree.prototype.getValue = function(key) {
                checkArguments(arguments.length, 1, "getValue", "(number)", [[key, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("NumberTree.getValue", {
                    tree: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.NumberTree.prototype.getIteratorBegin = function() {
                return PDFNet.messageHandler.sendWithPromise("NumberTree.getIteratorBegin",
                    { tree: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DictIterator, id);
                });
            };
            PDFNet.NumberTree.prototype.put = function(key, value) {
                checkArguments(arguments.length, 2, "put", "(number, PDFNet.Obj)", [[key, "number"], [value, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("NumberTree.put", {
                    tree: this.id,
                    key: key,
                    value: value.id,
                }, this.userPriority);
            };
            PDFNet.NumberTree.prototype.eraseKey = function(key) {
                checkArguments(arguments.length, 1, "eraseKey", "(number)",
                    [[key, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("NumberTree.eraseKey", {
                    tree: this.id,
                    key: key,
                }, this.userPriority);
            };
            PDFNet.NumberTree.prototype.erase = function(pos) {
                checkArguments(arguments.length, 1, "erase", "(PDFNet.DictIterator)", [[pos, "Object", PDFNet.DictIterator, "DictIterator"]]);
                return PDFNet.messageHandler.sendWithPromise("NumberTree.erase", {
                    tree: this.id,
                    pos: pos.id,
                }, this.userPriority);
            };
            PDFNet.NumberTree.prototype.getSDFObj = function() {
                return PDFNet.messageHandler.sendWithPromise("NumberTree.getSDFObj",
                    { tree: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getType", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getDoc = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getDoc", { o: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SDFDoc, id);
                });
            };
            PDFNet.Obj.prototype.write = function(stream) {
                checkArguments(arguments.length, 1, "write", "(PDFNet.FilterWriter)",
                    [[stream, "Object", PDFNet.FilterWriter, "FilterWriter"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.write", {
                    o: this.id,
                    stream: stream.id,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.isEqual = function(to) {
                checkArguments(arguments.length, 1, "isEqual", "(PDFNet.Obj)", [[to, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.isEqual", {
                    o: this.id,
                    to: to.id,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.isBool = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isBool", { o: this.id },
                    this.userPriority);
            };
            PDFNet.Obj.prototype.getBool = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getBool", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.setBool = function(b) {
                checkArguments(arguments.length, 1, "setBool", "(boolean)", [[b, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.setBool", { o: this.id, b: b }, this.userPriority);
            };
            PDFNet.Obj.prototype.isNumber = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isNumber", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getNumber =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Obj.getNumber", { o: this.id }, this.userPriority);
                };
            PDFNet.Obj.prototype.setNumber = function(n) {
                checkArguments(arguments.length, 1, "setNumber", "(number)", [[n, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.setNumber", { o: this.id, n: n }, this.userPriority);
            };
            PDFNet.Obj.prototype.isNull = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isNull", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.isString = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isString",
                    { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getBuffer = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getBuffer", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.setString = function(value) {
                checkArguments(arguments.length, 1, "setString", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.setString", {
                    o: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.setUString = function(value) {
                checkArguments(arguments.length, 1, "setUString", "(string)",
                    [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.setUString", {
                    o: this.id,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.isName = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isName", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getName = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getName", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.setName = function(name) {
                checkArguments(arguments.length, 1, "setName", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.setName", {
                    o: this.id,
                    name: name,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.isIndirect = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isIndirect", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getObjNum = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getObjNum", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getGenNum = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getGenNum", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getOffset = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getOffset", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.isFree = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isFree", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.setMark = function(mark) {
                checkArguments(arguments.length, 1, "setMark", "(boolean)", [[mark, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.setMark", {
                    o: this.id,
                    mark: mark,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.isMarked =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Obj.isMarked", { o: this.id }, this.userPriority);
                };
            PDFNet.Obj.prototype.isLoaded = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isLoaded", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.isContainer = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isContainer", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.size = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.size", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getDictIterator =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Obj.getDictIterator", { o: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.DictIterator, id);
                    });
                };
            PDFNet.Obj.prototype.isDict = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isDict", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.find = function(key) {
                checkArguments(arguments.length, 1, "find", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.find", {
                    o: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DictIterator,
                        id);
                });
            };
            PDFNet.Obj.prototype.findObj = function(key) {
                checkArguments(arguments.length, 1, "findObj", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.findObj", {
                    o: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.get = function(key) {
                checkArguments(arguments.length, 1, "get", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.get", {
                    o: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DictIterator,
                        id);
                });
            };
            PDFNet.Obj.prototype.putName = function(key, name) {
                checkArguments(arguments.length, 2, "putName", "(string, string)", [[key, "string"], [name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putName", {
                    o: this.id,
                    key: key,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putArray = function(key) {
                checkArguments(arguments.length, 1, "putArray", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putArray", {
                    o: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putBool = function(key, value) {
                checkArguments(arguments.length, 2, "putBool", "(string, boolean)", [[key, "string"], [value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putBool", {
                    o: this.id,
                    key: key,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putDict = function(key) {
                checkArguments(arguments.length, 1, "putDict", "(string)",
                    [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putDict", {
                    o: this.id,
                    key: key,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putNumber = function(key, value) {
                checkArguments(arguments.length, 2, "putNumber", "(string, number)", [[key, "string"], [value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putNumber", {
                    o: this.id,
                    key: key,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putString =
                function(key, value) {
                    checkArguments(arguments.length, 2, "putString", "(string, string)", [[key, "string"], [value, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("Obj.putString", {
                        o: this.id,
                        key: key,
                        value: value,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.Obj.prototype.putStringWithSize = function(key, value, size) {
                checkArguments(arguments.length, 3, "putStringWithSize", "(string, string, number)", [[key, "string"], [value, "string"], [size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putStringWithSize",
                    { o: this.id, key: key, value: value, size: size }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putText = function(key, t) {
                checkArguments(arguments.length, 2, "putText", "(string, string)", [[key, "string"], [t, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putText", {
                    o: this.id,
                    key: key,
                    t: t,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putNull = function(key) {
                checkArguments(arguments.length, 1, "putNull",
                    "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putNull", { o: this.id, key: key }, this.userPriority);
            };
            PDFNet.Obj.prototype.put = function(key, input_obj) {
                checkArguments(arguments.length, 2, "put", "(string, PDFNet.Obj)", [[key, "string"], [input_obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.put", {
                    o: this.id,
                    key: key,
                    input_obj: input_obj.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.putRect =
                function(key, x1, y1, x2, y2) {
                    checkArguments(arguments.length, 5, "putRect", "(string, number, number, number, number)", [[key, "string"], [x1, "number"], [y1, "number"], [x2, "number"], [y2, "number"]]);
                    return PDFNet.messageHandler.sendWithPromise("Obj.putRect", {
                        o: this.id,
                        key: key,
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.Obj.prototype.putMatrix = function(key, mtx) {
                checkArguments(arguments.length, 2, "putMatrix", "(string, PDFNet.Matrix2D)", [[key, "string"],
                    [mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"]]);
                checkParamsYieldFunction("putMatrix", [[mtx, 1]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.putMatrix", {
                    o: this.id,
                    key: key,
                    mtx: mtx,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.eraseFromKey = function(key) {
                checkArguments(arguments.length, 1, "eraseFromKey", "(string)", [[key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.eraseFromKey", {
                    o: this.id,
                    key: key,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.erase =
                function(pos) {
                    checkArguments(arguments.length, 1, "erase", "(PDFNet.DictIterator)", [[pos, "Object", PDFNet.DictIterator, "DictIterator"]]);
                    return PDFNet.messageHandler.sendWithPromise("Obj.erase", {
                        o: this.id,
                        pos: pos.id,
                    }, this.userPriority);
                };
            PDFNet.Obj.prototype.rename = function(old_key, new_key) {
                checkArguments(arguments.length, 2, "rename", "(string, string)", [[old_key, "string"], [new_key, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.rename", {
                    o: this.id,
                    old_key: old_key,
                    new_key: new_key,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.isArray = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.isArray", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.getAt = function(index) {
                checkArguments(arguments.length, 1, "getAt", "(number)", [[index, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.getAt", {
                    o: this.id,
                    index: index,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertName = function(pos, name) {
                checkArguments(arguments.length, 2, "insertName",
                    "(number, string)", [[pos, "number"], [name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertName", {
                    o: this.id,
                    pos: pos,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertArray = function(pos) {
                checkArguments(arguments.length, 1, "insertArray", "(number)", [[pos, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertArray", {
                    o: this.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.Obj.prototype.insertBool = function(pos, value) {
                checkArguments(arguments.length, 2, "insertBool", "(number, boolean)", [[pos, "number"], [value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertBool", {
                    o: this.id,
                    pos: pos,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertDict = function(pos) {
                checkArguments(arguments.length, 1, "insertDict", "(number)", [[pos, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertDict",
                    { o: this.id, pos: pos }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertNumber = function(pos, value) {
                checkArguments(arguments.length, 2, "insertNumber", "(number, number)", [[pos, "number"], [value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertNumber", {
                    o: this.id,
                    pos: pos,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertString = function(pos, value) {
                checkArguments(arguments.length,
                    2, "insertString", "(number, string)", [[pos, "number"], [value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertString", {
                    o: this.id,
                    pos: pos,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertStringWithSize = function(pos, value, size) {
                checkArguments(arguments.length, 3, "insertStringWithSize", "(number, string, number)", [[pos, "number"], [value, "string"], [size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertStringWithSize",
                    { o: this.id, pos: pos, value: value, size: size }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertText = function(pos, t) {
                checkArguments(arguments.length, 2, "insertText", "(number, string)", [[pos, "number"], [t, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertText", {
                    o: this.id,
                    pos: pos,
                    t: t,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertNull = function(pos) {
                checkArguments(arguments.length,
                    1, "insertNull", "(number)", [[pos, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertNull", {
                    o: this.id,
                    pos: pos,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insert = function(pos, input_obj) {
                checkArguments(arguments.length, 2, "insert", "(number, PDFNet.Obj)", [[pos, "number"], [input_obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insert", {
                    o: this.id,
                    pos: pos,
                    input_obj: input_obj.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.Obj.prototype.insertRect = function(pos, x1, y1, x2, y2) {
                checkArguments(arguments.length, 5, "insertRect", "(number, number, number, number, number)", [[pos, "number"], [x1, "number"], [y1, "number"], [x2, "number"], [y2, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertRect", {
                    o: this.id,
                    pos: pos,
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.insertMatrix = function(pos, mtx) {
                checkArguments(arguments.length, 2, "insertMatrix",
                    "(number, PDFNet.Matrix2D)", [[pos, "number"], [mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"]]);
                checkParamsYieldFunction("insertMatrix", [[mtx, 1]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.insertMatrix", {
                    o: this.id,
                    pos: pos,
                    mtx: mtx,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackName = function(name) {
                checkArguments(arguments.length, 1, "pushBackName", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackName",
                    { o: this.id, name: name }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackArray = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackArray", { o: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackBool = function(value) {
                checkArguments(arguments.length, 1, "pushBackBool", "(boolean)", [[value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackBool", {
                    o: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackDict = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackDict", { o: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackNumber = function(value) {
                checkArguments(arguments.length, 1, "pushBackNumber", "(number)", [[value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackNumber", {
                    o: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackString = function(value) {
                checkArguments(arguments.length, 1, "pushBackString", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackString", {
                    o: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackStringWithSize = function(value, size) {
                checkArguments(arguments.length, 2, "pushBackStringWithSize",
                    "(string, number)", [[value, "string"], [size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackStringWithSize", {
                    o: this.id,
                    value: value,
                    size: size,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackText = function(t) {
                checkArguments(arguments.length, 1, "pushBackText", "(string)", [[t, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackText", {
                    o: this.id,
                    t: t,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.Obj.prototype.pushBackNull = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackNull", { o: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBack = function(input_obj) {
                checkArguments(arguments.length, 1, "pushBack", "(PDFNet.Obj)", [[input_obj, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBack", {
                    o: this.id,
                    input_obj: input_obj.id,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.Obj.prototype.pushBackRect = function(x1, y1, x2, y2) {
                checkArguments(arguments.length, 4, "pushBackRect", "(number, number, number, number)", [[x1, "number"], [y1, "number"], [x2, "number"], [y2, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackRect", {
                    o: this.id,
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.pushBackMatrix = function(mtx) {
                checkArguments(arguments.length, 1, "pushBackMatrix", "(PDFNet.Matrix2D)",
                    [[mtx, "Structure", PDFNet.Matrix2D, "Matrix2D"]]);
                checkParamsYieldFunction("pushBackMatrix", [[mtx, 0]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.pushBackMatrix", {
                    o: this.id,
                    mtx: mtx,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.Obj.prototype.eraseAt = function(pos) {
                checkArguments(arguments.length, 1, "eraseAt", "(number)", [[pos, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.eraseAt", { o: this.id, pos: pos }, this.userPriority);
            };
            PDFNet.Obj.prototype.isStream =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("Obj.isStream", { o: this.id }, this.userPriority);
                };
            PDFNet.Obj.prototype.getRawStreamLength = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getRawStreamLength", { o: this.id }, this.userPriority);
            };
            PDFNet.Obj.prototype.setStreamData = function(data, data_size) {
                checkArguments(arguments.length, 2, "setStreamData", "(string, number)", [[data, "string"], [data_size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.setStreamData", {
                    obj: this.id,
                    data: data, data_size: data_size,
                }, this.userPriority);
            };
            PDFNet.Obj.prototype.setStreamDataWithFilter = function(data, data_size, filter_chain) {
                "undefined" === typeof filter_chain && (filter_chain = new PDFNet.Filter("0"));
                checkArguments(arguments.length, 2, "setStreamDataWithFilter", "(string, number, PDFNet.Filter)", [[data, "const char* = 0"], [data_size, "number"], [filter_chain, "Object", PDFNet.Filter, "Filter"]]);
                0 != filter_chain.id && avoidCleanup(filter_chain.id);
                return PDFNet.messageHandler.sendWithPromise("Obj.setStreamDataWithFilter",
                    {
                        obj: this.id,
                        data: data,
                        data_size: data_size,
                        no_own_filter_chain: filter_chain.id,
                    }, this.userPriority);
            };
            PDFNet.Obj.prototype.getRawStream = function(decrypt) {
                checkArguments(arguments.length, 1, "getRawStream", "(boolean)", [[decrypt, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("Obj.getRawStream", {
                    o: this.id,
                    decrypt: decrypt,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.Obj.prototype.getDecodedStream = function() {
                return PDFNet.messageHandler.sendWithPromise("Obj.getDecodedStream",
                    { o: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Filter, id);
                });
            };
            PDFNet.ObjSet.create = function() {
                return PDFNet.messageHandler.sendWithPromise("objSetCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ObjSet, id);
                });
            };
            PDFNet.ObjSet.prototype.createName = function(name) {
                checkArguments(arguments.length, 1, "createName", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createName", {
                    set: this.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.ObjSet.prototype.createArray = function() {
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createArray", { set: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ObjSet.prototype.createBool = function(value) {
                checkArguments(arguments.length, 1, "createBool", "(boolean)", [[value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createBool", {
                    set: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.ObjSet.prototype.createDict = function() {
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createDict", { set: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ObjSet.prototype.createNull = function() {
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createNull", { set: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ObjSet.prototype.createNumber = function(value) {
                checkArguments(arguments.length, 1, "createNumber",
                    "(number)", [[value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createNumber", {
                    set: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ObjSet.prototype.createString = function(value) {
                checkArguments(arguments.length, 1, "createString", "(string)", [[value, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createString", {
                    set: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.ObjSet.prototype.createFromJson = function(json) {
                checkArguments(arguments.length, 1, "createFromJson", "(string)", [[json, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("ObjSet.createFromJson", {
                    set: this.id,
                    json: json,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.createShallowCopy = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createShallowCopy", { source: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SDFDoc,
                        id);
                });
            };
            PDFNet.SDFDoc.prototype.releaseFileHandles = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.releaseFileHandles", { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.isEncrypted = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.isEncrypted", { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.initStdSecurityHandler = function(password, password_sz) {
                checkArguments(arguments.length, 2, "initStdSecurityHandler", "(string, number)", [[password, "string"], [password_sz,
                    "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.initStdSecurityHandler", {
                    doc: this.id,
                    password: password,
                    password_sz: password_sz,
                }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.initStdSecurityHandlerUString = function(password) {
                checkArguments(arguments.length, 1, "initStdSecurityHandlerUString", "(string)", [[password, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.initStdSecurityHandlerUString", {
                    doc: this.id,
                    password: password,
                }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.isModified =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("SDFDoc.isModified", { doc: this.id }, this.userPriority);
                };
            PDFNet.SDFDoc.prototype.hasRepairedXRef = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.hasRepairedXRef", { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.isFullSaveRequired = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.isFullSaveRequired", { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.getTrailer = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.getTrailer",
                    { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.getObj = function(obj_num) {
                checkArguments(arguments.length, 1, "getObj", "(number)", [[obj_num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.getObj", {
                    doc: this.id,
                    obj_num: obj_num,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.importObj = function(obj, deep_copy) {
                checkArguments(arguments.length, 2, "importObj", "(PDFNet.Obj, boolean)",
                    [[obj, "Object", PDFNet.Obj, "Obj"], [deep_copy, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.importObj", {
                    doc: this.id,
                    obj: obj.id,
                    deep_copy: deep_copy,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.importObjsWithExcludeList = function(obj_list, exclude_list) {
                checkArguments(arguments.length, 2, "importObjsWithExcludeList", "(Array<PDFNet.Obj>, Array<PDFNet.Obj>)", [[obj_list, "Array"], [exclude_list, "Array"]]);
                obj_list = Array.from(obj_list,
                    function(x) {
                        return x.id;
                    });
                exclude_list = Array.from(exclude_list, function(x) {
                    return x.id;
                });
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.importObjsWithExcludeList", {
                    doc: this.id,
                    obj_list: obj_list,
                    exclude_list: exclude_list,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.xRefSize = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.xRefSize", { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.clearMarks = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.clearMarks",
                    { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.saveMemory = function(flags, header) {
                checkArguments(arguments.length, 2, "saveMemory", "(number, string)", [[flags, "number"], [header, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.saveMemory", {
                    doc: this.id,
                    flags: flags,
                    header: header,
                }, this.userPriority).then(function(id) {
                    return new Uint8Array(id);
                });
            };
            PDFNet.SDFDoc.prototype.saveStream = function(stream, flags, header) {
                checkArguments(arguments.length, 3, "saveStream", "(PDFNet.Filter, number, string)",
                    [[stream, "Object", PDFNet.Filter, "Filter"], [flags, "number"], [header, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.saveStream", {
                    doc: this.id,
                    stream: stream.id,
                    flags: flags,
                    header: header,
                }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.getHeader = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.getHeader", { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.getSecurityHandler = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.getSecurityHandler", { doc: this.id },
                    this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.SecurityHandler, id);
                });
            };
            PDFNet.SDFDoc.prototype.setSecurityHandler = function(handler) {
                checkArguments(arguments.length, 1, "setSecurityHandler", "(PDFNet.SecurityHandler)", [[handler, "Object", PDFNet.SecurityHandler, "SecurityHandler"]]);
                0 != handler.id && avoidCleanup(handler.id);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.setSecurityHandler", {
                    doc: this.id,
                    no_own_handler: handler.id,
                }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.removeSecurity =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("SDFDoc.removeSecurity", { doc: this.id }, this.userPriority);
                };
            PDFNet.SDFDoc.prototype.swap = function(obj_num1, obj_num2) {
                checkArguments(arguments.length, 2, "swap", "(number, number)", [[obj_num1, "number"], [obj_num2, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.swap", {
                    doc: this.id,
                    obj_num1: obj_num1,
                    obj_num2: obj_num2,
                }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.isLinearized = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.isLinearized",
                    { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.getLinearizationDict = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.getLinearizationDict", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.getHintStream = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.getHintStream", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.enableDiskCaching =
                function(use_cache_flag) {
                    checkArguments(arguments.length, 1, "enableDiskCaching", "(boolean)", [[use_cache_flag, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("SDFDoc.enableDiskCaching", {
                        doc: this.id,
                        use_cache_flag: use_cache_flag,
                    }, this.userPriority);
                };
            PDFNet.SDFDoc.prototype.lock = function() {
                var me = this;
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.lock", { doc: this.id }, this.userPriority).then(function() {
                    lockedObjects.push({ name: "SDFDoc", id: me.id, unlocktype: "unlock" });
                });
            };
            PDFNet.SDFDoc.prototype.unlock =
                function() {
                    var me = this;
                    return PDFNet.messageHandler.sendWithPromise("SDFDoc.unlock", { doc: this.id }, this.userPriority).then(function() {
                        unregisterLockedObject(me);
                    });
                };
            PDFNet.SDFDoc.prototype.lockRead = function() {
                var me = this;
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.lockRead", { doc: this.id }, this.userPriority).then(function() {
                    lockedObjects.push({ name: "SDFDoc", id: me.id, unlocktype: "unlockRead" });
                });
            };
            PDFNet.SDFDoc.prototype.unlockRead = function() {
                var me = this;
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.unlockRead",
                    { doc: this.id }, this.userPriority).then(function() {
                    unregisterLockedObject(me);
                });
            };
            PDFNet.SDFDoc.prototype.tryLock = function() {
                var me = this;
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.tryLock", { doc: this.id }, this.userPriority).then(function(success) {
                    success && lockedObjects.push({ name: "SDFDoc", id: me.id, unlocktype: "unlock" });
                });
            };
            PDFNet.SDFDoc.prototype.tryLockRead = function() {
                var me = this;
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.tryLockRead", { doc: this.id }, this.userPriority).then(function(success) {
                    success &&
                    lockedObjects.push({ name: "SDFDoc", id: me.id, unlocktype: "unlockRead" });
                });
            };
            PDFNet.SDFDoc.prototype.getFileName = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.getFileName", { doc: this.id }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.createIndirectName = function(name) {
                checkArguments(arguments.length, 1, "createIndirectName", "(string)", [[name, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectName", {
                    doc: this.id,
                    name: name,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectArray = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectArray", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectBool = function(value) {
                checkArguments(arguments.length, 1, "createIndirectBool", "(boolean)", [[value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectBool", {
                    doc: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj,
                        id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectDict = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectDict", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectNull = function() {
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectNull", { doc: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectNumber = function(value) {
                checkArguments(arguments.length,
                    1, "createIndirectNumber", "(number)", [[value, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectNumber", {
                    doc: this.id,
                    value: value,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectString = function(buf_value) {
                checkArguments(arguments.length, 1, "createIndirectString", "(ArrayBuffer|TypedArray)", [[buf_value, "ArrayBuffer"]]);
                var buf_valueArrayBuffer = getArrayBuffer(buf_value, !1);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectString",
                    { doc: this.id, buf_value: buf_valueArrayBuffer }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectStringFromUString = function(str) {
                checkArguments(arguments.length, 1, "createIndirectStringFromUString", "(string)", [[str, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectStringFromUString", {
                    doc: this.id,
                    str: str,
                }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SDFDoc.prototype.createIndirectStreamFromFilter =
                function(data, filter_chain) {
                    "undefined" === typeof filter_chain && (filter_chain = new PDFNet.Filter("0"));
                    checkArguments(arguments.length, 1, "createIndirectStreamFromFilter", "(PDFNet.FilterReader, PDFNet.Filter)", [[data, "Object", PDFNet.FilterReader, "FilterReader"], [filter_chain, "Object", PDFNet.Filter, "Filter"]]);
                    0 != filter_chain.id && avoidCleanup(filter_chain.id);
                    return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectStreamFromFilter", {
                            doc: this.id,
                            data: data.id,
                            no_own_filter_chain: filter_chain.id,
                        },
                        this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.SDFDoc.prototype.createIndirectStream = function(data, data_size, filter_chain) {
                "undefined" === typeof filter_chain && (filter_chain = new PDFNet.Filter("0"));
                checkArguments(arguments.length, 2, "createIndirectStream", "(string, number, PDFNet.Filter)", [[data, "const char* = 0"], [data_size, "number"], [filter_chain, "Object", PDFNet.Filter, "Filter"]]);
                0 != filter_chain.id && avoidCleanup(filter_chain.id);
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.createIndirectStream",
                    {
                        doc: this.id,
                        data: data,
                        data_size: data_size,
                        no_own_filter_chain: filter_chain.id,
                    }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Obj, id);
                });
            };
            PDFNet.SecurityHandler.prototype.clone = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.clone", { sh: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.SecurityHandler, id);
                });
            };
            PDFNet.SecurityHandler.prototype.getPermission = function(p) {
                checkArguments(arguments.length, 1, "getPermission", "(number)",
                    [[p, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.getPermission", {
                    sh: this.id,
                    p: p,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.getKeyLength = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.getKeyLength", { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.getEncryptionAlgorithmID = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.getEncryptionAlgorithmID", { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.getHandlerDocName =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("SecurityHandler.getHandlerDocName", { sh: this.id }, this.userPriority);
                };
            PDFNet.SecurityHandler.prototype.isModified = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.isModified", { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.setModified = function(is_modified) {
                "undefined" === typeof is_modified && (is_modified = !0);
                checkArguments(arguments.length, 0, "setModified", "(boolean)", [[is_modified, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.setModified",
                    { sh: this.id, is_modified: is_modified }, this.userPriority);
            };
            PDFNet.SecurityHandler.create = function(crypt_type) {
                checkArguments(arguments.length, 1, "create", "(number)", [[crypt_type, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("securityHandlerCreate", { crypt_type: crypt_type }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.SecurityHandler, id);
                });
            };
            PDFNet.SecurityHandler.createFromEncCode = function(name, key_len, enc_code) {
                checkArguments(arguments.length, 3, "createFromEncCode",
                    "(string, number, number)", [[name, "string"], [key_len, "number"], [enc_code, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("securityHandlerCreateFromEncCode", {
                    name: name,
                    key_len: key_len,
                    enc_code: enc_code,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.SecurityHandler, id);
                });
            };
            PDFNet.SecurityHandler.createDefault = function() {
                return PDFNet.messageHandler.sendWithPromise("securityHandlerCreateDefault", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.SecurityHandler,
                        id);
                });
            };
            PDFNet.SecurityHandler.prototype.setPermission = function(perm, value) {
                checkArguments(arguments.length, 2, "setPermission", "(number, boolean)", [[perm, "number"], [value, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.setPermission", {
                    sh: this.id,
                    perm: perm,
                    value: value,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.changeRevisionNumber = function(rev_num) {
                checkArguments(arguments.length, 1, "changeRevisionNumber", "(number)", [[rev_num, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.changeRevisionNumber",
                    { sh: this.id, rev_num: rev_num }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.setEncryptMetadata = function(encrypt_metadata) {
                checkArguments(arguments.length, 1, "setEncryptMetadata", "(boolean)", [[encrypt_metadata, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.setEncryptMetadata", {
                    sh: this.id,
                    encrypt_metadata: encrypt_metadata,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.getRevisionNumber = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.getRevisionNumber",
                    { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.isUserPasswordRequired = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.isUserPasswordRequired", { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.isMasterPasswordRequired = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.isMasterPasswordRequired", { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.isAES = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.isAES",
                    { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.isAESObj = function(stream) {
                checkArguments(arguments.length, 1, "isAESObj", "(PDFNet.Obj)", [[stream, "Object", PDFNet.Obj, "Obj"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.isAESObj", {
                    sh: this.id,
                    stream: stream.id,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.isRC4 = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.isRC4", { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.changeUserPasswordUString =
                function(password) {
                    checkArguments(arguments.length, 1, "changeUserPasswordUString", "(string)", [[password, "string"]]);
                    return PDFNet.messageHandler.sendWithPromise("SecurityHandler.changeUserPasswordUString", {
                        sh: this.id,
                        password: password,
                    }, this.userPriority);
                };
            PDFNet.SecurityHandler.prototype.changeUserPasswordBuffer = function(password_buf) {
                checkArguments(arguments.length, 1, "changeUserPasswordBuffer", "(ArrayBuffer|TypedArray)", [[password_buf, "ArrayBuffer"]]);
                var password_bufArrayBuffer = getArrayBuffer(password_buf,
                    !1);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.changeUserPasswordBuffer", {
                    sh: this.id,
                    password_buf: password_bufArrayBuffer,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.changeMasterPasswordUString = function(password) {
                checkArguments(arguments.length, 1, "changeMasterPasswordUString", "(string)", [[password, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.changeMasterPasswordUString", {
                    sh: this.id,
                    password: password,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.changeMasterPasswordBuffer =
                function(password_buf) {
                    checkArguments(arguments.length, 1, "changeMasterPasswordBuffer", "(ArrayBuffer|TypedArray)", [[password_buf, "ArrayBuffer"]]);
                    var password_bufArrayBuffer = getArrayBuffer(password_buf, !1);
                    return PDFNet.messageHandler.sendWithPromise("SecurityHandler.changeMasterPasswordBuffer", {
                        sh: this.id,
                        password_buf: password_bufArrayBuffer,
                    }, this.userPriority);
                };
            PDFNet.SecurityHandler.prototype.initPasswordUString = function(password) {
                checkArguments(arguments.length, 1, "initPasswordUString", "(string)",
                    [[password, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.initPasswordUString", {
                    sh: this.id,
                    password: password,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.initPasswordBuffer = function(password_buf) {
                checkArguments(arguments.length, 1, "initPasswordBuffer", "(ArrayBuffer|TypedArray)", [[password_buf, "ArrayBuffer"]]);
                var password_bufArrayBuffer = getArrayBuffer(password_buf, !1);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.initPasswordBuffer", {
                        sh: this.id,
                        password_buf: password_bufArrayBuffer,
                    },
                    this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.authorize = function(p) {
                checkArguments(arguments.length, 1, "authorize", "(number)", [[p, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.authorize", {
                    sh: this.id,
                    p: p,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.authorizeFailed = function() {
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.authorizeFailed", { sh: this.id }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.getAuthorizationData = function(req_opr) {
                checkArguments(arguments.length,
                    1, "getAuthorizationData", "(number)", [[req_opr, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.getAuthorizationData", {
                    sh: this.id,
                    req_opr: req_opr,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.editSecurityData = function(doc) {
                checkArguments(arguments.length, 1, "editSecurityData", "(PDFNet.SDFDoc)", [[doc, "SDFDoc"]]);
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.editSecurityData", {
                    sh: this.id,
                    doc: doc.id,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.fillEncryptDict =
                function(doc) {
                    checkArguments(arguments.length, 1, "fillEncryptDict", "(PDFNet.SDFDoc)", [[doc, "SDFDoc"]]);
                    return PDFNet.messageHandler.sendWithPromise("SecurityHandler.fillEncryptDict", {
                        sh: this.id,
                        doc: doc.id,
                    }, this.userPriority).then(function(id) {
                        return createPDFNetObj(PDFNet.Obj, id);
                    });
                };
            PDFNet.SignatureHandler.prototype.getName = function() {
                return PDFNet.messageHandler.sendWithPromise("SignatureHandler.getName", { signature_handler: this.id }, this.userPriority);
            };
            PDFNet.SignatureHandler.prototype.reset = function() {
                return PDFNet.messageHandler.sendWithPromise("SignatureHandler.reset",
                    { signature_handler: this.id }, this.userPriority);
            };
            PDFNet.SignatureHandler.prototype.destructor = function() {
                return PDFNet.messageHandler.sendWithPromise("SignatureHandler.destructor", { signature_handler: this.id }, this.userPriority);
            };
            PDFNet.UndoManager.prototype.discardAllSnapshots = function() {
                return PDFNet.messageHandler.sendWithPromise("UndoManager.discardAllSnapshots", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DocSnapshot, id);
                });
            };
            PDFNet.UndoManager.prototype.undo =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("UndoManager.undo", { self: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.ResultSnapshot, id);
                    });
                };
            PDFNet.UndoManager.prototype.canUndo = function() {
                return PDFNet.messageHandler.sendWithPromise("UndoManager.canUndo", { self: this.id }, this.userPriority);
            };
            PDFNet.UndoManager.prototype.getNextUndoSnapshot = function() {
                return PDFNet.messageHandler.sendWithPromise("UndoManager.getNextUndoSnapshot", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DocSnapshot,
                        id);
                });
            };
            PDFNet.UndoManager.prototype.redo = function() {
                return PDFNet.messageHandler.sendWithPromise("UndoManager.redo", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ResultSnapshot, id);
                });
            };
            PDFNet.UndoManager.prototype.canRedo = function() {
                return PDFNet.messageHandler.sendWithPromise("UndoManager.canRedo", { self: this.id }, this.userPriority);
            };
            PDFNet.UndoManager.prototype.getNextRedoSnapshot = function() {
                return PDFNet.messageHandler.sendWithPromise("UndoManager.getNextRedoSnapshot",
                    { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DocSnapshot, id);
                });
            };
            PDFNet.UndoManager.prototype.takeSnapshot = function() {
                return PDFNet.messageHandler.sendWithPromise("UndoManager.takeSnapshot", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ResultSnapshot, id);
                });
            };
            PDFNet.ResultSnapshot.prototype.currentState = function() {
                return PDFNet.messageHandler.sendWithPromise("ResultSnapshot.currentState", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DocSnapshot,
                        id);
                });
            };
            PDFNet.ResultSnapshot.prototype.previousState = function() {
                return PDFNet.messageHandler.sendWithPromise("ResultSnapshot.previousState", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.DocSnapshot, id);
                });
            };
            PDFNet.ResultSnapshot.prototype.isOk = function() {
                return PDFNet.messageHandler.sendWithPromise("ResultSnapshot.isOk", { self: this.id }, this.userPriority);
            };
            PDFNet.ResultSnapshot.prototype.isNullTransition = function() {
                return PDFNet.messageHandler.sendWithPromise("ResultSnapshot.isNullTransition",
                    { self: this.id }, this.userPriority);
            };
            PDFNet.DocSnapshot.prototype.getHash = function() {
                return PDFNet.messageHandler.sendWithPromise("DocSnapshot.getHash", { self: this.id }, this.userPriority);
            };
            PDFNet.DocSnapshot.prototype.isValid = function() {
                return PDFNet.messageHandler.sendWithPromise("DocSnapshot.isValid", { self: this.id }, this.userPriority);
            };
            PDFNet.DocSnapshot.prototype.equals = function(snapshot) {
                checkArguments(arguments.length, 1, "equals", "(PDFNet.DocSnapshot)", [[snapshot, "Object", PDFNet.DocSnapshot, "DocSnapshot"]]);
                return PDFNet.messageHandler.sendWithPromise("DocSnapshot.equals", {
                    self: this.id,
                    snapshot: snapshot.id,
                }, this.userPriority);
            };
            PDFNet.VerificationOptions.create = function(in_level) {
                checkArguments(arguments.length, 1, "create", "(number)", [[in_level, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("verificationOptionsCreate", { in_level: in_level }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.VerificationOptions, id);
                });
            };
            PDFNet.VerificationOptions.prototype.addTrustedCertificate =
                function(in_certificate_buf) {
                    checkArguments(arguments.length, 1, "addTrustedCertificate", "(ArrayBuffer|TypedArray)", [[in_certificate_buf, "ArrayBuffer"]]);
                    var in_certificate_bufArrayBuffer = getArrayBuffer(in_certificate_buf, !1);
                    return PDFNet.messageHandler.sendWithPromise("VerificationOptions.addTrustedCertificate", {
                        self: this.id,
                        in_certificate_buf: in_certificate_bufArrayBuffer,
                    }, this.userPriority);
                };
            PDFNet.VerificationOptions.prototype.addTrustedCertificateUString = function(in_filepath) {
                checkArguments(arguments.length,
                    1, "addTrustedCertificateUString", "(string)", [[in_filepath, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.addTrustedCertificateUString", {
                    self: this.id,
                    in_filepath: in_filepath,
                }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.addTrustedCertificates = function(in_P7C_binary_DER_certificates_file_data, in_size) {
                checkArguments(arguments.length, 2, "addTrustedCertificates", "(number, number)", [[in_P7C_binary_DER_certificates_file_data, "number"], [in_size, "number"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.addTrustedCertificates",
                    {
                        self: this.id,
                        in_P7C_binary_DER_certificates_file_data: in_P7C_binary_DER_certificates_file_data,
                        in_size: in_size,
                    }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.enableModificationVerification = function(in_on_or_off) {
                checkArguments(arguments.length, 1, "enableModificationVerification", "(boolean)", [[in_on_or_off, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.enableModificationVerification", {
                    self: this.id,
                    in_on_or_off: in_on_or_off,
                }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.enableDigestVerification =
                function(in_on_or_off) {
                    checkArguments(arguments.length, 1, "enableDigestVerification", "(boolean)", [[in_on_or_off, "boolean"]]);
                    return PDFNet.messageHandler.sendWithPromise("VerificationOptions.enableDigestVerification", {
                        self: this.id,
                        in_on_or_off: in_on_or_off,
                    }, this.userPriority);
                };
            PDFNet.VerificationOptions.prototype.enableTrustVerification = function(in_on_or_off) {
                checkArguments(arguments.length, 1, "enableTrustVerification", "(boolean)", [[in_on_or_off, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.enableTrustVerification",
                    { self: this.id, in_on_or_off: in_on_or_off }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.setRevocationProxyPrefix = function(in_str) {
                checkArguments(arguments.length, 1, "setRevocationProxyPrefix", "(string)", [[in_str, "string"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.setRevocationProxyPrefix", {
                    self: this.id,
                    in_str: in_str,
                }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.enableOnlineCRLRevocationChecking = function(in_on_or_off) {
                checkArguments(arguments.length, 1,
                    "enableOnlineCRLRevocationChecking", "(boolean)", [[in_on_or_off, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.enableOnlineCRLRevocationChecking", {
                    self: this.id,
                    in_on_or_off: in_on_or_off,
                }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.enableOnlineOCSPRevocationChecking = function(in_on_or_off) {
                checkArguments(arguments.length, 1, "enableOnlineOCSPRevocationChecking", "(boolean)", [[in_on_or_off, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.enableOnlineOCSPRevocationChecking",
                    { self: this.id, in_on_or_off: in_on_or_off }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.enableOnlineRevocationChecking = function(in_on_or_off) {
                checkArguments(arguments.length, 1, "enableOnlineRevocationChecking", "(boolean)", [[in_on_or_off, "boolean"]]);
                return PDFNet.messageHandler.sendWithPromise("VerificationOptions.enableOnlineRevocationChecking", {
                    self: this.id,
                    in_on_or_off: in_on_or_off,
                }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getDigitalSignatureField = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getDigitalSignatureField",
                    { self: this.id }, this.userPriority).then(function(id) {
                    return new PDFNet.DigitalSignatureField(id);
                });
            };
            PDFNet.VerificationResult.prototype.getVerificationStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getVerificationStatus", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getDocumentStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getDocumentStatus", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getDigestStatus =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("VerificationResult.getDigestStatus", { self: this.id }, this.userPriority);
                };
            PDFNet.VerificationResult.prototype.getTrustStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getTrustStatus", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getPermissionsStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getPermissionsStatus", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getTrustVerificationResult =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("VerificationResult.getTrustVerificationResult", { self: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.TrustVerificationResult, id);
                    });
                };
            PDFNet.VerificationResult.prototype.hasTrustVerificationResult = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.hasTrustVerificationResult", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getDisallowedChanges = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getDisallowedChanges",
                    { self: this.id }, this.userPriority).then(function(idArray) {
                    for (var retArray = [], i = 0; i < idArray.length; ++i) {
                        var id = idArray[i];
                        if ("0" === id) return null;
                        id = new PDFNet.DisallowedChange(id);
                        retArray.push(id);
                        createdObjects.push({ name: id.name, id: id.id });
                    }
                    return retArray;
                });
            };
            PDFNet.VerificationResult.prototype.getDigestAlgorithm = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getDigestAlgorithm", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getDocumentStatusAsString =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("VerificationResult.getDocumentStatusAsString", { self: this.id }, this.userPriority);
                };
            PDFNet.VerificationResult.prototype.getDigestStatusAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getDigestStatusAsString", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getTrustStatusAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getTrustStatusAsString", { self: this.id },
                    this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getPermissionsStatusAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getPermissionsStatusAsString", { self: this.id }, this.userPriority);
            };
            PDFNet.VerificationResult.prototype.getUnsupportedFeatures = function() {
                return PDFNet.messageHandler.sendWithPromise("VerificationResult.getUnsupportedFeatures", { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getVerificationStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getVerificationStatus",
                    { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getCMSDigestStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getCMSDigestStatus", { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getMessageImprintDigestStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getMessageImprintDigestStatus", { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getTrustStatus =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getTrustStatus", { self: this.id }, this.userPriority);
                };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getCMSDigestStatusAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getCMSDigestStatusAsString", { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getMessageImprintDigestStatusAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getMessageImprintDigestStatusAsString",
                    { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getTrustStatusAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getTrustStatusAsString", { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.hasTrustVerificationResult = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.hasTrustVerificationResult", { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getTrustVerificationResult =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getTrustVerificationResult", { self: this.id }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.TrustVerificationResult, id);
                    });
                };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getCMSSignatureDigestAlgorithm = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getCMSSignatureDigestAlgorithm", { self: this.id }, this.userPriority);
            };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getMessageImprintDigestAlgorithm =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getMessageImprintDigestAlgorithm", { self: this.id }, this.userPriority);
                };
            PDFNet.EmbeddedTimestampVerificationResult.prototype.getUnsupportedFeatures = function() {
                return PDFNet.messageHandler.sendWithPromise("EmbeddedTimestampVerificationResult.getUnsupportedFeatures", { self: this.id }, this.userPriority);
            };
            PDFNet.TrustVerificationResult.prototype.wasSuccessful = function() {
                return PDFNet.messageHandler.sendWithPromise("TrustVerificationResult.wasSuccessful",
                    { self: this.id }, this.userPriority);
            };
            PDFNet.TrustVerificationResult.prototype.getResultString = function() {
                return PDFNet.messageHandler.sendWithPromise("TrustVerificationResult.getResultString", { self: this.id }, this.userPriority);
            };
            PDFNet.TrustVerificationResult.prototype.getTimeOfTrustVerification = function() {
                return PDFNet.messageHandler.sendWithPromise("TrustVerificationResult.getTimeOfTrustVerification", { self: this.id }, this.userPriority);
            };
            PDFNet.TrustVerificationResult.prototype.getTimeOfTrustVerificationEnum =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("TrustVerificationResult.getTimeOfTrustVerificationEnum", { self: this.id }, this.userPriority);
                };
            PDFNet.TrustVerificationResult.prototype.hasEmbeddedTimestampVerificationResult = function() {
                return PDFNet.messageHandler.sendWithPromise("TrustVerificationResult.hasEmbeddedTimestampVerificationResult", { self: this.id }, this.userPriority);
            };
            PDFNet.TrustVerificationResult.prototype.getEmbeddedTimestampVerificationResult = function() {
                return PDFNet.messageHandler.sendWithPromise("TrustVerificationResult.getEmbeddedTimestampVerificationResult",
                    { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.EmbeddedTimestampVerificationResult, id);
                });
            };
            PDFNet.TrustVerificationResult.prototype.getCertPath = function() {
                return PDFNet.messageHandler.sendWithPromise("TrustVerificationResult.getCertPath", { self: this.id }, this.userPriority).then(function(idArray) {
                    for (var retArray = [], i = 0; i < idArray.length; ++i) {
                        var id = idArray[i];
                        if ("0" === id) return null;
                        id = new PDFNet.X509Certificate(id);
                        retArray.push(id);
                        createdObjects.push({
                            name: id.name,
                            id: id.id,
                        });
                    }
                    return retArray;
                });
            };
            PDFNet.DisallowedChange.prototype.getObjNum = function() {
                return PDFNet.messageHandler.sendWithPromise("DisallowedChange.getObjNum", { self: this.id }, this.userPriority);
            };
            PDFNet.DisallowedChange.prototype.getType = function() {
                return PDFNet.messageHandler.sendWithPromise("DisallowedChange.getType", { self: this.id }, this.userPriority);
            };
            PDFNet.DisallowedChange.prototype.getTypeAsString = function() {
                return PDFNet.messageHandler.sendWithPromise("DisallowedChange.getTypeAsString", { self: this.id },
                    this.userPriority);
            };
            PDFNet.X509Extension.prototype.isCritical = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Extension.isCritical", { self: this.id }, this.userPriority);
            };
            PDFNet.X509Extension.prototype.getObjectIdentifier = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Extension.getObjectIdentifier", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ObjectIdentifier, id);
                });
            };
            PDFNet.X509Extension.prototype.toString = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Extension.toString",
                    { self: this.id }, this.userPriority);
            };
            PDFNet.X509Extension.prototype.getData = function() {
                return PDFNet.messageHandler.sendWithPromise("X509Extension.getData", { self: this.id }, this.userPriority).then(function(id) {
                    return new Uint8Array(id);
                });
            };
            PDFNet.X501AttributeTypeAndValue.prototype.getAttributeTypeOID = function() {
                return PDFNet.messageHandler.sendWithPromise("X501AttributeTypeAndValue.getAttributeTypeOID", { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ObjectIdentifier,
                        id);
                });
            };
            PDFNet.X501AttributeTypeAndValue.prototype.getStringValue = function() {
                return PDFNet.messageHandler.sendWithPromise("X501AttributeTypeAndValue.getStringValue", { self: this.id }, this.userPriority);
            };
            PDFNet.ByteRange.prototype.getStartOffset = function() {
                checkThisYieldFunction("getStartOffset", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ByteRange.getStartOffset", { self: this }, this.userPriority);
            };
            PDFNet.ByteRange.prototype.getEndOffset = function() {
                checkThisYieldFunction("getEndOffset",
                    this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ByteRange.getEndOffset", { self: this }, this.userPriority);
            };
            PDFNet.ByteRange.prototype.getSize = function() {
                checkThisYieldFunction("getSize", this.yieldFunction);
                return PDFNet.messageHandler.sendWithPromise("ByteRange.getSize", { self: this }, this.userPriority);
            };
            PDFNet.TimestampingTestResult.prototype.getStatus = function() {
                return PDFNet.messageHandler.sendWithPromise("TimestampingTestResult.getStatus", { self: this.id }, this.userPriority);
            };
            PDFNet.TimestampingTestResult.prototype.getString =
                function() {
                    return PDFNet.messageHandler.sendWithPromise("TimestampingTestResult.getString", { self: this.id }, this.userPriority);
                };
            PDFNet.TimestampingTestResult.prototype.hasResponseVerificationResult = function() {
                return PDFNet.messageHandler.sendWithPromise("TimestampingTestResult.hasResponseVerificationResult", { self: this.id }, this.userPriority);
            };
            PDFNet.TimestampingTestResult.prototype.getResponseVerificationResult = function() {
                return PDFNet.messageHandler.sendWithPromise("TimestampingTestResult.getResponseVerificationResult",
                    { self: this.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.EmbeddedTimestampVerificationResult, id);
                });
            };
            PDFNet.ActionParameter.create = function(action) {
                checkArguments(arguments.length, 1, "create", "(PDFNet.Action)", [[action, "Object", PDFNet.Action, "Action"]]);
                return PDFNet.messageHandler.sendWithPromise("actionParameterCreate", { action: action.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ActionParameter, id);
                });
            };
            PDFNet.Action.prototype.parameterCreateWithField =
                function(field) {
                    checkArguments(arguments.length, 1, "parameterCreateWithField", "(PDFNet.Field)", [[field, "Structure", PDFNet.Field, "Field"]]);
                    checkParamsYieldFunction("parameterCreateWithField", [[field, 0]]);
                    return PDFNet.messageHandler.sendWithPromise("Action.parameterCreateWithField", {
                        action: this.id,
                        field: field,
                    }, this.userPriority).then(function(id) {
                        return createDestroyableObj(PDFNet.ActionParameter, id);
                    });
                };
            PDFNet.Action.prototype.parameterCreateWithAnnot = function(annot) {
                checkArguments(arguments.length,
                    1, "parameterCreateWithAnnot", "(PDFNet.Annot)", [[annot, "Object", PDFNet.Annot, "Annot"]]);
                return PDFNet.messageHandler.sendWithPromise("Action.parameterCreateWithAnnot", {
                    action: this.id,
                    annot: annot.id,
                }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ActionParameter, id);
                });
            };
            PDFNet.Action.prototype.parameterCreateWithPage = function(page) {
                checkArguments(arguments.length, 1, "parameterCreateWithPage", "(PDFNet.Page)", [[page, "Object", PDFNet.Page, "Page"]]);
                return PDFNet.messageHandler.sendWithPromise("Action.parameterCreateWithPage",
                    { action: this.id, page: page.id }, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ActionParameter, id);
                });
            };
            PDFNet.ActionParameter.prototype.getAction = function() {
                return PDFNet.messageHandler.sendWithPromise("ActionParameter.getAction", { ap: this.id }, this.userPriority).then(function(id) {
                    return createPDFNetObj(PDFNet.Action, id);
                });
            };
            PDFNet.ViewChangeCollection.create = function() {
                return PDFNet.messageHandler.sendWithPromise("viewChangeCollectionCreate", {}, this.userPriority).then(function(id) {
                    return createDestroyableObj(PDFNet.ViewChangeCollection,
                        id);
                });
            };
            var getUrlAsBuffer = function(jsUrl, options) {
                options = options || {};
                var xhr = new XMLHttpRequest;
                return new Promise(function(resolve, reject) {
                    xhr.open("GET", jsUrl, !0);
                    xhr.responseType = "arraybuffer";
                    options.withCredentials && (xhr.withCredentials = options.withCredentials);
                    xhr.onerror = function() {
                        reject(Error("Network error occurred"));
                    };
                    xhr.onload = function(evt) {
                        200 == this.status ? (evt = new Uint8Array(xhr.response), resolve(evt)) : reject(Error("Download Failed"));
                    };
                    var customHeaders = options.customHeaders;
                    if (customHeaders) {
                        for (var header in customHeaders) {
                            xhr.setRequestHeader(header,
                                customHeaders[header]);
                        }
                    }
                    xhr.send();
                }, function() {
                    xhr.abort();
                });
            }, positionString = function(num) {
                return 0 === num ? "1st" : 1 === num ? "2nd" : 2 === num ? "3rd" : num + 1 + "th";
            }, checkArguments = function(inputArgNum, minNum, funcName, funcParams, argInfoList) {
                maxNum = argInfoList.length;
                if (minNum === maxNum) {
                    if (inputArgNum !== minNum) throw new RangeError(inputArgNum + " arguments passed into function '" + funcName + "'. Expected " + minNum + " argument. Function Signature: " + funcName + funcParams);
                } else if (0 >= minNum) {
                    if (inputArgNum > maxNum) {
                        throw new RangeError(inputArgNum +
                            " arguments passed into function '" + funcName + "'. Expected at most " + maxNum + " arguments. Function Signature: " + funcName + funcParams);
                    }
                } else if (inputArgNum < minNum || inputArgNum > maxNum) throw new RangeError(inputArgNum + " arguments passed into function '" + funcName + "'. Expected " + minNum + " to " + maxNum + " arguments. Function Signature: " + funcName + funcParams);
                var throwParaTypeError = function(argPos, argType, expectedType) {
                    throw new TypeError(positionString(argPos) + " input argument in function '" + funcName + "' is of type '" +
                        argType + "'. Expected type '" + expectedType + "'. Function Signature: " + funcName + funcParams);
                };
                inputArgNum = function(arg, argPos, expectedType) {
                    "object" === _typeof(arg) && arg.name ? throwParaTypeError(argPos, arg.name, expectedType) : throwParaTypeError(argPos, _typeof(arg), expectedType);
                };
                for (minNum = 0; minNum < maxNum; minNum++) {
                    var argInfo = argInfoList[minNum], arg$jscomp$0 = argInfo[0], argType = argInfo[1];
                    if (arg$jscomp$0 instanceof Promise) {
                        throw new TypeError(positionString(minNum) + " input argument in function '" + funcName +
                            "' is a Promise object. Promises require a 'yield' statement before being accessed.");
                    }
                    if ("OptionBase" === argType) {
                        if (arg$jscomp$0) {
                            if ("object" === _typeof(arg$jscomp$0)) {
                                if ("function" !== typeof arg$jscomp$0.getJsonString) throw new TypeError(positionString(minNum) + " input argument in function '" + funcName + "' is an 'oject' which is expected to have the 'getJsonString' function");
                            } else {
                                throwParaTypeError(minNum, arg$jscomp$0.name, "object");
                            }
                        }
                    } else {
                        "Array" === argType ? arg$jscomp$0.constructor !== Array && inputArgNum(arg$jscomp$0,
                            minNum, "Array") : "ArrayBuffer" === argType ? exports.isArrayBuffer(arg$jscomp$0) || exports.isArrayBuffer(arg$jscomp$0.buffer) || inputArgNum(arg$jscomp$0, minNum, "ArrayBuffer|TypedArray") : "ArrayAsBuffer" === argType ? arg$jscomp$0.constructor === Array || exports.isArrayBuffer(arg$jscomp$0) || exports.isArrayBuffer(arg$jscomp$0.buffer) || inputArgNum(arg$jscomp$0, minNum, "ArrayBuffer|TypedArray") : "PDFDoc" === argType || "SDFDoc" === argType || "FDFDoc" === argType ? arg$jscomp$0 instanceof PDFNet.PDFDoc || arg$jscomp$0 instanceof PDFNet.SDFDoc ||
                            arg$jscomp$0 instanceof PDFNet.FDFDoc || inputArgNum(arg$jscomp$0, minNum, "PDFDoc|SDFDoc|FDFDoc") : "Structure" === argType ? arg$jscomp$0 instanceof argInfo[2] || !arg$jscomp$0 || arg$jscomp$0.name === argInfo[3] || inputArgNum(arg$jscomp$0, minNum, argInfo[3]) : "OptionObject" === argType ? arg$jscomp$0 instanceof argInfo[2] || ("object" === _typeof(arg$jscomp$0) && arg$jscomp$0.name ? arg$jscomp$0.name !== argInfo[4] && throwParaTypeError(minNum, arg$jscomp$0.name, argInfo[3]) : throwParaTypeError(minNum, _typeof(arg$jscomp$0), argInfo[3])) :
                            "Object" === argType ? arg$jscomp$0 instanceof argInfo[2] || inputArgNum(arg$jscomp$0, minNum, argInfo[3]) : "const char* = 0" === argType ? "string" !== typeof arg$jscomp$0 && null !== arg$jscomp$0 && throwParaTypeError(minNum, _typeof(arg$jscomp$0), "string") : _typeof(arg$jscomp$0) !== argType && throwParaTypeError(minNum, _typeof(arg$jscomp$0), argType);
                    }
                }
            }, checkThisYieldFunction = function(funcName, yieldFunc) {
                if ("undefined" !== typeof yieldFunc) {
                    throw Error("Function " + yieldFunc + " recently altered a struct object without yielding. That object is now being accessed by function '" +
                        funcName + "'. Perhaps a yield statement is required for " + yieldFunc + "?");
                }
            }, checkParamsYieldFunction = function(funcName, argInfoList) {
                for (var i = 0; i < argInfoList.length; i++) {
                    var argInfo = argInfoList[i], arg = argInfo[0];
                    if (arg && "undefined" !== typeof arg.yieldFunction) {
                        throw Error("Function '" + arg.yieldFunction + "' recently altered a struct object without yielding. That object is now being accessed by the " + positionString(argInfo[1]) + " input argument in function '" + funcName + "'. Perhaps a yield statement is required for '" +
                            arg.yieldFunction + "'?");
                    }
                }
            }, getArrayBuffer = function(buffer, arrayAsBuffer) {
                var bufferArrayBuffer = buffer;
                arrayAsBuffer && buffer.constructor === Array && (bufferArrayBuffer = new Float64Array(buffer));
                exports.isArrayBuffer(bufferArrayBuffer) || (bufferArrayBuffer = bufferArrayBuffer.buffer, buffer.byteLength < bufferArrayBuffer.byteLength && (bufferArrayBuffer = bufferArrayBuffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
                return bufferArrayBuffer;
            };
            createdObjects = [];
            lockedObjects = [];
            stackCallCounter =
                beginOperationCounter = 0;
            deallocStackCounter = [];
            unlockStackCounter = [];
            var finishedInitializeCapability, isShutdown = !1;
            exports.PDFTron && PDFTron.WebViewer && PDFTron.WebViewer.prototype && PDFTron.WebViewer.prototype.version && !PDFTron.skipPDFNetWebViewerWarning && console.warn("PDFNet.js and WebViewer.js have been included in the same context. See pdftron.com/kb_same_context for an explanation of why this could be an error in your application.");
            var createDestroyableObj = function(constructor, id, type) {
                if ("0" ===
                    id) {
                    return null;
                }
                constructor = new constructor(id, type);
                createdObjects.push({ name: constructor.name, id: constructor.id });
                return constructor;
            }, createPDFNetObj = function(constructor, id, type) {
                return "0" === id ? null : new constructor(id, type);
            }, unregisterLockedObject = function(obj) {
                for (var objIndex = -1, i = lockedObjects.length - 1; 0 <= i; i--) {
                    if (lockedObjects[i].id == obj.id) {
                        objIndex = i;
                        break;
                    }
                }
                if (-1 != objIndex) {
                    for (lockedObjects.splice(objIndex, 1), i = unlockStackCounter.length - 1; 0 <= i; i--) {
                        if (objIndex < unlockStackCounter[i]) {
                            --unlockStackCounter[i];
                        } else {
                            break;
                        }
                    }
                } else {
                    console.log("[WARNING], the object to be unlocked was not found in the unlock list. Unlocking may cause errors.");
                }
            }, avoidCleanup = function(id) {
                for (var objIndex = -1, i = createdObjects.length - 1; 0 <= i; i--) {
                    if (createdObjects[i].id == id) {
                        objIndex = i;
                        break;
                    }
                }
                if (-1 != objIndex) for (createdObjects.splice(objIndex, 1), i = deallocStackCounter.length - 1; 0 <= i; i--) if (objIndex < deallocStackCounter[i]) --deallocStackCounter[i]; else break; else console.log("[WARNING], the object was not found in the deallocation list. Deallocating may cause errors.");
            };
            PDFNet.messageHandler = {
                sendWithPromise: function() {
                    throw Error("PDFNet.initialize must be called and finish resolving before any other PDFNetJS function calls.");
                },
            };
            PDFNet.initialize = function(licenseKey, pdfBackendType) {
                if (!finishedInitializeCapability) {
                    var workerHandlers = {
                        emsWorkerError: function(msg, genericMsg) {
                            console.log("EmsWorkerError: " + msg + ", " + genericMsg);
                        },
                    };
                    finishedInitializeCapability = createPromiseCapability();
                    var finishInit = function(pdfBackendType) {
                        exports.CoreControls.preloadPDFWorker(pdfBackendType,
                            workerHandlers);
                        exports.CoreControls.initPDFWorkerTransports(pdfBackendType, workerHandlers, licenseKey).then(function(transport) {
                            PDFNet.messageHandler = transport;
                            finishedInitializeCapability.resolve();
                        }, function(e) {
                            finishedInitializeCapability.reject(e);
                        });
                    };
                    "undefined" !== typeof readerControl && "undefined" !== typeof readerControl.pdfType && (pdfBackendType = readerControl.pdfType);
                    pdfBackendType && "auto" !== pdfBackendType ? finishInit(pdfBackendType) : exports.CoreControls.getDefaultBackendType().then(finishInit,
                        function(e) {
                            finishedInitializeCapability.reject(e);
                        });
                }
                isShutdown && (PDFNet.messageHandler.messageHandler.comObj.addEventListener("message", PDFNet.messageHandler.messageHandler.handleMessage.bind(PDFNet.messageHandler.messageHandler)), isShutdown = !1);
                return finishedInitializeCapability.promise;
            };
            PDFNet.userPriority = 2;
            var copyFunc = function(obj, me) {
                for (var attr in obj) me[attr] = obj[attr];
            };
            PDFNet.runGeneratorWithoutCleanup = function(generator, license_key) {
                return PDFNet.runWithoutCleanup(function() {
                        return finishGenerator(generator);
                    },
                    license_key);
            };
            PDFNet.runGeneratorWithCleanup = function(generator, license_key) {
                return PDFNet.runWithCleanup(function() {
                    return finishGenerator(generator);
                }, license_key);
            };
            var previousRunPromise = Promise.resolve();
            PDFNet.displayAllocatedObjects = function() {
                console.log("List of created but not yet deallocated objects:");
                if (0 == createdObjects.length) console.log("~~None~~ (nothing to deallocate)"); else for (var i = 0; i < createdObjects.length; i++) console.log(createdObjects[i]);
                return createdObjects.length;
            };
            PDFNet.getAllocatedObjectsCount =
                function() {
                    return createdObjects.length;
                };
            PDFNet.startDeallocateStack = function() {
                stackCallCounter += 1;
                deallocStackCounter.push(createdObjects.length);
                unlockStackCounter.push(lockedObjects.length);
                return Promise.resolve();
            };
            PDFNet.endDeallocateStack = function() {
                if (0 === stackCallCounter) return console.log("Warning, no startDeallocateStack() instances remain."), Promise.resolve();
                var deallocStackPos = deallocStackCounter.pop(), unlockStackPos = unlockStackCounter.pop(),
                    promiseList = [], promiseListDestroy = [];
                var objToDealloc =
                    0;
                if ("undefined" !== typeof unlockStackPos && 0 !== lockedObjects.length && lockedObjects.length !== unlockStackPos) {
                    for (; lockedObjects.length > unlockStackPos;) {
                        var objToUnlock = lockedObjects.pop();
                        objToUnlock = PDFNet.messageHandler.sendWithPromise(objToUnlock.name + "." + objToUnlock.unlocktype, { doc: objToUnlock.id }, this.userPriority);
                        objToUnlock = objToUnlock["catch"](function(e) {
                            console.log(e);
                        });
                        promiseList.push(objToUnlock);
                        objToDealloc++;
                    }
                }
                unlockStackPos = 0;
                if ("undefined" !== typeof deallocStackPos && 0 !== createdObjects.length &&
                    createdObjects.length !== deallocStackPos) {
                    for (; createdObjects.length > deallocStackPos;) {
                        objToDealloc = createdObjects.pop(), objToDealloc = PDFNet.messageHandler.sendWithPromise(objToDealloc.name + ".destroy", { auto_dealloc_obj: objToDealloc.id }, this.userPriority), objToDealloc = objToDealloc["catch"](function(e) {
                            console.log(e);
                        }), promiseListDestroy.push(objToDealloc), unlockStackPos++;
                    }
                }
                --stackCallCounter;
                return Promise.all(promiseList).then(function() {
                    return Promise.all(promiseListDestroy);
                });
            };
            PDFNet.getStackCount =
                function() {
                    return Promise.resolve(stackCallCounter);
                };
            PDFNet.deallocateAllObjects = function() {
                if (0 == createdObjects.length) {
                    console.log("~~None~~ (nothing to deallocate)");
                    var capability = createPromiseCapability();
                    capability.resolve();
                    return capability.promise;
                }
                capability = [];
                for (deallocStackCounter = []; lockedObjects.length;) {
                    objToUnlock = lockedObjects.pop(), unlockPromise = PDFNet.messageHandler.sendWithPromise(objToUnlock.name + "." + objToUnlock.unlocktype, { doc: objToUnlock.id }, this.userPriority), unlockPromise =
                        unlockPromise["catch"](function(e) {
                            console.log(e);
                        }), capability.push(unlockPromise);
                }
                for (; createdObjects.length;) {
                    var objToDealloc = createdObjects.pop();
                    objToDealloc = PDFNet.messageHandler.sendWithPromise(objToDealloc.name + ".destroy", { auto_dealloc_obj: objToDealloc.id }, this.userPriority);
                    objToDealloc = objToDealloc["catch"](function(e) {
                        console.log(e);
                    });
                    capability.push(objToDealloc);
                }
                return Promise.all(capability);
            };
            PDFNet.Redactor.redact = function(doc, red_arr, appearance, ext_neg_mode, page_coord_sys) {
                "undefined" ===
                typeof appearance && (appearance = {});
                "undefined" === typeof appearance.redaction_overlay && (appearance.redaction_overlay = !0);
                "undefined" === typeof appearance.positive_overlay_color ? appearance.positive_overlay_color = void 0 : "undefined" !== typeof appearance.positive_overlay_color.id && (appearance.positive_overlay_color = appearance.positive_overlay_color.id);
                "undefined" === typeof appearance.negative_overlay_color ? appearance.negative_overlay_color = void 0 : "undefined" !== typeof appearance.negative_overlay_color.id &&
                    (appearance.negative_overlay_color = appearance.negative_overlay_color.id);
                "undefined" === typeof appearance.border && (appearance.border = !0);
                "undefined" === typeof appearance.use_overlay_text && (appearance.use_overlay_text = !0);
                "undefined" === typeof appearance.font ? appearance.font = void 0 : "undefined" !== typeof appearance.font.id && (appearance.font = appearance.font.id);
                "undefined" === typeof appearance.min_font_size && (appearance.min_font_size = 2);
                "undefined" === typeof appearance.max_font_size && (appearance.max_font_size =
                    24);
                "undefined" === typeof appearance.text_color ? appearance.text_color = void 0 : "undefined" !== typeof appearance.text_color.id && (appearance.text_color = appearance.text_color.id);
                "undefined" === typeof appearance.horiz_text_alignment && (appearance.horiz_text_alignment = -1);
                "undefined" === typeof appearance.vert_text_alignment && (appearance.vert_text_alignment = 1);
                "undefined" === typeof appearance.show_redacted_content_regions && (appearance.show_redacted_content_regions = !1);
                "undefined" === typeof appearance.redacted_content_color ?
                    appearance.redacted_content_color = void 0 : "undefined" !== typeof appearance.redacted_content_color.id && (appearance.redacted_content_color = appearance.redacted_content_color.id);
                "undefined" === typeof ext_neg_mode && (ext_neg_mode = !0);
                "undefined" === typeof page_coord_sys && (page_coord_sys = !0);
                if (2 > arguments.length || 5 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'redact'. Expected 2 to 5 arguments. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean=true, boolean=true)");
                if (doc instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument of function 'redact'. Promises require a 'yield' statement before being accessed.");
                if (!(doc instanceof PDFNet.PDFDoc || doc instanceof PDFNet.SDFDoc || doc instanceof PDFNet.FDFDoc)) {
                    if ("object" == _typeof(doc)) throw new TypeError("1st input argument in function 'redact' is of type '" + doc.name + "'. Expected type 'PDFDoc'. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean=true, boolean=true).");
                    throw new TypeError("1st input argument '" + doc + "' in function 'redact' is of type '" + _typeof(doc) + "'. Expected type 'PDFDoc'. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean=true, boolean=true).");
                }
                if (red_arr instanceof Promise) throw new TypeError("Received a Promise object in 2nd input argument in function 'redact'. Promises require a 'yield' statement before being accessed.");
                if (!(red_arr instanceof Array)) {
                    if ("object" == _typeof(red_arr)) {
                        throw new TypeError("2nd input argument in function 'redact' is of type '" +
                            red_arr.name + "'. Expected an array of 'Redaction' objects. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean, boolean).");
                    }
                    throw new TypeError("2nd input argument '" + red_arr + "' in function 'redact' is of type '" + _typeof(red_arr) + "'. Expected type 'Redaction'. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean, boolean).");
                }
                if (appearance instanceof Promise) throw new TypeError("Received a Promise object in 3rd input argument in function 'redact'. Promises require a 'yield' statement before being accessed.");
                if ("object" !== _typeof(appearance)) throw new TypeError("3nd input argument in function 'redact' is of type '" + appearance.name + "'. Expected a javascript object. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean, boolean).");
                if (ext_neg_mode instanceof Promise) throw new TypeError("Received a Promise object in 4th input argument in function 'redact'. Promises require a 'yield' statement before being accessed.");
                if ("boolean" != typeof ext_neg_mode) {
                    throw new TypeError("4th input argument '" +
                        ext_neg_mode + "' in function 'redact' is of type '" + _typeof(ext_neg_mode) + "'. Expected type 'boolean'. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean=true, boolean=true).");
                }
                if (page_coord_sys instanceof Promise) throw new TypeError("Received a Promise object in 5th input argument in function 'redact'. Promises require a 'yield' statement before being accessed.");
                if ("boolean" != typeof page_coord_sys) {
                    throw new TypeError("5th input argument '" + page_coord_sys + "' in function 'redact' is of type '" +
                        _typeof(page_coord_sys) + "'. Expected type 'boolean'. Function Signature: redact(PDFDoc, Array of Redaction Objects, Object, boolean=true, boolean=true).");
                }
                return PDFNet.messageHandler.sendWithPromise("redactorRedact", {
                    doc: doc.id,
                    red_arr: red_arr,
                    appearance: appearance,
                    ext_neg_mode: ext_neg_mode,
                    page_coord_sys: page_coord_sys,
                }, this.userPriority);
            };
            PDFNet.Highlights.prototype.getCurrentQuads = function() {
                return PDFNet.messageHandler.sendWithPromise("Highlights.getCurrentQuads", { hlts: this.id }, this.userPriority).then(function(id) {
                    id =
                        new Float64Array(id);
                    for (var retArray = [], currQuad, i = 0; i < id.length; i += 8) currQuad = PDFNet.QuadPoint(id[i + 0], id[i + 1], id[i + 2], id[i + 3], id[i + 4], id[i + 5], id[i + 6], id[i + 7]), retArray.push(currQuad);
                    return retArray;
                });
            };
            PDFNet.TextSearch.prototype.run = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'run'. Expected 0 arguments. Function Signature: run()");
                return PDFNet.messageHandler.sendWithPromise("TextSearch.run", { ts: this.id }, this.userPriority).then(function(searchObj) {
                    searchObj.highlights =
                        new PDFNet.Highlights(searchObj.highlights);
                    if ("0" == searchObj.highlights.id) return searchObj;
                    createdObjects.push({ name: searchObj.highlights.name, id: searchObj.highlights.id });
                    return searchObj;
                });
            };
            PDFNet.Iterator.prototype.current = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'fillEncryptDict'. Expected 0 argument.");
                var me = this;
                this.yieldFunction = "Iterator.current";
                var promise = PDFNet.messageHandler.sendWithPromise("Iterator.current", {
                    itr: this.id,
                    type: this.type,
                }, this.userPriority);
                me.yieldFunction = void 0;
                "Int" != this.type && (promise = promise.then(function(id) {
                    return new PDFNet[me.type](id);
                }));
                return promise;
            };
            PDFNet.PDFDoc.prototype.getFileData = function(callback) {
                callback({ type: "id", id: this.id });
            };
            PDFNet.PDFDoc.prototype.getFile = function(callback) {
                return null;
            };
            PDFNet.PDFDoc.createFromURL = function(url, options) {
                if (1 > arguments.length || 2 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'createFromURL'. Expected 1 to 2 arguments. Function Signature: createFromURL(string, Obj)");
                if (url instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'createFromURL'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof url) throw new TypeError("1st input argument '" + url + "' in function 'createFromURL' is of type '" + _typeof(url) + "'. Expected type 'string'. Function Signature: createFromURL(string).");
                return getUrlAsBuffer(url, options).then(function(data) {
                    return PDFNet.PDFDoc.createFromBuffer(data);
                });
            };
            PDFNet.PDFDraw.prototype.exportBuffer =
                function(page, format, encoder_params) {
                    "undefined" == typeof format && (format = "PNG");
                    "undefined" == typeof encoder_params && (encoder_params = new PDFNet.Obj("0"));
                    if (1 > arguments.length || 3 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'exportBuffer'. Expected 1 to 3 arguments. Function Signature: exportBuffer(Page, string, Obj)");
                    if (page instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'exportBuffer'. Promises require a 'yield' statement before being accessed.");
                    if (!(page instanceof PDFNet.Page)) {
                        if ("object" == _typeof(page)) throw new TypeError("1st input argument in function 'exportBuffer' is of type '" + page.name + "'. Expected type 'Page'. Function Signature: exportBuffer(Page, string, Obj).");
                        throw new TypeError("1st input argument '" + page + "' in function 'exportBuffer' is of type '" + _typeof(page) + "'. Expected type 'Page'. Function Signature: exportBuffer(Page, string, Obj).");
                    }
                    if (format instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'exportBuffer'. Promises require a 'yield' statement before being accessed.");
                    if ("string" != typeof format) throw new TypeError("2nd input argument '" + format + "' in function 'exportBuffer' is of type '" + _typeof(format) + "'. Expected type 'string'. Function Signature: exportBuffer(Page, string, Obj).");
                    if (encoder_params instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'exportBuffer'. Promises require a 'yield' statement before being accessed.");
                    if (!(encoder_params instanceof PDFNet.Obj)) {
                        if ("object" == _typeof(encoder_params)) {
                            throw new TypeError("3rd input argument in function 'exportBuffer' is of type '" +
                                encoder_params.name + "'. Expected type 'Obj'. Function Signature: exportBuffer(Page, string, Obj).");
                        }
                        throw new TypeError("3rd input argument '" + encoder_params + "' in function 'exportBuffer' is of type '" + _typeof(encoder_params) + "'. Expected type 'Obj'. Function Signature: exportBuffer(Page, string, Obj).");
                    }
                    return PDFNet.messageHandler.sendWithPromise("PDFDraw.exportBuffer", {
                        d: this.id,
                        page: page.id,
                        format: format,
                        encoder_params: encoder_params.id,
                    }, this.userPriority).then(function(id) {
                        return "0" == id ? null :
                            new Uint8Array(id);
                    });
                };
            PDFNet.PDFDraw.prototype.exportStream = PDFNet.PDFDraw.prototype.exportBuffer;
            PDFNet.Element.prototype.getTextData = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getTextData'. Expected 0 arguments. Function Signature: getTextData()");
                return PDFNet.messageHandler.sendWithPromise("Element.getTextData", { e: this.id }, this.userPriority);
            };
            PDFNet.Element.prototype.getPathData = function() {
                if (0 != arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'getPathData'. Expected 0 arguments. Function Signature: getPathData()");
                }
                return PDFNet.messageHandler.sendWithPromise("Element.getPathData", { e: this.id }, this.userPriority).then(function(id) {
                    id.operators = new Uint8Array(id.operators);
                    id.points = new Float64Array(id.points);
                    return id;
                });
            };
            PDFNet.PDFDoc.prototype.convertToXod = function(optionsObj) {
                "undefined" === typeof optionsObj && (optionsObj = {});
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.convertToXod", {
                    doc: this.id,
                    optionsObject: optionsObj,
                }, this.userPriority).then(function(id) {
                    return "0" == id ? null : new Uint8Array(id);
                });
            };
            PDFNet.PDFDoc.prototype.convertToXodStream = function(options) {
                "undefined" === typeof options && (options = {});
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.convertToXodStream", {
                    doc: this.id,
                    optionsObject: options,
                }, this.userPriority).then(function(id) {
                    return "0" == id ? null : new PDFNet.Filter(id);
                });
            };
            PDFNet.FilterReader.prototype.read = function(buf_size) {
                if (1 != arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'read'. Expected 1 argument. Function Signature: read(number).");
                }
                if (buf_size instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'read'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof buf_size) throw new TypeError("1st input argument '" + buf_size + "' in function 'read' is of type '" + _typeof(buf_size) + "'. Expected type 'number'. Function Signature: read(number).");
                return PDFNet.messageHandler.sendWithPromise("FilterReader.read",
                    { reader: this.id, buf_size: buf_size }, this.userPriority).then(function(id) {
                    return "0" == id ? null : new Uint8Array(id);
                });
            };
            PDFNet.FilterReader.prototype.readAllIntoBuffer = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'readAllIntoBuffer'. Expected 0 arguments. Function Signature: readAllIntoBuffer()");
                return PDFNet.messageHandler.sendWithPromise("FilterReader.readAllIntoBuffer", { reader: this.id }, this.userPriority).then(function(id) {
                    return "0" == id ? null :
                        new Uint8Array(id);
                });
            };
            PDFNet.bitmapInfo = function(id) {
                copyFunc(id, this);
            };
            PDFNet.PDFDraw.prototype.getBitmap = function(page, pix_fmt, demult) {
                if (3 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getBitmap'. Expected 3 arguments. Function Signature: getBitmap(Page, PixelFormat, boolean).");
                if (page instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'getBitmap'. Promises require a 'yield' statement before being accessed.");
                if (!(page instanceof
                    PDFNet.Page)) {
                    if ("object" == _typeof(page)) throw new TypeError("1st input argument in function 'getBitmap' is of type '" + page.name + "'. Expected type 'Page'. Function Signature: getBitmap(Page, PixelFormat, boolean).");
                    throw new TypeError("1st input argument '" + page + "' in function 'getBitmap' is of type '" + _typeof(page) + "'. Expected type 'Page'. Function Signature: getBitmap(Page, PixelFormat, boolean).");
                }
                if (pix_fmt instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'getBitmap'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof pix_fmt) throw new TypeError("2nd input argument '" + pix_fmt + "' in function 'getBitmap' is of type '" + _typeof(pix_fmt) + "'. Expected type 'number'. Function Signature: getBitmap(Page, PixelFormat, boolean).");
                if (demult instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'getBitmap'. Promises require a 'yield' statement before being accessed.");
                if ("boolean" != typeof demult) {
                    throw new TypeError("3rd input argument '" + demult + "' in function 'getBitmap' is of type '" +
                        _typeof(demult) + "'. Expected type 'boolean'. Function Signature: getBitmap(Page, PixelFormat, boolean).");
                }
                return PDFNet.messageHandler.sendWithPromise("PDFDraw.getBitmap", {
                    d: this.id,
                    page: page.id,
                    pix_fmt: pix_fmt,
                    demult: demult,
                }, this.userPriority).then(function(id) {
                    return "0" == id ? null : new PDFNet.bitmapInfo(id);
                });
            };
            PDFNet.Matrix2D.create = function(a, b, c, d, h, v) {
                void 0 == a && (a = 0);
                void 0 == b && (b = 0);
                void 0 == c && (c = 0);
                void 0 == d && (d = 0);
                void 0 == h && (h = 0);
                void 0 == v && (v = 0);
                if (6 < arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'Matrix2D.create'. Expected 6 or fewer arguments. Function Signature: create(number, number, number, number, number, number).");
                }
                if (a instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'Matrix2D.create'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof a) throw new TypeError("1st input argument '" + a + "' in function 'Matrix2D.create' is of type '" + _typeof(a) + "'. Expected type 'number'. Function Signature: create(number, number, number, number, number, number).");
                if (b instanceof Promise) throw new TypeError("Received a Promise object in 2nd input argument 'Matrix2D.create'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof b) throw new TypeError("2nd input argument '" + b + "' in function 'Matrix2D.create' is of type '" + _typeof(b) + "'. Expected type 'number'. Function Signature: create(number, number, number, number, number, number).");
                if (c instanceof Promise) throw new TypeError("Received a Promise object in 3rd input argument 'Matrix2D.create'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof c) throw new TypeError("3rd input argument '" + c + "' in function 'Matrix2D.create' is of type '" + _typeof(c) + "'. Expected type 'number'. Function Signature: create(number, number, number, number, number, number).");
                if (d instanceof Promise) throw new TypeError("Received a Promise object in 4th input argument 'Matrix2D.create'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof d) {
                    throw new TypeError("4th input argument '" + d + "' in function 'Matrix2D.create' is of type '" +
                        _typeof(d) + "'. Expected type 'number'. Function Signature: create(number, number, number, number, number, number).");
                }
                if (h instanceof Promise) throw new TypeError("Received a Promise object in 5th input argument 'Matrix2D.create'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof h) throw new TypeError("5th input argument '" + h + "' in function 'Matrix2D.create' is of type '" + _typeof(h) + "'. Expected type 'number'. Function Signature: create(number, number, number, number, number, number).");
                if (v instanceof Promise) throw new TypeError("Received a Promise object in 6th input argument 'Matrix2D.create'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof v) throw new TypeError("6th input argument '" + v + "' in function 'Matrix2D.create' is of type '" + _typeof(v) + "'. Expected type 'number'. Function Signature: create(number, number, number, number, number, number).");
                var capability = createPromiseCapability(), matrix = new PDFNet.Matrix2D({
                    m_a: a, m_b: b, m_c: c, m_d: d, m_h: h,
                    m_v: v,
                });
                capability.resolve(matrix);
                return capability.promise;
            };
            PDFNet.PDFDoc.prototype.getPDFDoc = function() {
                return PDFNet.messageHandler.sendWithPromise("GetPDFDoc", { doc: this.id }, this.userPriority).then(function(id) {
                    return "0" == id ? null : new PDFNet.PDFDoc(id);
                });
            };
            PDFNet.TextExtractorLine.prototype.getBBox = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getBBox'. Expected 0 arguments. Function Signature: getBBox()");
                if ("undefined" !== typeof this.yieldFunction) {
                    throw Error("Function " +
                        this.yieldFunction + " recently altered a struct object without yielding. That object is now being accessed by function 'getBBox'. Perhaps a yield statement is required for " + this.yieldFunction + "?");
                }
                var me = this;
                this.yieldFunction = "TextExtractorLine.getBBox";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getBBox", { line: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    return new PDFNet.Rect(id.result.x1, id.result.y1, id.result.x2, id.result.y2, id.result.mp_rect);
                });
            };
            PDFNet.TextExtractorLine.prototype.getQuad =
                function() {
                    if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getQuad'. Expected 0 arguments. Function Signature: getQuad()");
                    if ("undefined" !== typeof this.yieldFunction) throw Error("Function " + this.yieldFunction + " recently altered a struct object without yielding. That object is now being accessed by function 'getQuad'. Perhaps a yield statement is required for " + this.yieldFunction + "?");
                    var me = this;
                    this.yieldFunction = "TextExtractorLine.getQuad";
                    return PDFNet.messageHandler.sendWithPromise("TextExtractorLine.getQuad",
                        { line: this }, this.userPriority).then(function(id) {
                        me.yieldFunction = void 0;
                        return new PDFNet.QuadPoint(id.result.p1x, id.result.p1y, id.result.p2x, id.result.p2y, id.result.p3x, id.result.p3y, id.result.p4x, id.result.p4y);
                    });
                };
            PDFNet.TextExtractorWord.prototype.getBBox = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getBBox'. Expected 0 arguments. Function Signature: getBBox()");
                if ("undefined" !== typeof this.yieldFunction) {
                    throw Error("Function " + this.yieldFunction +
                        " recently altered a struct object without yielding. That object is now being accessed by function 'getBBox'. Perhaps a yield statement is required for " + this.yieldFunction + "?");
                }
                var me = this;
                this.yieldFunction = "TextExtractorWord.getBBox";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getBBox", { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    return new PDFNet.Rect(id.result.x1, id.result.y1, id.result.x2, id.result.y2, id.result.mp_rect);
                });
            };
            PDFNet.TextExtractorWord.prototype.getQuad =
                function() {
                    if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getQuad'. Expected 0 arguments. Function Signature: getQuad()");
                    if ("undefined" !== typeof this.yieldFunction) throw Error("Function " + this.yieldFunction + " recently altered a struct object without yielding. That object is now being accessed by function 'getQuad'. Perhaps a yield statement is required for " + this.yieldFunction + "?");
                    var me = this;
                    this.yieldFunction = "TextExtractorWord.getQuad";
                    return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getQuad",
                        { tew: this }, this.userPriority).then(function(id) {
                        me.yieldFunction = void 0;
                        return new PDFNet.QuadPoint(id.result.p1x, id.result.p1y, id.result.p2x, id.result.p2y, id.result.p3x, id.result.p3y, id.result.p4x, id.result.p4y);
                    });
                };
            PDFNet.TextExtractorWord.prototype.getGlyphQuad = function(glyph_idx) {
                if (1 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getGlyphQuad'. Expected 1 argument. Function Signature: getGlyphQuad(number)");
                if (glyph_idx instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'getGlyphQuad'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof glyph_idx) throw new TypeError("1st input argument '" + glyph_idx + "' in function 'getGlyphQuad' is of type '" + _typeof(glyph_idx) + "'. Expected type 'number'. Function Signature: getGlyphQuad(number).");
                if ("undefined" !== typeof this.yieldFunction) throw Error("Function " + this.yieldFunction + " recently altered a struct object without yielding. That object is now being accessed by function 'getGlyphQuad'. Perhaps a yield statement is required for " + this.yieldFunction + "?");
                var me = this;
                this.yieldFunction =
                    "TextExtractorWord.getGlyphQuad";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getGlyphQuad", {
                    tew: this,
                    glyph_idx: glyph_idx,
                }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    return new PDFNet.QuadPoint(id.result.p1x, id.result.p1y, id.result.p2x, id.result.p2y, id.result.p3x, id.result.p3y, id.result.p4x, id.result.p4y);
                });
            };
            PDFNet.TextExtractorStyle.prototype.getColor = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getColor'. Expected 0 arguments. Function Signature: getColor()");
                if ("undefined" !== typeof this.yieldFunction) throw Error("Function " + this.yieldFunction + " recently altered a struct object without yielding. That object is now being accessed by function 'getColor'. Perhaps a yield statement is required for " + this.yieldFunction + "?");
                var me = this;
                this.yieldFunction = "TextExtractorStyle.getColor";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorStyle.getColor", { tes: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    return "0" == id ? null : new PDFNet.ColorPt(id);
                });
            };
            PDFNet.TextExtractorWord.prototype.getString = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getString'. Expected 0 arguments. Function Signature: getString()");
                if ("undefined" !== typeof this.yieldFunction) throw Error("Function " + this.yieldFunction + " recently altered a struct object without yielding. That object is now being accessed by function 'getString'. Perhaps a yield statement is required for " + this.yieldFunction + "?");
                var me = this;
                this.yieldFunction =
                    "TextExtractorWord.getString";
                return PDFNet.messageHandler.sendWithPromise("TextExtractorWord.getString", { tew: this }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    return id;
                });
            };
            PDFNet.SecurityHandler.prototype.changeUserPasswordNonAscii = function(password) {
                if (1 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'changeUserPasswordNonAscii'. Expected 1 argument. Function Signature: changeUserPasswordNonAscii(string)");
                if (password instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'changeUserPasswordNonAscii'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof password) throw new TypeError("1st input argument '" + password + "' in function 'changeUserPasswordNonAscii' is of type '" + _typeof(password) + "'. Expected type 'string'. Function Signature: changeUserPasswordNonAscii(string).");
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.changeUserPasswordNonAscii", {
                    sh: this.id,
                    password: password,
                    pwd_length: password.length,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.changeMasterPasswordNonAscii = function(password) {
                if (1 != arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'changeMasterPasswordNonAscii'. Expected 1 argument. Function Signature: changeMasterPasswordNonAscii(string)");
                }
                if (password instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'changeMasterPasswordNonAscii'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof password) throw new TypeError("1st input argument '" + password + "' in function 'changeMasterPasswordNonAscii' is of type '" + _typeof(password) + "'. Expected type 'string'. Function Signature: changeMasterPasswordNonAscii(string).");
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.changeMasterPasswordNonAscii", {
                    sh: this.id,
                    password: password,
                    pwd_length: password.length,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.initPassword = function(password) {
                if (1 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'initPassword'. Expected 1 argument. Function Signature: initPassword(string)");
                if (password instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'initPassword'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof password) throw new TypeError("1st input argument '" + password + "' in function 'initPassword' is of type '" + _typeof(password) + "'. Expected type 'string'. Function Signature: initPassword(string).");
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.initPassword", {
                    sh: this.id,
                    password: password,
                }, this.userPriority);
            };
            PDFNet.SecurityHandler.prototype.initPasswordNonAscii = function(password) {
                if (1 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'initPasswordNonAscii'. Expected 1 argument. Function Signature: initPasswordNonAscii(string)");
                if (password instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'initPasswordNonAscii'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof password) throw new TypeError("1st input argument '" + password + "' in function 'initPasswordNonAscii' is of type '" + _typeof(password) + "'. Expected type 'string'. Function Signature: initPasswordNonAscii(string).");
                return PDFNet.messageHandler.sendWithPromise("SecurityHandler.initPasswordNonAscii",
                    { sh: this.id, password: password, pwd_length: password.length }, this.userPriority);
            };
            PDFNet.Element.prototype.getBBox = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getBBox'. Expected 0 arguments. Function Signature: getBBox()");
                var me = this;
                this.yieldFunction = "Element.getBBox";
                return PDFNet.messageHandler.sendWithPromise("Element.getBBox", { e: this.id }, this.userPriority).then(function(id) {
                    me.yieldFunction = void 0;
                    return new PDFNet.Rect(id);
                });
            };
            PDFNet.Matrix2D.prototype.mult =
                function(x, y) {
                    if (2 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'mult'. Expected 2 arguments. Function Signature: mult(number, number)");
                    if (x instanceof Promise) throw new TypeError("1st input argument in function 'mult' is a Promise object. Promises require a 'yield' statement before being accessed.");
                    if ("number" != typeof x) throw new TypeError("1st input argument '" + x + "' in function 'mult' is of type '" + _typeof(x) + "'. Expected type 'number'. Function Signature: mult(number, number).");
                    if (y instanceof Promise) throw new TypeError("2nd input argument in function 'mult' is a Promise object. Promises require a 'yield' statement before being accessed.");
                    if ("number" != typeof y) throw new TypeError("2nd input argument '" + y + "' in function 'mult' is of type '" + _typeof(y) + "'. Expected type 'number'. Function Signature: mult(number, number).");
                    if ("undefined" !== typeof this.yieldFunction) {
                        throw Error("Function " + this.yieldFunction + " recently altered a struct object without yielding. That object is now being accessed by function 'mult'. Perhaps a yield statement is required for " +
                            this.yieldFunction + "?");
                    }
                    return PDFNet.messageHandler.sendWithPromise("Matrix2D.mult", {
                        matrix: this,
                        x: x,
                        y: y,
                    }, this.userPriority);
                };
            PDFNet.Obj.prototype.getAsPDFText = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'getAsPDFText'. Expected 0 arguments. Function Signature: getAsPDFText()");
                return PDFNet.messageHandler.sendWithPromise("Obj.getAsPDFText", { o: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.initSecurityHandler = function(custom_data) {
                "undefined" ===
                typeof custom_data && (custom_data = 0);
                if (1 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'initSecurityHandler'. Expected at most 1 arguments. Function Signature: initSecurityHandler(void*)");
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.initSecurityHandler", {
                    doc: this.id,
                    custom_data: custom_data,
                }, this.userPriority);
            };
            PDFNet.SDFDoc.prototype.initSecurityHandler = function(custom_data) {
                "undefined" === typeof custom_data && (custom_data = 0);
                if (1 < arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'initSecurityHandler'. Expected at most 1 arguments. Function Signature: initSecurityHandler(void*)");
                }
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.initSecurityHandler", {
                    doc: this.id,
                    custom_data: custom_data,
                }, this.userPriority);
            };
            PDFNet.Image.createFromURL = function(doc, url, encoder_hints, options) {
                "undefined" === typeof encoder_hints && (encoder_hints = new PDFNet.Obj("0"));
                if (2 > arguments.length || 4 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'createFromURL'. Expected 2 to 4 arguments. Function Signature: createFromURL(PDFDoc, string, Obj)");
                if (doc instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'createFromURL'. Promises require a 'yield' statement before being accessed.");
                if (!(doc instanceof PDFNet.PDFDoc || doc instanceof PDFNet.SDFDoc || doc instanceof PDFNet.FDFDoc)) {
                    if ("object" == _typeof(doc)) throw new TypeError("1st input argument in function 'createFromURL' is of type '" + doc.name + "'. Expected type 'Page'. Function Signature: createFromURL(PDFDoc, string, Obj).");
                    throw new TypeError("1st input argument '" +
                        doc + "' in function 'createFromURL' is of type '" + _typeof(doc) + "'. Expected type 'Page'. Function Signature: createFromURL(PDFDoc, string, Obj).");
                }
                if (url instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'createFromURL'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof url) throw new TypeError("2nd input argument '" + url + "' in function 'createFromURL' is of type '" + _typeof(url) + "'. Expected type 'string'. Function Signature: createFromURL(PDFDoc, string, Obj).");
                if (encoder_hints instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'createFromURL'. Promises require a 'yield' statement before being accessed.");
                if (!(encoder_hints instanceof PDFNet.Obj)) {
                    if ("object" == _typeof(encoder_hints)) throw new TypeError("3rd input argument in function 'createFromURL' is of type '" + encoder_hints.name + "'. Expected type 'Obj'. Function Signature: createFromURL(PDFDoc, string, Obj).");
                    throw new TypeError("3rd input argument '" + encoder_hints +
                        "' in function 'createFromURL' is of type '" + _typeof(encoder_hints) + "'. Expected type 'Obj'. Function Signature: createFromURL(PDFDoc, string, Obj).");
                }
                return getUrlAsBuffer(url, options).then(function(data) {
                    return PDFNet.Image.createFromMemory2(doc, data, encoder_hints);
                });
            };
            PDFNet.PDFDoc.prototype.addStdSignatureHandlerFromURL = function(pkcs12_file, pkcs12_pass) {
                if (2 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'addStdSignatureHandlerFromURL'. Expected 2 arguments. Function Signature: addStdSignatureHandlerFromURL(string, string)");
                if (pkcs12_file instanceof Promise) throw new TypeError("1st input argument in function 'addStdSignatureHandlerFromURL' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof pkcs12_file) throw new TypeError("1st input argument '" + pkcs12_file + "' in function 'addStdSignatureHandlerFromURL' is of type '" + _typeof(pkcs12_file) + "'. Expected type 'string'. Function Signature: addStdSignatureHandlerFromURL(string, string).");
                if (pkcs12_pass instanceof Promise) throw new TypeError("2nd input argument in function 'addStdSignatureHandlerFromURL' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof pkcs12_pass) throw new TypeError("2nd input argument '" + pkcs12_pass + "' in function 'addStdSignatureHandlerFromURL' is of type '" + _typeof(pkcs12_pass) + "'. Expected type 'string'. Function Signature: addStdSignatureHandlerFromURL(string, string).");
                var me = this;
                return getUrlAsBuffer(pkcs12_file).then(function(pkcs12_buffer) {
                    return me.addStdSignatureHandlerFromBufferWithDoc(pkcs12_buffer, pkcs12_pass, me);
                });
            };
            PDFNet.PDFDoc.prototype.addStdSignatureHandlerFromBufferWithDoc = function(pkcs12_buffer,
                pkcs12_pass, doc) {
                if (3 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'addStdSignatureHandlerFromBuffer'. Expected 3 arguments. Function Signature: addStdSignatureHandlerFromBuffer(ArrayBuffer, string, PDFDoc)");
                if (doc instanceof Promise) throw new TypeError("1st input argument in function 'addStdSignatureHandlerFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (pkcs12_buffer instanceof Promise) throw new TypeError("2nd input argument in function 'addStdSignatureHandlerFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (!exports.isArrayBuffer(pkcs12_buffer.buffer)) {
                    if ("object" == _typeof(pkcs12_buffer)) throw new TypeError("2nd input argument in function 'addStdSignatureHandlerFromBuffer' is of type '" + pkcs12_buffer.name + "'. Expected type 'ArrayBuffer'. Function Signature: addStdSignatureHandlerFromBuffer(ArrayBuffer, string, PDFDoc).");
                    throw new TypeError("2nd input argument '" + pkcs12_buffer + "' in function 'addStdSignatureHandlerFromBuffer' is of type '" + _typeof(pkcs12_buffer) + "'. Expected type 'ArrayBuffer'. Function Signature: addStdSignatureHandlerFromBuffer(ArrayBuffer, string, PDFDoc).");
                }
                if (pkcs12_pass instanceof Promise) throw new TypeError("3rd input argument in function 'addStdSignatureHandlerFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof pkcs12_pass) throw new TypeError("3rd input argument '" + pkcs12_pass + "' in function 'addStdSignatureHandlerFromBuffer' is of type '" + _typeof(pkcs12_pass) + "'. Expected type 'string'. Function Signature: addStdSignatureHandlerFromBuffer(ArrayBuffer, string, PDFDoc).");
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.addStdSignatureHandlerFromBuffer",
                    { doc: doc.id, pkcs12_buffer: pkcs12_buffer.buffer, pkcs12_pass: pkcs12_pass }, this.userPriority);
            };
            PDFNet.Filter.createFromMemory = function(buf) {
                exports.isArrayBuffer(buf) || (buf = buf.buffer);
                return PDFNet.messageHandler.sendWithPromise("filterCreateFromMemory", { buf: buf }, this.userPriority).then(function(id) {
                    if ("0" == id) return null;
                    id = new PDFNet.Filter(id);
                    createdObjects.push({ name: id.name, id: id.id });
                    return id;
                });
            };
            PDFNet.Filter.createURLFilter = function(url, options) {
                if (1 > arguments.length || 2 < arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'createURLFilter'. Expected 1 to 2 arguments. Function Signature: createURLFilter(string, Obj)");
                }
                if (url instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'createURLFilter'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof url) throw new TypeError("1st input argument '" + url + "' in function 'createURLFilter' is of type '" + _typeof(url) + "'. Expected type 'string'. Function Signature: createURLFilter(string, Obj).");
                return getUrlAsBuffer(url, options).then(function(data) {
                    return PDFNet.Filter.createFromMemory(data);
                });
            };
            PDFNet.Filter.createFlateEncode = function(input_filter, compression_level, buf_sz) {
                "undefined" === typeof input_filter && (input_filter = new PDFNet.Filter("0"));
                "undefined" === typeof compression_level && (compression_level = -1);
                "undefined" === typeof buf_sz && (buf_sz = 256);
                if (3 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'createFlateEncode'. Expected at most 3 arguments. Function Signature: createFlateEncode(Filter, number, number)");
                if (input_filter instanceof Promise) throw new TypeError("1st input argument in function 'createFlateEncode' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (!(input_filter instanceof PDFNet.Filter)) {
                    if ("object" == _typeof(input_filter)) throw new TypeError("1st input argument in function 'createFlateEncode' is of type '" + input_filter.name + "'. Expected type 'Filter'. Function Signature: createFlateEncode(Filter, number, number).");
                    throw new TypeError("1st input argument '" +
                        input_filter + "' in function 'createFlateEncode' is of type '" + _typeof(input_filter) + "'. Expected type 'Filter'. Function Signature: createFlateEncode(Filter, number, number).");
                }
                if (compression_level instanceof Promise) throw new TypeError("2nd input argument in function 'createFlateEncode' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof compression_level) {
                    throw new TypeError("2nd input argument '" + compression_level + "' in function 'createFlateEncode' is of type '" +
                        _typeof(compression_level) + "'. Expected type 'number'. Function Signature: createFlateEncode(Filter, number, number).");
                }
                if (buf_sz instanceof Promise) throw new TypeError("3rd input argument in function 'createFlateEncode' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof buf_sz) throw new TypeError("3rd input argument '" + buf_sz + "' in function 'createFlateEncode' is of type '" + _typeof(buf_sz) + "'. Expected type 'number'. Function Signature: createFlateEncode(Filter, number, number).");
                return PDFNet.messageHandler.sendWithPromise("Filter.createFlateEncode", {
                    input_filter: input_filter.id,
                    compression_level: compression_level,
                    buf_sz: buf_sz,
                }, this.userPriority).then(function(id) {
                    if ("0" == id) return null;
                    id = new PDFNet.Filter(id);
                    createdObjects.push({ name: id.name, id: id.id });
                    return id;
                });
            };
            PDFNet.PDFDoc.prototype.importPages = function(page_arr, import_bookmarks) {
                "undefined" === typeof import_bookmarks && (import_bookmarks = !1);
                if (1 > arguments.length || 2 < arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'importPages'. Expected 1 to 2 arguments. Function Signature: importPages(Array, boolean)");
                }
                if (page_arr instanceof Promise) throw new TypeError("1st input argument in function 'importPages' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (!(page_arr instanceof Array)) {
                    if ("object" == _typeof(page_arr)) throw new TypeError("1st input argument in function 'importPages' is of type '" + page_arr.name + "'. Expected type 'Array'. Function Signature: importPages(Array, boolean).");
                    throw new TypeError("1st input argument '" + page_arr + "' in function 'importPages' is of type '" + _typeof(page_arr) + "'. Expected type 'Array'. Function Signature: importPages(Array, boolean).");
                }
                if (import_bookmarks instanceof Promise) throw new TypeError("3rd input argument in function 'importPages' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("boolean" != typeof import_bookmarks) {
                    throw new TypeError("3rd input argument '" + import_bookmarks + "' in function 'importPages' is of type '" +
                        _typeof(import_bookmarks) + "'. Expected type 'boolean'. Function Signature: importPages(Array, boolean).");
                }
                page_arr = page_arr.map(function(p) {
                    return p.id;
                });
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.importPages", {
                    doc: this.id,
                    page_arr: page_arr,
                    import_bookmarks: import_bookmarks,
                }, this.userPriority).then(function(idArray) {
                    return idArray ? idArray.map(function(id) {
                        return new PDFNet.Page(id);
                    }) : null;
                });
            };
            PDFNet.SDFDoc.prototype.applyCustomQuery = function(query) {
                if (1 != arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'applyCustomQuery'. Expected only 1");
                }
                if ("object" != _typeof(query)) throw new TypeError("input argument '" + query + "' in function 'applyCustomQuery' must be an object");
                return PDFNet.messageHandler.sendWithPromise("SDFDoc.applyCustomQuery", {
                    doc: this.id,
                    query: JSON.stringify(query),
                }, this.userPriority).then(function(result_str) {
                    return JSON.parse(result_str);
                });
            };
            var origSaveMemoryBuffer = PDFNet.PDFDoc.prototype.saveMemoryBuffer,
                origSaveStream = PDFNet.PDFDoc.prototype.saveStream;
            PDFNet.PDFDoc.prototype.saveMemoryBuffer = function(flags) {
                var me = this;
                return Promise.resolve(me.documentCompletePromise).then(function() {
                    return origSaveMemoryBuffer.call(me, flags);
                });
            };
            PDFNet.PDFDoc.prototype.saveStream = function(flags) {
                var me = this;
                return Promise.resolve(me.documentCompletePromise).then(function() {
                    return origSaveStream.call(me, flags);
                });
            };
            PDFNet.PDFACompliance.createFromUrl = function(convert, url, pwd, conform, excep, max_ref_objs, first_stop) {
                if (2 > arguments.length || 7 < arguments.length) {
                    throw new RangeError(arguments.length +
                        " arguments passed into function 'createFromUrl'. Expected 7 arguments. Function Signature: createFromUrl(convert, url, pwd, conform, excep, max_ref_objs, first_stop)");
                }
                "undefined" === typeof pwd && (pwd = "");
                "undefined" === typeof conform && (conform = PDFNet.PDFACompliance.Conformance.e_Level1B);
                "undefined" === typeof excep && (excep = new Int32Array(0));
                "undefined" === typeof max_ref_objs && (max_ref_objs = 10);
                "undefined" === typeof first_stop && (first_stop = !1);
                if (convert instanceof Promise) throw new TypeError("1st input argument in function 'createFromUrl' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("boolean" != typeof convert) throw new TypeError("1st input argument '" + convert + "' in function 'createFromUrl' is of type '" + _typeof(convert) + "'. Expected type 'number'. Function Signature: createFromUrl(convert, url, pwd, conform, excep, max_ref_objs, first_stop).");
                if (url instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'createFromURL'. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof url) {
                    throw new TypeError("2nd input argument '" +
                        url + "' in function 'createFromURL' is of type '" + _typeof(url) + "'. Expected type 'string'. Function Signature: createFromURL(PDFDoc, string, Obj).");
                }
                if (pwd instanceof Promise) throw new TypeError("3rd input argument in function 'createFromUrl' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof pwd) throw new TypeError("3rd input argument '" + pwd + "' in function 'createFromUrl' is of type '" + _typeof(pwd) + "'. Expected type 'string'. Function Signature: createFromUrl(convert, url, pwd, conform, excep, max_ref_objs, first_stop).");
                if (conform instanceof Promise) throw new TypeError("4th input argument in function 'createFromUrl' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof conform) throw new TypeError("4th input argument '" + conform + "' in function 'createFromUrl' is of type '" + _typeof(conform) + "'. Expected type 'number'. Function Signature: createFromUrl(convert, url, pwd, conform, excep, max_ref_objs, first_stop).");
                if (excep instanceof Promise) throw new TypeError("5th input argument in function 'createFromUrl' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (max_ref_objs instanceof Promise) throw new TypeError("6th input argument in function 'createFromUrl' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (first_stop instanceof Promise) throw new TypeError("7th input argument in function 'createFromUrl' is a Promise object. Promises require a 'yield' statement before being accessed.");
                return getUrlAsBuffer(url).then(function(buf) {
                    return PDFNet.PDFACompliance.createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs,
                        first_stop);
                });
            };
            PDFNet.PDFACompliance.createFromBuffer = function(convert, buf, pwd, conform, excep, max_ref_objs, first_stop) {
                "undefined" === typeof pwd && (pwd = "");
                "undefined" === typeof conform && (conform = PDFNet.PDFACompliance.Conformance.e_Level1B);
                "undefined" === typeof excep && (excep = new Int32Array(0));
                "undefined" === typeof max_ref_objs && (max_ref_objs = 10);
                "undefined" === typeof first_stop && (first_stop = !1);
                var bufArrayBuffer = buf;
                exports.isArrayBuffer(bufArrayBuffer) || (bufArrayBuffer = bufArrayBuffer.buffer);
                if (2 > arguments.length ||
                    7 < arguments.length) {
                    throw new RangeError(arguments.length + " arguments passed into function 'createFromBuffer'. Expected 7 arguments. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop)");
                }
                if (convert instanceof Promise) throw new TypeError("1st input argument in function 'createFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("boolean" != typeof convert) {
                    throw new TypeError("1st input argument '" + convert + "' in function 'createFromBuffer' is of type '" +
                        _typeof(convert) + "'. Expected type 'number'. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                }
                if (buf instanceof Promise) throw new TypeError("2nd input argument in function 'createFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (!exports.isArrayBuffer(bufArrayBuffer)) {
                    if ("object" == _typeof(buf) && buf.name) throw new TypeError("2nd input argument in function 'createFromBuffer' is of type '" + buf.name + "'. Expected ArrayBuffer|TypedArray. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                    throw new TypeError("2nd input argument '" + buf + "' in function 'createFromBuffer' is of type '" + _typeof(buf) + "'. Expected ArrayBuffer|TypedArray. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                }
                if (pwd instanceof Promise) throw new TypeError("3rd input argument in function 'createFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("string" != typeof pwd) {
                    throw new TypeError("3rd input argument '" + pwd + "' in function 'createFromBuffer' is of type '" +
                        _typeof(pwd) + "'. Expected type 'string'. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                }
                if (conform instanceof Promise) throw new TypeError("4th input argument in function 'createFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof conform) throw new TypeError("4th input argument '" + conform + "' in function 'createFromBuffer' is of type '" + _typeof(conform) + "'. Expected type 'number'. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                if (excep instanceof Promise) throw new TypeError("5th input argument in function 'createFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if (!exports.isArrayBuffer(excep.buffer)) {
                    if ("object" == _typeof(excep)) throw new TypeError("5th input argument in function 'createFromBuffer' is of type '" + excep.name + "'. Expected typed array. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                    throw new TypeError("5th input argument '" +
                        excep + "' in function 'createFromBuffer' is of type '" + _typeof(excep) + "'. Expected typed array. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                }
                if (max_ref_objs instanceof Promise) throw new TypeError("6th input argument in function 'createFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof max_ref_objs) {
                    throw new TypeError("6th input argument '" + max_ref_objs + "' in function 'createFromBuffer' is of type '" +
                        _typeof(max_ref_objs) + "'. Expected type 'number'. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                }
                if (first_stop instanceof Promise) throw new TypeError("7th input argument in function 'createFromBuffer' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("boolean" != typeof first_stop) throw new TypeError("7th input argument '" + first_stop + "' in function 'createFromBuffer' is of type '" + _typeof(first_stop) + "'. Expected type 'number'. Function Signature: createFromBuffer(convert, buf, pwd, conform, excep, max_ref_objs, first_stop).");
                return PDFNet.messageHandler.sendWithPromise("pdfaComplianceCreateFromBuffer", {
                    convert: convert,
                    buf: bufArrayBuffer,
                    password: pwd,
                    conform: conform,
                    excep: excep.buffer,
                    max_ref_objs: max_ref_objs,
                    first_stop: first_stop,
                }, this.userPriority).then(function(id) {
                    id = new PDFNet.PDFACompliance(id);
                    createdObjects.push({ name: id.name, id: id.id });
                    return id;
                });
            };
            PDFNet.PDFDoc.prototype.lock = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'lock'. Expected 0 arguments. Function Signature: lock()");
                lockedObjects.push({ name: "PDFDoc", id: this.id, unlocktype: "unlock" });
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.lock", { doc: this.id }, this.userPriority);
            };
            PDFNet.PDFDoc.prototype.lockRead = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'lockRead'. Expected 0 arguments. Function Signature: lockRead()");
                lockedObjects.push({ name: "PDFDoc", id: this.id, unlocktype: "unlockRead" });
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.lockRead", { doc: this.id },
                    this.userPriority);
            };
            PDFNet.PDFDoc.prototype.tryLock = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'tryLock'. Expected 0 arguments. Function Signature: tryLock()");
                var index = lockedObjects.length;
                lockedObjects.push({ name: "PDFDoc", id: this.id, unlocktype: "unlock" });
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.tryLock", { doc: this.id }, this.userPriority).then(function(success) {
                    success || lockedObjects.splice(index, 1);
                });
            };
            PDFNet.PDFDoc.prototype.timedLock =
                function(milliseconds) {
                    if (1 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'timedLock'. Expected at most 1 arguments. Function Signature: timedLock(number)");
                    if (milliseconds instanceof Promise) throw new TypeError("1st input argument in function 'timedLock' is a Promise object. Promises require a 'yield' statement before being accessed.");
                    if ("number" != typeof milliseconds) {
                        throw new TypeError("1st input argument '" + milliseconds + "' in function 'timedLock' is of type '" +
                            _typeof(milliseconds) + "'. Expected type 'number'. Function Signature: timedLock(number).");
                    }
                    var index = lockedObjects.length;
                    lockedObjects.push({ name: "PDFDoc", id: this.id, unlocktype: "unlock" });
                    return PDFNet.messageHandler.sendWithPromise("PDFDoc.timedLock", {
                        doc: this.id,
                        milliseconds: milliseconds,
                    }, this.userPriority).then(function(success) {
                        success || lockedObjects.splice(index, 1);
                    });
                };
            PDFNet.PDFDoc.prototype.tryLockRead = function() {
                if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'tryLockRead'. Expected 0 arguments. Function Signature: tryLockRead()");
                var index = lockedObjects.length;
                lockedObjects.push({ name: "PDFDoc", id: this.id, unlocktype: "unlockRead" });
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.tryLockRead", { doc: this.id }, this.userPriority).then(function(success) {
                    success || lockedObjects.splice(index, 1);
                });
            };
            PDFNet.PDFDoc.prototype.timedLockRead = function(milliseconds) {
                if (1 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'timedLockRead'. Expected at most 1 arguments. Function Signature: timedLockRead(number)");
                if (milliseconds instanceof Promise) throw new TypeError("1st input argument in function 'timedLockRead' is a Promise object. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof milliseconds) throw new TypeError("1st input argument '" + milliseconds + "' in function 'timedLockRead' is of type '" + _typeof(milliseconds) + "'. Expected type 'number'. Function Signature: timedLockRead(number).");
                var index = lockedObjects.length;
                lockedObjects.push({ name: "PDFDoc", id: this.id, unlocktype: "unlockRead" });
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.timedLockRead", {
                    doc: this.id,
                    milliseconds: milliseconds,
                }, this.userPriority).then(function(success) {
                    success || lockedObjects.splice(index, 1);
                });
            };
            PDFNet.hasFullApi = !0;
            PDFNet.Optimizer.optimize = function(doc, optimizerSettings) {
                if (1 > arguments.length || 2 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'Optimizer.optimize'. Expected 1 to 2 arguments. Function Signature: optimize(PDFDoc, OptimizerSettings)");
                if (doc instanceof
                    Promise) {
                    throw new TypeError("1st input argument in function 'optimize' is a Promise object. Promises require a 'yield' statement before being accessed.");
                }
                if (!(doc instanceof PDFNet.PDFDoc || doc instanceof PDFNet.SDFDoc || doc instanceof PDFNet.FDFDoc)) {
                    if ("object" == _typeof(doc)) throw new TypeError("1st input argument in function 'optimize' is of type '" + doc.name + "'. Expected type 'PDFDoc'. Function Signature: optimize(PDFDoc, OptimizerSettings).");
                    throw new TypeError("1st input argument '" + doc + "' in function 'optimize' is of type '" +
                        _typeof(doc) + "'. Expected type 'PDFDoc'. Function Signature: optimize(PDFDoc, OptimizerSettings).");
                }
                if ("undefined" === typeof optimizerSettings) {
                    optimizerSettings = new PDFNet.Optimizer.OptimizerSettings;
                } else {
                    if (optimizerSettings instanceof Promise) throw new TypeError("2nd input argument in function 'optimize' is a Promise object. Promises require a 'yield' statement before being accessed.");
                    if ("object" !== _typeof(optimizerSettings)) {
                        throw new TypeError("2nd input argument in function 'optimize' is of type '" +
                            optimizerSettings.name + "'. Expected type 'Object'. Function Signature: optimize(PDFDoc, OptimizerSettings).");
                    }
                }
                return PDFNet.messageHandler.sendWithPromise("optimizerOptimize", {
                    doc: doc.id,
                    color_image_settings: optimizerSettings.color_image_settings,
                    grayscale_image_settings: optimizerSettings.grayscale_image_settings,
                    mono_image_settings: optimizerSettings.mono_image_settings,
                    text_settings: optimizerSettings.text_settings,
                    remove_custom: optimizerSettings.remove_custom,
                }, this.userPriority);
            };
            PDFNet.VerificationOptions.prototype.addTrustedCertificateFromURL =
                function(url, options) {
                    if (1 > arguments.length || 2 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'addTrustedCertificateFromURL'. Expected 1 to 2 arguments. Function Signature: addTrustedCertificateFromURL(string, Obj)");
                    if (url instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'addTrustedCertificateFromURL'. Promises require a 'yield' statement before being accessed.");
                    if ("string" != typeof url) {
                        throw new TypeError("1st input argument '" +
                            url + "' in function 'addTrustedCertificateFromURL' is of type '" + _typeof(url) + "'. Expected type 'string'. Function Signature: addTrustedCertificateFromURL(string).");
                    }
                    var me = this;
                    return getUrlAsBuffer(url, options).then(function(data) {
                        return me.addTrustedCertificate(data);
                    });
                };
            PDFNet.DigitalSignatureField.prototype.certifyOnNextSaveFromURL = function(url, in_password, options) {
                "undefined" === typeof options && (options = {});
                checkArguments(arguments.length, 2, "certifyOnNextSaveFromURL", "(string, string, object)",
                    [[url, "string"], [in_password, "string"], [options, "object"]]);
                var me = this;
                return getUrlAsBuffer(url, options).then(function(data) {
                    return me.certifyOnNextSaveFromBuffer(data, in_password);
                });
            };
            PDFNet.DigitalSignatureField.prototype.signOnNextSaveFromURL = function(url, in_password, options) {
                "undefined" === typeof options && (options = {});
                checkArguments(arguments.length, 2, "signOnNextSaveFromURL", "(string, string, object)", [[url, "string"], [in_password, "string"], [options, "object"]]);
                var me = this;
                return getUrlAsBuffer(url,
                    options).then(function(data) {
                    return me.signOnNextSaveFromBuffer(data, in_password);
                });
            };
            PDFNet.Convert.office2PDF = function(input, options) {
                return PDFNet.Convert.office2PDFBuffer(input, options).then(function(buffer) {
                    PDFNet.PDFDoc.createFromBuffer(buffer).then(function(doc) {
                        doc.initSecurityHandler();
                        return doc;
                    });
                });
            };
            PDFNet.PDFDoc.prototype.requirePage = function(page_number) {
                if (1 !== arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'requirePage'. Expected 1 argument. Function Signature: requirePage(number)");
                if (page_number instanceof Promise) throw new TypeError("Received a Promise object in 1st input argument 'requirePage'. Promises require a 'yield' statement before being accessed.");
                if ("number" != typeof page_number) throw new TypeError("1st input argument '" + page_number + "' in function 'requirePage' is of type '" + _typeof(page_number) + "'. Expected type 'number'. Function Signature: requirePage(number).");
                if (0 >= page_number) throw Error("1st input argument '" + page_number + "' in function 'requirePage' is invalid. Expected number between 1 and number of pages in the document.");
                return PDFNet.messageHandler.sendWithPromise("PDFDoc.RequirePage", {
                    docId: this.id,
                    pageNum: page_number,
                }, this.userPriority);
            };
            PDFNet.beginOperation = function(optionsObj) {
                "undefined" === typeof optionsObj ? optionsObj = { allowMultipleInstances: !1 } : "undefined" === typeof optionsObj.allowMultipleInstances && console.log("Warning: passing in options object without value 'allowMultipleInstances'");
                if (0 < beginOperationCounter && !optionsObj.allowMultipleInstances) throw Error("a previous instance of PDFNet.beginOperation() has been called without being terminated by PDFNet.finishOperation(). If this is intentional, pass in an options object with its parameter 'allowMultipleInstances' set to 'true' (ex. optObj={}; optObj.allowMultipleInstances=true; PDFNet.beginOperation(optObj));");
                beginOperationCounter += 1;
                if (1 < arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'beginOperation'. Expected 0 to 1 arguments. Function Signature: beginOperation(optObj = {})");
                return PDFNet.messageHandler.sendWithPromise("BeginOperation", {}, this.userPriority)
            };
            PDFNet.finishOperation = function() {
                if (0 < beginOperationCounter) {
                    --beginOperationCounter;
                    if (0 != arguments.length) throw new RangeError(arguments.length + " arguments passed into function 'finishOperation'. Expected 0 arguments. Function Signature: finishOperation()");
                    return PDFNet.messageHandler.sendWithPromise("FinishOperation", {}, this.userPriority)
                }
            };
            PDFNet.runWithCleanup = function(callback, license_key) {
                var result, shouldFinishOperation = !1, shouldDeallocateStack = !1;
                return previousRunPromise = previousRunPromise.then(function() {
                }, function() {
                }).then(function() {
                    return PDFNet.initialize(license_key)
                }).then(function() {
                    shouldFinishOperation = !0;
                    return PDFNet.beginOperation()
                }).then(function() {
                    shouldDeallocateStack = !0;
                    PDFNet.startDeallocateStack();
                    return callback()
                }).then(function(val) {
                    result =
                        val;
                    shouldDeallocateStack = !1;
                    return PDFNet.endDeallocateStack()
                }).then(function() {
                    shouldFinishOperation = !1;
                    PDFNet.finishOperation();
                    if (0 < stackCallCounter) throw Error('Detected not yet deallocated stack. You may have called "PDFNet.startDeallocateStack()" somewhere without calling "PDFNet.endDeallocateStack()" afterwards.');
                    return result
                })["catch"](function(e) {
                    shouldDeallocateStack && PDFNet.endDeallocateStack();
                    shouldFinishOperation && PDFNet.finishOperation();
                    throw e;
                })
            };
            PDFNet.runWithoutCleanup = function(callback,
                license_key) {
                var shouldFinishOperation = !1;
                return previousRunPromise = previousRunPromise.then(function() {
                }, function() {
                }).then(function() {
                    return PDFNet.initialize(license_key)
                }).then(function() {
                    shouldFinishOperation = !0;
                    return PDFNet.beginOperation()
                }).then(function() {
                    return callback()
                }).then(function(result) {
                    shouldFinishOperation = !1;
                    PDFNet.finishOperation();
                    return result
                })["catch"](function(e) {
                    shouldFinishOperation && PDFNet.finishOperation();
                    throw e;
                })
            };
            exports.PDFNet = PDFNet
        })("undefined" === typeof window ?
            this : window)
    }]);
}).call(this || window)
