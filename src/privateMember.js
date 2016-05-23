import functionNamePolyfill from './lib/function.name.polyfill';
functionNamePolyfill();

let privateSpace;

(function definePrivateSpace() {
    class PrivateSpace {

        // Generates a unique id.
        uniqueId() {
            const formatSeed = (seedText, reqWidth) => {
                const seed = parseInt(seedText, 10).toString(16);
                if (reqWidth < seed.length) {
                    return seed.slice(seed.length - reqWidth);
                }
                if (reqWidth > seed.length) {
                    return new Array(1 + (reqWidth - seed.length)).join('0') + seed;
                }
                return seed;
            };

            return formatSeed(parseInt(new Date().getTime() / 1000, 10), 8)
                + formatSeed(Math.floor(Math.random() * 0x75bcd15), 5);
        }

        /**
         * Creates a private getter and setter instead of just property.
         * @param {string} name - Property name.
         * @param {*} defaultValue - The property default value.
         * @param {Object} target - The target class.
         * @param {boolean} protectedMode - Whether this should be protected instead of private.
         *
         * @returns {{get: propertyGetterWrapper, set: propertySetterWrapper}}
         */
        getPrivateSpace(name, defaultValue, target, protectedMode = false) {
            let propertyHolderDefined = false;
            const id = this.uniqueId() + name;

            // Defines a secret property holder on a current object instance.
            // Access to it is only permitted to those two wrappers below.
            /* eslint-disable no-use-before-define */
            function definePropertyHolder(object) {
                let holder = defaultValue;

                Object.defineProperty(object, id, {
                    enumerable: false,
                    configurable: true,
                    get: function getterWrapper() {
                        if (checkIfWrapped(getterWrapper.caller)) {
                            return holder;
                        }
                        throw new ReferenceError(`Access violation for private property: 
                            ${id}`);
                    },
                    set: function setterWrapper(value) {
                        if (checkIfWrapped(setterWrapper.caller)) {
                            holder = value;
                        } else {
                            throw new ReferenceError(`Access violation for private property:
                                 ${id}`);
                        }
                    }
                });
                propertyHolderDefined = true;
            }

            const propertyGetterWrapper = function propertyGetterWrapper() {
                if (_functionBelongsToObject(
                        this,
                        propertyGetterWrapper.caller,
                        target,
                        protectedMode)
                ) {
                    if (!propertyHolderDefined || this[id] === undefined) {
                        definePropertyHolder(this);
                    }
                    return this[id];
                }
                throw new ReferenceError(`Access violation for private property: ${name}`);
            };

            const propertySetterWrapper = function propertySetterWrapper(value) {
                if (_functionBelongsToObject(
                        this,
                        propertySetterWrapper.caller,
                        target,
                        protectedMode)
                ) {
                    if (!propertyHolderDefined) definePropertyHolder(this);
                    this[id] = value;
                } else {
                    throw new ReferenceError(`Access violation for private property: ${name}`);
                }
            };

            function checkIfWrapped(func) {
                return func === propertySetterWrapper || func === propertyGetterWrapper;
            }

            return {
                get: propertyGetterWrapper,
                set: propertySetterWrapper
            };
        }
    }
    privateSpace = new PrivateSpace();
}());

const resultCache = new WeakMap();
const mapOfGettersAndSetters = new WeakMap();
const uniqueArgument = privateSpace.uniqueId();

const getPropertyDescriptor = Object.getPropertyDescriptor ||
    ((obj, name) => {
        let desc;
        let object = obj;

        if (!(name in obj)) return undefined;
        do {
            desc = Object.getOwnPropertyDescriptor(object, name);
            if (desc) {
                break;
            }
            object = Object.getPrototypeOf(object);
        } while (obj);
        return desc;
    });

