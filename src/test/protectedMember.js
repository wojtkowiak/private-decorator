import protectedMember from '../protectedMember';

import chai from 'chai';
import dirty from 'dirty-chai';
chai.use(dirty);
const { expect } = chai;

class ProtectedClass {
    @protectedMember
    protectedProperty;

    @protectedMember
    protectedMethod() {
    }
}

class ChildClass extends ProtectedClass {
    shouldNotThrow() {
        this.protectedProperty = 'test';
    }

    shouldNotThrow2() {
        this.protectedMethod();
    }
}

describe('@protectedMember', () => {
    describe('standalone class', () => {
        it('should throw when accessing protected method', () => {
            const i = new ProtectedClass();
            expect(i.protectedMethod).to.throw(/Access violation for private method/);
        });

        it('should throw when accessing private property', () => {
            const i = new ProtectedClass();
            let thrown = false;
            try {
                i.protectedProperty = 'tmp';
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private property/);
            }
            expect(thrown).to.be.true();
        });
    });

    describe('child class', () => {
        it('should throw when accessing private parent method', () => {
            const i = new ChildClass();
            expect(i.protectedMethod).to.throw(/Access violation for private method/);
        });

        it('should throw when accessing private parent property', () => {
            const i = new ChildClass();
            let thrown = false;
            try {
                i.protectedProperty = 'tmp';
            } catch (e) {
                thrown = true;
                expect(e.message).to.match(/Access violation for private property/);
            }
            expect(thrown).to.be.true();
        });

        it('should not throw when accessing protected method from parent', () => {
            const i = new ChildClass();
            expect(i.shouldNotThrow.bind(i)).to.not.throw();
        });

        it('should not throw when accessing protected property from parent', () => {
            const i = new ChildClass();
            expect(i.shouldNotThrow2.bind(i)).to.not.throw();
        });
    });
});
