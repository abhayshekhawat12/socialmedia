import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";

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
      const { data: listing } = await supabaseServer
        .from("HiringListing")
        .select("*")
        .eq("userAddress", userAddress)
        .maybeSingle();

      return NextResponse.json({ success: true, listing: listing || null });
    }

    let queryBuilder = supabaseServer
      .from("HiringListing")
      .select("*")
      .order("createdAt", { ascending: false });

    if (type && type !== "all") {
      queryBuilder = queryBuilder.eq("listingType", type);
    }
    if (category && category !== "All" && category !== "all") {
      queryBuilder = queryBuilder.eq("category", category);
    }
    if (creatorType && creatorType !== "All" && creatorType !== "all") {
      queryBuilder = queryBuilder.eq("creatorType", creatorType);
    }
    if (onlyOpenCollab) {
      queryBuilder = queryBuilder.eq("isOpenForCollab", true);
    }
    if (maxBudget && maxBudget > 0) {
      queryBuilder = queryBuilder.lte("startingPrice", maxBudget);
    }

    const { data: listingsData, error } = await queryBuilder;
    let listings = listingsData || [];

    if (query) {
      listings = listings.filter(
        (l: any) =>
          l.fullName?.toLowerCase().includes(query) ||
          l.creatorType?.toLowerCase().includes(query) ||
          l.category?.toLowerCase().includes(query) ||
          l.location?.toLowerCase().includes(query) ||
          l.services?.toLowerCase().includes(query) ||
          l.description?.toLowerCase().includes(query)
      );
    }

    if (location) {
      listings = listings.filter((l: any) =>
        l.location?.toLowerCase().includes(location)
      );
    }

    // Enrich listings with profile data
    const userAddresses = Array.from(new Set(listings.map((l: any) => l.userAddress.toLowerCase())));
    let profiles: any[] = [];
    if (userAddresses.length > 0) {
      const { data: profs } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profs || [];
    }

    const profileMap = new Map<string, any>();
    profiles.forEach((p: any) => {
      if (p.user?.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    });

    const enrichedListings = listings.map((l: any) => {
      const prof = profileMap.get(l.userAddress.toLowerCase());
      let parsedPackages = [];
      try {
        parsedPackages = typeof l.packages === "string" ? JSON.parse(l.packages) : l.packages || [];
      } catch {
        parsedPackages = [];
      }

      return {
        ...l,
        packages: parsedPackages,
        creatorScore: 92,
        isSaved: false,
        profile: {
          username: prof?.username || `user_${l.userAddress.slice(0, 8)}`,
          displayName: prof?.displayName || l.fullName,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${l.userAddress}`,
          bio: prof?.bio || l.description,
        },
      };
    });

    return NextResponse.json({
      success: true,
      listings: enrichedListings,
      total: enrichedListings.length,
    });
  } catch (error: any) {
    console.error("GET /api/hiring/listings error:", error);
    return NextResponse.json({ success: true, listings: [], total: 0 });
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

    const { data: existing } = await supabaseServer
      .from("HiringListing")
      .select("id")
      .eq("userAddress", normalizedAddress)
      .maybeSingle();

    let listing;
    if (existing) {
      const { data, error } = await supabaseServer
        .from("HiringListing")
        .update(
          withUpdatedTimestamp({
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
          })
        )
        .eq("id", existing.id)
        .select()
        .single();
      listing = data;
    } else {
      const { data, error } = await supabaseServer
        .from("HiringListing")
        .insert(
          withTimestamps({
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
          })
        )
        .select()
        .single();
      listing = data;
    }

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

    await supabaseServer
      .from("HiringListing")
      .delete()
      .eq("userAddress", userAddress);

    return NextResponse.json({ success: true, message: "Listing deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/hiring/listings error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete listing" }, { status: 500 });
  }
}
