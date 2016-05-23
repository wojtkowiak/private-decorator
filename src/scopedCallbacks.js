import protectedMember from './protectedMember';

export default class ScopedCallbacks {
    // ___privateWrapper is used to wrap a reference to o private method, so that you are able to
    // pass a private method as callback to built-in JS methods
    ___privateWrapper(functionReference, ...rest) {
        // We are getting the function we are wrapping and the rest arguments captured to an
        // array called `rest`.
        // Now we are just calling the wrapped function with all the arguments. Arguments are
        // destructed from array via the spread operator.
        return functionReference(...rest);
    }

    // Just a helper function to wrap a method with ___privateWrapper
    @protectedMember
    _(functionReference) {
        // This function returns a reference to ___privateWrapper with bound `this` and a reference
        // to the function being wrapped (also with bound `this`)
        /* eslint-disable no-underscore-dangle */
        return this.___privateWrapper.bind(this, functionReference.bind(this));
    }
}
