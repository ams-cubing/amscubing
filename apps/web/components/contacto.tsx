"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Button } from "@workspace/ui/components/button";
import { CONTACT_EMAIL } from "@/lib/content";

export function Contacto() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = [
      `Nombre: ${name}`,
      `Correo: ${email}`,
      "",
      message || "(Sin mensaje adicional)",
    ].join("\n");
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject || "Contacto AMS")}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  const fieldClassName =
    "w-full border-0 border-b border-black/20 bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-black/35 focus:border-[var(--ams-green)]";

  return (
    <section
      id="contacto"
      className="scroll-mt-8 border-t border-black/5 bg-white py-20 md:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-sm font-semibold tracking-wide text-[var(--ams-red)] uppercase">
            Contacto
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            ¿Te interesa saber más?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-black/70 md:text-lg">
            Escríbenos. Abriremos tu cliente de correo con el mensaje listo para
            enviar a la AMS.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="space-y-6"
        >
          <label className="block">
            <span className="sr-only">Tu nombre</span>
            <input
              required
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
              className={fieldClassName}
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="sr-only">Tu correo electrónico</span>
            <input
              required
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Tu correo electrónico"
              className={fieldClassName}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="sr-only">Asunto</span>
            <input
              required
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Asunto"
              className={fieldClassName}
            />
          </label>
          <label className="block">
            <span className="sr-only">Tu mensaje (opcional)</span>
            <textarea
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tu mensaje (opcional)"
              rows={4}
              className={`${fieldClassName} resize-y`}
            />
          </label>
          <Button
            type="submit"
            size="lg"
            className="bg-[var(--ams-green)] text-white hover:bg-[var(--ams-green)]/90"
          >
            Enviar mensaje
          </Button>
        </motion.form>
      </div>
    </section>
  );
}
