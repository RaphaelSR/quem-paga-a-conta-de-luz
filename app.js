'use strict';
const $ = s => document.querySelector(s);
const fmt = (n, digits = 0) => n.toLocaleString('pt-BR', {minimumFractionDigits: digits, maximumFractionDigits: digits});
const money = n => n.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = d => d.split('-').reverse().join('/');
const states = {'11':['RO','Rondônia'],'12':['AC','Acre'],'13':['AM','Amazonas'],'14':['RR','Roraima'],'15':['PA','Pará'],'16':['AP','Amapá'],'17':['TO','Tocantins'],'21':['MA','Maranhão'],'22':['PI','Piauí'],'23':['CE','Ceará'],'24':['RN','Rio Grande do Norte'],'25':['PB','Paraíba'],'26':['PE','Pernambuco'],'27':['AL','Alagoas'],'28':['SE','Sergipe'],'29':['BA','Bahia'],'31':['MG','Minas Gerais'],'32':['ES','Espírito Santo'],'33':['RJ','Rio de Janeiro'],'35':['SP','São Paulo'],'41':['PR','Paraná'],'42':['SC','Santa Catarina'],'43':['RS','Rio Grande do Sul'],'50':['MS','Mato Grosso do Sul'],'51':['MT','Mato Grosso'],'52':['GO','Goiás'],'53':['DF','Distrito Federal']};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reduced) {
 const reveals = new IntersectionObserver(entries => entries.forEach(e => {if(e.isIntersecting){e.target.classList.remove('pending');reveals.unobserve(e.target);}}),{threshold:.08});
 document.querySelectorAll('.reveal').forEach(el => {if(el.getBoundingClientRect().top>innerHeight){el.classList.add('pending');reveals.observe(el);}});
}
let scrollPending = false;
function updateScroll(){
 const max = document.documentElement.scrollHeight-innerHeight;
 $('#progress').style.width = `${max>0?scrollY/max*100:0}%`;
 const links = [...document.querySelectorAll('nav a')];
 let active = links[0];
 links.forEach(a=>{if($(a.getAttribute('href')).getBoundingClientRect().top<180)active=a;});
 links.forEach(a=>{a.classList.toggle('active',a===active);if(a===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
 scrollPending=false;
}
addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(updateScroll);}},{passive:true});
updateScroll();
document.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{
 const topic=button.dataset.topic;let count=0;document.querySelectorAll('[data-bill-topic]').forEach(card=>{card.hidden=topic!=='all'&&card.dataset.billTopic!==topic;if(!card.hidden)count++;});
 document.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#bill-count').textContent=`${count} propostas neste filtro`;
}));
$('#share').addEventListener('click',async()=>{
 const payload={title:document.title,text:'Quem paga a conta de luz? Um dossiê com dados da ANEEL, EPE e IBGE.',url:location.href.split('#')[0]};
 try{if(navigator.share){await navigator.share(payload);}else{await navigator.clipboard.writeText(payload.url);$('#share-status').textContent='Link copiado.';}}
 catch(error){if(error.name!=='AbortError')$('#share-status').textContent=`Copie o endereço: ${payload.url}`;}
});
async function boot(){
 const [rates,plants,capacity,quality,geo] = await Promise.all(['tarifas.json','usinas.json','capacidade-uf.json','continuidade.json','estados.geojson'].map(async path=>{const r=await fetch(`data/${path}`);if(!r.ok)throw new Error(path);return r.json();}));
 let selectedRate='EQUATORIAL PA', expanded=false;
 const rateMax=Math.max(...rates.map(r=>r.rate));
 function rateDetail(r){$('#rate-detail').innerHTML=`<p><b>${esc(r.name)}</b><br>TE: R$ ${fmt(r.te,5)}/kWh · TUSD: R$ ${fmt(r.tusd,5)}/kWh · Soma: R$ ${fmt(r.rate,5)}/kWh<br>Vigência: ${date(r.start)} a ${date(r.end)} · CNPJ ${esc(r.cnpj)}<br>${esc(r.resolution)}<br><a href="https://dadosabertos.aneel.gov.br/dataset/tarifas-distribuidoras-energia-eletrica">Conferir na base ANEEL ↗</a></p>`;}
 function renderRates(){
  const q=norm($('#rate-search').value),sort=$('#rate-sort').value;
  const shown=rates.filter(r=>norm(r.name).includes(q)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'pt-BR'):sort==='asc'?a.rate-b.rate:b.rate-a.rate);
  $('#rate-count').textContent=`${shown.length} agentes encontrados`;
  const subset=expanded||q?shown:shown.slice(0,12);
  $('#rate-chart').innerHTML=subset.map(r=>`<button class="rate-row ${['EQUATORIAL PA','COPEL-DIS'].includes(r.name)?'featured':''} ${r.name===selectedRate?'selected':''}" data-name="${esc(r.name)}" aria-label="${esc(r.name)}, ${fmt(r.rate,5)} reais por quilowatt-hora. Ver detalhes"><span>${esc(r.name)}</span><span class="track" aria-hidden="true"><i style="width:${r.rate/rateMax*100}%"></i></span><span class="value">${fmt(r.rate,5)}</span></button>`).join('') || '<p>Nenhuma distribuidora encontrada. Tente outra busca.</p>';
  $('#more-rates').hidden=!!q||shown.length<=12;$('#more-rates').textContent=expanded?'Mostrar apenas as 12 primeiras ↑':`Mostrar os ${shown.length} agentes ↓`;
 }
 $('#rate-chart').addEventListener('click',e=>{const row=e.target.closest('[data-name]');if(!row)return;selectedRate=row.dataset.name;rateDetail(rates.find(r=>r.name===selectedRate));document.querySelectorAll('.rate-row').forEach(b=>b.classList.toggle('selected',b.dataset.name===selectedRate));});
 $('#rate-search').addEventListener('input',renderRates);$('#rate-sort').addEventListener('change',renderRates);$('#more-rates').addEventListener('click',()=>{expanded=!expanded;renderRates();});
 const rateOptions=[...rates].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(r=>`<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('');
 $('#calc-a').innerHTML=$('#calc-b').innerHTML=rateOptions;$('#calc-a').value='EQUATORIAL PA';$('#calc-b').value='COPEL-DIS';
 function calc(){
  const valid=$('#consumption-number').validity.valid;
  $('#consumption-number').setAttribute('aria-invalid',String(!valid));
  $('#consumption-error').hidden=valid;$('#calc-results').hidden=!valid;
  if(!valid)return;
  $('#consumption').value=$('#consumption-number').value;
  const consumption=Number($('#consumption-number').value),a=rates.find(r=>r.name===$('#calc-a').value),b=rates.find(r=>r.name===$('#calc-b').value);
  $('#consumption-value').textContent=`${fmt(consumption)} kWh`;
  $('#calc-results').innerHTML=[a,b].map(r=>`<div class="calc-result"><div><span>${esc(r.name)}</span><strong>${money(r.rate*consumption)}</strong></div><div class="calc-stack" aria-hidden="true"><i style="width:${r.te/r.rate*100}%"></i><i style="width:${r.tusd/r.rate*100}%"></i></div><p class="component-labels"><span><i class="swatch te"></i> TE <b>${fmt(r.te/r.rate*100,1)}%</b> · ${money(r.te*consumption)}</span><span><i class="swatch tusd"></i> TUSD <b>${fmt(r.tusd/r.rate*100,1)}%</b> · ${money(r.tusd*consumption)}</span></p></div>`).join('')+`<p class="calc-delta">${Math.abs(a.rate-b.rate)<.000001?'As duas tarifas resultam no mesmo valor.':`Em A, você pagaria <b>${money(Math.abs(a.rate-b.rate)*consumption)} ${a.rate>b.rate?'a mais':'a menos'}</b> por mês neste recorte. Mantendo consumo e tarifas por 12 meses, a diferença seria de <b>${money(Math.abs(a.rate-b.rate)*consumption*12)}</b> no ano — uma projeção constante, não previsão de reajustes.`}</p>`;
 }
 ['#calc-a','#calc-b'].forEach(id=>$(id).addEventListener('change',calc));$('#consumption').addEventListener('input',()=>{$('#consumption-number').value=$('#consumption').value;calc();});$('#consumption-number').addEventListener('input',calc);
 const stateList=Object.values(states).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
 $('#state').innerHTML='<option value="">Brasil inteiro</option>'+stateList.map(([uf,name])=>`<option value="${uf}">${name} (${uf})</option>`).join('');
 let selectedPlant=null;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 650 650');svg.setAttribute('role','group');svg.setAttribute('aria-label','Estados e usinas. Use também a seleção de estado e a lista ao lado.');
 const project=([lon,lat])=>[(lon+74)*15+18,(6-lat)*15+18];
 const pathFor=g=>{
  const polygons=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
  return polygons.map(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${project(p).map(n=>n.toFixed(1)).join(',')}`).join('')+'Z').join('')).join('');
 };
 geo.features.forEach(f=>{const [uf,name]=states[f.properties.codarea];const path=document.createElementNS(ns,'path');path.setAttribute('d',pathFor(f.geometry));path.setAttribute('class','uf-path');path.dataset.uf=uf;path.setAttribute('role','button');path.setAttribute('tabindex','0');path.setAttribute('aria-label',`Explorar ${name}`);const title=document.createElementNS(ns,'title');title.textContent=name;path.append(title);function choose(){ $('#state').value=uf;$('#plant-search').value='';selectedPlant=null;renderMap();}path.addEventListener('click',choose);path.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose();}});svg.append(path);});
 const layer=document.createElementNS(ns,'g');svg.append(layer);$('#map').append(svg);
 function selectPlant(id){selectedPlant=plants.find(p=>p.id===id);const p=selectedPlant;$('#plant-detail').innerHTML=`<b>${esc(p.name)}</b><p>${fmt(p.mw,3)} MW · ${p.type} · UF principal: ${p.uf}</p><p>${esc(p.city)}</p><p>CEG: ${esc(p.id)}<br>${fmt(p.lat,5)}, ${fmt(p.lon,5)}</p>`;layer.querySelectorAll('circle').forEach(c=>c.classList.toggle('selected',c.dataset.id===id));$('#plant-list').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.id===id));}
 function renderMap(){
  const uf=$('#state').value,q=norm($('#plant-search').value),small=$('#small-plants').checked;
  const candidates=plants.filter(p=>(!uf||p.uf===uf)&&(small||p.type==='UHE'));
  const examples=candidates.slice(0,2).map(p=>p.name);
  $('#plant-search').placeholder=uf?(examples.length?`Ex.: ${examples.join(', ')}…`:`Nenhuma usina neste filtro em ${uf}`):'Nome de uma usina ou município…';
  const shown=candidates.filter(p=>norm(p.name+' '+p.city+' '+p.uf).includes(q));
  layer.replaceChildren();svg.querySelectorAll('.uf-path').forEach(p=>p.classList.toggle('selected',p.dataset.uf===uf));
  [...shown].sort((a,b)=>b.mw-a.mw).forEach(p=>{const c=document.createElementNS(ns,'circle'),[x,y]=project([p.lon,p.lat]);c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',Math.sqrt(p.mw)*.20);c.setAttribute('class',`map-point ${p.type!=='UHE'?'small':''}`);c.dataset.id=p.id;const title=document.createElementNS(ns,'title');title.textContent=`${p.name} · ${fmt(p.mw,3)} MW`;c.append(title);c.addEventListener('click',()=>selectPlant(p.id));layer.append(c);});
  $('#map-summary').textContent=`${fmt(shown.length)} usinas · ${fmt(shown.reduce((s,p)=>s+p.mw,0),1)} MW neste filtro`;
  $('#plant-list').innerHTML=shown.map(p=>`<button data-id="${esc(p.id)}"><span>${esc(p.name)}<small>${p.uf} · ${p.type}</small></span><span>${fmt(p.mw,1)} MW</span></button>`).join('')||'<p>Nenhuma usina encontrada.</p>';
  if(selectedPlant&&shown.some(p=>p.id===selectedPlant.id))selectPlant(selectedPlant.id);else{$('#plant-detail').textContent='Selecione um círculo ou uma usina da lista para ver seus dados.';selectedPlant=null;}
 }
 $('#plant-list').addEventListener('click',e=>{const b=e.target.closest('button');if(b)selectPlant(b.dataset.id);});
 $('#state').addEventListener('change',()=>{$('#plant-search').value='';selectedPlant=null;renderMap();});$('#small-plants').addEventListener('change',renderMap);$('#plant-search').addEventListener('input',renderMap);$('#reset-map').addEventListener('click',()=>{$('#state').value='';$('#plant-search').value='';$('#small-plants').checked=false;selectedPlant=null;renderMap();});
 $('#coverage').textContent=`${fmt(plants.length)} empreendimentos hídricos com coordenadas válidas; UHE exibidas inicialmente.`;
 const capacityRows=Object.entries(capacity).sort((a,b)=>b[1].total-a[1].total),maxCapacity=capacityRows[0][1].total;
 $('#capacity-chart').innerHTML=capacityRows.map(([uf,c])=>`<div class="cap-row" title="${uf}: ${fmt(c.total,1)} MW totais; ${fmt(c.hydro,1)} MW hídricos"><span>${uf}</span><div class="cap-track" aria-hidden="true"><i style="width:${c.total/maxCapacity*100}%"><b style="width:${c.hydro/c.total*100}%"></b></i></div><span class="cap-value">${fmt(c.total/1000,2)} GW</span><span class="cap-breakdown"><span>Hídrica: <b>${fmt(c.hydro/c.total*100,1)}%</b> · ${fmt(c.hydro/1000,2)} GW</span><span>Demais: <b>${fmt((c.total-c.hydro)/c.total*100,1)}%</b> · ${fmt((c.total-c.hydro)/1000,2)} GW</span></span></div>`).join('');
 const generation=[['Hidrelétrica',421.799,401.415],['Eólica',107.654,116.488],['Solar',70.665,88.141]];
 $('#generation-chart').innerHTML=generation.map(([name,a,b])=>`<div class="gen-row"><b>${name}</b>${[a,b].map((v,i)=>`<div class="gen-bar ${i?'current':''}"><span>${2024+i}</span><div><i style="width:${v/421.799*100}%"></i></div><span>${fmt(v,1)}</span></div>`).join('')}</div>`).join('');
 $('#quality-chart').innerHTML=quality.map(r=>`<div class="quality-row ${r.name==='ENEL SP'?'hot':''}"><span>${esc(r.rank)}</span><span>${esc(r.name)}</span><div aria-hidden="true"><i style="width:${r.dgc*100}%"></i></div><span>${fmt(r.dgc,2)}</span></div>`).join('');
 renderRates();rateDetail(rates.find(r=>r.name===selectedRate));calc();renderMap();
}
boot().catch(error=>{$('#load-error').hidden=false;$('#rate-count').textContent='Dados indisponíveis. Consulte as fontes.';});
