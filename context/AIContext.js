import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { auth } from "../firebaseConfig";
import { workaholicApiUrl } from "../constants/workaholicApi";
import { ProjectsContext } from "./ProjectsContext";
import { useProfession } from "./ThemeContext";

/** Backend: Workaholic Next.js `POST /api/ai/assistant`. */
export const AI_ASSISTANT_API_PATH = "/api/ai/assistant";

export const AIContext = createContext(null);

function genMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function extractAssistantReply(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
  if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    const c = data.choices[0].message.content;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export function AIProvider({ children }) {
  const projectsCtx = useContext(ProjectsContext);
  const createProject = projectsCtx?.createProject;
  const profession = useProfession();
  const selectedProject = projectsCtx?.selectedProject ?? null;

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const requestInFlightRef = useRef(false);

  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen((v) => !v), []);

  const sendMessageToAI = useCallback(
    (message) => {
      const trimmed = (message ?? "").trim();
      if (!trimmed || requestInFlightRef.current) return;
      requestInFlightRef.current = true;

      const userMsg = {
        id: genMessageId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        (async () => {
          setIsLoading(true);
          const payload = {
            messages: next.map(({ role, content }) => ({ role, content })),
            context: {
              profession: profession && String(profession).trim() ? profession : null,
              activeProject: selectedProject
                ? {
                    id: selectedProject.id,
                    name: selectedProject.name,
                    code: selectedProject.code ?? null,
                    address:
                      typeof selectedProject.address === "string"
                        ? selectedProject.address
                        : null,
                  }
                : null,
            },
          };

          try {
            const user = auth.currentUser;
            if (!user) {
              throw new Error("Du måste vara inloggad för att använda assistenten.");
            }
            const idToken = await user.getIdToken(true);
            const res = await fetch(workaholicApiUrl(AI_ASSISTANT_API_PATH), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify(payload),
            });

            const data = await readJsonSafe(res);

            if (!res.ok) {
              const errMsg =
                res.status === 401
                  ? "Sessionen har gått ut. Logga ut och in igen."
                  : data.error || data.details || `Servern svarade med HTTP ${res.status}`;
              throw new Error(errMsg);
            }

            if (
              data &&
              typeof data === "object" &&
              data.action &&
              typeof data.action === "object" &&
              data.action.type === "CREATE_PROJECT" &&
              data.action.payload &&
              typeof data.action.payload === "object"
            ) {
              const actionPayload = data.action.payload;
              const rawName =
                actionPayload.name != null ? String(actionPayload.name).trim() : "";
              if (!rawName) {
                throw new Error("Assistenten returnerade skapa-projekt utan projektnamn.");
              }

              if (typeof createProject !== "function") {
                throw new Error("Kan inte skapa projekt — internt fel (createProject saknas).");
              }

              const rawCode =
                actionPayload.code != null && String(actionPayload.code).trim()
                  ? String(actionPayload.code).trim().toUpperCase()
                  : "";
              const rawAddress =
                actionPayload.address != null && String(actionPayload.address).trim()
                  ? String(actionPayload.address).trim()
                  : "";

              try {
                await createProject(
                  rawName,
                  rawCode || undefined,
                  rawAddress
                );
              } catch (createErr) {
                const createMsg =
                  createErr instanceof Error
                    ? createErr.message
                    : String(createErr);
                setMessages((p) => [
                  ...p,
                  {
                    id: genMessageId(),
                    role: "assistant",
                    content: `Projektet kunde inte skapas: ${createMsg}`,
                    createdAt: Date.now(),
                  },
                ]);
                Alert.alert(
                  "Kunde inte skapa projekt",
                  createMsg || "Försök igen eller skapa projektet manuellt under Nytt projekt."
                );
                return;
              }

              const ack =
                typeof data.message === "string" && data.message.trim()
                  ? data.message.trim()
                  : "Klart — projektet är skapat.";

              setMessages((p) => [
                ...p,
                {
                  id: genMessageId(),
                  role: "assistant",
                  content: ack,
                  createdAt: Date.now(),
                },
              ]);

              Alert.alert(
                "Projekt skapat",
                `“${rawName}” är skapat och valt som aktivt projekt.`,
                [{ text: "OK" }]
              );

              setTimeout(() => {
                closePanel();
              }, 450);
              return;
            }

            const reply =
              extractAssistantReply(data) ||
              (data.ok === false && data.error ? String(data.error) : null) ||
              "Inget textsvar från assistenten ännu. Kontrollera att /api/ai/assistant är aktiv på backend.";

            setMessages((p) => [
              ...p,
              {
                id: genMessageId(),
                role: "assistant",
                content: reply,
                createdAt: Date.now(),
              },
            ]);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setMessages((p) => [
              ...p,
              {
                id: genMessageId(),
                role: "assistant",
                content: `Kunde inte nå assistenten: ${msg}`,
                createdAt: Date.now(),
              },
            ]);
          } finally {
            setIsLoading(false);
            requestInFlightRef.current = false;
          }
        })();
        return next;
      });
    },
    [profession, selectedProject, createProject, closePanel]
  );

  const value = useMemo(
    () => ({
      messages,
      isLoading,
      isPanelOpen,
      openPanel,
      closePanel,
      togglePanel,
      sendMessageToAI,
      profession,
      selectedProject,
    }),
    [
      messages,
      isLoading,
      isPanelOpen,
      openPanel,
      closePanel,
      togglePanel,
      sendMessageToAI,
      profession,
      selectedProject,
    ]
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (ctx == null) {
    throw new Error("useAI måste användas inom AIProvider.");
  }
  return ctx;
}
