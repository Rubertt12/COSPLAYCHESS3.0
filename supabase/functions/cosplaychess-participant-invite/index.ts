import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
});

const LOGO_URL = 'https://cosplaychess-nine.vercel.app/img/logofergoverse.png';
const DEFAULT_REDIRECT = 'https://cosplaychess-nine.vercel.app/participante.html?activate=1';
const ACTIVATION_PAGE = 'https://cosplaychess-nine.vercel.app/participante.html';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char] || char));
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'participante';

function emailTemplate(params: { name: string; character: string; actionUrl: string; existing: boolean }) {
  const title = params.existing ? 'Recupere seu acesso' : 'Crie sua senha de acesso';
  const button = params.existing ? 'Criar nova senha' : 'Criar minha senha';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#09070d;font-family:Arial,Helvetica,sans-serif;color:#f6efe6;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#09070d;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;background:#0d0b12;border:1px solid #302536;border-radius:18px;overflow:hidden;"><tr><td align="center" style="padding:26px 24px 20px;border-bottom:1px solid #2f2634;"><img src="${LOGO_URL}" width="72" alt="Fergorverse" style="display:block;width:72px;height:auto;border:0;margin:0 auto 12px;"><div style="font-size:23px;font-weight:900;letter-spacing:3px;color:#e5be72;">COSPLAYCHESS</div><div style="margin-top:5px;font-size:9px;letter-spacing:2px;color:#8f8293;">ÁREA DO PARTICIPANTE</div></td></tr><tr><td style="padding:30px 30px 26px;"><p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Olá, <strong>${escapeHtml(params.name)}</strong>!</p><h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:#e5be72;">${title}</h1><p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#d9d0dc;">A organização do CosplayChess liberou sua Área do Participante${params.character ? ` para o cosplay <strong>${escapeHtml(params.character)}</strong>` : ''}. Por segurança, sua senha não é criada nem enviada pelo administrador.</p><p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#d9d0dc;">Use o botão abaixo para definir sua própria senha e vincular sua conta à inscrição aprovada.</p><div style="text-align:center;margin:24px 0 20px;"><a href="${escapeHtml(params.actionUrl)}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#d9ab55;color:#120d08;text-decoration:none;font-size:14px;font-weight:900;">${button}</a></div><div style="padding:14px 16px;border:1px solid #302536;border-radius:10px;background:#15111b;color:#aaa0ad;font-size:11px;line-height:1.55;">Este link é pessoal. Não encaminhe este e-mail para outras pessoas. Ranking, resultados e conquistas continuam sendo controlados pela organização.</div></td></tr><tr><td align="center" style="padding:14px 18px;border-top:1px solid #241d29;color:#716875;font-size:9px;">Fergorverse • CosplayChess</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Sessão administrativa não encontrada.' }, 401);

  const service = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const { data: userData, error: userError } = await service.auth.getUser(token);
    const adminUser = userData?.user;
    if (userError || !adminUser?.id) return json({ error: 'Sessão administrativa inválida.' }, 401);

    const { data: admin } = await service.from('cosplay_admins').select('user_id').eq('user_id', adminUser.id).maybeSingle();
    if (!admin) return json({ error: 'Acesso restrito ao administrador.' }, 403);

    const body = await req.json().catch(() => ({}));
    const registrationId = String(body?.registrationId || '').trim();
    if (!isUuid(registrationId)) return json({ error: 'Inscrição inválida.' }, 400);

    const { data: registration, error: registrationError } = await service
      .from('cosplay_registrations')
      .select('id,event_id,full_name,nick,email,character_name,character_photo_url,status')
      .eq('id', registrationId)
      .single();
    if (registrationError || !registration) return json({ error: 'Inscrição não encontrada.' }, 404);
    if (registration.status !== 'confirmed') return json({ error: 'Confirme a inscrição antes de liberar o acesso.' }, 409);

    const email = String(registration.email || '').trim().toLowerCase();
    if (!email) return json({ error: 'Este participante não possui e-mail cadastrado.' }, 409);

    let { data: profile } = await service
      .from('cosplay_participant_profiles')
      .select('id,registration_id,user_id,public_slug')
      .eq('registration_id', registration.id)
      .maybeSingle();

    if (!profile) {
      const publicSlug = `${slugify(registration.character_name || registration.full_name || 'participante')}-${registration.id.slice(0, 8)}`;
      const { data: created, error: createError } = await service.from('cosplay_participant_profiles').insert({
        registration_id: registration.id,
        event_id: registration.event_id,
        public_slug: publicSlug,
        display_name: String(registration.nick || registration.full_name || 'Participante').slice(0, 80),
        nick: String(registration.nick || '').slice(0, 60),
        character_name: String(registration.character_name || 'Personagem').slice(0, 120),
        character_photo_url: registration.character_photo_url || null,
        registration_status: registration.status
      }).select('id,registration_id,user_id,public_slug').single();
      if (createError || !created) return json({ error: 'Não foi possível preparar o perfil do participante.' }, 500);
      profile = created;
    }

    const { data: access } = await service.from('cosplay_participant_access').select('status,invite_count').eq('registration_id', registration.id).maybeSingle();
    if (access?.status === 'blocked') return json({ error: 'Este acesso está bloqueado. Desbloqueie-o antes de reenviar.' }, 409);

    const { data: usersData } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = usersData?.users?.find((user: any) => String(user.email || '').trim().toLowerCase() === email) || null;
    const redirectTo = Deno.env.get('PARTICIPANT_REDIRECT_URL') || DEFAULT_REDIRECT;
    let linkResult: any;
    let linkError: any;
    let existing = Boolean(existingUser);

    if (existing) {
      ({ data: linkResult, error: linkError } = await service.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } }));
    } else {
      ({ data: linkResult, error: linkError } = await service.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo,
          data: { participant_registration_id: registration.id, participant_profile_id: profile.id }
        }
      }));
      if (linkError) {
        existing = true;
        ({ data: linkResult, error: linkError } = await service.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } }));
      }
    }

    const generatedActionUrl = linkResult?.properties?.action_link;
    if (linkError || !generatedActionUrl) {
      console.error('participant generate link failed', linkError?.message || 'no action link');
      return json({ error: 'Não foi possível gerar o link seguro de acesso.' }, 502);
    }

    let actionUrl = generatedActionUrl;
    try {
      const verifyUrl = new URL(generatedActionUrl);
      const tokenHash = String(verifyUrl.searchParams.get('token') || '').trim();
      const verificationType = String(verifyUrl.searchParams.get('type') || (existing ? 'recovery' : 'invite')).trim().toLowerCase();
      if (tokenHash && ['invite', 'recovery'].includes(verificationType)) {
        const appUrl = new URL(ACTIVATION_PAGE);
        appUrl.searchParams.set('activate', '1');
        appUrl.searchParams.set('token_hash', tokenHash);
        appUrl.searchParams.set('type', verificationType);
        actionUrl = appUrl.toString();
      }
    } catch (error) {
      console.warn('participant custom action link fallback', error instanceof Error ? error.message : String(error));
    }

    const brevoKey = Deno.env.get('BREVO_API_KEY');
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || Deno.env.get('CONFIRMATION_FROM_EMAIL');
    const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'CosplayChess';
    if (!brevoKey || !senderEmail) return json({ error: 'O envio de e-mail ainda não está configurado.' }, 503);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': brevoKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email, name: registration.full_name || undefined }],
        subject: existing ? 'Seu acesso ao CosplayChess — criar nova senha' : 'Sua Área do Participante CosplayChess foi liberada',
        htmlContent: emailTemplate({
          name: registration.full_name || registration.nick || 'Participante',
          character: registration.character_name || '',
          actionUrl,
          existing
        }),
        tags: ['cosplaychess', 'participant-access'],
        headers: { 'X-CosplayChess-Registration': String(registration.id) }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('participant invite Brevo failed', response.status, detail.slice(0, 300));
      return json({ error: 'A Brevo não aceitou o envio do acesso.', detail: detail.slice(0, 250) }, 502);
    }

    const now = new Date().toISOString();
    const currentCount = Number(access?.invite_count || 0);
    const { error: accessError } = await service.from('cosplay_participant_access').upsert({
      registration_id: registration.id,
      profile_id: profile.id,
      status: profile.user_id ? 'active' : 'invited',
      invite_count: currentCount + 1,
      invited_at: access ? undefined : now,
      last_invited_at: now,
      activated_at: profile.user_id ? now : null,
      blocked_at: null,
      updated_at: now
    }, { onConflict: 'registration_id' });
    if (accessError) console.error('participant access status update failed', accessError.message);

    const providerResult = await response.json().catch(() => ({}));
    return json({
      ok: true,
      registrationId: registration.id,
      status: profile.user_id ? 'active' : 'invited',
      email,
      messageId: providerResult?.messageId || null,
      message: profile.user_id ? `Recuperação de acesso enviada para ${email}.` : `Convite de acesso enviado para ${email}.`
    });
  } catch (error) {
    console.error('participant invite failed', error instanceof Error ? error.message : String(error));
    return json({ error: 'Não foi possível liberar o acesso agora.' }, 500);
  }
});
