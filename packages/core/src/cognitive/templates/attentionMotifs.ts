import { TaskContext } from '../../types/observation.js';

export interface AttentionMotif {
  id: string;
  icon: string;
  name: string;
  family: 'floral' | 'geometric' | 'solar' | 'textile_weave' | 'sacred' | 'nature';
  visualSimilarityGroup: 1 | 2 | 3 | 4; // Higher group = more visually similar to each other
  context: TaskContext;
}

export const REGIONAL_ATTENTION_MOTIFS: AttentionMotif[] = [
  // Floral Motifs
  { id: 'lotus_bloom', icon: '🪷', name: 'Manipuri Lotus Motif', family: 'floral', visualSimilarityGroup: 1, context: 'craft' },
  { id: 'kopou_orchid_bloom', icon: '🌸', name: 'Assam Orchid Motif', family: 'floral', visualSimilarityGroup: 1, context: 'craft' },
  { id: 'hibiscus_motif', icon: '🌺', name: 'Red Jaba (Hibiscus) Motif', family: 'floral', visualSimilarityGroup: 1, context: 'craft' },
  { id: 'sunflower_rosette', icon: '🌻', name: 'Golden Rosette', family: 'floral', visualSimilarityGroup: 1, context: 'craft' },
  { id: 'jasmine_bud', icon: '🌼', name: 'White Sewali Star Flower', family: 'floral', visualSimilarityGroup: 1, context: 'craft' },

  // Textile & Weaving Geometric Motifs (Gamusa / Karbi / Bodo Diamond Weaves)
  { id: 'gamusa_diamond', icon: '💠', name: 'Gamusa Diamond Weave', family: 'textile_weave', visualSimilarityGroup: 2, context: 'craft' },
  { id: 'bodo_hajw_triangle', icon: '🔺', name: 'Bodo Mountain Triangle Weave', family: 'textile_weave', visualSimilarityGroup: 2, context: 'craft' },
  { id: 'rhombus_double', icon: '🔷', name: 'Double Rhombus border', family: 'textile_weave', visualSimilarityGroup: 2, context: 'craft' },
  { id: 'checkered_cross', icon: '⏹️', name: 'Karbi Geometric Square Weave', family: 'textile_weave', visualSimilarityGroup: 2, context: 'craft' },
  { id: 'star_diamond', icon: '❇️', name: 'Mishing Eight-Pointed Star', family: 'textile_weave', visualSimilarityGroup: 2, context: 'craft' },
  { id: 'sparkle_weave', icon: '✳️', name: 'Sutiya Brocade Star', family: 'textile_weave', visualSimilarityGroup: 2, context: 'craft' },

  // Solar & Sacred Emblems
  { id: 'sun_dial', icon: '☀️', name: 'Sun Radiant Motif', family: 'solar', visualSimilarityGroup: 3, context: 'community' },
  { id: 'wheel_dharmachakra', icon: '☸️', name: 'Traditional Weave Wheel', family: 'sacred', visualSimilarityGroup: 3, context: 'craft' },
  { id: 'sacred_diya', icon: '🪔', name: 'Clay Diya Flame Pattern', family: 'sacred', visualSimilarityGroup: 3, context: 'routine' },
  { id: 'spiral_cyclone', icon: '🌀', name: 'River Vortex Symbol', family: 'sacred', visualSimilarityGroup: 3, context: 'community' },
  { id: 'conch_shell_spiral', icon: '🐚', name: 'Sacred Shankha Conch Motif', family: 'sacred', visualSimilarityGroup: 3, context: 'community' },

  // Nature & Plant Motifs
  { id: 'bamboo_stalks', icon: '🎋', name: 'Bamboo Cluster Symbol', family: 'nature', visualSimilarityGroup: 4, context: 'gardening' },
  { id: 'tea_leaf_paired', icon: '🍃', name: 'Twin Tea Leaves', family: 'nature', visualSimilarityGroup: 4, context: 'gardening' },
  { id: 'fertile_seedling', icon: '🌱', name: 'Spring Rice Sprout', family: 'nature', visualSimilarityGroup: 4, context: 'gardening' },
  { id: 'four_leaf_clover', icon: '🍀', name: 'Brahmaputra Valley Clover', family: 'nature', visualSimilarityGroup: 4, context: 'gardening' },
  { id: 'pine_needle_sprig', icon: '🌲', name: 'Shillong Pine Needle Sprig', family: 'nature', visualSimilarityGroup: 4, context: 'craft' },
  { id: 'betel_leaf_heart', icon: '💚', name: 'Sacred Pan Heart Motif', family: 'nature', visualSimilarityGroup: 4, context: 'craft' },
];
