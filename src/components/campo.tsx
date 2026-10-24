import type { InputHTMLAttributes } from "react";

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  name: string;
  erro?: string;
};

// Campo de formulário com rótulo e mensagem de erro acessível.
export function Campo({ rotulo, name, erro, ...props }: CampoProps) {
  const idErro = `${name}-erro`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700">
        {rotulo}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className="h-10 rounded-md border border-zinc-300 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 aria-invalid:border-red-500"
        {...props}
      />
      {erro && (
        <p id={idErro} className="text-sm text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}
