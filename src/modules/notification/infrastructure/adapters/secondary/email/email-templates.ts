/**
 * Centralized email template builder for GerenciaX.
 * All email templates share the same branded layout wrapper.
 */

import { escapeHtml, sanitizeHref } from '../../../../../../common/utils/html.util.js';

const BRAND_COLOR = '#4F46E5';
const BRAND_NAME = 'GerenciaX';
const TEXT_COLOR = '#333';
const MUTED_COLOR = '#666';
const FOOTER_COLOR = '#999';

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:${BRAND_COLOR};padding:24px;text-align:center;">
          <span style="color:#ffffff;font-size:24px;font-weight:bold;">${BRAND_NAME}</span>
        </td></tr>
        <tr><td style="padding:32px 40px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #eee;">
          <p style="color:${FOOTER_COLOR};font-size:12px;text-align:center;margin:0;">
            ${BRAND_NAME} — Gestão inteligente para o seu negócio.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${sanitizeHref(href)}"
         style="background-color:${BRAND_COLOR};color:#fff;padding:12px 32px;
                text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
        ${escapeHtml(text)}
      </a>
    </div>`;
}

// ── Templates ──────────────────────────────────────────────

export function resetPasswordEmail(userName: string, resetLink: string): string {
  return layout(`
    <h2 style="color:${TEXT_COLOR};margin-top:0;">Redefinição de Senha</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>.</p>
    <p>Recebemos uma solicitação para redefinir sua senha na plataforma ${BRAND_NAME}.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    ${button('Redefinir Senha', resetLink)}
    <p style="color:${MUTED_COLOR};font-size:14px;">
      Este link expira em <strong>1 hora</strong>. Se você não solicitou essa alteração, ignore este e-mail.
    </p>
  `);
}

export function welcomeEmail(userName: string, loginLink: string): string {
  return layout(`
    <h2 style="color:${TEXT_COLOR};margin-top:0;">Bem-vindo ao ${BRAND_NAME}!</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>!</p>
    <p>Sua conta foi criada com sucesso. Estamos felizes em ter você conosco.</p>
    <p>Acesse a plataforma para começar a gerenciar seu negócio:</p>
    ${button('Acessar Plataforma', loginLink)}
    <p style="color:${MUTED_COLOR};font-size:14px;">
      Se tiver qualquer dúvida, entre em contato com nosso suporte.
    </p>
  `);
}

export function loginAlertEmail(
  userName: string,
  ip: string,
  device: string,
  dateTime: string,
  revokeLink: string,
): string {
  return layout(`
    <h2 style="color:${TEXT_COLOR};margin-top:0;">Novo login detectado</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>.</p>
    <p>Detectamos um novo acesso à sua conta:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:bold;width:120px;">IP</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(ip)}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:bold;">Dispositivo</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(device)}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:bold;">Data/Hora</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(dateTime)}</td></tr>
    </table>
    <p>Se <strong>não foi você</strong>, clique abaixo para proteger sua conta:</p>
    ${button('Não fui eu — revogar sessão', revokeLink)}
    <p style="color:${MUTED_COLOR};font-size:14px;">
      Se foi você, pode ignorar este e-mail com segurança.
    </p>
  `);
}

export function invoiceCreatedEmail(
  userName: string,
  referenceMonth: string,
  amount: string,
  dueDate: string,
  invoiceLink: string,
): string {
  return layout(`
    <h2 style="color:${TEXT_COLOR};margin-top:0;">Nova fatura gerada</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>.</p>
    <p>Sua fatura referente a <strong>${escapeHtml(referenceMonth)}</strong> foi gerada:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:bold;width:120px;">Valor</td>
          <td style="padding:8px 12px;border:1px solid #eee;">R$ ${escapeHtml(amount)}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:bold;">Vencimento</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(dueDate)}</td></tr>
    </table>
    ${button('Ver Fatura', invoiceLink)}
  `);
}

export function paymentConfirmedEmail(
  userName: string,
  amount: string,
  referenceMonth: string,
): string {
  return layout(`
    <h2 style="color:${TEXT_COLOR};margin-top:0;">Pagamento confirmado ✓</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>.</p>
    <p>Recebemos o pagamento de <strong>R$ ${escapeHtml(amount)}</strong> referente a <strong>${escapeHtml(referenceMonth)}</strong>.</p>
    <p>Obrigado por manter sua conta em dia!</p>
  `);
}

export function paymentOverdueEmail(
  userName: string,
  amount: string,
  dueDate: string,
  daysOverdue: number,
  invoiceLink: string,
): string {
  return layout(`
    <h2 style="color:#DC2626;margin-top:0;">Fatura vencida</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>.</p>
    <p>Sua fatura de <strong>R$ ${escapeHtml(amount)}</strong> com vencimento em <strong>${escapeHtml(dueDate)}</strong>
       está vencida há <strong>${daysOverdue} dia(s)</strong>.</p>
    <p>Regularize o pagamento para evitar a suspensão da sua conta:</p>
    ${button('Pagar Agora', invoiceLink)}
    <p style="color:${MUTED_COLOR};font-size:14px;">
      Se você já realizou o pagamento, aguarde a confirmação. Pode levar até 3 dias úteis para boleto.
    </p>
  `);
}

export function collaboratorCredentialsEmail(
  collaboratorName: string,
  email: string,
  temporaryPassword: string,
  companyName: string,
  loginLink: string,
): string {
  return layout(`
    <h2 style="color:${TEXT_COLOR};margin-top:0;">Suas credenciais de acesso</h2>
    <p>Olá, <strong>${escapeHtml(collaboratorName)}</strong>!</p>
    <p>Você foi adicionado como colaborador em <strong>${escapeHtml(companyName)}</strong> no ${BRAND_NAME}.</p>
    <p>Utilize as credenciais abaixo para acessar a plataforma:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:bold;width:120px;">E-mail</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:bold;">Senha temporária</td>
          <td style="padding:8px 12px;border:1px solid #eee;font-family:monospace;letter-spacing:1px;">${escapeHtml(temporaryPassword)}</td></tr>
    </table>
    <p><strong>⚠ Você será solicitado a trocar sua senha no primeiro acesso.</strong></p>
    ${button('Acessar Plataforma', loginLink)}
  `);
}

export function paymentRetryFailedEmail(
  userName: string,
  referenceMonth: string,
  retryCount: number,
  maxRetries: number,
  invoiceLink: string,
): string {
  const remaining = maxRetries - retryCount;
  return layout(`
    <h2 style="color:#DC2626;margin-top:0;">Tentativa de cobrança falhou</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>.</p>
    <p>A tentativa <strong>#${retryCount}</strong> de cobrança da fatura ref. <strong>${escapeHtml(referenceMonth)}</strong> falhou.</p>
    ${remaining > 0
      ? `<p>Restam <strong>${remaining}</strong> tentativa(s) antes da suspensão da sua conta.</p>`
      : `<p style="color:#DC2626;"><strong>Sua conta foi suspensa por inadimplência.</strong></p>`
    }
    <p>Atualize seus dados de pagamento para regularizar:</p>
    ${button('Regularizar Pagamento', invoiceLink)}
  `);
}

export function trialExpiredEmail(
  userName: string,
  toolName: string,
  toolPlansLink: string,
): string {
  return layout(`
    <h2 style="color:${TEXT_COLOR};margin-top:0;">Período de teste encerrado</h2>
    <p>Olá, <strong>${escapeHtml(userName)}</strong>.</p>
    <p>O período de teste gratuito da ferramenta <strong>${escapeHtml(toolName)}</strong> chegou ao fim.</p>
    <p>Se você gostou da ferramenta e deseja continuar utilizando, basta escolher um plano:</p>
    ${button('Ver Planos', toolPlansLink)}
    <p style="color:${MUTED_COLOR};font-size:14px;">
      Caso não deseje contratar, nenhuma ação é necessária. Seu acesso à ferramenta foi encerrado automaticamente.
    </p>
  `);
}
