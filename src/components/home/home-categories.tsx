"use client";
import { useSiteFeatures } from "@/components/providers/site-features-provider";

import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { MixedCarouselRow, type MixedItem } from "./mixed-carousel-row";
import { useEffect } from "react";
import { useState } from "react";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { HOME_SECTION_ICONS } from "@/lib/home-section-icons";
import type { LucideIcon } from "lucide-react";
import type { HomeCardStyleId, HomeCardSize, HomeSection } from "@/types/home-section";
import type {
  BorderConfig,
  ImageArrangementConfig,
  CardElementId,
  ElementConfig,
  CarouselLoopMode,
  CarouselTransitionSpeed,
  CarouselArrowPosition,
} from "@/types/shelf-builder";
import { evaluateShelfFilters } from "@/lib/shelf-builder-defaults";

type RenderSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  cardStyle?: HomeCardStyleId;
  cardSizeDesktop?: HomeCardSize;
  cardSizeMobile?: HomeCardSize;
  cardBgColor?: string;
  cardTextColor?: string;
  cardAccentColor?: string;
  shelfBorder?: BorderConfig;
  cardBorder?: BorderConfig;
  imageArrangement?: ImageArrangementConfig;
  elementOrder?: CardElementId[];
  elements?: Partial<Record<CardElementId, ElementConfig>>;
  sectionBgColor?: string;
  sectionBgImage?: string;
  sectionPaddingTop?: number;
  sectionPaddingBottom?: number;
  headingAlignment?: "left" | "center" | "right";
  headingSize?: "text-xl" | "text-2xl" | "text-3xl" | "text-4xl";
  headingColor?: string;
  subtitle?: string;
  subtitleColor?: string;
  customBadge?: string;
  customHeadline?: string;
  customTagline?: string;
  customPrice?: string;
  customLocation?: string;
  customBhk?: string;
  customArea?: string;
  customDeveloper?: string;
  customStatus?: string;
  customCtaText?: string;
  enableCarousel?: boolean;
  carouselInterval?: number;
  layoutType?: "carousel" | "grid" | "featured-split";
  carouselLoopMode?: CarouselLoopMode;
  carouselSpeed?: CarouselTransitionSpeed;
  carouselPauseOnHover?: boolean;
  carouselShowArrows?: boolean;
  carouselArrowPosition?: CarouselArrowPosition;
  carouselShowDots?: boolean;
  gridColumnsDesktop?: number;
  gridColumnsTablet?: number;
  gridColumnsMobile?: number;
  mobileCarouselCustom?: boolean;
  mobileLayoutType?: "carousel" | "grid" | "featured-split";
  mobileEnableCarousel?: boolean;
  mobileCarouselLoopMode?: CarouselLoopMode;
  mobileCarouselInterval?: number;
  mobileCarouselSpeed?: CarouselTransitionSpeed;
  mobileCarouselPauseOnHover?: boolean;
  mobileCarouselShowArrows?: boolean;
  mobileCarouselArrowPosition?: CarouselArrowPosition;
  mobileCarouselShowDots?: boolean;
  items: MixedItem[];
};

