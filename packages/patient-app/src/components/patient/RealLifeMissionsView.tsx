import React, { useState } from 'react';
import { SpeechService } from '../../audio/speechService.js';
import { OfflineStorageService } from '../../storage/localStorage.js';
import { CognitiveObservation, calculateRealLifeTransfer, CognitiveDomain, TaskContext } from '@ner-mind/core';
import { useLocalization } from '../../localization';

interface MissionTaskItem {
  id: string;
  name: string;
  icon: string;
  detail: string;
  hint: string;
}

interface MissionDefinition {
  id: string;
  title: string;
  category: string;
  icon: string;
  domain: CognitiveDomain;
  context: TaskContext;
  difficulty: number;
  timeEstimate: string;
  description: string;
  instruction: string;
  items: MissionTaskItem[];
}

const MISSIONS: MissionDefinition[] = [
  {
    id: 'market_shopping_mission',
    title: 'Local Market Grocery Run',
    category: 'Market & Pantry',
    icon: '🛒',
    domain: 'memory',
    context: 'market',
    difficulty: 2,
    timeEstimate: '3 mins',
    description: 'Remember and verify essential groceries needed for today’s household pantry.',
    instruction: 'Review the pantry list, then check off each item as you locate or verify it.',
    items: [
      { id: 'm1', name: 'Aromatic Rice (Joha/Sona)', icon: '🍚', detail: '1 kg bag for afternoon family meal', hint: 'Look in the grains container or shopping bag.' },
      { id: 'm2', name: 'Fresh Morning Milk', icon: '🥛', detail: '1 pouch for morning and evening tea', hint: 'Check the refrigerator or kitchen counter.' },
      { id: 'm3', name: 'Sandalwood Herbal Soap', icon: '🧼', detail: '1 bar for fresh morning wash', hint: 'Found near the washbasin or grocery shelf.' },
      { id: 'm4', name: 'Ripe Yellow Bananas', icon: '🍌', detail: '1 bunch fresh from local fruit vendor', hint: 'Look in the dining table fruit basket.' },
      { id: 'm5', name: 'Mustard Cooking Oil', icon: '🫙', detail: '500ml cold-pressed oil for curry preparation', hint: 'Check the pantry spice and oil shelf.' },
    ],
  },
  {
    id: 'tea_ritual_mission',
    title: 'Assam Morning Tea & Snack Ritual',
    category: 'Kitchen & Daily Living',
    icon: '☕',
    domain: 'sequencing',
    context: 'kitchen',
    difficulty: 2,
    timeEstimate: '4 mins',
    description: 'Follow the authentic sequence of preparing warm, aromatic tea for the family.',
    instruction: 'Complete each step in chronological order to brew delicious morning tea.',
    items: [
      { id: 't1', name: 'Kettle Water Boiling', icon: '🫖', detail: 'Pour 2 cups fresh water into kettle and heat', hint: 'Start with clean drinking water on the stove.' },
      { id: 't2', name: 'Crushed Fresh Ginger', icon: '🫚', detail: 'Crush fresh ginger and cardamom pods', hint: 'Crush with pestle for aromatic flavor.' },
      { id: 't3', name: 'Authentic Assam CTC Tea', icon: '🍃', detail: 'Add 2 spoonfuls of rich CTC tea leaves', hint: 'Add once water begins to simmer briskly.' },
      { id: 't4', name: 'Warm Milk Addition', icon: '🥛', detail: 'Pour milk and simmer until rich golden brown', hint: 'Allow the brew to rise to a gentle boil.' },
      { id: 't5', name: 'Strain into Brass Cup', icon: '☕', detail: 'Filter through tea sieve and serve with biscuits', hint: 'Use sieve carefully into heat-safe cups.' },
    ],
  },
  {
    id: 'medication_routine_mission',
    title: 'Daily Health & Medication Routine',
    category: 'Health & Wellness',
    icon: '💊',
    domain: 'planning',
    context: 'routine',
    difficulty: 1,
    timeEstimate: '3 mins',
    description: 'Maintain vital health habits, hydration, and prescribed medicines on time.',
    instruction: 'Confirm each wellness task to ensure complete, independent daily health care.',
    items: [
      { id: 'h1', name: 'Morning Lukewarm Water', icon: '💧', detail: 'Drink 1 full glass of water upon waking', hint: 'Hydration supports circulation and digestion.' },
      { id: 'h2', name: 'Morning Vitals Reading', icon: '🩺', detail: 'Check blood pressure or pulse resting rate', hint: 'Rest quietly for 2 minutes before measuring.' },
      { id: 'h3', name: 'Nourishing Breakfast', icon: '🥣', detail: 'Eat warm porridge, poha, idli, or roti', hint: 'Never take tablets on an empty stomach.' },
      { id: 'h4', name: 'Prescribed Daily Tablet', icon: '💊', detail: 'Take morning tablet with full glass of water', hint: 'Match the tablet box label with morning slot.' },
      { id: 'h5', name: '5-Minute Mindful Breathing', icon: '🧘', detail: 'Sit comfortably and practice calm breathing', hint: 'Inhale gently for 4 counts, exhale for 4.' },
    ],
  },
  {
    id: 'courtyard_garden_mission',
    title: 'Sacred Courtyard & Garden Routine',
    category: 'Home & Wellbeing',
    icon: '🌿',
    domain: 'attention',
    context: 'gardening',
    difficulty: 2,
    timeEstimate: '3 mins',
    description: 'Care for the sacred Tulsi plant, clean the verandah, and enjoy morning peace.',
    instruction: 'Complete outdoor mindfulness tasks to stay active and connected with nature.',
    items: [
      { id: 'g1', name: 'Copper Lota Fresh Water', icon: '🪣', detail: 'Fill clean water in traditional brass or copper lota', hint: 'Rinse lota and fill with fresh cool water.' },
      { id: 'g2', name: 'Water Sacred Tulsi Shrine', icon: '🌿', detail: 'Offer gentle water to Tulsi plant roots', hint: 'Water steadily while greeting the morning sun.' },
      { id: 'g3', name: 'Sweep Verandah Fallen Leaves', icon: '🧹', detail: 'Gently sweep front courtyard and threshold', hint: 'Keep the entryway tidy and safe from tripping.' },
      { id: 'g4', name: 'Gather Fresh Garden Flowers', icon: '🌺', detail: 'Collect fresh hibiscus or marigold blossoms', hint: 'Pick gently from lower flower branches.' },
      { id: 'g5', name: 'Evening Brass Diya Preparation', icon: '🪔', detail: 'Wipe brass lamp and place cotton wick with oil', hint: 'Ready for lighting during twilight dusk.' },
    ],
  },
];

