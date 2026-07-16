"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { mockTestimonials } from "@/lib/mock-data";

export function Testimonials() {
  return (
    <section className="py-24 bg-bg-primary overflow-hidden">
      <div className="container-road">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            What Our Users Say
          </h2>
          <p className="text-text-secondary text-lg">
            Don't just take our word for it. Here's what buyers, owners, and
            agents have to say about their experience with ROAD FACING.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative p-6 rounded-3xl bg-bg-card border border-border-default hover:border-amber-primary/30 transition-colors group flex flex-col h-full"
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-border-default group-hover:text-amber-primary/20 transition-colors" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating
                        ? "fill-amber-primary text-amber-primary"
                        : "fill-border-default text-border-default"
                    }`}
                  />
                ))}
              </div>

              <p className="text-text-secondary mb-6 flex-grow italic">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-4 mt-auto">
                <div className="relative h-12 w-12 rounded-full overflow-hidden border border-border-default">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-text-primary text-sm">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-text-tertiary">
                    {testimonial.role} • {testimonial.city}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
