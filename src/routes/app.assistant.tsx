import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Loader2, Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/assistant")({
  component: () => {
    const [msgs, setMsgs] = useState<{role:string;content:string}[]>([
      { role: "assistant", content: "Hi! I'm your Funda assistant. Ask me anything about school admin, marks, or how to use the app." },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const send = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || loading) return;
      const userMsg = { role: "user", content: input };
      const next = [...msgs, userMsg];
      setMsgs(next); setInput(""); setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-assistant", { body: { messages: next } });
      setLoading(false);
      if (error) return setMsgs([...next, { role: "assistant", content: "Sorry, something went wrong: " + error.message }]);
      setMsgs([...next, { role: "assistant", content: data?.reply ?? "..." }]);
    };

    return (
      <div className="max-w-3xl">
        <PageHeader title="AI Assistant" sub="Powered by Lovable AI." action={<Sparkles className="size-5 text-accent"/>}/>
        <Card className="flex flex-col h-[calc(100vh-220px)]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role==="user"?"bg-accent text-accent-foreground":"bg-muted"}`}>{m.content}</div>
              </div>
            ))}
            {loading && <div className="flex"><div className="bg-muted rounded-2xl px-4 py-2.5"><Loader2 className="size-4 animate-spin"/></div></div>}
          </div>
          <form onSubmit={send} className="border-t p-3 flex gap-2">
            <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything…" disabled={loading}/>
            <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90"><Send className="size-4"/></Button>
          </form>
        </Card>
      </div>
    );
  },
});
