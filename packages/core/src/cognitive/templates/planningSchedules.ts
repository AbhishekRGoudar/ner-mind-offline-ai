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
    { id: 'act_light_morning_incense', name: 'Light Jasmine Incense at Family Shrine', icon: '🪔', context: 'routine' as TaskContext },
    { id: 'act_feed_courtyard_chickens', name: 'Feed Crushed Maize to Backyard Chickens', icon: '🐔', context: 'household' as TaskContext },
    { id: 'act_fold_morning_bedding', name: 'Neatly Fold Handwoven Bedding and Quilts', icon: '🛏️', context: 'household' as TaskContext },
    { id: 'act_morning_eyewear_clean', name: 'Wipe Eyeglasses with Soft Microfiber Cloth', icon: '👓', context: 'routine' as TaskContext },
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
    { id: 'act_sun_dry_paddy', name: 'Spread Golden Paddy Grains on Bamboo Mats', icon: '🌾', context: 'gardening' as TaskContext },
    { id: 'act_organize_spices', name: 'Refill Brass Spice Containers with Turmeric', icon: '🫙', context: 'kitchen' as TaskContext },
  ],
  midday: [
    { id: 'act_cook_rice_lunch', name: 'Cook Fragrant Joha Rice and Lentils', icon: '🍲', context: 'kitchen' as TaskContext },
    { id: 'act_family_lunch', name: 'Enjoy Nutritious Lunch on Bell-Metal Kahi', icon: '🍽️', context: 'household' as TaskContext },
    { id: 'act_pharmacy_counter', name: 'Pick Up Prescribed Blood Pressure Tablets', icon: '💊', context: 'community' as TaskContext },
    { id: 'act_wash_dishes', name: 'Rinse Bell Metal Platters in Clean Spring Water', icon: '🧽', context: 'kitchen' as TaskContext },
    { id: 'act_noon_devotion', name: 'Listen to Noon Devotional Chants on Radio', icon: '📻', context: 'community' as TaskContext },
    { id: 'act_post_office', name: 'Mail Village Greeting Card at Post Office', icon: '✉️', context: 'community' as TaskContext },
    { id: 'act_check_curd_pot', name: 'Check Setting of Cream Buffalo Milk Curd', icon: '🥛', context: 'kitchen' as TaskContext },
    { id: 'act_midday_hydration', name: 'Drink Cool Coconut Water from Brass Cup', icon: '🥥', context: 'routine' as TaskContext },
  ],
  afternoon: [
    { id: 'act_veranda_rest', name: 'Peaceful Rest on Bamboo Cane Chair', icon: '🪑', context: 'household' as TaskContext },
    { id: 'act_grind_spices', name: 'Grind Fresh Turmeric and Ginger on Stone Slab', icon: '🪨', context: 'kitchen' as TaskContext },
    { id: 'act_mend_cloth', name: 'Mend Handwoven Gamusa Hem with Thread', icon: '🪡', context: 'craft' as TaskContext },
    { id: 'act_caregiver_walk', name: 'Gentle Afternoon Stroll with Caregiver in Lane', icon: '🚶', context: 'routine' as TaskContext },
    { id: 'act_sift_grain', name: 'Sift Rice Grains using Bamboo Kula Fan', icon: '🌾', context: 'household' as TaskContext },
    { id: 'act_sort_seeds', name: 'Sort Vegetable Seeds into Dry Earthen Jars', icon: '🫙', context: 'gardening' as TaskContext },
    { id: 'act_read_assamese_daily', name: 'Read Regional Daily Newspaper on Veranda', icon: '📰', context: 'routine' as TaskContext },
    { id: 'act_slice_betel_nuts', name: 'Slice Fresh Areca Nuts with Brass Sarota', icon: '🔪', context: 'household' as TaskContext },
  ],
  evening: [
    { id: 'act_evening_diya', name: 'Light Sacred Mustard Oil Diya Lamp', icon: '🪔', context: 'routine' as TaskContext },
    { id: 'act_ginger_tea', name: 'Brew Warm Ginger Tea for Evening Family Time', icon: '🍵', context: 'routine' as TaskContext },
    { id: 'act_organize_pills', name: 'Sort Evening Vitamins into Weekly Pill Box', icon: '💊', context: 'routine' as TaskContext },
    { id: 'act_community_chat', name: 'Sit with Village Elders at Community Pavilion', icon: '🧓', context: 'community' as TaskContext },
    { id: 'act_sunset_view', name: 'Watch Sunset Colors over River Brahmaputra', icon: '🌄', context: 'routine' as TaskContext },
    { id: 'act_lock_coop', name: 'Secure Backyard Bamboo Chicken Coop for Night', icon: '🔒', context: 'household' as TaskContext },
    { id: 'act_close_wooden_shutters', name: 'Fasten Wooden Veranda Window Latches', icon: '🪟', context: 'household' as TaskContext },
    { id: 'act_evening_dhoop', name: 'Light Fragrant Camphor Dhoop in Brass Censer', icon: '💨', context: 'routine' as TaskContext },
  ],
  night: [
    { id: 'act_light_dinner', name: 'Warm Soup and Light Steamed Dinner', icon: '🥣', context: 'kitchen' as TaskContext },
    { id: 'act_lock_front_gate', name: 'Check Front Bamboo Gate Latches Securely', icon: '🔐', context: 'household' as TaskContext },
    { id: 'act_retire_bed', name: 'Peaceful Night Sleep with Window Breeze', icon: '🌙', context: 'routine' as TaskContext },
    { id: 'act_drink_warm_water', name: 'Sip Small Cup of Warm Spiced Water', icon: '🫖', context: 'routine' as TaskContext },
    { id: 'act_set_alarm_clock', name: 'Place Wind-up Clock on Bedside Wooden Table', icon: '⏰', context: 'routine' as TaskContext },
  ],
};

