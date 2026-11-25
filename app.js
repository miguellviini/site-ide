const $=s=>document.querySelector(s);
const STAFF=['admin','secretaria','financeiro','treinador','comunicacao'];
let RECOV=/[#&]type=recovery/.test(location.hash),OK=false,want='inicio',ME=null,PAPEL=null,sb=null,IS_ATLETA=false;
try{const C=window.IDE_CONFIG||{};if(C.SUPABASE_URL&&C.SUPABASE_KEY&&window.supabase)sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY,{auth:{storage:window.sessionStorage}})}catch(x){}
function route(){let h=(location.hash||'#inicio').slice(1);if(RECOV)h='novasenha';if(['adm','atleta'].includes(h)&&!OK){want=h;h='login'}if(h==='adm'&&OK&&!STAFF.includes(PAPEL))h='inicio';if(h==='atleta'&&OK&&!IS_ATLETA)h='inicio';$('#nav-login').hidden=OK;$('#nav-sair').hidden=!OK;$('#nav a[href="#adm"]').hidden=!OK||!STAFF.includes(PAPEL);$('#nav a[href="#atleta"]').hidden=!OK||!IS_ATLETA;const v=document.getElementById('v-'+h)||$('#v-inicio');document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e===v));document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+v.id.slice(2)));document.querySelectorAll('#nav .ng').forEach(g=>{g.classList.toggle('on',!!g.querySelector('a.on'));g.open=false});scrollTo(0,0);if(h==='atleta')loadAt()}
addEventListener('hashchange',route);route();
// Matrícula
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fd=v=>v?v.split('-').reverse().join('/'):'—';
const F=[['Dados do atleta',[['nome','Nome completo'],['nasc','Data de nascimento','date'],['rg','RG'],['cpf','CPF'],['cep','CEP'],['foto','Foto do atleta (para a carteirinha)','img']]],
['Responsável',[['resp','Nome do responsável'],['zap','WhatsApp com DDD','tel'],['email','E-mail','email']]],
['Pai',[['pai','Nome do pai'],['paiRg','RG do pai'],['paiCpf','CPF do pai']]],
['Mãe',[['mae','Nome da mãe'],['maeRg','RG da mãe'],['maeCpf','CPF da mãe']]],
['Informações esportivas',[['pos','Posição'],['clube','Clube anterior (se houver)'],['cat','Categoria desejada']]],
['Documentos (foto nítida de cada um)',[['dCert','Certidão de nascimento ou RG','img'],['dRes','Comprovante de residência','img'],['dEsc','Comprovante de escolaridade','img']]],
['Consentimentos',[['c1','Li a <a href="#privacidade" target="_blank">Política de privacidade</a> e autorizo o tratamento dos dados do atleta (LGPD).','chk'],['c2','Autorizo o uso de imagem do atleta (opcional).','chk']]],
['Confirmação',[]]];
const REQ={foto:'a foto do atleta',nome:'nome do atleta',nasc:'data de nascimento',rg:'RG',cpf:'CPF',resp:'nome do responsável',zap:'WhatsApp',c1:'o consentimento LGPD'};
let s=0,V={},CATN=[];
// CSV para Excel pt-BR (; e BOM). Células que começam com = + - @ ganham ' para não virarem fórmula.
function csv(nome,cols,rows){const q=v=>{v=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
const t='\ufeff'+[cols.map(c=>q(c[0])),...rows.map(r=>cols.map(c=>q(r[c[1]])))].map(l=>l.join(';')).join('\r\n');
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download=nome+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)}
const MASK={cpf:v=>v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'),
cep:v=>v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d)/,'$1-$2'),
zap:v=>v.replace(/\D/g,'').slice(0,11).replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{4,5})(\d{4})$/,'$1-$2')};
const maskOf=k=>/cpf$/i.test(k)?'cpf':k==='cep'?'cep':k==='zap'?'zap':null;
const cpfOk=c=>{c=String(c).replace(/\D/g,'');if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(let t=9;t<11;t++){let d=0;for(let i=0;i<t;i++)d+=c[i]*(t+1-i);d=(d*10)%11%10;if(+c[t]!==d)return false}return true};
const rz=(f,m,q)=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,m/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',q))};i.onerror=no;i.src=r.result};r.onerror=no;r.readAsDataURL(f)});
async function pick(k,el){const f=el.files[0];if(!f)return;const n=$('#n_'+k);try{V[k]=await rz(f,k==='foto'?320:700,k==='foto'?.8:.5);n.textContent='Imagem anexada.'}catch(e){n.textContent='Não foi possível ler essa imagem. Tente outra.'}}
let _db;async function getDb(){if(_db)return _db;try{const c=window.claude&&await window.claude.use('db');if(c)_db=c}catch(e){}return _db}
function draw(){if(ME&&!V.email&&F[s][1].some(x=>x[0]==='email'))V.email=ME.email||'';$('#st').innerHTML=F.map((_,i)=>`<i class="${i<=s?'on':''}"></i>`).join('');
let h=`<h3>Etapa ${s+1} de ${F.length}: ${F[s][0]}</h3>`;
F[s][1].forEach(([k,l,t])=>{if(t==='chk')h+=`<label><input type="checkbox" style="width:auto" ${V[k]?'checked':''} onchange="V.${k}=this.checked"> ${l}</label>`;
else if(t==='img')h+=`<label>${l}<input type="file" accept="image/*" onchange="pick('${k}',this)"></label><p class="note" id="n_${k}">${V[k]?'Imagem anexada.':''}</p>`;
else{const mk=maskOf(k);h+=`<label>${l}<input type="${t||'text'}" ${mk?`inputmode="numeric" autocomplete="off" oninput="this.value=MASK.${mk}(this.value);V.${k}=this.value"`:`${k==='cat'?'list="dlcat" ':''}oninput="V.${k}=this.value"`} value="${esc(V[k])}"></label>`}});
if(F[s][1].some(x=>x[0]==='cat'))h+=`<datalist id="dlcat">${CATN.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`;
if(s===F.length-1)h+=`<p>Atleta: <b>${esc(V.nome)}</b><br>Responsável: <b>${esc(V.resp)}</b></p><p class="note">Confira os dados. Ao enviar, você recebe um protocolo e abre a conversa com o WhatsApp do IDE já com os dados da matrícula.</p>${(sb&&!ME)?`<div class="card"><h3>Crie o seu acesso</h3><p class="note">Seu login será o e-mail <b>${esc(V.email||'(volte e informe o e-mail do responsável)')}</b>. Com ele você acompanha a matrícula depois.</p><label>Senha (8 ou mais caracteres)<input type="password" autocomplete="new-password" oninput="V.senha=this.value"></label><label>Repita a senha<input type="password" autocomplete="new-password" oninput="V.senha2=this.value"></label></div>`:''}`;
$('#fs').innerHTML=h;$('#bp').style.visibility=s?'visible':'hidden';$('#bn').textContent=s===F.length-1?'Enviar pré-matrícula':'Continuar'}
function stepOk(){if(sb&&!ME&&F[s][1].some(x=>x[0]==='email')&&!V.email){$('#fm').textContent='Informe o e-mail: ele será o login da conta.';return false}
for(const [k] of F[s][1]){if(REQ[k]&&!V[k]){$('#fm').textContent='Preencha: '+REQ[k]+'.';return false}if(/cpf$/i.test(k)&&V[k]&&!cpfOk(V[k])){$('#fm').textContent='O CPF informado não é válido. Confira os números.';return false}}if(s===0&&V.nasc){const d=new Date(V.nasc),h=new Date();if(d>h||d.getFullYear()<h.getFullYear()-60){$('#fm').textContent='Confira a data de nascimento.';return false}}
if(V.zap&&!/^\d{10,11}$/.test(V.zap.replace(/\D/g,''))){$('#fm').textContent='WhatsApp: informe DDD e número (10 ou 11 dígitos).';return false}
if(V.cep&&V.cep.replace(/\D/g,'').length!==8){$('#fm').textContent='O CEP precisa ter 8 números.';return false}
if(V.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(V.email)){$('#fm').textContent='Confira o e-mail.';return false}
$('#fm').textContent='';return true}
function waMsg(proto){const g=k=>V[k]||'—';return `*Pré-matrícula IDE* ${proto}\nAtleta: ${g('nome')}\nNascimento: ${fd(V.nasc)}\nRG: ${g('rg')} | CPF: ${g('cpf')} | CEP: ${g('cep')}\nResponsável: ${g('resp')} (${g('zap')}) ${V.email||''}\nPai: ${g('pai')} | RG ${g('paiRg')} | CPF ${g('paiCpf')}\nMãe: ${g('mae')} | RG ${g('maeRg')} | CPF ${g('maeCpf')}\nPosição: ${g('pos')} | Categoria: ${g('cat')} | Clube anterior: ${g('clube')}\nUso de imagem autorizado: ${V.c2?'sim':'não'}\n\nVou enviar em seguida as fotos: atleta, certidão ou RG, comprovante de residência e de escolaridade.`}
const toBlob=async d=>(await fetch(d)).blob();
const JAEXISTE='Este e-mail já tem conta. Toque em Entrar, faça o login e envie a matrícula de novo.';
async function criaConta(){let ok=false,msg='';try{const {data,error}=await sb.functions.invoke('criar-conta',{body:{email:V.email,senha:V.senha}});
if(error){let j=null;try{j=await error.context.json()}catch(e){}if(j&&j.erro==='existe')throw new Error(JAEXISTE);if(j&&j.erro)throw new Error(j.erro);msg='fn'}else if(data&&data.ok)ok=true}catch(e){if(e.message!=='fn'&&e.message!==undefined&&!/Failed to send|fetch|not found|NOT_FOUND/i.test(e.message))throw e;msg='fn'}
if(ok){const r=await sb.auth.signInWithPassword({email:V.email,password:V.senha});if(r.error)throw r.error;await setMe(r.data.session);return}
const r=await sb.auth.signUp({email:V.email,password:V.senha});if(r.error){if(/registered|exists/i.test(r.error.message))throw new Error(JAEXISTE);throw r.error}if(r.data.session)await setMe(r.data.session)}
async function send(){const m=$('#fm');if(!sb){m.textContent=noSb;return}
if(!ME){if(!V.email){m.textContent='Informe o e-mail do responsável (etapa Responsável): ele será o seu login.';return}
if(!V.senha||V.senha.length<8){m.textContent='Crie uma senha de 8 ou mais caracteres.';return}
if(V.senha!==V.senha2){m.textContent='As senhas não conferem.';return}}
if(ME){const du=await sb.from('matriculas').select('protocolo,status').eq('dono',ME.id).eq('cpf',V.cpf).not('status','in','(Recusada,Arquivada)').limit(1);if(du.data&&du.data.length){m.textContent='Já existe uma matrícula deste atleta nesta conta (protocolo '+du.data[0].protocolo+', '+du.data[0].status+'). Veja em Minha matrícula.';return}}
m.textContent='Enviando…';
const proto='IDE-'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
const msg=waMsg(proto),z=String(PAY.whats||'').replace(/\D/g,'');let saved=false,erro='';
if(sb){try{
if(!ME){await criaConta();if(!ME)throw new Error('Conta criada. Confirme o e-mail recebido, entre no site e envie a matrícula de novo.')}
const uid=(await sb.auth.getUser()).data.user.id;
const up=async(k,nome)=>{if(!V[k])return null;const pa=`${uid}/${proto}-${nome}.jpg`;const {error}=await sb.storage.from('documentos').upload(pa,await toBlob(V[k]),{contentType:'image/jpeg',upsert:true});if(error)throw error;return pa};
const foto=await up('foto','foto'),cert=await up('dCert','certidao'),res=await up('dRes','residencia'),esc2=await up('dEsc','escolaridade');
const {error}=await sb.from('matriculas').insert({protocolo:proto,nome:V.nome,nascimento:V.nasc,rg:V.rg,cpf:V.cpf,cep:V.cep||null,responsavel:V.resp,whatsapp:V.zap,email:V.email||null,pai:{nome:V.pai||null,rg:V.paiRg||null,cpf:V.paiCpf||null},mae:{nome:V.mae||null,rg:V.maeRg||null,cpf:V.maeCpf||null},categoria:V.cat||null,posicao:V.pos||null,clube_anterior:V.clube||null,foto_path:foto,docs_paths:{cert,res,esc:esc2},consentimento:!!V.c1,uso_imagem:!!V.c2});
if(error)throw error;saved=true}catch(e){erro=e.message||'erro desconhecido'}}
if(sb&&!saved){m.textContent='Não foi possível registrar a matrícula: '+erro+' Seus dados continuam na tela.';return}
V={};s=0;draw();if(saved){IS_ATLETA=true;route()}
const wa=z?`<br><a class="btn" target="_blank" rel="noopener" href="https://wa.me/55${z}?text=${encodeURIComponent(msg)}">${saved?'Avisar o IDE pelo WhatsApp':'Enviar matrícula ao IDE pelo WhatsApp'}</a>`:'';
if(saved)m.innerHTML=`Matrícula registrada. Protocolo <b>${proto}</b>. A comissão técnica vai analisar e aceitar ou recusar. Sua conta já foi criada: entre com o e-mail e a senha que você escolheu para acompanhar o status. Depois da aprovação, o atleta recebe um login e uma senha próprios.<br><a class="btn" href="#atleta">Ver minha matrícula</a>${wa}`;
else m.innerHTML=z?`Protocolo <b>${proto}</b>.${wa}<br>Toque no botão para mandar os dados e anexe as fotos na conversa. A matrícula só é validada após esse envio.`:`Protocolo <b>${proto}</b>. O WhatsApp do IDE ainda não foi cadastrado: avise a direção e envie este resumo:<div class="code">${esc(msg).replace(/\n/g,'<br>')}</div>`}
$('#bp').onclick=()=>{s--;$('#fm').textContent='';draw()};
$('#bn').onclick=()=>{if(!stepOk())return;if(s<F.length-1){s++;draw()}else send()};
draw();
// ADM
const TXT=[['hero_titulo','Início: título principal'],['hero_sub','Início: subtítulo'],['impacto','Início: texto "Muito além do futebol"'],['treino_home','Início: card de treinos'],['clube_historia','O Clube: História'],['clube_missao','O Clube: Missão e valores'],['clube_contato','O Clube: Contato (WhatsApp, e-mail, endereço)'],['info_local','Treinos: local'],['info_horario','Treinos: horário'],['info_quinta','Treinos: quintas-feiras'],['info_nota','Treinos: observação'],['info_mensal','Mensalidades'],['info_unif','Uniformes'],['socio_intro','Seja sócio: introdução'],['socio_1_nome','Sócio 1: nome do plano'],['socio_1','Sócio 1: valor e benefícios'],['socio_2_nome','Sócio 2: nome do plano'],['socio_2','Sócio 2: valor e benefícios'],['socio_3_nome','Sócio 3: nome do plano'],['socio_3','Sócio 3: valor e benefícios']];
const DEF={};document.querySelectorAll('[data-txt]').forEach(e=>DEF[e.dataset.txt]=e.textContent.trim());
function txApply(rows){const m=Object.fromEntries((rows||[]).map(r=>[r.chave,r.texto]));document.querySelectorAll('[data-txt]').forEach(e=>{e.textContent=m[e.dataset.txt]??DEF[e.dataset.txt]})}
async function txLoad(){const {data,error}=await sb.from('site_textos').select('*');if(error){$('#cx').innerHTML='<div class="empty"><b>Erro</b>'+esc(error.message)+'<br>Rode o SQL 14-textos-site.sql no Supabase.</div>';return}
const m=Object.fromEntries(data.map(r=>[r.chave,r.texto]));
$('#cx').innerHTML='<p class="note">Edite os textos fixos do site. Em branco ou "Restaurar" volta ao texto original.</p>'+TXT.map(([k,l])=>`<div class="card" style="margin-bottom:8px"><label>${l}<textarea id="tx_${k}" rows="2">${esc(m[k]??DEF[k]??'')}</textarea></label><div class="row"><button class="btn" onclick="txSave('${k}')">Salvar</button><button class="btn alt" onclick="txSave('${k}',1)">Restaurar</button><span class="note" id="txm_${k}" role="status"></span></div></div>`).join('')}
async function txSave(k,reset){const v=reset?'':$('#tx_'+k).value.trim(),n=$('#txm_'+k);const r=v?await sb.from('site_textos').upsert({chave:k,texto:v,atualizado:new Date().toISOString()}):await sb.from('site_textos').delete().eq('chave',k);
if(r.error){n.textContent='Erro: '+r.error.message;return}if(!v)$('#tx_'+k).value=DEF[k]||'';n.textContent=v?'Salvo.':'Restaurado.';pubLoad()}
// Recuperação de senha (só admin): pedidos feitos em "Esqueci a senha"
let PED=[],USR=[],MW={};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/).filter(Boolean),
igualNome=(a,b)=>{const x=norm(a),y=norm(b);return x.length>1&&y.length>1&&x[0]===y[0]&&x[x.length-1]===y[y.length-1]},
dig=v=>String(v||'').replace(/\D/g,''),gerSenha=()=>{const c='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint32Array(10)),x=>c[x%c.length]).join('')};
async function senhasLoad(ver){const [p,u,m]=await Promise.all([sb.from('pedidos_senha').select('*').order('criado',{ascending:false}).limit(60),sb.rpc('lista_usuarios'),sb.from('matriculas').select('dono,atleta_user,whatsapp,responsavel,nome')]);
if(p.error||u.error||!u.data){$('#cx').innerHTML='<div class="empty"><b>Sem acesso</b>Só o administrador vê os pedidos de senha (rode o SQL 20 no Supabase).</div>';return}
USR=u.data;MW={};(m.data||[]).forEach(x=>[x.dono,x.atleta_user].filter(Boolean).forEach(k=>{(MW[k]=MW[k]||[]).push(x)}));PED=p.data;senhasRender(ver)}
function senhasRender(ver){const pend=PED.filter(x=>x.status==='pendente'),res=PED.filter(x=>x.status!=='pendente');
const linha=p=>{const em=toEmail(p.identificador).toLowerCase(),c=USR.find(x=>x.email.toLowerCase()===em),ms=(c&&MW[c.id])||[],zm=ms[0]&&ms[0].whatsapp,igual=ms.some(x=>x.whatsapp&&dig(x.whatsapp).slice(-9)===dig(p.whatsapp).slice(-9)),nomes=[...new Set(ms.flatMap(x=>[x.responsavel,x.nome]).filter(Boolean))],nomeOk=!!p.nome&&nomes.some(n=>igualNome(n,p.nome));
let ac;if(p.status!=='pendente')ac='<span class="badge">resolvido</span>';
else if(!c)ac='<p class="note">Nenhuma conta com esse login ou e-mail. Confira com a pessoa ou dispense o pedido.</p><button class="btn alt" onclick="pedOk(\''+p.id+'\')">Dispensar</button>';
else if(c.protegido)ac='<p class="note">Conta do administrador principal: a senha só ele mesmo troca.</p><button class="btn alt" onclick="pedOk(\''+p.id+'\')">Dispensar</button>';
else ac=`<label>Nova senha<input id="np_${p.id}" value="${gerSenha()}"></label><div class="row"><button class="btn" onclick="pedSalvar('${p.id}','${c.id}')">Definir nova senha</button><button class="btn alt" onclick="pedOk('${p.id}')">Dispensar</button></div>`;
return `<div class="card" id="ped_${p.id}" style="margin-bottom:10px"><p><b>${esc(p.identificador)}</b> <span class="note">${dh(p.criado)}</span></p><p>Nome informado: <b>${esc(p.nome||'(não informado)')}</b></p><p>WhatsApp informado: <b>${esc(p.whatsapp)}</b></p>${c&&p.status==='pendente'?(ms.length?`<p class="note">Na matrícula: ${nomes.map(esc).join(' · ')||'—'} · WhatsApp ${esc(zm||'—')}</p>${nomeOk&&igual?'<p class="note"><b>Confere:</b> o nome e o WhatsApp batem com a matrícula.</p>':`<p class="note"><b>Atenção:</b> ${nomeOk?'':'o nome não bate com o da matrícula'}${!nomeOk&&!igual?' e ':''}${igual?'':'o WhatsApp é diferente do da matrícula'}. Confirme com o responsável antes de passar a senha.</p>`}`:'<p class="note">Esta conta não tem matrícula para conferir nome e WhatsApp. Confirme a identidade antes de passar a senha.</p>'):''}<div id="pa_${p.id}">${ac}</div></div>`};
$('#cx').innerHTML=(pend.length?pend.map(linha).join(''):'<div class="empty"><b>Nenhum pedido pendente</b>Quando alguém usar "Esqueci a senha" no site, o pedido aparece aqui.</div>')+(res.length?`<p style="margin-top:14px"><button class="btn alt" onclick="senhasRender(${ver?0:1})">${ver?'Ocultar':'Ver'} resolvidos (${res.length})</button></p>${ver?res.map(linha).join(''):''}`:'')+'<p class="note">Antes de passar uma senha nova, confirme que quem pediu é o dono da conta (ex.: ligue para o número da matrícula).</p>'}
async function pedOk(id){await sb.from('pedidos_senha').update({status:'resolvido',resolvido_em:new Date().toISOString()}).eq('id',id);senhasLoad();pend0()}
async function pedSalvar(id,uid){const sn=$('#np_'+id).value.trim(),p=PED.find(x=>x.id===id),box=$('#pa_'+id);if(sn.length<8){alert('A senha precisa ter 8 ou mais caracteres.');return}
box.innerHTML='<p class="note">Salvando…</p>';const r=await userFn({acao:'nova_senha',id:uid,senha:sn});if(r.erro){box.innerHTML='<p class="note">Erro: '+esc(r.erro)+'</p>';return}
await sb.from('pedidos_senha').update({status:'resolvido',resolvido_em:new Date().toISOString()}).eq('id',id);p.status='resolvido';
const msg='Olá! Sua nova senha de acesso ao site do IDE é: '+sn+' . Entre com ela. Não compartilhe com ninguém.';
box.innerHTML=`<p><b>Senha definida.</b> Passe para a pessoa agora: <b>${esc(sn)}</b></p><a class="btn" target="_blank" rel="noopener" href="https://wa.me/55${dig(p.whatsapp)}?text=${encodeURIComponent(msg)}">Enviar pelo WhatsApp</a> <button class="btn alt" onclick="senhasLoad()">Concluir</button>`;pend0()}
const M=['Dashboard','Entradas e saídas','Atletas','Matrículas','Categorias','Comissão técnica','Treinos e presença','Jogos','Notícias','Avisos','Galeria','Patrocinadores','Sócios','Pagamentos','Financeiro','Transparência','Loja','Eventos','Frases do carrossel','Textos do site','Usuários','Recuperação de senha','Auditoria'];
$('#side').innerHTML=M.map((m,i)=>`<button data-i="${i}">${m}</button>`).join('');
let cur=0,sel=null,MAT=[],unsub=null;
async function pend0(){if(!sb||!ME||PAPEL!=='admin')return;const r=await sb.from('pedidos_senha').select('id',{count:'exact',head:true}).eq('status','pendente');const b=document.querySelector('#side button[data-i="'+M.indexOf('Recuperação de senha')+'"]');if(b)b.textContent='Recuperação de senha'+(r.count?' ('+r.count+' pedido'+(r.count>1?'s':'')+')':'')}
async function pend(){pend0();if(!sb||!ME||!['admin','secretaria','treinador'].includes(PAPEL))return;const r=await sb.from('matriculas').select('id',{count:'exact',head:true}).in('status',['Recebida','Em análise']);const b=document.querySelector('#side button[data-i="'+M.indexOf('Matrículas')+'"]');if(b)b.textContent='Matrículas'+(r.count?' ('+r.count+' a decidir)':'')}
function adm(i){if(!STAFF.includes(PAPEL))return;pend();cur=i;document.querySelectorAll('#side button').forEach((b,j)=>b.classList.toggle('on',j==i));
let h=`<h3>${M[i]}</h3>`;
if(M[i]==='Dashboard'){h+='<div id="cx">Carregando…</div>';setTimeout(()=>cashLoad(dash),0)}
else if(M[i]==='Entradas e saídas'){h+='<div id="cx">Carregando…</div>';setTimeout(()=>cashLoad(cash),0)}
else if(M[i]==='Financeiro'){h+='<div id="cx">Carregando…</div>';setTimeout(()=>cashLoad(fin),0)}
else if(M[i]==='Textos do site'){h+='<div id="cx">Carregando…</div>';setTimeout(txLoad,0)}
else if(M[i]==='Recuperação de senha'){h+='<div id="cx">Carregando…</div>';setTimeout(senhasLoad,0)}
else if(M[i]==='Usuários'){h+='<div id="cx">Carregando…</div>';setTimeout(usersLoad,0)}
else if(M[i]==='Auditoria'){h+='<div id="cx">Carregando…</div>';setTimeout(audLoad,0)}
else if(M[i]==='Pagamentos'){h+='<div id="cx">Carregando…</div>';setTimeout(payLoad,0)}
else if(CMSM[M[i]]){h+='<div id="cms"></div>';setTimeout(()=>cmsOpen(CMSM[M[i]]),0)}
else if(M[i]==='Matrículas'){h+='<div class="empty">Carregando matrículas…</div>';setTimeout(loadMat,0)}
else h+=`<div class="empty"><b>Sem registros em ${M[i]}</b>Este módulo ainda não foi desenvolvido.</div>`;
$('#adp').innerHTML=h}
$('#side').onclick=e=>{if(e.target.dataset.i)adm(+e.target.dataset.i)};adm(0);
const ST=['Recebida','Em análise','Aguardando documentos','Aprovada','Recusada','Arquivada'];
let MF={q:'',arq:false};
const mapM=r=>{const p=r.pai||{},q=r.mae||{};return{id:r.id,proto:r.protocolo,status:r.status,nome:r.nome,nasc:r.nascimento,rg:r.rg,cpf:r.cpf,cep:r.cep,resp:r.responsavel,zap:r.whatsapp,email:r.email,pai:p.nome,paiRg:p.rg,paiCpf:p.cpf,mae:q.nome,maeRg:q.rg,maeCpf:q.cpf,pos:r.posicao,cat:r.categoria,clube:r.clube_anterior,c2:r.uso_imagem,fotoPath:r.foto_path,docs:r.docs_paths||{},login:r.login,atletaUser:r.atleta_user,criado:r.criado}};
const sUrl=async p=>{if(!sb||!p)return null;const {data}=await sb.storage.from('documentos').createSignedUrl(p,300);return data?data.signedUrl:null};
async function loadMat(){const el=$('#adp');if(!sb||!ME){el.innerHTML='<div class="empty"><b>Entre para ver as matrículas</b></div>';return}
if(!['admin','secretaria','treinador'].includes(PAPEL)){el.innerHTML='<div class="empty"><b>Sem permissão</b>Seu perfil não acessa as matrículas.</div>';return}
const {data,error}=await sb.from('matriculas').select('*').order('criado',{ascending:false});
if(error){el.innerHTML='<div class="empty"><b>Erro ao carregar</b>'+esc(error.message)+'</div>';return}MAT=data.map(mapM);renderMat()}
function renderMat(){const m=sel&&MAT.find(x=>x.id===sel);if(m)return det(m);sel=null;
$('#adp').innerHTML=`<h3>Matrículas</h3><div class="row" style="margin:0 0 10px;align-items:end"><label style="flex:1;min-width:180px">Buscar<input value="${esc(MF.q)}" placeholder="Nome, protocolo ou categoria" oninput="MF.q=this.value;mRows()"></label><label style="width:auto"><input type="checkbox" style="width:auto" ${MF.arq?'checked':''} onchange="MF.arq=this.checked;renderMat()"> Ver arquivadas</label>${['admin','secretaria'].includes(PAPEL)?'<button class="btn alt" onclick="expM()">Exportar planilha</button>':''}</div><div id="mrows"></div>`;mRows()}
function mRows(){const q=MF.q.toLowerCase(),L=MAT.filter(x=>(MF.arq?x.status==='Arquivada':x.status!=='Arquivada')&&(!q||(x.nome+' '+x.proto+' '+(x.cat||'')).toLowerCase().includes(q)));
$('#mrows').innerHTML=L.length?`<div class="scroll"><table><tr><th>Protocolo</th><th>Atleta</th><th>Categoria</th><th>Status</th></tr>${L.map(x=>`<tr style="cursor:pointer" onclick="sel='${esc(x.id)}';renderMat()"><td>${esc(x.proto)}</td><td>${esc(x.nome)}</td><td>${esc(x.cat||'—')}</td><td><span class="badge">${esc(x.status)}</span></td></tr>`).join('')}</table></div><p class="note">${L.length} matrícula(s). Toque em uma linha para ver os dados.</p>`:'<div class="empty"><b>Nenhuma matrícula</b>'+(MAT.length?'Nada encontrado com esse filtro.':'As pré-matrículas enviadas pelo formulário aparecem aqui.')+'</div>'}
function expM(){if(!confirm('A planilha contém CPF, RG e contatos de menores e responsáveis (dados pessoais protegidos pela LGPD). Guarde em local seguro e não compartilhe. Baixar?'))return;
csv('matriculas',[['Protocolo','proto'],['Status','status'],['Atleta','nome'],['Nascimento','nasc'],['RG','rg'],['CPF','cpf'],['CEP','cep'],['Categoria','cat'],['Posição','pos'],['Clube anterior','clube'],['Responsável','resp'],['WhatsApp','zap'],['E-mail','email'],['Pai','pai'],['Mãe','mae']],MAT)}
function det(m){const z=String(m.zap||'').replace(/\D/g,'');
$('#adp').innerHTML=`<button class="btn alt" onclick="sel=null;renderMat()">Voltar</button><h3 style="margin-top:12px">${esc(m.nome)}</h3><div class="card"><p>Protocolo: <b>${esc(m.proto)}</b></p><label>Status<select onchange="setSt('${esc(m.id)}',this.value,this)">${ST.map(t=>`<option${t===m.status?' selected':''}>${t}</option>`).join('')}</select></label><div id="acs" style="margin:10px 0">${acessoH(m)}</div>
<p>Nascimento: ${fd(m.nasc)}<br>RG: ${esc(m.rg)} · CPF: ${esc(m.cpf)} · CEP: ${esc(m.cep||'—')}</p>
<p>Responsável: ${esc(m.resp)} · ${esc(m.zap)} ${esc(m.email)}</p>
<p>Pai: ${esc(m.pai||'—')} · RG ${esc(m.paiRg||'—')} · CPF ${esc(m.paiCpf||'—')}<br>Mãe: ${esc(m.mae||'—')} · RG ${esc(m.maeRg||'—')} · CPF ${esc(m.maeCpf||'—')}</p>
<p>Posição: ${esc(m.pos||'—')} · Categoria: ${esc(m.cat||'—')} · Clube anterior: ${esc(m.clube||'—')}<br>Uso de imagem autorizado: ${m.c2?'sim':'não'}</p>
<div class="row"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/55${z}">WhatsApp</a>${m.email?`<a class="btn alt" href="mailto:${esc(m.email)}">E-mail</a>`:''}${['admin','secretaria'].includes(PAPEL)?`<button class="btn alt" onclick="editM()">Editar dados</button>`:''}<button class="btn alt" onclick="cart()">Carteirinha</button><button class="btn alt" onclick="vdocs()">Ver documentos</button>${m.status!=='Arquivada'?`<button class="btn alt" onclick="setSt('${esc(m.id)}','Arquivada')">Arquivar</button>`:''}${PAPEL==='admin'?`<button class="btn alt" onclick="delM()">Excluir</button>`:''}</div><div id="ext" style="margin-top:14px"></div></div>`}
const acessoH=m=>m.status!=='Aprovada'?'<p class="note">Quando o status virar Aprovada, o sistema cria a conta do atleta, com login e senha próprios. A conta do responsável não muda.</p>':(m.login?`<p>Login do atleta: <b>${esc(m.login)}</b></p><button class="btn alt" onclick="gerarAcesso('${esc(m.id)}','nova_senha')">Gerar nova senha</button>`:`<p class="note">Aprovada, mas o atleta ainda não tem conta.</p><button class="btn" onclick="gerarAcesso('${esc(m.id)}','aprovar')">Gerar login e senha</button>`);
async function setSt(id,v,el){const x=MAT.find(y=>y.id===id),ant=x?x.status:null;
if(v==='Aprovada'){const ok=await gerarAcesso(id,'aprovar');if(!ok&&el&&ant)el.value=ant;return}
const {error}=await sb.from('matriculas').update({status:v,atualizado:new Date().toISOString()}).eq('id',id);
if(error){alert('Não foi possível salvar o status: '+error.message);if(el&&ant)el.value=ant}else if(x){x.status=v;if(v==='Arquivada'){sel=null;renderMat();return}const b=$('#acs');if(b)b.innerHTML=acessoH(x)}}
async function gerarAcesso(id,acao){const box=$('#acs'),x=MAT.find(y=>y.id===id);if(box)box.innerHTML='<p class="note">Aguarde…</p>';
const {data,error}=await sb.functions.invoke('aprovar-matricula',{body:{matricula_id:id,acao}});
if(error||!data||data.erro){let msg=(data&&data.erro)||'erro desconhecido';if(error){try{const j=await error.context.json();msg=j.erro||error.message}catch(_){msg=error.message}}
if(box)box.innerHTML=`<p class="note">Não foi possível concluir: ${esc(msg)}</p>`+(x?acessoH(x):'');return false}
if(x){x.status='Aprovada';x.login=data.login}
if(!box)return true;
if(!data.senha){box.innerHTML=acessoH(x||{})+'<p class="note">O atleta já tinha conta. Use "Gerar nova senha" se precisar de uma senha nova.</p>';return true}
const z=String((x&&x.zap)||'').replace(/\D/g,'');
const txt='Instituto DF e Entorno - acesso do atleta à Área do atleta\nLogin: '+data.login+'\nSenha: '+data.senha+'\nEntre em: '+location.origin+location.pathname+'#login';
box.innerHTML=`<div class="card"><h3>Acesso do atleta</h3><p>Login: <b>${esc(data.login)}</b><br>Senha: <b>${esc(data.senha)}</b></p><p class="note">Envie agora: a senha não fica salva e não aparece de novo. Se precisar, gere uma nova.</p><div class="row">${z?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/55${z}?text=${encodeURIComponent(txt)}">Enviar por WhatsApp</a>`:''}<button class="btn alt" onclick="navigator.clipboard&&navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(txt)}'))">Copiar</button></div></div>`;return true}
async function cart(){const m=MAT.find(x=>x.id===sel);if(!m)return;if(m.fotoPath&&!m.foto)m.foto=await sUrl(m.fotoPath);$('#ext').innerHTML=cartH(m)}
function cartH(m){return `<div class="cart"><div class="ch"><img src="${document.querySelector('.shield').src}" alt=""><b>Instituto DF e Entorno</b></div><div class="cb">${m.foto?`<img class="ph2" src="${m.foto}" alt="Foto de ${esc(m.nome)}">`:'<div class="ph2">Sem foto</div>'}<div><h3>${esc(m.nome)}</h3><p>Nascimento: ${fd(m.nasc)}<br>RG: ${esc(m.rg)}<br>CPF: ${esc(m.cpf)}<br>Categoria: ${esc(m.cat||'—')}</p></div></div><div class="cf">Carteirinha do atleta · ${esc(m.proto)} · ${esc(m.status)}</div></div>`}
async function vdocs(){const m=MAT.find(x=>x.id===sel),o=[];
for(const [n,l] of [['cert','Certidão ou RG'],['res','Comprovante de residência'],['esc','Comprovante de escolaridade']]){const u=await sUrl(m.docs[n]);if(u)o.push(`<p><b>${l}</b></p><img style="max-width:100%;border-radius:8px" src="${u}" alt="${l}">`)}
$('#ext').innerHTML=o.join('')||'<p class="note">Nenhum documento anexado.</p>'}
const MEF=[['nome','Nome completo'],['nasc','Data de nascimento','date'],['rg','RG'],['cpf','CPF'],['cep','CEP'],['resp','Responsável'],['zap','WhatsApp com DDD','tel'],['email','E-mail','email'],['pai','Nome do pai'],['paiRg','RG do pai'],['paiCpf','CPF do pai'],['mae','Nome da mãe'],['maeRg','RG da mãe'],['maeCpf','CPF da mãe'],['pos','Posição'],['cat','Categoria'],['clube','Clube anterior']];
function editM(){const m=MAT.find(x=>x.id===sel);if(!m)return;
$('#adp').innerHTML=`<h3>Editar matrícula ${esc(m.proto)}</h3><div class="card">${MEF.map(([k,l,t])=>{const mk=maskOf(k);return `<label>${l}<input id="me_${k}" type="${t||'text'}" ${mk?`inputmode="numeric" oninput="this.value=MASK.${mk}(this.value)"`:''} value="${esc(m[k]||'')}"></label>`}).join('')}<div class="row"><button class="btn" onclick="saveM()">Salvar</button><button class="btn alt" onclick="renderMat()">Cancelar</button></div><p class="note" id="mem" role="status"></p></div>`}
async function saveM(){const m=MAT.find(x=>x.id===sel),g=k=>$('#me_'+k).value.trim(),n=$('#mem');
if(!g('nome')||!g('nasc')){n.textContent='Preencha o nome e a data de nascimento.';return}
for(const k of ['cpf','paiCpf','maeCpf'])if(g(k)&&!cpfOk(g(k))){n.textContent='CPF inválido: '+(k==='cpf'?'do atleta':k==='paiCpf'?'do pai':'da mãe')+'.';return}
if(g('zap')&&!/^\d{10,11}$/.test(g('zap').replace(/\D/g,''))){n.textContent='WhatsApp: informe DDD e número.';return}
if(g('cep')&&g('cep').replace(/\D/g,'').length!==8){n.textContent='O CEP precisa ter 8 números.';return}
const nv=g=>g||null,row={nome:g('nome'),nascimento:g('nasc'),rg:nv(g('rg')),cpf:nv(g('cpf')),cep:nv(g('cep')),responsavel:nv(g('resp')),whatsapp:nv(g('zap')),email:nv(g('email')),pai:{nome:nv(g('pai')),rg:nv(g('paiRg')),cpf:nv(g('paiCpf'))},mae:{nome:nv(g('mae')),rg:nv(g('maeRg')),cpf:nv(g('maeCpf'))},posicao:nv(g('pos')),categoria:nv(g('cat')),clube_anterior:nv(g('clube')),atualizado:new Date().toISOString()};
n.textContent='Salvando…';const {error}=await sb.from('matriculas').update(row).eq('id',m.id);
if(error){n.textContent='Não foi possível salvar: '+error.message;return}
Object.assign(m,{nome:row.nome,nasc:row.nascimento,rg:row.rg,cpf:row.cpf,cep:row.cep,resp:row.responsavel,zap:row.whatsapp,email:row.email,pai:row.pai.nome,paiRg:row.pai.rg,paiCpf:row.pai.cpf,mae:row.mae.nome,maeRg:row.mae.rg,maeCpf:row.mae.cpf,pos:row.posicao,cat:row.categoria,clube:row.clube_anterior});renderMat()}
async function delM(){const m=MAT.find(x=>x.id===sel);if(!m||!confirm('Excluir esta matrícula? Isso não pode ser desfeito.'))return;const ps=[m.fotoPath,...Object.values(m.docs)].filter(Boolean);
const {error}=await sb.from('matriculas').delete().eq('id',m.id);if(error){alert('Não foi possível excluir: '+error.message);return}
if(ps.length)await sb.storage.from('documentos').remove(ps);MAT=MAT.filter(x=>x.id!==m.id);sel=null;renderMat()}
// CMS: o painel ADM controla o conteúdo do site
const CMSM={'Atletas':'atletas','Categorias':'categorias','Comissão técnica':'comissao','Treinos e presença':'treinos','Jogos':'jogos','Notícias':'noticias','Avisos':'avisos','Galeria':'galeria','Eventos':'eventos','Sócios':'socios','Loja':'loja','Transparência':'transp','Frases do carrossel':'frases','Patrocinadores':'patrocinadores'};
const DIAS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const PUB=['publicado','Publicar no site','bool'];
const CMS={
atletas:{n:'atletas',o:'nome_publico',r:'nome_publico',f:[['nome_publico','Nome (como aparece no site)'],['camisa','Número da camisa','num'],['posicao','Posição','sel',['Goleiro','Defensor','Meio-campo','Atacante']],['foto_path','Foto','img'],['publicado','Publicar no elenco (só com autorização do responsável)','bool']]},
categorias:{n:'categorias',o:'nome',r:'nome',f:[['nome','Categoria (ex.: Sub-11)'],['treinador','Treinador'],['local_treino','Local de treino'],['horarios','Horários'],['ativa','Categoria ativa','bool']]},
comissao:{n:'comissao',o:'nome',r:'nome',f:[['nome','Nome'],['funcao','Função'],['foto_path','Foto','img'],PUB]},
treinos:{n:'treinos',o:'dia',r:'dia',f:[['dia','Dia da semana','sel',DIAS],['categoria','Categoria'],['horario','Horário (ex.: 18h50 às 22h00)'],['local','Local'],['obs','Observação'],PUB]},
jogos:{n:'jogos',o:'data_hora',r:'adversario',desc:1,f:[['adversario','Adversário'],['data_hora','Data e hora','dt'],['local','Local'],['competicao','Competição'],['placar_ide','Gols do IDE (só depois do jogo)','num'],['placar_adv','Gols do adversário','num'],PUB]},
noticias:{n:'noticias',o:'criado',r:'titulo',desc:1,f:[['titulo','Título'],['categoria','Categoria','sel',['Institucional','Futebol de base','Competições','Resultados','Eventos','Projetos sociais','Comunicados']],['texto','Texto','area'],['foto_path','Foto','img'],PUB]},
avisos:{n:'avisos',o:'criado',r:'titulo',desc:1,f:[['titulo','Título do aviso'],['texto','Aviso','area'],PUB]},
socios:{n:'socios',o:'nome',r:'nome',f:[['nome','Nome'],['contato','Contato (telefone ou e-mail)'],['plano','Plano','sel',['Apoiador','Colaborador','Benemérito']],['valor','Valor mensal (R$)','dec'],['status','Situação','sel',['ativo','inadimplente','cancelado']],['obs','Observação','area']]},
loja:{n:'loja_produtos',o:'criado',r:'nome',desc:1,f:[['nome','Produto'],['descricao','Descrição','area'],['preco','Preço (R$)','dec'],['foto_path','Foto','img'],PUB]},
transp:{n:'transparencia_docs',o:'ano',r:'titulo',desc:1,f:[['titulo','Título do relatório'],['ano','Ano','num'],['link','Link do PDF (Drive, site...)'],PUB]},
frases:{n:'frases',o:'criado',r:'texto',f:[['texto','Frase (aparece no carrossel e nas faixas da página inicial)','area'],PUB]},
eventos:{n:'eventos',o:'data_hora',r:'titulo',desc:1,f:[['titulo','Nome do evento'],['data_hora','Data e hora','dt'],['local','Local'],['descricao','Descrição','area'],PUB]},
galeria:{n:'galeria',o:'criado',r:'legenda',desc:1,f:[['legenda','Legenda'],['foto_path','Foto','img'],PUB]},
patrocinadores:{n:'patrocinadores',o:'nome',r:'nome',f:[['nome','Nome'],['nivel','Nível','sel',['master','oficial','institucional','apoiador']],['descricao','Descrição'],['link','Link (site ou Instagram)'],['logo_path','Logo','img'],PUB]}};
let CK=null,CED=null,CROWS=[];
function cmsList(k,c){const im=c.f.find(x=>x[2]==='img'),bad=r=>(r.publicado===false||r.ativa===false)?'<span class="badge">rascunho</span>':'',
bt=r=>`<div class="row" style="margin:8px 0 0"><button class="btn alt" onclick="cmsOpen('${k}','${r.id}')">Editar</button><button class="btn alt" onclick="cmsDel('${r.id}')">Excluir</button></div>`;
if(im)return `<div class="grid">${CROWS.map(r=>`<div class="card">${r[im[0]]?`<img src="${pu(r[im[0]])}" alt="${esc(r[c.r]||'Foto')}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;margin-bottom:8px">`:'<div class="empty" style="aspect-ratio:4/3;display:grid;place-items:center;margin-bottom:8px">Sem foto</div>'}<b>${esc(r[c.r]||'(sem título)')}</b> ${bad(r)}${bt(r)}</div>`).join('')}</div>`;
return CROWS.map(r=>`<div class="card" style="margin-bottom:8px"><b>${esc(r[c.r]||'(sem título)')}</b> ${bad(r)}${bt(r)}</div>`).join('')}
function cmsField(f,l,t,o,v){const id='cf_'+f;
if(t==='bool')return `<label><input id="${id}" type="checkbox" style="width:auto" ${v?'checked':''}> ${l}</label>`;
if(t==='area')return `<label>${l}<textarea id="${id}" rows="5">${esc(v)}</textarea></label>`;
if(t==='sel')return `<label>${l}<select id="${id}"><option value=""></option>${o.map(x=>`<option${x===v?' selected':''}>${x}</option>`).join('')}</select></label>`;
if(t==='img')return `${v?`<img src="${pu(v)}" alt="Foto atual" style="max-width:220px;width:100%;border-radius:8px;display:block;margin:8px 0">`:''}<label>${l}<input id="${id}" type="file" accept="image/*"></label>${v?'<p class="note">A foto atual continua se você não escolher outra.</p>':''}`;
if(t==='dt'){const d=v?new Date(v):null;const z=d?new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16):'';return `<label>${l}<input id="${id}" type="datetime-local" value="${z}"></label>`}
return `<label>${l}<input id="${id}" ${t==='num'?'type="number" inputmode="numeric"':t==='dec'?'inputmode="decimal"':''} value="${esc(v)}"></label>`}
async function cmsOpen(k,ed){CK=k;const c=CMS[k],el=$('#cms');
if(!sb||!ME){el.innerHTML='<div class="empty"><b>Entre com o Supabase configurado</b>O conteúdo é salvo no banco de dados.</div>';return}
if(ed===undefined){const {data,error}=await sb.from(c.n).select('*').order(c.o,{ascending:!c.desc});
if(error){el.innerHTML='<div class="empty"><b>Erro ao carregar</b>'+esc(error.message)+'<br>Se a tabela não existe, rode o arquivo supabase/sql/04-complemento.sql no Supabase.</div>';return}
CROWS=data;
el.innerHTML=`<div class="row" style="margin:0 0 10px"><button class="btn" onclick="cmsOpen('${k}',null)">Adicionar</button>${CROWS.length?`<button class="btn alt" onclick="expC()">Exportar planilha</button>`:''}</div>`+(CROWS.length?cmsList(k,c):'<div class="empty"><b>Nada cadastrado ainda</b>Toque em Adicionar.</div>');return}
const r=ed?CROWS.find(x=>x.id===ed)||{}:{};CED=ed;
el.innerHTML=`<div class="card">${c.f.map(([f,l,t,o])=>cmsField(f,l,t,o,r[f])).join('')}<div class="row"><button class="btn" onclick="cmsSave()">Salvar</button><button class="btn alt" onclick="cmsOpen('${k}')">Cancelar</button></div><p class="note" id="cmsg" role="status"></p></div>`}
function expC(){const c=CMS[CK];csv(c.n,c.f.map(([f,l])=>[l.replace(/ \(.*\)/,''),f]),CROWS)}
async function cmsSave(){const c=CMS[CK],m=$('#cmsg');m.textContent='Salvando…';const row={};
try{for(const [f,l,t] of c.f){const e=$('#cf_'+f);
if(t==='bool')row[f]=e.checked;
else if(t==='img'){if(e.files[0]){const d=await rz(e.files[0],1280,.8);const pa=`${CK}/${Date.now()}-${Math.random().toString(36).slice(2,7)}.jpg`;const {error}=await sb.storage.from('publico').upload(pa,await toBlob(d),{contentType:'image/jpeg'});if(error)throw error;row[f]=pa;const o=(CROWS.find(x=>x.id===CED)||{})[f];if(o)await sb.storage.from('publico').remove([o])}}
else if(t==='dec')row[f]=e.value===''?null:parseFloat(e.value.replace(',','.'));
else if(t==='num')row[f]=e.value===''?null:parseInt(e.value,10);
else if(t==='dt')row[f]=e.value?new Date(e.value).toISOString():null;
else row[f]=e.value.trim()||null}
const f0=c.f[0][0];if(CK!=='galeria'&&!row[f0])throw new Error('Preencha o primeiro campo.');
if(CK==='galeria'&&!CED&&!row.foto_path)throw new Error('Escolha uma foto.');
if(!CED)for(const k in row)if(row[k]===null)delete row[k];
const {error}=await(CED?sb.from(c.n).update(row).eq('id',CED):sb.from(c.n).insert(row));if(error)throw error;
pubLoad();cmsOpen(CK)}catch(e){const x=/null value in column "(\w+)"/.exec(e.message||'');m.textContent=x?'Preencha o campo obrigatório: '+x[1].replace('_',' ')+'.':'Não foi possível salvar: '+(e.message||e)}}
async function cmsDel(id){if(!confirm('Excluir este item?'))return;const c=CMS[CK],r=CROWS.find(x=>x.id===id)||{};const {error}=await sb.from(c.n).delete().eq('id',id);if(error)alert('Não foi possível excluir: '+error.message);else{const fs=c.f.filter(x=>x[2]==='img').map(x=>r[x[0]]).filter(Boolean);if(fs.length)await sb.storage.from('publico').remove(fs);pubLoad();cmsOpen(CK)}}
// Conteúdo público vindo do banco
const pu=p=>p&&sb?sb.storage.from('publico').getPublicUrl(p).data.publicUrl:'';
const dh=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
const fill=(id,h)=>{const e=document.getElementById(id);if(e&&h){e.className='';e.removeAttribute('style');e.innerHTML=h}};
let ELENCO=[];
function renderElenco(){const pos=$('#fp').value,l=ELENCO.filter(a=>pos==='Todas'||a.posicao===pos);
fill('pub-elenco',l.length?`<div class="grid">${l.map(a=>`<div class="card">${a.foto_path?`<img src="${pu(a.foto_path)}" alt="Foto de ${esc(a.nome_publico)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;margin-bottom:8px">`:''}<h3>${a.camisa!=null?'#'+a.camisa+' ':''}${esc(a.nome_publico)}</h3><p class="note">${esc(a.posicao||'')}</p></div>`).join('')}</div>`:'')}
async function pubLoad(){if(!sb)return;try{
const g=async(t,o,asc,f)=>{const r=await sb.from(t).select('*').eq(f||'publicado',true).order(o,{ascending:asc});return r.data||[]};
const [no,av,jo,at,pa,ca,tr,ga,ev,td,lj,rs,tx,fr]=await Promise.all([g('noticias','criado',false),g('avisos','criado',false),g('jogos','data_hora',true),g('atletas','nome_publico',true),g('patrocinadores','nome',true),g('categorias','nome',true,'ativa'),g('treinos','dia',true),g('galeria','criado',false),g('eventos','data_hora',true),g('transparencia_docs','ano',false),g('loja_produtos','criado',false),sb.rpc('resumo_transparencia'),sb.from('site_textos').select('*'),g('frases','criado',true)]);
const nc=n=>`<div class="card" style="margin-bottom:10px">${n.foto_path?`<img src="${pu(n.foto_path)}" alt="" style="width:100%;border-radius:8px;margin-bottom:8px">`:''}<span class="badge">${esc(n.categoria||'')}</span><h3>${esc(n.titulo)}</h3><p>${esc(n.texto)}</p><p class="note">${dh(n.criado)}</p></div>`;
fill('pub-noticias',no.map(nc).join(''));fill('home-noticias',no.slice(0,3).map(nc).join(''));
fill('pub-avisos',av.map(a=>`<div class="card" style="border-left:4px solid var(--acc);margin-bottom:10px"><h3>${esc(a.titulo)}</h3><p>${esc(a.texto)}</p></div>`).join(''));
const jc=j=>`<div class="card" style="margin-bottom:8px"><b>${j.placar_ide!=null&&j.placar_adv!=null?`IDE ${j.placar_ide} x ${j.placar_adv} ${esc(j.adversario)}`:'IDE x '+esc(j.adversario)}</b><p class="note">${dh(j.data_hora)} · ${esc(j.local||'')} ${esc(j.competicao||'')}</p></div>`;
const agora=Date.now(),prox=jo.filter(j=>new Date(j.data_hora)>=agora),ant=jo.filter(j=>new Date(j.data_hora)<agora).reverse();
fill('home-jogos',prox.slice(0,3).map(jc).join(''));
fill('pub-jogos',(prox.length?'<h3>Próximos jogos</h3>'+prox.map(jc).join(''):'')+(ant.length?'<h3 style="margin-top:14px">Resultados</h3>'+ant.map(jc).join(''):''));
ELENCO=at;renderElenco();$('#fp').onchange=renderElenco;
fill('pub-cat',ca.map(x=>`<div class="card" style="margin-bottom:8px"><h3>${esc(x.nome)}</h3><p class="note">Treinador: ${esc(x.treinador||'a definir')} · ${esc(x.local_treino||'')} ${esc(x.horarios||'')}</p></div>`).join(''));
const pc=x=>`<div class="card" style="margin-bottom:8px">${x.logo_path?`<img src="${pu(x.logo_path)}" alt="" style="height:48px;margin-bottom:6px">`:''}<h3>${x.link?`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.nome)}</a>`:esc(x.nome)}</h3><span class="badge">${esc(x.nivel||'')}</span><p class="note">${esc(x.descricao||'')}</p></div>`;
fill('home-patro',pa.map(pc).join(''));
fill('pub-treinos',tr.length?`<section><h3>Agenda de treinos</h3><div class="scroll"><table><tr><th>Dia</th><th>Horário</th><th>Categoria</th><th>Local</th></tr>${tr.map(t=>`<tr><td>${esc(t.dia)}</td><td>${esc(t.horario||'')}</td><td>${esc(t.categoria||'')}</td><td>${esc(t.local||'')}${t.obs?' · '+esc(t.obs):''}</td></tr>`).join('')}</table></div></section>`:'');
fill('home-eventos',ev.filter(e=>!e.data_hora||new Date(e.data_hora)>=Date.now()-864e5).map(e=>`<div class="card" style="margin-bottom:8px"><h3>${esc(e.titulo)}</h3><p class="note">${dh(e.data_hora)} ${esc(e.local||'')}</p><p>${esc(e.descricao||'')}</p></div>`).join(''));
txApply(tx&&tx.data);if(window.setFrases&&fr.length)setFrases(fr.map(x=>x.texto));CATN=ca.map(x=>x.nome);
const rr=rs&&rs.data&&rs.data[0];
fill('pub-transp',`<div class="grid"><div class="card"><h3>Total arrecadado</h3><p>${brl(Number(rr?rr.entradas:0))}</p></div><div class="card"><h3>Total investido</h3><p>${brl(Number(rr?rr.saidas:0))}</p></div></div>`+(td.length?'<h3 style="margin-top:14px">Relatórios</h3>'+td.map(d=>`<div class="card" style="margin-bottom:8px"><b>${d.link?`<a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.titulo)}</a>`:esc(d.titulo)}</b> <span class="note">${d.ano||''}</span></div>`).join(''):''));
fill('pub-loja',lj.length?`<div class="grid">${lj.map(p=>`<div class="card">${p.foto_path?`<img src="${pu(p.foto_path)}" alt="${esc(p.nome)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;margin-bottom:8px">`:''}<h3>${esc(p.nome)}</h3><p class="price">${p.preco!=null?brl(Number(p.preco)):'Consulte'}</p><p class="note">${esc(p.descricao||'')}</p></div>`).join('')}</div>`:'');
const gal=document.querySelector('.gal');if(gal){gal.querySelectorAll('.dyn').forEach(e=>e.remove());gal.insertAdjacentHTML('afterbegin',ga.map(x=>`<button type="button" class="gi dyn" aria-label="Ampliar"><img loading="lazy" src="${pu(x.foto_path)}" alt="${esc(x.legenda||'Foto do IDE')}"></button>`).join(''))}
}catch(e){console.error('pubLoad',e)}}
// Pagamentos
const PAYDEF={chave:'',nome:'Instituto DF e Entorno',cidade:'',whats:'',itens:[{nome:'Mensalidade',valor:'',link:''},{nome:'Uniforme',valor:'',link:''},{nome:'Contribuição voluntária',valor:'',link:''}]};
let PAY=JSON.parse(JSON.stringify(PAYDEF));
async function payFetch(){if(!sb)return;const {data}=await sb.from('config_pagamentos').select('*').eq('id',1).maybeSingle();if(data)PAY={chave:data.chave||'',nome:data.nome||PAYDEF.nome,cidade:data.cidade||'',whats:data.whats||'',itens:data.itens&&data.itens.length?data.itens:PAYDEF.itens};renderPay()}
async function payLoad(){await payFetch();$('#cx').innerHTML=payEd()}
const vNum=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)&&n>0?n:0};
const tlv=(i,v)=>i+String(v.length).padStart(2,'0')+v;
const asc=(t,n)=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').toUpperCase().slice(0,n)||'NA';
function crc(t){let c=0xFFFF;for(let i=0;i<t.length;i++){c^=t.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=c&0x8000?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF}return c.toString(16).toUpperCase().padStart(4,'0')}
function pixCode(valor){const v=vNum(valor);const q=tlv('00','01')+tlv('01','11')+tlv('26',tlv('00','br.gov.bcb.pix')+tlv('01',PAY.chave.trim()))+tlv('52','0000')+tlv('53','986')+(v?tlv('54',v.toFixed(2)):'')+tlv('58','BR')+tlv('59',asc(PAY.nome,25))+tlv('60',asc(PAY.cidade||'Brasilia',15))+tlv('62',tlv('05','***'))+'6304';return q+crc(q)}
function renderPay(){$('#paygrid').innerHTML=PAY.itens.map((x,i)=>{const v=vNum(x.valor);return `<div class="card"><h3>${esc(x.nome)}</h3><p class="price">${v?brl(v):'Valor a definir'}</p><div class="row"><button class="btn" onclick="showPix(${i})">Pagar com Pix</button>${x.link?`<a class="btn alt" target="_blank" rel="noopener" href="${esc(x.link)}">Cartão</a>`:''}</div></div>`}).join('');
{const z0=String(PAY.whats||'').replace(/\D/g,''),sw=$('#socio-wa');if(sw){sw.hidden=!z0;if(z0)sw.href='https://wa.me/55'+z0+'?text='+encodeURIComponent('Olá! Quero ser sócio do IDE.')}}
$('#wz').innerHTML=PAY.whats?` pelo WhatsApp <a href="https://wa.me/55${PAY.whats.replace(/\D/g,'')}" target="_blank" rel="noopener">${esc(PAY.whats)}</a>`:''}
function showPix(i){const x=PAY.itens[i],b=$('#pxcp');$('#pxt').textContent=x.nome+(vNum(x.valor)?' · '+brl(vNum(x.valor)):'');
if(!PAY.chave.trim()){$('#pxq').innerHTML='';$('#pxc').textContent='A chave Pix do IDE ainda não foi cadastrada. Fale com a direção.';b.hidden=true}
else{const c=pixCode(x.valor);$('#pxc').textContent=c;b.hidden=false;b.textContent='Copiar código';b.onclick=()=>{try{navigator.clipboard.writeText(c);b.textContent='Copiado'}catch(e){}};let q='';try{const r=qrcode(0,'M');r.addData(c);r.make();q=r.createSvgTag({scalable:true,margin:2})}catch(e){}
$('#pxq').innerHTML=q?`<div style="width:220px;margin:0 auto 10px;background:#fff;padding:6px;border-radius:8px">${q}</div>`:''}
const w=$('#pxw'),z=PAY.whats.replace(/\D/g,'');w.hidden=!z;if(z)w.href='https://wa.me/55'+z+'?text='+encodeURIComponent('Comprovante de pagamento: '+x.nome+(vNum(x.valor)?' - '+brl(vNum(x.valor)):''));$('#px').showModal()}
$('#pxx').onclick=()=>$('#px').close();
function payEd(){const r=PAY.itens.map((x,i)=>`<div class="card" style="margin-top:8px"><label>Nome<input data-i="${i}" data-k="nome" value="${esc(x.nome)}"></label><label>Valor (R$)<input data-i="${i}" data-k="valor" inputmode="decimal" value="${esc(x.valor)}"></label><label>Link de cartão (opcional)<input data-i="${i}" data-k="link" type="url" value="${esc(x.link)}"></label><div class="row"><button class="btn alt" onclick="payDel(${i})">Remover item</button></div></div>`).join('');
return `<div class="card"><label>Chave Pix do IDE<input data-g="chave" value="${esc(PAY.chave)}"></label><label>Nome do beneficiário<input data-g="nome" value="${esc(PAY.nome)}"></label><label>Cidade<input data-g="cidade" value="${esc(PAY.cidade)}"></label><label>WhatsApp do IDE com DDD, sem o 55 (matrículas e comprovantes)<input data-g="whats" inputmode="tel" value="${esc(PAY.whats)}"></label></div><h3 style="margin-top:14px">Itens de cobrança</h3>${r}<div class="row"><button class="btn alt" onclick="payAdd()">Adicionar item</button><button class="btn" onclick="paySave()">Salvar</button></div><p class="note" id="pmsg" role="status"></p>`}
function payRead(){document.querySelectorAll('#cx [data-g]').forEach(e=>PAY[e.dataset.g]=e.value.trim());document.querySelectorAll('#cx [data-k]').forEach(e=>PAY.itens[+e.dataset.i][e.dataset.k]=e.value.trim())}
async function paySave(){payRead();const {error}=await sb.from('config_pagamentos').update(PAY).eq('id',1);$('#pmsg').textContent=error?'Não foi possível salvar: '+error.message:'Salvo.';if(!error)renderPay()}
function payAdd(){payRead();PAY.itens.push({nome:'Novo item',valor:'',link:''});$('#cx').innerHTML=payEd()}
function payDel(i){payRead();PAY.itens.splice(i,1);$('#cx').innerHTML=payEd()}
// Caixa: lançamentos no banco (tabela lancamentos)
let caixa=[],MATN=0,EDC=null;
async function cashLoad(fn){if(!sb||!ME){$('#cx').innerHTML='<div class="empty"><b>Entre para ver</b></div>';return}
const {data,error}=await sb.from('lancamentos').select('*').order('data',{ascending:false});
if(error){$('#cx').innerHTML='<div class="empty"><b>Sem acesso</b>'+esc(error.message)+'<br>Só admin e financeiro acessam. Se a tabela não existe, rode o ATUALIZAR-SUPABASE.sql.</div>';return}
caixa=data.map(x=>({id:x.id,t:x.tipo==='entrada'?'e':'s',v:Number(x.valor),dt:x.data,d:x.descricao}));
if(fn===dash){const r=await sb.from('matriculas').select('id',{count:'exact',head:true}).eq('status','Recebida');MATN=r.count||0}
$('#cx').innerHTML=fn()}
const tot=()=>[caixa.filter(x=>x.t==='e').reduce((a,x)=>a+x.v,0),caixa.filter(x=>x.t==='s').reduce((a,x)=>a+x.v,0)];
const tri=(en,sa)=>`<div class="card"><h3>Entradas</h3><p>${brl(en)}</p></div><div class="card"><h3>Saídas</h3><p>${brl(sa)}</p></div><div class="card"><h3>Saldo</h3><p>${brl(en-sa)}</p></div>`;
function dash(){const [en,sa]=tot();return `<div class="grid">${tri(en,sa)}<div class="card"><h3>Matrículas novas</h3><p>${MATN}</p></div></div>`}
function fin(){const [en,sa]=tot(),m={};caixa.forEach(x=>{const k=x.dt.slice(0,7);m[k]=m[k]||[0,0];m[k][x.t==='e'?0:1]+=x.v});const k=Object.keys(m).sort().reverse();
return `<div class="grid">${tri(en,sa)}</div>`+(k.length?`<div class="scroll" style="margin-top:12px"><table><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr>${k.map(x=>`<tr><td>${x.slice(5)}/${x.slice(0,4)}</td><td>${brl(m[x][0])}</td><td>${brl(m[x][1])}</td><td>${brl(m[x][0]-m[x][1])}</td></tr>`).join('')}</table></div>`:'<div class="empty" style="margin-top:12px"><b>Sem lançamentos</b>Registre em Entradas e saídas.</div>')}
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function cash(){const [en,sa]=tot();
const rows=[...caixa].map(x=>`<tr><td>${x.dt.split('-').reverse().join('/')}</td><td>${esc(x.d)}</td><td>${x.t==='e'?'Entrada':'Saída'}</td><td>${x.t==='e'?'':'−'}${brl(x.v)}</td><td><button class="btn alt" style="padding:4px 10px" onclick="editC('${x.id}')">Editar</button> <button class="btn alt" style="padding:4px 10px" onclick="delC('${x.id}')">Remover</button></td></tr>`).join('');
return `<div class="grid">${tri(en,sa)}</div>
<form class="card" id="frmc" style="margin-top:12px" onsubmit="return addC(event)"><h3 id="frmct">Novo lançamento</h3><div class="grid"><div><label>Tipo<select name="t"><option value="e">Entrada</option><option value="s">Saída</option></select></label></div><div><label>Valor (R$)<input name="v" type="number" min="0.01" step="0.01" required></label></div><div><label>Data<input name="dt" type="date" required></label></div></div><label>Descrição<input name="d" required></label><div class="row"><button class="btn">Salvar lançamento</button><button type="button" class="btn alt" id="frmcx" hidden onclick="cashLoad(cash)">Cancelar edição</button></div></form>
${rows?`<div class="scroll" style="margin-top:12px"><table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th></th></tr>${rows}</table></div>`:'<div class="empty" style="margin-top:12px"><b>Nenhum lançamento</b>Registre a primeira entrada ou saída acima.</div>'}
<div class="row"><button class="btn alt" onclick="csv('lancamentos',[['Data','dt'],['Tipo','tp'],['Descrição','d'],['Valor','v']],caixa.map(x=>({...x,tp:x.t==='e'?'Entrada':'Saída',v:String(x.v).replace('.',',')})))">Exportar planilha</button></div><p class="note">Lançamentos salvos no banco de dados; só admin e financeiro veem.</p>`}
function editC(id){const x=caixa.find(y=>y.id===id);if(!x)return;EDC=id;const f=$('#frmc').elements;f.t.value=x.t;f.v.value=x.v;f.dt.value=x.dt;f.d.value=x.d;$('#frmct').textContent='Editar lançamento';$('#frmcx').hidden=false;$('#frmc').scrollIntoView({behavior:'smooth'})}
async function addC(e){e.preventDefault();const f=e.target.elements;const row={tipo:f.t.value==='e'?'entrada':'saida',valor:parseFloat(f.v.value),data:f.dt.value,descricao:f.d.value.trim()};const ed=EDC;EDC=null;const {error}=await(ed?sb.from('lancamentos').update(row).eq('id',ed):sb.from('lancamentos').insert(row));if(error)alert('Não foi possível salvar: '+error.message);else cashLoad(cash);return false}
async function delC(id){if(!confirm('Remover este lançamento?'))return;const {error}=await sb.from('lancamentos').delete().eq('id',id);if(error)alert(error.message);else cashLoad(cash)}
// Usuários (só admin): criar, trocar perfil, nova senha, excluir. O admin principal (protegido) é intocável.
const PAPEIS=['admin','secretaria','financeiro','treinador','comunicacao','atleta'];
let USERS=[];
async function userFn(body){const {data,error}=await sb.functions.invoke('gerenciar-usuario',{body});let m=error?error.message:(data&&data.erro);if(error&&error.context&&error.context.json){try{m=(await error.context.json()).erro||m}catch(e){}}return m?{erro:m}:data}
async function usersLoad(){const {data,error}=await sb.rpc('lista_usuarios');if(error||!data||!data.length){$('#cx').innerHTML='<div class="empty"><b>Sem acesso</b>Só o administrador gerencia usuários (rode os SQL 07 e 09 no Supabase).</div>';return}
USERS=data;
$('#cx').innerHTML=`<form class="card" onsubmit="return addU(event)"><h3>Novo usuário</h3><div class="grid"><div><label>E-mail<input name="e" type="email" required autocomplete="off"></label></div><div><label>Senha (8+ caracteres)<input name="s" type="text" minlength="8" required autocomplete="off"></label></div><div><label>Perfil<select name="p">${PAPEIS.map(p=>`<option${p==='secretaria'?' selected':''}>${p}</option>`).join('')}</select></label></div></div><div class="row"><button class="btn">Criar usuário</button></div></form>
<div class="scroll" style="margin-top:12px"><table><tr><th>E-mail</th><th>Perfil</th><th></th></tr>${data.map(u=>{const eu=u.id===ME.id;return `<tr><td>${esc(u.email)}${u.protegido?' <span class="badge">principal</span>':''}${eu?' <span class="note">(você)</span>':''}</td><td><select ${eu||u.protegido?'disabled':''} onchange="setPapel('${u.id}',this.value)">${PAPEIS.map(p=>`<option${p===u.papel?' selected':''}>${p}</option>`).join('')}</select></td><td>${u.protegido&&!eu?'':`<button class="btn alt" style="padding:4px 10px" onclick="passU('${u.id}')">Nova senha</button>`} ${u.protegido||eu?'':`<button class="btn alt" style="padding:4px 10px" onclick="delU('${u.id}')">Excluir</button>`}</td></tr>`}).join('')}</table></div><p class="note" id="umsg" role="status">O administrador principal não pode ser excluído nem rebaixado. Você não altera o seu próprio perfil.</p>`}
async function addU(e){e.preventDefault();const f=e.target.elements;$('#umsg').textContent='Criando…';const r=await userFn({acao:'criar',email:f.e.value,senha:f.s.value,papel:f.p.value});if(r.erro)$('#umsg').textContent='Erro: '+r.erro;else{await usersLoad();$('#umsg').textContent='Usuário criado. Passe o e-mail e a senha a ele.'}return false}
async function delU(id){const u=USERS.find(x=>x.id===id);if(!confirm('Excluir '+u.email+'? Isso não pode ser desfeito.'))return;const r=await userFn({acao:'excluir',id});if(r.erro)$('#umsg').textContent='Erro: '+r.erro;else usersLoad()}
async function passU(id){const sn=prompt('Nova senha (8 ou mais caracteres):');if(!sn)return;const r=await userFn({acao:'nova_senha',id,senha:sn});$('#umsg').textContent=r.erro?'Erro: '+r.erro:'Senha alterada.'}
async function setPapel(id,p){const {error}=await sb.from('perfis').update({papel:p}).eq('id',id);$('#umsg').textContent=error?'Erro: '+error.message:'Perfil atualizado.';if(error)usersLoad()}
// Auditoria (só admin): últimas operações
async function audLoad(){const [a,u]=await Promise.all([sb.from('auditoria').select('*').order('quando',{ascending:false}).limit(100),sb.rpc('lista_usuarios')]);
if(a.error||!u.data){$('#cx').innerHTML='<div class="empty"><b>Sem acesso</b>Só o administrador vê o histórico (rode o SQL 09).</div>';return}
const em=Object.fromEntries(u.data.map(x=>[x.id,x.email])),op={INSERT:'criou',UPDATE:'alterou',DELETE:'excluiu'};
$('#cx').innerHTML=a.data.length?`<div class="scroll"><table><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr>${a.data.map(x=>`<tr><td>${dh(x.quando)}</td><td>${esc(em[x.usuario]||'sistema')}</td><td>${op[x.operacao]||esc(x.operacao)} em ${esc(x.tabela)}</td></tr>`).join('')}</table></div>`:'<div class="empty"><b>Nada registrado ainda</b></div>'}
// Login da área ADM

function gate(){}
const lmsg=t=>{$('#le2').textContent=t};
const noSb='O Supabase ainda não está configurado (falta a chave em config.js).';
const LOGIN_DOMINIO='ide-atletas.com.br';const toEmail=v=>{v=String(v||'').trim().toLowerCase();return v.includes('@')?v:v+'@'+LOGIN_DOMINIO};
async function login2(e){e.preventDefault();if(!sb){lmsg(noSb);return false}
const {data,error}=await sb.auth.signInWithPassword({email:toEmail($('#lu2').value),password:$('#lp2').value});
if(error){lmsg('Login/e-mail ou senha incorretos.');return false}$('#lp2').value='';await setMe(data.session);const destino=want==='matricula'?'matricula':STAFF.includes(PAPEL)?'adm':IS_ATLETA?'atleta':'matricula';want='inicio';location.hash='#'+destino;route();return false}
function lmode(m){['login','signup','reset'].forEach(k=>{$('#lm-'+k).hidden=k!==m});lmsg('');const f=$('#lm-'+m).querySelector('input');if(f)f.focus()}
async function signup(e){if(e)e.preventDefault();if(!sb){lmsg(noSb);return false}const em=$('#su_e').value.trim().toLowerCase(),pw=$('#su_p').value;
if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){lmsg('Informe um e-mail válido.');return false}
if(pw.length<8){lmsg('A senha precisa ter 8 ou mais caracteres.');return false}
if(pw!==$('#su_p2').value){lmsg('As senhas não conferem.');return false}
lmsg('Criando a conta…');const {data,error}=await sb.auth.signUp({email:em,password:pw});
if(error){lmsg(/registered|exists/i.test(error.message)?'Este e-mail já tem conta. Toque em "Já tenho conta" e entre, ou use "Esqueci a senha".':'Não foi possível criar a conta: '+error.message);return false}
if(!data.session){lmsg('Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.');return false}
$('#su_p').value=$('#su_p2').value='';lmsg('');await setMe(data.session);location.hash='#matricula';route();return false}
async function pedirSenha(e){e.preventDefault();if(!sb){lmsg(noSb);return false}const nome=$('#rs_n').value.trim().replace(/\s+/g,' ').slice(0,120),id=$('#rs_e').value.trim().slice(0,120),z=$('#rs_z').value.trim();
if(nome.length<5||!nome.includes(' ')){lmsg('Informe o seu nome completo (nome e sobrenome).');return false}
if(id.length<3){lmsg('Informe o seu login ou e-mail.');return false}
if(!/^\d{10,11}$/.test(z.replace(/\D/g,''))){lmsg('Informe o WhatsApp com DDD: é por ele que a secretaria vai avisar você.');return false}
lmsg('Enviando…');const {error}=await sb.from('pedidos_senha').insert({identificador:id,whatsapp:z,nome});
if(error&&error.code!=='23505'){lmsg('Não foi possível enviar o pedido agora. Fale com o IDE pelo WhatsApp.');return false}
$('#rs_n').value=$('#rs_e').value=$('#rs_z').value='';lmsg('Pedido enviado! A secretaria vai definir uma nova senha e avisar você pelo WhatsApp informado.');return false}
async function novaSenha(e){e.preventDefault();const p=$('#ns_p').value,m=$('#ns_m');if(p.length<8){m.textContent='A senha precisa ter 8 ou mais caracteres.';return false}if(p!==$('#ns_p2').value){m.textContent='As senhas não conferem.';return false}
m.textContent='Salvando…';const {error}=await sb.auth.updateUser({password:p});if(error){m.textContent='Não foi possível trocar: '+error.message;return false}
RECOV=false;$('#ns_p').value=$('#ns_p2').value='';m.textContent='';const {data}=await sb.auth.getSession();await setMe(data.session);location.hash=STAFF.includes(PAPEL)?'#adm':IS_ATLETA?'#atleta':'#matricula';route();return false}
function logout(){if(sb)sb.auth.signOut();ME=null;PAPEL=null;OK=false;IS_ATLETA=false;want='inicio';location.hash='#inicio';route()}
async function setMe(ses){ME=ses?ses.user:null;PAPEL=null;IS_ATLETA=false;if(ME){const {data}=await sb.from('perfis').select('papel').eq('id',ME.id).maybeSingle();PAPEL=data?data.papel:'atleta';if(!STAFF.includes(PAPEL)){const r=await sb.from('matriculas').select('id').or('dono.eq.'+ME.id+',atleta_user.eq.'+ME.id).limit(1);IS_ATLETA=!!(r.data&&r.data.length)}}OK=!!ME;route()}
async function initAuth(){if(!sb)return;const {data}=await sb.auth.getSession();await setMe(data.session);sb.auth.onAuthStateChange((ev,ses)=>{if(ev==='PASSWORD_RECOVERY')RECOV=true;setTimeout(()=>setMe(ses),0)})}
const DOCS=[['foto','Foto do atleta'],['cert','Certidão de nascimento ou RG'],['res','Comprovante de residência'],['esc','Comprovante de escolaridade']];
function docsForm(m){return `<details class="card" style="margin:8px 0" ${m.status==='Aguardando documentos'?'open':''}><summary><b>Enviar ou trocar documentos</b></summary>${DOCS.map(([k,l])=>`<label>${l}${(k==='foto'?m.fotoPath:m.docs[k])?' <span class="badge">enviado</span>':''}<input type="file" accept="image/*" id="rd_${k}_${m.id}"></label>`).join('')}<div class="row"><button class="btn" onclick="reenviar('${m.id}')">Enviar</button></div><p class="note" id="rdm_${m.id}" role="status"></p></details>`}
async function reenviar(id){const n=$('#rdm_'+id),{data:r}=await sb.from('matriculas').select('protocolo,status,foto_path,docs_paths').eq('id',id).single();if(!r){n.textContent='Não foi possível abrir a matrícula.';return}
const docs={...(r.docs_paths||{})};let foto=r.foto_path,qt=0;n.textContent='Enviando…';
try{for(const [k] of DOCS){const f=($('#rd_'+k+'_'+id)||{}).files&&$('#rd_'+k+'_'+id).files[0];if(!f)continue;
const d=await rz(f,k==='foto'?320:700,k==='foto'?.8:.5);const nome=k==='foto'?'foto':{cert:'certidao',res:'residencia',esc:'escolaridade'}[k];const pa=`${ME.id}/${r.protocolo}-${nome}.jpg`;
const {error}=await sb.storage.from('documentos').upload(pa,await toBlob(d),{contentType:'image/jpeg',upsert:true});if(error)throw error;if(k==='foto')foto=pa;else docs[k]=pa;qt++}
if(!qt){n.textContent='Escolha pelo menos uma foto.';return}
const up={foto_path:foto,docs_paths:docs,atualizado:new Date().toISOString()};if(r.status==='Aguardando documentos')up.status='Em análise';
const {error}=await sb.from('matriculas').update(up).eq('id',id);if(error)throw error;n.textContent='Enviado! A comissão vai conferir.';setTimeout(loadAt,1200)}catch(e){n.textContent='Não foi possível enviar: '+(e.message||e)}}
async function loadAt(){const el=$('#atbox');if(!sb||!ME){el.innerHTML='<div class="empty"><b>Entre para ver sua matrícula</b></div>';return}el.textContent='Carregando…';
const {data,error}=await sb.from('matriculas').select('*').or('dono.eq.'+ME.id+',atleta_user.eq.'+ME.id).order('criado',{ascending:false});
if(error){el.innerHTML='<div class="empty"><b>Não foi possível carregar</b>Tente de novo em instantes.</div>';return}
if(!data.length){el.innerHTML='<div class="empty"><b>Nenhuma matrícula nesta conta</b>Faça a pré-matrícula na aba Matrícula.</div>';return}
const MSG={'Recebida':'Recebemos a matrícula. A comissão técnica vai analisar. Volte aqui para acompanhar.','Em análise':'A comissão técnica está analisando a matrícula.','Aguardando documentos':'Faltam documentos. Envie abaixo a foto ou os documentos que faltam e a comissão vai conferir de novo.','Recusada':'A matrícula não foi aceita. Fale com o IDE para saber o motivo.','Arquivada':'Esta matrícula foi arquivada.','Aprovada':'Matrícula aprovada! Veja abaixo a carteirinha do atleta.'};
let h='';for(const r of data){const m=mapM(r);m.foto=await sUrl(m.fotoPath);h+=`<div class="card" style="margin-bottom:12px"><p>Atleta <b>${esc(m.nome)}</b> · Protocolo <b>${esc(m.proto)}</b></p><p>Status: <span class="badge">${esc(m.status)}</span></p><p>${MSG[m.status]||''}</p>${r.dono===ME.id&&['Recebida','Em análise','Aguardando documentos'].includes(m.status)?docsForm(m):''}${m.status==='Aprovada'?(m.login?`<p class="note">Login do atleta: <b>${esc(m.login)}</b>. A senha foi entregue pela secretaria.</p>`:'')+cartH(m):''}</div>`}el.innerHTML=h+'<p class="note">Treinos na Arena Ribamar, a partir das 18h50.</p>'}
document.querySelector('.gal').onclick=e=>{const b=e.target.closest('.gi');if(!b)return;const i=b.querySelector('img');$('#lbi').src=i.src;$('#lbi').alt=i.alt;$('#lb').showModal()};$('#lbx').onclick=()=>$('#lb').close();$('#lb').onclick=e=>{if(e.target.id==='lb')e.target.close()};
renderPay();
initAuth();pubLoad();payFetch();
window.__ide_ok=true;

// menu agrupado: fecha ao clicar fora ou em um item; abre só um grupo por vez
document.addEventListener('click',e=>{document.querySelectorAll('#nav .ng[open]').forEach(g=>{if(!g.contains(e.target)||e.target.closest('.gm a'))g.open=false})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('#nav .ng[open]').forEach(g=>g.open=false)});
