"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  Lock,
  Unlock,
  X,
  Loader2,
  DollarSign,
  AlertCircle,
  Check,
  Star,
  ExternalLink,
  MessageCircle,
  FileText,
  RotateCcw,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";

interface DealRoomModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onDealUpdated?: () => void;
}

export function DealRoomModal({ dealId, isOpen, onClose, onDealUpdated }: DealRoomModalProps) {
  const { account } = useAuth();
  const [deal, setDeal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Counter offer state
  const [isCountering, setIsCountering] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterDeliverables, setCounterDeliverables] = useState("");
  const [counterDeadline, setCounterDeadline] = useState("");

  // Deliverable submission state
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");

  // Review submission state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const fetchDeal = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/hiring/deals/${dealId}`);
      if (res.ok) {
        const data = await res.json();
        setDeal(data.deal);
        if (data.deal) {
          setCounterPrice(data.deal.price.toString());
          setCounterDeliverables(data.deal.deliverables);
          setCounterDeadline(data.deal.deadline);
          setDeliverableUrl(data.deal.deliverableUrl || "");
          setDeliverableNotes(data.deal.deliverableNotes || "");

          if (data.deal.reviews && account) {
            const myRev = data.deal.reviews.find(
              (r: any) => r.reviewerAddress.toLowerCase() === account.toLowerCase()
            );
            if (myRev) setHasReviewed(true);
          }
        }
      }
    } catch (err) {
      console.error("Fetch deal error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && dealId) {
      fetchDeal();
    }
  }, [isOpen, dealId]);

  if (!isOpen) return null;

  const isCreator = account && deal && deal.creatorAddress.toLowerCase() === account.toLowerCase();
  const isClient = account && deal && deal.clientAddress.toLowerCase() === account.toLowerCase();

  const handleAction = async (actionType: string) => {
    if (!account) return;
    try {
      setIsSubmittingAction(true);
      audioHaptics.playTap();

      const body: any = {
        userAddress: account,
        action: actionType,
      };

      if (actionType === "counter_offer") {
        body.counterPrice = Number(counterPrice);
        body.counterDeliverables = counterDeliverables;
        body.counterDeadline = counterDeadline;
      } else if (actionType === "submit_content") {
        body.deliverableUrl = deliverableUrl;
        body.deliverableNotes = deliverableNotes;
      }

      const res = await fetch(`/api/hiring/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setActionMessage("Deal status updated successfully!");
        setIsCountering(false);
        await fetchDeal();
        if (onDealUpdated) onDealUpdated();
        setTimeout(() => setActionMessage(""), 3000);
      }
    } catch (err) {
      console.error("Deal action error:", err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !deal) return;

    try {
      setIsSubmittingAction(true);
      audioHaptics.playSend();

      const targetAddress = isCreator ? deal.clientAddress : deal.creatorAddress;
      const reviewerName = isCreator ? deal.creator?.displayName : deal.client?.displayName;

      const res = await fetch("/api/hiring/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          reviewerAddress: account,
          targetAddress,
          reviewerName,
          rating,
          reviewText,
        }),
      });

      if (res.ok) {
        setHasReviewed(true);
        setActionMessage("Review submitted! Thank you for rating the collaboration.");
        await fetchDeal();
        if (onDealUpdated) onDealUpdated();
      }
    } catch (err) {
      console.error("Submit review error:", err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const steps = [
    { key: "request", label: "Request" },
    { key: "negotiation", label: "Negotiation" },
    { key: "accepted", label: "Terms Locked" },
    { key: "content_pending", label: "Creation" },
    { key: "review", label: "In Review" },
    { key: "completed", label: "Completed" },
  ];

  const getStepStatus = (stepKey: string) => {
    if (!deal) return "upcoming";
    if (deal.status === "cancelled") return "cancelled";
    const statusOrder = ["request", "negotiation", "accepted", "content_pending", "review", "completed"];
    const currentIdx = statusOrder.indexOf(deal.status === "accepted" ? "content_pending" : deal.status);
    const stepIdx = statusOrder.indexOf(stepKey);

    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "upcoming";
  };

  let timeline: any[] = [];
  try {
    timeline = JSON.parse(deal?.timelineUpdates || "[]");
  } catch {
    timeline = [];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-white dark:bg-[#131b2e] rounded-[32px] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 text-xs text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Creator Deal Room</h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#00B7FF] text-[10px] font-mono font-bold">
                  #{dealId.slice(0, 8)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Structured collaboration terms & review workspace</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#00B7FF]" />
            <span>Loading Deal Room...</span>
          </div>
        ) : !deal ? (
          <div className="py-12 text-center text-slate-400">Deal record not found.</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
            
            {/* Status Pipeline Progress Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Deal Progress</span>
                <span className="text-[#00B7FF]">
                  {deal.status === "completed" ? "✅ Deal Completed" : deal.status === "cancelled" ? "❌ Cancelled" : `Status: ${deal.status.replace("_", " ")}`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 pt-1">
                {steps.slice(1).map((s) => {
                  const state = getStepStatus(s.key);
                  return (
                    <div key={s.key} className="space-y-1 text-center">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          state === "completed"
                            ? "bg-emerald-400"
                            : state === "active"
                            ? "bg-[#00B7FF] animate-pulse"
                            : "bg-slate-200 dark:bg-slate-800"
                        }`}
                      />
                      <span
                        className={`text-[9px] block font-bold truncate ${
                          state === "active"
                            ? "text-[#00B7FF]"
                            : state === "completed"
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {actionMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* Agreed Terms Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-cyan-500/10 via-purple-500/5 to-indigo-500/10 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  {deal.termsLocked ? (
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{deal.termsLocked ? "Agreed & Locked Terms" : "Proposed Terms"}</span>
                </span>

                <span className="text-sm font-black text-[#00B7FF] font-mono">
                  ₹{deal.price.toLocaleString()}
                </span>
              </div>

              {/* Participants */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Creator</span>
                  <p className="font-extrabold text-slate-900 dark:text-white truncate">
                    {deal.creator?.displayName}
                  </p>
                  <p className="text-[10px] text-cyan-500 font-mono">@{deal.creator?.username}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Client / Brand</span>
                  <p className="font-extrabold text-slate-900 dark:text-white truncate">
                    {deal.client?.displayName}
                  </p>
                  <p className="text-[10px] text-cyan-500 font-mono">@{deal.client?.username}</p>
                </div>
              </div>

              {/* Service & Deliverables */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-400">Service:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{deal.service}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-400">Deliverables:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{deal.deliverables}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-400">Deadline:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{deal.deadline}</span>
                </div>
              </div>
            </div>

            {/* Deliverable Submission / Review Section */}
            {(deal.status === "content_pending" || deal.status === "review" || deal.status === "completed") && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00B7FF]" />
                  <span>Deliverables & Content Submission</span>
                </h4>

                {deal.deliverableUrl ? (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold block">Submitted Content Link:</span>
                    <a
                      href={deal.deliverableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#00B7FF] hover:underline break-all flex items-center gap-1"
                    >
                      <span>{deal.deliverableUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    {deal.deliverableNotes && (
                      <p className="text-[11px] text-slate-300 mt-1 italic">"{deal.deliverableNotes}"</p>
                    )}
                  </div>
                ) : isCreator && deal.status === "content_pending" ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Paste Reel / Post / Cloud link (e.g. https://...)"
                      value={deliverableUrl}
                      onChange={(e) => setDeliverableUrl(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                    />
                    <input
                      type="text"
                      placeholder="Notes for client review (optional)"
                      value={deliverableNotes}
                      onChange={(e) => setDeliverableNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                    />
                    <button
                      onClick={() => handleAction("submit_content")}
                      disabled={isSubmittingAction || !deliverableUrl.trim()}
                      className="w-full py-2.5 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      Submit for Client Review
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs">
                    Creator is currently working on content deliverables according to agreed terms.
                  </p>
                )}

                {/* Client Approval Action */}
                {isClient && deal.status === "review" && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleAction("complete_deal")}
                      disabled={isSubmittingAction}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Content & Complete Deal</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Negotiation & Counter Offer Area */}
            {!deal.termsLocked && deal.status !== "completed" && deal.status !== "cancelled" && (
              <div className="space-y-3">
                {isCountering ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Propose Counter Offer</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Price (₹)</label>
                        <input
                          type="number"
                          value={counterPrice}
                          onChange={(e) => setCounterPrice(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Deadline</label>
                        <input
                          type="text"
                          value={counterDeadline}
                          onChange={(e) => setCounterDeadline(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Revised Deliverables</label>
                      <input
                        type="text"
                        value={counterDeliverables}
                        onChange={(e) => setCounterDeliverables(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCountering(false)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction("counter_offer")}
                        disabled={isSubmittingAction}
                        className="flex-1 py-2 rounded-xl bg-[#00B7FF] text-slate-950 font-black"
                      >
                        Submit Counter Offer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction("accept_offer")}
                      disabled={isSubmittingAction}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Accept Agreed Terms</span>
                    </button>

                    <button
                      onClick={() => setIsCountering(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:border-[#00B7FF] cursor-pointer"
                    >
                      Counter Offer
                    </button>

                    <button
                      onClick={() => handleAction("cancel")}
                      className="px-3 py-2.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-bold cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed Collaboration Review Section */}
            {deal.status === "completed" && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Collaboration Review</span>
                </h4>

                {hasReviewed ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>You have submitted a review for this deal.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">Rating:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1 cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Write your collaboration experience & review..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold outline-none focus:border-[#00B7FF]"
                      required
                    />

                    <button
                      type="submit"
                      disabled={isSubmittingAction || !reviewText.trim()}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black text-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      Publish Collaboration Review
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Timeline Audit History */}
            {timeline.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Deal History Log
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                  {timeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px]"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.action}</span>
                      <span className="text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
