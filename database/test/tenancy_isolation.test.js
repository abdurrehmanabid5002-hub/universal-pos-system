const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

test('Database Multi-Tenancy & Integrity Constraints', async (t) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://pos_user@localhost:5433/universal_pos'
  });
  await client.connect();

  await t.test('Same SKU can exist in different businesses but not within the same business', async () => {
    // 1. Create Business 1 and Business 2
    const b1 = await client.query(
      `INSERT INTO businesses (name, slug) VALUES ('Test Store 1', 'test-store-1-' || gen_random_uuid()) RETURNING id`
    );
    const b2 = await client.query(
      `INSERT INTO businesses (name, slug) VALUES ('Test Store 2', 'test-store-2-' || gen_random_uuid()) RETURNING id`
    );

    const b1Id = b1.rows[0].id;
    const b2Id = b2.rows[0].id;

    // Insert SKU "SHARED-SKU-1" in b1
    await client.query(
      `INSERT INTO products (business_id, sku, name, cost_price, selling_price)
       VALUES ($1, 'SHARED-SKU-1', 'Product 1', 10, 20)`,
      [b1Id]
    );

    // Insert same SKU "SHARED-SKU-1" in b2 -> MUST SUCCEED (tenant isolation)
    const p2 = await client.query(
      `INSERT INTO products (business_id, sku, name, cost_price, selling_price)
       VALUES ($1, 'SHARED-SKU-1', 'Product 2', 15, 30) RETURNING id`,
      [b2Id]
    );
    assert.ok(p2.rows[0].id, 'SKU in second business should be created successfully');

    // Duplicate SKU in b1 -> MUST FAIL with UNIQUE constraint violation
    await assert.rejects(async () => {
      await client.query(
        `INSERT INTO products (business_id, sku, name, cost_price, selling_price)
         VALUES ($1, 'SHARED-SKU-1', 'Product 1 Duplicate', 10, 20)`,
        [b1Id]
      );
    }, /unique|duplicate key/i);
  });

  await t.test('Cross-tenant foreign key violation is blocked', async () => {
    const b1 = await client.query(
      `INSERT INTO businesses (name, slug) VALUES ('Cross Store 1', 'cross-store-1-' || gen_random_uuid()) RETURNING id`
    );
    const b2 = await client.query(
      `INSERT INTO businesses (name, slug) VALUES ('Cross Store 2', 'cross-store-2-' || gen_random_uuid()) RETURNING id`
    );

    const b1Id = b1.rows[0].id;
    const b2Id = b2.rows[0].id;

    // Create Category in b1
    const cat1 = await client.query(
      `INSERT INTO categories (business_id, name) VALUES ($1, 'Category 1') RETURNING id`,
      [b1Id]
    );

    // Attempt to create Product in b2 referencing Category in b1 -> MUST FAIL (composite FK constraint)
    await assert.rejects(async () => {
      await client.query(
        `INSERT INTO products (business_id, category_id, sku, name, cost_price, selling_price)
         VALUES ($1, $2, 'CROSS-PROD-1', 'Cross Product', 10, 20)`,
        [b2Id, cat1.rows[0].id]
      );
    }, /foreign key/i);
  });

  await client.end();
});
