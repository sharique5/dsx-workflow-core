import { useBrand } from '../../app/brand.context';

const SCALES_PATH =
  'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3';

type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<BrandLogoSize, { container: string; iconSize: number }> = {
  sm:  { container: 'w-7 h-7 rounded-lg',    iconSize: 13 },
  md:  { container: 'w-8 h-8 rounded-lg',    iconSize: 16 },
  lg:  { container: 'w-9 h-9 rounded-xl',    iconSize: 18 },
  xl:  { container: 'w-12 h-12 rounded-2xl', iconSize: 22 },
};

export function BrandLogo({
  size = 'md',
  className,
}: {
  size?: BrandLogoSize;
  className?: string;
}) {
  const { logoUrl, primaryColor, firmName } = useBrand();
  const { container, iconSize } = SIZE_MAP[size];

  return (
    <div
      className={`${container} shrink-0 flex items-center justify-center overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: primaryColor }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={firmName} className="w-full h-full object-cover" />
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={SCALES_PATH} />
        </svg>
      )}
    </div>
  );
}