/**
 * Procedurally generates a planning schedule with N activities (where N = 2 + difficulty).
 * Chooses activities across chronological time slots, guaranteeing valid ordering and avoiding recently used activities.
 */
export function generateProceduralSchedule(
  difficulty: 1 | 2 | 3 | 4 | 5,
  prng: PRNG,
  preferredContext?: TaskContext,
  recentFingerprints: string[] = []
): PlanningScheduleTemplate {
  const activityCount = Math.min(7, 2 + difficulty);

  // Extract recent activity IDs from fingerprint history
  const recentActIds = new Set<string>();
  recentFingerprints.forEach(fp => {
    const parts = fp.split(':');
    if (parts.length >= 3) {
      parts[2]?.split(',').forEach(id => recentActIds.add(id.replace(/_[0-9]+$/, '')));
    } else {
      recentActIds.add(fp.replace(/_[0-9]+$/, ''));
    }
  });

  const chosenActivities: PlanActivity[] = [];

  const pickActivity = (
    pool: typeof ACTIVITY_POOLS.early_morning,
    slot: PlanActivity['timeSlot'],
    orderIdx: number,
    prerequisiteId?: string
  ): PlanActivity => {
    const available = pool.filter(a => !chosenActivities.some(c => c.id === a.id));
    const unpicked = available.filter(a => !recentActIds.has(a.id));
    const poolToUse = unpicked.length > 0 ? unpicked : available.length > 0 ? available : pool;
    const base = prng.choice(poolToUse);
    return {
      id: base.id, // Deterministic ID ensures reliable anti-repetition tracking!
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

  const schedSig = chosenActivities.map(a => a.id).join('_');
  return {
    id: `sched_diff_${difficulty}_${schedSig}`,
    title: `Daily Schedule Plan (${activityCount} Activities - Level ${difficulty})`,
    context: preferredContext || 'routine',
    minDifficulty: difficulty,
    maxDifficulty: difficulty,
    activities: chosenActivities,
    rules,
  };
}
