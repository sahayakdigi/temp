import pool from './db.js';

async function main() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Tables in database:');
    for (const row of tablesRes.rows) {
      console.log(`- ${row.table_name}`);
      const columnsRes = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [row.table_name]);
      for (const col of columnsRes.rows) {
        console.log(`  * ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      }
    }
  } catch (err) {
    console.error('Error listing tables:', err);
  } finally {
    pool.end();
  }
}

main();
