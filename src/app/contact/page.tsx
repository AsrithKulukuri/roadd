"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    // Honeypot field (hidden from users, traps bots)
    companyWebsite: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim() || formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters.";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/[\s-]/g, "");
      if (!/^\+?[0-9]{10,14}$/.test(cleanPhone)) {
        newErrors.phone = "Please enter a valid 10-digit mobile number.";
      }
    }

    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      newErrors.subject = "Subject must be at least 3 characters.";
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Spam / Bot Protection: Honeypot check
    if (formData.companyWebsite.trim().length > 0) {
      // Bot filled hidden honeypot trap: silently drop submission
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setFormSubmitted(true);
        toast.success("Thank you! Your message has been received.");
      }, 1000);
      return;
    }

    if (!validate()) {
      toast.error("Please correct the errors in the form before submitting.");
      return;
    }

    setIsSubmitting(true);

    // Simulate sending message
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
      toast.success("Message sent successfully! Our team will get back to you within 24 hours.");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        companyWebsite: "",
      });
      setErrors({});
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16 bg-bg-primary">
      {/* Header */}
      <section className="py-12 md:py-20 bg-bg-card border-b border-border-default">
        <div className="container-road">
          <div className="max-w-3xl text-center mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Support & Inquiries
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-black text-text-primary tracking-tight">
              Get in Touch with RoadFacing
            </h1>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
              Have questions about a verified project, need assistance booking a site visit, or want to partner with us in Vijayawada, Guntur or Amaravati? We are here to help.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container-road">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            
            {/* Contact Info */}
            <div className="space-y-10">
              <div>
                <h2 className="font-heading text-2xl font-bold text-text-primary mb-6">
                  Direct Contact Information
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-bg-card border border-border-default shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary mb-1">Email Desk</h4>
                      <p className="text-text-secondary text-sm mb-1.5">For property inquiries, developer listings & partnerships:</p>
                      <a href={`mailto:${siteConfig.email}`} className="text-amber-500 font-bold hover:underline text-sm inline-flex items-center gap-1.5">
                        {siteConfig.email}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-bg-card border border-border-default shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500">
                      <Phone className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-text-primary mb-0.5">Phone & WhatsApp Support</h4>
                      <p className="text-text-secondary text-sm mb-1">Monday – Saturday, 9:00 AM – 7:00 PM IST</p>
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className="text-amber-500 font-bold hover:underline text-sm inline-flex items-center gap-1.5">
                          <span>Direct Call:</span> {siteConfig.phone}
                        </a>
                        <a 
                          href="https://wa.me/918466965567?text=Hi%20RoadFacing%20Support" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline text-sm inline-flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>WhatsApp Concierge:</span> +91 8466965567
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-bg-card border border-border-default shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary mb-1">Regional Office</h4>
                      <p className="text-text-secondary text-sm leading-relaxed">
                        ROADFACING Real Estate Media Pvt. Ltd.<br />
                        Benz Circle & Capital Highway Corridor<br />
                        Vijayawada, Andhra Pradesh, India
                      </p>
                    </div>
                  </div>

                  {/* Official Social Channels */}
                  <div className="p-5 rounded-2xl bg-bg-card border border-border-default shadow-xs space-y-3">
                    <h4 className="font-bold text-text-primary text-sm">Official Social Channels</h4>
                    <p className="text-text-secondary text-xs">
                      Follow our ground inspection videos, walkthroughs, and verified property updates:
                    </p>
                    <div className="flex items-center gap-2.5 flex-wrap pt-1">
                      <a
                        href={siteConfig.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/30 text-pink-600 dark:text-pink-400 text-xs font-bold hover:scale-[1.02] transition-transform"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        Instagram
                      </a>
                      <a
                        href={siteConfig.socials.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-bold hover:scale-[1.02] transition-transform"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z"/></svg>
                        Facebook
                      </a>
                      <a
                        href={siteConfig.socials.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold hover:scale-[1.02] transition-transform"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        YouTube
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form with Validation & Spam Trap */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-10 shadow-elevated">
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
                Send us a Message
              </h2>
              <p className="text-text-secondary text-xs sm:text-sm mb-6">
                Fill in your details below and our regional property advisor will connect with you.
              </p>

              {formSubmitted ? (
                <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-text-primary">Thank You!</h3>
                  <p className="text-sm text-text-secondary">
                    Your inquiry has been successfully sent. A representative will contact you shortly.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setFormSubmitted(false)}
                    className="font-bold text-xs rounded-xl"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Honeypot field (hidden from legitimate users, filled by spam bots) */}
                  <div className="sr-only" aria-hidden="true" style={{ display: "none" }}>
                    <label htmlFor="companyWebsite">Website</label>
                    <input
                      type="text"
                      id="companyWebsite"
                      name="companyWebsite"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.companyWebsite}
                      onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="firstName" className="text-xs font-bold text-text-secondary">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="firstName"
                        required
                        placeholder="e.g. Ramesh"
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({ ...formData, firstName: e.target.value });
                          if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                        }}
                        className={errors.firstName ? "border-red-500 focus:ring-red-500" : ""}
                      />
                      {errors.firstName && (
                        <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.firstName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="lastName" className="text-xs font-bold text-text-secondary">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="lastName"
                        required
                        placeholder="e.g. Rao"
                        value={formData.lastName}
                        onChange={(e) => {
                          setFormData({ ...formData, lastName: e.target.value });
                          if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                        }}
                        className={errors.lastName ? "border-red-500 focus:ring-red-500" : ""}
                      />
                      {errors.lastName && (
                        <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-xs font-bold text-text-secondary">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        className={errors.email ? "border-red-500 focus:ring-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="text-xs font-bold text-text-secondary">
                        Phone / WhatsApp <span className="text-text-tertiary text-[10px] font-normal">(Optional)</span>
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 88850 05567"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (errors.phone) setErrors({ ...errors, phone: undefined });
                        }}
                        className={errors.phone ? "border-red-500 focus:ring-red-500" : ""}
                      />
                      {errors.phone && (
                        <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="text-xs font-bold text-text-secondary">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="subject"
                      required
                      placeholder="e.g. Inquiry regarding Amaravati Ventures"
                      value={formData.subject}
                      onChange={(e) => {
                        setFormData({ ...formData, subject: e.target.value });
                        if (errors.subject) setErrors({ ...errors, subject: undefined });
                      }}
                      className={errors.subject ? "border-red-500 focus:ring-red-500" : ""}
                    />
                    {errors.subject && (
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.subject}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-xs font-bold text-text-secondary">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      id="message" 
                      required 
                      rows={4}
                      value={formData.message}
                      onChange={(e) => {
                        setFormData({ ...formData, message: e.target.value });
                        if (errors.message) setErrors({ ...errors, message: undefined });
                      }}
                      className={`flex w-full rounded-xl border bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-200 resize-none ${
                        errors.message ? "border-red-500" : "border-border-default"
                      }`}
                      placeholder="Please share details about your inquiry or property preferences..."
                    />
                    {errors.message && (
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.message}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending Securely..." : (
                      <>
                        Send Message <Send className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
