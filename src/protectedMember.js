import privateMember from './privateMember';

export default function protectedMember(target, prop, descriptor) {
    return privateMember(target, prop, descriptor, true);
}