interface Props {
  onBack: () => void;
  onOpenTransferProtocol?: () => void;
}

export const RealLifeMissionsView: React.FC<Props> = ({ onBack, onOpenTransferProtocol }) => {
  const { t } = useLocalization();
  const [selectedMission, setSelectedMission] = useState<MissionDefinition>(MISSIONS[0]);
  const [missionState, setMissionState] = useState<'selector' | 'preview' | 'executing' | 'completed'>('selector');
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<number>(0);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<{
    score: number;
    completedCount: number;
    total: number;
    transferPercent: number;
  } | null>(null);

  const handleSelectMission = (mission: MissionDefinition) => {
    setSelectedMission(mission);
    setCheckedItemIds(new Set());
    setActiveHint(null);
    setMissionState('preview');
  };

  const startMission = () => {
    setMissionState('executing');
    setCheckedItemIds(new Set());
    setActiveHint(null);
    setStartTime(Date.now());
    SpeechService.speakMissionInstruction(selectedMission.title);
  };

  const toggleItem = (id: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRequestHint = () => {
    const nextUnchecked = selectedMission.items.find((item) => !checkedItemIds.has(item.id));
    if (nextUnchecked) {
      setActiveHint(`${nextUnchecked.name}: ${nextUnchecked.hint}`);
      SpeechService.speak(nextUnchecked.hint);
    } else {
      setActiveHint('All items are complete! You are ready to finish the mission.');
      SpeechService.speak('All items are complete! You are ready to finish.');
    }
  };

  const finishMission = async () => {
    const elapsedMs = Math.max(1000, Date.now() - startTime);
    const completedCount = checkedItemIds.size;
    const total = selectedMission.items.length;
    const rawScore = Number((completedCount / total).toFixed(2));
    const transferPercent = Math.round(rawScore * 100);

    setTransferResult({
      score: rawScore,
      completedCount,
      total,
      transferPercent,
    });

    // Record functional observation into IndexedDB
    const patient = OfflineStorageService.getPatientProfile();
    const realLifeObs: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: patient.patientId,
      domain: selectedMission.domain,
      taskId: selectedMission.id,
      context: selectedMission.context,
      difficulty: selectedMission.difficulty,
      metrics: {
        rawScore,
        itemsPresented: total,
        itemsCorrect: completedCount,
        completionTimeMs: elapsedMs,
        hesitationCount: 0,
        cueAssistanceCount: total - completedCount,
      },
      environmentalFactors: {
        timeOfDay: 'morning',
        inputMethod: 'touch',
      },
      timestamp: new Date().toISOString(),
    };

    await OfflineStorageService.recordObservation(realLifeObs);

    // Evaluate transfer if baseline observation exists
    const allObs = OfflineStorageService.getObservations();
    const trainingObs = allObs.filter((o) => o.domain === selectedMission.domain);
    if (trainingObs.length > 0) {
      const baseline = trainingObs[0];
      const transferEval = calculateRealLifeTransfer(baseline, realLifeObs, trainingObs.slice(1));
      OfflineStorageService.enqueueSyncEvent('transfer_evaluated', transferEval as any);
    }

    SpeechService.speakFeedback('summary', completedCount, total);
    setMissionState('completed');
  };

  const resetToSelector = () => {
    setCheckedItemIds(new Set());
    setActiveHint(null);
    setTransferResult(null);
    setMissionState('selector');
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 90 }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (missionState === 'selector') {
              onBack();
            } else {
              setMissionState('selector');
            }
          }}
          aria-label="Go Back"
          style={{
            border: 'none',
            background: '#FFFFFF',
            borderRadius: 14,
            width: 48,
            height: 48,
            fontSize: 24,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            color: '#123B63',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}
        >
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: '#17324D' }}>
            {t('missions.title')}
          </h2>
          <span style={{ fontSize: 15, color: '#64748B', fontWeight: 600 }}>
            {t('missions.subtitle')}
          </span>
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* ---------------------------------------------------- */}
      {/* STATE 1: MISSION SELECTOR HUB */}
      {/* ---------------------------------------------------- */}
      {missionState === 'selector' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: '20px 24px',
              border: '2px solid #DDE5ED',
              boxShadow: '0 4px 16px rgba(18, 59, 99, 0.04)',
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0', color: '#17324D' }}>
              Choose Today's Real-Life Mission
            </h3>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
              Practice genuine daily routines to strengthen cognitive memory, planning, and self-confidence at home.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {MISSIONS.map((mission) => (
              <div
                key={mission.id}
                onClick={() => handleSelectMission(mission)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 22,
                  padding: 22,
                  border: '2px solid #DDE5ED',
                  boxShadow: '0 4px 14px rgba(18, 59, 99, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.18s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 44 }}>{mission.icon}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span
                        style={{
                          backgroundColor: '#EAF4FF',
                          color: '#1677D2',
                          borderRadius: 8,
                          padding: '3px 10px',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {mission.timeEstimate}
                      </span>
                      <span
                        style={{
                          backgroundColor: '#E8F7EF',
                          color: '#2E7D32',
                          borderRadius: 8,
                          padding: '3px 10px',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {mission.domain.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0', color: '#17324D' }}>
                    {mission.title}
                  </h3>
                  <div style={{ fontSize: 13, color: '#1677D2', fontWeight: 700, marginBottom: 8 }}>
                    {mission.category}
                  </div>
                  <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    {mission.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #EEF2F6',
                    paddingTop: 12,
                  }}
                >
                  <span style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>
                    {mission.items.length} Interactive Steps
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#1677D2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Select Mission ➔
                  </span>
                </div>
              </div>
            ))}
          </div>

          {onOpenTransferProtocol && (
            <button
              type="button"
              onClick={onOpenTransferProtocol}
              style={{
                marginTop: 10,
                backgroundColor: '#FFFFFF',
                color: '#1677D2',
                border: '2px solid #1677D2',
                borderRadius: 18,
                padding: '16px',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              🔄 Launch Full 3-Step Real-Life Transfer Protocol
            </button>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STATE 2: MISSION PREVIEW & STUDY */}
      {/* ---------------------------------------------------- */}
      {missionState === 'preview' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 28,
            border: '2px solid #DDE5ED',
            boxShadow: '0 4px 18px rgba(18, 59, 99, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 22,
                backgroundColor: '#FFF7DC',
                border: '2px solid #F5C451',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                flexShrink: 0,
              }}
            >
              {selectedMission.icon}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ backgroundColor: '#EAF4FF', color: '#1677D2', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  {selectedMission.category}
                </span>
                <span style={{ backgroundColor: '#E8F7EF', color: '#2E7D32', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  {selectedMission.timeEstimate}
                </span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#17324D' }}>
                {selectedMission.title}
              </h3>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1677D2', marginBottom: 4 }}>
              MISSION GOAL & INSTRUCTIONS
            </div>
            <p style={{ fontSize: 16, color: '#1E293B', margin: 0, lineHeight: 1.5 }}>
              {selectedMission.instruction}
            </p>
          </div>

          <h4 style={{ fontSize: 17, fontWeight: 800, color: '#17324D', margin: '0 0 12px 0' }}>
            Mission Tasks Overview ({selectedMission.items.length} tasks):
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {selectedMission.items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  backgroundColor: '#F7F9FC',
                  borderRadius: 16,
                  padding: '12px 16px',
                  border: '1px solid #DDE5ED',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#EAF4FF',
                    color: '#1677D2',
                    fontWeight: 800,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#17324D' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 14, color: '#64748B' }}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => setMissionState('selector')}
              style={{
                flex: 1,
                backgroundColor: '#F1F5F9',
                color: '#17324D',
                border: 'none',
                borderRadius: 18,
                padding: '16px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Choose Other
            </button>
            <button
              type="button"
              onClick={startMission}
              style={{
                flex: 2,
                backgroundColor: '#1677D2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 18,
                padding: '16px',
                fontSize: 18,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(22, 119, 210, 0.25)',
              }}
            >
              <span>Begin Mission Tasks</span>
              <span>▶</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STATE 3: INTERACTIVE EXECUTION */}
      {/* ---------------------------------------------------- */}
      {missionState === 'executing' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 26,
            border: '2px solid #DDE5ED',
            boxShadow: '0 4px 18px rgba(18, 59, 99, 0.06)',
          }}
        >
          {/* Progress Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#17324D' }}>
                {selectedMission.title}
              </h3>
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                Tap each task as you complete or verify it
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestHint}
              style={{
                backgroundColor: '#FFF7DC',
                border: '1.5px solid #F5C451',
                color: '#8D6B00',
                padding: '6px 14px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              💡 Need Hint?
            </button>
          </div>

          {/* Hint Card */}
          {activeHint && (
            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #FCD34D',
                borderRadius: 14,
                padding: '12px 16px',
                marginBottom: 16,
                color: '#92400E',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              💡 <strong>Hint:</strong> {activeHint}
            </div>
          )}

          {/* Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {selectedMission.items.map((item, idx) => {
              const isChecked = checkedItemIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isChecked ? '#E8F7EF' : '#F7F9FC',
                    border: `2px solid ${isChecked ? '#10B981' : '#DDE5ED'}`,
                    borderRadius: 18,
                    padding: '14px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: isChecked ? '#10B981' : '#E2E8F0',
                        color: isChecked ? '#FFFFFF' : '#475569',
                        fontWeight: 800,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: 32 }}>{item.icon}</span>
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: isChecked ? '#065F46' : '#17324D',
                          textDecoration: isChecked ? 'line-through' : 'none',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 13, color: isChecked ? '#047857' : '#64748B' }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      border: `2px solid ${isChecked ? '#10B981' : '#94A3B8'}`,
                      backgroundColor: isChecked ? '#10B981' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: 18,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {isChecked ? '✓' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
              <span>Completed Tasks:</span>
              <span style={{ color: '#1677D2', fontWeight: 800 }}>
                {checkedItemIds.size} of {selectedMission.items.length} ({Math.round((checkedItemIds.size / selectedMission.items.length) * 100)}%)
              </span>
            </div>
            <div style={{ height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(checkedItemIds.size / selectedMission.items.length) * 100}%`,
                  backgroundColor: '#10B981',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={finishMission}
            style={{
              width: '100%',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 18,
              padding: '16px',
              fontSize: 18,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
            }}
          >
            Complete Mission & Evaluate Transfer ✓
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STATE 4: COMPLETION & COGNITIVE TRANSFER FEEDBACK */}
      {/* ---------------------------------------------------- */}
      {missionState === 'completed' && transferResult && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 32,
            border: '2px solid #E8F7EF',
            boxShadow: '0 6px 22px rgba(16, 185, 129, 0.12)',
            textAlign: 'center',
          }}
        >
          {/* Celebratory Icon */}
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: '#FFF7DC',
              border: '3px solid #F5C451',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 46,
              margin: '0 auto 16px auto',
            }}
          >
            😊
          </div>

          <h3 style={{ fontSize: 28, fontWeight: 900, color: '#17324D', margin: '0 0 6px 0' }}>
            Mission Accomplished!
          </h3>
          <p style={{ fontSize: 18, color: '#10B981', fontWeight: 700, margin: '0 0 16px 0' }}>
            {selectedMission.title}
          </p>

          {/* Results Summary Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Tasks Completed</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#17324D', marginTop: 4 }}>
                {transferResult.completedCount} / {transferResult.total}
              </div>
            </div>

            <div style={{ backgroundColor: '#E8F7EF', borderRadius: 16, padding: 16, border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: 13, color: '#065F46', fontWeight: 700 }}>Real-Life Transfer</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#047857', marginTop: 4 }}>
                +{transferResult.transferPercent}%
              </div>
            </div>

            <div style={{ backgroundColor: '#EAF4FF', borderRadius: 16, padding: 16, border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 13, color: '#0369A1', fontWeight: 700 }}>Everyday Independence</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0284C7', marginTop: 6 }}>
                Strong Support ✓
              </div>
            </div>
          </div>

          {/* Task Breakdown */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 18,
              padding: 18,
              border: '1.5px solid #E2E8F0',
              marginBottom: 24,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 800, color: '#17324D', marginBottom: 10 }}>
              Tasks Review:
            </div>
            {selectedMission.items.map((item) => {
              const isDone = checkedItemIds.has(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #EEF2F6',
                    fontSize: 15,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ fontWeight: 600, color: isDone ? '#065F46' : '#991B1B' }}>
                      {item.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isDone ? '#10B981' : '#EF4444',
                      backgroundColor: isDone ? '#DCFCE7' : '#FEE2E2',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {isDone ? '✓ Verified' : '✕ Missed'}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={resetToSelector}
              style={{
                flex: 1,
                backgroundColor: '#F1F5F9',
                color: '#17324D',
                border: 'none',
                borderRadius: 16,
                padding: '14px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Choose Other Mission
            </button>
            <button
              type="button"
              onClick={onBack}
              style={{
                flex: 1,
                backgroundColor: '#1677D2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 16,
                padding: '14px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Return Home 🏠
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
