/**
 * Utilitários para cálculo de dias úteis (segunda a sexta).
 * Não considera feriados — apenas fins de semana.
 *
 * IMPORTANTE: Todas as funções que dependem de "hoje" usam
 * o fuso horário America/Sao_Paulo, independentemente do
 * timezone do servidor (que em produção pode ser UTC).
 */

export const SAO_PAULO_TZ = 'America/Sao_Paulo';

/**
 * Retorna a data/hora atual no fuso de São Paulo.
 * Útil para qualquer lógica que precise saber "que dia é hoje" no Brasil.
 */
export function nowInSaoPaulo(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;

  return new Date(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  );
}

/**
 * Retorna o último dia útil (seg–sex) do mês informado.
 *
 * @param year  Ano (ex.: 2025)
 * @param month Mês 0-indexed (0 = Jan, 11 = Dez)
 */
export function getLastBusinessDay(year: number, month: number): Date {
  // Último dia calendário do mês
  const lastDay = new Date(year, month + 1, 0);
  const dow = lastDay.getDay(); // 0=dom, 6=sab

  if (dow === 0) {
    // domingo → volta pra sexta
    lastDay.setDate(lastDay.getDate() - 2);
  } else if (dow === 6) {
    // sábado → volta pra sexta
    lastDay.setDate(lastDay.getDate() - 1);
  }

  return lastDay;
}

/**
 * Retorna o n-ésimo dia útil (seg–sex) do mês informado.
 *
 * @param year  Ano (ex.: 2025)
 * @param month Mês 0-indexed (0 = Jan, 11 = Dez)
 * @param n     Qual dia útil (1 = primeiro, 5 = quinto...)
 */
export function getNthBusinessDay(
  year: number,
  month: number,
  n: number,
): Date {
  let count = 0;
  let day = 0;

  while (count < n) {
    day++;
    const dt = new Date(year, month, day);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) {
      count++;
    }
  }

  return new Date(year, month, day);
}

/**
 * Verifica se hoje (em São Paulo) é o último dia útil do mês corrente.
 */
export function isTodayLastBusinessDay(): boolean {
  const now = nowInSaoPaulo();
  const lastBd = getLastBusinessDay(now.getFullYear(), now.getMonth());
  return (
    now.getFullYear() === lastBd.getFullYear() &&
    now.getMonth() === lastBd.getMonth() &&
    now.getDate() === lastBd.getDate()
  );
}

/**
 * Retorna quantos dias úteis o mês possui.
 */
export function countBusinessDaysInMonth(
  year: number,
  month: number,
): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }

  return count;
}

/**
 * Retorna quantos dias corridos restam no mês a partir de uma data.
 * Inclui o dia fornecido.
 */
export function remainingCalendarDays(from: Date): number {
  const lastDay = new Date(
    from.getFullYear(),
    from.getMonth() + 1,
    0,
  ).getDate();
  return lastDay - from.getDate() + 1;
}

/**
 * Retorna o total de dias corridos no mês de uma data.
 */
export function totalCalendarDays(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
