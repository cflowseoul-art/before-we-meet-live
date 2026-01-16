"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { Heart, X } from "lucide-react";

interface FeedItem {
  id: string;
  nickname: string;
  gender: string;
  photo_url: string;
  caption: string;
  target_user_id: string;
}

interface Like {
  id: string;
  user_id: string;
  target_user_id: string;
}

const MAX_LIKES = 3;

export default function FeedPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [remainingLikes, setRemainingLikes] = useState(MAX_LIKES);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState("01");

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  // Get like count for a user
  const getLikeCount = (targetUserId: string) => {
    return likes.filter(like => like.target_user_id === targetUserId).length;
  };

  // Check if current user liked this target
  const hasLiked = (targetUserId: string) => {
    if (!currentUser) return false;
    return likes.some(like =>
      like.user_id === currentUser.id && like.target_user_id === targetUserId
    );
  };

  // Fetch feed data
  const fetchFeedData = useCallback(async (session?: string) => {
    const sessionToUse = session || currentSession;

    try {
      const stored = localStorage.getItem("auction_user");
      let myId = "";
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        myId = parsed.id;
      }

      const [usersRes, likesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("feed_likes").select("*")
      ]);

      // Fetch Google Drive photos
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&key=${API_KEY}`
      );
      const driveData = await driveRes.json();
      const allFiles = driveData.files || [];

      // Match files to users
      const matchedItems: FeedItem[] = allFiles
        .filter((file: any) => file.name.startsWith(`${sessionToUse}_`))
        .map((file: any) => {
          const namePart = file.name.replace(/\.[^/.]+$/, "");
          const [, realName, suffix, gender, caption] = namePart.split("_");
          const matchedUser = usersRes.data?.find(u => u.real_name === realName && u.phone_suffix === suffix);

          if (!matchedUser) return null;
          return {
            id: file.id,
            target_user_id: matchedUser.id,
            nickname: matchedUser.nickname,
            gender: gender || matchedUser.gender || "Unknown",
            photo_url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
            caption: caption || "매력을 탐색 중입니다."
          };
        })
        .filter((item: any): item is FeedItem => item !== null);

      setFeedItems(matchedItems);

      // Update likes state
      if (likesRes.data) {
        setLikes(likesRes.data);
        if (myId) {
          const myLikesCount = likesRes.data.filter(l => l.user_id === myId).length;
          setRemainingLikes(MAX_LIKES - myLikesCount);
        }
      }
    } catch (error) {
      console.error("Feed Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, API_KEY, FOLDER_ID]);

  // Use unified phase redirect hook
  usePhaseRedirect({
    currentPage: "feed",
    onSettingsFetched: (settings) => {
      // Get session from settings and load feed data
      const session = String(settings.current_session) || "01";
      setCurrentSession(session);
      fetchFeedData(session);
    },
    onFeedLikesChange: () => {
      // Likes changed - refresh feed data
      fetchFeedData();
    }
  });

  // Handle like action
  const handleLike = async (item: FeedItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser || currentUser.id === item.target_user_id) return;

    const alreadyLiked = hasLiked(item.target_user_id);

    if (alreadyLiked) {
      // Remove like
      await supabase
        .from("feed_likes")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("target_user_id", item.target_user_id);
    } else {
      // Add like
      if (remainingLikes <= 0) {
        alert("좋아요 가능 횟수(3회)를 모두 사용했습니다!");
        return;
      }
      await supabase
        .from("feed_likes")
        .insert({ user_id: currentUser.id, target_user_id: item.target_user_id });
    }

    // Refresh data
    fetchFeedData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif italic text-gray-400 bg-[#FDFDFD]">
        Loading Gallery...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif antialiased pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#EEEBDE] px-5 py-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl italic tracking-tight font-bold">The Gallery</h1>
            <p className="text-[9px] font-sans font-black text-[#A52A2A] uppercase tracking-[0.2em]">Soul Discovery</p>
          </div>
          <div className="flex items-center gap-2 bg-[#FDF8F8] px-4 py-2 rounded-full border border-[#A52A2A]/10">
            <Heart size={12} fill="#A52A2A" className="text-[#A52A2A]" />
            <span className="text-[10px] font-sans font-black text-[#A52A2A] uppercase tracking-widest">남은 좋아요: {remainingLikes}</span>
          </div>
        </div>
      </header>

      {/* Grid View */}
      <main className="max-w-xl mx-auto px-1 pt-1">
        <div className="grid grid-cols-3 gap-[2px]">
          {feedItems.map((item) => (
            <div
              key={item.id}
              className="aspect-square relative cursor-pointer group overflow-hidden"
              onClick={() => setSelectedItem(item)}
            >
              <img src={item.photo_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="feed" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex items-center gap-1 text-white text-sm font-bold">
                  <Heart size={16} fill="white" />
                  {getLikeCount(item.target_user_id)}
                </div>
              </div>
              {hasLiked(item.target_user_id) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-[#A52A2A] rounded-full flex items-center justify-center shadow-lg border border-white/20">
                  <Heart size={12} fill="white" className="text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-[2.5rem] max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={selectedItem.photo_url} className="w-full aspect-square object-cover" />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold italic mb-1">{selectedItem.nickname}</h2>
                  <span className="text-[10px] font-sans font-black text-gray-400 uppercase tracking-[0.2em]">{selectedItem.gender}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#A52A2A] bg-[#FDF8F8] px-3 py-1 rounded-full border border-[#A52A2A]/5">
                  <Heart size={14} fill="#A52A2A" />
                  <span className="text-sm font-sans font-bold">{getLikeCount(selectedItem.target_user_id)}</span>
                </div>
              </div>

              <div className="py-6 border-y border-gray-50">
                <p className="text-[13px] text-gray-600 leading-relaxed italic text-center break-keep">
                  "{selectedItem.caption}"
                </p>
              </div>

              {currentUser && currentUser.id !== selectedItem.target_user_id && (
                <button
                  onClick={(e) => handleLike(selectedItem, e)}
                  className={`w-full py-5 rounded-[1.5rem] text-xs font-sans font-black tracking-[0.2em] uppercase transition-all duration-300 shadow-lg active:scale-95 ${
                    hasLiked(selectedItem.target_user_id)
                    ? "bg-[#A52A2A] text-white shadow-[#A52A2A]/20"
                    : "bg-[#1A1A1A] text-white"
                  }`}
                >
                  {hasLiked(selectedItem.target_user_id) ? "♥ Liked" : "Send Like"}
                </button>
              )}

              <p className="text-[9px] text-gray-300 text-center font-sans font-medium uppercase tracking-widest">
                Click background to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
