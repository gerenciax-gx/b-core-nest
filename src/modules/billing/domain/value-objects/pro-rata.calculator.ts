import {
  remainingCalendarDays,
  totalCalendarDays,
} from '../../../../common/helpers/business-day.helper.js';

/**
 * Calcula o valor pro-rata para assinatura contratada no meio do mês.
 *
 * @param fullPrice Preço cheio mensal
 * @param startDate Data em que a assinatura começou (no meio do mês)
 * @returns Valor proporcional arredondado para 2 casas
 */
export function calculateMidCycleProRata(
  fullPrice: number,
  startDate: Date,
): number {
  const remaining = remainingCalendarDays(startDate);
  const total = totalCalendarDays(startDate);

  if (remaining >= total) return fullPrice; // mês inteiro

  const proRata = (remaining / total) * fullPrice;
  return Math.round(proRata * 100) / 100;
}

/**
 * Calcula o pro-rata para mudança de plano (upgrade/downgrade).
 *
 * Cobra a diferença proporcional até o fim do mês corrente.
 * Se o novo plano for mais barato, retorna 0 (crédito pode ser implementado depois).
 *
 * @param oldPrice  Preço do plano anterior
 * @param newPrice  Preço do novo plano
 * @param changeDate Data da mudança
 * @returns Valor proporcional da diferença (>= 0)
 */
export function calculatePlanChangeProRata(
  oldPrice: number,
  newPrice: number,
  changeDate: Date,
): number {
  if (newPrice <= oldPrice) return 0; // downgrade — sem cobrança extra

  const diff = newPrice - oldPrice;
  const remaining = remainingCalendarDays(changeDate);
  const total = totalCalendarDays(changeDate);

  const proRata = (remaining / total) * diff;
  return Math.round(proRata * 100) / 100;
}
