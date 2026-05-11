"use client";

import { useState } from "react";
import TaskList from "@/components/TaskList";
import ChatWindow from "@/components/ChatWindow";

type Tab = "tasks" | "nexa";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("nexa");

  return (
    <main className="h-screen bg-white overflow-hidden">
      {/* Desktop layout */}
      <div className="hidden md:flex h-full">
        <div
          className="h-full overflow-hidden"
          style={{ width: "25%", borderRight: "1px solid #E5E5E5" }}
        >
          <TaskList />
        </div>
        <div className="h-full overflow-hidden" style={{ width: "75%" }}>
          <ChatWindow />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-col">
        {/* Content area — height minus fixed bottom nav */}
        <div
          className="overflow-hidden"
          style={{ height: "calc(100dvh - 56px)" }}
        >
          {activeTab === "tasks" ? <TaskList /> : <ChatWindow />}
        </div>

        {/* Fixed bottom nav */}
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 56,
            borderTop: "1px solid #E5E5E5",
            background: "#FFFFFF",
            display: "flex",
          }}
        >
          {(["tasks", "nexa"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 500,
                color: activeTab === tab ? "#20A39E" : "#888888",
                background: "none",
                border: "none",
                borderTop:
                  activeTab === tab
                    ? "2px solid #20A39E"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
            >
              {tab === "tasks" ? "Zadania" : "Nexa"}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
