"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Message sent successfully! We'll get back to you soon.");
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="py-12 md:py-20 bg-bg-card border-b border-border-default/50">
        <div className="container-road">
          <div className="max-w-3xl text-center mx-auto space-y-4">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-text-primary">
              Get in Touch
            </h1>
            <p className="text-lg text-text-secondary">
              Have a question about a property, need help with your account, or want to partner with us? We're here to help.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-road">
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* Contact Info */}
            <div className="space-y-12">
              <div>
                <h2 className="font-heading text-2xl font-bold text-text-primary mb-6">
                  Contact Information
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-amber-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary mb-1">Email Us</h4>
                      <p className="text-text-secondary mb-1">For general enquiries and support:</p>
                      <a href={`mailto:${siteConfig.email}`} className="text-amber-primary hover:underline">
                        {siteConfig.email}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-amber-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary mb-1">Call Us</h4>
                      <p className="text-text-secondary mb-1">Mon-Sat from 9am to 6pm IST.</p>
                      <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className="text-amber-primary hover:underline">
                        {siteConfig.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-amber-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary mb-1">Headquarters</h4>
                      <p className="text-text-secondary leading-relaxed">
                        ROAD FACING Tech Pvt. Ltd.<br />
                        Rushikonda IT Park, Hill No. 2<br />
                        Visakhapatnam, Andhra Pradesh<br />
                        India - 530045
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-8 md:p-10 shadow-elevated">
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-6">
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-text-secondary">First Name</label>
                    <Input id="firstName" required placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-text-secondary">Last Name</label>
                    <Input id="lastName" required placeholder="Doe" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-text-secondary">Email Address</label>
                  <Input id="email" type="email" required placeholder="john@example.com" />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium text-text-secondary">Subject</label>
                  <Input id="subject" required placeholder="How can we help?" />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-text-secondary">Message</label>
                  <textarea 
                    id="message" 
                    required 
                    rows={5}
                    className="flex w-full rounded-xl border border-border-default bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary transition-all duration-200 resize-none"
                    placeholder="Tell us more about your query..."
                  />
                </div>
                
                <Button type="submit" variant="amber" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : (
                    <>
                      Send Message <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
