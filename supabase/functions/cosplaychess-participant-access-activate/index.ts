import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const hex=(buf:ArrayBuffer)=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function hashToken(token:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Método não permitido.'},405);
  const service=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const body=await req.json().catch(()=>({}));
    const raw=String(body?.token||'').trim();
    const password=String(body?.password||'');
    if(raw.length<32)return json({error:'Link inválido ou incompleto.'},400);
    if(password.length<8)return json({error:'A senha precisa ter pelo menos 8 caracteres.'},400);
    const tokenHash=await hashToken(raw);
    const {data:link,error:linkError}=await service.from('cosplay_participant_access_tokens')
      .select('id,registration_id,profile_id,email,purpose,expires_at,used_at')
      .eq('token_hash',tokenHash)
      .maybeSingle();
    if(linkError||!link)return json({error:'Este link é inválido ou já expirou.'},403);
    if(link.used_at)return json({error:'Este link já foi utilizado.'},403);
    if(new Date(link.expires_at).getTime()<=Date.now())return json({error:'Este link expirou. Peça ao administrador para reenviar o acesso.'},403);

    const {data:profile,error:profileError}=await service.from('cosplay_participant_profiles')
      .select('id,user_id,registration_id')
      .eq('id',link.profile_id)
      .eq('registration_id',link.registration_id)
      .single();
    if(profileError||!profile)return json({error:'Perfil do participante não encontrado.'},404);

    let userId=profile.user_id||null;
    let user:any=null;
    if(userId){
      const found=await service.auth.admin.getUserById(userId);
      user=found.data?.user||null;
    }
    if(!user){
      const {data:users}=await service.auth.admin.listUsers({page:1,perPage:1000});
      user=users?.users?.find((u:any)=>String(u.email||'').trim().toLowerCase()===String(link.email).trim().toLowerCase())||null;
      userId=user?.id||null;
    }

    if(userId){
      const updated=await service.auth.admin.updateUserById(userId,{password,email_confirm:true});
      if(updated.error)return json({error:'Não foi possível atualizar a senha.'},500);
    }else{
      const created=await service.auth.admin.createUser({email:link.email,password,email_confirm:true,user_metadata:{participant_registration_id:link.registration_id,participant_profile_id:link.profile_id}});
      if(created.error||!created.data?.user?.id)return json({error:'Não foi possível criar a conta do participante.'},500);
      userId=created.data.user.id;
    }

    const now=new Date().toISOString();
    const profileUpdate=await service.from('cosplay_participant_profiles').update({user_id:userId,updated_at:now}).eq('id',link.profile_id);
    if(profileUpdate.error)return json({error:'Não foi possível vincular a conta ao perfil.'},500);
    const accessUpdate=await service.from('cosplay_participant_access').update({status:'active',activated_at:now,updated_at:now}).eq('registration_id',link.registration_id);
    if(accessUpdate.error)console.error('access update failed',accessUpdate.error.message);
    const tokenUpdate=await service.from('cosplay_participant_access_tokens').update({used_at:now}).eq('id',link.id).is('used_at',null);
    if(tokenUpdate.error)return json({error:'Não foi possível finalizar a ativação.'},500);

    return json({ok:true,email:link.email,message:'Senha criada com sucesso.'});
  }catch(error){console.error('participant access activate failed',error);return json({error:'Não foi possível concluir a ativação agora.'},500);}
});
