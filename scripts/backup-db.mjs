// Exporta todas as tabelas do banco (DATABASE_URL) para um JSON de backup.
// Uso: DATABASE_URL="<string>" node scripts/backup-db.mjs
import { neon } from '@neondatabase/serverless';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL não definida'); process.exit(1); }
const sql = neon(url);

const TABELAS = [
  'users', 'months', 'transactions', 'cards',
  'card_purchases', 'card_invoice_payments', 'budgets', 'telegram_pending',
];

const backup = {};
for (const t of TABELAS) {
  backup[t] = await sql.query(`select * from ${t}`);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'backups');
mkdirSync(dir, { recursive: true });
const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
const arquivo = join(dir, `backup-${carimbo}.json`);
writeFileSync(arquivo, JSON.stringify(backup, null, 2), 'utf8');

console.log('Backup salvo em:', arquivo);
for (const t of TABELAS) console.log(`  ${t}: ${backup[t].length} linhas`);
