import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { auth } from "../firebaseConfig";
import { workaholicApiUrl } from "../constants/workaholicApi";
import { ProjectsContext } from "./ProjectsContext";
import { CompanyContext } from "./CompanyContext";
import { useProfession } from "./ThemeContext";
import { navigate } from "../utils/navigationService";

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

/**
 * Extraherar textsvaret ur olika möjliga API-svarformat.
 * Hanterar både nytt { reply } och gammalt { message } format.
 */
function extractAssistantReply(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
  if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    const c = data.choices[0].message.content;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/**
 * Normaliserar API-svaret till det kanoniska formatet:
 * { reply: string | null, actions: Action[] }
 *
 * Hanterar:
 *  - Nytt format:  { ok, reply, actions: [...] }
 *  - Gammalt format: { ok, message, action: { type, payload } }
 */
function normalizeApiResponse(data) {
  const reply = extractAssistantReply(data);

  // Nytt format — actions-array
  if (Array.isArray(data?.actions) && data.actions.length > 0) {
    return { reply, actions: data.actions };
  }

  // Gammalt format — singulär action (bakåtkompatibilitet)
  if (
    data?.action &&
    typeof data.action === "object" &&
    typeof data.action.type === "string"
  ) {
    return { reply, actions: [data.action] };
  }

  return { reply, actions: [] };
}

export function AIProvider({ children }) {
  const projectsCtx = useContext(ProjectsContext);
  const companyCtx = useContext(CompanyContext);

  const createProject = projectsCtx?.createProject;
  const updateProject = projectsCtx?.updateProject;
  const profession = useProfession();
  const selectedProject = projectsCtx?.selectedProject ?? null;

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  /**
   * actionStatus: string | null
   * Sätts under pågående action-loop, t.ex. "Utför: Skapar projekt…"
   * Nollställs när loopen är klar.
   */
  const [actionStatus, setActionStatus] = useState(null);
  const requestInFlightRef = useRef(false);

  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen((v) => !v), []);

  /**
   * Lägger till ett assistent-meddelande i meddelandelistan.
   * Kan anropas både under och efter action-loopen.
   */
  const appendAssistantMessage = useCallback((content) => {
    setMessages((prev) => [
      ...prev,
      { id: genMessageId(), role: "assistant", content, createdAt: Date.now() },
    ]);
  }, []);

  /**
   * executeActionQueue
   *
   * Kör en lista av actions sekventiellt (en i taget, med await).
   * Ordningen är kritisk: CREATE_PROJECT måste köras innan ADD_MATERIAL
   * om materialet ska hamna i det nyskapade projektet.
   *
   * Varje action-steg:
   *  1. Uppdaterar actionStatus (visuell feedback)
   *  2. Utför operationen
   *  3. Propagerar context (t.ex. nyskapade projekt-ID) till nästa steg
   *
   * Vid fel avbryts loopen och ett felmeddelande visas. Efterföljande
   * actions körs INTE.
   *
   * @param {Array<{ type: string, payload: object }>} actions
   * @returns {Promise<void>}
   */
  const executeActionQueue = useCallback(
    async (actions) => {
      if (!Array.isArray(actions) || actions.length === 0) return;

      // companyId för tenant-taggning av alla nyskapade dokument
      const companyId =
        companyCtx?.companyData?.companyId ??
        projectsCtx?.companyData?.companyId ??
        null;

      // activeProjectId propageras mellan steg:
      // om CREATE_PROJECT körs, får ADD_MATERIAL det nya ID:t automatiskt
      let activeProjectId = selectedProject?.id ?? null;

      for (const action of actions) {
        const { type, payload } = action;

        try {
          switch (type) {
            // ── CREATE_PROJECT ──────────────────────────────────────────────
            case "CREATE_PROJECT": {
              const name = String(payload?.name ?? "").trim();
              if (!name) {
                throw new Error("Projektnamn saknas i CREATE_PROJECT-action.");
              }
              setActionStatus(`Utför: Skapar projekt "${name}"…`);

              if (typeof createProject !== "function") {
                throw new Error("createProject är inte tillgänglig (internt fel).");
              }

              const created = await createProject(
                name,
                payload.code ?? undefined,
                payload.address ?? undefined
              );

              // Propagera det nya ID:t till efterföljande actions
              activeProjectId = created.id;

              Alert.alert(
                "Projekt skapat",
                `"${name}" är skapat och valt som aktivt projekt.`,
                [{ text: "OK" }]
              );
              break;
            }

            // ── ADD_MATERIAL ────────────────────────────────────────────────
            case "ADD_MATERIAL": {
              const name = String(payload?.name ?? "").trim();
              const quantity = Number(payload?.quantity) || 1;
              const unit = String(payload?.unit ?? "st").trim();
              const sku = payload?.sku ? String(payload.sku).trim() : "-";

              if (!name) {
                throw new Error("Materialnamn saknas i ADD_MATERIAL-action.");
              }
              if (!activeProjectId) {
                throw new Error(
                  "Inget aktivt projekt — välj ett projekt innan du lägger till material."
                );
              }

              setActionStatus(`Utför: Lägger till "${name}"…`);

              if (typeof updateProject !== "function") {
                throw new Error("updateProject är inte tillgänglig (internt fel).");
              }

              // Hämta aktuell products-array från context (undviker stale closure)
              const currentProjects = projectsCtx?.projects ?? [];
              const targetProject = currentProjects.find((p) => p.id === activeProjectId);
              const existingProducts = Array.isArray(targetProject?.products)
                ? targetProject.products
                : [];

              const newProduct = {
                name,
                articleNumber: sku,
                quantity,
                unit,
                purchasePrice: 0,
                markup: 25,
                unitPriceOutExclVat: 0,
                source: "ai_assistant",
                // tenant-taggning garanteras på alla nyskapade poster
                ...(companyId ? { companyId } : {}),
              };

              await updateProject(activeProjectId, {
                products: [newProduct, ...existingProducts],
              });
              break;
            }

            // ── LOG_CONSTRUCTION_ENTRY ──────────────────────────────────────
            case "LOG_CONSTRUCTION_ENTRY": {
              const text = String(payload?.text ?? "").trim();
              if (!text) {
                throw new Error("Text saknas i LOG_CONSTRUCTION_ENTRY-action.");
              }
              if (!activeProjectId) {
                throw new Error("Inget aktivt projekt för att logga byggdagbok.");
              }

              setActionStatus("Utför: Loggar i byggdagboken…");

              const currentProjects = projectsCtx?.projects ?? [];
              const targetProject = currentProjects.find((p) => p.id === activeProjectId);
              const existingLog = Array.isArray(targetProject?.constructionLog)
                ? targetProject.constructionLog
                : [];

              await updateProject(activeProjectId, {
                constructionLog: [
                  {
                    text,
                    createdAt: new Date().toISOString(),
                    source: "ai_assistant",
                    ...(companyId ? { companyId } : {}),
                  },
                  ...existingLog,
                ],
              });
              break;
            }

            // ── NAVIGATE ────────────────────────────────────────────────────
            case "NAVIGATE": {
              const screenName = String(payload?.screenName ?? "").trim();
              if (!screenName) {
                throw new Error("screenName saknas i NAVIGATE-action.");
              }

              setActionStatus(`Utför: Navigerar till ${screenName}…`);

              // Bygg params — injicera activeProjectId om skärmen troligen behöver det
              const params = {
                ...(payload?.params ?? {}),
                ...(activeProjectId &&
                !payload?.params?.groupId &&
                !payload?.params?.projectId
                  ? { groupId: activeProjectId }
                  : {}),
              };

              // navigate() från navigationService fungerar utanför NavigationContainer
              navigate(screenName, params);
              break;
            }

            default:
              // Okänd action-typ — logga men fortsätt med nästa
              console.warn("[AIContext] Okänd action-typ:", type);
              break;
          }
        } catch (err) {
          // Fel i ett steg avbryter hela loopen
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[AIContext] Action "${type}" misslyckades:`, errMsg);
          setActionStatus(null);
          appendAssistantMessage(`Kunde inte utföra "${type}": ${errMsg}`);
          return; // avbryt — efterföljande actions körs inte
        }
      }

      // Alla actions genomförda
      setActionStatus(null);
    },
    [
      createProject,
      updateProject,
      selectedProject,
      companyCtx,
      projectsCtx,
      appendAssistantMessage,
    ]
  );

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

            const { reply, actions } = normalizeApiResponse(data);

            // Visa AI:ens textsvar direkt (innan actions körs)
            if (reply) {
              appendAssistantMessage(reply);
            }

            setIsLoading(false);

            // Kör action-kedjan sekventiellt (om det finns actions)
            if (actions.length > 0) {
              await executeActionQueue(actions);
            } else if (!reply) {
              // Varken text eller actions — visa ett fallback-meddelande
              appendAssistantMessage(
                "Inget svar från assistenten. Kontrollera att /api/ai/assistant är aktiv på backend."
              );
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            appendAssistantMessage(`Kunde inte nå assistenten: ${msg}`);
          } finally {
            setIsLoading(false);
            setActionStatus(null);
            requestInFlightRef.current = false;
          }
        })();

        return next;
      });
    },
    [profession, selectedProject, appendAssistantMessage, executeActionQueue]
  );

  const value = useMemo(
    () => ({
      messages,
      isLoading,
      isPanelOpen,
      actionStatus,
      openPanel,
      closePanel,
      togglePanel,
      sendMessageToAI,
      executeActionQueue,
      profession,
      selectedProject,
    }),
    [
      messages,
      isLoading,
      isPanelOpen,
      actionStatus,
      openPanel,
      closePanel,
      togglePanel,
      sendMessageToAI,
      executeActionQueue,
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
