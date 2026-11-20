import { TaskList } from "@/components/task/TaskList";

export default function HistoryPage() {
  return (
    <div className="w-full px-6 py-10 sm:px-10 lg:px-14">
      <h1 className="mb-2 font-serif text-3xl text-[var(--ink)]">
        Lịch sử công việc
      </h1>

      <p className="mb-8 text-sm text-[var(--ink-muted)]">
        Những việc bạn đã hoàn thành.
      </p>

      <TaskList status="DONE" showCreatedDate />
    </div>
  );
}