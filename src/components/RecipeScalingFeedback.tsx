import { cn, pillButtonClass } from '../helpers/uiClasses';
import type { RecipeScalingCheck, RecipeScalingIssue } from '../helpers/recipeScalingValidation';

type RecipeScalingFeedbackProps = {
  check: RecipeScalingCheck;
  isDisabled: boolean;
  onEdit: (issue: RecipeScalingIssue) => void;
  onReplace: (issue: RecipeScalingIssue, replacement: string) => void;
};

function getIssueLabel(issue: RecipeScalingIssue): string {
  if (issue.severity === 'error') {
    return 'Broken link';
  }
  return issue.code === 'amount-mismatch' ? 'Amount mismatch' : 'Possible issue';
}

export function RecipeScalingFeedback({
  check,
  isDisabled,
  onEdit,
  onReplace
}: RecipeScalingFeedbackProps) {
  const buttonClass = cn(pillButtonClass, 'px-3 py-1.5 text-[0.78rem]');
  const itemLabel = check.issues.length === 1 ? 'item' : 'items';
  const summary = check.issues.length
    ? `Found ${check.issues.length} ${itemLabel} to review.`
    : 'No likely scaling issues found.';

  return (
    <div className="grid gap-3">
      <p className="m-0 text-[0.88rem] text-app-muted" role="status">
        {summary}
      </p>
      {check.issues.length > 0 ? (
        <p className="m-0 text-[0.82rem] text-app-muted">
          Review these suggestions, or save anyway. Changes are only saved when you save the recipe.
        </p>
      ) : null}
      <ul className="m-0 grid list-none gap-3 p-0">
        {check.issues.map((issue) => (
          <li
            key={`${issue.sectionId}-${issue.stepIndex}-${issue.start}-${issue.code}`}
            className="grid gap-2 rounded-[14px] border border-app-line-strong bg-app-field p-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="text-[0.88rem]">
                {issue.sectionTitle} step {issue.stepIndex + 1}: “{issue.excerpt}”
              </strong>
              <span className="text-[0.74rem] font-semibold text-app-muted-soft">
                {getIssueLabel(issue)}
              </span>
            </div>
            <p className="m-0 text-[0.84rem] text-app-muted">{issue.message}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass} disabled={isDisabled} onClick={() => onEdit(issue)}>
                Edit step
              </button>
              {issue.scalableText ? (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={isDisabled}
                  onClick={() => {
                    if (issue.scalableText) {
                      onReplace(issue, issue.scalableText);
                    }
                  }}
                >
                  Scale count
                </button>
              ) : null}
              {issue.code === 'unchanged-quantity' ? (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={isDisabled}
                  onClick={() => onReplace(issue, `{{fixed|${issue.excerpt}}}`)}
                >
                  Keep fixed
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