function getterOrSetterBelongsToObject(caller, self) {
    /**
     * Getters and setters compiled by babel are stored in functions which names are get/set.
     * If we want to verify that a call is made from a getter/setter that belongs to the same
     * class we will try to create a map of all getters/setters so that we can check if amongst
     * them we can find the getter/setter that called a private entity.
     **/

    if (!mapOfGettersAndSetters[self]) {
        const map = new Map();
        for (const property of Object.getOwnPropertyNames(self)) {
            const descriptor = getPropertyDescriptor(self, property);
            if (descriptor) {
                if (descriptor.get) {
                    if (descriptor.get.name === 'getterWrapper') {
                        map.set(descriptor.get(uniqueArgument), true);
                    } else {
                        map.set(descriptor.get, true);
                    }
                }
                if (descriptor.set) {
                    if (descriptor.set.name === 'setterWrapper') {
                        map.set(descriptor.set(uniqueArgument), true);
                    } else {
                        map.set(descriptor.set, true);
                    }
                }
            }
        }
        mapOfGettersAndSetters.set(self, map);
    }


    if (mapOfGettersAndSetters.has(self)) {
        if (mapOfGettersAndSetters.get(self).has(caller)) return true;
    }
    return false;
}

function checkIfCallerIsAPrivateWrapper(self, caller) {
    // In Firefox if we will encounter a strict function, trying to access it's caller will
    // throw an exception.
    try {
        // Check if the caller is a ___privateWrapper which indicates a true private call.
        // Also for block scoped functions we need to check caller.caller, so that calls to
        // private methods/props from them will be allowed.
        /* eslint-disable no-underscore-dangle */
        if (self.___privateWrapper && (self.___privateWrapper === caller
            || (caller.caller && self.___privateWrapper === caller.caller))) {
            return true;
        }
    } catch (e) {
        /* eslint-disable no-console */
        console.warn('Tried to access strict function\'s caller property.');
    }
    return false;
}

function functionBelongsToObjectInternal(self, caller) {
    if (checkIfCallerIsAPrivateWrapper(self, caller)) return true;

    if ((caller.name === 'get' || caller.name === 'set')
        && (getterOrSetterBelongsToObject(caller, self))) {
        return true;
    }

    return (
        (self[caller.name] === caller) ||
        (self.constructor === caller) ||
        (
            typeof self[caller.name] === 'function' && self[caller.name].name === 'methodWrapper'
            && self[caller.name](uniqueArgument, caller)
        )
    );
}

function checkIfTargetIsRelated(self, target) {
    while (self !== Object && self.constructor !== Object) {
        if (self === target) {
            return true;
        }
        /* eslint-disable no-param-reassign */
        self = Object.getPrototypeOf(self);
    }
    return false;
}

/**
 * Checks if `caller` belongs to `self`.
 * @param {Object} self - The current `this`.
 * @param {Object} caller - The caller function.
 * @param {Object} target - The original define property target.
 * @param {boolean} protectedMode - Whether this should be protected instead of private.
 * @returns {bool}
 * @private
 */
function _functionBelongsToObject(self, caller, target, protectedMode = false) {
    if (!caller) return false;

    // We are caching the results for better performance.
    let cacheOfResultsForSelf = resultCache.get(self);

    if (cacheOfResultsForSelf && cacheOfResultsForSelf.has(caller)) {
        return cacheOfResultsForSelf.get(caller);
    }

    let proto = Object.getPrototypeOf(self);

    // proto !== target - means that extend was made.
    let check;
    if ((caller.name === 'get' || caller.name === 'set')) {
        check = !getterOrSetterBelongsToObject(caller, target);
    } else {
        check = !(target[caller.name] || target.constructor === caller);
    }
    if (target && proto !== target && check) {
        if (protectedMode) {
            if (!checkIfTargetIsRelated(proto, target)) {
                return false;
            }
        } else {
            return false;
        }
    }

    let result = false;

    while (proto !== Object && result === false && proto.constructor !== Object) {
        result = functionBelongsToObjectInternal(proto, caller);
        proto = Object.getPrototypeOf(proto);
    }

    if (!cacheOfResultsForSelf) {
        cacheOfResultsForSelf = new WeakMap();
    }

    cacheOfResultsForSelf.set(caller, result);
    resultCache.set(self, cacheOfResultsForSelf);
    return result;
}

