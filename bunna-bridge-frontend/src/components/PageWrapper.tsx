import type { ReactNode } from "react";
import AppLayout from "./AppLayout";

export default function PageWrapper({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
