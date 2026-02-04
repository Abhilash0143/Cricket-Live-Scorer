import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Chip } from "../ui/Chip";
import { AppShell } from "../ui/AppShell";

export default function CssTest() {
  return (
    <AppShell
      title="CSS Test Lab"
      subtitle="If this page looks modern, Tailwind + UI kit are loading correctly."
      right={<Chip tone="green">LIVE</Chip>}
    >
      {/* BIG gradient proof */}
      <div className="rounded-[32px] p-6 border border-white/10 bg-gradient-to-r from-blue-500/30 via-emerald-500/20 to-purple-500/30 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <div className="text-3xl font-extrabold tracking-tight">
          Tailwind + CSS is Working ✅
        </div>
        <div className="text-white/60 mt-2">
          If you see this gradient card + rounded corners + blur effects, your CSS pipeline is correct.
        </div>
      </div>

      <div className="grid gap-4 mt-6 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative">
            <div className="text-lg font-bold">Inputs / Select</div>
            <div className="text-white/60 text-sm mt-1">
              These should NOT look like grey HTML boxes.
            </div>

            <div className="mt-4 grid gap-3">
              <Input placeholder="Type something..." />
              <Select defaultValue="t20">
                <option value="t20">T20</option>
                <option value="odi">ODI</option>
                <option value="test">Test</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <div className="text-lg font-bold">Buttons / Chips</div>
            <div className="text-white/60 text-sm mt-1">
              Buttons should be rounded and modern.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button>Primary Button</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip tone="blue">Powerplay</Chip>
              <Chip tone="green">Innings 1</Chip>
              <Chip tone="purple">Wicket</Chip>
              <Chip tone="neutral">Wide</Chip>
            </div>
          </div>
        </Card>
      </div>

      {/* Typography proof */}
      <Card className="mt-6">
        <div className="text-lg font-bold">Typography / Spacing</div>
        <div className="text-white/60 mt-2">
          If spacing feels clean and readable, Tailwind utilities are working.
        </div>

        <div className="mt-4 grid gap-2">
          <div className="text-4xl font-extrabold tracking-tight">
            142/3 <span className="text-white/50 text-lg">(16.4 ov)</span>
          </div>
          <div className="text-white/60 text-sm">
            CRR: <span className="text-white/90 font-semibold">8.52</span> • RR:
            <span className="text-white/90 font-semibold"> 9.10</span>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
