import type { RecipeConsistencyCheck, RecipeConsistencyIssue } from '../helpers/recipeConsistencyValidation';
import { cn, pillButtonClass } from '../helpers/uiClasses';

type RecipeConsistencyFeedbackProps = {
  check: RecipeConsistencyCheck;
  isDisabled: boolean;
  onEdit: (issue: RecipeConsistencyIssue) => void;
  onReplace: (issue: RecipeConsistencyIssue) => void;
};

function getLocationLabel(issue: RecipeConsistencyIssue): string {
  if (issue.field === 'ingredients') {
    return `Ingredient line ${issue.lineIndex + 1}`;
  }
  return `${issue.field === 'prep' ? 'Prep' : 'Cook'} step ${issue.lineIndex + 1}`;
}

export function RecipeConsistencyFeedback({
  check,
  isDisabled,
  onEdit,
  onReplace
}: RecipeConsistencyFeedbackProps) {
  const buttonClass = cn(pillButtonClass, 'px-3 py-1.5 text-[0.78rem]');
  const itemLabel = check.issues.length === 1 ? 'item' : 'items';

  return (
    <div className="grid gap-3">
      <p className="m-0 text-[0.88rem] text-app-muted" role="status">
        {check.issues.length
          ? `Found ${check.issues.length} consistency ${itemLabel} to review.`
          : 'No likely consistency issues found.'}
      </p>
      {check.issues.length > 0 ? (
        <p className="m-0 text-[0.82rem] text-app-muted">
          Checks established ingredient names and likely ingredient typos using your other recipes.
          {' '}Review these suggestions, or save anyway. Corrections only change this draft.
        </p>
      ) : null}
      <ul className="m-0 grid list-none gap-3 p-0">
        {check.issues.map((issue) => (
          <li
            key={`${issue.field}-${issue.lineIndex}-${issue.start}-${issue.code}`}
            className="grid gap-2 rounded-[14px] border border-app-line-strong bg-app-field p-3"
          >
            <strong className="text-[0.88rem]">
              {getLocationLabel(issue)}: “{issue.excerpt}”
            </strong>
            <p className="m-0 text-[0.84rem] text-app-muted">{issue.message}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass} disabled={isDisabled} onClick={() => onEdit(issue)}>
                {issue.field === 'ingredients' ? 'Edit ingredient' : 'Edit step'}
              </button>
              {issue.replacement ? (
                <button type="button" className={buttonClass} disabled={isDisabled} onClick={() => onReplace(issue)}>
                  Use “{issue.replacement}”
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
