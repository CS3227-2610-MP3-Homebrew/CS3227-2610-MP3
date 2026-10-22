import Link from 'next/link';
import theme from '@/app/_components/homey-theme.module.css';

export function CafeActions({ cafeId, screen }: { cafeId: string; screen: 'profile' | 'menu' | 'pre-order' }) {
  const profile = `/customer/cafes/${encodeURIComponent(cafeId)}`;
  const actions = screen === 'pre-order'
    ? [{ label: 'View menu', href: `${profile}/menu` }, { label: 'Return to café profile', href: profile }]
    : [{ label: 'Pre-order for pickup', href: `${profile}/pre-order`, primary: true },
      screen === 'profile' ? { label: 'View menu', href: `${profile}/menu` } : { label: 'Back to café profile', href: profile }];
  return <nav aria-label="Café actions" className={theme.cafeActions}>{actions.map(action =>
    <Link key={action.href} href={action.href} className={'primary' in action ? theme.primaryAction : undefined}>{action.label}</Link>
  )}</nav>;
}
