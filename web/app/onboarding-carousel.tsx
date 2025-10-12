"use client";

import { useState, useRef, useEffect, TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselSlide {
  image: string;
  title: string;
  alt: string;
}

interface OnboardingCarouselProps {
  slides: CarouselSlide[];
  accentColor?: string;
}

export function OnboardingCarousel({
  slides,
  accentColor = "blue",
}: OnboardingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    setShowSwipeHint(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    setShowSwipeHint(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setShowSwipeHint(false);
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50; // minimum distance for a swipe
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Auto-hide swipe hint after 5 seconds
  useEffect(() => {
    if (slides.length > 1 && showSwipeHint) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint, slides.length]);

  const colorClasses = {
    blue: {
      badge: "bg-blue-600",
      dot: "bg-blue-600",
      dotInactive: "bg-blue-200",
      border: "border-blue-200",
    },
    green: {
      badge: "bg-green-600",
      dot: "bg-green-600",
      dotInactive: "bg-green-200",
      border: "border-green-200",
    },
    purple: {
      badge: "bg-purple-600",
      dot: "bg-purple-600",
      dotInactive: "bg-purple-200",
      border: "border-purple-200",
    },
  };

  const colors =
    colorClasses[accentColor as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className="space-y-4">
      {/* Slide content */}
      <div className="max-w-sm mx-auto">
        {/* Title with step number */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full ${colors.badge} text-white text-sm font-bold`}
          >
            {currentIndex + 1}
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            {slides[currentIndex].title}
          </h3>
        </div>

        {/* Image with overlaid navigation arrows */}
        <div className="relative">
          <div
            className={`border-2 ${colors.border} rounded-lg overflow-hidden shadow-sm relative`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={slides[currentIndex].image}
              alt={slides[currentIndex].alt}
              width={300}
              height={600}
              className="w-full h-auto select-none"
              priority={currentIndex === 0}
              draggable={false}
            />

            {/* Swipe hint for mobile - only show if multiple slides */}
            {slides.length > 1 && showSwipeHint && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center sm:hidden pointer-events-none animate-fade-in">
                <div className="bg-white/95 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                  <ChevronLeft className="h-5 w-5 text-gray-600 animate-pulse-slow" />
                  <span className="text-sm font-medium text-gray-700">
                    Vuốt để xem thêm
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-600 animate-pulse-slow" />
                </div>
              </div>
            )}
          </div>

          {/* Arrow buttons positioned outside image */}
          {slides.length > 1 && (
            <>
              {/* Left arrow */}
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevious}
                className="absolute -left-12 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white hover:bg-gray-50 shadow-md border-2 hidden sm:flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              {/* Right arrow */}
              <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
                className="absolute -right-12 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white hover:bg-gray-50 shadow-md border-2 hidden sm:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dots indicator and step counter */}
      <div className="flex flex-col items-center gap-2">
        {/* Dots indicator */}
        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === currentIndex
                  ? `${colors.dot} w-8`
                  : `${colors.dotInactive} w-2.5 hover:${colors.dot}`
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Step counter */}
        <p className="text-center text-sm text-gray-500">
          Bước {currentIndex + 1} / {slides.length}
        </p>
      </div>
    </div>
  );
}
