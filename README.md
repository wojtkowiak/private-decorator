## `@privateMember` and `@protectedMember` decorators!

Have you ever dreamt about true privates in JS? 
I did not :wink: But when a friend was laughing at JS saying that the new ES6 class inheritance is useless without private/protected and seems that there is still no easy way to achieve that - I just said "challenge accepted" :wink:
But seriously, it started with a proof of concept and ended with a full private/protected class enhancement solution via decorators. 
What is notable is that this package has _zero_ dependencies. Also making this was a lot of low level JS fun :wink: 
 
### How to use it?

```
npm install private-decorator babel-plugin-transform-decorators-legacy babel-preset-es2015-without-strict babel-preset-stage-1 --save-dev
```

In your `.babelrc` you need to have 3 things:
```javascript
{
  "presets": ["es2015-without-strict", "stage-1"],
  "plugins": [
    "transform-decorators-legacy"
  ]
}
```
1. `es2015-without-strict` preset.
2. `stage-1` preset.
3. `transform-decorators-legacy` plugin enabled.

### Why?

Before you will actually use it, think thoroughly if you really need this. Standard techniques for making things private in JS exists and now with `Symbols` it is pretty easy.
The main reason this package was created was to eliminate 'unsupported' usage of libraries. Many times instead of reporting an issue or PR, developers were making workarounds and often use some internals of the library directly.
It is not a good way to go, as later when the library is updated, often it breaks the workarounds. Of course we usually do not care unless we are supporting those developers and helping them makes our time going to waste.
Of course I will not describe here all the normal benefits of private/protected types in class inheritance as this is well-known.
If you are convinced to try this, be aware that using this solution comes with a significant cost (see below).

### The cost

1. The whole solution is based on `Function.caller` use which is prohibited in `strict mode` - therefore strict mode must be disabled.
2. At every call to a private prop/get/set/method some CPU is needed to determine whether the call is valid. It is cached wherever it is possible, but I would advise not to use it where performance matters.
_The least efficient use case is accessing anything private/protected from setters/getters as it requires a lot of computation and memory to check if a getter belongs to a class and therefore has access to the guarded class member._
3. Probably not all use cases are supported - if you run into problems, check if your case is in the test scenarios.  

### Usage:

Both `@privateMember` and `@protectedMember` works with properties, getters, setters and methods.

```javascript
import { privateMember, protectedMember } from 'private-decorator';

class Foo {
   
       @privateMember
       privatePropertyWithDefault = 'test';
   
       @privateMember
       privateProperty;
   
       @privateMember
       get privateGetter() {
           return this.privateProperty;
       }
   
       @privateMember
       set privateSetter(value) {
           this.privateProperty = value;
       }
       
       @privateMember
       privateMethod() {
       
       }
}
```

### Usage in functions/callbacks

Normally this will fail:

```javascript
import { privateMember, protectedMember } from 'private-decorator';
class Test {

    @privateMember
    privateProperty;

    publicMethod() {
        [1, 2, 3].forEach((value) => {
            this.privateProperty += value;
        });
    }
}
```

since any function declared (arrow or normal does not matter) inside a method scope is not bound to the class. A call to something private from it is always detected as invalid since the parent scope to that function is global.
You can get this work using `bind` but for the ease of use I have created a `ScopedCallbacks` abstract class which gives you a `_` helper method.

```javascript
import { privateMember, protectedMember, ScopedCallbacks } from 'private-decorator'; 

class Test extends ScopedCallbacks {

    @privateMember
    privateProperty;

    publicMethod() {
        [1, 2, 3].forEach(this._((value) => {
            this.privateProperty += value;
        }));
    }
}
```

As you can see the arrow function is now wrapped in `this._` method which makes it work. 

### A word on the implementation

Instead of making a global container for the privates, this solution tries to keep all the data in the class instance itself. It also does not make properties under `Symbol` but instead it creates a private getters and setter for every decorated property. 
Be aware that even debuggers will not be able to access private properties, you will have to dig hard to reach for the value.
I have resigned of making shadow/proxy class with just the public members as I ran into many inheritance related problems.

## Tests

Run `npm run test` or `gulp test`. There is also `gulp watch` available.

## Contribution

PRs are always welcome. Be sure to update/check the tests.
I encourage you to use `gulp watch` while developing.
