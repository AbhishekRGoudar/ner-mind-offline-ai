import { TaskContext } from '../../types/observation.js';
import { PRNG } from '../prng.js';

export interface PlanActivity {
  id: string;
  name: string;
  icon: string;
  timeSlot: 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  expectedOrderIndex: number;
  prerequisiteActivityId?: string;
  timeConstraintText?: string;
  context: TaskContext;
}

export interface PlanningScheduleTemplate {
  id: string;
  title: string;
  context: TaskContext;
  minDifficulty: 1 | 2 | 3 | 4 | 5;
  maxDifficulty: 1 | 2 | 3 | 4 | 5;
  activities: PlanActivity[];
  rules: string[];
}

// Rich pool of contextual activities
export const ACTIVITY_POOLS = {
  early_morning: [
    { id: 'act_morning_tea', name: 'Morning Warm Tea & Garden Walk', icon: '🌅', context: 'routine' as TaskContext },
    { id: 'act_dawn_prayer', name: 'Dawn Family Courtyard Prayer', icon: '🪔', context: 'routine' as TaskContext },
    { id: 'act_fasting_water', name: 'Morning Filtered Water from Brass Lota', icon: '🥛', context: 'routine' as TaskContext },
    { id: 'act_sweep_courtyard', name: 'Gently Sweep Earthen Courtyard with Broom', icon: '🧹', context: 'household' as TaskContext },
    { id: 'act_check_weather', name: 'Observe Morning Sky & River Mist on Veranda', icon: '🌤️', context: 'routine' as TaskContext },
  ],
  morning: [
    { id: 'act_bazaar_visit', name: 'Visit Morning Fresh Vegetable Bazaar', icon: '🧺', context: 'market' as TaskContext },
    { id: 'act_tulsi_water', name: 'Water Courtyard Sacred Tulsi & Orchids', icon: '🪴', context: 'gardening' as TaskContext },
    { id: 'act_rural_bank', name: 'Visit Gramin Bank Counter to Update Passbook', icon: '🏦', context: 'community' as TaskContext },
    { id: 'act_weavers_loom', name: 'Check Eri Silk Yarn Skeins on Traditional Loom', icon: '🧶', context: 'craft' as TaskContext },
    { id: 'act_flower_garland', name: 'String Fresh Orange Marigolds for Altar', icon: '🌼', context: 'gardening' as TaskContext },
    { id: 'act_harvest_greens', name: 'Pick Crisp Mustard Greens from Garden Bed', icon: '🥬', context: 'gardening' as TaskContext },
    { id: 'act_feed_pigeons', name: 'Scatter Paddy Grains for Courtyard Doves', icon: '🕊️', context: 'gardening' as TaskContext },
    { id: 'act_clean_bath', name: 'Morning Warm Bath and Fresh Cotton Clothes', icon: '🧖', context: 'routine' as TaskContext },
  ],
  midday: [
    { id: 'act_cook_rice_lunch', name: 'Cook Fragrant Joha Rice and Lentils', icon: '🍲', context: 'kitchen' as TaskContext },
    { id: 'act_family_lunch', name: 'Enjoy Nutritious Lunch on Bell-Metal Kahi', icon: '🍽️', context: 'household' as TaskContext },
    { id: 'act_pharmacy_counter', name: 'Pick Up Prescribed Blood Pressure Tablets', icon: '💊', context: 'community' as TaskContext },
    { id: 'act_wash_dishes', name: 'Rinse Bell Metal Platters in Clean Spring Water', icon: '🧽', context: 'kitchen' as TaskContext },
    { id: 'act_noon_devotion', name: 'Listen to Noon Devotional Chants on Radio', icon: '📻', context: 'community' as TaskContext },
    { id: 'act_post_office', name: 'Mail Village Greeting Card at Post Office', icon: '✉️', context: 'community' as TaskContext },
  ],
  afternoon: [
    { id: 'act_veranda_rest', name: 'Peaceful Rest on Bamboo Cane Chair', icon: '🪑', context: 'household' as TaskContext },
    { id: 'act_grind_spices', name: 'Grind Fresh Turmeric and Ginger on Stone Slab', icon: '🪨', context: 'kitchen' as TaskContext },
    { id: 'act_mend_cloth', name: 'Mend Handwoven Gamusa Hem with Thread', icon: '🪡', context: 'craft' as TaskContext },
    { id: 'act_caregiver_walk', name: 'Gentle Afternoon Stroll with Caregiver in Lane', icon: '🚶', context: 'routine' as TaskContext },
    { id: 'act_sift_grain', name: 'Sift Rice Grains using Bamboo Kula Fan', icon: '🌾', context: 'household' as TaskContext },
    { id: 'act_sort_seeds', name: 'Sort Vegetable Seeds into Dry Earthen Jars', icon: '🫙', context: 'gardening' as TaskContext },
  ],
  evening: [
    { id: 'act_evening_diya', name: 'Light Sacred Mustard Oil Diya Lamp', icon: '🪔', context: 'routine' as TaskContext },
    { id: 'act_ginger_tea', name: 'Brew Warm Ginger Tea for Evening Family Time', icon: '🍵', context: 'routine' as TaskContext },
    { id: 'act_organize_pills', name: 'Sort Evening Vitamins into Weekly Pill Box', icon: '💊', context: 'routine' as TaskContext },
    { id: 'act_community_chat', name: 'Sit with Village Elders at Community Pavilion', icon: '🧓', context: 'community' as TaskContext },
    { id: 'act_sunset_view', name: 'Watch Sunset Colors over River Brahmaputra', icon: '🌄', context: 'routine' as TaskContext },
    { id: 'act_lock_coop', name: 'Secure Backyard Bamboo Chicken Coop for Night', icon: '🔒', context: 'household' as TaskContext },
  ],
  night: [
    { id: 'act_light_dinner', name: 'Warm Soup and Light Steamed Dinner', icon: '🥣', context: 'kitchen' as TaskContext },
    { id: 'act_lock_front_gate', name: 'Check Front Bamboo Gate Latches Securely', icon: '🔐', context: 'household' as TaskContext },
    { id: 'act_retire_bed', name: 'Peaceful Night Sleep with Window Breeze', icon: '🌙', context: 'routine' as TaskContext },
  ],
};

