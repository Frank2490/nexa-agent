"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabase";

interface Task {
  id: string;
  content: string;
  done: boolean;
  done_at: string | null;
  position: number;
  created_at: string;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true });
    setTasks(data ?? []);
    setLoading(false);
  }

  async function cleanupDoneTasks() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await supabase
      .from("tasks")
      .delete()
      .eq("done", true)
      .lt("done_at", cutoff.toISOString());
  }

  async function addTask() {
    const content = input.trim();
    if (!content) return;

    const maxPosition = tasks
      .filter((t) => !t.done)
      .reduce((acc, t) => Math.max(acc, t.position), -1);
    const position = maxPosition + 1;

    const tempTask: Task = {
      id: crypto.randomUUID(),
      content,
      done: false,
      done_at: null,
      position,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, tempTask]);
    setInput("");

    const { data } = await supabase
      .from("tasks")
      .insert({ content, done: false, done_at: null, position })
      .select()
      .single();

    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === tempTask.id ? data : t)));
    }
  }

  async function toggleDone(task: Task) {
    const done = !task.done;
    const done_at = done ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done, done_at } : t))
    );

    await supabase.from("tasks").update({ done, done_at }).eq("id", task.id);
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));

    await supabase.from("tasks").delete().eq("id", id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTasks = tasks
      .filter((t) => !t.done)
      .sort((a, b) => a.position - b.position);

    const oldIndex = activeTasks.findIndex((t) => t.id === active.id);
    const newIndex = activeTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activeTasks, oldIndex, newIndex);

    setTasks((prev) => {
      const done = prev.filter((t) => t.done);
      return [...reordered.map((t, i) => ({ ...t, position: i })), ...done];
    });

    await Promise.all(
      reordered.map((task, i) =>
        supabase.from("tasks").update({ position: i }).eq("id", task.id)
      )
    );
  }

  useEffect(() => {
    cleanupDoneTasks().then(fetchTasks);

    const channel = supabase
      .channel("tasks-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.position - b.position);

  const doneTasks = tasks
    .filter((t) => t.done)
    .sort((a, b) => {
      if (!a.done_at) return 1;
      if (!b.done_at) return -1;
      return new Date(b.done_at).getTime() - new Date(a.done_at).getTime();
    });

  const activeCount = activeTasks.length;
  const px = isMobile ? 12 : 8;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
        <span
          style={{
            color: "#111111",
            fontSize: 13,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          zadania
        </span>
        <span
          style={{
            background: "#FFBA49",
            color: "#111111",
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 9999,
            padding: "2px 8px",
          }}
        >
          {activeCount}
        </span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto flex flex-col py-2 thin-scrollbar">
        {loading ? (
          <div className="flex flex-col gap-1" style={{ padding: `0 ${px}px` }}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md"
                style={{ background: "#F7F7F7", height: 44, marginBottom: 4 }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Active tasks */}
            {isMobile ? (
              <div
                className="flex flex-col gap-1"
                style={{ padding: `0 ${px}px` }}
              >
                {activeTasks.map((task) => (
                  <StaticTaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleDone(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className="flex flex-col gap-1"
                    style={{ padding: `0 ${px}px` }}
                  >
                    {activeTasks.map((task) => (
                      <SortableTaskRow
                        key={task.id}
                        task={task}
                        onToggle={() => toggleDone(task)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Done section */}
            {doneTasks.length > 0 && (
              <>
                <div
                  style={{
                    borderTop: "1px solid #E5E5E5",
                    marginTop: 8,
                    padding: "8px 16px",
                    color: "#888888",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  ukonczone
                </div>
                <div
                  className="flex flex-col gap-1"
                  style={{ padding: `0 ${px}px` }}
                >
                  {doneTasks.map((task) => (
                    <StaticTaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleDone(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Add task */}
      <div style={{ borderTop: "1px solid #E5E5E5" }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="dodaj zadanie..."
          className="mobile-input placeholder:text-[#888888]"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "12px 16px",
            fontSize: 14,
            color: "#111111",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

function SortableTaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow
        task={task}
        onToggle={onToggle}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function StaticTaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return <TaskRow task={task} onToggle={onToggle} onDelete={onDelete} />;
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  dragHandleProps,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{
        background: hovered ? "#F7F7F7" : "transparent",
        transition: "background 200ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle */}
      {dragHandleProps ? (
        <button
          {...dragHandleProps}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "grab",
            color: hovered ? "#BBBBBB" : "transparent",
            lineHeight: 1,
            transition: "color 200ms ease",
            touchAction: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <DragHandle />
        </button>
      ) : (
        <span style={{ width: 10, minWidth: 10 }} />
      )}

      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 18,
          height: 18,
          minWidth: 18,
          borderRadius: "50%",
          border: `2px solid ${task.done ? "#20A39E" : "#E5E5E5"}`,
          background: task.done ? "#20A39E" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 200ms ease",
          padding: 0,
        }}
      >
        {task.done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <span
        style={{
          fontSize: 14,
          color: task.done ? "#888888" : "#111111",
          textDecoration: task.done ? "line-through" : "none",
          flex: 1,
          transition: "all 200ms ease",
        }}
      >
        {task.content}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          marginLeft: "auto",
          fontSize: 16,
          color: "#888888",
          opacity: hovered ? 1 : 0,
          transition: "opacity 200ms ease",
          background: "none",
          border: "none",
          cursor: "pointer",
          lineHeight: 1,
          padding: "0 2px",
        }}
      >
        &times;
      </button>
    </div>
  );
}

function DragHandle() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3" cy="2.5" r="1.5" />
      <circle cx="7" cy="2.5" r="1.5" />
      <circle cx="3" cy="7" r="1.5" />
      <circle cx="7" cy="7" r="1.5" />
      <circle cx="3" cy="11.5" r="1.5" />
      <circle cx="7" cy="11.5" r="1.5" />
    </svg>
  );
}
