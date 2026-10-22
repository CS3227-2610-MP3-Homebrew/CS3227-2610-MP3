'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { areas, drinkTypes, type CatalogueQuery } from '@/lib/catalogue/query';
import { singaporeMinuteToInstant } from '@/lib/catalogue/clock';
export default function Filters({ query, onChange }: { query: CatalogueQuery; onChange?: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState(query.timeMode);
  const [area, setArea] = useState(query.area ?? '');
  const [drink, setDrink] = useState(query.drinkType ?? '');
  const local = query.at ? new Date(Date.parse(query.at) + 8*3600000).toISOString() : '';
  const [date, setDate] = useState(local.slice(0,10));
  const [time, setTime] = useState(local.slice(11,16));
  function apply() {
    onChange?.();
    if (mode === 'at' && (!date || !time)) return;
    const params = new URLSearchParams();
    if (mode !== 'all') params.set('timeMode', mode);
    if (mode === 'at') params.set('at', singaporeMinuteToInstant(date,time));
    if (area) params.set('area', area);
    if (drink) params.set('drinkType', drink);
    router.push(`/customer/cafes${params.size ? `?${params}` : ''}`);
  }
  const control = 'rounded border border-black/30 bg-white p-2 text-black';
  return <form className="my-6 flex flex-wrap items-end gap-4" onChange={onChange} onSubmit={event => { event.preventDefault(); apply(); }}>
    <label className="grid gap-1">Opening time<select className={control} value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="all">All opening times</option><option value="now">Open now</option><option value="at">Open at</option></select></label>
    {mode === 'at' && <><label className="grid gap-1">Date (Singapore)<input className={control} type="date" value={date} required onChange={e=>setDate(e.target.value)} /></label><label className="grid gap-1">Time<input className={control} type="time" value={time} required onChange={e=>setTime(e.target.value)} /></label></>}
    <label className="grid gap-1">Drink type<select className={control} value={drink} onChange={e=>setDrink(e.target.value)}><option value="">All drinks</option>{drinkTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></label>
    <label className="grid gap-1">Area<select className={control} value={area} onChange={e=>setArea(e.target.value)}><option value="">All areas</option>{areas.map(value=><option key={value}>{value}</option>)}</select></label>
    <button className={control} type="submit">Apply</button><button className={control} type="button" onClick={()=>{onChange?.();setMode('all');setArea('');setDrink('');setDate('');setTime('');router.push('/customer/cafes');}}>Reset</button>
  </form>;
}
