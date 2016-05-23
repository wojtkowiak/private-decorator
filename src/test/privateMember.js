/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import privateMember from '../privateMember';

import ScopedCallbacks from '../scopedCallbacks';
import chai from 'chai';
import dirty from 'dirty-chai';
chai.use(dirty);
const { expect } = chai;

class Foo {

    /* Private */
    @privateMember
    privateProperty = 'test';

    @privateMember
    bazHolder;

    @privateMember
    get baz() {
        return this.bazHolder;
    }

    @privateMember
    set baz(value) {
        this.bazHolder = value;
    }

    @privateMember
    privateMethod() {
        // Check access to our own private prop.
        let tmp = this.privateProperty;
        this.privateProperty = 'test';

        // Check setter and getter.
        this.baz = 'test';
        tmp = this.baz;
    }

    /* Public */
    constructor() {
        // Check access to our own private prop.
        let tmp = this.privateProperty;
        this.privateProperty = 'test';

        // Check setter and getter.
        this.baz = 'test';
        tmp = this.baz;

        // Check if we can call our own private method.
        this.privateMethod();
    }

    publicMethod() {
        // Check access to our own private prop.
        let tmp = this.privateProperty;
        this.privateProperty = 'test';

        // Check setter and getter.
        this.baz = 'test';
        tmp = this.baz;

        // Check if we can call our own private method.
        this.privateMethod();
    }

    getProperties() {
        return [this.privateProperty, this.baz];
    }

    setProperties() {
        this.privateProperty = 'testValue';
        this.baz = 'testValue';
    }
}

class Bar extends Foo {

    @privateMember
    myPrivateMethod() {

    }

    anotherPublicMethod() {
        this.publicMethod();
        this.myPrivateMethod();
    }

    shouldThrow() {
        this.privateMethod();
    }

    shouldThrow2() {
        console.log(this.privateProperty);
    }

    shouldThrow3() {
        console.log(this.baz);
    }
}

describe('@privateMember', () => {
    describe('standalone class', () => {
        it('should throw when accessing private method', () => {
            const i = new Foo();
            expect(i.privateMethod).to.throw(/Access violation for private method/);
        });

        it('should throw when accessing private property', () => {
            const i = new Foo();
            let thrown = false;
            try {
                i.privateProperty = 'tmp';
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private property/);
            }
            expect(thrown).to.be.true();
        });

        it('should throw when accessing private getter', () => {
            const i = new Foo();
            let thrown = false;
            try {
                console.log(i.baz);
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private getter of property/);
            }
            expect(thrown).to.be.true();
        });

        it('should throw when accessing private setter', () => {
            const i = new Foo();
            let thrown = false;
            try {
                i.baz = 'test';
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private setter of property/);
            }
            expect(thrown).to.be.true();
        });

        it('should not throw when accessing private members from the same class', () => {
            const i = new Foo();
            expect(i.publicMethod.bind(i)).to.not.throw();
        });

        it('should not brake properties or getters/setters', () => {
            const i = new Foo();
            i.setProperties();
            expect(i.getProperties()).to.be.deep.equal(['testValue', 'testValue']);
        });
    });

    describe('child class', () => {
        it('should throw when accessing private parent method', () => {
            const i = new Bar();
            expect(i.privateMethod).to.throw(/Access violation for private method/);
        });

        it('should throw when accessing private parent property', () => {
            const i = new Bar();
            let thrown = false;
            try {
                i.privateProperty = 'tmp';
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private property/);
            }
            expect(thrown).to.be.true();
        });

        it('should throw when accessing private parent getter', () => {
            const i = new Bar();
            let thrown = false;
            try {
                console.log(i.baz);
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private getter of property/);
            }
            expect(thrown).to.be.true();
        });

        it('should throw when accessing private parent setter', () => {
            const i = new Bar();
            let thrown = false;
            try {
                i.baz = 'test';
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private setter of property/);
            }
            expect(thrown).to.be.true();
        });

        it('should not throw when accessing private parent members from the same class', () => {
            const i = new Bar();
            expect(i.publicMethod.bind(i)).to.not.throw();
        });

        it('should not brake parent properties or getters/setters', () => {
            const i = new Bar();
            i.setProperties();
            expect(i.getProperties()).to.be.deep.equal(['testValue', 'testValue']);
        });

        it('should not throw when accessing public methods from parent', () => {
            const i = new Bar();
            expect(i.anotherPublicMethod.bind(i)).to.not.throw();
        });

        it('should throw when accessing private method from parent', () => {
            const i = new Bar();
            expect(i.shouldThrow.bind(i)).to.throw(/Access violation for private method/);
        });

        it('should throw when accessing private property from parent', () => {
            const i = new Bar();
            expect(i.shouldThrow2.bind(i)).to.throw(/Access violation for private property/);
        });

        it('should throw when accessing private getter from parent', () => {
            const i = new Bar();
            expect(i.shouldThrow3.bind(i)).to.throw(
                /Access violation for private getter of property/
            );
        });
    });
});

describe('ScopedCallbacks', () => {
    class Test extends ScopedCallbacks {

        @privateMember
        privateProperty;

        publicMethod() {
            [1, 2, 3].forEach(this._((value) => {
                this.privateProperty = value;
            }));
            return this.privateProperty;
        }
    }

    it('should allow to call private members from callbacks', () => {
        const i = new Test();
        expect(i.publicMethod()).to.be.equal(3);
    });
});
