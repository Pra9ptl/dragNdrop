/**
 * components/ui/AiAssistantDrawer.tsx - Embedded CopilotKit assistant for layout help
 *
 * This component exposes a structured view of the canvas to the model, defines
 * the `suggest_component_placement` tool, and keeps a human confirmation step
 * between AI suggestions and actual canvas mutations.
 *
 * Two render modes are supported:
 * - floating drawer: legacy overlay panel
 * - embedded panel: left-sidebar tab inside the main app layout
 */
import { CopilotChat } from '@copilotkit/react-ui';
import { useCopilotAction, useCopilotChatHeadless_c, useCopilotReadable } from '@copilotkit/react-core';
import { useMemo, useState, type CSSProperties } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { applyPlacementSuggestion, type PlacementSuggestion } from '../../ai/placement';
import { store, type AppDispatch, type RootState } from '../../store';
import { selectNode } from '../../store/slices/selectionSlice';
import { COMPONENT_TYPES } from '../../types/schema';

interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
}

// Extract a useful message from CopilotKit/OpenAI errors, which can be nested objects.
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      error?: unknown;
      cause?: unknown;
      details?: unknown;
    };

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }

    if (typeof candidate.error === 'string' && candidate.error.trim()) {
      return candidate.error;
    }

    if (candidate.cause) {
      const causeMessage = extractErrorMessage(candidate.cause);
      if (causeMessage) return causeMessage;
    }

    if (candidate.details) {
      const detailsMessage = extractErrorMessage(candidate.details);
      if (detailsMessage) return detailsMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown assistant error.';
    }
  }

  return 'Unknown assistant error.';
}

function toUserFacingErrorMessage(error: unknown): string {
  const rawMessage = extractErrorMessage(error);

  // Quota failures are common during local setup, so surface a direct explanation.
  if (rawMessage.includes('429') || rawMessage.toLowerCase().includes('quota')) {
    return 'OpenAI quota exceeded. The assistant cannot generate placements until the API key has available credits.';
  }

  return rawMessage;
}

// Convert raw tool args into the internal PlacementSuggestion structure.
// This normalizes canvas-root/null parent references and component type casing.
function parseSuggestion(args: Record<string, unknown>): PlacementSuggestion {
  const mode = args.mode === 'move' ? 'move' : 'create';
  const targetParentIdRaw = typeof args.targetParentId === 'string' ? args.targetParentId.trim() : '';
  const targetParentId = (
    targetParentIdRaw
    && targetParentIdRaw !== 'null'
    && targetParentIdRaw !== 'canvas-root'
  ) ? targetParentIdRaw : null;
  const componentTypeCandidate = typeof args.componentType === 'string' ? args.componentType.trim() : null;

  const suggestion: PlacementSuggestion = {
    mode,
    targetParentId,
    rationale: typeof args.rationale === 'string' ? args.rationale : undefined,
  };

  if (typeof args.newIndex === 'number' && Number.isFinite(args.newIndex)) {
    suggestion.newIndex = args.newIndex;
  }

  if ((typeof args.x === 'number' && Number.isFinite(args.x)) || (typeof args.y === 'number' && Number.isFinite(args.y))) {
    suggestion.position = {
      x: typeof args.x === 'number' && Number.isFinite(args.x) ? args.x : 24,
      y: typeof args.y === 'number' && Number.isFinite(args.y) ? args.y : 24,
    };
  }

  if ((typeof args.gridColumn === 'number' && Number.isFinite(args.gridColumn)) || (typeof args.gridRow === 'number' && Number.isFinite(args.gridRow))) {
    suggestion.gridCell = {
      col: typeof args.gridColumn === 'number' && Number.isFinite(args.gridColumn) ? args.gridColumn : 1,
      row: typeof args.gridRow === 'number' && Number.isFinite(args.gridRow) ? args.gridRow : 1,
    };
  }

  if (mode === 'move') {
    if (typeof args.existingNodeId === 'string') {
      suggestion.existingNodeId = args.existingNodeId;
    }
  } else if (componentTypeCandidate) {
    const matchedType = COMPONENT_TYPES.find(
      (type) => type.toLowerCase() === componentTypeCandidate.toLowerCase(),
    );
    if (matchedType) {
      suggestion.componentType = matchedType;
    }
  }

  return suggestion;
}

