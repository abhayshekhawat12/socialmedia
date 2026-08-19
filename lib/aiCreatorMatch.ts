export interface CreatorMatchResult {
  listingId: string;
  userAddress: string;
  fullName: string;
  creatorType: string;
  category: string;
  location: string;
  startingPrice: number;
  isOpenForCollab: boolean;
  creatorScore: number;
  matchScore: number; // 0 - 100
  matchReasons: string[];
  packages: Array<{ name: string; price: number }>;
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

export function matchCreatorsWithAI(
  prompt: string,
  listings: any[],
  campaignDetails?: { budget?: number; category?: string; location?: string }
): CreatorMatchResult[] {
  const cleanPrompt = prompt.toLowerCase();

  // Extract budget constraint from prompt if present e.g. "under 5000" or "under ₹10,000" or "budget 3000"
  let maxBudget = campaignDetails?.budget || 0;
  const budgetMatch = cleanPrompt.match(/(?:under|below|budget|max|within|₹|rs\.?)\s*(\d+[\d,]*)/i);
  if (budgetMatch && budgetMatch[1]) {
    maxBudget = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
  }

  // Common locations
  const knownLocations = [
    "jaipur", "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", 
    "chennai", "kolkata", "pune", "ahmedabad", "chandigarh", "rajasthan", "punjab", "haryana", "goa"
  ];
  const matchedLocation = knownLocations.find((loc) => cleanPrompt.includes(loc)) || campaignDetails?.location?.toLowerCase() || "";

  // Common categories
  const knownCategories = [
    "fashion", "tech", "technology", "comedy", "music", "travel", 
    "fitness", "education", "food", "lifestyle", "gaming", "beauty", "dance"
  ];
  const matchedCategories = knownCategories.filter((cat) => cleanPrompt.includes(cat));
  if (campaignDetails?.category) {
    matchedCategories.push(campaignDetails.category.toLowerCase());
  }

  // Common promotion types
  const knownPromotions = ["reel", "story", "post", "review", "shoutout", "brand", "event"];
  const matchedPromos = knownPromotions.filter((p) => cleanPrompt.includes(p));

  const results: CreatorMatchResult[] = listings.map((l) => {
    let score = 50; // base score
    const reasons: string[] = [];

    const listingCategory = (l.category || "").toLowerCase();
    const listingType = (l.creatorType || "").toLowerCase();
    const listingLocation = (l.location || "").toLowerCase();
    const startingPrice = Number(l.startingPrice) || 1000;
    const services = (l.services || "").toLowerCase();

    // 1. Category Matching (+20)
    if (matchedCategories.length > 0) {
      const isCatMatch = matchedCategories.some((c) => listingCategory.includes(c) || listingType.includes(c) || l.description?.toLowerCase().includes(c));
      if (isCatMatch) {
        score += 22;
        reasons.push(`✓ Top match for ${l.category} creator category`);
      }
    } else {
      reasons.push(`✓ Active in ${l.category}`);
    }

    // 2. Location Matching (+18)
    if (matchedLocation) {
      if (listingLocation.includes(matchedLocation)) {
        score += 18;
        reasons.push(`✓ Located in ${l.location}`);
      }
    } else if (l.location) {
      reasons.push(`✓ Available from ${l.location}`);
    }

    // 3. Budget Matching (+15)
    if (maxBudget > 0) {
      if (startingPrice <= maxBudget) {
        score += 15;
        reasons.push(`✓ Within your budget (Starting ₹${startingPrice.toLocaleString()} <= ₹${maxBudget.toLocaleString()})`);
      } else {
        score -= 15;
      }
    } else {
      reasons.push(`✓ Packages starting at ₹${startingPrice.toLocaleString()}`);
    }

    // 4. Promotion Service Match (+10)
    if (matchedPromos.length > 0) {
      const isPromoMatch = matchedPromos.some((p) => services.includes(p) || l.description?.toLowerCase().includes(p));
      if (isPromoMatch) {
        score += 10;
        reasons.push(`✓ Offers requested deliverables (${matchedPromos.join(", ")})`);
      }
    }

    // 5. Availability (+5)
    if (l.isOpenForCollab) {
      score += 5;
      reasons.push(`✓ 🟢 Currently Open for Collaboration`);
    }

    // Calculate dynamic creator score from ratings and activity
    const creatorScore = Math.min(99, Math.max(75, 85 + (l.reviews?.length || 0) * 3));

    if (creatorScore >= 90) {
      score += 5;
      reasons.push(`✓ High Creator Trust Score (${creatorScore}/100)`);
    }

    // Parse packages safely
    let packagesList: any[] = [];
    try {
      if (typeof l.packages === "string") {
        packagesList = JSON.parse(l.packages);
      } else if (Array.isArray(l.packages)) {
        packagesList = l.packages;
      }
    } catch {
      packagesList = [
        { name: "Story", price: Math.round(startingPrice * 0.5) },
        { name: "Post", price: startingPrice },
        { name: "Reel", price: Math.round(startingPrice * 1.5) },
      ];
    }

    const finalMatchScore = Math.min(99, Math.max(45, score));

    return {
      listingId: l.id,
      userAddress: l.userAddress,
      fullName: l.fullName,
      creatorType: l.creatorType,
      category: l.category,
      location: l.location || "India",
      startingPrice,
      isOpenForCollab: l.isOpenForCollab,
      creatorScore,
      matchScore: finalMatchScore,
      matchReasons: reasons.slice(0, 4),
      packages: packagesList,
      profile: {
        username: l.profile?.username || `user_${l.userAddress.slice(0, 8)}`,
        displayName: l.profile?.displayName || l.fullName,
        avatarUrl: l.profile?.avatarUrl || "",
      },
    };
  });

  // Sort descending by matchScore
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
