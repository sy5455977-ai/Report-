import React, { useState, useEffect } from 'react';
import { Loader2, Code2, Sparkles, CheckCircle2, Cpu, Wrench, Image as ImageIcon, BookOpen, PenTool, GitFork } from 'lucide-react';

interface BuilderProgressIndicatorProps {
  commandType: 'build' | 'rebuild' | 'note';
  promptText: string;
  theme: 'light' | 'dark';
  hasImageAttachment?: boolean;
}

export const BuilderProgressIndicator: React.FC<BuilderProgressIndicatorProps> = ({
  commandType,
  promptText,
  theme,
  hasImageAttachment = false
}) => {
  const [progress, setProgress] = useState(12);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const seconds = (Date.now() - startTime) / 1000;
      setElapsed(seconds);

      // Smooth realistic progress progression
      let calculatedProgress = 12;
      if (seconds < 1) {
        calculatedProgress = 12 + (seconds / 1) * 18;
      } else if (seconds < 3) {
        calculatedProgress = 30 + ((seconds - 1) / 2) * 30;
      } else if (seconds < 6) {
        calculatedProgress = 60 + ((seconds - 3) / 3) * 25;
      } else if (seconds < 12) {
        calculatedProgress = 85 + ((seconds - 6) / 6) * 10;
      } else {
        calculatedProgress = Math.min(98, 95 + ((seconds - 12) / 10) * 3);
      }

      setProgress(Math.round(calculatedProgress));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const isRebuild = commandType === 'rebuild';
  const isNote = commandType === 'note';

  const steps = isNote
    ? [
        { threshold: 25, label: "Analyzing topic & extracting high-yield exam concepts", icon: BookOpen },
        { threshold: 50, label: "Designing handwritten lined notebook & color structure", icon: PenTool },
        { threshold: 75, label: "Creating visual mind maps, flowcharts & labelled diagrams", icon: GitFork },
        { threshold: 95, label: "Compiling sticky exam tips, quick revision & PDF export", icon: Sparkles },
      ]
    : isRebuild
    ? (hasImageAttachment
        ? [
            { threshold: 25, label: "Analyzing screenshot reference & existing code", icon: ImageIcon },
            { threshold: 50, label: "Identifying visual differences & error causes", icon: Wrench },
            { threshold: 75, label: "Applying layout fix & preserving all features", icon: Cpu },
            { threshold: 95, label: "Validating responsive UI & packaging index.html", icon: Sparkles },
          ]
        : [
            { threshold: 25, label: "Reading & analyzing previous index.html code", icon: Code2 },
            { threshold: 50, label: "Preserving existing features & applying fixes", icon: Wrench },
            { threshold: 75, label: "Enhancing JavaScript logic & responsiveness", icon: Cpu },
            { threshold: 95, label: "Validating offline bundle & finalizing index.html", icon: Sparkles },
          ])
    : (hasImageAttachment
        ? [
            { threshold: 25, label: "Analyzing UI layout & colors from reference image", icon: ImageIcon },
            { threshold: 50, label: "Designing responsive HTML structure & CSS styles", icon: Sparkles },
            { threshold: 75, label: "Writing game mechanics & interactive JavaScript", icon: Cpu },
            { threshold: 95, label: "Testing offline compatibility & packaging index.html", icon: Wrench },
          ]
        : [
            { threshold: 25, label: "Analyzing requirements & architecture", icon: Code2 },
            { threshold: 50, label: "Crafting UI layout, animations & styles", icon: Sparkles },
            { threshold: 75, label: "Writing game mechanics & JavaScript logic", icon: Cpu },
            { threshold: 95, label: "Checking zero errors & packaging index.html", icon: Wrench },
          ]);

  const currentStep = steps.find(s => progress <= s.threshold) || steps[steps.length - 1];

  const isLight = theme === 'light';

  return (
    <div 
      className={`p-4 sm:p-5 rounded-2xl border shadow-xl w-full max-w-[96%] sm:max-w-[540px] animate-fade-in transition-all ${
        isLight 
          ? 'bg-white/95 border-purple-200 shadow-purple-500/5 text-gray-800' 
          : 'bg-[#161616]/95 border-purple-500/20 shadow-purple-950/20 text-gray-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5b3eff] to-[#a855f7] flex items-center justify-center shadow-md shadow-purple-500/20 text-white flex-shrink-0 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                {isNote ? 'Generating Handwritten Study Notes & PDF' : isRebuild ? 'Rebuilding & Updating Project' : 'Building Single-File Web App'}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
              }`}>
                /{commandType}
              </span>
              {hasImageAttachment && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ImageIcon className="w-2.5 h-2.5" />
                  Image Reference
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 line-clamp-1 max-w-[280px]">
              {promptText ? `"${promptText}"` : (hasImageAttachment ? 'Recreating from visual image reference...' : 'Processing requirement...')}
            </p>
          </div>
        </div>

        {/* Progress Percentage Badge */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="font-mono text-lg font-extrabold text-[#5b3eff] dark:text-[#a855f7]">
            {progress}%
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {elapsed.toFixed(1)}s elapsed
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className={`w-full h-2.5 rounded-full overflow-hidden mb-4 p-0.5 border ${
        isLight ? 'bg-gray-100 border-gray-200' : 'bg-[#0f0f0f] border-white/10'
      }`}>
        <div 
          className="h-full rounded-full bg-gradient-to-r from-[#5b3eff] via-[#8b5cf6] to-[#d946ef] transition-all duration-300 ease-out shadow-sm shadow-purple-500/50 relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer light effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Current Step Status */}
      <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 mb-3 transition-colors ${
        isLight ? 'bg-purple-50/70 border-purple-100' : 'bg-[#1a1426]/70 border-purple-500/15'
      }`}>
        <div className="text-[#5b3eff] dark:text-purple-400 flex-shrink-0 animate-bounce">
          <currentStep.icon className="w-4 h-4" />
        </div>
        <div className="text-xs font-medium text-purple-900 dark:text-purple-200 truncate flex-1">
          {currentStep.label}
        </div>
      </div>

      {/* Step checklist */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {steps.map((step, idx) => {
          const isDone = progress >= step.threshold;
          const isCurrent = !isDone && (idx === 0 || progress >= steps[idx - 1].threshold);

          return (
            <div 
              key={idx} 
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
                isDone 
                  ? isLight ? 'text-emerald-700 bg-emerald-50' : 'text-emerald-400 bg-emerald-950/30'
                  : isCurrent 
                    ? isLight ? 'text-purple-700 bg-purple-100/60 font-semibold' : 'text-purple-300 bg-purple-950/40 font-semibold'
                    : 'text-gray-400 opacity-60'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500 flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-400/40 flex-shrink-0" />
              )}
              <span className="truncate">{step.threshold}% Complete</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
