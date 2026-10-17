/**
 * Locations map on Our Work: region filter, search over English and Punjabi names, pin and
 * list selection kept in sync, the collapsed list with "Show all locations" on small screens,
 * and the info panel under the map. A port of the reference's map script for a page that is
 * rendered in one language: labels come from data-label-* on `.locwrap`, the data from the
 * #locdata JSON block, and the language from <html data-lang>.
 */
interface Loc {
  /** English name and region. */
  n: string;
  r: string;
  t: 'Hospital' | 'Kitchen' | 'Community';
  /** Punjabi name and region. */
  pn: string;
  pr: string;
}

export function initMap(): void {
  const src = document.getElementById('locdata');
  const wrap = document.querySelector<HTMLElement>('.locwrap');
  const q = document.getElementById('locq') as HTMLInputElement | null;
  const list = document.getElementById('loclist');
  const info = document.getElementById('mapinfo');
  const cnt = document.getElementById('loccount');
  const more = document.getElementById('locmore');
  if (!src || !wrap || !q || !list || !info || !cnt || !more) return;

  const data = JSON.parse(src.textContent || '[]') as Loc[];
  const pins = [...document.querySelectorAll<SVGGElement>('.pin')];
  const rows = [...document.querySelectorAll<HTMLButtonElement>('.loc')];
  const chips = [...document.querySelectorAll<HTMLButtonElement>('.rchip')];
  const pa = document.documentElement.dataset.lang === 'pa';
  const d = wrap.dataset;
  const label = {
    Hospital: d.labelHospital ?? 'Hospital',
    Kitchen: d.labelKitchen ?? 'Kitchen',
    Community: d.labelCommunity ?? 'School & community',
    fresh: d.labelFresh ?? 'Fresh Langar prepared here daily.',
    hours: d.labelHours ?? 'Langar served 10:00 AM – 4:00 PM',
    one: d.labelOne ?? ' location',
    many: d.labelMany ?? ' locations',
  };

  let region = 'All';

  list.classList.add('collapsed');
  more.addEventListener('click', () => list.classList.remove('collapsed'));

  function apply(): void {
    const raw = q!.value || '';
    const s = raw.toLowerCase();
    const exact = raw.trim();
    let n = 0;
    data.forEach((loc, i) => {
      const ok =
        (region === 'All' || loc.r === region) &&
        (!s || loc.n.toLowerCase().includes(s) || loc.pn.includes(exact));
      const row = rows[i];
      if (row) row.style.display = ok ? '' : 'none';
      pins[i]?.classList.toggle('dim', !ok);
      if (ok) n++;
    });
    if (s || region !== 'All') list!.classList.remove('collapsed');
    cnt!.textContent = n + (n === 1 ? label.one : label.many);
  }

  function line(cls: string, text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    return el;
  }

  function select(i: number, scroll: boolean): void {
    const loc = data[i];
    if (!loc) return;
    pins.forEach((p) => p.classList.toggle('sel', Number(p.getAttribute('data-i')) === i));
    rows.forEach((r) => r.classList.toggle('sel', Number(r.getAttribute('data-i')) === i));
    info!.replaceChildren(
      line('mi-k', `${pa ? loc.pr : loc.r} · ${label[loc.t]}`),
      line('mi-n', pa ? loc.pn : loc.n),
      line('mi-d', loc.t === 'Kitchen' ? label.fresh : label.hours),
    );
    if (scroll) {
      list!.classList.remove('collapsed');
      rows[i]?.scrollIntoView({ block: 'nearest' });
    }
  }

  pins.forEach((p) => {
    const i = Number(p.getAttribute('data-i'));
    p.addEventListener('click', () => select(i, true));
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(i, true);
      }
    });
  });
  rows.forEach((r) =>
    r.addEventListener('click', () => select(Number(r.getAttribute('data-i')), false)),
  );
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      region = c.getAttribute('data-r') || 'All';
      chips.forEach((x) => x.classList.toggle('on', x === c));
      apply();
    }),
  );
  q.addEventListener('input', apply);
  apply();
}

initMap();
