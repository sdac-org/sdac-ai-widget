import React from "react";
import { DashboardLayout } from "@/components/sdac/DashboardLayout";
import { CostReport } from "@/components/sdac/CostReport";
import { AssistantWidget } from "@/components/ai/AssistantWidget";

export default function Home() {
  return (
    <DashboardLayout>
      <CostReport />
      <AssistantWidget />
    </DashboardLayout>
  );
}
