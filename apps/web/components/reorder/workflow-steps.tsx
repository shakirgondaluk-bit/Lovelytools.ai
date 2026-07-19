import { cn } from '@lovelytools/ui';

export type WorkflowStage = 'input' | 'process' | 'output';

const STEPS: Array<{ id: WorkflowStage; kicker: string; title: string; sub: string }> = [
  { id: 'input', kicker: 'Input', title: 'Drop your PDF', sub: 'Stays on your device' },
  { id: 'process', kicker: 'Process', title: 'Rearrange pages', sub: 'Drag into any order' },
  { id: 'output', kicker: 'Output', title: 'Export the result', sub: 'Download the new PDF' },
];

const ORDER: WorkflowStage[] = ['input', 'process', 'output'];

/**
 * WorkflowSteps — the INPUT → PROCESS → OUTPUT strip.
 *
 * Purely presentational: the runner owns the live stage and hands it down, so the
 * strip lights up as the user moves through drop → rearrange → export. The category
 * hue (PDF red) marks the active step; done steps carry a ✓, upcoming ones stay
 * muted — the DS's "no icon set" rule keeps this to Unicode glyphs and hue dots.
 */
export function WorkflowSteps({ active, hue }: { active: WorkflowStage; hue: string }) {
  const activeIndex = ORDER.indexOf(active);

  return (
    <ol className="grid grid-cols-1 gap-grid sm:grid-cols-3">
      {STEPS.map((step, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'todo';
        return (
          <li
            key={step.id}
            className={cn(
              'relative flex items-start gap-3 rounded-xl border bg-surface p-card transition-colors duration-hover',
              state === 'active' ? 'border-[var(--step-hue)]' : 'border-line',
            )}
            style={{ '--step-hue': hue } as React.CSSProperties}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-md font-grotesk text-[13px] font-bold',
                state === 'todo' && 'bg-surface2 text-fg3',
              )}
              style={
                state === 'todo'
                  ? undefined
                  : {
                      background: `color-mix(in srgb, ${hue} ${state === 'active' ? '18%' : '14%'}, transparent)`,
                      color: hue,
                    }
              }
              aria-hidden="true"
            >
              {state === 'done' ? '✓' : i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span
                className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: state === 'todo' ? 'var(--text3)' : hue }}
              >
                {step.kicker}
              </span>
              <span className="font-grotesk text-[15px] font-semibold text-fg">{step.title}</span>
              <span className="text-[12.5px] text-fg3">{step.sub}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
