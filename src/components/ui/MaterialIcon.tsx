type MaterialIconVariant = 'filled' | 'outlined' | 'round' | 'sharp' | 'two-tone';

interface MaterialIconProps {
  name: string;
  className?: string;
  variant?: MaterialIconVariant;
  title?: string;
}

const variantClass: Record<MaterialIconVariant, string> = {
  filled: 'material-icons',
  outlined: 'material-icons-outlined',
  round: 'material-icons-round',
  sharp: 'material-icons-sharp',
  'two-tone': 'material-icons-two-tone',
};

export function MaterialIcon({ name, className = '', variant = 'outlined', title }: MaterialIconProps) {
  return (
    <span
      className={`${variantClass[variant]} inline-flex w-[1em] min-w-[1em] max-w-[1em] items-center justify-center overflow-hidden leading-none align-middle ${className}`}
      aria-hidden={title ? undefined : true}
      title={title}
    >
      {name}
    </span>
  );
}
