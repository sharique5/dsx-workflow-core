import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useCreateMatter } from '../hooks/useMatters';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import type { CreateMatterDto } from '@dsx/shared';

export function CreateCasePage() {
  const vocab = useVocabulary();
  const { mutate: createMatter, isPending, error } = useCreateMatter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMatterDto>({
    defaultValues: { statusKey: vocab.statuses[0]?.key ?? 'filed' },
  });

  const onSubmit = (data: CreateMatterDto) => {
    createMatter(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <Link to="/cases" className="text-sm text-gray-400 hover:text-gray-600">
          {vocab.matter_plural}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="font-semibold text-lg">New {vocab.matter_label}</h1>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-white p-6 shadow-sm space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={`e.g. Smith vs State`}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Internal Ref <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. NA-2024-001"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                {...register('internalRef', { required: 'Internal ref is required' })}
              />
              {errors.internalRef && (
                <p className="mt-1 text-xs text-red-500">{errors.internalRef.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                External Ref
              </label>
              <input
                type="text"
                placeholder="Court case number"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                {...register('externalRef')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              {...register('statusKey', { required: 'Status is required' })}
            >
              {vocab.statuses.map((s) => (
                <option key={s.key} value={s.key} disabled={s.isTerminal}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              Failed to create {vocab.matter_label.toLowerCase()}. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating…' : `Create ${vocab.matter_label}`}
            </button>
            <Link
              to="/cases"
              className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
