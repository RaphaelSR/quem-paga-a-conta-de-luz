import csv,json,collections,hashlib,pathlib
from html.parser import HTMLParser
import argparse
parser=argparse.ArgumentParser(description='Rebuild the 2026-09-12 snapshot from the four original files listed in data/proveniencia.json. Editorial review is required for other dates.')
parser.add_argument('--input-dir',type=pathlib.Path,required=True)
args=parser.parse_args()
W=args.input_dir
D=pathlib.Path(__file__).resolve().parents[1]/'data'
manifest=json.loads((D/'proveniencia.json').read_text())
for source in manifest['sources']:
 assert hashlib.sha256((W/source['file']).read_bytes()).hexdigest()==source['sha256'], 'Source changed: '+source['file']
num=lambda s:float(s.replace(',','.')) if s.strip() else 0
rows=list(csv.DictReader(open(W/'tarifas.csv',encoding='utf-8-sig'),delimiter=';'))
filtered=[r for r in rows if r['DscSubGrupo']=='B1' and r['DscModalidadeTarifaria']=='Convencional' and r['DscBaseTarifaria']=='Tarifa de Aplicação' and r['DatInicioVigencia']<='2026-09-12'<=r['DatFimVigencia'] and r['DscSubClasse']=='Residencial' and r['DscClasse']=='Residencial' and r['DscDetalhe']=='Não se aplica' and r['DscUnidadeTerciaria']=='MWh' and r['SigAgente']!='Não Informado']
latest={}
for r in sorted(filtered,key=lambda r:r['DatInicioVigencia']):latest[r['NumCNPJDistribuidora']]=r
rates=[dict(name=r['SigAgente'],cnpj=r['NumCNPJDistribuidora'],start=r['DatInicioVigencia'],end=r['DatFimVigencia'],te=num(r['VlrTE'])/1000,tusd=num(r['VlrTUSD'])/1000,rate=round((num(r['VlrTE'])+num(r['VlrTUSD']))/1000,5),resolution=r['DscREH']) for r in latest.values()]
rates.sort(key=lambda r:-r['rate'])
siga=list(csv.DictReader(open(W/'siga.csv',encoding='utf-8-sig'),delimiter=';'))
plants=[];states={};excluded=0;seen={};duplicate_siga=0
for r in siga:
 if r['DscFaseUsina']!='Operação':continue
 key=r['CodCEG']
 fields=['SigUFPrincipal','SigTipoGeracao','MdaPotenciaFiscalizadaKw','NumCoordNEmpreendimento','NumCoordEEmpreendimento']
 if key in seen:
  assert all(r[f]==seen[key][f] for f in fields), 'Conflicting CEG: '+key
  duplicate_siga+=1
  continue
 seen[key]=r
 mw=num(r['MdaPotenciaFiscalizadaKw'])/1000
 if mw<=0:continue
 uf=r['SigUFPrincipal'];s=states.setdefault(uf,dict(total=0,hydro=0,count=0));s['total']+=mw;s['count']+=1
 if r['SigTipoGeracao'] in ['UHE','PCH','CGH']:
  s['hydro']+=mw
  try:lat=num(r['NumCoordNEmpreendimento']);lon=num(r['NumCoordEEmpreendimento'])
  except ValueError:excluded+=1;continue
  if not (-34<lat<6 and -74<lon<-34):excluded+=1;continue
  plants.append(dict(name=r['NomEmpreendimento'],id=r['CodCEG'],uf=uf,type=r['SigTipoGeracao'],mw=round(mw,3),lat=lat,lon=lon,city=r['DscMuninicpios']))
class Tables(HTMLParser):
 def __init__(self):super().__init__();self.tables=[];self.table=None;self.row=None;self.cell=None
 def handle_starttag(self,t,a):
  if t=='table':self.table=[]
  if t=='tr':self.row=[]
  if t in ['td','th']:self.cell=''
 def handle_data(self,d):
  if self.cell is not None:self.cell+=d
 def handle_endtag(self,t):
  if t in ['td','th'] and self.cell is not None:
   if self.row is not None:self.row.append(' '.join(self.cell.split()))
   self.cell=None
  if t=='tr' and self.row is not None:
   if self.table is not None:self.table.append(self.row)
   self.row=None
  if t=='table' and self.table is not None:self.tables.append(self.table);self.table=None
p=Tables();p.feed(open(W/'continuidade.html').read());quality=[]
for row in p.tables[0][1:]:
 if len(row)>=4:
  try:quality.append(dict(rank=row[0],dgc=num(row[1]),name=row[2],company=row[3]))
  except ValueError:pass
meta=dict(updated='2026-09-12',sigaDate=sorted(set(r['DatGeracaoConjuntoDados'] for r in siga)),rateDate=sorted(set(r['DatGeracaoConjuntoDados'] for r in rows)),overlaps=len(filtered)-len(latest),excludedCoordinates=excluded,excludedUnnamed=1,qualityYear=2025,duplicateSiga=duplicate_siga)
for n,v in [('tarifas',rates),('usinas',sorted(plants,key=lambda p:-p['mw'])),('capacidade-uf',states),('continuidade',quality),('metadata',meta)]:
 (D/(n+'.json')).write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')))
with open(D/'tarifas.csv','w') as f:
 writer=csv.DictWriter(f,fieldnames=rates[0].keys());writer.writeheader();writer.writerows(rates)
print('rates',len(rates),'plants',len(plants),'states',len(states),'quality',len(quality),meta)
(D/'estados.geojson').write_bytes((W/'estados.json').read_bytes())