/**
 * ES7 Private decorator.
 * @param {Object} target - The target object.
 * @param {string} prop - Property name.
 * @param {Object} descriptor - The property descriptor object.
 * @param {boolean} protectedMode - Whether this should be protected instead of private.
 * @returns {*}
 */
export default function privateMember(target, prop, descriptor, protectedMode = false) {
    const resultDescriptor = {
        enumerable: false,
        configurable: descriptor.configurable
    };

    // Check if we are wrapping a property.
    // Property does not have any get, set and value but should have an initializer
    // (even if the value of the initializer would be null).
    if (!descriptor.set && !descriptor.get && !descriptor.value
        && descriptor.initializer !== undefined) {
        // We need to run the initializer to get the initial value of the property.
        // If the initializer is null, then it means the property does not have an initial value.
        const value = (typeof descriptor.initializer === 'function') ?
            descriptor.initializer() : undefined;

        // To make to property private, instead of declaring it, we will declare a protected getter
        // and setter
        const newDescriptor = privateSpace.getPrivateSpace(prop, value, target, protectedMode);

        newDescriptor.enumerable = false;
        newDescriptor.configurable = true;

        return newDescriptor;
    }

    // Check if we are wrapping a method.
    if (descriptor.value && descriptor.value.name !== 'methodWrapper') {
        resultDescriptor.writable = false;

        resultDescriptor.value = function methodWrapper(...args) {
            // If called with _uniqueArgument and a function as a second argument we will return
            // whether the method we are wrapping is the same as the one passed as a second
            // argument.
            if (args[0] === uniqueArgument) {
                return (descriptor.value === args[1]);
            }

            // Checking if this call is internal therefore we can permit it.
            if (_functionBelongsToObject(this, methodWrapper.caller, target, protectedMode)
                && descriptor.value) {
                // `bind(this).apply(this` seems redundant but it allows V8 to optimize this.
                return descriptor.value.bind(this).apply(this, args);
            }
            throw new ReferenceError(`Access violation for private method: ${prop}`);
        };
        // If it is already a wrapper leave it as it is.
    } else if (descriptor.value) {
        resultDescriptor.value = descriptor.value;
    }

    // Check if we are wrapping a getter or setter
    if (descriptor.set && descriptor.set.name !== 'setterWrapper') {
        resultDescriptor.set = function setterWrapper(...args) {
            // For getterOrSetterBelongsToObject we need to have a way of getting the wrapped
            // get/set.
            if (args[0] === uniqueArgument) {
                return descriptor.set;
            }

            if (_functionBelongsToObject(this, setterWrapper.caller, target, protectedMode)
                && descriptor.set) {
                return descriptor.set.apply(this, args);
            }
            throw new ReferenceError(`Access violation for private setter of property: ${prop}`);
        };
    } else if (descriptor.set) {
        resultDescriptor.set = descriptor.set;
    }

    if (descriptor.get && descriptor.get.name !== 'getterWrapper') {
        resultDescriptor.get = function getterWrapper(...args) {
            // For getterOrSetterBelongsToObject we need to have a way of getting the wrapped
            // get/set.
            if (args[0] === uniqueArgument) {
                return descriptor.get;
            }

            if (_functionBelongsToObject(this, getterWrapper.caller, target, protectedMode)
                && descriptor.get) {
                return descriptor.get.apply(this, args);
            }
            throw new ReferenceError(`Access violation for private getter of property: ${prop}`);
        };
    } else if (descriptor.get) {
        resultDescriptor.get = descriptor.get;
    }
    return resultDescriptor;
}
