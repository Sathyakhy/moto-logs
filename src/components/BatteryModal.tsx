import * as React from "react";
import { Zap, X, Check, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BatteryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voltage: number;
  onSaveVoltage: (v: number) => void;
  batteryModel?: string;
}

export function getBatteryHealth(v: number): {
  status: "discharged" | "weak" | "healthy" | "charging";
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
} {
  if (v < 11.9) {
    return {
      status: "discharged",
      label: "Discharged / Needs Charge",
      color: "bg-red-500",
      textColor: "text-red-400",
      borderColor: "border-red-500/40",
    };
  }
  if (v <= 12.3) {
    return {
      status: "weak",
      label: "Weak / Check Charging",
      color: "bg-orange-500",
      textColor: "text-orange-400",
      borderColor: "border-orange-500/40",
    };
  }
  if (v <= 13.0) {
    return {
      status: "healthy",
      label: "Healthy / Optimal",
      color: "bg-emerald-500",
      textColor: "text-emerald-400",
      borderColor: "border-emerald-500/40",
    };
  }
  return {
    status: "charging",
    label: "Charging / Alternator Active",
    color: "bg-cyan-500",
    textColor: "text-cyan-400",
    borderColor: "border-cyan-500/40",
  };
}

export function BatteryModal({
  open,
  onOpenChange,
  voltage,
  onSaveVoltage,
  batteryModel = "12V 7Ah AGM (Yuasa / GS)",
}: BatteryModalProps) {
  const [val, setVal] = React.useState<number>(voltage);
  const [model, setModel] = React.useState<string>(batteryModel);

  React.useEffect(() => {
    setVal(voltage);
  }, [voltage]);

  if (!open) return null;

  const health = getBatteryHealth(val);

  const handleSave = () => {
    onSaveVoltage(Number(val.toFixed(2)));
    toast.success(`Battery voltage recorded: ${val.toFixed(2)}V (${health.label})`);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Zap className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Battery Diagnostics HUD</h3>
              <p className="text-[11px] text-slate-400">Lead-Acid / AGM 12V Cell</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Visual Battery SVG Graphic with Terminals */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="relative flex flex-col items-center">
            {/* Terminal Posts */}
            <div className="flex w-36 justify-between px-3">
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-5 rounded-t-sm bg-red-600 border border-red-400 shadow-xs flex items-center justify-center text-[7px] font-black text-white">
                  +
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-5 rounded-t-sm bg-slate-700 border border-slate-500 shadow-xs flex items-center justify-center text-[7px] font-black text-white">
                  −
                </div>
              </div>
            </div>

            {/* Battery Body Box */}
            <div className={`relative h-28 w-44 rounded-xl border-2 ${health.borderColor} bg-slate-950 p-3 shadow-lg flex flex-col justify-between overflow-hidden`}>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>12V LEAD-ACID</span>
                <span className="font-bold text-slate-300">{model.slice(0, 10)}</span>
              </div>

              {/* Glowing Voltage Display */}
              <div className="flex items-baseline justify-center gap-1">
                <span className={`font-mono text-3xl font-black tracking-tight ${health.textColor} glow-lcd`}>
                  {val.toFixed(1)}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">V</span>
              </div>

              {/* Fill Gauge */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${health.color} transition-all duration-300`}
                  style={{ width: `${Math.min(100, Math.max(5, ((val - 10) / 4.5) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Diagnostic Status Pill */}
          <div className="mt-3 flex items-center gap-1.5 text-xs font-mono font-semibold">
            {health.status === "healthy" || health.status === "charging" ? (
              <ShieldCheck className={`size-4 ${health.textColor}`} />
            ) : (
              <AlertTriangle className={`size-4 ${health.textColor}`} />
            )}
            <span className={health.textColor}>{health.label}</span>
          </div>
        </div>

        {/* Interactive Slider Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Calibrate / Test Voltage</span>
            <span className="font-mono font-bold text-amber-400">{val.toFixed(2)} V</span>
          </div>
          <input
            type="range"
            min="10.0"
            max="14.5"
            step="0.1"
            value={val}
            onChange={(e) => setVal(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>10.0V (Flat)</span>
            <span>12.6V (Optimal)</span>
            <span>14.5V (Charging)</span>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] text-slate-400">Battery Model / Spec</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 text-xs font-mono bg-slate-950 border-slate-800"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 border-slate-800 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-9 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
            onClick={handleSave}
          >
            <Check className="size-3.5" />
            <span>Save Reading</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