/**
 * Procedurally generates a planning schedule with N activities (where N = 2 + difficulty).
 * Chooses activities across chronological time slots, guaranteeing valid ordering.
 */
export function generateProceduralSchedule(
  difficulty: 1 | 2 | 3 | 4 | 5,
  prng: PRNG,
  preferredContext?: TaskContext
): PlanningScheduleTemplate {
  const activityCount = Math.min(7, 2 + difficulty);

  // Time slot distribution by difficulty
  // L1 (3): early_morning, midday, evening
  // L2 (4): early_morning, morning, midday, evening
  // L3 (5): early_morning, morning (x2), midday, evening
  // L4 (6): early_morning, morning (x2), midday, afternoon, evening
  // L5 (7): early_morning, morning (x2), midday, afternoon, evening, night
  const chosenActivities: PlanActivity[] = [];

  const pickActivity = (
    pool: typeof ACTIVITY_POOLS.early_morning,
    slot: PlanActivity['timeSlot'],
    orderIdx: number,
    prerequisiteId?: string
  ): PlanActivity => {
    const available = pool.filter(a => !chosenActivities.some(c => c.id === a.id));
    const base = prng.choice(available.length > 0 ? available : pool);
    return {
      id: `${base.id}_${prng.randInt(10, 99)}`,
      name: base.name,
      icon: base.icon,
      timeSlot: slot,
      expectedOrderIndex: orderIdx,
      prerequisiteActivityId: prerequisiteId,
      context: preferredContext || base.context,
    };
  };

  if (activityCount === 3) {
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.early_morning, 'early_morning', 0));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.midday, 'midday', 1));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.evening, 'evening', 2));
  } else if (activityCount === 4) {
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.early_morning, 'early_morning', 0));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.morning, 'morning', 1));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.midday, 'midday', 2));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.evening, 'evening', 3));
  } else if (activityCount === 5) {
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.early_morning, 'early_morning', 0));
    const m1 = pickActivity(ACTIVITY_POOLS.morning, 'morning', 1);
    chosenActivities.push(m1);
    const m2 = pickActivity(ACTIVITY_POOLS.morning, 'morning', 2, m1.id);
    chosenActivities.push(m2);
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.midday, 'midday', 3));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.evening, 'evening', 4));
  } else if (activityCount === 6) {
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.early_morning, 'early_morning', 0));
    const m1 = pickActivity(ACTIVITY_POOLS.morning, 'morning', 1);
    chosenActivities.push(m1);
    const m2 = pickActivity(ACTIVITY_POOLS.morning, 'morning', 2, m1.id);
    chosenActivities.push(m2);
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.midday, 'midday', 3));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.afternoon, 'afternoon', 4));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.evening, 'evening', 5));
  } else {
    // 7 activities
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.early_morning, 'early_morning', 0));
    const m1 = pickActivity(ACTIVITY_POOLS.morning, 'morning', 1);
    chosenActivities.push(m1);
    const m2 = pickActivity(ACTIVITY_POOLS.morning, 'morning', 2, m1.id);
    chosenActivities.push(m2);
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.midday, 'midday', 3));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.afternoon, 'afternoon', 4));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.evening, 'evening', 5));
    chosenActivities.push(pickActivity(ACTIVITY_POOLS.night, 'night', 6));
  }

  const rules: string[] = [
    'Chronological morning-to-night sequence',
    ...(difficulty >= 3 ? ['Respect morning errand prerequisites before midday meals'] : []),
    ...(difficulty >= 4 ? ['Complete village bank/market transactions during business hours'] : []),
  ];

  return {
    id: `sched_diff_${difficulty}_${prng.randInt(1000, 9999)}`,
    title: `Daily Schedule Plan (${activityCount} Activities - Level ${difficulty})`,
    context: preferredContext || 'routine',
    minDifficulty: difficulty,
    maxDifficulty: difficulty,
    activities: chosenActivities,
    rules,
  };
}
