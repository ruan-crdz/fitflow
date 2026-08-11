import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useFoodStore } from '@/stores/useFoodStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useToastStore } from '@/stores/useToastStore';
import { calculateBMI, calculateTDEE } from '@/utils/calories';
import { getToday, getTodayWorkoutType } from '@/utils/date';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface SocialProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  is_private?: boolean;
  show_consistency?: boolean;
  show_load_progression?: boolean;
  show_daily_calories?: boolean;
  show_water?: boolean;
  show_bmi?: boolean;
  show_weight_progress?: boolean;
  show_today_workout?: boolean;
}

interface SocialProfileStats {
  user_id: string;
  consistency_count: number;
  load_progression?: string | null;
  daily_calories: number;
  daily_calorie_goal: number;
  water_glasses: number;
  bmi?: number | null;
  weight_start?: number | null;
  weight_latest?: number | null;
  today_workout?: string | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  deleted_at?: string | null;
}

interface Post {
  id: string;
  user_id: string;
  body: string | null;
  comments_enabled?: boolean;
  deleted_at?: string | null;
  created_at: string;
}

interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  position: number;
}

interface Like {
  post_id: string;
  user_id: string;
  created_at?: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  deleted_at?: string | null;
  edited_at?: string | null;
  created_at: string;
}

interface CommentLike {
  comment_id: string;
  user_id: string;
}

interface WorkoutShare {
  id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  payload: { kind: 'single' | 'all'; code: string };
  imported_at?: string | null;
}

interface SocialMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  media_url?: string | null;
  media_type?: 'image' | null;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
}

interface ChatPreference {
  user_id: string;
  peer_id: string;
  is_archived: boolean;
  is_pinned: boolean;
  hidden_before?: string | null;
  last_read_at?: string | null;
}

const visibilityFields: { key: keyof SocialProfile; label: string }[] = [
  { key: 'show_consistency', label: 'Consistência' },
  { key: 'show_load_progression', label: 'Progressão de carga' },
  { key: 'show_daily_calories', label: 'Calorias do dia' },
  { key: 'show_water', label: 'Água' },
  { key: 'show_bmi', label: 'IMC' },
  { key: 'show_weight_progress', label: 'Evolução de peso' },
  { key: 'show_today_workout', label: 'Treino de hoje' },
];

function ptSupabaseError(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes('could not find')
    && (lower.includes('media_type') || lower.includes('edited_at') || lower.includes('deleted_at') || lower.includes('last_read_at') || lower.includes('comments_enabled') || lower.includes('social_post_comment_likes') || lower.includes('social_chat_preferences') || lower.includes('schema cache'))
  ) {
    return 'Seu Supabase ainda está com o schema antigo. Rode supabase/social-feed-upgrade.sql no SQL Editor.';
  }
  if (lower.includes('email not confirmed')) return 'E-mail ainda não confirmado. Desative a confirmação no Supabase ou confirme esse usuário.';
  if (lower.includes('invalid login credentials')) return 'E-mail/usuário ou senha incorretos.';
  if (lower.includes('row-level security')) return 'Permissão bloqueada pela segurança do Supabase. Rode o SQL de upgrade.';
  if (lower.includes('duplicate') || lower.includes('already exists')) return 'Isso já existe.';
  return message || 'Não consegui concluir agora. Tente novamente.';
}

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function todayKey() {
  return getToday();
}

function formatSocialDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SocialLoading() {
  return (
    <div className="px-5 pt-14 pb-6 space-y-4">
      <h1 className="text-[26px] font-bold">Social</h1>
      <div className="card space-y-4">
        <div className="h-5 w-36 rounded-full bg-white/10 animate-pulse" />
        <div className="space-y-2">
          <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function Avatar({ profile, size = 'md' }: { profile?: SocialProfile | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-24 h-24 text-3xl' : size === 'sm' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base';
  return (
    <div className={`${sizeClass} rounded-full bg-primary-500/20 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-primary-300 shrink-0`}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'G'}</span>
      )}
    </div>
  );
}

