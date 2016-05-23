/*
 Polyfill for `function.name`.
 MIT License
 Copyright (c) 2014 James M. Greene
 https://github.com/JamesMGreene/Function.name
 */

export default function functionNamePolyfill() {
    const fnNamePrefixRegex = /^[\S\s]*?function\s*/;
    const fnNameSuffixRegex = /[\s\(\/][\S\s]+$/;

    function name() {
        let functionName = '';
        if (this === Function || this === Function.prototype.constructor) {
            functionName = 'Function';
        } else if (this !== Function.prototype) {
            functionName = ('' + this).replace(fnNamePrefixRegex, '').replace(fnNameSuffixRegex, '');
        }
        return functionName;
    }

    // Inspect the polyfill-ability of this browser
    const needsPolyfill = !('name' in Function.prototype && 'name' in (function x() {
    }));

    const canDefineProp = typeof Object.defineProperty === 'function' &&
        (function testPropDefine() {
            let result;
            try {
                Object.defineProperty(Function.prototype, '_xyz', {
                    get: function get() {
                        return 'blah';
                    },
                    configurable: true
                });
                result = Function.prototype._xyz === 'blah';
                delete Function.prototype._xyz;
            } catch (e) {
                result = false;
            }
            return result;
        }());

    // Polyfill it!
    if (canDefineProp && needsPolyfill) {
        Object.defineProperty(Function.prototype, 'name', {
            get: name
        });
    }
}
