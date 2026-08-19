"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Search,
  Sparkles,
  UserCheck,
  Send,
  MessageCircle,
  Check,
  X,
  Phone,
  Mail,
  User,
  Trash2,
  Edit3,
  Loader2,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Star,
  Bookmark,
  MapPin,
  DollarSign,
  Layers,
  Upload,
  CheckSquare,
  Square,
  Lock,
  RotateCcw
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { audioHaptics } from "@/lib/audioHaptics";
import { DealRoomModal } from "@/components/DealRoomModal";

const CREATOR_TYPES = [
  "Video Creator",
  "Influencer",
  "Editor",
  "Photographer",
  "Developer",
  "Model",
  "Designer",
  "Musician",
  "Brand / Business",
  "Freelancer",
];

const CATEGORIES = [
  "All",
  "Fashion",
  "Technology",
  "Comedy",
  "Music",
  "Travel",
  "Fitness",
  "Education",
  "Food",
  "Lifestyle",
  "Gaming",
];

const PROMOTION_SERVICES = [
  "Story Promotion",
  "Reel Promotion",
  "Post Promotion",
  "Product Review",
  "Paid Shoutout",
  "Brand Collaboration",
  "Event Promotion",
];

function HiringPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "requests" ? "find" : (searchParams.get("tab") || "find");
  const initialDealId = searchParams.get("dealId") || null;
  const { account } = useAuth();

  const [activeTab, setActiveTab] = useState<"find" | "ai" | "list" | "deals" | "saved">(
    (initialTab as any) || "find"
  );

  // Deal Room State
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId);
  const [isDealRoomOpen, setIsDealRoomOpen] = useState<boolean>(!!initialDealId);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCreatorType, setSelectedCreatorType] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedMaxBudget, setSelectedMaxBudget] = useState<string>("all");
  const [onlyOpenCollab, setOnlyOpenCollab] = useState(false);

  // Listings State
  const [listings, setListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  // Saved Creators State
  const [savedCreators, setSavedCreators] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Deals State
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);

  // AI Matcher State
  const [aiPrompt, setAiPrompt] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [isAiMatching, setIsAiMatching] = useState(false);

  // My Listing State
  const [myListing, setMyListing] = useState<any | null>(null);
  const [isLoadingMyListing, setIsLoadingMyListing] = useState(false);
  const [isEditingListing, setIsEditingListing] = useState(false);

  // Listing Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creatorType, setCreatorType] = useState(CREATOR_TYPES[0]);
  const [listingType, setListingType] = useState<"promotion" | "hiring">("promotion");
  const [category, setCategory] = useState("Fashion");
  const [location, setLocation] = useState("Jaipur, India");
  const [isOpenForCollab, setIsOpenForCollab] = useState(true);
  const [startingPrice, setStartingPrice] = useState(1000);
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "Story Promotion",
    "Reel Promotion",
    "Product Review",
  ]);
  const [packages, setPackages] = useState([
    { name: "Story", price: 500 },
    { name: "Post", price: 1000 },
    { name: "Reel", price: 2000 },
    { name: "Product Review", price: 3000 },
  ]);
  const [description, setDescription] = useState("");
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);
  const [listingSuccessMsg, setListingSuccessMsg] = useState("");


  // Hire/Promote & Deal Creation Modal State
  const [selectedTargetListing, setSelectedTargetListing] = useState<any | null>(null);
  const [selectedPackageName, setSelectedPackageName] = useState<string>("Custom");
  const [reqSenderName, setReqSenderName] = useState("");
  const [reqSenderEmail, setReqSenderEmail] = useState("");
  const [reqSenderPhone, setReqSenderPhone] = useState("");
  const [reqService, setReqService] = useState("Reel Promotion");
  const [reqBudget, setReqBudget] = useState(2000);
  const [reqDeadline, setReqDeadline] = useState("Within 7 days");
  const [reqMessage, setReqMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestStatusMsg, setRequestStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Listings
  const fetchListings = async () => {
    try {
      setIsLoadingListings(true);
      const params = new URLSearchParams();
      if (account) params.append("userAddress", account);
      if (searchQuery) params.append("q", searchQuery);
      if (selectedCategory !== "All") params.append("category", selectedCategory);
      if (selectedCreatorType !== "All") params.append("creatorType", selectedCreatorType);
      if (selectedLocation) params.append("location", selectedLocation);
      if (selectedMaxBudget !== "all") params.append("maxBudget", selectedMaxBudget);
      if (onlyOpenCollab) params.append("openCollab", "true");

      const res = await fetch(`/api/hiring/listings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error("Fetch listings error:", err);
    } finally {
      setIsLoadingListings(false);
    }
  };

  // Fetch My Listing
  const fetchMyListing = async () => {
    if (!account) return;
    try {
      setIsLoadingMyListing(true);
      const res = await fetch(`/api/hiring/listings?userAddress=${account}&myListing=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.listing) {
          setMyListing(data.listing);
          setFullName(data.listing.fullName);
          setEmail(data.listing.email);
          setPhone(data.listing.phone);
          setCreatorType(data.listing.creatorType);
          setListingType(data.listing.listingType);
          setCategory(data.listing.category);
          setLocation(data.listing.location || "Jaipur, India");
          setIsOpenForCollab(data.listing.isOpenForCollab);
          setStartingPrice(data.listing.startingPrice || 1000);
          setDescription(data.listing.description);

          if (data.listing.services) {
            setSelectedServices(data.listing.services.split(", ").map((s: string) => s.trim()));
          }
          if (data.listing.packages) {
            try {
              setPackages(JSON.parse(data.listing.packages));
            } catch {}
          }
        } else {
          setMyListing(null);
        }
      }
    } catch (err) {
      console.error("Fetch my listing error:", err);
    } finally {
      setIsLoadingMyListing(false);
    }
  };

  // Fetch Saved Creators
  const fetchSavedCreators = async () => {
    if (!account) return;
    try {
      setIsLoadingSaved(true);
      const res = await fetch(`/api/hiring/saved?userAddress=${account}`);
      if (res.ok) {
        const data = await res.json();
        setSavedCreators(data.savedCreators || []);
      }
    } catch (err) {
      console.error("Fetch saved creators error:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // Fetch Deals
  const fetchDeals = async () => {
    if (!account) return;
    try {
      setIsLoadingDeals(true);
      const res = await fetch(`/api/hiring/deals?userAddress=${account}`);
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (err) {
      console.error("Fetch deals error:", err);
    } finally {
      setIsLoadingDeals(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [searchQuery, selectedCategory, selectedCreatorType, selectedLocation, selectedMaxBudget, onlyOpenCollab]);

  useEffect(() => {
    if (account) {
      fetchMyListing();
      fetchDeals();
      fetchSavedCreators();
    }
  }, [account]);

  // Toggle Save Creator
  const handleToggleSave = async (listingId: string) => {
    if (!account) {
      router.push("/login");
      return;
    }
    try {
      audioHaptics.playTap();
      const res = await fetch("/api/hiring/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: account, listingId }),
      });
      if (res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? { ...l, isSaved: !l.isSaved } : l))
        );
        fetchSavedCreators();
      }
    } catch (err) {
      console.error("Toggle save error:", err);
    }
  };

  // Run AI Creator Matching
  const handleRunAiMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() && !campaignDesc.trim()) return;

    try {
      setIsAiMatching(true);
      audioHaptics.playTap();

      const res = await fetch("/api/hiring/ai-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          campaignDescription: campaignDesc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiMatches(data.matches || []);
      }
    } catch (err) {
      console.error("AI Match error:", err);
    } finally {
      setIsAiMatching(false);
    }
  };

  // Submit Listing
  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      router.push("/login");
      return;
    }

    try {
      setIsSubmittingListing(true);
      audioHaptics.playSend();

      const res = await fetch("/api/hiring/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: account,
          fullName,
          email,
          phone,
          creatorType,
          listingType,
          category,
          location,
          isOpenForCollab,
          startingPrice: Number(startingPrice),
          services: selectedServices.join(", "),
          packages: JSON.stringify(packages),
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit listing");

      setMyListing(data.listing);
      setIsEditingListing(false);
      setListingSuccessMsg("Your listing & collaboration packages are live!");
      fetchListings();
      setTimeout(() => setListingSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to submit listing.");
    } finally {
      setIsSubmittingListing(false);
    }
  };

  // Delete Listing
  const handleDeleteListing = async () => {
    if (!account || !confirm("Are you sure you want to remove your creator listing?")) return;
    try {
      audioHaptics.playTap();
      const res = await fetch(`/api/hiring/listings?userAddress=${account}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMyListing(null);
        fetchListings();
      }
    } catch (err) {
      console.error("Delete listing error:", err);
    }
  };

  // Send Direct Deal / Collaboration Request
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      router.push("/login");
      return;
    }
    if (!selectedTargetListing) return;

    try {
      setIsSendingRequest(true);
      setRequestStatusMsg(null);
      audioHaptics.playSend();

      // 1. Create Hiring Request
      const resReq = await fetch("/api/hiring/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedTargetListing.id,
          senderAddress: account,
          senderName: reqSenderName,
          senderEmail: reqSenderEmail,
          senderPhone: reqSenderPhone,
          message: reqMessage,
        }),
      });

      // 2. Also initialize Deal record in Deal Room
      await fetch("/api/hiring/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress: selectedTargetListing.userAddress,
          clientAddress: account,
          service: reqService,
          price: reqBudget,
          deliverables: `${reqService} as per collaboration brief`,
          deadline: reqDeadline,
          description: reqMessage,
        }),
      });

      const data = await resReq.json();
      if (!resReq.ok) throw new Error(data.error || "Failed to send request");

      setRequestStatusMsg({
        type: "success",
        text: `Collaboration offer & Deal Room created for ${selectedTargetListing.fullName}!`,
      });

      fetchDeals();

      setTimeout(() => {
        setSelectedTargetListing(null);
        setReqMessage("");
        setRequestStatusMsg(null);
      }, 2000);
    } catch (err: any) {
      setRequestStatusMsg({
        type: "error",
        text: err.message || "Failed to send request.",
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24 text-left select-none animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/profile")}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Creator Marketplace</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#00B7FF] text-[10px] font-mono font-bold">
                Deals & AI Match
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Discover verified creators, AI-match campaigns, and negotiate structured deals
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="grid grid-cols-5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black">
        <button
          onClick={() => {
            audioHaptics.playTap();
            setActiveTab("find");
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === "find"
              ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm"
              : "text-slate-500 hover:text-white"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Creators</span>
        </button>

        <button
          onClick={() => {
            audioHaptics.playTap();
            setActiveTab("ai");
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === "ai"
              ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm"
              : "text-slate-500 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">AI Match</span>
        </button>

        <button
          onClick={() => {
            audioHaptics.playTap();
            setActiveTab("deals");
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === "deals"
              ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm"
              : "text-slate-500 hover:text-white"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Deal Room</span>
          {deals.filter((d) => d.status !== "completed" && d.status !== "cancelled").length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-2 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            audioHaptics.playTap();
            setActiveTab("list");
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === "list"
              ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm"
              : "text-slate-500 hover:text-white"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">My Listing</span>
        </button>

        <button
          onClick={() => {
            audioHaptics.playTap();
            setActiveTab("saved");
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === "saved"
              ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm"
              : "text-slate-500 hover:text-white"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Saved</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FIND CREATORS (MARKETPLACE) */}
      {/* ========================================================================= */}
      {activeTab === "find" && (
        <div className="space-y-4">
          
          {/* Search & Location Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search creator name, skills, reels, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Location (e.g. Jaipur)"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  audioHaptics.playTap();
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#00B7FF] text-slate-950 font-black shadow-xs"
                    : "bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Secondary Filters Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-400 px-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Budget Filter */}
              <select
                value={selectedMaxBudget}
                onChange={(e) => setSelectedMaxBudget(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-[11px] text-[#00B7FF] outline-none cursor-pointer font-bold"
              >
                <option value="all">Budget: Any</option>
                <option value="2000">Under ₹2,000</option>
                <option value="5000">Under ₹5,000</option>
                <option value="10000">Under ₹10,000</option>
              </select>

              {/* Open for collab toggle */}
              <button
                onClick={() => setOnlyOpenCollab(!onlyOpenCollab)}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                  onlyOpenCollab
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                    : "bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 text-slate-500"
                }`}
              >
                🟢 Open for Collabs Only
              </button>
            </div>

            <span>{listings.length} Creators Listed</span>
          </div>

          {/* Listings Grid */}
          {isLoadingListings ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold">
              Loading creator marketplace...
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center rounded-[32px] glass-card border border-slate-200 dark:border-slate-800 space-y-3 p-8">
              <Briefcase className="w-10 h-10 text-[#00B7FF] mx-auto opacity-70" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">No creators matching your criteria</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Try resetting filters or use the AI Match tab to find creators with campaign descriptions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="glass-card rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 flex flex-col justify-between hover:border-[#00B7FF]/40 transition-all shadow-xs"
                >
                  {/* Top Bar: Avatar, Badges & Save Button */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/profile/${item.userAddress}`}
                        className="flex items-center gap-2.5 min-w-0 group"
                      >
                        <img
                          src={item.profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.userAddress}`}
                          alt={item.fullName}
                          className="w-11 h-11 rounded-full object-cover bg-slate-900 border border-white/20 shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:underline flex items-center gap-1">
                            <span>{item.fullName}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00B7FF] shrink-0" />
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            @{item.profile?.username}
                          </p>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        {/* Creator Score Badge */}
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black font-mono">
                          ⭐ {item.creatorScore}/100
                        </span>

                        {/* Save Bookmark Toggle */}
                        <button
                          onClick={() => handleToggleSave(item.id)}
                          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                            item.isSaved
                              ? "bg-amber-400/15 border-amber-400 text-amber-400"
                              : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white"
                          }`}
                          title="Save Creator"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${item.isSaved ? "fill-amber-400" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Strip: Category, Location, Availability */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                        {item.creatorType}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{item.location || "Jaipur, India"}</span>
                      </span>
                      {item.isOpenForCollab ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          🟢 Open for Collab
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
                          Busy
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    {/* Packages Preview */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Starting from ₹{item.startingPrice?.toLocaleString()} • Packages:
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {item.packages?.slice(0, 3).map((pkg: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-800 dark:text-slate-200"
                          >
                            {pkg.name}: ₹{pkg.price}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Hire / Deal Room + View Profile */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        audioHaptics.playTap();
                        setSelectedTargetListing(item);
                        setReqBudget(item.startingPrice || 2000);
                        setReqMessage(`Hi ${item.fullName}, I'd love to collaborate with you on a campaign.`);
                      }}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Initiate Deal</span>
                    </button>

                    <Link
                      href={`/profile/${item.userAddress}`}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="View Profile"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI FIND MY CREATOR & PRODUCT MATCHING */}
      {/* ========================================================================= */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <form onSubmit={handleRunAiMatch} className="glass-card rounded-[32px] border border-purple-500/30 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI Creator & Campaign Matcher</span>
            </div>
            <p className="text-xs text-slate-400">
              Describe your campaign requirement in natural language (e.g. <i>"I need Jaipur fashion creators with under ₹5,000 budget for Reel promotions"</i>)
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Campaign Requirement / Prompt *
              </label>
              <input
                type="text"
                placeholder="e.g. Looking for tech or fitness creators in Mumbai under ₹4,000 for product review..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-400"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Product Description & Deliverables (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Brief about product features, target audience, preferred style..."
                value={campaignDesc}
                onChange={(e) => setCampaignDesc(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-400"
              />
            </div>

            <button
              type="submit"
              disabled={isAiMatching || !aiPrompt.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-[#00B7FF] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {isAiMatching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Matching with Real Platform Creators...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Find Matching Creators</span>
                </>
              )}
            </button>
          </form>

          {/* AI Match Results */}
          {aiMatches.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 px-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>AI Recommended Creators ({aiMatches.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {aiMatches.map((m) => (
                  <div
                    key={m.listingId}
                    className="glass-card rounded-[28px] border border-purple-500/20 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={m.profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userAddress}`}
                            alt={m.fullName}
                            className="w-10 h-10 rounded-full object-cover bg-slate-900"
                          />
                          <div>
                            <h4 className="font-extrabold text-xs text-white">{m.fullName}</h4>
                            <p className="text-[10px] text-slate-400">@{m.profile?.username} • {m.location}</p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black text-xs font-mono">
                          {m.matchScore}% Match
                        </span>
                      </div>

                      {/* Verified Match Reasons */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1 text-[11px] text-slate-300">
                        {m.matchReasons?.map((r: string, idx: number) => (
                          <p key={idx} className="font-semibold text-emerald-400/90 leading-tight">
                            {r}
                          </p>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        audioHaptics.playTap();
                        setSelectedTargetListing({ ...m, id: m.listingId });
                        setReqBudget(m.startingPrice || 2000);
                        setReqMessage(`Hi ${m.fullName}, AI matched your profile for our campaign.`);
                      }}
                      className="w-full py-2 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs hover:opacity-90 cursor-pointer"
                    >
                      Collaborate & Open Deal
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEAL ROOM & COLLABORATION WORKSPACE */}
      {/* ========================================================================= */}
      {activeTab === "deals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#00B7FF]" />
              <span>Active Deals & Deal Rooms ({deals.length})</span>
            </h2>
          </div>

          {isLoadingDeals ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold">
              Loading your collaboration deals...
            </div>
          ) : deals.length === 0 ? (
            <div className="py-16 text-center rounded-[32px] glass-card border border-slate-200 dark:border-slate-800 space-y-3 p-8">
              <Lock className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">No active deals</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                When you initiate a deal with a creator or receive collaboration offers, your Deal Rooms will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map((d) => (
                <div
                  key={d.id}
                  className="glass-card rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {d.service}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-[#00B7FF] text-[10px] font-mono font-bold">
                          ₹{d.price?.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Between @{d.creator?.username} (Creator) & @{d.client?.username} (Client)
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        d.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : d.status === "cancelled"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-[#00B7FF]/15 text-[#00B7FF] border border-cyan-500/30"
                      }`}
                    >
                      {d.status.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Deliverables: {d.deliverables} • Deadline: {d.deadline}
                  </p>

                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        audioHaptics.playTap();
                        setSelectedDealId(d.id);
                        setIsDealRoomOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black text-xs hover:opacity-90 cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Open Deal Room</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MY LISTING */}
      {/* ========================================================================= */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {myListing && !isEditingListing ? (
            <div className="glass-card rounded-[32px] border border-cyan-500/30 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Your Listing is Active</h3>
                    <p className="text-[10px] text-slate-400">Visible to all brands and users in the Creator Marketplace</p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIsEditingListing(true)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-[#00B7FF] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteListing}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Listing Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-white">{myListing.fullName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                    {myListing.isOpenForCollab ? "🟢 Open for Collabs" : "Paused"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span>{myListing.creatorType}</span>
                  <span>•</span>
                  <span>{myListing.category}</span>
                  <span>•</span>
                  <span>📍 {myListing.location}</span>
                </div>

                <p className="text-slate-600 dark:text-slate-300">{myListing.description}</p>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>Starting Price: ₹{myListing.startingPrice?.toLocaleString()}</span>
                  <span>📞 {myListing.phone}</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitListing} className="glass-card rounded-[32px] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                  <Briefcase className="w-4 h-4 text-[#00B7FF]" />
                  <span>{myListing ? "Edit Creator Listing & Packages" : "List Yourself on Creator Marketplace"}</span>
                </div>
                {isEditingListing && (
                  <button
                    type="button"
                    onClick={() => setIsEditingListing(false)}
                    className="text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {listingSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{listingSuccessMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Full Name / Brand Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abhay Shekhawat"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                  required
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    placeholder="creator@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>
              </div>

              {/* Creator Type & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Creator Role / Type *
                  </label>
                  <select
                    value={creatorType}
                    onChange={(e) => setCreatorType(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                  >
                    {CREATOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Location / City *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jaipur, India"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>
              </div>

              {/* Starting Price & Open for Collab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Starting Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setIsOpenForCollab(!isOpenForCollab)}
                    className={`w-full p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isOpenForCollab
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                        : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                    }`}
                  >
                    {isOpenForCollab ? "🟢 Open for Collaboration" : "⚪ Paused"}
                  </button>
                </div>
              </div>

              {/* Promotion Services Toggles */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Offered Promotion Services
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROMOTION_SERVICES.map((s) => {
                    const isChecked = selectedServices.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedServices(selectedServices.filter((item) => item !== s));
                          } else {
                            setSelectedServices([...selectedServices, s]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isChecked
                            ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF]"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                        }`}
                      >
                        {isChecked ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Creator Bio & Rates Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Share details regarding your creative style, past brand deals, audience demographics..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingListing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingListing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>{myListing ? "Update Listing" : "Submit Listing 🚀"}</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SAVED CREATORS */}
      {/* ========================================================================= */}
      {activeTab === "saved" && (
        <div className="space-y-4">
          <h2 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 px-1">
            <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Saved Creators ⭐ ({savedCreators.length})</span>
          </h2>

          {isLoadingSaved ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold">
              Loading saved creators...
            </div>
          ) : savedCreators.length === 0 ? (
            <div className="py-16 text-center rounded-[32px] glass-card border border-slate-200 dark:border-slate-800 space-y-3 p-8">
              <Bookmark className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">No saved creators yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Bookmark creators from the marketplace to keep track of your favorite talent.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {savedCreators.map((item) => (
                <div
                  key={item.id}
                  className="glass-card rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/profile/${item.listing.userAddress}`}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <img
                        src={item.listing.profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.listing.userAddress}`}
                        alt={item.listing.fullName}
                        className="w-10 h-10 rounded-full object-cover bg-slate-900"
                      />
                      <div>
                        <h4 className="font-extrabold text-xs text-white">{item.listing.fullName}</h4>
                        <p className="text-[10px] text-slate-400">@{item.listing.profile?.username} • {item.listing.location}</p>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleToggleSave(item.listing.id)}
                      className="p-1.5 rounded-xl border border-amber-400 bg-amber-400/15 text-amber-400 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{item.listing.description}</p>

                  <button
                    onClick={() => {
                      audioHaptics.playTap();
                      setSelectedTargetListing(item.listing);
                      setReqBudget(item.listing.startingPrice || 2000);
                      setReqMessage(`Hi ${item.listing.fullName}, I saved your profile and would love to collaborate.`);
                    }}
                    className="w-full py-2 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs hover:opacity-90 cursor-pointer"
                  >
                    Initiate Deal
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INITIATE DEAL & COLLABORATION MODAL */}
      {/* ========================================================================= */}
      {selectedTargetListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
          <div className="w-full max-w-md rounded-[32px] bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-indigo-600 flex items-center justify-center text-white font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Initiate Collaboration Deal
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    With {selectedTargetListing.fullName} (@{selectedTargetListing.profile?.username})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTargetListing(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestStatusMsg && (
              <div
                className={`p-3 rounded-2xl border text-xs font-bold ${
                  requestStatusMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {requestStatusMsg.text}
              </div>
            )}

            <form onSubmit={handleSendRequest} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={reqSenderName}
                  onChange={(e) => setReqSenderName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    placeholder="name@mail.com"
                    value={reqSenderEmail}
                    onChange={(e) => setReqSenderEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Phone *</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={reqSenderPhone}
                    onChange={(e) => setReqSenderPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Service *</label>
                  <select
                    value={reqService}
                    onChange={(e) => setReqService(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  >
                    {PROMOTION_SERVICES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Proposed Budget (₹) *</label>
                  <input
                    type="number"
                    value={reqBudget}
                    onChange={(e) => setReqBudget(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Description / Project Message *</label>
                <textarea
                  rows={2}
                  placeholder="Share campaign brief, dates, and deliverables..."
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTargetListing(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 font-bold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSendingRequest}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black text-xs hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSendingRequest ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Initiating Deal...</span>
                    </>
                  ) : (
                    <span>Create Deal & Send</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEAL ROOM MODAL */}
      {/* ========================================================================= */}
      {selectedDealId && (
        <DealRoomModal
          dealId={selectedDealId}
          isOpen={isDealRoomOpen}
          onClose={() => {
            setIsDealRoomOpen(false);
            setSelectedDealId(null);
          }}
          onDealUpdated={() => {
            fetchDeals();
          }}
        />
      )}

    </div>
  );
}

export default function HiringPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-bold">Loading hiring marketplace...</div>}>
      <HiringPageContent />
    </Suspense>
  );
}
