import { apiRequest, signOut } from '../helpers/api';
import { cn, pillButtonClass, subheadingChipClass, subheadingLabelClass } from '../helpers/uiClasses';
import { useAsyncAction } from '../hooks/useAsyncAction';

export function DataSettingsSection() {
  const action = useAsyncAction();
  async function downloadBackup() {
    const response = await apiRequest('/api/backup');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipes-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="grid gap-2.5">
      <h2 className={cn(subheadingLabelClass, subheadingChipClass)}>Your data</h2>
      <div className="grid gap-4 rounded-[24px] border border-app-field-border bg-app-meal-row p-4 min-[1100px]:p-5">
        <p className="m-0 text-app-muted">Everything is saved here automatically. No cloud account connection needed.</p>
        <div className="flex flex-wrap gap-3">
          <button className={pillButtonClass} disabled={action.isPending}
            onClick={() => { void action.run(downloadBackup, 'Could not download your backup.'); }}>
            Download backup
          </button>
          <button className={pillButtonClass} disabled={action.isPending}
            onClick={() => { void action.run(signOut, 'Could not sign out. Reconnect and try again.'); }}>
            Sign out
          </button>
        </div>
        <p className="m-0 text-sm text-app-muted">Signing out removes this browser’s saved offline data.</p>
        {action.error && <p role="alert" className="m-0 text-app-danger">{action.error}</p>}
      </div>
    </section>
  );
}
