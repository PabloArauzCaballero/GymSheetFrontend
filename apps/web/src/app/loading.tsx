import { LoadingPanel } from '@/shared/components/feedback/loading-panel';

export default function RootLoading() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-7xl place-items-center px-5 py-12">
      <div className="w-full max-w-3xl" aria-live="polite" aria-busy="true">
        <LoadingPanel rows={6} />
      </div>
    </main>
  );
}
