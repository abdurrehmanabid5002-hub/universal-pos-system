import test from 'node:test';
import assert from 'node:assert';
import { DecimalMath } from './index';

test('DecimalMath operations', () => {
  assert.strictEqual(DecimalMath.add('10.5000', '5.2500'), '15.7500');
  assert.strictEqual(DecimalMath.subtract('10.5000', '5.2500'), '5.2500');
  assert.strictEqual(DecimalMath.multiply('10.0000', '2.5000'), '25.0000');
  assert.strictEqual(DecimalMath.divide('25.0000', '2.0000'), '12.5000');
  assert.strictEqual(DecimalMath.roundTo('12.3456', 2), '12.35');
  assert.strictEqual(DecimalMath.roundTo('12.3444', 2), '12.34');
  assert.strictEqual(DecimalMath.compare('10.0000', '5.0000'), 1);
  assert.strictEqual(DecimalMath.compare('5.0000', '10.0000'), -1);
  assert.strictEqual(DecimalMath.compare('5.0000', '5.0000'), 0);
});
