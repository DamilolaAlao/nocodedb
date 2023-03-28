import { NocoDB } from '../src/index';

test('<type> should be function type', () => {
  expect(NocoDB('model')).toBe('function');
});
