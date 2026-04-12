'use client';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export default function Select({
  label,
  error,
  options,
  placeholder = 'Selecione...',
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full rounded-xl border bg-white dark:bg-slate-800
          text-slate-900 dark:text-slate-100
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
          px-4 py-2.5 appearance-none
          ${
            error
              ? 'border-red-400 dark:border-red-500 focus:ring-red-500/50'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
          }
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
