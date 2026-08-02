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
    subtitle: "Let's start by understanding why you are looking.",
    options: [
      { label: "Dream Home", value: "home", icon: Home },
      { label: "High ROI Investment", value: "investment", icon: TrendingUp },
      { label: "Weekend Getaway", value: "weekend", icon: Trees },
      { label: "Commercial Setup", value: "commercial", icon: Briefcase },
    ]
  },
  {
    id: "budget",
    title: "What's your comfortable budget?",
    subtitle: "We'll find the best options in this range.",
    options: [
      { label: "Under ₹50 Lakhs", value: "0-5000000" },
      { label: "₹50L - ₹1 Crore", value: "5000000-10000000" },
      { label: "₹1 Cr - ₹3 Crores", value: "10000000-30000000" },
      { label: "Above ₹3 Crores", value: "30000000-999999999" },
    ]
  },
  {
    id: "vibe",
    title: "What's your preferred vibe?",
    subtitle: "Location & lifestyle matter.",
    options: [
      { label: "Heart of the City", value: "city", icon: Building2 },
      { label: "Quiet Suburbs", value: "suburbs", icon: Home },
      { label: "Nature & Greenery", value: "nature", icon: Trees },
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
      if (finalAnswers.goal === "weekend" && project.projectType === "venture") score += 10;
      
      // 2. Budget matching
      const [minB, maxB] = finalAnswers.budget.split("-").map(Number);
      const projMinPrice = Math.min(...project.configurations.map(c => c.priceMin));
      if (projMinPrice >= minB && projMinPrice <= maxB) {
        score += 25;
      } else if (projMinPrice < minB) {
        score += 10; // Under budget is okay, but maybe not premium enough
      }

      // 3. Vibe matching (heuristic based on location)
      const locStr = (project.location.address + project.location.locality).toLowerCase();
      if (finalAnswers.vibe === "city" && (locStr.includes("center") || locStr.includes("circle") || project.projectType === "apartment")) score += 15;
      if (finalAnswers.vibe === "suburbs" && project.projectType === "villa") score += 15;
      if (finalAnswers.vibe === "nature" && project.projectType === "venture") score += 15;

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
    <section className="py-16 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-amber-50/50 dark:bg-amber-950/10 z-0"></div>
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[40rem] h-[40rem] bg-amber-200/30 dark:bg-amber-900/10 rounded-full blur-3xl opacity-50 z-0"></div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-sm font-black mb-4 shadow-lg shadow-amber-500/30">
            <Sparkles className="w-4 h-4 text-slate-950" /> AI Property Matchmaker
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-text-primary mb-3">
            Find Your Perfect Match in 60 Seconds
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Take our quick quiz. We'll analyze your lifestyle, budget, and goals to find the properties that fit you best.
          </p>
        </div>

        <div className="bg-white dark:bg-bg-card rounded-3xl p-6 sm:p-10 shadow-xl border border-amber-primary/20 relative overflow-hidden min-h-[400px] flex flex-col justify-center">
          
          {isAnalyzing ? (
            <div className="text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="w-8 h-8 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-text-primary">Analyzing your profile...</h3>
                <p className="text-text-secondary mt-2">Scanning all projects to find your perfect match.</p>
              </div>
            </div>
          ) : results ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-text-primary">Your Top Matches</h3>
                  <p className="text-text-secondary">Based on your unique profile.</p>
                </div>
                <Button variant="outline" size="sm" onClick={resetQuiz} className="gap-2 rounded-xl">
                  <RotateCcw className="w-4 h-4" /> Retake Quiz
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {results.map(({ project, matchScore }) => (
                  <div key={project.id} className="relative">
                    {/* Match Score Badge */}
                    <div className="absolute -top-4 -right-4 z-20 bg-gradient-to-br from-green-400 to-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center flex-col shadow-lg transform rotate-12 border-4 border-white dark:border-bg-card">
                      <span className="text-xl font-black leading-none">{matchScore}%</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider">Match</span>
                    </div>
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full relative">
              {/* Progress Bar */}
              <div className="flex items-center gap-2 mb-8">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className="h-1.5 flex-1 rounded-full bg-border-default overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-500 ease-out"
                      style={{ width: i <= step ? "100%" : "0%" }}
                    ></div>
                  </div>
                ))}
              </div>

              {/* Question */}
              <div key={step} className="animate-in fade-in slide-in-from-right-8 duration-300">
                <h3 className="text-2xl sm:text-3xl font-black text-text-primary mb-2">
                  {QUESTIONS[step].title}
                </h3>
                <p className="text-text-secondary mb-8">{QUESTIONS[step].subtitle}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {QUESTIONS[step].options.map((opt) => {
                    const Icon = (opt as any).icon;
                    const isSelected = answers[QUESTIONS[step].id] === opt.value;
                    
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSelect(QUESTIONS[step].id, opt.value)}
                        className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${
                          isSelected
                            ? "border-amber-primary bg-amber-primary/5 shadow-md"
                            : "border-border-default hover:border-amber-primary/50 hover:bg-bg-primary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {Icon && (
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-primary text-slate-950' : 'bg-bg-primary text-text-secondary group-hover:bg-amber-primary/20 group-hover:text-amber-600'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                          )}
                          <span className="font-bold text-text-primary">{opt.label}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-amber-primary' : 'border-border-default'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-amber-primary rounded-full"></div>}
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
                  className="mt-8 text-sm font-bold text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
