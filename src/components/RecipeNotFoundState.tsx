import { Link } from 'react-router-dom';
import { ChevronIcon } from './ChevronIcon';
import {
  cn,
  contentPanelClass,
  displayHeadingClass,
  heroTextClass,
  pageShellClass,
  pillLinkClass
} from '../helpers/uiClasses';

export function RecipeNotFoundState({
  backLinkLabel,
  backLinkTo
}: {
  backLinkLabel: string;
  backLinkTo: string;
}) {
  return (
    <div className={pageShellClass}>
      <main className="grid gap-6">
        <section className={cn(contentPanelClass, 'grid gap-4')}>
          <p className="mb-0.5 text-[0.8rem] font-bold uppercase tracking-[0.18em] text-app-muted-soft">
            Recipe not found
          </p>
          <h1
            className={cn(
              displayHeadingClass,
              'm-0 text-[clamp(1.7rem,4.1vw,3.2rem)] leading-[0.96] tracking-[-0.05em]'
            )}
          >
            That recipe does not exist yet
          </h1>
          <p className={heroTextClass}>
            It may not have been added yet, or the link may be out of date.
          </p>
          <Link
            className={cn(pillLinkClass, 'w-fit gap-2 px-[0.95rem] py-[0.65rem]')}
            to={backLinkTo}
          >
            <ChevronIcon className="size-[1rem]" />
            <span>{backLinkLabel}</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
