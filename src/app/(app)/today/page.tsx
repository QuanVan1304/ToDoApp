import { TaskList } from "@/components/task/TaskList";

export default function TodayPage() {
  return (
    <div className="w-full px-6 py-10 sm:px-10 lg:px-14">
      <h1 className="mb-8 font-serif text-3xl text-[var(--ink)]">
        Hôm nay
      </h1>

      <TaskList
        statuses={["TODO", "INPROGRESS"]}
        todayOnly
        showCreatedDate="past-only"
        splitActiveSections
      />
    </div>
  );
}