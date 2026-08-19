import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetAddress = searchParams.get("targetAddress")?.toLowerCase();

    if (!targetAddress) {
      return NextResponse.json({ error: "targetAddress is required" }, { status: 400 });
    }

    const { data: reviewsData } = await supabaseServer
      .from("CollabReview")
      .select("*, deal:Deal(*)")
      .eq("targetAddress", targetAddress)
      .order("createdAt", { ascending: false });

    const reviews = reviewsData || [];
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0) / reviews.length
        : 5.0;

    return NextResponse.json({
      success: true,
      reviews,
      total: reviews.length,
      averageRating: Number(averageRating.toFixed(1)),
    });
  } catch (error: any) {
    console.error("GET /api/hiring/reviews error:", error);
    return NextResponse.json({ success: true, reviews: [], total: 0, averageRating: 5.0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, reviewerAddress, targetAddress, reviewerName, rating, reviewText } = body;

    if (!dealId || !reviewerAddress || !targetAddress || !rating || !reviewText) {
      return NextResponse.json(
        { error: "dealId, reviewerAddress, targetAddress, rating, and reviewText are required" },
        { status: 400 }
      );
    }

    const { data: newReview, error } = await supabaseServer
      .from("CollabReview")
      .insert(
        withTimestamps({
          dealId,
          reviewerAddress: reviewerAddress.toLowerCase(),
          targetAddress: targetAddress.toLowerCase(),
          reviewerName: reviewerName || "Verified Collaborator",
          rating: Math.min(5, Math.max(1, Number(rating))),
          reviewText: reviewText.trim(),
        })
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, review: newReview });
  } catch (error: any) {
    console.error("POST /api/hiring/reviews error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit review" }, { status: 500 });
  }
}
