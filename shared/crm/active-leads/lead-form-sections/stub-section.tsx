"use client";

type StubSectionProps = {
  title: string;
  badge?: string;
  message: string;
};

export function StubSection({
  title,
  badge = "Phase 2",
  message,
}: StubSectionProps) {
  return (
    <div className="box custom-box !mb-4">
      <div className="box-header border-b border-defaultborder dark:border-defaultborder/10 flex items-center justify-between gap-2">
        <h6 className="box-title mb-0 before:!hidden">{title}</h6>
        <span className="badge bg-secondary/10 text-secondary text-[0.7rem]">
          {badge}
        </span>
      </div>
      <div className="box-body lead-form-stub-body">
        <div className="text-center py-6 px-4">
          <span className="avatar avatar-lg bg-primary/10 text-primary mb-3 inline-flex justify-center items-center">
            <i className="ri-time-line text-2xl"></i>
          </span>
          <p className="text-textmuted dark:text-textmuted/90 mb-0 text-[0.8125rem] max-w-md mx-auto">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
