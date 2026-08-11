import { sql } from './db';
import { parcelaDoMes, valorDaParcela } from './parcelado';

/**
 * Cria o mês para o usuário se ainda não existir, copiando custos fixos,
 * orçamento e meta do mês anterior mais recente. Idempotente.
 *
 * Custos fixos vindos de um parcelado não são copiados: eles são recriados a
 * partir do próprio parcelado, para respeitar o prazo e o valor da parcela.
 */
export async function iniciarMesParaUsuario(uid: string, month: string): Promise<{ criado: boolean; copiados: number }> {
  const existe = await sql`select 1 from months where user_id = ${uid} and month = ${month}`;
  if (existe[0]) return { criado: false, copiados: 0 };

  const prevRows = await sql`select month, meta from months
    where user_id = ${uid} and month < ${month} order by month desc limit 1`;
  const prev = prevRows[0] as { month: string; meta: number } | undefined;

  await sql`insert into months (user_id, month, meta) values (${uid}, ${month}, ${prev?.meta ?? 0})
    on conflict (user_id, month) do nothing`;

  let copiados = 0;
  if (prev) {
    const fixos = await sql`select descricao, valor, categoria, dia_vencimento from transactions
      where user_id = ${uid} and month = ${prev.month} and type = 'fixo' and parcelado_id is null`;
    for (const f of fixos) {
      await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento)
        values (${uid}, ${month}, 'fixo', ${f.descricao}, ${f.valor}, ${f.categoria}, ${f.dia_vencimento})`;
    }
    copiados = fixos.length;

    const buds = await sql`select categoria, limite from budgets
      where user_id = ${uid} and month = ${prev.month}`;
    for (const b of buds) {
      await sql`insert into budgets (user_id, month, categoria, limite)
        values (${uid}, ${month}, ${b.categoria}, ${b.limite})
        on conflict (user_id, month, categoria) do nothing`;
    }
  }

  // parcelados vigentes neste mês viram lançamento fixo com o valor da parcela certa
  const parcelados = await sql`select id, nome, tipo, categoria, valor_total::float as valor_total,
    parcelas, valor_parcela::float as valor_parcela,
    primeiro_vencimento::text as primeiro_vencimento, dia_vencimento
    from parcelados where user_id = ${uid}`;
  for (const p of parcelados) {
    const indice = parcelaDoMes(p as never, month);
    if (indice === null) continue;
    const valor = p.valor_total != null && p.parcelas
      ? valorDaParcela(p.valor_total as number, p.parcelas as number, indice)
      : (p.valor_parcela as number);
    const desc = p.parcelas ? `${p.nome} (${indice}/${p.parcelas})` : (p.nome as string);
    await sql`insert into transactions
      (user_id, month, type, descricao, valor, categoria, dia_vencimento, parcelado_id)
      values (${uid}, ${month}, 'fixo', ${desc}, ${valor}, ${p.categoria}, ${p.dia_vencimento}, ${p.id})`;
    copiados++;
  }

  return { criado: true, copiados };
}