function PlacementToolCard({
  status,
  args,
  onConfirm,
  onDismiss,
}: {
  status: string;
  args: Record<string, unknown>;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  void status;
  const [confirmed, setConfirmed] = useState(false);
  const mode = args.mode === 'move' ? 'Move component' : 'Create component';
  const componentType = typeof args.componentType === 'string' ? args.componentType : 'Component';
  const existingNodeIdRaw = typeof args.existingNodeId === 'string' ? args.existingNodeId.trim() : '';
  const existingNodeId = existingNodeIdRaw && existingNodeIdRaw !== 'null' ? existingNodeIdRaw : null;
  const targetParentIdRaw = typeof args.targetParentId === 'string' ? args.targetParentId.trim() : '';
  const parentLabel = (
    targetParentIdRaw
    && targetParentIdRaw !== 'null'
    && targetParentIdRaw !== 'canvas-root'
  ) ? targetParentIdRaw.slice(0, 8) : 'canvas root';
  const reason = typeof args.rationale === 'string' ? args.rationale : 'Suggested to improve layout clarity.';

  return (
    <div style={cardStyle}>
      <div style={chipStyle}>Human-in-the-loop confirmation</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{mode}</div>
      <div style={{ fontSize: 13, color: '#334155', marginTop: 8, lineHeight: 1.45 }}>
        {existingNodeId ? `Node ${existingNodeId.slice(0, 8)} -> parent ${parentLabel}` : `${componentType} -> parent ${parentLabel}`}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.45 }}>{reason}</div>
      {confirmed ? (
        <div style={confirmedTextStyle}>Placement confirmation submitted.</div>
      ) : (
        // Suggestions are never auto-applied; user confirmation is required.
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button
            type='button'
            onClick={() => {
              setConfirmed(true);
              onConfirm();
            }}
            style={confirmButtonStyle}
          >
            Confirm placement
          </button>
          <button type='button' onClick={onDismiss} style={dismissButtonStyle}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export function AiAssistantDrawer({ open, onClose, embedded = false }: AiAssistantDrawerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const rootIds = useSelector((state: RootState) => state.canvas.rootIds);
  const nodes = useSelector((state: RootState) => state.canvas.nodes);
  const selectedId = useSelector((state: RootState) => state.selection.selectedId);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  // Headless chat helpers let the New chat button clear the conversation state cleanly.
  const { reset, resetSuggestions } = useCopilotChatHeadless_c();

  const selectedNode = selectedId ? nodes[selectedId] : null;

  // Expose a compact tree so the model can reason about nesting and target real ids.
  function buildCanvasTree(nodeId: string): Record<string, unknown> {
    const node = nodes[nodeId];
    if (!node) return {};

    const label = node.props.label ? String(node.props.label).slice(0, 20) : `${node.type}`;
    const childCount = node.children.length;
    const isSelected = nodeId === selectedId;

    return {
      id: nodeId,
      type: node.type,
      label,
      isSelected,
      childCount,
      children: node.children.map((childId) => buildCanvasTree(childId)),
    };
  }

  const canvasTree = useMemo(() => {
    return rootIds.map((rootId) => buildCanvasTree(rootId));
  }, [rootIds, nodes]);

  const readableCanvas = useMemo(
    () => ({
      rootComponentCount: rootIds.length,
      nodeCount: Object.keys(nodes).length,
      selectedNodeId: selectedId,
      selectedNodeType: selectedNode?.type ?? null,
      canvasStructure: canvasTree.length > 0 
        ? canvasTree 
        : { note: 'Canvas is empty. Start by adding components.' },
    }),
    [nodes, rootIds.length, selectedId, selectedNode?.type, canvasTree],
  );

  // Publish the current canvas summary into CopilotKit context on every relevant change.
  useCopilotReadable(
    {
      description: 'CanvasIQ canvas summary and current selection.',
      value: readableCanvas,
    },
    [readableCanvas],
  );

  // Register the single tool the assistant is allowed to call for layout changes.
  useCopilotAction({
    name: 'suggest_component_placement',
    description:
      'Suggest a placement for a UI component. Use mode=create to add a new component or mode=move to reposition an existing one. Always include rationale.',
    parameters: [
      { name: 'mode', type: 'string', description: 'create or move', required: true },
      { name: 'componentType', type: 'string', description: 'Button | Text | Input | Card | Container | Image' },
      { name: 'existingNodeId', type: 'string', description: 'Required when mode is move' },
      { name: 'targetParentId', type: 'string', description: 'Parent component id; omit for canvas root' },
      { name: 'newIndex', type: 'number', description: 'Insertion index among siblings' },
      { name: 'x', type: 'number', description: 'X position in parent coordinates' },
      { name: 'y', type: 'number', description: 'Y position in parent coordinates' },
      { name: 'gridColumn', type: 'number', description: 'Optional 1-indexed grid column' },
      { name: 'gridRow', type: 'number', description: 'Optional 1-indexed grid row' },
      { name: 'rationale', type: 'string', description: 'Why this placement is recommended', required: true },
    ],
    renderAndWaitForResponse: ({ status, args, respond }) => {
      const parsedArgs = (args ?? {}) as Record<string, unknown>;

      return (
        <PlacementToolCard
          status={status}
          args={parsedArgs}
          onConfirm={() => {
            try {
              const suggestion = parseSuggestion(parsedArgs);
              // Read the latest store state at confirmation time so the action uses
              // current ids/parents rather than stale values captured during render.
              const latestState = store.getState();
              const result = applyPlacementSuggestion(
                dispatch,
                {
                  nodes: latestState.canvas.nodes,
                  rootIds: latestState.canvas.rootIds,
                },
                suggestion,
              );
              setStatusText(result.message);
              if (result.ok && result.affectedId) {
                dispatch(selectNode(result.affectedId));
              }
              respond?.({ approved: result.ok, message: result.message, affectedId: result.affectedId ?? null });
            } catch (error) {
              const message = toUserFacingErrorMessage(error);
              setStatusText(message);
              respond?.({ approved: false, message });
            }
          }}
          onDismiss={() => {
            setStatusText('Suggestion dismissed.');
            respond?.({ approved: false, message: 'User dismissed the suggestion.' });
          }}
        />
      );
    },
  }, [dispatch]);

  // In embedded mode this panel is always rendered; floating mode respects the open flag.
  if (!open && !embedded) return null;

  return (
    <>
      {!embedded ? <div style={backdropStyle} onClick={onClose} /> : null}
      <aside style={embedded ? embeddedPanelStyle : drawerStyle} onMouseDown={(event) => event.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>CanvasIQ Assistant</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>CopilotKit placement copilot</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type='button'
              onClick={() => {
                // Reset both messages and CopilotKit suggestion chips.
                reset();
                resetSuggestions();
                setChatSessionKey((prev) => prev + 1);
                setStatusText(null);
              }}
              style={newChatButtonStyle}
            >
              New chat
            </button>
            {!embedded ? (
              <button type='button' onClick={onClose} style={closeButtonStyle} aria-label='Close AI assistant'>
                Close
              </button>
            ) : null}
          </div>
        </div>
        {statusText ? <div style={statusStyle}>{statusText}</div> : null}
        <div style={{ flex: 1, minHeight: 0 }}>
          <CopilotChat
            key={`chat-session-${chatSessionKey}`}
            className='canvasiq-copilot-chat'
            instructions='You are the CanvasIQ layout copilot. The only supported component types are Button, Text, Input, Card, Container, and Image. Never suggest or reference any other component type. Suggest precise component placements with coordinates or grid cells. Always call suggest_component_placement before claiming a layout change. CRITICAL for sequential placement: (1) After each placement the user confirms, the canvasStructure updates to show the new component tree. (2) The "isSelected" field marks the most recently created/selected component - this is the parent to use for nested placements. (3) When user says "add X to container", find the Container node in canvasStructure by type, use its id as targetParentId. (4) Always reference actual node IDs from canvasStructure, never invent IDs. Keep rationale concise and practical.'
            onError={(errorEvent) => {
              setStatusText(toUserFacingErrorMessage(errorEvent));
            }}
            renderError={({ message, onDismiss }) => (
              <div style={errorCardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>Assistant request failed</div>
                <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 6, lineHeight: 1.45 }}>
                  {toUserFacingErrorMessage(message)}
                </div>
                <button type='button' onClick={onDismiss} style={errorDismissButtonStyle}>
                  Dismiss
                </button>
              </div>
            )}
            labels={{
              title: 'AI Layout Copilot',
              initial: 'Ask for layout suggestions. I will propose changes and wait for your confirmation.',
              placeholder: 'Try: Place a CTA button below the hero card',
              stopGenerating: 'Stop',
            }}
            suggestions={[
              { title: 'Place CTA under selected card', message: 'Suggest a CTA Button below the currently selected Card and ask for confirmation before applying.' },
              { title: 'Build two-column hero', message: 'Suggest a two-column hero layout with Image on left and Text plus Button on right.' },
              { title: 'Improve visual hierarchy', message: 'Suggest one placement to improve hierarchy and one spacing tweak.' },
            ]}
          />
        </div>
      </aside>
    </>
  );
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.25)',
  zIndex: 40,
};

const drawerStyle: CSSProperties = {
  position: 'fixed',
  top: 56,
  right: 16,
  bottom: 16,
  width: 'min(440px, calc(100vw - 32px))',
  background: '#ffffff',
  border: '1px solid #dbe4f0',
  borderRadius: 14,
  boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
  zIndex: 41,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const embeddedPanelStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: '#ffffff',
  border: '1px solid #dbe4f0',
  borderRadius: 12,
  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #e2e8f0',
  padding: '10px 12px',
  background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
};

const closeButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  color: '#0f172a',
  borderRadius: 8,
  height: 30,
  padding: '0 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

const newChatButtonStyle: CSSProperties = {
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  borderRadius: 8,
  height: 30,
  padding: '0 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
};

const statusStyle: CSSProperties = {
  margin: '10px 12px 0',
  padding: '8px 10px',
  borderRadius: 10,
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  color: '#1d4ed8',
  fontSize: 12,
};

const cardStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 12,
  background: '#ffffff',
  padding: 12,
  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  color: '#1e40af',
  background: '#dbeafe',
  border: '1px solid #93c5fd',
};

const confirmButtonStyle: CSSProperties = {
  border: 'none',
  background: '#1d4ed8',
  color: '#ffffff',
  borderRadius: 8,
  padding: '8px 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
};

const dismissButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#334155',
  borderRadius: 8,
  padding: '8px 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

const confirmedTextStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: '#1d4ed8',
  fontWeight: 600,
};

const errorCardStyle: CSSProperties = {
  margin: 12,
  padding: 12,
  borderRadius: 12,
  border: '1px solid #fecaca',
  background: '#fef2f2',
};

const errorDismissButtonStyle: CSSProperties = {
  marginTop: 10,
  border: '1px solid #fca5a5',
  background: '#ffffff',
  color: '#991b1b',
  borderRadius: 8,
  padding: '8px 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};