export function HomeCategories() {
  const { propertiesEnabled } = useSiteFeatures();
  const { properties, fetchProperties, isLoading: isPropsLoading, error: propsError } = usePropertiesStore();
  const { projects, fetchProjects, isLoading: isProjsLoading, error: projsError } = useProjectsStore();
  const mounted = useIsMounted();
  const [customSections, setCustomSections] = useState<HomeSection[] | null>(null);
  const [hasCustomLayout, setHasCustomLayout] = useState(false);

  useEffect(() => {
    if (propertiesEnabled) fetchProperties();
    fetchProjects();
  }, [fetchProperties, fetchProjects, propertiesEnabled]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/home-sections", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.configured && Array.isArray(data.sections)) {
          setCustomSections(data.sections);
          setHasCustomLayout(true);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const isInitialLoading = !mounted || (propertiesEnabled ? ((isPropsLoading && properties.length === 0) && (isProjsLoading && projects.length === 0)) : (isProjsLoading && projects.length === 0));
  const isCompleteFailure = propertiesEnabled ? propsError && projsError && properties.length === 0 && projects.length === 0 : projsError && projects.length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={`skel-cat-${i}`} className="h-[280px] rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-4 animate-pulse">
              <div className="w-full h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isCompleteFailure) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <p className="text-sm text-slate-500">Could not load property categories.</p>
          <button
            type="button"
            onClick={() => {
              if (propertiesEnabled) fetchProperties();
              fetchProjects();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // Filter properties and normalize displayCategory for legacy cached data
  const normalizedProperties = properties.map((p) => {
    if (!p.displayCategory) {
      if (p.isFeatured) return { ...p, displayCategory: 'featured' as const };
      if (p.isRecommended) return { ...p, displayCategory: 'recommended' as const };
      return { ...p, displayCategory: 'none' as const };
    }
    return p;
  });

  const activeProperties = normalizedProperties.filter((p) => propertiesEnabled && p.status !== 'sold' && p.status !== 'hidden');

  const recommendedProps = activeProperties.filter((p) => p.displayCategory === 'recommended');
  const featuredProps = activeProperties.filter((p) => p.displayCategory === 'featured');
  const budgetProps = activeProperties.filter((p) => p.displayCategory === 'budget_friendly');

  const normalizedProjects = projects.map((p) => {
    if (!p.displayCategory) {
      return { ...p, displayCategory: (p.isFeatured ? 'featured' : 'none') as "none" | "featured" | "recommended" | "budget_friendly" };
    }
    return p;
  });

  const activeProjects = normalizedProjects.filter((p) => p.isPublished && !p.isSoldOut);

  const recommendedProjs = activeProjects.filter((p) => p.displayCategory === 'recommended');
  const featuredProjs = activeProjects.filter((p) => p.displayCategory === 'featured');
  const budgetProjs = activeProjects.filter((p) => p.displayCategory === 'budget_friendly');

  const recommendedMixed: MixedItem[] = [
    ...recommendedProps.map(p => ({ ...p, itemType: 'property' as const })),
    ...recommendedProjs.map(p => ({ ...p, itemType: 'project' as const }))
  ];

  const featuredMixed: MixedItem[] = [
    ...featuredProps.map(p => ({ ...p, itemType: 'property' as const })),
    ...featuredProjs.map(p => ({ ...p, itemType: 'project' as const }))
  ];

  const budgetMixed: MixedItem[] = [
    ...budgetProps.map(p => ({ ...p, itemType: 'property' as const })),
    ...budgetProjs.map(p => ({ ...p, itemType: 'project' as const }))
  ];

  const propertyMap = new Map(activeProperties.map((property) => [property.id, property]));
  const projectMap = new Map(activeProjects.map((project) => [project.id, project]));

  const sectionsToRender: RenderSection[] = hasCustomLayout
    ? (customSections ?? []).filter((section) => section.isActive).map((section) => {
        const manualItems = (section.items ?? []).flatMap((item): MixedItem[] => {
          if (item.type === "property") {
            const property = propertyMap.get(item.id);
            return property
              ? [{
                  ...property,
                  itemType: "property" as const,
                  progressPercentage: item.progressPercentage,
                  customBadge: item.customBadge,
                  customHeadline: item.customHeadline,
                  customTagline: item.customTagline,
                  customPrice: item.customPrice,
                  customLocation: item.customLocation,
                  customBhk: item.customBhk,
                  customArea: item.customArea,
                  customDeveloper: item.customDeveloper,
                  customStatus: item.customStatus,
                  customCtaText: item.customCtaText,
                  cardBgColor: item.cardBgColor,
                  cardTextColor: item.cardTextColor,
                  cardAccentColor: item.cardAccentColor,
                  cardBorder: item.cardBorder,
                }]
              : [];
          }
          const project = projectMap.get(item.id);
          return project
            ? [{
                ...project,
                itemType: "project" as const,
                progressPercentage: item.progressPercentage,
                customBadge: item.customBadge,
                customHeadline: item.customHeadline,
                customTagline: item.customTagline,
                customPrice: item.customPrice,
                customLocation: item.customLocation,
                customBhk: item.customBhk,
                customArea: item.customArea,
                customDeveloper: item.customDeveloper,
                customStatus: item.customStatus,
                customCtaText: item.customCtaText,
                cardBgColor: item.cardBgColor,
                cardTextColor: item.cardTextColor,
                cardAccentColor: item.cardAccentColor,
                cardBorder: item.cardBorder,
              }]
            : [];
        });

        // Content sourcing: Handle automatic and hybrid matching
        let finalItems = manualItems;
        if (section.contentSource === "automatic" || (section.contentSource === "hybrid" && section.autoFilters)) {
          const autoMatches = evaluateShelfFilters(section, activeProperties, activeProjects);
          if (section.contentSource === "automatic") {
            finalItems = autoMatches.length > 0 ? autoMatches : manualItems;
          } else if (section.contentSource === "hybrid") {
            const manualIds = new Set(manualItems.map((m) => m.id));
            const remaining = autoMatches.filter((m) => !manualIds.has(m.id));
            finalItems = [...manualItems, ...remaining].slice(0, section.maxItems || 10);
          }
        }

        return {
          id: section.id,
          title: section.title,
          icon: HOME_SECTION_ICONS[section.icon] || HOME_SECTION_ICONS.ThumbsUp,
          cardStyle: section.cardStyle,
          cardSizeDesktop: section.cardSizeDesktop,
          cardSizeMobile: section.cardSizeMobile,
          cardBgColor: section.cardBgColor,
          cardTextColor: section.cardTextColor,
          cardAccentColor: section.cardAccentColor,
          shelfBorder: section.shelfBorder,
          cardBorder: section.cardBorder,
          imageArrangement: section.imageArrangement,
          elementOrder: section.elementOrder as CardElementId[] | undefined,
          elements: section.elements,
          sectionBgColor: section.sectionBgColor,
          sectionBgImage: section.sectionBgImage,
          sectionPaddingTop: section.sectionPaddingTop,
          sectionPaddingBottom: section.sectionPaddingBottom,
          headingAlignment: section.headingAlignment,
          headingSize: section.headingSize,
          headingColor: section.headingColor,
          subtitle: section.subtitle,
          subtitleColor: section.subtitleColor,
          customBadge: section.customBadge,
          customHeadline: section.customHeadline,
          customTagline: section.customTagline,
          customPrice: section.customPrice,
          customLocation: section.customLocation,
          customBhk: section.customBhk,
          customArea: section.customArea,
          customDeveloper: section.customDeveloper,
          customStatus: section.customStatus,
          customCtaText: section.customCtaText,
          enableCarousel: section.enableCarousel !== false,
          carouselInterval: section.carouselInterval || 4,
          layoutType: section.layoutType,
          carouselLoopMode: section.carouselLoopMode,
          carouselSpeed: section.carouselSpeed,
          carouselPauseOnHover: section.carouselPauseOnHover,
          carouselShowArrows: section.carouselShowArrows,
          carouselArrowPosition: section.carouselArrowPosition,
          carouselShowDots: section.carouselShowDots,
          gridColumnsDesktop: section.gridColumnsDesktop,
          gridColumnsTablet: section.gridColumnsTablet,
          gridColumnsMobile: section.gridColumnsMobile,
          mobileCarouselCustom: section.mobileCarouselCustom,
          mobileLayoutType: section.mobileLayoutType,
          mobileEnableCarousel: section.mobileEnableCarousel,
          mobileCarouselLoopMode: section.mobileCarouselLoopMode,
          mobileCarouselInterval: section.mobileCarouselInterval,
          mobileCarouselSpeed: section.mobileCarouselSpeed,
          mobileCarouselPauseOnHover: section.mobileCarouselPauseOnHover,
          mobileCarouselShowArrows: section.mobileCarouselShowArrows,
          mobileCarouselArrowPosition: section.mobileCarouselArrowPosition,
          mobileCarouselShowDots: section.mobileCarouselShowDots,
          items: finalItems,
        };
      })
    : [
        { id: "recommended", title: "Recommended", icon: HOME_SECTION_ICONS.ThumbsUp, cardStyle: "classic-default" as const, cardSizeDesktop: "medium" as const, cardSizeMobile: "medium" as const, cardBgColor: "#ffffff", cardTextColor: "#0f172a", cardAccentColor: "#faad13", enableCarousel: true, carouselInterval: 4, items: recommendedMixed },
        { id: "featured", title: "Featured", icon: HOME_SECTION_ICONS.Star, cardStyle: "tall-portrait" as const, cardSizeDesktop: "medium" as const, cardSizeMobile: "medium" as const, cardBgColor: "#ffffff", cardTextColor: "#0f172a", cardAccentColor: "#faad13", enableCarousel: true, carouselInterval: 4, items: featuredMixed },
        { id: "budget-friendly", title: "Budget Friendly", icon: HOME_SECTION_ICONS.IndianRupee, cardStyle: "bottom-floating" as const, cardSizeDesktop: "medium" as const, cardSizeMobile: "medium" as const, cardBgColor: "#ffffff", cardTextColor: "#0f172a", cardAccentColor: "#faad13", enableCarousel: true, carouselInterval: 4, items: budgetMixed },
      ];

  return (
    <section className="pt-0 sm:pt-1 pb-4 sm:pb-8 w-full">
      <div className="container-road space-y-3 sm:space-y-6">
        
        {sectionsToRender.map((section) => section.items.length > 0 && (
          <MixedCarouselRow
            key={section.id}
            title={section.title}
            icon={section.icon}
            items={section.items}
            hideHeader={false}
            autoSlide={section.enableCarousel !== false && section.carouselLoopMode !== "static"}
            enableCarousel={section.enableCarousel !== false && section.layoutType !== "grid"}
            carouselInterval={section.carouselInterval || 4}
            layoutType={section.layoutType || (section.enableCarousel === false ? "grid" : "carousel")}
            carouselLoopMode={section.carouselLoopMode || (section.enableCarousel === false ? "static" : "infinite")}
            carouselSpeed={section.carouselSpeed || "normal"}
            carouselPauseOnHover={section.carouselPauseOnHover !== false}
            carouselShowArrows={section.carouselShowArrows !== false}
            carouselArrowPosition={section.carouselArrowPosition || "header"}
            carouselShowDots={Boolean(section.carouselShowDots)}
            gridColumnsDesktop={section.gridColumnsDesktop || 4}
            gridColumnsTablet={section.gridColumnsTablet || 2}
            gridColumnsMobile={section.gridColumnsMobile || 1}
            mobileCarouselCustom={section.mobileCarouselCustom}
            mobileLayoutType={section.mobileLayoutType}
            mobileEnableCarousel={section.mobileEnableCarousel}
            mobileCarouselLoopMode={section.mobileCarouselLoopMode}
            mobileCarouselInterval={section.mobileCarouselInterval}
            mobileCarouselSpeed={section.mobileCarouselSpeed}
            mobileCarouselPauseOnHover={section.mobileCarouselPauseOnHover}
            mobileCarouselShowArrows={section.mobileCarouselShowArrows}
            mobileCarouselArrowPosition={section.mobileCarouselArrowPosition}
            mobileCarouselShowDots={section.mobileCarouselShowDots}
            cardStyle={section.cardStyle || "classic-default"}
            cardSizeDesktop={section.cardSizeDesktop}
            cardSizeMobile={section.cardSizeMobile}
            cardBgColor={section.cardBgColor}
            cardTextColor={section.cardTextColor}
            cardAccentColor={section.cardAccentColor}
            shelfBorder={section.shelfBorder}
            cardBorder={section.cardBorder}
            imageArrangement={section.imageArrangement}
            elementOrder={section.elementOrder}
            elements={section.elements}
            sectionBgColor={section.sectionBgColor}
            sectionBgImage={section.sectionBgImage}
            sectionPaddingTop={section.sectionPaddingTop}
            sectionPaddingBottom={section.sectionPaddingBottom}
            headingAlignment={section.headingAlignment}
            headingSize={section.headingSize}
            headingColor={section.headingColor}
            subtitle={section.subtitle}
            subtitleColor={section.subtitleColor}
            customBadge={section.customBadge}
            customHeadline={section.customHeadline}
            customTagline={section.customTagline}
            customPrice={section.customPrice}
            customLocation={section.customLocation}
            customBhk={section.customBhk}
            customArea={section.customArea}
            customDeveloper={section.customDeveloper}
            customStatus={section.customStatus}
            customCtaText={section.customCtaText}
          />
        ))}

      </div>
    </section>
  );
}
