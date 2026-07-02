import { cn } from '#/lib/utils.ts';

// The small coloured pill that labels a search result / row by its kind.
const VARIANTS = {
  collection: { label: 'Collection', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  item: { label: 'Item', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  essence: { label: 'Essence', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
} as const;

type EntityBadgeProps = {
  kind: keyof typeof VARIANTS;
};

export const EntityBadge = ({ kind }: EntityBadgeProps) => {
  const { label, className } = VARIANTS[kind];

  return <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs font-medium', className)}>{label}</span>;
};
