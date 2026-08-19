import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const type = searchParams.get("type"); // promotion | hiring | all
    const category = searchParams.get("category");
    const creatorType = searchParams.get("creatorType");
    const location = searchParams.get("location")?.toLowerCase();
    const maxBudget = searchParams.get("maxBudget") ? Number(searchParams.get("maxBudget")) : null;
    const onlyOpenCollab = searchParams.get("openCollab") === "true";
    const query = searchParams.get("q")?.trim().toLowerCase();

    // If fetching user's own listing specifically
    if (searchParams.get("myListing") === "true" && userAddress) {
      const listing = await prisma.hiringListing.findUnique({
        where: { userAddress },
        include: {
          requests: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return NextResponse.json({ success: true, listing });
    }

    const where: any = {};
    if (type && type !== "all") {
      where.listingType = type;
    }
    if (category && category !== "All" && category !== "all") {
      where.category = category;
    }
    if (creatorType && creatorType !== "All" && creatorType !== "all") {
      where.creatorType = creatorType;
    }
    if (onlyOpenCollab) {
      where.isOpenForCollab = true;
    }
    if (maxBudget && maxBudget > 0) {
      where.startingPrice = { lte: maxBudget };
    }

    let listings = await prisma.hiringListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (query) {
      listings = listings.filter(
        (l) =>
          l.fullName.toLowerCase().includes(query) ||
          l.creatorType.toLowerCase().includes(query) ||
          l.category.toLowerCase().includes(query) ||
          l.location.toLowerCase().includes(query) ||
          l.description.toLowerCase().includes(query) ||
          l.services.toLowerCase().includes(query)
      );
    }

    if (location) {
      listings = listings.filter((l) => l.location.toLowerCase().includes(location));
    }

    // Enrich with creator Profile info, followers count, and saved status
    const userAddresses = Array.from(new Set(listings.map((l) => l.userAddress.toLowerCase())));
    const profiles = await prisma.profile.findMany({
      where: { user: { walletAddress: { in: userAddresses } } },
      include: { user: true },
    });

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.user?.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });

    // Check saved status if userAddress is provided
    let savedListingIds = new Set<string>();
    if (userAddress) {
      const userSaved = await prisma.savedCreator.findMany({
        where: { userAddress },
      });
      savedListingIds = new Set(userSaved.map((s) => s.listingId));
    }

    // Fetch review ratings
    const reviews = await prisma.collabReview.findMany({
      where: { targetAddress: { in: userAddresses } },
    });

    const reviewsMap = new Map<string, any[]>();
    reviews.forEach((r) => {
      const list = reviewsMap.get(r.targetAddress.toLowerCase()) || [];
      list.push(r);
      reviewsMap.set(r.targetAddress.toLowerCase(), list);
    });

    const enriched = listings.map((l) => {
      const p = profileMap.get(l.userAddress.toLowerCase());
      const userReviews = reviewsMap.get(l.userAddress.toLowerCase()) || [];
      const avgRating =
        userReviews.length > 0
          ? userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length
          : 4.9;

      const creatorScore = Math.min(99, Math.max(78, Math.round(85 + userReviews.length * 2.5)));

      let packagesList = [];
      try {
        packagesList = typeof l.packages === "string" ? JSON.parse(l.packages) : l.packages;
      } catch {
        packagesList = [
          { name: "Story", price: Math.round(l.startingPrice * 0.5) },
          { name: "Post", price: l.startingPrice },
          { name: "Reel", price: Math.round(l.startingPrice * 1.8) },
        ];
      }

      return {
        ...l,
        creatorScore,
        averageRating: Number(avgRating.toFixed(1)),
        reviewCount: userReviews.length,
        isSaved: savedListingIds.has(l.id),
        packages: packagesList,
        profile: {
          username: p?.username || `user_${l.userAddress.slice(0, 8)}`,
          displayName: p?.displayName || l.fullName,
          avatarUrl: p?.avatarUrl || "",
        },
      };
    });

    return NextResponse.json({ success: true, listings: enriched });
  } catch (error: any) {
    console.error("GET /api/hiring/listings error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch listings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userAddress,
      fullName,
      email,
      phone,
      creatorType,
      listingType = "promotion",
      category = "General",
      location = "Jaipur, India",
      isOpenForCollab = true,
      startingPrice = 1000,
      services = "Story Promotion, Reel Promotion, Product Review, Brand Collaboration",
      packages,
      isNegotiable = true,
      description,
    } = body;

    if (!userAddress || !fullName || !email || !phone || !creatorType || !description) {
      return NextResponse.json(
        { error: "All required fields (Name, Email, Phone, Type, Description) must be filled" },
        { status: 400 }
      );
    }

    const normalizedAddress = userAddress.toLowerCase();

    const packagesStr = typeof packages === "string" ? packages : JSON.stringify(packages || [
      { name: "Story", price: 500 },
      { name: "Post", price: 1000 },
      { name: "Reel", price: 2000 },
      { name: "Product Review", price: 3000 },
    ]);

    const listing = await prisma.hiringListing.upsert({
      where: { userAddress: normalizedAddress },
      create: {
        userAddress: normalizedAddress,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        creatorType: creatorType.trim(),
        listingType,
        category,
        location: location.trim(),
        isOpenForCollab: Boolean(isOpenForCollab),
        startingPrice: Number(startingPrice) || 1000,
        services: typeof services === "string" ? services : services.join(", "),
        packages: packagesStr,
        isNegotiable: Boolean(isNegotiable),
        description: description.trim(),
      },
      update: {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        creatorType: creatorType.trim(),
        listingType,
        category,
        location: location.trim(),
        isOpenForCollab: Boolean(isOpenForCollab),
        startingPrice: Number(startingPrice) || 1000,
        services: typeof services === "string" ? services : services.join(", "),
        packages: packagesStr,
        isNegotiable: Boolean(isNegotiable),
        description: description.trim(),
      },
    });

    return NextResponse.json({ success: true, listing });
  } catch (error: any) {
    console.error("POST /api/hiring/listings error:", error);
    return NextResponse.json({ error: error.message || "Failed to save listing" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    await prisma.hiringListing.deleteMany({
      where: { userAddress },
    });

    return NextResponse.json({ success: true, message: "Listing deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/hiring/listings error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete listing" }, { status: 500 });
  }
}
