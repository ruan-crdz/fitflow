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
import { getTodayWorkoutType } from '@/utils/date';

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
}

interface Post {
  id: string;
  user_id: string;
  body: string | null;
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
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface WorkoutShare {
  id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  payload: { kind: 'single' | 'all'; code: string };
  imported_at?: string | null;
}

const visibilityFields: { key: keyof SocialProfile; label: string }[] = [
  { key: 'show_consistency', label: 'Consistencia' },
  { key: 'show_load_progression', label: 'Progressao de carga' },
  { key: 'show_daily_calories', label: 'Calorias do dia' },
  { key: 'show_water', label: 'Agua' },
  { key: 'show_bmi', label: 'IMC' },
  { key: 'show_weight_progress', label: 'Evolucao de peso' },
  { key: 'show_today_workout', label: 'Treino de hoje' },
];

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
  const [profileStats, setProfileStats] = useState<Record<string, SocialProfileStats>>({});
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<PostImage[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [shares, setShares] = useState<WorkoutShare[]>([]);
  const [feedMode, setFeedMode] = useState<'general' | 'friends'>('general');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [postBody, setPostBody] = useState('');
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<SocialProfile[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const currentUserId = session?.user.id || '';
  const acceptedFriendIds = useMemo(() => friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => (f.requester_id === currentUserId ? f.addressee_id : f.requester_id)), [friendships, currentUserId]);
  const incoming = friendships.filter((f) => f.status === 'pending' && f.addressee_id === currentUserId);
  const selectedProfile = viewProfileId ? profiles[viewProfileId] : profile;
  const feedPosts = posts.filter((post) => feedMode === 'general' || post.user_id === currentUserId || acceptedFriendIds.includes(post.user_id));
  const inboxShares = shares.filter((s) => s.receiver_id === currentUserId);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => void refreshFriends())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_shares' }, () => void refreshShares())
      .subscribe();
    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [session?.user.id]);

  async function refreshAll() {
    setLoading(true);
    await Promise.all([refreshProfile(), refreshFriends(), refreshFeed(), refreshShares(), syncMyStats()]);
    setLoading(false);
  }

  async function loadStats(ids: string[]) {
    if (!supabase || ids.length === 0) return;
    const unique = [...new Set(ids)].filter(Boolean);
    const { data } = await supabase.from('social_profile_stats').select('*').in('user_id', unique);
    setProfileStats((prev) => {
      const next = { ...prev };
      (data || []).forEach((item) => { next[item.user_id] = item as SocialProfileStats; });
      return next;
    });
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
    await loadStats(unique);
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
    if (!error) setProfileStats((prev) => ({ ...prev, [session.user.id]: payload }));
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
    const { data } = await supabase.from('friendships').select('*').order('created_at', { ascending: false });
    const list = (data || []) as Friendship[];
    setFriendships(list);
    await loadProfiles(list.flatMap((f) => [f.requester_id, f.addressee_id]));
  }

  async function refreshFeed() {
    if (!supabase) return;
    const [{ data: postData }, { data: imageData }, { data: likeData }, { data: commentData }] = await Promise.all([
      supabase.from('social_posts').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('social_post_images').select('*').order('position', { ascending: true }),
      supabase.from('social_post_likes').select('*'),
      supabase.from('social_post_comments').select('*').order('created_at', { ascending: true }),
    ]);
    const postList = (postData || []) as Post[];
    const commentList = (commentData || []) as Comment[];
    setPosts(postList);
    setImages((imageData || []) as PostImage[]);
    setLikes((likeData || []) as Like[]);
    setComments(commentList);
    await loadProfiles([...postList.map((p) => p.user_id), ...commentList.map((c) => c.user_id)]);
  }

  async function refreshShares() {
    if (!supabase) return;
    const { data } = await supabase.from('workout_shares').select('*').order('created_at', { ascending: false });
    const list = (data || []) as WorkoutShare[];
    setShares(list);
    await loadProfiles(list.flatMap((s) => [s.sender_id, s.receiver_id]));
  }

  async function handleAuth() {
    if (!supabase) return;
    setLoading(true);
    if (authMode === 'signup') {
      const cleanUsername = normalizeUsername(username);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: cleanUsername, display_name: displayName.trim() || cleanUsername } },
      });
      if (error) toast(error.message, 'error');
      else if (!data.session) toast('Conta criada! Confirme seu email para entrar.', 'success');
      else toast('Conta criada!', 'success');
    } else {
      let loginEmail = loginIdentifier.trim();
      if (!loginEmail.includes('@')) {
        const { data, error } = await supabase.rpc('get_login_email', { p_username: normalizeUsername(loginEmail) });
        if (error || !data) {
          toast('Username nao encontrado. Tente entrar com email.', 'error');
          setLoading(false);
          return;
        }
        loginEmail = data as string;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) toast(error.message, 'error');
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
      toast(error.message, 'error');
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
    if (error) toast(error.message, 'error');
    else {
      toast('Perfil salvo!', 'success');
      setAvatarFile(null);
      await Promise.all([refreshProfile(), syncMyStats()]);
    }
  }

  async function savePrivacy(next: Partial<SocialProfile>) {
    if (!supabase || !session || !profile) return;
    setProfile({ ...profile, ...next });
    const { error } = await supabase.from('social_profiles').update(next).eq('id', session.user.id);
    if (error) toast(error.message, 'error');
  }

  async function uploadImages(postId: string) {
    if (!supabase || !session || postFiles.length === 0) return;
    const rows: { post_id: string; image_url: string; position: number }[] = [];
    for (const [index, file] of postFiles.slice(0, 6).entries()) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${session.user.id}/${postId}/${index}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('social-posts').upload(path, file, { upsert: true });
      if (error) {
        toast(error.message, 'error');
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
    const { data, error } = await supabase.from('social_posts').insert({
      user_id: session.user.id,
      body: postBody.trim() || null,
    }).select('id').single();
    if (error) toast(error.message, 'error');
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

  async function toggleLike(postId: string) {
    if (!supabase || !session) return;
    const liked = likes.some((l) => l.post_id === postId && l.user_id === session.user.id);
    if (liked) await supabase.from('social_post_likes').delete().eq('post_id', postId).eq('user_id', session.user.id);
    else await supabase.from('social_post_likes').insert({ post_id: postId, user_id: session.user.id });
    await refreshFeed();
  }

  async function addComment(postId: string) {
    if (!supabase || !session || !commentText[postId]?.trim()) return;
    const { error } = await supabase.from('social_post_comments').insert({
      post_id: postId,
      user_id: session.user.id,
      body: commentText[postId].trim(),
    });
    if (error) toast(error.message, 'error');
    else {
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      await refreshFeed();
    }
  }

  async function addFriend(targetId?: string) {
    if (!supabase || !session) return;
    let addresseeId = targetId;
    if (!addresseeId) {
      const { data } = await supabase.from('social_profiles').select('*').eq('username', normalizeUsername(searchUsername)).maybeSingle();
      if (!data) {
        toast('Usuario nao encontrado.', 'error');
        return;
      }
      addresseeId = data.id;
      setProfiles((prev) => ({ ...prev, [data.id]: data as SocialProfile }));
    }
    if (addresseeId === session.user.id) {
      toast('Esse perfil e seu.', 'info');
      return;
    }
    if (!addresseeId) return;
    const targetProfile = profiles[addresseeId];
    const { error } = await supabase.from('friendships').insert({
      requester_id: session.user.id,
      addressee_id: addresseeId,
      status: targetProfile?.is_private ? 'pending' : 'accepted',
    });
    if (error) toast('Pedido ja existe ou nao foi possivel enviar.', 'error');
    else {
      toast(targetProfile?.is_private ? 'Solicitacao enviada!' : 'Amigo adicionado!', 'success');
      setSearchUsername('');
      setSearchResults([]);
      await refreshFriends();
    }
  }

  async function searchProfiles() {
    if (!supabase) return;
    const term = searchUsername.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const clean = normalizeUsername(term);
    const { data } = await supabase
      .from('social_profiles')
      .select('id, username, display_name, bio, avatar_url, is_private')
      .or(`username.ilike.%${clean}%,display_name.ilike.%${term}%`)
      .neq('id', currentUserId)
      .limit(10);
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
    if (error) toast(error.message, 'error');
    else await refreshFriends();
  }

  async function importShare(share: WorkoutShare) {
    if (!supabase) return;
    const preview = previewImport(share.payload.code);
    if (!preview) return toast('Treino invalido.', 'error');
    if (preview.kind === 'multiple') {
      if (!window.confirm('Importar todos vai substituir sua divisao atual. Continuar?')) return;
      if (!importAllWorkouts(preview.workouts)) return toast('Nao consegui importar.', 'error');
    } else if (!importSingleWorkout(preview.workouts[0], 'new')) {
      return toast('Limite de 5 treinos atingido.', 'error');
    }
    await supabase.from('workout_shares').update({ imported_at: new Date().toISOString() }).eq('id', share.id);
    toast('Treino importado!', 'success');
    await refreshShares();
  }

  function visibleStats(target: SocialProfile) {
    const stats = profileStats[target.id];
    if (!stats) return [];
    return [
      target.show_consistency && { label: 'Consistencia', value: `${stats.consistency_count} treinos` },
      target.show_load_progression && { label: 'Progressao', value: stats.load_progression || 'Sem dados' },
      target.show_daily_calories && { label: 'Calorias', value: `${stats.daily_calories}/${stats.daily_calorie_goal} kcal` },
      target.show_water && { label: 'Agua', value: `${stats.water_glasses} copos` },
      target.show_bmi && stats.bmi && { label: 'IMC', value: String(stats.bmi) },
      target.show_weight_progress && stats.weight_latest && { label: 'Peso', value: stats.weight_start ? `${stats.weight_start} -> ${stats.weight_latest}kg` : `${stats.weight_latest}kg` },
      target.show_today_workout && { label: 'Hoje', value: stats.today_workout || 'Sem dados' },
    ].filter(Boolean) as { label: string; value: string }[];
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
            <input value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} placeholder="Email ou username" className="input-field text-sm" />
          ) : (
            <>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome exibido" className="input-field text-sm" />
              <input value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} placeholder="username" className="input-field text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field text-sm" />
            </>
          )}

          <div className="relative">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type={showPassword ? 'text' : 'password'} className="input-field text-sm pr-20" />
            <button onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 h-9 rounded-xl text-white/45 text-xs font-semibold">
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>

          {authMode === 'signup' && (
            <p className="text-xs text-white/35">Depois de criar, confirme seu email. Da para personalizar esse email no Supabase em Authentication &gt; Email Templates.</p>
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
          <button onClick={() => supabase!.auth.signOut()} className="px-3 py-2 rounded-xl bg-white/5 text-white/45 text-xs font-semibold">Sair</button>
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
          <p className="text-xs text-white/35">Se essa tela aparecer mesmo apos criar a conta, rode o SQL de upgrade no Supabase para ativar o perfil automatico.</p>
        </div>
      </div>
    );
  }

  const myFriendshipWithViewed = viewProfileId
    ? friendships.find((f) => [f.requester_id, f.addressee_id].includes(currentUserId) && [f.requester_id, f.addressee_id].includes(viewProfileId))
    : null;

  if (selectedProfile && viewProfileId) {
    const isMine = selectedProfile.id === currentUserId;
    return (
      <div className="px-5 pt-14 pb-6 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewProfileId(null)} className="w-11 h-11 rounded-full bg-white/5 text-white/70 text-xl">&lt;</button>
          <h1 className="text-lg font-bold">@{selectedProfile.username}</h1>
          <button onClick={() => supabase!.auth.signOut()} className="px-3 py-2 rounded-xl bg-white/5 text-white/45 text-xs font-semibold">Sair</button>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
          <label className={isMine ? 'cursor-pointer' : ''}>
            <Avatar profile={selectedProfile} size="lg" />
            {isMine && <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />}
          </label>
          {avatarFile && <p className="text-xs text-primary-300">Foto nova selecionada. Salve o perfil.</p>}
          <div>
            <h2 className="text-2xl font-black">{selectedProfile.display_name}</h2>
            <p className="text-xs text-white/35">{selectedProfile.is_private ? 'Perfil privado' : 'Perfil publico'}</p>
            {selectedProfile.bio && <p className="text-sm text-white/60 mt-2 max-w-xs">{selectedProfile.bio}</p>}
          </div>
          {!isMine && (
            <button
              onClick={() => addFriend(selectedProfile.id)}
              disabled={myFriendshipWithViewed?.status === 'accepted' || myFriendshipWithViewed?.status === 'pending'}
              className="px-5 py-3 rounded-2xl bg-primary-500 text-white text-sm font-bold disabled:opacity-40"
            >
              {myFriendshipWithViewed?.status === 'accepted' ? 'Amigo' : myFriendshipWithViewed?.status === 'pending' ? 'Solicitado' : selectedProfile.is_private ? 'Solicitar amizade' : 'Adicionar amigo'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {visibleStats(selectedProfile).map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wide text-white/35">{stat.label}</p>
              <p className="text-sm font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {isMine && profile && (
          <div className="space-y-3">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field text-sm" placeholder="Nome" />
            <input value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} className="input-field text-sm" placeholder="username" />
            <textarea value={profile.bio || ''} onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value } : p))} className="input-field text-sm min-h-20 resize-none" placeholder="Bio" />
            <button
              onClick={() => setProfile((p) => (p ? { ...p, is_private: !p.is_private } : p))}
              className={`w-full rounded-2xl border p-3 text-sm font-bold ${profile.is_private ? 'bg-primary-500/10 border-primary-500/30 text-primary-200' : 'bg-white/5 border-white/10 text-white/65'}`}
            >
              {profile.is_private ? 'Perfil privado' : 'Perfil publico'}
            </button>
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
            <button onClick={saveProfile} className="btn-primary text-sm py-3">Salvar perfil</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-28 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setViewProfileId(currentUserId)} className="flex items-center gap-3 text-left">
          <Avatar profile={profile} />
          <div>
            <h1 className="text-[26px] font-black leading-none">Social</h1>
            <p className="text-xs text-white/35">@{profile.username}</p>
          </div>
        </button>
        <button onClick={() => supabase!.auth.signOut()} className="px-3 py-2 rounded-xl bg-white/5 text-white/45 text-xs font-semibold">Sair</button>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void searchProfiles(); }}
            className="input-field text-sm rounded-full"
            placeholder="Buscar pessoas"
          />
          <button onClick={searchProfiles} className="px-4 rounded-full bg-white/10 border border-white/10 text-sm font-bold">Buscar</button>
        </div>
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
          <p className="text-xs font-bold text-white/45 uppercase">Solicitacoes</p>
          {incoming.map((item) => {
            const requester = profiles[item.requester_id];
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <button onClick={() => setViewProfileId(item.requester_id)} className="flex items-center gap-2 text-left">
                  <Avatar profile={requester} size="sm" />
                  <span className="text-sm font-semibold">{requester?.display_name || 'Usuario'}</span>
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
        {feedPosts.map((post) => {
          const author = profiles[post.user_id];
          const postImages = images.filter((img) => img.post_id === post.id);
          const postLikes = likes.filter((like) => like.post_id === post.id);
          const liked = postLikes.some((like) => like.user_id === currentUserId);
          const postComments = comments.filter((comment) => comment.post_id === post.id);
          return (
            <div key={post.id} className="card space-y-3">
              <button onClick={() => setViewProfileId(post.user_id)} className="flex items-center gap-2 text-left">
                <Avatar profile={author} size="sm" />
                <div>
                  <p className="text-sm font-bold">{author?.display_name || 'Usuario'}</p>
                  <p className="text-[10px] text-white/35">@{author?.username}</p>
                </div>
              </button>
              {post.body && <p className="text-sm text-white/75 leading-relaxed whitespace-pre-line">{post.body}</p>}
              {postImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {postImages.map((img) => <img key={img.id} src={img.image_url} alt="" className="h-56 min-w-[75%] rounded-xl object-cover bg-dark-200" />)}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => toggleLike(post.id)} className={`px-3 py-2 rounded-xl text-xs font-bold ${liked ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/50'}`}>
                  Like {postLikes.length}
                </button>
                <span className="text-xs text-white/35">{postComments.length} comentario(s)</span>
              </div>
              <div className="space-y-2">
                {postComments.slice(-3).map((comment) => (
                  <p key={comment.id} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/60">
                    <button onClick={() => setViewProfileId(comment.user_id)} className="font-bold text-white/80">@{profiles[comment.user_id]?.username}</button> {comment.body}
                  </p>
                ))}
                <div className="flex gap-2">
                  <input value={commentText[post.id] || ''} onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))} className="input-field text-sm" placeholder="Comentar..." />
                  <button onClick={() => addComment(post.id)} className="px-4 rounded-xl bg-primary-500 text-white font-bold">-&gt;</button>
                </div>
              </div>
            </div>
          );
        })}
        {feedPosts.length === 0 && <p className="card text-sm text-white/35">Nenhuma postagem ainda.</p>}
      </div>

      <button
        onClick={() => setShowPostModal(true)}
        className="fixed left-1/2 -translate-x-1/2 bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 w-16 h-16 rounded-full bg-primary-500 text-white text-4xl leading-none shadow-[0_12px_35px_rgba(0,0,0,0.45)] border border-white/15"
        aria-label="Criar postagem"
      >
        +
      </button>

      {showPostModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70">
          <div className="w-full max-w-md rounded-t-[28px] bg-[rgb(var(--color-bg-card-rgb))] border border-white/10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Nova postagem</h2>
              <button onClick={() => setShowPostModal(false)} className="w-10 h-10 rounded-full bg-white/5 text-white/60">X</button>
            </div>
            <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} className="input-field text-sm min-h-28 resize-none" placeholder="Escreva alguma coisa..." />
            <label className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-500/40 bg-primary-500/10 px-4 py-5 text-sm font-bold text-primary-200">
              Escolher fotos
              <input type="file" accept="image/*" multiple onChange={(e) => setPostFiles(Array.from(e.target.files || []).slice(0, 6))} className="hidden" />
            </label>
            {postFiles.length > 0 && <p className="text-xs text-white/45">{postFiles.length} foto(s) selecionada(s)</p>}
            <button onClick={createPost} disabled={loading || (!postBody.trim() && postFiles.length === 0)} className="btn-primary text-sm py-3 disabled:opacity-40">Publicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
