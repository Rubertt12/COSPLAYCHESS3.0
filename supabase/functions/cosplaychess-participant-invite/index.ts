import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers:{...cors,'Content-Type':'application/json; charset=utf-8'} });
const SITE = 'https://cosplaychess-nine.vercel.app';
const LOGO = `${SITE}/img/logofergoverse.png`;
const esc = (v:unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
const isUuid = (v:string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const slugify = (v:string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,48) || 'participante';
const hex = (buf:ArrayBuffer) => [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function hashToken(token:string){ return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))); }
function randomToken(){ const bytes=new Uint8Array(32); crypto.getRandomValues(bytes); return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }

function emailTemplate(name:string, character:string, url:string, recovery:boolean){
  const title=recovery?'Crie uma nova senha':'Crie sua senha de acesso';
  const button=recovery?'Criar nova senha':'Criar minha senha';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#09070d;font-family:Arial,sans-serif;color:#f6efe6"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#09070d"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#0d0b12;border:1px solid #302536;border-radius:18px;overflow:hidden"><tr><td align="center" style="padding:26px 24px 20px;border-bottom:1px solid #2f2634"><img src="${LOGO}" width="72" alt="CosplayChess" style="display:block;margin:0 auto 12px"><div style="font-size:23px;font-weight:900;letter-spacing:3px;color:#e5be72">COSPLAYCHESS</div><div style="margin-top:5px;font-size:9px;letter-spacing:2px;color:#8f8293">ÁREA DO PARTICIPANTE</div></td></tr><tr><td style="padding:30px"><p style="font-size:15px">Olá, <strong>${esc(name)}</strong>!</p><h1 style="font-size:24px;color:#e5be72">${title}</h1><p style="font-size:14px;line-height:1.6;color:#d9d0dc">A organização liberou seu acesso${character?` para o cosplay <strong>${esc(character)}</strong>`:''}. Use o botão abaixo para definir sua própria senha.</p><div style="text-align:center;margin:26px 0"><a href="${esc(url)}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#d9ab55;color:#120d08;text-decoration:none;font-size:14px;font-weight:900">${button}</a></div><div style="padding:14px 16px;border:1px solid #5d4931;border-radius:10px;background:#18120c;color:#e9cf9a;font-size:12px;line-height:1.55"><strong>Validade: 6 horas.</strong><br>Depois desse período o link expira. Ele também deixa de funcionar imediatamente após ser utilizado. Não encaminhe este e-mail para outras pessoas.</div></td></tr><tr><td align="center" style="padding:14px;color:#716875;font-size:9px;border-top:1px solid #241d29">Fergorverse • CosplayChess</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'Método não permitido.'},405);
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!jwt) return json({error:'Sessão administrativa não encontrada.'},401);
  const service=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:ud,error:ue}=await service.auth.getUser(jwt);
    if(ue||!ud?.user?.id) return json({error:'Sessão administrativa inválida.'},401);
    const {data:admin}=await service.from('cosplay_admins').select('user_id').eq('user_id',ud.user.id).maybeSingle();
    if(!admin) return json({error:'Acesso restrito ao administrador.'},403);
    const body=await req.json().catch(()=>({}));
    const registrationId=String(body?.registrationId||'').trim();
    if(!isUuid(registrationId)) return json({error:'Inscrição inválida.'},400);
    const {data:reg,error:re}=await service.from('cosplay_registrations').select('id,event_id,full_name,nick,email,character_name,character_photo_url,status').eq('id',registrationId).single();
    if(re||!reg) return json({error:'Inscrição não encontrada.'},404);
    if(reg.status!=='confirmed') return json({error:'Confirme a inscrição antes de liberar o acesso.'},409);
    const email=String(reg.email||'').trim().toLowerCase();
    if(!email) return json({error:'Este participante não possui e-mail cadastrado.'},409);

    let {data:profile}=await service.from('cosplay_participant_profiles').select('id,registration_id,user_id,public_slug').eq('registration_id',reg.id).maybeSingle();
    if(!profile){
      const publicSlug=`${slugify(reg.character_name||reg.full_name||'participante')}-${reg.id.slice(0,8)}`;
      const made=await service.from('cosplay_participant_profiles').insert({registration_id:reg.id,event_id:reg.event_id,public_slug:publicSlug,display_name:String(reg.nick||reg.full_name||'Participante').slice(0,80),nick:String(reg.nick||'').slice(0,60),character_name:String(reg.character_name||'Personagem').slice(0,120),character_photo_url:reg.character_photo_url||null,registration_status:reg.status}).select('id,registration_id,user_id,public_slug').single();
      if(made.error||!made.data) return json({error:'Não foi possível preparar o perfil do participante.'},500);
      profile=made.data;
    }
    const {data:access}=await service.from('cosplay_participant_access').select('status,invite_count').eq('registration_id',reg.id).maybeSingle();
    if(access?.status==='blocked') return json({error:'Este acesso está bloqueado. Desbloqueie-o antes de reenviar.'},409);

    let existing=Boolean(profile.user_id);
    if(!existing){
      const {data:users}=await service.auth.admin.listUsers({page:1,perPage:1000});
      existing=Boolean(users?.users?.find((u:any)=>String(u.email||'').toLowerCase()===email));
    }
    await service.from('cosplay_participant_access_tokens').delete().eq('registration_id',reg.id).is('used_at',null);
    const raw=randomToken();
    const tokenHash=await hashToken(raw);
    const expiresAt=new Date(Date.now()+6*60*60*1000).toISOString();
    const ins=await service.from('cosplay_participant_access_tokens').insert({registration_id:reg.id,profile_id:profile.id,email,token_hash:tokenHash,purpose:existing?'recovery':'activate',expires_at:expiresAt,created_by:ud.user.id});
    if(ins.error) return json({error:'Não foi possível criar o link temporário.'},500);
    const actionUrl=`${SITE}/participante.html?access_token=${encodeURIComponent(raw)}`;

    const brevoKey=Deno.env.get('BREVO_API_KEY');
    const senderEmail=Deno.env.get('BREVO_SENDER_EMAIL')||Deno.env.get('CONFIRMATION_FROM_EMAIL');
    const senderName=Deno.env.get('BREVO_SENDER_NAME')||'CosplayChess';
    if(!brevoKey||!senderEmail) return json({error:'O envio de e-mail ainda não está configurado.'},503);
    const mail=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{accept:'application/json','api-key':brevoKey,'content-type':'application/json'},body:JSON.stringify({sender:{email:senderEmail,name:senderName},to:[{email,name:reg.full_name||undefined}],subject:existing?'Seu acesso ao CosplayChess — link válido por 6 horas':'Sua Área do Participante CosplayChess foi liberada — link válido por 6 horas',htmlContent:emailTemplate(reg.full_name||reg.nick||'Participante',reg.character_name||'',actionUrl,existing),tags:['cosplaychess','participant-access'],headers:{'X-CosplayChess-Registration':String(reg.id)}})});
    if(!mail.ok){ const detail=await mail.text(); console.error('Brevo failed',mail.status,detail.slice(0,300)); return json({error:'A Brevo não aceitou o envio do acesso.'},502); }

    const now=new Date().toISOString();
    const count=Number(access?.invite_count||0);
    await service.from('cosplay_participant_access').upsert({registration_id:reg.id,profile_id:profile.id,status:profile.user_id?'active':'invited',invite_count:count+1,invited_at:access?undefined:now,last_invited_at:now,activated_at:profile.user_id?now:null,blocked_at:null,updated_at:now},{onConflict:'registration_id'});
    const provider=await mail.json().catch(()=>({}));
    return json({ok:true,registrationId:reg.id,status:profile.user_id?'active':'invited',email,expiresAt,messageId:provider?.messageId||null,message:`Link de acesso válido por 6 horas enviado para ${email}.`});
  }catch(error){ console.error('participant access send failed',error); return json({error:'Não foi possível liberar o acesso agora.'},500); }
});
