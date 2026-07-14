"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

const CONTACT_EMAIL = "veraforeducation@gmail.com";

const FAQS = [
  { q: "How do I unlock writing?", a: "Read enough studies, take enough real quizzes with a solid accuracy record, then pass the referencing skills check — see the Write tab for your live progress." },
  { q: "Can I change my grade level later?", a: "Yes — open Profile and scroll to Account & grade level. Recommendations update immediately." },
  { q: "How do I report a problem with an article?", a: "Email us using the form below with the article title and what's wrong, and we'll take a look." },
];

export default function ContactPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject || "Vera feedback")}&body=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-6">
      <Link href="/profile" className="text-sm font-semibold text-muted hover:text-ink">← Back</Link>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">Contact us 📬</h1>
        <p className="text-muted">Questions, feedback, bug reports — we read everything.</p>
      </div>

      <div className="rounded-3xl bg-card p-5 card-shadow">
        <h2 className="text-sm font-black text-ink">Email us directly</h2>
        <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-lg font-bold text-brand-700 hover:underline">
          {CONTACT_EMAIL}
        </a>
      </div>

      <div className="rounded-3xl bg-card p-5 card-shadow">
        <h2 className="text-sm font-black text-ink">Or draft a message here</h2>
        <p className="mt-1 text-xs text-muted">This opens your email app with everything pre-filled — nothing is sent from this page directly.</p>
        <div className="mt-3 space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-2xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-brand/40"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            className="w-full rounded-2xl border border-line bg-canvas p-4 text-sm outline-none focus:border-brand/40"
          />
          <Button href={mailtoHref} size="lg">Open in email app →</Button>
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 card-shadow">
        <h2 className="text-sm font-black text-ink">Quick answers</h2>
        <div className="mt-3 space-y-3">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl bg-canvas p-3">
              <div className="text-sm font-bold text-ink">{f.q}</div>
              <div className="mt-1 text-sm text-muted">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
