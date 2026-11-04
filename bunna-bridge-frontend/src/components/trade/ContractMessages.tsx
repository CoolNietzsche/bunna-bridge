import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import Thread from "./Thread";
import { Muted } from "../trace/ui";
import { getConversations, startConversation } from "../../api/trade";
import type { Contract } from "../../api/trade";
import { AC } from "../../styles/adminComponents";

/** The buyer ↔ exporter conversation for this contract's lot. */
export default function ContractMessages({ contract: c }: { contract: Contract }) {
  const { data: convId } = useQuery({
    queryKey: ["contract-conversation", c.id],
    queryFn: async () => {
      if (c.my_party === "buyer") return (await startConversation(c.lot)).id;
      const list = await getConversations({ lot: c.lot });
      return list.results.find((x) => x.buyer_name === c.buyer_name)?.id ?? null;
    },
  });
  return (
    <div>
      <p style={{ ...AC.cardTitle, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><MessageSquare size={15} /> Messages</p>
      {convId ? <Thread id={convId} compact /> : <div style={{ ...AC.card, ...AC.cardPad }}><Muted>No messages from the buyer yet.</Muted></div>}
    </div>
  );
}