export function Social() {
  const toast = useToastStore((s) => s.show);
  const localProfile = useProfileStore((s) => s.profile);
  const history = useHistoryStore((s) => s.sessions);
  const foodLogs = useFoodStore((s) => s.logs);
  const waterLogs = useWaterStore((s) => s.logs);
  const weights = useWeightStore((s) => s.entries);
  const { previewImport, importSingleWorkout, importAllWorkouts } = useCustomWorkoutStore();

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [socialReady, setSocialReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, SocialProfile>>({});
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<PostImage[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLikes, setCommentLikes] = useState<CommentLike[]>([]);
  const [shares, setShares] = useState<WorkoutShare[]>([]);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [chatPreferences, setChatPreferences] = useState<Record<string, ChatPreference>>({});
  const [rankingStats, setRankingStats] = useState<SocialProfileStats[]>([]);
  const [socialMode, setSocialMode] = useState<'ranking' | 'feed'>('feed');
  const [rankingMode, setRankingMode] = useState<'general' | 'friends'>('general');
  const [feedMode, setFeedMode] = useState<'general' | 'friends'>('general');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [chatPeerId, setChatPeerId] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileListMode, setProfileListMode] = useState<'followers' | 'following' | null>(null);
  const [profilePostMode, setProfilePostMode] = useState<'mine' | 'tagged'>('mine');
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [deletedPostUndo, setDeletedPostUndo] = useState<Post | null>(null);

  const [postBody, setPostBody] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postMenuOpenId, setPostMenuOpenId] = useState<string | null>(null);
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionResults, setMentionResults] = useState<SocialProfile[]>([]);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentMenuOpenId, setCommentMenuOpenId] = useState<string | null>(null);
  const [pendingLikes, setPendingLikes] = useState<Record<string, boolean>>({});
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<SocialProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [chatMenuOpenId, setChatMenuOpenId] = useState<string | null>(null);

  const currentUserId = session?.user.id || '';
  const acceptedFriendIds = useMemo(() => friendships
    .filter((f) => f.status === 'accepted' && !f.deleted_at)
    .map((f) => (f.requester_id === currentUserId ? f.addressee_id : f.requester_id)), [friendships, currentUserId]);
  const conversationPeerIds = useMemo(() => {
    const peers = new Set(acceptedFriendIds);
    messages.forEach((message) => {
      if (message.sender_id === currentUserId) peers.add(message.receiver_id);
      if (message.receiver_id === currentUserId) peers.add(message.sender_id);
    });
    Object.keys(chatPreferences).forEach((peerId) => peers.add(peerId));
    return [...peers].filter(Boolean);
  }, [acceptedFriendIds, chatPreferences, currentUserId, messages]);
  const incoming = friendships.filter((f) => f.status === 'pending' && f.addressee_id === currentUserId && !f.deleted_at);
  const selectedProfile = viewProfileId ? profiles[viewProfileId] : profile;
  const feedPosts = posts.filter((post) => !post.deleted_at && (feedMode === 'general' || post.user_id === currentUserId || acceptedFriendIds.includes(post.user_id)));
  const inboxShares = shares.filter((s) => s.receiver_id === currentUserId);
  const conversations = useMemo(() => conversationPeerIds
    .map((friendId) => {
      const preference = chatPreferences[friendId];
      const visibleMessages = messages
        .filter((message) => message.sender_id === friendId || message.receiver_id === friendId)
        .filter((message) => !message.deleted_at)
        .filter((message) => !preference?.hidden_before || new Date(message.created_at) > new Date(preference.hidden_before))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const unreadCount = visibleMessages.filter((message) => (
        message.sender_id === friendId
        && (!preference?.last_read_at || new Date(message.created_at) > new Date(preference.last_read_at))
      )).length;
      return { friendId, profile: profiles[friendId], lastMessage: visibleMessages[0], preference, unreadCount };
    })
    .filter((item) => item.profile)
    .filter((item) => showArchivedChats ? item.preference?.is_archived : !item.preference?.is_archived)
    .sort((a, b) => {
      if (Boolean(a.preference?.is_pinned) !== Boolean(b.preference?.is_pinned)) return a.preference?.is_pinned ? -1 : 1;
      return new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime();
    }), [conversationPeerIds, chatPreferences, messages, profiles, showArchivedChats]);
  const chatMessages = chatPeerId
    ? messages.filter((message) => (
      (message.sender_id === currentUserId && message.receiver_id === chatPeerId)
      || (message.sender_id === chatPeerId && message.receiver_id === currentUserId)
    )).filter((message) => !chatPreferences[chatPeerId]?.hidden_before || new Date(message.created_at) > new Date(chatPreferences[chatPeerId].hidden_before!))
      .filter((message) => !message.deleted_at)
    : [];
  const rankingRows = rankingStats
    .filter((stats) => rankingMode === 'general' || stats.user_id === currentUserId || acceptedFriendIds.includes(stats.user_id))
    .map((stats) => ({ stats, profile: profiles[stats.user_id] }))
    .filter((row) => row.profile)
    .sort((a, b) => b.stats.consistency_count - a.stats.consistency_count);
  const notifications = useMemo(() => {
    if (!currentUserId || !profile) return [];
    const myUsername = profile.username.toLowerCase();
    const mentionPattern = new RegExp(`(^|\\s)@${myUsername}(?=\\s|$|[.,!?])`, 'i');
    const items: {
      id: string;
      type: 'like' | 'comment' | 'mention';
      userId: string;
      postId: string;
      text: string;
      createdAt: string;
    }[] = [];

    likes.forEach((like) => {
      const post = posts.find((item) => item.id === like.post_id);
      if (post?.user_id === currentUserId && like.user_id !== currentUserId) {
        items.push({
          id: `like-${like.post_id}-${like.user_id}`,
          type: 'like',
          userId: like.user_id,
          postId: like.post_id,
          text: 'curtiu sua publicação',
          createdAt: like.created_at || post.created_at,
        });
      }
    });

    comments.forEach((comment) => {
      const post = posts.find((item) => item.id === comment.post_id);
      if (post?.user_id === currentUserId && comment.user_id !== currentUserId) {
        items.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          userId: comment.user_id,
          postId: comment.post_id,
          text: 'comentou na sua publicação',
          createdAt: comment.created_at,
        });
      }
      if (comment.user_id !== currentUserId && mentionPattern.test(comment.body)) {
        items.push({
          id: `mention-comment-${comment.id}`,
          type: 'mention',
          userId: comment.user_id,
          postId: comment.post_id,
          text: 'mencionou você em um comentário',
          createdAt: comment.created_at,
        });
      }
    });

    posts.forEach((post) => {
      if (post.user_id !== currentUserId && post.body && mentionPattern.test(post.body)) {
        items.push({
          id: `mention-post-${post.id}`,
          type: 'mention',
          userId: post.user_id,
          postId: post.id,
          text: 'mencionou você em uma publicação',
          createdAt: post.created_at,
        });
      }
    });

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);
  }, [comments, currentUserId, likes, posts, profile]);
  const postPreviews = useMemo(() => postFiles.map((file) => ({
    name: file.name,
    type: file.type.startsWith('video/') ? 'video' : 'image',
    url: URL.createObjectURL(file),
  })), [postFiles]);
  const messagePreview = useMemo(() => (messageFile ? {
    name: messageFile.name,
    type: 'image',
    url: URL.createObjectURL(messageFile),
  } : null), [messageFile]);
  const foodTotals = useMemo(() => {
    const entries = foodLogs[todayKey()] || [];
    return entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [foodLogs]);
  const waterGlasses = waterLogs[todayKey()] || 0;

  useEffect(() => () => {
    postPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [postPreviews]);

  useEffect(() => () => {
    if (messagePreview) URL.revokeObjectURL(messagePreview.url);
  }, [messagePreview]);

  useEffect(() => {
    function closeOpenMenus(event: PointerEvent) {
      if ((event.target as HTMLElement | null)?.closest('[data-social-menu]')) return;
      setPostMenuOpenId(null);
      setChatMenuOpenId(null);
      setCommentMenuOpenId(null);
    }
    window.addEventListener('pointerdown', closeOpenMenus);
    return () => window.removeEventListener('pointerdown', closeOpenMenus);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (!data.session) setSocialReady(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, next) => {
      setSession(next);
      setAuthReady(true);
      if (!next) {
        setSocialReady(false);
        setProfile(null);
        setProfiles({});
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    const client = supabase;
    let cancelled = false;
    setSocialReady(false);
    void refreshAll().finally(() => {
      if (!cancelled) setSocialReady(true);
    });
    const channel = client
      .channel(`social-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => void refreshFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_post_likes' }, () => void refreshFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_post_comments' }, () => void refreshFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_post_comment_likes' }, () => void refreshFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_messages' }, () => void refreshMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_chat_preferences' }, () => void refreshChatPreferences())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => void refreshFriends())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_shares' }, () => void refreshShares())
      .subscribe();
    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session || !supabase || !socialReady) return;
    const interval = window.setInterval(() => {
      void refreshFeed();
      void refreshRanking();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [session?.user.id, socialReady]);

  useEffect(() => {
    if (!session || !supabase || !socialReady || !chatPeerId) return;
    const interval = window.setInterval(() => {
      void refreshMessages();
      void refreshChatPreferences();
    }, 1500);
    return () => window.clearInterval(interval);
  }, [session?.user.id, socialReady, chatPeerId]);

  useEffect(() => {
    if (!chatPeerId || !socialReady) return;
    markChatRead(chatPeerId);
  }, [chatPeerId, socialReady, messages.length]);

  useEffect(() => {
    const term = searchUsername.trim();
    if (!session || socialMode !== 'feed') return;
    if (term.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchTouched(false);
      return;
    }

    setSearchTouched(true);
    setSearchLoading(true);
    const timeout = window.setTimeout(() => {
      void searchProfiles(term);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [searchUsername, session?.user.id, socialMode]);

  useEffect(() => {
    const match = postBody.match(/@([a-z0-9_]*)$/i);
    const term = (mentionSearch || match?.[1] || '').trim();
    if (!supabase || !session || !showPostModal || (!match && !mentionSearch)) {
      setMentionResults([]);
      return;
    }
    const client = supabase;

    const timeout = window.setTimeout(async () => {
      const clean = normalizeUsername(term);
      const query = client
        .from('social_profiles')
        .select('id, username, display_name, bio, avatar_url, is_private')
        .neq('id', session.user.id)
        .limit(8);
      const { data } = clean
        ? await query.or(`username.ilike.%${clean}%,display_name.ilike.%${term}%`)
        : await query.order('display_name', { ascending: true });
      setMentionResults((data || []) as SocialProfile[]);
      setProfiles((prev) => {
        const next = { ...prev };
        (data || []).forEach((item) => { next[item.id] = item as SocialProfile; });
        return next;
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [postBody, mentionSearch, showPostModal, session?.user.id]);

  async function refreshAll() {
    setLoading(true);
    await Promise.all([refreshProfile(), refreshFriends(), refreshFeed(), refreshShares(), refreshMessages(), refreshChatPreferences(), refreshRanking(), syncMyStats()]);
    setLoading(false);
  }

  async function loadProfiles(ids: string[]) {
    if (!supabase || ids.length === 0) return;
    const unique = [...new Set(ids)].filter(Boolean);
    const { data } = await supabase.from('social_profiles').select('id, username, display_name, bio, avatar_url, is_private, show_consistency, show_load_progression, show_daily_calories, show_water, show_bmi, show_weight_progress, show_today_workout').in('id', unique);
    setProfiles((prev) => {
      const next = { ...prev };
      (data || []).forEach((item) => { next[item.id] = item as SocialProfile; });
      return next;
    });
  }

  async function syncMyStats() {
    if (!supabase || !session || !localProfile) return;
    const completed = history.filter((s) => s.completedAt);
    const latestWeight = weights[weights.length - 1]?.weight ?? null;
    const firstWeight = weights[0]?.weight ?? null;
    const todayWorkout = getTodayWorkoutType(localProfile.trainingDays);
    const payload: SocialProfileStats = {
      user_id: session.user.id,
      consistency_count: completed.length,
      load_progression: 'Ativa no treino',
      daily_calories: foodTotals.calories,
      daily_calorie_goal: calculateTDEE(localProfile),
      water_glasses: waterGlasses,
      bmi: calculateBMI(localProfile.weight, localProfile.height),
      weight_start: firstWeight,
      weight_latest: latestWeight,
      today_workout: todayWorkout ? `Treino ${todayWorkout}` : 'Descanso',
    };
    const { error } = await supabase.from('social_profile_stats').upsert({ ...payload, updated_at: new Date().toISOString() });
    if (error) toast(ptSupabaseError(error.message), 'error');
  }

  async function refreshProfile() {
    if (!supabase || !session) return;
    const { data } = await supabase.from('social_profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (!data) return;
    const nextProfile = data as SocialProfile;
    setProfile(nextProfile);
    setProfiles((prev) => ({ ...prev, [nextProfile.id]: nextProfile }));
    setDisplayName(nextProfile.display_name || '');
    setUsername(nextProfile.username || '');
  }

  async function refreshFriends() {
    if (!supabase) return;
    const { data } = await supabase.from('friendships').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    const list = (data || []) as Friendship[];
    setFriendships(list);
    await loadProfiles(list.flatMap((f) => [f.requester_id, f.addressee_id]));
  }

  async function refreshFeed() {
    if (!supabase) return;
    const [{ data: postData }, { data: imageData }, { data: likeData }, { data: commentData }, { data: commentLikeData }] = await Promise.all([
      supabase.from('social_posts').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(100),
      supabase.from('social_post_images').select('*').order('position', { ascending: true }),
      supabase.from('social_post_likes').select('*'),
      supabase.from('social_post_comments').select('*').is('deleted_at', null).order('created_at', { ascending: true }),
      supabase.from('social_post_comment_likes').select('*'),
    ]);
    const postList = (postData || []) as Post[];
    const commentList = (commentData || []) as Comment[];
    setPosts(postList);
    setImages((imageData || []) as PostImage[]);
    setLikes((likeData || []) as Like[]);
    setComments(commentList);
    setCommentLikes((commentLikeData || []) as CommentLike[]);
    await loadProfiles([
      ...postList.map((p) => p.user_id),
      ...(likeData || []).map((like: Like) => like.user_id),
      ...commentList.map((c) => c.user_id),
    ]);
  }

  async function refreshShares() {
    if (!supabase) return;
    const { data } = await supabase.from('workout_shares').select('*').order('created_at', { ascending: false });
    const list = (data || []) as WorkoutShare[];
    setShares(list);
    await loadProfiles(list.flatMap((s) => [s.sender_id, s.receiver_id]));
  }

  async function refreshMessages() {
    if (!supabase) return;
    const { data } = await supabase
      .from('social_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(300);
    const list = (data || []) as SocialMessage[];
    setMessages(list);
    await loadProfiles(list.flatMap((message) => [message.sender_id, message.receiver_id]));
  }

  async function refreshChatPreferences() {
    if (!supabase || !session) return;
    const { data } = await supabase.from('social_chat_preferences').select('*').eq('user_id', session.user.id);
    const next: Record<string, ChatPreference> = {};
    ((data || []) as ChatPreference[]).forEach((item) => { next[item.peer_id] = item; });
    setChatPreferences(next);
  }

  async function refreshRanking() {
    if (!supabase) return;
    const { data } = await supabase
      .from('social_profile_stats')
      .select('*')
      .order('consistency_count', { ascending: false })
      .limit(50);
    const list = (data || []) as SocialProfileStats[];
    setRankingStats(list);
    await loadProfiles(list.map((item) => item.user_id));
  }

  async function handleAuth() {
    if (!supabase) return;
    setLoading(true);
    if (authMode === 'signup') {
      const cleanUsername = normalizeUsername(username);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          data: { username: cleanUsername, display_name: displayName.trim() || cleanUsername },
        },
      });
      if (error) toast(ptSupabaseError(error.message), 'error');
      else if (!data.session) toast('Conta criada! Confirme seu e-mail para entrar.', 'success');
      else toast('Conta criada!', 'success');
    } else {
      let loginEmail = loginIdentifier.trim();
      if (!loginEmail.includes('@')) {
        const { data, error } = await supabase.rpc('get_login_email', { p_username: normalizeUsername(loginEmail) });
        if (error || !data) {
          toast('Username não encontrado. Tente entrar com e-mail.', 'error');
          setLoading(false);
          return;
        }
        loginEmail = data as string;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) toast(ptSupabaseError(error.message), 'error');
      else toast('Login feito!', 'success');
    }
    setLoading(false);
  }

  async function uploadAvatar() {
    if (!supabase || !session || !avatarFile) return profile?.avatar_url || null;
    const ext = avatarFile.name.split('.').pop() || 'jpg';
    const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('social-posts').upload(path, avatarFile, { upsert: true });
    if (error) {
      toast(ptSupabaseError(error.message), 'error');
      return profile?.avatar_url || null;
    }
    const { data } = supabase.storage.from('social-posts').getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveProfile() {
    if (!supabase || !session) return;
    const cleanUsername = normalizeUsername(username);
    const avatarUrl = await uploadAvatar();
    const payload = {
      id: session.user.id,
      username: cleanUsername,
      display_name: displayName.trim() || cleanUsername,
      bio: profile?.bio || null,
      avatar_url: avatarUrl,
      is_private: profile?.is_private ?? false,
      show_consistency: profile?.show_consistency ?? true,
      show_load_progression: profile?.show_load_progression ?? true,
      show_daily_calories: profile?.show_daily_calories ?? false,
      show_water: profile?.show_water ?? false,
      show_bmi: profile?.show_bmi ?? false,
      show_weight_progress: profile?.show_weight_progress ?? false,
      show_today_workout: profile?.show_today_workout ?? true,
    };
    const { error } = await supabase.from('social_profiles').upsert(payload);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      toast('Perfil salvo!', 'success');
      setAvatarFile(null);
      setProfileEditMode(false);
      await Promise.all([refreshProfile(), syncMyStats()]);
    }
  }

  async function savePrivacy(next: Partial<SocialProfile>) {
    if (!supabase || !session || !profile) return;
    setProfile({ ...profile, ...next });
    const { error } = await supabase.from('social_profiles').update(next).eq('id', session.user.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
  }

  async function uploadImages(postId: string) {
    if (!supabase || !session || postFiles.length === 0) return;
    const rows: { post_id: string; image_url: string; position: number }[] = [];
    for (const [index, file] of postFiles.slice(0, 6).entries()) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${session.user.id}/${postId}/${index}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('social-posts').upload(path, file, { upsert: true });
      if (error) {
        toast(ptSupabaseError(error.message), 'error');
        continue;
      }
      const { data } = supabase.storage.from('social-posts').getPublicUrl(path);
      rows.push({ post_id: postId, image_url: data.publicUrl, position: index });
    }
    if (rows.length) await supabase.from('social_post_images').insert(rows);
  }

  async function createPost() {
    if (!supabase || !session || (!postBody.trim() && postFiles.length === 0)) return;
    setLoading(true);
    if (editingPostId) {
      const { error } = await supabase
        .from('social_posts')
        .update({ body: postBody.trim() || null })
        .eq('id', editingPostId)
        .eq('user_id', session.user.id);
      if (error) toast(ptSupabaseError(error.message), 'error');
      else {
        setPostBody('');
        setPostFiles([]);
        setEditingPostId(null);
        setShowPostModal(false);
        toast('Post atualizado!', 'success');
        await refreshFeed();
      }
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('social_posts').insert({
      user_id: session.user.id,
      body: postBody.trim() || null,
    }).select('id').single();
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      await uploadImages(data.id);
      setPostBody('');
      setPostFiles([]);
      setShowPostModal(false);
      toast('Post publicado!', 'success');
      await refreshFeed();
    }
    setLoading(false);
  }

  function startEditPost(post: Post) {
    setEditingPostId(post.id);
    setPostBody(post.body || '');
    setPostFiles([]);
    setShowPostModal(true);
  }

  async function deletePost(postId: string) {
    if (!supabase || !session) return;
    const post = posts.find((item) => item.id === postId) || null;
    const { error } = await supabase.from('social_posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId).eq('user_id', session.user.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      setDeletedPostUndo(post);
      toast('Post excluído.', 'success');
      await refreshFeed();
    }
  }

  async function undoDeletePost() {
    if (!supabase || !session || !deletedPostUndo) return;
    const { error } = await supabase
      .from('social_posts')
      .update({ deleted_at: null })
      .eq('id', deletedPostUndo.id)
      .eq('user_id', session.user.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      setDeletedPostUndo(null);
      toast('Post restaurado.', 'success');
      await refreshFeed();
    }
  }

  async function toggleLike(postId: string) {
    if (!supabase || !session) return;
    if (pendingLikes[postId]) return;
    const liked = likes.some((l) => l.post_id === postId && l.user_id === session.user.id);
    const optimisticLike = { post_id: postId, user_id: session.user.id };

    setPendingLikes((prev) => ({ ...prev, [postId]: true }));
    setLikes((prev) => (
      liked
        ? prev.filter((like) => !(like.post_id === postId && like.user_id === session.user.id))
        : [...prev, optimisticLike]
    ));

    const { error } = liked
      ? await supabase.from('social_post_likes').delete().eq('post_id', postId).eq('user_id', session.user.id)
      : await supabase.from('social_post_likes').insert(optimisticLike);

    if (error) {
      setLikes((prev) => (
        liked
          ? [...prev, optimisticLike]
          : prev.filter((like) => !(like.post_id === postId && like.user_id === session.user.id))
      ));
      toast('Não consegui atualizar a curtida agora.', 'error');
    }

    setPendingLikes((prev) => ({ ...prev, [postId]: false }));
  }

  async function addComment(postId: string) {
    if (!supabase || !session || !commentText[postId]?.trim()) return;
    const post = posts.find((item) => item.id === postId);
    if (post?.comments_enabled === false) {
      toast('Comentários desativados nessa postagem.', 'info');
      return;
    }
    if (commentText[postId].trim().length > 240) {
      toast('Comentário muito grande. Use até 240 caracteres.', 'error');
      return;
    }
    const { error } = await supabase.from('social_post_comments').insert({
      post_id: postId,
      user_id: session.user.id,
      body: commentText[postId].trim(),
    });
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      await refreshFeed();
    }
  }

  async function updateComment(commentId: string) {
    if (!supabase || !session || !editingCommentText.trim()) return;
    if (editingCommentText.trim().length > 240) {
      toast('Comentário muito grande. Use até 240 caracteres.', 'error');
      return;
    }
    const { error } = await supabase
      .from('social_post_comments')
      .update({ body: editingCommentText.trim(), edited_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', session.user.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      setEditingCommentId(null);
      setEditingCommentText('');
      await refreshFeed();
    }
  }

  async function deleteComment(comment: Comment) {
    if (!supabase || !session) return;
    const post = posts.find((item) => item.id === comment.post_id);
    const canDelete = comment.user_id === session.user.id || post?.user_id === session.user.id;
    if (!canDelete) return;
    const { error } = await supabase.from('social_post_comments').update({ deleted_at: new Date().toISOString() }).eq('id', comment.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else await refreshFeed();
  }

  async function toggleCommentLike(commentId: string) {
    if (!supabase || !session) return;
    const liked = commentLikes.some((like) => like.comment_id === commentId && like.user_id === session.user.id);
    const optimisticLike = { comment_id: commentId, user_id: session.user.id };
    setCommentLikes((prev) => (
      liked
        ? prev.filter((like) => !(like.comment_id === commentId && like.user_id === session.user.id))
        : [...prev, optimisticLike]
    ));
    const { error } = liked
      ? await supabase.from('social_post_comment_likes').delete().eq('comment_id', commentId).eq('user_id', session.user.id)
      : await supabase.from('social_post_comment_likes').insert(optimisticLike);
    if (error) {
      setCommentLikes((prev) => (
        liked
          ? [...prev, optimisticLike]
          : prev.filter((like) => !(like.comment_id === commentId && like.user_id === session.user.id))
      ));
      toast(ptSupabaseError(error.message), 'error');
    }
  }

  async function togglePostComments(post: Post) {
    if (!supabase || !session || post.user_id !== session.user.id) return;
    const next = post.comments_enabled === false;
    const { error } = await supabase
      .from('social_posts')
      .update({ comments_enabled: next })
      .eq('id', post.id)
      .eq('user_id', session.user.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      toast(next ? 'Comentários ativados.' : 'Comentários desativados.', 'success');
      await refreshFeed();
    }
  }

  async function addFriend(targetId?: string) {
    if (!supabase || !session) return;
    let addresseeId = targetId;
    if (!addresseeId) {
      const { data } = await supabase.from('social_profiles').select('*').eq('username', normalizeUsername(searchUsername)).maybeSingle();
      if (!data) {
        toast('Usuário não encontrado.', 'error');
        return;
      }
      addresseeId = data.id;
      setProfiles((prev) => ({ ...prev, [data.id]: data as SocialProfile }));
    }
    if (addresseeId === session.user.id) {
      toast('Esse perfil é seu.', 'info');
      return;
    }
    if (!addresseeId) return;
    const targetProfile = profiles[addresseeId];
    const { error } = await supabase.from('friendships').insert({
      requester_id: session.user.id,
      addressee_id: addresseeId,
      status: targetProfile?.is_private ? 'pending' : 'accepted',
    });
    if (error) {
      const revived = await supabase
        .from('friendships')
        .update({
          deleted_at: null,
          status: targetProfile?.is_private ? 'pending' : 'accepted',
          updated_at: new Date().toISOString(),
        })
        .or(`and(requester_id.eq.${session.user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${session.user.id})`)
        .select('*');
      if (revived.error || !revived.data?.length) {
        toast('Pedido já existe ou não foi possível enviar.', 'error');
        return;
      }
    }
    toast(targetProfile?.is_private ? 'Solicitação enviada!' : 'Amigo adicionado!', 'success');
    setSearchUsername('');
    setSearchResults([]);
    setSearchTouched(false);
    setSearchLoading(false);
    await refreshFriends();
  }

  async function searchProfiles(query = searchUsername.trim()) {
    if (!supabase) return;
    const term = query.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchTouched(false);
      return;
    }
    setSearchLoading(true);
    setSearchTouched(true);
    const clean = normalizeUsername(term);
    const { data, error } = await supabase
      .from('social_profiles')
      .select('id, username, display_name, bio, avatar_url, is_private')
      .or(`username.ilike.%${clean}%,display_name.ilike.%${term}%`)
      .neq('id', currentUserId)
      .limit(10);
    if (term !== searchUsername.trim()) return;
    setSearchLoading(false);
    if (error) {
      setSearchResults([]);
      toast('Não consegui buscar agora. Tente de novo.', 'error');
      return;
    }
    const results = (data || []) as SocialProfile[];
    setSearchResults(results);
    setProfiles((prev) => {
      const next = { ...prev };
      results.forEach((item) => { next[item.id] = item; });
      return next;
    });
  }

  async function updateFriendship(id: string, status: 'accepted' | 'blocked') {
    if (!supabase) return;
    const { error } = await supabase.from('friendships').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else await refreshFriends();
  }

  async function removeFriendship(id: string) {
    if (!supabase) return;
    const friendship = friendships.find((item) => item.id === id);
    const peerId = friendship
      ? (friendship.requester_id === currentUserId ? friendship.addressee_id : friendship.requester_id)
      : null;
    const { data, error } = await supabase.from('friendships').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id');
    if (error) {
      const fallback = await supabase.from('friendships').update({ status: 'blocked', updated_at: new Date().toISOString() }).eq('id', id).select('id');
      if (fallback.error || !fallback.data?.length) {
        toast(ptSupabaseError(error.message), 'error');
        return;
      }
    } else if (!data?.length) {
      toast('Não consegui remover essa amizade. Rode o SQL de upgrade no Supabase.', 'error');
      return;
    }
    if (peerId && messages.some((message) => (
      (message.sender_id === currentUserId && message.receiver_id === peerId)
      || (message.sender_id === peerId && message.receiver_id === currentUserId)
    ))) {
      await updateChatPreference(peerId, { is_archived: true }, false);
    }
    setFriendships((prev) => prev.filter((friendship) => friendship.id !== id));
    toast('Amizade removida.', 'success');
    await refreshFriends();
  }

  function openChat(peerId: string) {
    const hasConversation = messages.some((message) => (
      (message.sender_id === currentUserId && message.receiver_id === peerId)
      || (message.sender_id === peerId && message.receiver_id === currentUserId)
    ));
    if (!acceptedFriendIds.includes(peerId) && !hasConversation) {
      toast('Você só pode mandar mensagem para amigos.', 'info');
      return;
    }
    setChatPeerId(peerId);
    setShowConversations(false);
    setViewProfileId(null);
    setMessageText('');
    setMessageFile(null);
    markChatRead(peerId);
  }

  async function uploadMessageMedia(file: File | null) {
    if (!supabase || !session || !file) return { media_url: null, media_type: null };
    if (!file.type.startsWith('image/')) {
      toast('Envie apenas fotos na DM.', 'error');
      return { media_url: null, media_type: null };
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${session.user.id}/dm-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('social-posts').upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast(ptSupabaseError(error.message), 'error');
      return { media_url: null, media_type: null };
    }
    const { data } = supabase.storage.from('social-posts').getPublicUrl(path);
    return {
      media_url: data.publicUrl,
      media_type: 'image' as const,
    };
  }

  async function sendMessage() {
    if (!supabase || !session || !chatPeerId || (!messageText.trim() && !messageFile)) return;
    if (sendingMessage) return;
    if (!acceptedFriendIds.includes(chatPeerId)) {
      toast('Você só pode mandar mensagem para amigos.', 'error');
      return;
    }
    setSendingMessage(true);
    const body = messageText.trim();
    const file = messageFile;
    setMessageText('');
    setMessageFile(null);
    const media = await uploadMessageMedia(file);
    if (file && !media.media_url) {
      setSendingMessage(false);
      return;
    }
    const payload: Partial<SocialMessage> & { sender_id: string; receiver_id: string; body: string } = {
      sender_id: session.user.id,
      receiver_id: chatPeerId,
      body,
    };
    if (media.media_url) {
      payload.media_url = media.media_url;
      payload.media_type = media.media_type;
    }
    const { error } = await supabase.from('social_messages').insert(payload);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      await updateChatPreference(chatPeerId, { hidden_before: null, is_archived: false, last_read_at: new Date().toISOString() }, false);
      await refreshMessages();
    }
    setSendingMessage(false);
  }

  async function updateMessage(messageId: string) {
    if (!supabase || !session || !editingMessageText.trim()) return;
    const { error } = await supabase
      .from('social_messages')
      .update({ body: editingMessageText.trim(), edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', session.user.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else {
      setEditingMessageId(null);
      setEditingMessageText('');
      await refreshMessages();
    }
  }

  async function deleteMessage(messageId: string) {
    if (!supabase || !session) return;
    const { error } = await supabase
      .from('social_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', session.user.id);
    if (error) toast(ptSupabaseError(error.message), 'error');
    else await refreshMessages();
  }

  function markChatRead(peerId: string) {
    void updateChatPreference(peerId, { last_read_at: new Date().toISOString() }, false);
  }

  async function updateChatPreference(peerId: string, next: Partial<ChatPreference>, showError = true) {
    if (!supabase || !session) return;
    const payload = {
      user_id: session.user.id,
      peer_id: peerId,
      is_archived: chatPreferences[peerId]?.is_archived ?? false,
      is_pinned: chatPreferences[peerId]?.is_pinned ?? false,
      hidden_before: chatPreferences[peerId]?.hidden_before ?? null,
      last_read_at: chatPreferences[peerId]?.last_read_at ?? null,
      ...next,
      updated_at: new Date().toISOString(),
    };
    setChatPreferences((prev) => ({
      ...prev,
      [peerId]: {
        user_id: session.user.id,
        peer_id: peerId,
        is_archived: payload.is_archived,
        is_pinned: payload.is_pinned,
        hidden_before: payload.hidden_before,
        last_read_at: payload.last_read_at,
      },
    }));
    const { error } = await supabase.from('social_chat_preferences').upsert(payload);
    if (error && showError) toast(ptSupabaseError(error.message), 'error');
    else await refreshChatPreferences();
  }

  async function deleteChat(peerId: string) {
    await updateChatPreference(peerId, {
      hidden_before: new Date().toISOString(),
      is_archived: false,
      is_pinned: false,
    });
  }

  async function importShare(share: WorkoutShare) {
    if (!supabase) return;
    const preview = previewImport(share.payload.code);
    if (!preview) return toast('Treino inválido.', 'error');
    if (preview.kind === 'multiple') {
      if (!window.confirm('Importar todos vai substituir sua divisão atual. Continuar?')) return;
      if (!importAllWorkouts(preview.workouts)) return toast('Não consegui importar.', 'error');
    } else if (!importSingleWorkout(preview.workouts[0], 'new')) {
      return toast('Limite de 5 treinos atingido.', 'error');
    }
    await supabase.from('workout_shares').update({ imported_at: new Date().toISOString() }).eq('id', share.id);
    toast('Treino importado!', 'success');
    await refreshShares();
  }

  async function confirmSignOut() {
    if (!supabase) return;
    const shouldSignOut = window.confirm('Sair da conta? Você vai precisar entrar novamente para usar o Social.');
    if (!shouldSignOut) return;
    await supabase.auth.signOut();
  }

  const mentionMatch = postBody.match(/@([a-z0-9_]*)$/i);
  const mentionTerm = (mentionSearch || mentionMatch?.[1] || '').toLowerCase();
  const mentionCandidates = [...acceptedFriendIds.map((id) => profiles[id]), ...mentionResults, ...Object.values(profiles)]
    .filter(Boolean)
    .filter((item) => (
      !mentionTerm
      || item.username.toLowerCase().includes(mentionTerm)
      || item.display_name.toLowerCase().includes(mentionTerm)
    ))
    .filter((item, index, list) => item.id !== currentUserId && list.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 8);

  function insertMention(username: string) {
    if (mentionMatch) {
      setPostBody((body) => body.replace(/@([a-z0-9_]*)$/i, `@${username} `));
    } else {
      setPostBody((body) => `${body}${body.endsWith(' ') || !body ? '' : ' '}@${username} `);
    }
    setMentionSearch('');
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="px-5 pt-14 pb-6 space-y-4">
        <h1 className="text-[26px] font-bold">Social</h1>
        <div className="card space-y-3">
          <h2 className="font-semibold">Conecte o Supabase</h2>
          <p className="text-sm text-white/45">Configure o .env e rode supabase/social-feed-upgrade.sql.</p>
        </div>
      </div>
    );
  }

  if (!authReady || (session && !socialReady)) {
    return <SocialLoading />;
  }

  if (!session) {
    return (
      <div className="px-5 pt-14 pb-6 space-y-4">
        <h1 className="text-[26px] font-bold">Social</h1>
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAuthMode('login')} className={`py-3 rounded-xl text-sm font-bold ${authMode === 'login' ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/50'}`}>Entrar</button>
            <button onClick={() => setAuthMode('signup')} className={`py-3 rounded-xl text-sm font-bold ${authMode === 'signup' ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/50'}`}>Criar conta</button>
          </div>

          {authMode === 'login' ? (
            <input value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} placeholder="E-mail ou username" className="input-field text-sm" />
          ) : (
            <>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome exibido" className="input-field text-sm" />
              <input value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} placeholder="username" className="input-field text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="input-field text-sm" />
            </>
          )}

          <div className="relative">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type={showPassword ? 'text' : 'password'} className="input-field text-sm pr-20" />
            <button onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 h-9 rounded-xl text-white/45 text-xs font-semibold">
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>

          {authMode === 'signup' && (
            <p className="text-xs text-white/35">Depois de criar a conta, você já pode entrar no Social.</p>
          )}

          <button
            disabled={loading || !password || (authMode === 'login' ? !loginIdentifier : (!email || !username || !displayName))}
            onClick={handleAuth}
            className="btn-primary text-sm py-3 disabled:opacity-40"
          >
            {authMode === 'signup' ? 'Criar conta' : 'Entrar'}
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-5 pt-14 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold">Social</h1>
            <p className="text-xs text-white/35">Complete seu perfil online</p>
          </div>
          <button onClick={confirmSignOut} className="px-3 py-2 rounded-xl bg-white/5 text-white/45 text-xs font-semibold">Sair</button>
        </div>
        <div className="card space-y-3">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field text-sm" placeholder="Nome exibido" />
          <input value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} className="input-field text-sm" placeholder="username" />
          <button
            onClick={saveProfile}
            disabled={!displayName || !username || loading}
            className="btn-primary text-sm py-3 disabled:opacity-40"
          >
            Salvar perfil
          </button>
          <p className="text-xs text-white/35">Se essa tela aparecer mesmo após criar a conta, rode o SQL de upgrade no Supabase para ativar o perfil automático.</p>
        </div>
      </div>
    );
  }

  const myFriendshipWithViewed = viewProfileId
    ? friendships.find((f) => [f.requester_id, f.addressee_id].includes(currentUserId) && [f.requester_id, f.addressee_id].includes(viewProfileId))
    : null;

  if (chatPeerId) {
    const chatPeer = profiles[chatPeerId];
    const canSendToChatPeer = acceptedFriendIds.includes(chatPeerId);
    return (
      <div className="min-h-[100dvh] px-5 pt-28 pb-36">
        <div className="fixed left-0 right-0 top-0 z-50 px-5 pt-14 pb-4 bg-[rgb(var(--color-bg-rgb))]/95 backdrop-blur-xl border-b border-white/5">
          <div className="mx-auto max-w-md flex items-center gap-3">
            <button onClick={() => { markChatRead(chatPeerId); setChatPeerId(null); setShowConversations(true); }} className="w-11 h-11 rounded-full bg-white/5 text-white/70 text-xl">&lt;</button>
            <button onClick={() => { markChatRead(chatPeerId); setChatPeerId(null); setViewProfileId(chatPeerId); }} className="flex items-center gap-3 text-left min-w-0">
              <Avatar profile={chatPeer} size="sm" />
              <div className="min-w-0">
                <h1 className="text-base font-bold truncate">{chatPeer?.display_name || 'Mensagem'}</h1>
                <p className="text-[11px] text-white/35 truncate">@{chatPeer?.username}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {chatMessages.map((message) => {
            const mine = message.sender_id === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${mine ? 'bg-primary-500 text-white rounded-br-md' : 'bg-white/10 border border-white/10 text-white/75 rounded-bl-md'}`}>
                  {message.media_url && message.media_type === 'image' && (
                    <img src={message.media_url} alt="" className="mb-2 max-h-72 rounded-xl object-cover" />
                  )}
                  {message.body && (
                    editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value.slice(0, 1000))}
                          className="w-full min-h-20 rounded-xl bg-black/15 border border-white/10 px-3 py-2 text-sm resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingMessageId(null); setEditingMessageText(''); }} className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold">Cancelar</button>
                          <button onClick={() => updateMessage(message.id)} className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-bold">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    )
                  )}
                  {message.edited_at && editingMessageId !== message.id && (
                    <p className={`mt-1 text-[10px] ${mine ? 'text-white/55' : 'text-white/30'}`}>editado</p>
                  )}
                  {mine && editingMessageId !== message.id && (
                    <div className="mt-1 flex justify-end gap-2 text-[10px]">
                      {message.body && <button onClick={() => { setEditingMessageId(message.id); setEditingMessageText(message.body); }} className={mine ? 'text-white/65' : 'text-white/35'}>Editar</button>}
                      <button onClick={() => deleteMessage(message.id)} className={mine ? 'text-white/65' : 'text-red-300'}>Apagar</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {chatMessages.length === 0 && (
            <div className="h-full flex items-center justify-center text-center text-sm text-white/35 px-8">
              Comece a conversa com {chatPeer?.display_name || 'esse amigo'}.
            </div>
          )}
        </div>

        <div className="fixed left-0 right-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 px-4 pb-3 pt-2 bg-[rgb(var(--color-bg-rgb))]/95 border-t border-white/5">
          <div className="max-w-md mx-auto space-y-2">
            {messagePreview && (
              <div className="relative w-24">
                <img src={messagePreview.url} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                <button onClick={() => setMessageFile(null)} className="absolute -right-2 -top-2 w-7 h-7 rounded-full bg-black/80 text-white text-xs">X</button>
              </div>
            )}
            {!canSendToChatPeer && (
              <p className="rounded-2xl bg-white/5 px-3 py-2 text-center text-xs text-white/40">
                Conversa arquivada. Siga novamente para enviar mensagens.
              </p>
            )}
            <div className="flex gap-2">
              <label className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <MaterialIcon name="perm_media" className="text-xl text-primary-300" />
                <input type="file" accept="image/*" disabled={!canSendToChatPeer} className="hidden" onChange={(e) => setMessageFile(e.target.files?.[0] || null)} />
              </label>
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void sendMessage(); }}
                disabled={!canSendToChatPeer}
                className="input-field text-sm rounded-full disabled:opacity-40"
                placeholder="Mensagem..."
              />
              <button onClick={sendMessage} disabled={!canSendToChatPeer || sendingMessage || (!messageText.trim() && !messageFile)} className="w-12 h-12 rounded-full bg-primary-500 text-white font-bold disabled:opacity-40 flex items-center justify-center">
                <MaterialIcon name="send" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showNotifications) {
    return (
      <div className="px-5 pt-14 pb-28 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowNotifications(false)} className="w-11 h-11 rounded-full bg-white/5 text-white/70 text-xl">&lt;</button>
          <h1 className="text-xl font-black">Notificações</h1>
          <div className="w-11" />
        </div>

        <div className="space-y-2">
          {notifications.map((notification) => {
            const actor = profiles[notification.userId];
            const icon = notification.type === 'like' ? 'fitness_center' : notification.type === 'comment' ? 'chat_bubble' : 'alternate_email';
            return (
              <div key={notification.id} className="rounded-3xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                <button onClick={() => setViewProfileId(notification.userId)} className="shrink-0">
                  <Avatar profile={actor} size="sm" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/75">
                    <button onClick={() => setViewProfileId(notification.userId)} className="font-black text-white">@{actor?.username || 'usuario'}</button> {notification.text}
                  </p>
                  <p className="text-[10px] text-white/30">{formatSocialDate(notification.createdAt)}</p>
                </div>
                <MaterialIcon name={icon} variant={notification.type === 'like' ? 'filled' : 'outlined'} className="text-xl text-primary-300" />
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="card text-center space-y-2">
              <h2 className="font-bold">Sem notificações</h2>
              <p className="text-sm text-white/40">Curtidas, comentários e menções vão aparecer aqui.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showConversations) {
    return (
      <div className="px-5 pt-14 pb-28 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowConversations(false)} className="w-11 h-11 rounded-full bg-white/5 text-white/70 text-xl">&lt;</button>
          <h1 className="text-xl font-black">Mensagens</h1>
          <button onClick={() => setShowArchivedChats((prev) => !prev)} className="px-3 py-2 rounded-full bg-white/5 text-xs font-bold text-white/50">
            {showArchivedChats ? 'Ativas' : 'Arquivo'}
          </button>
        </div>

        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div key={conversation.friendId} className="relative rounded-3xl bg-white/5 border border-white/10 p-3">
              <button onClick={() => openChat(conversation.friendId)} className="w-full flex items-center gap-3 text-left pr-12">
                <Avatar profile={conversation.profile} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-white/85">
                    {conversation.preference?.is_pinned && <MaterialIcon name="push_pin" className="mr-1 align-[-3px] text-base text-primary-300" />}
                    {conversation.profile?.display_name}
                  </p>
                  <p className="text-xs text-white/35 truncate">
                    {conversation.lastMessage ? (conversation.lastMessage.body || 'Foto') : 'Toque para começar uma conversa'}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </button>
              <div className="absolute right-3 top-1/2 -translate-y-1/2" data-social-menu>
                <button onClick={() => setChatMenuOpenId((id) => (id === conversation.friendId ? null : conversation.friendId))} className="w-9 h-9 rounded-full bg-white/5 text-white/45 flex items-center justify-center" aria-label="Opções da conversa">
                  <MaterialIcon name="more_horiz" className="text-xl" />
                </button>
                {chatMenuOpenId === conversation.friendId && (
                  <div className="absolute right-0 top-10 z-30 w-40 rounded-2xl bg-[rgb(var(--color-bg-card-rgb))] border border-white/10 shadow-2xl overflow-hidden">
                    <button onClick={() => { setChatMenuOpenId(null); void updateChatPreference(conversation.friendId, { is_pinned: !conversation.preference?.is_pinned }); }} className="w-full px-4 py-3 text-left text-sm text-white/70">
                      {conversation.preference?.is_pinned ? 'Desfixar' : 'Fixar'}
                    </button>
                    <button onClick={() => { setChatMenuOpenId(null); void updateChatPreference(conversation.friendId, { is_archived: !conversation.preference?.is_archived }); }} className="w-full px-4 py-3 text-left text-sm text-white/70 border-t border-white/5">
                      {conversation.preference?.is_archived ? 'Desarquivar' : 'Arquivar'}
                    </button>
                    <button onClick={() => { setChatMenuOpenId(null); void deleteChat(conversation.friendId); }} className="w-full px-4 py-3 text-left text-sm text-red-300 border-t border-white/5">
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="card text-center space-y-2">
              <h2 className="font-bold">Sem conversas ainda</h2>
              <p className="text-sm text-white/40">Adicione amigos para liberar mensagens privadas.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedProfile && viewProfileId) {
    const isMine = selectedProfile.id === currentUserId;
    const profileFollowers = friendships.filter((friendship) => friendship.status === 'accepted' && friendship.addressee_id === selectedProfile.id && !friendship.deleted_at);
    const profileFollowing = friendships.filter((friendship) => friendship.status === 'accepted' && friendship.requester_id === selectedProfile.id && !friendship.deleted_at);
    const profileList = (profileListMode === 'followers' ? profileFollowers : profileFollowing)
      .map((friendship) => profiles[profileListMode === 'followers' ? friendship.requester_id : friendship.addressee_id])
      .filter(Boolean);
    const selectedMentionPattern = new RegExp(`(^|\\s)@${selectedProfile.username}(?=\\s|$|[.,!?])`, 'i');
    const ownProfilePosts = posts.filter((post) => post.user_id === selectedProfile.id);
    const taggedProfilePosts = posts.filter((post) => post.user_id !== selectedProfile.id && Boolean(post.body && selectedMentionPattern.test(post.body)));
    const profileGridPosts = profilePostMode === 'mine' ? ownProfilePosts : taggedProfilePosts;
    return (
      <div className="px-5 pt-14 pb-6 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewProfileId(null)} className="w-11 h-11 rounded-full bg-white/5 text-white/70 text-xl">&lt;</button>
          <h1 className="text-lg font-bold">@{selectedProfile.username}</h1>
          <button onClick={confirmSignOut} className="px-3 py-2 rounded-xl bg-white/5 text-white/45 text-xs font-semibold">Sair</button>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
          <label className={isMine && profileEditMode ? 'cursor-pointer' : ''}>
            <Avatar profile={selectedProfile} size="lg" />
            {isMine && profileEditMode && <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />}
          </label>
          {avatarFile && <p className="text-xs text-primary-300">Foto nova selecionada. Salve o perfil.</p>}
          <div>
            <p className="text-lg font-black">@{selectedProfile.username}</p>
            <h2 className="text-sm font-semibold text-white/60">{selectedProfile.display_name}</h2>
            {selectedProfile.bio && <p className="text-sm text-white/60 mt-2 max-w-xs">{selectedProfile.bio}</p>}
          </div>
          {!isMine && (
            <div className="flex gap-2">
              <button
                onClick={() => addFriend(selectedProfile.id)}
                disabled={myFriendshipWithViewed?.status === 'accepted' || myFriendshipWithViewed?.status === 'pending'}
                className="px-5 py-3 rounded-2xl bg-primary-500 text-white text-sm font-bold disabled:opacity-40"
              >
                {myFriendshipWithViewed?.status === 'accepted' ? 'Amigo' : myFriendshipWithViewed?.status === 'pending' ? 'Solicitado' : selectedProfile.is_private ? 'Solicitar amizade' : 'Adicionar amigo'}
              </button>
              {myFriendshipWithViewed?.status === 'accepted' && (
                <button onClick={() => openChat(selectedProfile.id)} className="px-5 py-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm font-bold">
                  Mensagem
                </button>
              )}
              {myFriendshipWithViewed?.status === 'accepted' && (
                <button onClick={() => removeFriendship(myFriendshipWithViewed.id)} className="px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-bold">
                  Deixar de seguir
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
            <p className="text-xl font-black text-white">{ownProfilePosts.length}</p>
            <p className="text-xs text-white/40">Posts</p>
          </div>
          <button onClick={() => setProfileListMode(profileListMode === 'followers' ? null : 'followers')} className="rounded-2xl bg-white/5 border border-white/5 p-3">
            <p className="text-xl font-black text-white">{profileFollowers.length}</p>
            <p className="text-xs text-white/40">Seguidores</p>
          </button>
          <button onClick={() => setProfileListMode(profileListMode === 'following' ? null : 'following')} className="rounded-2xl bg-white/5 border border-white/5 p-3">
            <p className="text-xl font-black text-white">{profileFollowing.length}</p>
            <p className="text-xs text-white/40">Seguindo</p>
          </button>
        </div>

        {profileListMode && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-3 space-y-2">
            <p className="text-xs font-black uppercase tracking-wide text-white/40">
              {profileListMode === 'followers' ? 'Seguidores' : 'Seguindo'}
            </p>
            {profileList.map((item) => (
              <button key={item.id} onClick={() => setViewProfileId(item.id)} className="w-full flex items-center gap-3 text-left rounded-2xl bg-white/5 p-2">
                <Avatar profile={item} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{item.display_name}</p>
                  <p className="text-xs text-white/35 truncate">@{item.username}</p>
                </div>
              </button>
            ))}
            {profileList.length === 0 && <p className="text-sm text-white/35">Nada por aqui ainda.</p>}
          </div>
        )}

        {isMine && (
          <button
            onClick={() => setProfileEditMode((prev) => !prev)}
            className="w-full rounded-2xl bg-white/10 border border-white/10 py-3 text-sm font-black text-white/80"
          >
            {profileEditMode ? 'Fechar edição' : 'Editar perfil'}
          </button>
        )}

        {isMine && profile && profileEditMode && (
          <div className="space-y-3">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field text-sm" placeholder="Nome" />
            <input value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} className="input-field text-sm" placeholder="username" />
            <textarea value={profile.bio || ''} onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value } : p))} className="input-field text-sm min-h-20 resize-none" placeholder="Bio" />
            <button
              onClick={() => setProfile((p) => (p ? { ...p, is_private: !p.is_private } : p))}
              className={`w-full rounded-2xl border p-3 text-sm font-bold ${profile.is_private ? 'bg-primary-500/10 border-primary-500/30 text-primary-200' : 'bg-white/5 border-white/10 text-white/65'}`}
            >
              {profile.is_private ? 'Perfil privado' : 'Perfil público'}
            </button>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-3">
              <p className="text-xs font-black uppercase tracking-wide text-white/40">Exibir no perfil</p>
            <div className="grid grid-cols-2 gap-2">
              {visibilityFields.map((field) => (
                <button
                  key={field.key}
                  onClick={() => savePrivacy({ [field.key]: !profile[field.key] } as Partial<SocialProfile>)}
                  className={`rounded-xl border p-2 text-left text-xs ${profile[field.key] ? 'bg-primary-500/10 border-primary-500/30 text-primary-200' : 'bg-white/5 border-white/10 text-white/45'}`}
                >
                  {field.label}
                </button>
              ))}
            </div>
            </div>
            <button onClick={saveProfile} className="btn-primary text-sm py-3">Salvar perfil</button>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 rounded-full bg-white/5 p-1">
            <button
              onClick={() => setProfilePostMode('mine')}
              className={`py-2 rounded-full text-sm font-black flex items-center justify-center gap-2 ${profilePostMode === 'mine' ? 'bg-primary-500 text-white' : 'text-white/45'}`}
            >
              <MaterialIcon name="grid_on" className="text-base" />
              Posts
            </button>
            <button
              onClick={() => setProfilePostMode('tagged')}
              className={`py-2 rounded-full text-sm font-black flex items-center justify-center gap-2 ${profilePostMode === 'tagged' ? 'bg-primary-500 text-white' : 'text-white/45'}`}
            >
              <MaterialIcon name="alternate_email" className="text-base" />
              Marcado
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
          {profileGridPosts.map((post) => {
            const postImages = images.filter((img) => img.post_id === post.id);
            return (
              <button key={post.id} className="aspect-square rounded-lg bg-white/5 border border-white/5 overflow-hidden text-left active:opacity-80">
                {postImages[0] ? (
                  <img src={postImages[0].image_url} alt="" className="w-full h-full object-cover bg-dark-200" />
                ) : (
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <p className="text-[10px] leading-tight text-white/55 line-clamp-5 break-words">{post.body || 'Post'}</p>
                  </div>
                )}
              </button>
            );
          })}
          </div>
          {profileGridPosts.length === 0 && (
            <p className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/35">
              {profilePostMode === 'mine' ? 'Nenhum post ainda.' : 'Nenhuma marcação ainda.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-28 space-y-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-black leading-none">Social</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotifications(true)} className="relative w-10 h-10 rounded-full bg-white/5 text-white/60 flex items-center justify-center" aria-label="Notificações">
              <MaterialIcon name="notifications" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            <button onClick={confirmSignOut} className="px-3 py-2 rounded-xl bg-white/5 text-white/45 text-xs font-semibold">Sair</button>
          </div>
        </div>
        <button onClick={() => setViewProfileId(currentUserId)} className="flex w-full items-center gap-3 text-left rounded-3xl bg-white/5 border border-white/10 p-3 active:bg-white/10">
          <Avatar profile={profile} size="sm" />
          <div className="min-w-0">
            <p className="text-base font-black truncate">{profile.display_name}</p>
            <p className="text-xs text-white/35 truncate">@{profile.username}</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 rounded-full bg-white/5 p-1">
        <button onClick={() => setSocialMode('ranking')} className={`py-2 rounded-full text-sm font-black ${socialMode === 'ranking' ? 'bg-primary-500 text-white' : 'text-white/45'}`}>Ranking</button>
        <button onClick={() => setSocialMode('feed')} className={`py-2 rounded-full text-sm font-black ${socialMode === 'feed' ? 'bg-primary-500 text-white' : 'text-white/45'}`}>Feed</button>
      </div>

      {socialMode === 'ranking' && (
        <div className="space-y-3">
          <div className="rounded-3xl bg-primary-500/10 border border-primary-500/20 p-4">
            <p className="text-xs font-bold text-primary-200 uppercase">Liga GymPilot</p>
            <h2 className="text-2xl font-black">Ranking de consistência</h2>
            <p className="text-sm text-white/45">Treinou, pontuou. Sumiu, caiu.</p>
          </div>
          <div className="grid grid-cols-2 rounded-full bg-white/5 p-1">
            <button onClick={() => setRankingMode('general')} className={`py-2 rounded-full text-sm font-bold ${rankingMode === 'general' ? 'bg-primary-500 text-white' : 'text-white/45'}`}>Geral</button>
            <button onClick={() => setRankingMode('friends')} className={`py-2 rounded-full text-sm font-bold ${rankingMode === 'friends' ? 'bg-primary-500 text-white' : 'text-white/45'}`}>Amigos</button>
          </div>
          {rankingRows.map((row, index) => (
            <button key={row.stats.user_id} onClick={() => setViewProfileId(row.stats.user_id)} className="w-full flex items-center gap-3 rounded-3xl bg-white/5 border border-white/10 p-3 text-left">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${index === 0 ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/70'}`}>
                {index + 1}
              </div>
              <Avatar profile={row.profile} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{row.profile?.display_name}</p>
                <p className="text-xs text-white/35 truncate">@{row.profile?.username}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{row.stats.consistency_count}</p>
                <p className="text-[10px] text-white/35">treinos</p>
              </div>
            </button>
          ))}
          {rankingRows.length === 0 && (
            <p className="card text-sm text-white/35">
              {rankingMode === 'friends' ? 'Nenhum amigo no ranking ainda.' : 'Ranking vazio por enquanto.'}
            </p>
          )}
        </div>
      )}

      {socialMode === 'feed' && (
        <>
      <div className="space-y-2">
        <div>
          <input
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            className="input-field text-sm rounded-full"
            placeholder="Buscar pessoas"
          />
        </div>
        {searchLoading && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-3 text-sm text-white/45">
            Buscando perfis...
          </div>
        )}
        {!searchLoading && searchTouched && searchUsername.trim().length >= 2 && searchResults.length === 0 && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-3 text-sm text-white/45">
            Nenhum perfil encontrado.
          </div>
        )}
        {searchResults.length > 0 && (
          <div className="rounded-3xl bg-[rgb(var(--color-bg-card-rgb))] border border-white/10 overflow-hidden">
            {searchResults.map((result) => {
              const relation = friendships.find((f) => [f.requester_id, f.addressee_id].includes(currentUserId) && [f.requester_id, f.addressee_id].includes(result.id));
              return (
                <div key={result.id} className="flex items-center justify-between gap-3 p-3 border-b border-white/5 last:border-b-0">
                  <button onClick={() => setViewProfileId(result.id)} className="flex items-center gap-3 text-left min-w-0">
                    <Avatar profile={result} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{result.display_name}</p>
                      <p className="text-[11px] text-white/35 truncate">@{result.username}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => addFriend(result.id)}
                    disabled={relation?.status === 'accepted' || relation?.status === 'pending'}
                    className="px-3 py-2 rounded-full bg-primary-500 text-white text-xs font-bold disabled:opacity-40"
                  >
                    {relation?.status === 'accepted' ? 'Amigo' : relation?.status === 'pending' ? 'Solicitado' : result.is_private ? 'Solicitar' : 'Adicionar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <div className="rounded-3xl bg-white/5 border border-white/10 p-3 space-y-2">
          <p className="text-xs font-bold text-white/45 uppercase">Solicitações</p>
          {incoming.map((item) => {
            const requester = profiles[item.requester_id];
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <button onClick={() => setViewProfileId(item.requester_id)} className="flex items-center gap-2 text-left">
                  <Avatar profile={requester} size="sm" />
                  <span className="text-sm font-semibold">{requester?.display_name || 'Usuário'}</span>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => updateFriendship(item.id, 'blocked')} className="w-9 h-9 rounded-full bg-red-500/15 text-red-300 text-xs font-bold">X</button>
                  <button onClick={() => updateFriendship(item.id, 'accepted')} className="w-9 h-9 rounded-full bg-green-500/15 text-green-300 text-xs font-bold">OK</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 rounded-full bg-white/5 p-1">
        <button onClick={() => setFeedMode('general')} className={`py-2 rounded-full text-sm font-bold ${feedMode === 'general' ? 'bg-primary-500 text-white' : 'text-white/45'}`}>Geral</button>
        <button onClick={() => setFeedMode('friends')} className={`py-2 rounded-full text-sm font-bold ${feedMode === 'friends' ? 'bg-primary-500 text-white' : 'text-white/45'}`}>Amigos</button>
      </div>

      {inboxShares.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-white/80">Treinos recebidos</h2>
          {inboxShares.map((share) => (
            <div key={share.id} className="rounded-xl bg-white/5 p-3 space-y-2">
              <p className="text-sm font-semibold">{share.title}</p>
              <p className="text-[10px] text-white/35">de @{profiles[share.sender_id]?.username}</p>
              {!share.imported_at ? (
                <button onClick={() => importShare(share)} className="w-full py-2 rounded-xl bg-primary-500/15 text-primary-300 text-xs font-bold">Importar</button>
              ) : <p className="text-xs text-green-300">Importado</p>}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {deletedPostUndo && (
          <div className="rounded-2xl bg-primary-500/10 border border-primary-500/25 p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-primary-100">Publicação apagada.</p>
            <button onClick={undoDeletePost} className="px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold">
              Desfazer
            </button>
          </div>
        )}
        {feedPosts.map((post) => {
          const author = profiles[post.user_id];
          const postImages = images.filter((img) => img.post_id === post.id);
          const postLikes = likes.filter((like) => like.post_id === post.id);
          const liked = postLikes.some((like) => like.user_id === currentUserId);
          const postComments = comments.filter((comment) => comment.post_id === post.id);
          return (
            <div key={post.id} className="card space-y-3">
              <div className="relative flex items-start justify-between gap-3">
                <button onClick={() => setViewProfileId(post.user_id)} className="flex items-center gap-2 text-left min-w-0">
                  <Avatar profile={author} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{author?.display_name || 'Usuário'}</p>
                    <p className="text-[10px] text-white/35 truncate">@{author?.username}</p>
                    <p className="text-[10px] text-white/25 truncate">{formatSocialDate(post.created_at)}</p>
                  </div>
                </button>
                {post.user_id === currentUserId && (
                  <div className="relative" data-social-menu>
                    <button
                      onClick={() => setPostMenuOpenId((id) => (id === post.id ? null : post.id))}
                      className="w-9 h-9 rounded-full bg-white/5 text-white/50 flex items-center justify-center"
                      aria-label="Opções da postagem"
                    >
                      <MaterialIcon name="more_horiz" className="text-xl" />
                    </button>
                    {postMenuOpenId === post.id && (
                      <div className="absolute right-0 top-11 z-20 w-56 rounded-2xl bg-[rgb(var(--color-bg-card-rgb))] border border-white/10 shadow-2xl overflow-hidden">
                        <button
                          onClick={() => { setPostMenuOpenId(null); startEditPost(post); }}
                          className="w-full px-4 py-3 text-left text-sm text-white/70 flex items-center gap-2 active:bg-white/5"
                        >
                          <MaterialIcon name="edit" className="text-base text-primary-300" />
                          Editar
                        </button>
                        <button
                          onClick={() => { setPostMenuOpenId(null); void togglePostComments(post); }}
                          className="w-full px-4 py-3 text-left text-sm text-white/70 flex items-center gap-2 border-t border-white/5 active:bg-white/5"
                        >
                          <MaterialIcon name={post.comments_enabled === false ? 'forum' : 'comments_disabled'} className="text-base text-primary-300" />
                          {post.comments_enabled === false ? 'Ativar comentários' : 'Desativar comentários'}
                        </button>
                        <button
                          onClick={() => { setPostMenuOpenId(null); void deletePost(post.id); }}
                          className="w-full px-4 py-3 text-left text-sm text-red-300 flex items-center gap-2 border-t border-white/5 active:bg-red-500/10"
                        >
                          <MaterialIcon name="delete" className="text-base" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {post.body && <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap break-words">{post.body}</p>}
              {postImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {postImages.map((img) => <img key={img.id} src={img.image_url} alt="" className="h-56 min-w-[75%] rounded-xl object-cover bg-dark-200" />)}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${liked ? 'bg-primary-500/15 text-primary-300 border border-primary-500/25' : 'bg-white/5 text-white/50 border border-white/5'}`}
                  aria-label={liked ? 'Remover curtida' : 'Curtir'}
                >
                  <MaterialIcon name="fitness_center" variant={liked ? 'filled' : 'outlined'} className={liked ? 'text-lg leading-none transition-all scale-110 text-primary-300' : 'text-lg leading-none transition-all text-white/35'} />
                  <span>{postLikes.length}</span>
                </button>
                <span className="text-xs text-white/35">{postComments.length} comentário(s)</span>
              </div>
              <div className="space-y-2">
                {postComments.length > 0 && (
                  <div className="max-h-56 overflow-y-auto pr-1 space-y-2 rounded-2xl">
                    {postComments.map((comment) => {
                      const ownComment = comment.user_id === currentUserId;
                      const canDeleteComment = ownComment || post.user_id === currentUserId;
                      const likesForComment = commentLikes.filter((like) => like.comment_id === comment.id);
                      const likedComment = likesForComment.some((like) => like.user_id === currentUserId);

                      return (
                        <div key={comment.id} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/60">
                          <div className="flex items-start gap-2">
                            <button onClick={() => setViewProfileId(comment.user_id)} className="shrink-0">
                              <Avatar profile={profiles[comment.user_id]} size="sm" />
                            </button>
                            <div className="min-w-0 flex-1 space-y-2">
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value.slice(0, 240))}
                                maxLength={240}
                                className="input-field text-xs min-h-20 resize-none"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }} className="flex-1 py-2 rounded-xl bg-white/5 text-white/45 font-semibold">Cancelar</button>
                                <button onClick={() => updateComment(comment.id)} className="flex-1 py-2 rounded-xl bg-primary-500 text-white font-bold">Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap break-words">
                                <button onClick={() => setViewProfileId(comment.user_id)} className="font-bold text-white/80">@{profiles[comment.user_id]?.username}</button> {comment.body}
                              </p>
                              {comment.edited_at && (
                                <p className="text-[10px] text-white/30">editado</p>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                <button onClick={() => toggleCommentLike(comment.id)} className={`flex items-center gap-1 text-[11px] font-bold ${likedComment ? 'text-primary-300' : 'text-white/35'}`}>
                                  <MaterialIcon name="fitness_center" variant={likedComment ? 'filled' : 'outlined'} className="text-base" />
                                  {likesForComment.length}
                                </button>
                                {canDeleteComment && (
                                  <div className="relative" data-social-menu>
                                    <button
                                      onClick={() => setCommentMenuOpenId((id) => (id === comment.id ? null : comment.id))}
                                      className="w-8 h-8 rounded-full bg-white/5 text-white/40 flex items-center justify-center"
                                      aria-label="Opções do comentário"
                                    >
                                      <MaterialIcon name="more_horiz" className="text-lg" />
                                    </button>
                                    {commentMenuOpenId === comment.id && (
                                      <div className="absolute right-0 top-9 z-20 w-44 rounded-2xl bg-[rgb(var(--color-bg-card-rgb))] border border-white/10 shadow-2xl overflow-hidden">
                                        {ownComment && (
                                          <button
                                            onClick={() => {
                                              setCommentMenuOpenId(null);
                                              setEditingCommentId(comment.id);
                                              setEditingCommentText(comment.body);
                                            }}
                                            className="w-full px-4 py-3 text-left text-sm text-white/70 flex items-center gap-2 active:bg-white/5"
                                          >
                                            <MaterialIcon name="edit" className="text-base text-primary-300" />
                                            Editar
                                          </button>
                                        )}
                                        <button
                                          onClick={() => { setCommentMenuOpenId(null); void deleteComment(comment); }}
                                          className={`w-full px-4 py-3 text-left text-sm text-red-300 flex items-center gap-2 active:bg-red-500/10 ${ownComment ? 'border-t border-white/5' : ''}`}
                                        >
                                          <MaterialIcon name="delete" className="text-base" />
                                          Apagar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {post.comments_enabled === false ? (
                  <p className="rounded-xl bg-white/5 px-3 py-3 text-center text-xs text-white/35">Comentários desativados.</p>
                ) : (
                  <div className="flex gap-2">
                    <input value={commentText[post.id] || ''} onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value.slice(0, 240) }))} maxLength={240} className="input-field text-sm" placeholder="Comentar..." />
                    <button onClick={() => addComment(post.id)} className="w-12 rounded-xl bg-primary-500 text-white font-bold flex items-center justify-center" aria-label="Enviar comentário"><MaterialIcon name="send" /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {feedPosts.length === 0 && <p className="card text-sm text-white/35">Nenhuma postagem ainda.</p>}
      </div>
        </>
      )}

      <button
        onClick={() => setShowPostModal(true)}
        className="fixed left-1/2 -translate-x-1/2 bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 w-16 h-16 rounded-full bg-primary-500 text-white shadow-[0_12px_35px_rgba(0,0,0,0.45)] border border-white/15 flex items-center justify-center"
        aria-label="Criar postagem"
      >
        <MaterialIcon name="add" className="text-3xl" />
      </button>

      <button
        onClick={() => setShowConversations(true)}
        className="fixed right-6 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-[rgb(var(--color-bg-card-rgb))] text-white border border-white/15 shadow-[0_12px_35px_rgba(0,0,0,0.45)] flex items-center justify-center"
        aria-label="Mensagens"
      >
        <MaterialIcon name="chat_bubble" className="text-2xl text-primary-300" variant="outlined" />
      </button>

      {showPostModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70">
          <div className="w-full max-w-md rounded-t-[28px] bg-[rgb(var(--color-bg-card-rgb))] border border-white/10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">{editingPostId ? 'Editar postagem' : 'Nova postagem'}</h2>
              <button onClick={() => { setShowPostModal(false); setEditingPostId(null); setPostBody(''); setPostFiles([]); }} className="w-10 h-10 rounded-full bg-white/5 text-white/60">X</button>
            </div>
            <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} className="input-field text-sm min-h-28 resize-none" placeholder="Escreva alguma coisa..." />
            {(mentionMatch || mentionSearch) && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="alternate_email" className="text-primary-300" />
                  <input
                    value={mentionSearch || mentionMatch?.[1] || ''}
                    onChange={(e) => setMentionSearch(normalizeUsername(e.target.value))}
                    className="input-field text-xs h-10"
                    placeholder="Buscar amigo para marcar"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {mentionCandidates.map((candidate) => (
                    <button key={candidate.id} onClick={() => insertMention(candidate.username)} className="w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left bg-white/5">
                      <Avatar profile={candidate} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{candidate.display_name}</p>
                        <p className="text-[10px] text-white/35 truncate">@{candidate.username}</p>
                      </div>
                    </button>
                  ))}
                  {mentionCandidates.length === 0 && <p className="text-xs text-white/35 px-2 py-1">Nenhum perfil encontrado.</p>}
                </div>
              </div>
            )}
            {postPreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {postPreviews.map((preview, index) => (
                  <div key={`${preview.name}-${index}`} className="relative min-w-24">
                    <img src={preview.url} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                    <button
                      onClick={() => setPostFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                      className="absolute -right-2 -top-2 w-7 h-7 rounded-full bg-black/80 text-white text-xs"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!editingPostId && (
              <label className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-500/40 bg-primary-500/10 px-4 py-5 text-sm font-bold text-primary-200">
                Escolher fotos
                <input type="file" accept="image/*" multiple onChange={(e) => setPostFiles(Array.from(e.target.files || []).slice(0, 6))} className="hidden" />
              </label>
            )}
            {postFiles.length > 0 && <p className="text-xs text-white/45">{postFiles.length} foto(s) selecionada(s)</p>}
            <button onClick={createPost} disabled={loading || (!postBody.trim() && postFiles.length === 0)} className="btn-primary text-sm py-3 disabled:opacity-40">{editingPostId ? 'Salvar alterações' : 'Publicar'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
