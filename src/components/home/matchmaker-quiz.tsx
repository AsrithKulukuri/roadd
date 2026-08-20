"use client";

import { useState } from "react";
import { useProjectsStore } from "@/stores/projects-store";
import { ProjectCard } from "@/components/project/project-card";
import { Sparkles, ArrowRight, Home, Building2, Trees, TrendingUp, Briefcase, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUESTIONS = [
  {
    id: "goal",
    title: "What's your main goal?",
    options: [
      { label: "Dream Home", value: "home", icon: Home },
      { label: "High ROI Investment", value: "investment", icon: TrendingUp },
      { label: "Organic Farming", value: "organic", icon: Trees },
      { label: "Smart Investment Fields", value: "commercial", icon: Briefcase },
    ]
  },
  {
    id: "budget",
    title: "What's your comfortable budget?",
    options: [
      { label: "Under ₹50 Lakhs", value: "0-5000000" },
      { label: "₹50L - ₹1 Crore", value: "5000000-10000000" },
      { label: "₹1 Cr - ₹3 Crores", value: "10000000-30000000" },
      { label: "Above ₹3 Crores", value: "30000000-999999999" },
    ]
  }
];

export function MatchmakerQuiz() {
  const { projects } = useProjectsStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{ project: any, matchScore: number }[] | null>(null);

  const handleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 300);
    } else {
      // Run analysis
      setIsAnalyzing(true);
      setTimeout(() => {
        calculateMatches({ ...answers, [questionId]: value });
      }, 1500);
    }
  };

  const calculateMatches = (finalAnswers: Record<string, string>) => {
    // Basic recommendation algorithm
    const scored = projects.map(project => {
      let score = 50; // base score
      
      // 1. Goal matching
      if (finalAnswers.goal === "investment" && project.projectType === "venture") score += 20;
      if (finalAnswers.goal === "home" && (project.projectType === "apartment" || project.projectType === "villa")) score += 20;
      if (finalAnswers.goal === "organic" && project.projectType === "venture") score += 10;
      if (finalAnswers.goal === "commercial") score += 10;
      // 2. Budget matching
      const [minB, maxB] = finalAnswers.budget.split("-").map(Number);
      const projMinPrice = Math.min(...project.configurations.map(c => c.priceMin));
      if (projMinPrice >= minB && projMinPrice <= maxB) {
        score += 25;
      } else if (projMinPrice < minB) {
        score += 10; // Under budget is okay, but maybe not premium enough
      }

      return { project, matchScore: Math.min(score, 99) };
    });

    const sorted = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 2);
    setResults(sorted);
    setIsAnalyzing(false);
  };

  const resetQuiz = () => {
    setStep(0);
    setAnswers({});
    setResults(null);
  };

  return (
    <section className="py-4 sm:py-6 relative overflow-hidden">
      {/* Subtle Neutral Backdrop */}
      <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-950/20 z-0"></div>

      <div className="max-w-xl mx-auto px-4 relative z-10">
        <div className="bg-white dark:bg-bg-card rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200/80 dark:border-slate-800 relative overflow-hidden flex flex-col justify-center">
          
          {isAnalyzing ? (
            <div className="text-center py-6 space-y-4">
              <div className="relative w-14 h-14 mx-auto">
                <div className="absolute inset-0 border-3 border-slate-200 rounded-full"></div>
                <div className="absolute inset-0 border-3 border-slate-950 dark:border-white rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="w-6 h-6 text-slate-950 dark:text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Analyzing your profile...</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Scanning curated projects to match your lifestyle.</p>
              </div>
            </div>
          ) : results ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Your Curated Matches</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Based on your preferences.</p>
                </div>
                <Button variant="outline" size="sm" onClick={resetQuiz} className="h-8 text-xs gap-1.5 rounded-full border-slate-300 dark:border-slate-700">
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map(({ project, matchScore }) => (
                  <div key={project.id} className="relative">
                    {/* Match Score Badge */}
                    <div className="absolute -top-3 -right-3 z-20 bg-slate-950 text-white w-12 h-12 rounded-full flex items-center justify-center flex-col shadow-lg border-2 border-white dark:border-slate-900">
                      <span className="text-sm font-black leading-none">{matchScore}%</span>
                      <span className="text-[7px] font-bold uppercase tracking-wider text-slate-300">Match</span>
                    </div>
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full relative">
              {/* Progress Bar (Sleek Monochromatic) */}
              <div className="flex items-center gap-2 mb-5 sm:mb-6">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-slate-950 dark:bg-white transition-all duration-500 ease-out"
                      style={{ width: i <= step ? "100%" : "0%" }}
                    ></div>
                  </div>
                ))}
              </div>

              {/* Question */}
              <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 tracking-tight">
                  {QUESTIONS[step].title}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUESTIONS[step].options.map((opt) => {
                    const Icon = (opt as any).icon;
                    const isSelected = answers[QUESTIONS[step].id] === opt.value;
                    
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSelect(QUESTIONS[step].id, opt.value)}
                        className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? "border-slate-950 bg-slate-950 text-white shadow-md"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-900 dark:hover:border-white bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {Icon && (
                            <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                          )}
                          <span className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{opt.label}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border shrink-0 ml-2 flex items-center justify-center ${isSelected ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Nav buttons (Back) */}
              {step > 0 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
