import json, pathlib, math
root = pathlib.Path(__file__).resolve().parents[1]
def read(name): return json.loads((root/'data'/name).read_text())
rates=read('tarifas.json');plants=read('usinas.json');quality=read('continuidade.json');capacity=read('capacidade-uf.json')
assert len(rates)==98 and len({r['cnpj'] for r in rates})==98
assert all(r['start']<='2026-09-12'<=r['end'] and math.isclose(r['rate'],r['te']+r['tusd'],abs_tol=1e-8) for r in rates)
assert all(rates[i]['rate']>=rates[i+1]['rate'] for i in range(len(rates)-1))
a=next(r for r in rates if r['name']=='EQUATORIAL PA');b=next(r for r in rates if r['name']=='COPEL-DIS')
assert round((a['rate']/b['rate']-1)*100,1)==27.4
assert round(200*(a['rate']-b['rate']),2)==42.06
assert len(plants)==1342 and len({p['id'] for p in plants})==len(plants)
assert all(p['type'] in ['UHE','PCH','CGH'] and p['mw']>0 and -34<p['lat']<6 and -74<p['lon']<-34 for p in plants)
assert len(capacity)==27 and all(v['total']>=v['hydro']>=0 for v in capacity.values())
assert len(read('estados.geojson')['features'])==27
assert len(quality)==33 and all(0<q['dgc']<1 for q in quality)
assert next(q for q in quality if q['name']=='ENEL SP')['rank']=='30º'
assert 'name="viewport"' in (root/'index.html').read_text()
print('Verified: 98 tariff agents, formulas and date cut; 1,342 unique hydro plants; 27 states; 33 continuity results.')
